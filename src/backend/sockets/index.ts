/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/auth';
import { db } from '../services/db';
import { ParticipantStatus } from '../../shared/types';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    const token = socket.handshake.query.token as string;
    if (!token) {
      console.log('[Socket] Connection rejected: No token provided');
      socket.disconnect();
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      console.log('[Socket] Connection rejected: Invalid token');
      socket.disconnect();
      return;
    }

    const userId = payload.userId;
    const user = db.users.findOne({ id: userId });
    if (!user) {
      console.log('[Socket] Connection rejected: User not found in DB');
      socket.disconnect();
      return;
    }

    // Join a private room for user-specific real-time notifications
    socket.join(`user_${userId}`);
    console.log(`[Socket] User ${user.name} (${userId}) connected and joined private room.`);

    // Handle joining chat room for a specific activity
    socket.on('join_activity', (data: { activityId: string }) => {
      const { activityId } = data;
      const activity = db.activities.findOne({ id: activityId });
      
      if (!activity) {
        socket.emit('error_message', { message: 'Activity not found' });
        return;
      }

      // Authorize: Only creator or approved participant can join
      const isCreator = activity.creatorId === userId;
      const participant = db.activity_participants.findOne({ activityId, userId });
      const isApproved = participant?.status === ParticipantStatus.APPROVED;

      if (isCreator || isApproved) {
        socket.join(`activity_${activityId}`);
        console.log(`[Socket] User ${user.name} joined room activity_${activityId}`);
        socket.emit('joined_room', { activityId });
      } else {
        socket.emit('error_message', { message: 'Cannot join chat. Join request is not approved.' });
      }
    });

    socket.on('leave_activity', (data: { activityId: string }) => {
      const { activityId } = data;
      socket.leave(`activity_${activityId}`);
      console.log(`[Socket] User ${user.name} left room activity_${activityId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${user.name} (${userId}) disconnected.`);
    });
  });

  return io;
}

/**
 * Emit a real-time event to a specific user
 */
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Emit a real-time event to all connected users in a room
 */
export function emitToRoom(room: string, event: string, data: any) {
  if (io) {
    io.to(room).emit(event, data);
  }
}
