/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../services/db';
import { ParticipantStatus } from '../../shared/types';
import { emitToRoom } from '../sockets';

export async function getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params; // activityId
  const userId = req.userId!;

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Check if user is creator or approved participant
    const isCreator = activity.creatorId === userId;
    const participant = db.activity_participants.findOne({ activityId: id, userId });
    const isApproved = participant?.status === ParticipantStatus.APPROVED;

    if (!isCreator && !isApproved) {
      res.status(403).json({ error: 'Chat is locked. You must be an approved participant to read messages.' });
      return;
    }

    const messages = db.messages.find({ activityId: id });
    
    // Sort oldest first for chat flow
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
}

export async function postMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params; // activityId
  const userId = req.userId!;
  const { content } = req.body;

  try {
    const activity = db.activities.findOne({ id });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    // Check if user is creator or approved participant
    const isCreator = activity.creatorId === userId;
    const participant = db.activity_participants.findOne({ activityId: id, userId });
    const isApproved = participant?.status === ParticipantStatus.APPROVED;

    if (!isCreator && !isApproved) {
      res.status(403).json({ error: 'Chat is locked. You must be approved to send messages.' });
      return;
    }

    const sender = db.users.findOne({ id: userId });

    const message = db.messages.save({
      activityId: id,
      senderId: userId,
      senderName: sender?.name || 'Anonymous',
      senderAvatar: sender?.avatar || '',
      content
    });

    // Notify activity room in real-time
    emitToRoom(`activity_${id}`, 'chat_message', message);

    res.json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post message' });
  }
}
