import React from 'react';
import { formatClock } from '../../../i18n/format';
import { RotateCcw, X } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface DraftRestoreBannerProps {
  lastSaved?: string;
  onDiscard: () => void;
  onDismiss: () => void;
}

/** Shown once when the wizard reopens on a saved draft: say so, offer a clean start. */
export const DraftRestoreBanner: React.FC<DraftRestoreBannerProps> = ({ lastSaved, onDiscard, onDismiss }) => {
  const { t, lang } = useI18n();
  const savedMs = Date.parse(lastSaved || '');
  const when = Number.isNaN(savedMs) ? null : formatClock(new Date(savedMs), lang);
  return (
    <div role="status" className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white py-1.5 pe-1.5 ps-3.5 dark:border-white/12 dark:bg-white/5">
      <RotateCcw className="h-4 w-4 shrink-0 text-slate-700 dark:text-white/70" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink dark:text-paper">
        <span className="font-semibold">{t('wizard.restored')}</span>
        <span className="text-slate-700 dark:text-white/65">{when ? t('wizard.restoredAt', { time: when }) : t('wizard.restoredLast')}</span>
      </p>
      <button type="button" onClick={onDiscard} className="min-h-[44px] shrink-0 rounded-[8px] px-3 text-[14px] font-semibold text-critical-700 hover:bg-critical-50 dark:text-critical-300 dark:hover:bg-critical-950/40">
        {t('wizard.discardDraft')}
      </button>
      <button type="button" onClick={onDismiss} aria-label={t('wizard.dismissBanner')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
