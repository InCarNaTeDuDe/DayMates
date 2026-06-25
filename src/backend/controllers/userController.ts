/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { db } from '../services/db';

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ success: true, user: req.user });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(410).json({ error: 'Unauthorized' });
    return;
  }

  const { name, email, phone, avatar, bio, interests } = req.body;

  try {
    const updatedUser = db.users.save({
      id: req.userId,
      name,
      email,
      phone,
      avatar,
      bio,
      interests
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
}
