/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchActivityDetails, 
  joinActivity, 
  leaveActivity, 
  respondJoinRequest, 
  postChatMessage,
  getSocket,
  getState
} from '../services/api';
import { Activity, ParticipantStatus, Message } from '../shared/types';
import { getCategoryStyles } from './ActivityCard';
import { 
  ChevronLeft, Calendar, Clock, MapPin, Users, Send, Check, X, 
  ShieldAlert, Lock, HelpCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import ReportModal from './ReportModal';

interface ActivityDetailViewProps {
  activityId: string;
  currentUserId: string;
  onBack: () => void;
}

export default function ActivityDetailView({ activityId, currentUserId, onBack }: ActivityDetailViewProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Report Modal state
  const [reportData, setReportData] = useState<{
    reportedUserId?: string | null;
    reportedUserName?: string | null;
    reportedActivityId?: string | null;
    reportedActivityTitle?: string | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchActivityDetails(activityId);
      setActivity(res.activity);
      setParticipants(res.participants);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve activity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();

    // Setup Socket listener updates for messages
    const socket = getSocket();
    if (socket) {
      // Connect / join room
      socket.emit('join_activity', { activityId });

      const handleIncomingMessage = () => {
        // Retrieve state value of loaded messages (managed by API client reactive updates)
        const appState = getState();
        setMessages(appState.currentMessages);
        scrollToBottom();
      };

      const handleUserJoinedChat = () => {
        // Reload details in real-time when another user joins/is approved
        loadDetails();
      };

      // Listen on chat_message and user joining changes
      socket.on('chat_message', handleIncomingMessage);
      socket.on('user_joined_chat', handleUserJoinedChat);
      
      return () => {
        socket.emit('leave_activity', { activityId });
        socket.off('chat_message', handleIncomingMessage);
        socket.off('user_joined_chat', handleUserJoinedChat);
      };
    }
  }, [activityId, activity?.myStatus]);

  // Sync API local message state whenever participants/activity status is loaded
  useEffect(() => {
    const appState = getState();
    setMessages(appState.currentMessages);
    scrollToBottom();
  }, [activity, participants]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleJoin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await joinActivity(activityId);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Join request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to cancel your request or leave this activity?')) return;
    setError(null);
    setSubmitting(true);
    try {
      await leaveActivity(activityId);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Leave action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (userId: string, approve: boolean) => {
    setSubmitting(true);
    try {
      const status = approve ? ParticipantStatus.APPROVED : ParticipantStatus.REJECTED;
      await respondJoinRequest(activityId, userId, status);
      await loadDetails();
    } catch (err: any) {
      alert(err.message || 'Moderation action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const content = chatInput.trim();
    setChatInput('');

    try {
      await postChatMessage(activityId, content);
      scrollToBottom();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  if (loading && !activity) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="h-7 w-7 text-sky-500 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-mono">Loading activity details...</p>
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center bg-red-950/20 border border-red-900/30 rounded-2xl p-6">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-white mb-2">Error Loading Board</p>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">{error}</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-white rounded-lg text-xs font-semibold cursor-pointer">
          Back to Discover
        </button>
      </div>
    );
  }

  if (!activity) return null;

  const isCreator = activity.creatorId === currentUserId;
  const isApproved = activity.myStatus === ParticipantStatus.APPROVED;
  const isPending = activity.myStatus === ParticipantStatus.PENDING;
  const canChat = isCreator || isApproved;
  const styles = getCategoryStyles(activity.category);

  // Separate participants for easier management
  const approvedParticipants = participants.filter(p => p.status === ParticipantStatus.APPROVED);
  const pendingParticipants = participants.filter(p => p.status === ParticipantStatus.PENDING);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Discover
      </button>

      {/* Main Grid: Info card Left, Participant and Chat Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: General Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
            {/* Category */}
            <div>
              <span className={`text-[10px] font-bold font-mono uppercase px-2.5 py-1 rounded-md border ${styles.bg}`}>
                {styles.label}
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-white leading-tight">{activity.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{activity.description}</p>
            </div>

            {/* Meta listings */}
            <div className="space-y-3.5 border-t border-b border-slate-800/60 py-4.5">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <Calendar className="h-4 w-4 text-sky-500 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Date</span>
                  <span className="font-medium">{activity.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <Clock className="h-4 w-4 text-sky-500 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Time</span>
                  <span className="font-medium">{activity.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Location</span>
                  <span className="font-medium truncate block">{activity.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <Users className="h-4 w-4 text-sky-500 shrink-0" />
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Slots Available</span>
                  <span className="font-medium">{approvedParticipants.length} / {activity.slots} joined</span>
                </div>
              </div>
            </div>

            {/* Host Section */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-850/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <img 
                  src={activity.creatorAvatar} 
                  alt={activity.creatorName}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full object-cover border border-slate-800"
                />
                <div className="min-w-0">
                  <span className="block text-[10px] font-mono text-slate-500 uppercase">Organiser</span>
                  <span className="text-xs font-bold text-white truncate block">{activity.creatorName}</span>
                </div>
              </div>
              {!isCreator && (
                <button
                  onClick={() => setReportData({
                    reportedUserId: activity.creatorId,
                    reportedUserName: activity.creatorName,
                    reportedActivityId: activityId,
                    reportedActivityTitle: activity.title
                  })}
                  className="text-[10px] font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 px-2 py-1 rounded"
                >
                  Report Host
                </button>
              )}
            </div>

            {/* Action Buttons: Join, Leave, etc. */}
            <div className="pt-2">
              {!isCreator && (
                <>
                  {activity.myStatus === null ? (
                    <button
                      onClick={handleJoin}
                      disabled={submitting || approvedParticipants.length >= activity.slots}
                      className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-900 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm tracking-wide shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      {approvedParticipants.length >= activity.slots ? 'Activity Full' : 'Request to Join Activity'}
                    </button>
                  ) : isPending ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-950/20 border border-amber-900/35 rounded-xl text-center">
                        <p className="text-xs text-amber-300 font-medium">Join request is pending host approval</p>
                      </div>
                      <button
                        onClick={handleLeave}
                        disabled={submitting}
                        className="w-full bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Cancel Join Request
                      </button>
                    </div>
                  ) : isApproved ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-teal-950/20 border border-teal-850 rounded-xl text-center">
                        <p className="text-xs text-teal-300 font-semibold">You are an approved buddy! 🎉</p>
                      </div>
                      <button
                        onClick={handleLeave}
                        disabled={submitting}
                        className="w-full bg-slate-950 hover:bg-slate-900 text-red-400 hover:text-red-300 border border-slate-800/80 hover:border-red-900/40 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Leave Activity
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-950/20 border border-red-900/35 rounded-xl text-center">
                      <p className="text-xs text-red-300 font-medium">Your request to join was declined by host.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Join Requests & Approved Buddies or Chat room */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
          {/* Host Pending Request Manager */}
          {isCreator && pendingParticipants.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-400" /> Pending Join Requests ({pendingParticipants.length})
              </h3>

              <div className="space-y-3">
                {pendingParticipants.map((p) => (
                  <div key={p.userId} className="p-3 bg-slate-950/80 rounded-xl border border-slate-850/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex gap-2.5 items-start">
                      <img 
                        src={p.avatar} 
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full object-cover border border-slate-800 mt-0.5"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">{p.name}</h4>
                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 max-w-sm">{p.bio || 'No bio provided'}</p>
                        {p.interests?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.interests.map((int: string, idx: number) => (
                              <span key={idx} className="text-[9px] font-mono font-semibold bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                                {int}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleRespond(p.userId, false)}
                        disabled={submitting}
                        className="p-1.5 bg-red-500/10 border border-red-500/15 hover:border-red-500/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Decline"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={() => handleRespond(p.userId, true)}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-900 hover:text-black font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Buddy List & Chat Box Row */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col h-[550px]">
            {/* Nav tabs for Chat / Members */}
            <div className="flex border-b border-slate-800 p-2 gap-1.5 bg-slate-950/20">
              <span className="text-xs font-bold font-display px-4 py-2.5 text-white">
                Live Group Chat room
              </span>
            </div>

            {/* Chat content box */}
            {canChat ? (
              <div className="flex flex-col flex-grow min-h-0 bg-slate-950/30">
                {/* Scrollable messages area */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                      <HelpCircle className="h-10 w-10 text-slate-700 mb-2.5" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No messages yet</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                        Say hi to your group! Arrange meeting points, carpools, or share updates here.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                          {!isMe && (
                            <img 
                              src={msg.senderAvatar} 
                              alt={msg.senderName}
                              referrerPolicy="no-referrer"
                              className="h-8 w-8 rounded-full object-cover border border-slate-850 mt-0.5"
                            />
                          )}
                          <div>
                            {!isMe && (
                              <span className="block text-[10px] text-slate-500 font-semibold mb-0.5 ml-1">
                                {msg.senderName}
                              </span>
                            )}
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isMe 
                                ? 'bg-gradient-to-tr from-sky-500 to-teal-500 text-slate-950 font-medium rounded-tr-sm' 
                                : 'bg-slate-900/90 border border-slate-800/60 text-slate-200 rounded-tl-sm'
                            }`}>
                              {msg.content}
                            </div>
                            <span className="block text-[8px] text-slate-600 font-mono mt-1 text-right">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat input form */}
                <form onSubmit={handleSendChat} className="p-4 border-t border-slate-800/80 flex gap-2 bg-slate-950/40">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={1000}
                    className="flex-grow bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 transition-all outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-3 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 hover:text-black font-bold rounded-xl text-xs flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-950/40">
                <Lock className="h-10 w-10 text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Chat Locked</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Group chat room and meeting coordinator will automatically unlock once the host approves your join request!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Member Profiles Panel (shown under info) */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6">
        <h3 className="text-md font-bold font-display text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-400" /> Approved Group Members ({approvedParticipants.length}/{activity.slots})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {approvedParticipants.map((m) => (
            <div key={m.userId} className="p-3.5 bg-slate-950/40 border border-slate-850/60 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img 
                  src={m.avatar} 
                  alt={m.name}
                  referrerPolicy="no-referrer"
                  className="h-8.5 w-8.5 rounded-full object-cover border border-slate-800 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate">{m.name}</span>
                  <span className="text-[9px] font-mono text-slate-500 truncate block">
                    {m.userId === activity.creatorId ? 'Organiser' : 'Buddy'}
                  </span>
                </div>
              </div>
              
              {m.userId !== currentUserId && (
                <button
                  onClick={() => setReportData({
                    reportedUserId: m.userId,
                    reportedUserName: m.name,
                    reportedActivityId: null,
                    reportedActivityTitle: null
                  })}
                  className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/5 transition-colors"
                  title="Report User"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Safety Report Modal Trigger */}
      {reportData && (
        <ReportModal 
          reportedUserId={reportData.reportedUserId}
          reportedUserName={reportData.reportedUserName}
          reportedActivityId={reportData.reportedActivityId}
          reportedActivityTitle={reportData.reportedActivityTitle}
          onClose={() => setReportData(null)}
        />
      )}
    </div>
  );
}
