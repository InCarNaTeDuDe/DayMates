/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ActivityCategory {
  JOGGING = 'JOGGING',
  CYCLING = 'CYCLING',
  BADMINTON = 'BADMINTON',
  MOVIE = 'MOVIE',
  STUDY = 'STUDY',
  GYM = 'GYM',
  CHESS = 'CHESS',
  OTHER = 'OTHER'
}

export enum ParticipantStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar: string;
  bio: string;
  interests: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OtpVerification {
  id: string;
  emailOrPhone: string;
  otp: string; // Hashed OTP
  expiresAt: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  date: string;
  time: string;
  location: string;
  slots: number;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  
  // Joined fields
  creatorName?: string;
  creatorAvatar?: string;
  joinedCount?: number;
  myStatus?: ParticipantStatus | null;
}

export interface ActivityParticipant {
  id: string;
  activityId: string;
  userId: string;
  status: ParticipantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  activityId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'JOIN_REQUEST' | 'JOIN_APPROVED' | 'JOIN_REJECTED' | 'NEW_MESSAGE';
  title: string;
  content: string;
  isRead: boolean;
  link: string; // e.g., /activities/:id
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  reportedActivityId: string | null;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}
