/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationsRead, respondJoinRequest } from '../services/api';
import { Notification } from '../shared/types';
import { Bell, BellOff, Check, X, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

interface NotificationsPanelProps {
  onSelectActivity: (id: string) => void;
  onRefreshBadge: () => void;
}

export default function NotificationsPanel({ onSelectActivity, onRefreshBadge }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      loadNotifications();
      onRefreshBadge();
    } catch (e) {
      // Ignored
    }
  };

  const handleRespondDirect = async (notification: Notification, approve: boolean) => {
    // Check if link format is /activities/:id
    const activityId = notification.link.split('/').pop();
    // Parse userId from content if possible, or direct user to activity details
    if (!activityId) return;

    // Direct user to detail page where they can securely approve/reject
    onSelectActivity(activityId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'JOIN_APPROVED':
        return (
          <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4.5 w-4.5 text-teal-400" />
          </div>
        );
      case 'JOIN_REJECTED':
        return (
          <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
          </div>
        );
      case 'JOIN_REQUEST':
        return (
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Bell className="h-4.5 w-4.5 text-sky-400" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
            <Bell className="h-4.5 w-4.5 text-slate-400" />
          </div>
        );
    }
  };

  // Format date-times nicely
  const getFriendlyTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return past.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/85 rounded-2xl shadow-sm dark:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-sky-500" /> Activity Inbox
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Updates on requests, joins, and chats</p>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
          Loading alerts...
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-red-500 dark:text-red-400 font-medium bg-red-950/20 border border-red-900/30 rounded-xl">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3.5">
            <BellOff className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-400 font-medium">Your inbox is clear</p>
          <p className="text-xs text-slate-500 max-w-xs mt-1 text-center">
            You will receive instant real-time alerts when buddies join your proposed activities.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {notifications.map((notif) => {
            const isUnread = !notif.isRead;
            const activityId = notif.link.split('/').pop();

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all flex gap-4 ${
                  isUnread
                    ? 'bg-sky-50/40 dark:bg-slate-900/90 border-sky-100 dark:border-slate-750 shadow-sm dark:shadow-md'
                    : 'bg-white dark:bg-slate-900/20 border-slate-150 dark:border-slate-850/65'
                }`}
              >
                {getNotificationIcon(notif.type)}

                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-semibold truncate ${isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0 mt-0.5">
                      <Clock className="h-2.5 w-2.5" /> {getFriendlyTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    {notif.content}
                  </p>

                  <div className="flex items-center gap-2">
                    {activityId && (
                      <button
                        onClick={() => onSelectActivity(activityId)}
                        className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        View Event
                      </button>
                    )}

                    {notif.type === 'JOIN_REQUEST' && (
                      <button
                        onClick={() => handleRespondDirect(notif, true)}
                        className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Review Request
                      </button>
                    )}
                  </div>
                </div>

                {isUnread && (
                  <div className="h-2 w-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
