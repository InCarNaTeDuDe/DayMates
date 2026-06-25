/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { io, Socket } from 'socket.io-client';
import { User, Activity, ActivityParticipant, Message, Notification } from '../shared/types';

// State definition
interface AppState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  activities: Activity[];
  currentActivity: Activity | null;
  currentParticipants: any[];
  currentMessages: Message[];
  notifications: Notification[];
}

// In-memory application state
let state: AppState = {
  user: null,
  accessToken: localStorage.getItem('ab_access_token'),
  refreshToken: localStorage.getItem('ab_refresh_token'),
  activities: [],
  currentActivity: null,
  currentParticipants: [],
  currentMessages: [],
  notifications: []
};

// State change listeners
type Listener = (state: AppState) => void;
const listeners = new Set<Listener>();

export function subscribeState(listener: Listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

function updateState(updates: Partial<AppState>) {
  state = { ...state, ...updates };
  listeners.forEach(l => l({ ...state }));
}

export function getState() {
  return { ...state };
}

// Socket IO Client Instance
let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function initSocketConnection(token: string) {
  if (socket) {
    socket.disconnect();
  }

  // Socket binds to the same window host
  socket = io(window.location.origin, {
    query: { token }
  });

  socket.on('connect', () => {
    console.log('[Client Socket] Connected to real-time server!');
  });

  socket.on('notification', (notification: Notification) => {
    console.log('[Client Socket] Real-time notification received:', notification);
    const updatedNotifs = [notification, ...state.notifications];
    updateState({ notifications: updatedNotifs });
  });

  socket.on('chat_message', (message: Message) => {
    console.log('[Client Socket] Chat message received:', message);
    if (state.currentActivity && state.currentActivity.id === message.activityId) {
      updateState({ currentMessages: [...state.currentMessages, message] });
    }
  });

  socket.on('user_joined_chat', (data: any) => {
    console.log('[Client Socket] User joined:', data);
    // Refresh participant list if looking at details
    if (state.currentActivity && state.currentActivity.id === data.activityId) {
      fetchActivityDetails(data.activityId);
    }
  });

  socket.on('join_request_received', (data: any) => {
    console.log('[Client Socket] Join request received:', data);
    // Refresh activity details to show the join requests badge/tabs
    if (state.currentActivity && state.currentActivity.id === data.activityId) {
      fetchActivityDetails(data.activityId);
    }
  });

  socket.on('join_request_response', (data: any) => {
    console.log('[Client Socket] Join request updated:', data);
    fetchActivities();
    if (state.currentActivity && state.currentActivity.id === data.activityId) {
      fetchActivityDetails(data.activityId);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Client Socket] Disconnected.');
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// API base fetch wrapper
async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  
  if (state.accessToken) {
    headers.set('Authorization', `Bearer ${state.accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    // Attempt token refresh
    if (state.refreshToken) {
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: state.refreshToken })
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('ab_access_token', data.accessToken);
          localStorage.setItem('ab_refresh_token', data.refreshToken);
          
          updateState({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          });

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          const retryResponse = await fetch(endpoint, { ...options, headers });
          return handleResponse(retryResponse);
        }
      } catch (err) {
        console.error('Failed to refresh authentication token:', err);
      }
    }
    
    // Clear credentials on authentication failure
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  return handleResponse(response);
}

async function handleResponse(response: Response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || 'Something went wrong';
    throw new Error(errorMessage);
  }

  return data;
}

// SERVICE ACTIONS

export async function requestOtp(emailOrPhone: string) {
  return apiFetch('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ emailOrPhone })
  });
}

export async function verifyOtp(emailOrPhone: string, otp: string) {
  const res = await apiFetch('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ emailOrPhone, otp })
  });

  localStorage.setItem('ab_access_token', res.accessToken);
  localStorage.setItem('ab_refresh_token', res.refreshToken);

  updateState({
    user: res.user,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken
  });

  initSocketConnection(res.accessToken);
  return res;
}

export async function googleSignIn(email: string, name?: string, avatar?: string) {
  const res = await apiFetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ email, name, avatar })
  });

  localStorage.setItem('ab_access_token', res.accessToken);
  localStorage.setItem('ab_refresh_token', res.refreshToken);

  updateState({
    user: res.user,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken
  });

  initSocketConnection(res.accessToken);
  return res;
}

export async function fetchCurrentUser() {
  if (!state.accessToken) return null;
  try {
    const res = await apiFetch('/api/users/me');
    updateState({ user: res.user });
    initSocketConnection(state.accessToken);
    return res.user;
  } catch (err) {
    logout();
    return null;
  }
}

export async function updateProfile(profileData: {
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar: string;
  bio: string;
  interests: string[];
}) {
  const res = await apiFetch('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
  updateState({ user: res.user });
  return res.user;
}

export async function fetchActivities(category?: string) {
  const query = category ? `?category=${category}` : '';
  const res = await apiFetch(`/api/activities${query}`);
  updateState({ activities: res.activities });
  return res.activities;
}

export async function createActivity(activityData: {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  slots: number;
}) {
  const res = await apiFetch('/api/activities', {
    method: 'POST',
    body: JSON.stringify(activityData)
  });
  fetchActivities();
  return res.activity;
}

export async function fetchActivityDetails(id: string) {
  const res = await apiFetch(`/api/activities/${id}`);
  updateState({
    currentActivity: res.activity,
    currentParticipants: res.participants
  });
  
  // Try to load messages (will succeed if approved/creator)
  try {
    const msgRes = await apiFetch(`/api/activities/${id}/messages`);
    updateState({ currentMessages: msgRes.messages });
  } catch (err) {
    // Expected error if participant request is still pending/unjoined
    updateState({ currentMessages: [] });
  }
  
  return res;
}

export async function joinActivity(id: string) {
  const res = await apiFetch(`/api/activities/${id}/join`, {
    method: 'POST'
  });
  fetchActivityDetails(id);
  fetchActivities();
  return res;
}

export async function leaveActivity(id: string) {
  const res = await apiFetch(`/api/activities/${id}/leave`, {
    method: 'DELETE'
  });
  fetchActivityDetails(id);
  fetchActivities();
  return res;
}

export async function respondJoinRequest(activityId: string, userId: string, status: 'APPROVED' | 'REJECTED') {
  const res = await apiFetch(`/api/activities/${activityId}/participants/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  fetchActivityDetails(activityId);
  return res;
}

export async function postChatMessage(activityId: string, content: string) {
  const res = await apiFetch(`/api/activities/${activityId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
  return res.message;
}

export async function fetchNotifications() {
  const res = await apiFetch('/api/notifications');
  updateState({ notifications: res.notifications });
  return res.notifications;
}

export async function markNotificationsRead() {
  const res = await apiFetch('/api/notifications/read', {
    method: 'POST'
  });
  updateState({
    notifications: state.notifications.map(n => ({ ...n, isRead: true }))
  });
  return res;
}

export async function submitReport(reportData: {
  reportedUserId?: string | null;
  reportedActivityId?: string | null;
  reason: string;
}) {
  return apiFetch('/api/reports', {
    method: 'POST',
    body: JSON.stringify(reportData)
  });
}

export function logout() {
  localStorage.removeItem('ab_access_token');
  localStorage.removeItem('ab_refresh_token');
  disconnectSocket();
  updateState({
    user: null,
    accessToken: null,
    refreshToken: null,
    activities: [],
    currentActivity: null,
    currentParticipants: [],
    currentMessages: [],
    notifications: []
  });
}
