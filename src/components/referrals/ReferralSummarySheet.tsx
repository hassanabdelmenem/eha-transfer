import React, { useRef } from 'react';
import { formatClock } from '../../i18n/format';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, AlertTriangle } from 'lucide-react';
import { Referral } from '../../types';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { FOOTER_TONE_CLASSES, FooterTone } from './detail/MobileActionFooter';
import { cn } from '../../lib/utils';

const NOT_RECORDED = '—';
const isAbnormal = (value: number | undefined, outOfRange: (n: number) => boolean) =>
  value !== undefined && outOfRange(value);
const show = (value: number | undefined, suffix = '') => (value === undefined ? NOT_RECORDED : `${value}${suffix}`);

// Abnormal cells are tinted AND carry a warning glyph and an sr-only word, so
// the flag never rests on colour alone.
const VitalCell: React.FC<{ label: string; value: React.ReactNode; abnormal: boolean }> = ({ label, value, abnormal }) => (
  <div className={cn(
    'rounded-[10px] border px-2 py-2.5 text-center',
    abnormal
      ? 'border-critical-200 bg-critical-50 dark:border-critical-800/60 dark:bg-critical-950/40'
      : 'border-slate-200 bg-paper dark:border-white/12 dark:bg-white/[0.04]'
  )}>
    <p className={cn('flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em]', abnormal ? 'text-critical-700 dark:text-critical-300' : 'text-slate-500 dark:text-white/60')}>
      {label}
      {abnormal && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
    </p>
    <p className={cn('mt-1 text-[16px] font-semibold tabular-nums', abnormal ? 'text-critical-700 dark:text-critical-300' : 'text-ink dark:text-paper')}>
      {value}
      {abnormal && <span className="sr-only"> (abnormal)</span>}
    </p>
  </div>
);

export interface SheetAction {
  label: string;
  tone: FooterTone;
  onClick: () => void | Promise<void>;
}

/**
 * "Summary" sheet from the department-head and hospital-manager queues:
 * enough of the clinical picture to decide without leaving the list. When the
 * caller passes decisions, they sit in a pinned footer (one 54px primary, then
 * up to two secondaries side by side); anything that needs a written reason
 * hands off to the full detail screen, which owns those dialogs.
 */
export const ReferralSummarySheet: React.FC<{
  referral: Referral;
  onClose: () => void;
  primary?: SheetAction;
  secondary?: SheetAction[];
}> = ({ referral, onClose, primary, secondary = [] }) => {
  const navigate = useNavigate();
  const vitals = referral.patientData.vitalSigns;
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(true, onClose, dialogRef);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/55" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-sheet-title"
        tabIndex={-1}
        className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-[14px] bg-white shadow-[0_-8px_30px_rgba(20,20,19,0.18)] focus:outline-none dark:bg-slate-900 motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-[220ms] motion-safe:ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 44px grab zone; the handle itself is decorative. */}
        <div className="flex h-11 shrink-0 items-center justify-center" aria-hidden="true">
          <div className="h-[5px] w-11 rounded-full bg-slate-300 dark:bg-white/25" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3">
          <div className="min-w-0">
            <h2 id="summary-sheet-title" className="truncate font-heading text-[21px] font-semibold tracking-[-0.02em] text-ink dark:text-paper">
              {referral.patientData.name}, {referral.patientData.age}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-700 dark:text-white/65">
              {referral.requiredBedType} · <span className="font-mono">{referral.patientData.hospitalId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close summary"
            className="-me-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60">Why the transfer</p>
            <p className="mt-1.5 text-[15.5px] leading-[1.55] text-ink dark:text-paper">{referral.reasonForReferral || NOT_RECORDED}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60">
              Vitals{vitals?.timestamp ? <> · <span className="font-mono normal-case tracking-normal">{formatClock(new Date(vitals.timestamp))}</span></> : ''}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <VitalCell label="HR" value={show(vitals?.hr, ' bpm')} abnormal={isAbnormal(vitals?.hr, n => n > 100 || n < 60)} />
              <VitalCell label="BP" value={vitals?.bp || NOT_RECORDED} abnormal={isAbnormal(parseInt(String(vitals?.bp || '').split('/')[0] || ''), n => !Number.isNaN(n) && (n > 140 || n < 90))} />
              <VitalCell label="SpO2" value={show(vitals?.spo2, '%')} abnormal={isAbnormal(vitals?.spo2, n => n < 95)} />
              <VitalCell label="Temp" value={show(vitals?.temp, '°C')} abnormal={isAbnormal(vitals?.temp, n => n > 38 || n < 36)} />
              <VitalCell label="RR" value={show(vitals?.rr, '/min')} abnormal={isAbnormal(vitals?.rr, n => n > 20 || n < 12)} />
              <VitalCell label="GCS" value={show(vitals?.gcs, '/15')} abnormal={isAbnormal(vitals?.gcs, n => n < 15)} />
            </div>
          </div>

          {referral.patientData.diagnosis && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60">Diagnosis</p>
              <p className="mt-1.5 text-[15px] leading-[1.5] text-ink dark:text-paper">{referral.patientData.diagnosis}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(`/referrals/${referral.id}`)}
            className="flex min-h-[52px] w-full items-center justify-between rounded-[10px] border border-slate-300 bg-white px-4 text-[15px] font-semibold text-ink transition-colors hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10"
          >
            ECG + full chart
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>

        {primary && (
          <div className="flex shrink-0 flex-col gap-[9px] border-t border-slate-200 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] dark:border-white/12">
            <button
              type="button"
              onClick={primary.onClick}
              className={cn('min-h-[54px] w-full rounded-xl text-[16px] font-semibold transition-colors', FOOTER_TONE_CLASSES[primary.tone])}
            >
              {primary.label}
            </button>
            {secondary.length > 0 && (
              <div className="flex gap-[9px]">
                {secondary.map(a => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.onClick}
                    className={cn('min-h-[48px] flex-1 rounded-[10px] text-[14.5px] font-semibold transition-colors', FOOTER_TONE_CLASSES[a.tone])}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
