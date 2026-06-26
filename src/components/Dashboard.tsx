/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect } from 'react';
import { fetchActivities } from '../services/api';
import { Activity, ActivityCategory } from '../shared/types';
import ActivityCard, { getCategoryStyles } from './ActivityCard';
import { Search, Plus, Calendar, RotateCw, Sparkles, AlertCircle, WifiOff, ArrowRight, Monitor } from 'lucide-react';

interface DashboardProps {
  currentUserId: string;
  onSelectActivity: (id: string) => void;
  onOpenCreateModal: () => void;
}

export default function Dashboard({ currentUserId, onSelectActivity, onOpenCreateModal }: DashboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'ALL'>('ALL');
  
  // PWA installation support
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Listen for network state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchActivities(selectedCategory === 'ALL' ? undefined : selectedCategory);
      setActivities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [selectedCategory]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Filter activities locally by search bar input
  const filteredActivities = activities.filter(act => {
    const query = searchQuery.toLowerCase();
    return (
      act.title.toLowerCase().includes(query) ||
      act.description.toLowerCase().includes(query) ||
      act.location.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-950/40 border border-amber-800/40 text-amber-300 p-4 rounded-xl flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Offline Mode Active.</span> You are currently browsing from your local cached data. Changes will sync when connectivity returns.
          </div>
        </div>
      )}

      {/* PWA Install Promo Banner */}
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-sky-900/60 to-teal-900/60 border border-sky-800/40 text-sky-100 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 shadow">
              <Monitor className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-display">Install DayMates App</h4>
              <p className="text-xs text-sky-200 mt-0.5">Add to your home screen for quick offline-ready mobile notifications!</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-850 hover:bg-slate-850 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button 
              onClick={handleInstallClick}
              className="px-4 py-1.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-900 hover:text-black font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow cursor-pointer"
            >
              Install <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
        <div className="space-y-3.5 max-w-xl">
          <div className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-sky-500/15">
            <Sparkles className="h-3 w-3" /> friendship discovery platform
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">Find your buddy for activities!</h2>
          
          {/* Daily connection quote widget */}
          <div className="border-l-2 border-teal-500 pl-3 py-1.5 bg-slate-50 dark:bg-slate-950/60 rounded-r-xl my-2">
            <p className="text-xs italic text-slate-700 dark:text-teal-300 font-medium leading-relaxed">
              "Happiness is only real when shared. Step out, connect, and let today be the start of a brand new adventure with like-minded friends!"
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-1 font-semibold uppercase tracking-wider">— Daily Spark</p>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Discover jogging groups, chess matches, cycling buddies, or study partners. Propose your own event or request to join existing boards below!
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-5 py-3.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-900 hover:text-black font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4.5 w-4.5" /> Propose Activity
        </button>
      </div>

      {/* Search & Category Filter Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by keywords, location, or activity name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-450 dark:placeholder-slate-500 transition-all outline-none"
          />
        </div>

        {/* Categories Horizontal scrolling container */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border cursor-pointer shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 font-bold shadow-sm'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            🌐 All Boards
          </button>
          
          {Object.values(ActivityCategory).map((cat) => {
            const isSelected = selectedCategory === cat;
            const styles = getCategoryStyles(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border cursor-pointer shrink-0 transition-all ${
                  isSelected
                    ? `${styles.bg} border-current font-bold shadow-sm`
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {styles.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="py-24 text-center">
          <RotateCw className="h-7 w-7 text-sky-500 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-mono">Syncing activity boards...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center bg-red-950/20 border border-red-900/30 rounded-2xl max-w-lg mx-auto">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-white mb-1">Retrieval Failed</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mb-4">{error}</p>
          <button 
            onClick={loadActivities}
            className="px-4 py-2 bg-slate-850 text-white rounded-lg border border-slate-750 hover:bg-slate-750 transition-colors cursor-pointer text-xs font-semibold"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-20 text-center bg-slate-100/60 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-850/60 rounded-2xl flex flex-col items-center px-4 animate-fade-in">
          <Calendar className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-3.5" />
          <h4 className="text-md font-bold text-slate-900 dark:text-white font-display mb-1.5">No activities found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-5">
            We couldn't find any matching activity boards right now. Why not propose one yourself and spark a new friendship?
          </p>
          <div className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 max-w-md p-4 rounded-xl border border-sky-100/50 dark:border-sky-950/50 text-xs italic mb-6 shadow-sm">
            "A single conversation across the table with a new buddy is better than ten years’ mere study of books. Step out today!"
          </div>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl border border-slate-750 hover:bg-slate-705 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Propose First Activity
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredActivities.map((act) => (
            <ActivityCard 
              key={act.id} 
              activity={act} 
              currentUserId={currentUserId}
              onSelect={onSelectActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
