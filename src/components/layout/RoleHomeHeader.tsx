import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { showToast } from '../../lib/toast';

// 1a/1b/1c/2a/2b: the 48px identity + language row every role home's header
// carries per spec. Split into two controls, not one -- a single "ع" link
// that actually opened /notifications (its accessible name said
// "Notifications") was both mislabeled and not a language control at all.
// Arabic RTL layout is an explicitly deferred design pass (see the handoff
// spec's Interactions & behaviour section), so this toggle is honest about
// not doing anything yet rather than silently failing.
export const RoleHomeHeader: React.FC<{ identity: string; dark?: boolean }> = ({ identity, dark }) => {
  const iconClasses = `h-10 w-10 shrink-0 flex items-center justify-center rounded-full border ${
    dark ? 'border-white/20 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
  }`;

  return (
    <div className="flex items-center justify-between gap-2">
      <p className={`text-xs uppercase tracking-wide truncate ${dark ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
        {identity}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => showToast('Arabic layout is coming in a future update.', 'info')}
          aria-label="Switch to Arabic (coming soon)"
          className={iconClasses}
        >
          <span className="text-sm" aria-hidden="true">ع</span>
        </button>
        <Link to="/notifications" aria-label="Notifications" className={iconClasses}>
          <Bell className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};
