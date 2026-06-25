/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, ActivityCategory, ParticipantStatus } from '../shared/types';
import { Calendar, Clock, MapPin, Users, CheckCircle, Hourglass, ShieldAlert } from 'lucide-react';

interface ActivityCardProps {
  activity: Activity;
  currentUserId: string;
  onSelect: (id: string) => void;
  key?: any;
}

export function getCategoryStyles(category: ActivityCategory) {
  switch (category) {
    case ActivityCategory.JOGGING:
      return { bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400', label: '🏃 Jogging' };
    case ActivityCategory.CYCLING:
      return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: '🚴 Cycling' };
    case ActivityCategory.BADMINTON:
      return { bg: 'bg-pink-500/10 border-pink-500/20 text-pink-400', label: '🏸 Badminton' };
    case ActivityCategory.MOVIE:
      return { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', label: '🍿 Movies' };
    case ActivityCategory.STUDY:
      return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', label: '📚 Study Group' };
    case ActivityCategory.GYM:
      return { bg: 'bg-red-500/10 border-red-500/20 text-red-400', label: '🏋️ Gym' };
    case ActivityCategory.CHESS:
      return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: '♟️ Chess' };
    default:
      return { bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400', label: '✨ Activity' };
  }
}

export default function ActivityCard({ activity, currentUserId, onSelect }: ActivityCardProps) {
  const styles = getCategoryStyles(activity.category);
  const isCreator = activity.creatorId === currentUserId;
  
  // Format dates elegantly
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadge = () => {
    if (isCreator) {
      return (
        <span className="text-[10px] font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Host
        </span>
      );
    }
    
    switch (activity.myStatus) {
      case ParticipantStatus.APPROVED:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold bg-teal-500/10 border border-teal-500/25 text-teal-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <CheckCircle className="h-2.5 w-2.5" /> Approved
          </span>
        );
      case ParticipantStatus.PENDING:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Hourglass className="h-2.5 w-2.5" /> Requested
          </span>
        );
      case ParticipantStatus.REJECTED:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold bg-red-500/10 border border-red-500/25 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <ShieldAlert className="h-2.5 w-2.5" /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={() => onSelect(activity.id)}
      className="bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/85 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-5 transition-all duration-250 hover:-translate-y-0.5 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg cursor-pointer flex flex-col h-full group"
    >
      {/* Upper row: Category & Join Status */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[11px] font-semibold font-mono uppercase px-2.5 py-1 rounded-lg border ${styles.bg}`}>
          {styles.label}
        </span>
        {getStatusBadge()}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors mb-2 line-clamp-1">
        {activity.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4 flex-grow">
        {activity.description}
      </p>

      {/* Meta tags: Date, Time, Location */}
      <div className="space-y-2 mb-5 border-t border-slate-100 dark:border-slate-800/40 pt-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{formatFriendlyDate(activity.date)}</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>{activity.time}</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">{activity.location}</span>
        </div>
      </div>

      {/* Footer: Host profile and slots */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-auto">
        <div className="flex items-center gap-2 max-w-[65%]">
          <img 
            src={activity.creatorAvatar} 
            alt={activity.creatorName}
            referrerPolicy="no-referrer"
            className="h-6.5 w-6.5 rounded-full border border-slate-200 dark:border-slate-850 object-cover"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
            {activity.creatorName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-850">
          <Users className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <span>{activity.joinedCount}/{activity.slots}</span>
        </div>
      </div>
    </div>
  );
}
