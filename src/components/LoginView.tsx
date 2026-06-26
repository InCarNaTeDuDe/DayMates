/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useState, use, useTransition } from "react";
import { googleSignIn, fetchGoogleConfig } from "../services/api";
import {
  Handshake,
  ChevronDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Compass,
  Calendar,
  ShieldCheck,
  ArrowRight,
  LogIn,
  UserPlus,
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: () => void;
}

// Global promise to check Google Identity Services script load status (React 19 use() pattern)
let gsiPromise: Promise<boolean> | null = null;
function getGsiPromise() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<boolean>((resolve) => {
    const checkGSI = () => {
      if ((window as any).google?.accounts?.id) {
        resolve(true);
      } else {
        setTimeout(checkGSI, 100);
      }
    };
    checkGSI();
  });
  return gsiPromise;
}

// Global cached promise for fetching Google client configuration (React 19 use() pattern)
let googleConfigPromise: Promise<{ clientId: string }> | null = null;
function getGoogleConfigPromise() {
  if (!googleConfigPromise) {
    googleConfigPromise = fetchGoogleConfig();
  }
  return googleConfigPromise;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  // Use React 19's use() hook to wait for GSI script and backend Google Config load status
  const gsiReady = use(getGsiPromise());
  const config = use(getGoogleConfigPromise());
  const clientId = config?.clientId || "";

  // Use state for tracking active tab & errors (where needed)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  // Use React 19's useTransition to handle pending states without manual useState
  const [isPending, startTransition] = useTransition();

  // Render or re-render GSI elements when gsiReady, clientId or activeTab changes
  useEffect(() => {
    if (!gsiReady || !clientId) return;

    try {
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm: true, // Enable Google's recommended modern protocol for secure federated credential retrieval
        error_callback: (err: any) => {
          console.error("[Google GSI Global Initialization Error]:", err);
        },
      });

      // Render official Google Sign-In button based on state
      const btnContainer = document.getElementById("google-signin-button");
      if (btnContainer) {
        btnContainer.innerHTML = ""; // Clean up previous
        (window as any).google.accounts.id.renderButton(btnContainer, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: activeTab === "register" ? "signup_with" : "signin_with",
          shape: "pill",
          width: "100%",
        });
      }

      // Automatically prompt One Tap for instant login
      if (activeTab === "login") {
        (window as any).google.accounts.id.prompt((notification: any) => {
          const status = notification.getMomentType();
          console.log("[Google One Tap Diagnostic Log] status:", status);
          if (notification.isNotDisplayed()) {
            console.warn(
              "[Google One Tap Diagnostic] Not displayed. Reason:",
              notification.getNotDisplayedReason(),
            );
          } else if (notification.isSkipped()) {
            console.warn(
              "[Google One Tap Diagnostic] Skipped. Reason:",
              notification.getSkippedReason(),
            );
          } else if (notification.isDismissed()) {
            console.warn(
              "[Google One Tap Diagnostic] Dismissed. Reason:",
              notification.getDismissedReason(),
            );
          }
        });
      }
    } catch (err: any) {
      console.error("[Google GIS Error]", err);
    }
  }, [gsiReady, clientId, activeTab]);

  const handleCredentialResponse = (response: any) => {
    setError(null);
    setShowRegisterPrompt(false);

    // Run sign-in process inside React 19 transition
    startTransition(async () => {
      try {
        console.log(
          `[Google Login] Received credential for mode: ${activeTab}`,
        );
        await googleSignIn("", "", "", response.credential, activeTab);
        onLoginSuccess();
      } catch (err: any) {
        // If they tried logging in but account was not found
        if (
          err.message &&
          err.message.toLowerCase().includes("not registered")
        ) {
          setShowRegisterPrompt(true);
          setError(
            'Google account not found! You are not registered yet. Please switch to the "Register" tab to build your profile.',
          );
        } else {
          setError(err.message || "Google Authentication failed");
        }
      }
    });
  };

  // Safe developer bypass/mock token generator for quick workspace testing
  // Utilizes React 19 Action handler style
  const handleDeveloperBypass = (formData: FormData) => {
    const email =
      (formData.get("email") as string) || "bharathmaska163@gmail.com";
    const name = (formData.get("name") as string) || "Bharath Maska";

    setError(null);
    setShowRegisterPrompt(false);

    startTransition(async () => {
      try {
        // Simulate real JWT token payload structure for Google Credential
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const payload = btoa(
          JSON.stringify({
            email,
            name,
            picture: `https://images.unsplash.com/photo-${1535713875002 - Math.floor(Math.random() * 100)}?w=150&h=150&fit=crop&q=80`,
            iss: "https://accounts.google.com",
            aud: clientId,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        );
        const mockCredential = `${header}.${payload}.mocksignature`;

        // Trigger sign-in action with current mode (login / register)
        await googleSignIn(email, name, "", mockCredential, activeTab);
        onLoginSuccess();
      } catch (err: any) {
        if (
          err.message &&
          err.message.toLowerCase().includes("not registered")
        ) {
          setShowRegisterPrompt(true);
          setError(
            'Developer account not found! This email is not registered. Please switch to "Register" to create your profile.',
          );
        } else {
          setError(err.message || "Developer bypass sign in failed");
        }
      }
    });
  };

  const triggerOneTapPromptManual = () => {
    setError(null);
    setShowRegisterPrompt(false);
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason() || "suppressed";
          setError(`Google One Tap was skipped or blocked by browser/domain constraints (Google reason: "${reason}"). 

If you are seeing a 403 Forbidden error in your Developer Console, your current domain is not authorized. Please make sure to add your current domain (both Development and Shared App URLs) to the "Authorized JavaScript Origins" in your Google Cloud Console credentials! Otherwise, use the Developer Sandbox below to sign in instantly.`);
        }
      });
    } else {
      setError(
        "Google Identity Services SDK is still loading. Please wait a moment.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 md:p-10 font-sans transition-colors duration-300 relative overflow-hidden animate-fade-in">
      {/* Ambient background glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-50 to-slate-50 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950 -z-10" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 blur-3xl rounded-full -z-1" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 dark:bg-teal-500/10 blur-3xl rounded-full -z-1" />

      {/* Main Dual-Panel Layout Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
        {/* Left Card: Bullet Points / How App Works (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 blur-3xl rounded-full" />

          <div className="space-y-6 relative z-10">
            {/* Branding Header */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-400 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-sky-500/20">
                <Handshake className="h-5 w-5" />
              </div>
              <span className="text-md font-extrabold tracking-tight font-display bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
                DayMates
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display leading-tight tracking-tight">
                Never spend your day alone.
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect instantly with local people who want to share
                activities, meals, sports, or hobbies today.
              </p>
            </div>

            {/* Feature bullets */}
            <div className="space-y-5 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="h-4 w-4 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    Friendship-First Community
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    We focus on sharing hobbies and making clean, platonic
                    friendships. No dating stress.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    Spontaneous Real-Time Matches
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Browse activities happening in your neighborhood today or
                    post your own plans in 30 seconds.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    Seamless Safe Meetups
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Check out verified member profiles, coordinate safely via
                    group chats, and attend with confidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Energetic Human Connection Quote Card */}
            <div className="relative p-5 bg-gradient-to-r from-sky-500/10 to-teal-500/10 border border-sky-500/20 rounded-2xl my-4 animate-fade-in">
              <div className="absolute top-2 right-3 text-sky-400/25 font-serif text-3xl">
                “
              </div>
              <p className="text-[11px] italic text-sky-200 font-medium leading-relaxed">
                "There are no strangers here; only friends you haven't met yet.
                Step out, connect, and let today be the start of an amazing
                shared adventure!"
              </p>
              <p className="text-[9px] text-teal-400 font-bold uppercase tracking-wider mt-2.5">
                — DayMates Spark
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 mt-8 relative z-10 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-semibold text-slate-400">
              <ShieldCheck className="h-4 w-4 text-sky-400" /> Trusted Platonic
              Network
            </span>
            <span className="font-mono text-slate-500">v2.1.0</span>
          </div>
        </div>

        {/* Right Card: Login/Register Form (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between">
          <div>
            {/* Tabs Selector for Login / Register */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6 border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setError(null);
                  setShowRegisterPrompt(false);
                }}
                className={`flex-1 py-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase font-display rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "login"
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20 transform scale-[1.01] font-extrabold ring-1 ring-white/10"
                    : "text-slate-550 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-900/30"
                }`}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                  setShowRegisterPrompt(false);
                }}
                className={`flex-1 py-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase font-display rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "register"
                    ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20 transform scale-[1.01] font-extrabold ring-1 ring-white/10"
                    : "text-slate-550 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-900/30"
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Register / Sign Up
              </button>
            </div>

            {/* Prompt Header */}
            <div className="space-y-1.5 mb-6">
              <h2 className="text-xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">
                {activeTab === "login"
                  ? "Welcome Back!"
                  : "Create Your Account"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === "login"
                  ? "Sign in to sync your plans and check pending activities."
                  : "Join today to host events and meet friendly local buddies."}
              </p>
            </div>

            {/* Dynamic Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 animate-fade-in">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-xs text-red-600 dark:text-red-300 font-semibold leading-relaxed">
                    {error}
                  </p>
                  {showRegisterPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("register");
                        setError(null);
                        setShowRegisterPrompt(false);
                      }}
                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      Switch to Register Tab <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Central Auth Area with Colored Google G Brand Logo */}
            <div className="flex flex-col items-center justify-center text-center py-6 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/80 rounded-2xl mb-6">
              <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-3">
                <svg className="h-7 w-7" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {activeTab === "login"
                  ? "Login with your Google Profile"
                  : "Register with Google Profile"}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[280px] mt-1 leading-normal">
                {activeTab === "login"
                  ? "Access your saved circles and chats instantly using Google One Tap."
                  : "Securely create your DayMates profile with your primary email."}
              </p>

              {/* Helpful Sandbox IFrame Notice */}
              <div className="mx-4 mt-4 p-3 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-left space-y-2">
                <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-normal font-medium">
                  ⚠️ <strong>Google One Tap / 403 Forbidden Note:</strong>
                  <br />
                  If Google accounts do not load automatically, your browser
                  domain is not authorized in your Google Cloud OAuth Client
                  Credentials, or Chrome is blocking the Google iframe inside
                  this AI Studio preview.
                </p>

                <details className="text-[9px] text-slate-600 dark:text-slate-400 cursor-pointer">
                  <summary className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                    How to authorize your domains in Google Cloud Console
                  </summary>
                  <div className="mt-1.5 p-2 bg-white/60 dark:bg-slate-950/40 rounded border border-slate-200/40 dark:border-slate-800/40 space-y-1 select-text">
                    <p className="font-bold">
                      1. Open Google Cloud Console Credentials:
                    </p>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline block truncate font-medium"
                    >
                      https://console.cloud.google.com/apis/credentials
                    </a>
                    <p className="font-bold mt-1">
                      2. Edit your OAuth 2.0 Client ID and add to "Authorized
                      JavaScript origins":
                    </p>
                    <code className="block bg-slate-100 dark:bg-slate-900 p-1.5 rounded font-mono text-[8.5px] break-all text-slate-700 dark:text-slate-300">
                      https://ais-dev-aj7bmatl56liu3zvgzeett-692488307747.asia-east1.run.app
                    </code>
                    <code className="block bg-slate-100 dark:bg-slate-900 p-1.5 rounded font-mono text-[8.5px] break-all text-slate-700 dark:text-slate-300">
                      https://ais-pre-aj7bmatl56liu3zvgzeett-692488307747.asia-east1.run.app
                    </code>
                    <p className="font-bold mt-1">3. Test in a New Tab:</p>
                    <p className="leading-normal">
                      Click the <strong>Open in a new tab</strong> icon in the
                      top right of your AI Studio preview so Google's One Tap is
                      not blocked by nested iframe restrictions.
                    </p>
                  </div>
                </details>
              </div>
            </div>

            {/* Primary OAuth action triggers */}
            <div className="space-y-4">
              <button
                onClick={triggerOneTapPromptManual}
                disabled={isPending}
                className="w-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold rounded-xl py-3.5 text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing Google Account...
                  </span>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                    </svg>
                    {activeTab === "login"
                      ? "Login with Google One Tap"
                      : "Register with Google account"}
                  </>
                )}
              </button>

              {/* Official standard button fallback placeholder */}
              <div
                id="google-signin-button"
                className="w-full flex justify-center py-1"
              ></div>
            </div>
          </div>

          {/* Dev Mode Accordion - Expanded by default for sandbox accessibility */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-850">
            <details
              open
              className="group border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden bg-slate-50/50 dark:bg-slate-950/20"
            >
              <summary className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 group-open:text-sky-600 dark:group-open:text-sky-400 transition-colors">
                  <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                  Developer Sandbox / Demo User Mode
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
              </summary>

              <div className="px-3.5 pb-4 pt-1.5 text-[11px] border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-3">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  No Client ID configured or testing in a sandbox? Use the form
                  below to simulate a Google JWT ID Token and login immediately.
                </p>

                {/* Form utilizing React 19 action prop */}
                <form action={handleDeveloperBypass} className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Testing Full Name
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Bharath Maska"
                      defaultValue="Bharath Maska"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none transition-all placeholder-slate-450 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Testing Email Address
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="e.g. bharathmaska163@gmail.com"
                      defaultValue="bharathmaska163@gmail.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none transition-all placeholder-slate-450 font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full mt-1 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl py-2.5 text-[11px] tracking-wide transition-all shadow-md shadow-sky-500/5 cursor-pointer"
                  >
                    {isPending
                      ? "Bypassing..."
                      : `Issue Google Token (${activeTab === "login" ? "Sign In" : "Register"})`}
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
