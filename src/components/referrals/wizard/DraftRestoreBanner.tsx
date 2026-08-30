import React from 'react';
import { Save, Trash2, X } from 'lucide-react';

interface DraftRestoreBannerProps {
  lastSaved?: string;
  onDiscard: () => void;
  onDismiss: () => void;
}

export const DraftRestoreBanner: React.FC<DraftRestoreBannerProps> = ({
  lastSaved,
  onDiscard,
  onDismiss
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl text-blue-900 dark:text-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
          <Save className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-bold">Draft referral restored</span>
          <span className="text-blue-700 dark:text-blue-300 ml-1.5">
            {lastSaved ? `(last auto-saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : 'from your previous browser session.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onDiscard}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-critical-600 dark:text-critical-400 hover:bg-critical-50 dark:hover:bg-critical-950/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Discard Draft
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
