/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../services/db';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.userId!;

  try {
    const notifications = db.notifications.find({ userId });
    
    // Newest first
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
}

export async function markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.userId!;

  try {
    db.notifications.markAllAsRead(userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
}
