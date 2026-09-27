import React from 'react';
import { RotateCcw, X } from 'lucide-react';

interface DraftRestoreBannerProps {
  lastSaved?: string;
  onDiscard: () => void;
  onDismiss: () => void;
}

/** Shown once when the wizard reopens on a saved draft: say so, offer a clean start. */
export const DraftRestoreBanner: React.FC<DraftRestoreBannerProps> = ({ lastSaved, onDiscard, onDismiss }) => {
  const t = Date.parse(lastSaved || '');
  const when = Number.isNaN(t) ? null : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div role="status" className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white py-1.5 pr-1.5 pl-3.5 dark:border-white/12 dark:bg-white/5">
      <RotateCcw className="h-4 w-4 shrink-0 text-slate-700 dark:text-white/70" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink dark:text-paper">
        <span className="font-semibold">Draft referral restored</span>
        <span className="text-slate-700 dark:text-white/65">{when ? ` · saved ${when}` : ' · from your last session'}</span>
      </p>
      <button type="button" onClick={onDiscard} className="min-h-[44px] shrink-0 rounded-[8px] px-3 text-[14px] font-semibold text-critical-700 hover:bg-critical-50 dark:text-critical-300 dark:hover:bg-critical-950/40">
        Discard Draft
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss banner" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
