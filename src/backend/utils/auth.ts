/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'activitybuddy_access_secret_12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'activitybuddy_refresh_secret_12345';

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function generateOtp(): string {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId }, 
    JWT_ACCESS_SECRET, 
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string };
    return decoded;
  } catch (err) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    return decoded;
  } catch (err) {
    return null;
  }
}
