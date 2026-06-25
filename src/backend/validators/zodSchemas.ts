/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { ActivityCategory } from '../../shared/types';

export const RequestOtpSchema = z.object({
  emailOrPhone: z.string().trim().min(3).refine(val => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isPhone = /^\+?[0-9]{10,15}$/.test(val);
    return isEmail || isPhone;
  }, {
    message: "Must be a valid email or phone number (+1234567890)"
  })
});

export const VerifyOtpSchema = z.object({
  emailOrPhone: z.string().trim(),
  otp: z.string().length(6, "OTP must be exactly 6 digits")
});

export const GoogleLoginSchema = z.object({
  email: z.string().trim().email("Invalid Google email address"),
  name: z.string().trim().optional(),
  avatar: z.string().trim().optional()
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number").optional().nullable(),
  avatar: z.string().url("Invalid avatar URL").or(z.string().min(1)),
  bio: z.string().trim().max(500, "Bio is too long"),
  interests: z.array(z.string()).max(10, "Up to 10 interests allowed")
});

export const CreateActivitySchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000, "Description cannot exceed 1000 characters"),
  category: z.nativeEnum(ActivityCategory),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  location: z.string().trim().min(3, "Location must be at least 3 characters").max(200, "Location is too long"),
  slots: z.number().int("Slots must be an integer").min(1, "Slots must be at least 1").max(50, "Max slots is 50")
});

export const PostMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message cannot exceed 1000 characters")
});

export const CreateReportSchema = z.object({
  reportedUserId: z.string().uuid("Invalid user ID").optional().nullable(),
  reportedActivityId: z.string().uuid("Invalid activity ID").optional().nullable(),
  reason: z.string().trim().min(10, "Reason must be at least 10 characters").max(500, "Reason cannot exceed 500 characters")
}).refine(data => data.reportedUserId || data.reportedActivityId, {
  message: "Either reportedUserId or reportedActivityId must be specified"
});
