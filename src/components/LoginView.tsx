/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { googleSignIn } from "../services/api";
import {
  ShieldAlert,
  Handshake,
  UserCheck,
  Users,
  Flame,
  Heart,
  Plus,
  Trash2,
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const PRESET_GOOGLE_ACCOUNTS = [
  {
    email: "sophia.chen@gmail.com",
    name: "Sophia Chen",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80",
    role: "Sports Host Pro",
  },
  {
    email: "alex.rivera@gmail.com",
    name: "Alex Rivera",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
    role: "Chess & Study enthusiast",
  },
  {
    email: "bharathmaska163@gmail.com",
    name: "Bharath Maska",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
    role: "Bharath (Developer Persona)",
  },
];

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  // Toggle for Demo mode or Real Active Account Sign-In
  const [useDemoMode, setUseDemoMode] = useState(false);

  // Real active user accounts on machine stored in local storage
  const [userAccounts, setUserAccounts] = useState<
    { email: string; name: string; avatar: string }[]
  >(() => {
    const saved = localStorage.getItem("daymates_user_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return [
      {
        email: "bharathmaska163@gmail.com",
        name: "Bharath Maska",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      },
    ];
  });

  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const realUser = userAccounts[activeAccountIndex] || userAccounts[0];
  const [isEditingRealUser, setIsEditingRealUser] = useState(false);

  // States for adding another account on system
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountName, setNewAccountName] = useState("");

  // Google One Tap specific state
  const [showOneTap, setShowOneTap] = useState(true);
  const [shakeOneTap, setShakeOneTap] = useState(false);
  const [oneTapIsAdding, setOneTapIsAdding] = useState(false);
  const [oneTapAddEmail, setOneTapAddEmail] = useState("");
  const [oneTapAddName, setOneTapAddName] = useState("");

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountEmail || !newAccountName) return;

    // Create random profile avatar picture
    const randomId = Math.floor(Math.random() * 100);
    const avatar = `https://images.unsplash.com/photo-${1535713875000 + randomId}?w=150&h=150&fit=crop&q=80`;

    const nextAccounts = [
      ...userAccounts,
      { email: newAccountEmail, name: newAccountName, avatar },
    ];
    setUserAccounts(nextAccounts);
    localStorage.setItem(
      "daymates_user_accounts",
      JSON.stringify(nextAccounts),
    );
    setActiveAccountIndex(nextAccounts.length - 1);

    // Reset inputs
    setNewAccountEmail("");
    setNewAccountName("");
    setIsAddingNewAccount(false);
  };

  const handleOneTapAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneTapAddEmail || !oneTapAddName) return;

    const randomId = Math.floor(Math.random() * 100);
    const avatar = `https://images.unsplash.com/photo-${1535713875000 + randomId}?w=150&h=150&fit=crop&q=80`;

    const nextAccounts = [
      ...userAccounts,
      { email: oneTapAddEmail, name: oneTapAddName, avatar },
    ];
    setUserAccounts(nextAccounts);
    localStorage.setItem(
      "daymates_user_accounts",
      JSON.stringify(nextAccounts),
    );
    setActiveAccountIndex(nextAccounts.length - 1);

    setOneTapAddEmail("");
    setOneTapAddName("");
    setOneTapIsAdding(false);

    // Auto log in with the new account
    handleSignInWithAccount(oneTapAddEmail, oneTapAddName, avatar);
  };

  const handleDeleteAccount = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userAccounts.length <= 1) return;
    const nextAccounts = userAccounts.filter((_, idx) => idx !== indexToDelete);
    setUserAccounts(nextAccounts);
    localStorage.setItem(
      "daymates_user_accounts",
      JSON.stringify(nextAccounts),
    );
    if (activeAccountIndex >= nextAccounts.length) {
      setActiveAccountIndex(0);
    }
  };

  const updateRealUser = (updated: { email?: string; name?: string }) => {
    const nextAccounts = [...userAccounts];
    nextAccounts[activeAccountIndex] = { ...realUser, ...updated };
    setUserAccounts(nextAccounts);
    localStorage.setItem(
      "daymates_user_accounts",
      JSON.stringify(nextAccounts),
    );
  };

  // Demo selections
  const [selectedDemoAccount, setSelectedDemoAccount] = useState(
    PRESET_GOOGLE_ACCOUNTS[2],
  );

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const targetUser = useDemoMode ? selectedDemoAccount : realUser;
      await googleSignIn(targetUser.email, targetUser.name, targetUser.avatar);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithAccount = async (
    email: string,
    name: string,
    avatar: string,
  ) => {
    setError(null);
    setLoading(true);
    try {
      await googleSignIn(email, name, avatar);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginClick = () => {
    if (useDemoMode) {
      handleGoogleLogin();
    } else {
      if (!showOneTap) {
        setShowOneTap(true);
      } else {
        setShakeOneTap(true);
        setTimeout(() => setShakeOneTap(false), 500);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 md:p-10 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Custom Styles for simulated Google One Tap shake animations */}
      <style>{`
        @keyframes one-tap-shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
        .animate-one-tap-shake {
          animation: one-tap-shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

      {/* Floating Google One Tap Dialog */}
      {!useDemoMode && showOneTap && (
        <div
          className={`fixed top-4 right-4 z-50 w-full max-w-[340px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-4 transition-all duration-300 transform sm:mr-4 ${
            shakeOneTap
              ? "animate-one-tap-shake border-sky-500/80 dark:border-sky-500/80 shadow-sky-500/10"
              : "translate-y-0 scale-100"
          }`}
        >
          {/* One Tap Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0 shadow-sm border border-slate-100 dark:border-slate-850">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.98 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.86 3C6.35 7.4 8.97 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.01 3.67-8.64z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.36 14.5c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38L1.5 6.74C.54 8.63 0 10.75 0 13s.54 4.37 1.5 6.26l3.86-3.76z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.03 0-5.65-2.36-6.64-5.46L1.5 16.58C3.39 20.35 7.35 23 12 23z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                  Sign in with Google
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  to DayMates
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOneTap(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* One Tap Body */}
          {oneTapIsAdding ? (
            /* Add Secondary Account inside One Tap Overlay */
            <form
              onSubmit={handleOneTapAddAccount}
              className="space-y-3 text-left animate-fade-in py-1"
            >
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Add Google Account
              </span>
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={oneTapAddEmail}
                  onChange={(e) => setOneTapAddEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-450 outline-none transition-all"
                  placeholder="your-other-account@gmail.com"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={oneTapAddName}
                  onChange={(e) => setOneTapAddName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-450 outline-none transition-all"
                  placeholder="e.g. Bharath Maska"
                />
              </div>
              <div className="flex items-center gap-2 pt-1.5">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                >
                  Add & Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setOneTapIsAdding(false)}
                  className="px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Accounts List (Google Chooser) */
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {userAccounts.map((acc, index) => (
                <button
                  key={acc.email}
                  onClick={() =>
                    handleSignInWithAccount(acc.email, acc.name, acc.avatar)
                  }
                  disabled={loading}
                  className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between text-left transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="h-8.5 w-8.5 rounded-full object-cover border border-slate-200 dark:border-slate-850 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {acc.name}
                      </span>
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                        {acc.email}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {userAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAccount(index, e)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-500/5 transition-colors shrink-0 cursor-pointer"
                        title="Remove account from list"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </button>
              ))}

              <button
                onClick={() => setOneTapIsAdding(true)}
                className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-500/40 rounded-xl flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-450 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Use another account</span>
              </button>
            </div>
          )}

          {/* One Tap Footer */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 mt-3 pt-2 text-center">
            <p className="text-[9px] text-slate-450 dark:text-slate-500 leading-normal">
              To test other active profiles on your browser, click{" "}
              <strong className="font-semibold text-slate-500 dark:text-slate-400">
                Use another account
              </strong>{" "}
              to add them.
            </p>
          </div>
        </div>
      )}
      {/* Decorative ambient background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 -z-10" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 blur-3xl rounded-full -z-1" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 dark:bg-teal-500/10 blur-3xl rounded-full -z-1" />

      {/* Main Responsive Grid Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Brand Pitch & Taglines Panel */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg backdrop-blur-md transition-all duration-300">
          <div>
            {/* Header / Logo */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Handshake className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
                  DayMates
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Friendship Platform
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 font-medium leading-relaxed">
              DayMates is a simple, activity-first community. It's designed to
              bring people together over real-life interests, hobbies, and
              hangouts.
            </p>

            {/* Taglines lists */}
            <div className="space-y-6">
              <div>
                <ul className="space-y-3 pl-1">
                  {[
                    "Never spend your day alone.",
                    "Someone nearby wants to do the same thing.",
                    "Better days start with better company.",
                    "Life happens outside the screen.",
                    "Got plans but nobody to go with?",
                    "Don't cancel plans. Find company.",
                    "Make today less lonely.",
                    "Find mates for your day.",
                    "Every day deserves a friend.",
                  ].map((line, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-[13px] font-medium leading-normal animate-fade-in"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <span className="text-sky-500 dark:text-sky-400 shrink-0 mt-1 select-none text-xs">
                        ✦
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
            ✦ Activity-First Friendship • Real Connections
          </div>
        </div>

        {/* Right Column: Dynamic One-Click Sign In panel */}
        <div className="md:col-span-5 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all duration-300">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                Get Started
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Sign in to meet prospective activity buddies nearby
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-950/20 border border-red-800/30 rounded-xl flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed font-medium">
                  {error}
                </p>
              </div>
            )}

            {useDemoMode ? (
              // Demo Mode - Choose a Preset Profile
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-850/80 space-y-3 mb-6 animate-fade-in">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Developer Persona
                </span>
                <div className="space-y-2">
                  {PRESET_GOOGLE_ACCOUNTS.map((acc) => {
                    const isSelected = selectedDemoAccount.email === acc.email;
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => setSelectedDemoAccount(acc)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-sky-50 dark:bg-sky-500/10 border-sky-350 dark:border-sky-500/30 text-sky-950 dark:text-white font-bold shadow-sm"
                            : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={acc.avatar}
                            alt={acc.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="block text-xs font-bold text-slate-900 dark:text-white">
                              {acc.name}
                            </span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {acc.email}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          {acc.role.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Real Google Account Mode - Extremely clean, no hardcoded details shown upfront
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center text-sky-500 dark:text-sky-400 mb-2">
                  <svg className="h-7 w-7" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.28 1.845 15.54 1 12.24 1 5.865 1 .7 6.165.7 12.56s5.165 11.56 11.54 11.56c6.66 0 11.1-4.68 11.1-11.285 0-.765-.08-1.35-.18-1.85H12.24z"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Sign in to start matching
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed">
                  Press login to open Google One Tap and select your active
                  Google profile.
                </p>
              </div>
            )}

            <button
              onClick={handleGoogleLoginClick}
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-900 hover:text-black font-bold rounded-xl py-3.5 text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20"
            >
              <UserCheck className="h-5 w-5" />
              {loading
                ? "Connecting to Google..."
                : useDemoMode
                  ? `Sign In with Google (${selectedDemoAccount.name.split(" ")[0]})`
                  : "Login with Google"}
            </button>

            {/* Demo User Switcher - Kept on Bottom as requested */}
            <div className="mt-6 pt-4 border-t border-slate-150 dark:border-slate-800/60">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850/60 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4.5 w-4.5 text-sky-500 dark:text-sky-400" />
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      Demo User Mode
                    </span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Switch between developer personas
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseDemoMode(!useDemoMode)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{
                    backgroundColor: useDemoMode
                      ? "var(--color-sky-500, #0ea5e9)"
                      : "#cbd5e1",
                  }}
                  aria-label="Toggle Demo mode"
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{
                      transform: useDemoMode
                        ? "translateX(20px)"
                        : "translateX(0px)",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/85 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
              <span>Not a Dating App</span>
              <span className="text-slate-250 dark:text-slate-800">•</span>
              <span>Friendship First</span>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center font-medium">
              Find local people to share today's plans with
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
