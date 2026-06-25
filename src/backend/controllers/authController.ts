/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { db } from '../services/db';
import { hashOtp, generateOtp, generateTokens, verifyRefreshToken } from '../utils/auth';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { emailOrPhone } = req.body;
  
  // Clean up any stale OTPs for this email or phone
  db.otp_verifications.deleteByEmailOrPhone(emailOrPhone);

  // Generate 6-digit OTP
  const rawOtp = generateOtp();
  const hashed = hashOtp(rawOtp);
  
  // Save to DB (expires in 5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  db.otp_verifications.save({
    emailOrPhone,
    otp: hashed,
    expiresAt
  });

  // Log to server console so the developer/user can see it!
  console.log(`[DayMates OTP SERVICE] Generated OTP for "${emailOrPhone}": ${rawOtp} (Valid for 5 mins)`);

  res.json({
    success: true,
    message: 'OTP sent successfully. Check your console log to retrieve it!',
    // In demo environments, we can return the raw OTP in development so they don't even have to open logs!
    demoOtp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined
  });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { emailOrPhone, otp } = req.body;

  // Find OTP record
  const record = db.otp_verifications.findOne({ emailOrPhone });
  if (!record) {
    res.status(400).json({ error: 'No OTP requested for this email or phone number' });
    return;
  }

  // Check expiration
  if (new Date() > new Date(record.expiresAt)) {
    db.otp_verifications.delete(record.id);
    res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    return;
  }

  // Check matching hash
  const hashedInput = hashOtp(otp);
  if (record.otp !== hashedInput) {
    res.status(400).json({ error: 'Invalid OTP code' });
    return;
  }

  // Delete the OTP verification record upon successful use
  db.otp_verifications.delete(record.id);

  // Check if user already exists, or create a new user profile
  let user = db.users.findOne({ email: emailOrPhone }) || db.users.findOne({ phone: emailOrPhone });
  
  const isNewUser = !user;
  if (!user) {
    // Generate a default name from email/phone
    let defaultName = 'New Buddy';
    let email: string | undefined;
    let phone: string | undefined;

    if (emailOrPhone.includes('@')) {
      email = emailOrPhone;
      defaultName = emailOrPhone.split('@')[0];
    } else {
      phone = emailOrPhone;
      defaultName = `Buddy-${emailOrPhone.slice(-4)}`;
    }

    // Set a default high-quality avatar matching interests
    const defaultAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    user = db.users.save({
      name: defaultName,
      email,
      phone,
      avatar: randomAvatar,
      bio: 'Ready to find some buddies for sports, learning, or movies!',
      interests: []
    });
  }

  // Generate tokens
  const tokens = generateTokens(user.id);

  res.json({
    success: true,
    user,
    isNewUser,
    ...tokens
  });
}

export async function googleSignIn(req: Request, res: Response): Promise<void> {
  const { email, name, avatar } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required for Google Sign-In' });
    return;
  }

  // Find user by email
  let user = db.users.findOne({ email });

  const isNewUser = !user;
  if (!user) {
    const defaultAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80'
    ];
    const userAvatar = avatar || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    user = db.users.save({
      name: name || email.split('@')[0],
      email,
      phone: null,
      avatar: userAvatar,
      bio: 'Ready to find some buddies for sports, learning, or movies!',
      interests: []
    });
  }

  // Generate tokens
  const tokens = generateTokens(user.id);

  res.json({
    success: true,
    user,
    isNewUser,
    ...tokens
  });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const user = db.users.findOne({ id: payload.userId });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const tokens = generateTokens(user.id);
  res.json({
    success: true,
    ...tokens
  });
}
