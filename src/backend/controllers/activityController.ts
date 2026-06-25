/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../services/db';
import { ParticipantStatus, Activity } from '../../shared/types';
import { emitToUser, emitToRoom } from '../sockets';

export async function createActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const creatorId = req.userId!;
  const { title, description, category, date, time, location, slots } = req.body;

  try {
    const activity = db.activities.save({
      title,
      description,
      category,
      date,
      time,
      location,
      slots,
      creatorId
    });

    // Auto-approve creator as participant
    db.activity_participants.save({
      activityId: activity.id,
      userId: creatorId,
      status: ParticipantStatus.APPROVED
    });

    res.status(210).json({
      success: true,
      message: 'Activity created successfully',
      activity
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create activity' });
  }
}

export async function listActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.userId!;
  const { category } = req.query;

  try {
    let activities = db.activities.find();

    if (category) {
      activities = activities.filter(a => a.category === category);
    }

    // Map creator details, participant counts, and current user status
    const enrichedActivities: Activity[] = activities.map(a => {
      const creator = db.users.findOne({ id: a.creatorId });
      const participants = db.activity_participants.find({ activityId: a.id });
      const approvedParticipants = participants.filter(p => p.status === ParticipantStatus.APPROVED);
      const myParticipant = participants.find(p => p.userId === userId);

      return {
        ...a,
        creatorName: creator?.name || 'Anonymous Buddy',
        creatorAvatar: creator?.avatar,
        joinedCount: approvedParticipants.length,
        myStatus: myParticipant ? myParticipant.status : null
      };
    });

    // Sort: upcoming date and time, then created date
    enrichedActivities.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    res.json({ success: true, activities: enrichedActivities });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve activities' });
  }
}

export async function getActivityDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const creator = db.users.findOne({ id: activity.creatorId });
    const participants = db.activity_participants.find({ activityId: id });
    const myParticipant = participants.find(p => p.userId === userId);

    // Retrieve detailed list of participants with usernames and avatars
    const participantList = participants.map(p => {
      const u = db.users.findOne({ id: p.userId });
      return {
        id: p.id,
        userId: p.userId,
        name: u?.name || 'Anonymous',
        avatar: u?.avatar || '',
        bio: u?.bio || '',
        status: p.status,
        createdAt: p.createdAt
      };
    });

    const approvedCount = participantList.filter(p => p.status === ParticipantStatus.APPROVED).length;

    const enriched: Activity = {
      ...activity,
      creatorName: creator?.name || 'Anonymous',
      creatorAvatar: creator?.avatar,
      joinedCount: approvedCount,
      myStatus: myParticipant ? myParticipant.status : null
    };

    res.json({
      success: true,
      activity: enriched,
      participants: participantList
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load activity details' });
  }
}

export async function deleteActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can delete this activity' });
      return;
    }

    db.activities.softDelete(id);
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
}

export async function joinActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.creatorId === userId) {
      res.status(400).json({ error: 'You are the creator of this activity' });
      return;
    }

    const participants = db.activity_participants.find({ activityId: id });
    const existing = participants.find(p => p.userId === userId);

    if (existing) {
      res.status(400).json({ error: `You have already sent a join request. Current status: ${existing.status}` });
      return;
    }

    const approvedCount = participants.filter(p => p.status === ParticipantStatus.APPROVED).length;
    if (approvedCount >= activity.slots) {
      res.status(400).json({ error: 'This activity is already full' });
      return;
    }

    // Save pending participant
    const request = db.activity_participants.save({
      activityId: id,
      userId,
      status: ParticipantStatus.PENDING
    });

    const sender = db.users.findOne({ id: userId });

    // Create Notification for the creator
    const notification = db.notifications.save({
      userId: activity.creatorId,
      type: 'JOIN_REQUEST',
      title: 'New Join Request',
      content: `${sender?.name || 'Someone'} requested to join your activity: "${activity.title}"`,
      link: `/activities/${activity.id}`
    });

    // Real-time socket notify
    emitToUser(activity.creatorId, 'notification', notification);
    emitToUser(activity.creatorId, 'join_request_received', {
      activityId: id,
      userId,
      senderName: sender?.name || 'Someone',
      status: ParticipantStatus.PENDING
    });

    res.json({
      success: true,
      message: 'Join request submitted successfully. Waiting for creator approval!',
      status: ParticipantStatus.PENDING
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to join activity' });
  }
}

export async function leaveActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.userId!;

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.creatorId === userId) {
      res.status(400).json({ error: 'Creator cannot leave their own activity. Delete it instead.' });
      return;
    }

    const deleted = db.activity_participants.deleteRequest(id, userId);
    if (!deleted) {
      res.status(400).json({ error: 'You have not joined or requested to join this activity' });
      return;
    }

    res.json({ success: true, message: 'Left activity successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to leave activity' });
  }
}

export async function respondToJoinRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id, userId } = req.params; // id is activityId, userId is target user's ID
  const creatorId = req.userId!;
  const { status } = req.body; // APPROVED or REJECTED

  if (status !== ParticipantStatus.APPROVED && status !== ParticipantStatus.REJECTED) {
    res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    return;
  }

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (activity.creatorId !== creatorId) {
      res.status(403).json({ error: 'Only the activity creator can manage participants' });
      return;
    }

    const participant = db.activity_participants.findOne({ activityId: id, userId });
    if (!participant) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    if (status === ParticipantStatus.APPROVED) {
      const participants = db.activity_participants.find({ activityId: id });
      const approvedCount = participants.filter(p => p.status === ParticipantStatus.APPROVED).length;
      if (approvedCount >= activity.slots) {
        res.status(400).json({ error: 'Activity is full. Cannot approve more participants.' });
        return;
      }
    }

    const updatedParticipant = db.activity_participants.save({
      id: participant.id,
      status
    });

    const isApproved = status === ParticipantStatus.APPROVED;

    // Create Notification for the requestor
    const notification = db.notifications.save({
      userId,
      type: isApproved ? 'JOIN_APPROVED' : 'JOIN_REJECTED',
      title: isApproved ? 'Join Request Approved! 🎉' : 'Join Request Update',
      content: isApproved
        ? `You have been approved to join: "${activity.title}". Chat room unlocked!`
        : `Your request to join: "${activity.title}" was not accepted.`,
      link: `/activities/${activity.id}`
    });

    // Notify user in real-time
    emitToUser(userId, 'notification', notification);
    emitToUser(userId, 'join_request_response', {
      activityId: id,
      status
    });

    // If approved, notify room that a new user joined
    if (isApproved) {
      const joinedUser = db.users.findOne({ id: userId });
      emitToRoom(`activity_${id}`, 'user_joined_chat', {
        activityId: id,
        userId,
        name: joinedUser?.name || 'A Buddy',
        avatar: joinedUser?.avatar
      });
    }

    res.json({
      success: true,
      message: `Join request ${status.toLowerCase()} successfully`,
      participant: updatedParticipant
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update participant status' });
  }
}
