/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { subscribeState, fetchCurrentUser, logout, fetchNotifications } from './services/api';
import { User } from './shared/types';
import LoginView from './components/LoginView';
import Dashboard from './components/Dashboard';
import ActivityDetailView from './components/ActivityDetailView';
import ProfileView from './components/ProfileView';
import NotificationsPanel from './components/NotificationsPanel';
import CreateActivityModal from './components/CreateActivityModal';
import { Handshake, Compass, Bell, User as UserIcon, LogOut, RefreshCw, Sun, Moon } from 'lucide-react';

type ViewState = 'discover' | 'detail' | 'profile' | 'notifications';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewState>('discover');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync state reactively with API database state
  useEffect(() => {
    const unsubscribe = subscribeState((state) => {
      setCurrentUser(state.user);
      
      // Calculate unread count
      const unreadCount = state.notifications.filter(n => !n.isRead).length;
      setUnreadNotifsCount(unreadCount);
    });

    // Check for existing authenticated session
    const initSession = async () => {
      try {
        await fetchCurrentUser();
        // Load initial notifications list
        await fetchNotifications();
      } catch (e) {
        // Ignored
      } finally {
        setLoading(false);
      }
    };

    initSession();

    return () => unsubscribe();
  }, []);

  const handleRefreshUnreadBadge = async () => {
    try {
      const notifs = await fetchNotifications();
      const unreadCount = notifs.filter(n => !n.isRead).length;
      setUnreadNotifsCount(unreadCount);
    } catch (e) {}
  };

  const handleSelectActivity = (id: string) => {
    setSelectedActivityId(id);
    setActiveView('detail');
  };

  const handleLogoClick = () => {
    setActiveView('discover');
    setSelectedActivityId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center shadow shadow-sky-500/15 mb-4 animate-bounce">
          <Handshake className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-md font-bold font-display text-slate-900 dark:text-white tracking-wide">Syncing DayMates...</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">Connecting to relational database</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={() => setActiveView('discover')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Decorative background glows */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-sky-950/20 via-slate-950/0 to-slate-950/0 pointer-events-none -z-10" />

      {/* Top Header/Navigation Rail */}
      <header className="border-b border-slate-200 bg-white/80 dark:border-slate-900 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 select-none transition-colors duration-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo brand */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="h-8.5 w-8.5 rounded-lg bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center shadow shadow-sky-500/10 group-hover:shadow-sky-500/20 transition-all">
              <Handshake className="h-4.5 w-4.5 text-slate-950 font-bold" />
            </div>
            <h1 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
              DayMates
            </h1>
          </div>

          {/* Nav buttons */}
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => {
                setActiveView('discover');
                setSelectedActivityId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeView === 'discover' || activeView === 'detail'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-900 dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/50'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Discover</span>
            </button>

            <button
              onClick={() => setActiveView('notifications')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer relative ${
                activeView === 'notifications'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-900 dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/50'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Inbox</span>
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-1 sm:right-1 h-2 w-2 rounded-full bg-sky-500 shadow shadow-sky-500/40" />
              )}
            </button>

            <button
              onClick={() => setActiveView('profile')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeView === 'profile'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-900 dark:text-white font-bold'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/50'
              }`}
            >
              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="h-5 w-5 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{currentUser.name}</span>
            </button>

            {/* Theme Toggle Button - Don't label it, just use the icon */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/50 rounded-xl transition-all cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            {/* Logout */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={() => {
                logout();
              }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all cursor-pointer"
              title="Logout session"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeView === 'discover' && (
          <Dashboard 
            currentUserId={currentUser.id}
            onSelectActivity={handleSelectActivity}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeView === 'detail' && selectedActivityId && (
          <ActivityDetailView 
            activityId={selectedActivityId}
            currentUserId={currentUser.id}
            onBack={() => {
              setActiveView('discover');
              setSelectedActivityId(null);
            }}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView 
            user={currentUser} 
            onUpdate={fetchCurrentUser} 
          />
        )}

        {activeView === 'notifications' && (
          <NotificationsPanel 
            onSelectActivity={handleSelectActivity}
            onRefreshBadge={handleRefreshUnreadBadge}
          />
        )}
      </main>

      {/* Dynamic proposal modal */}
      {isCreateModalOpen && (
        <CreateActivityModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            setActiveView('discover');
          }}
        />
      )}

      {/* Mobile persistent footer styling credits */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-5 text-center select-none mt-auto transition-colors duration-200">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
          DayMates Platform • Never Spend a day alone
        </p>
      </footer>
    </div>
  );
}
