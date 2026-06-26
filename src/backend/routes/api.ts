/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requestOtp, verifyOtp, refreshToken, googleSignIn, getGoogleConfig } from '../controllers/authController';
import { getMe, updateProfile } from '../controllers/userController';
import { 
  createActivity, 
  listActivities, 
  getActivityDetails, 
  deleteActivity, 
  joinActivity, 
  leaveActivity, 
  respondToJoinRequest 
} from '../controllers/activityController';
import { getMessages, postMessage } from '../controllers/chatController';
import { getNotifications, markAllRead } from '../controllers/notificationController';
import { submitReport } from '../controllers/reportController';

import { authenticateToken } from '../middleware/authMiddleware';
import { validateRequest, sanitizePayload } from '../middleware/validationMiddleware';

import { 
  RequestOtpSchema, 
  VerifyOtpSchema, 
  UpdateProfileSchema, 
  CreateActivitySchema, 
  PostMessageSchema, 
  CreateReportSchema 
} from '../validators/zodSchemas';

const router = Router();

// AUTH ROUTES
router.post('/auth/otp/request', sanitizePayload, validateRequest(RequestOtpSchema), requestOtp);
router.post('/auth/otp/verify', sanitizePayload, validateRequest(VerifyOtpSchema), verifyOtp);
router.get('/auth/google/config', getGoogleConfig);
router.post('/auth/google', googleSignIn);
router.post('/auth/refresh', refreshToken);

// USER ROUTES
router.get('/users/me', authenticateToken, getMe);
router.put('/users/profile', authenticateToken, sanitizePayload, validateRequest(UpdateProfileSchema), updateProfile);

// ACTIVITY ROUTES
router.get('/activities', authenticateToken, listActivities);
router.post('/activities', authenticateToken, sanitizePayload, validateRequest(CreateActivitySchema), createActivity);
router.get('/activities/:id', authenticateToken, getActivityDetails);
router.delete('/activities/:id', authenticateToken, deleteActivity);
router.post('/activities/:id/join', authenticateToken, joinActivity);
router.delete('/activities/:id/leave', authenticateToken, leaveActivity);
router.put('/activities/:id/participants/:userId', authenticateToken, respondToJoinRequest);

// CHAT ROUTES
router.get('/activities/:id/messages', authenticateToken, getMessages);
router.post('/activities/:id/messages', authenticateToken, sanitizePayload, validateRequest(PostMessageSchema), postMessage);

// NOTIFICATION ROUTES
router.get('/notifications', authenticateToken, getNotifications);
router.post('/notifications/read', authenticateToken, markAllRead);

// REPORT ROUTES
router.post('/reports', authenticateToken, sanitizePayload, validateRequest(CreateReportSchema), submitReport);

export default router;
