/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import React, { useState } from 'react';
import { updateProfile } from '../services/api';
import { User } from '../shared/types';
import { UserCheck, Sparkles, AlertCircle, Plus, X } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUpdate: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&q=80'
];

const POPULAR_INTERESTS = [
  'Jogging', 'Cycling', 'Badminton', 'Movies', 'Study Groups', 'Kubernetes', 'Chess', 'Gym', 'Language Exchange', 'Board Games', 'Tennis', 'Hiking'
];

export default function ProfileView({ user, onUpdate }: ProfileViewProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [bio, setBio] = useState(user.bio || '');
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [customInterest, setCustomInterest] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (!trimmed) return;
    if (interests.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setCustomInterest('');
      return;
    }
    if (interests.length >= 10) {
      setError('Up to 10 interests allowed');
      return;
    }
    setInterests([...interests, trimmed]);
    setCustomInterest('');
    setError(null);
  };

  const handleRemoveInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        avatar,
        bio: bio.trim(),
        interests
      });
      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm dark:shadow-xl relative overflow-hidden">
      <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-1">Edit My Profile</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Customize how you appear to prospective activity buddies</p>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-teal-950/40 border border-teal-850 rounded-xl flex items-center gap-2.5 text-teal-300">
          <UserCheck className="h-5 w-5 text-teal-400 shrink-0" />
          <span className="text-xs font-semibold">Profile saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sync Profile Avatar Display */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl animate-fade-in">
          <img 
            src={avatar} 
            alt="Google synced avatar" 
            className="h-16 w-16 rounded-full object-cover border-2 border-sky-500 shadow-md shadow-sky-500/10" 
            referrerPolicy="no-referrer"
          />
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-0.5">
              Google Account Avatar
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Your profile picture is securely synced from your Google account.
            </p>
          </div>
        </div>

        {/* Name / Email / Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1234567890"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Introduce yourself (Bio)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell potential buddies about yourself! What are your favourite weekend hobbies? Do you prefer cycling or movies?"
            maxLength={500}
            rows={3}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none resize-none"
          />
        </div>

        {/* Custom Interests Section */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Your Hobbies & Interests (Max 10)
          </label>

          {/* Current selected interest list */}
          <div className="flex flex-wrap gap-2 mb-3.5">
            {interests.map((interest, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold font-mono px-2.5 py-1 rounded-lg animate-fade-in"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(i)}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {interests.length === 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic">No interest tags added yet. Choose from popular tags below!</span>
            )}
          </div>

          {/* Add custom interest form */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Type hobby e.g. Docker, Hiking, Rock Climbing"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              className="flex-grow bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddInterest(customInterest);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleAddInterest(customInterest)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl border border-slate-200 dark:border-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Preset Choice tags */}
          <div>
            <span className="block text-[10px] font-semibold text-slate-450 dark:text-slate-550 uppercase tracking-wide mb-2">
              Popular Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_INTERESTS.map((tag) => {
                const alreadySelected = interests.some(i => i.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={alreadySelected}
                    onClick={() => handleAddInterest(tag)}
                    className={`text-[11px] font-semibold font-mono px-2 py-1 rounded-md border transition-all ${
                      alreadySelected
                        ? 'opacity-40 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-650 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer'
                    }`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form actions */}
        <div className="pt-6 border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-900 hover:text-black font-bold rounded-xl text-xs shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
