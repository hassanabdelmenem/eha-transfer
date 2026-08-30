import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Activity, Sparkles } from 'lucide-react';
import { showToast } from '../../lib/toast';

export interface RoleHomeHeaderProps {
  identity: string;
  dark?: boolean;
}

/**
 * Modernized lightweight page-level context badge.
 * Provides clean identity display and optional quick action without consuming excessive vertical space.
 */
export const RoleHomeHeader: React.FC<RoleHomeHeaderProps> = ({ identity, dark }) => {
  return (
    <div className="flex items-center justify-between gap-3 py-1 mb-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-2 h-2 rounded-full ${dark ? 'bg-purple-400' : 'bg-blue-500'} animate-pulse shrink-0`} />
        <p className={`text-xs font-medium truncate ${dark ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
          {identity}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => showToast('Arabic localization is planned for a subsequent update.', 'info')}
          aria-label="Switch to Arabic (coming soon)"
          className={`h-7 px-2 text-[11px] font-medium rounded-lg border transition-colors flex items-center gap-1 ${
            dark
              ? 'border-white/15 text-white/80 hover:bg-white/10'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span aria-hidden="true">ع</span>
        </button>

        <Link
          to="/notifications"
          aria-label="Notifications"
          className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors ${
            dark
              ? 'border-white/15 text-white/80 hover:bg-white/10'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
