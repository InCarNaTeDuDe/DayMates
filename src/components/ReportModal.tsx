/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import React, { useState } from 'react';
import { submitReport } from '../services/api';
import { X, ShieldAlert, Check } from 'lucide-react';

interface ReportModalProps {
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  reportedActivityId?: string | null;
  reportedActivityTitle?: string | null;
  onClose: () => void;
}

export default function ReportModal({
  reportedUserId,
  reportedUserName,
  reportedActivityId,
  reportedActivityTitle,
  onClose
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.trim().length < 10) {
      setError('Please provide a descriptive reason (minimum 10 characters)');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await submitReport({
        reportedUserId,
        reportedActivityId,
        reason: reason.trim()
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Top Border Indicator */}
        <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
            <h2 className="text-lg font-bold font-display text-white">File Safety Report</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-teal-500/15 border border-teal-500/35 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-teal-400" />
            </div>
            <h3 className="text-md font-bold text-white font-display mb-2">Report Submitted</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
              Our safety moderation team will investigate this report and take appropriate actions. Thank you for helping keep DayMates secure and friendly!
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-705 text-white font-semibold rounded-xl py-2.5 text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl">
                <p className="text-xs text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Target Info
              </span>
              <p className="text-sm font-medium text-white bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-850">
                {reportedUserName && `Reporting User: "${reportedUserName}"`}
                {reportedActivityTitle && `Reporting Activity: "${reportedActivityTitle}"`}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                What's the issue? (Min 10 characters)
              </label>
              <textarea
                placeholder="Explain the harassment, fake profile, dangerous behavior, commercial activity, or dating content. DayMates is strictly for friendly sports and social activity events."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none resize-none"
                required
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-lg shadow-red-600/10 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
