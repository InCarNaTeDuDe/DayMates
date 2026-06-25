/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { db } from '../services/db';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token is required' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired access token' });
    return;
  }

  const user = db.users.findOne({ id: payload.userId });
  if (!user) {
    res.status(404).json({ error: 'Authenticated user not found' });
    return;
  }

  req.userId = payload.userId;
  req.user = user;
  next();
}
