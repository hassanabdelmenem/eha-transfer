import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type FooterTone = 'ink' | 'success' | 'warning' | 'critical-outline' | 'outline';

export type FooterAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  tone: FooterTone;
};

export const FOOTER_TONE_CLASSES: Record<FooterTone, string> = {
  ink: 'bg-ink text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200',
  success: 'bg-success-700 text-white hover:bg-success-800',
  warning: 'bg-warning-700 text-white hover:bg-warning-800',
  'critical-outline': 'border border-critical-700 bg-white text-critical-700 hover:bg-critical-50 dark:border-critical-400 dark:bg-transparent dark:text-critical-300 dark:hover:bg-critical-950/40',
  outline: 'border border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10',
};

const disabledClasses = 'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-white/45';

export interface MobileActionFooterProps {
  footerPrimary: FooterAction | null;
  footerSecondary: FooterAction | null;
  footerCallNumber?: string;
  /** Names the viewer's remit above the buttons ("Department actions"). */
  remitLabel?: string;
}

/** Pinned to the bottom of the phone screen: one primary, one secondary, one call. */
export const MobileActionFooter: React.FC<MobileActionFooterProps> = ({ footerPrimary, footerSecondary, footerCallNumber, remitLabel }) => {
  if (!footerPrimary) return null;

  return (
    <div className="print:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col gap-[9px] border-t border-slate-200 bg-white px-[18px] pt-3 pb-[max(16px,env(safe-area-inset-bottom))] dark:border-white/12 dark:bg-ink">
      {remitLabel && (
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-white/60">{remitLabel}</p>
      )}
      <button
        type="button"
        onClick={footerPrimary.onClick}
        disabled={footerPrimary.disabled}
        className={cn('min-h-[54px] w-full rounded-xl text-[16px] font-semibold transition-colors', FOOTER_TONE_CLASSES[footerPrimary.tone], disabledClasses)}
      >
        {footerPrimary.label}
      </button>
      {footerPrimary.disabled && footerPrimary.disabledReason && (
        <p className="text-center text-[12.5px] font-medium text-slate-700 dark:text-white/65">{footerPrimary.disabledReason}</p>
      )}
      {(footerSecondary || footerCallNumber) && (
        <div className="flex gap-[9px]">
          {footerSecondary && (
            <button
              type="button"
              onClick={footerSecondary.onClick}
              disabled={footerSecondary.disabled}
              className={cn('min-h-[48px] flex-1 rounded-[10px] text-[14px] font-semibold transition-colors', FOOTER_TONE_CLASSES[footerSecondary.tone], disabledClasses)}
            >
              {footerSecondary.label}
            </button>
          )}
          {footerCallNumber && (
            <a
              href={`tel:${footerCallNumber}`}
              aria-label="Call the referring doctor"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/25 dark:text-white/80 dark:hover:bg-white/10"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

/** The same actions, inline at the top right of the desktop header. */
export const InlineDetailActions: React.FC<MobileActionFooterProps> = ({ footerPrimary, footerSecondary, footerCallNumber }) => {
  if (!footerPrimary) return null;
  return (
    <>
      {footerCallNumber && (
        <a
          href={`tel:${footerCallNumber}`}
          aria-label="Call the referring doctor"
          className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/25 dark:text-white/80"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
      )}
      {footerSecondary && (
        <button type="button" onClick={footerSecondary.onClick} disabled={footerSecondary.disabled} className={cn('min-h-[48px] rounded-[10px] px-4 text-[14px] font-semibold', FOOTER_TONE_CLASSES[footerSecondary.tone], disabledClasses)}>
          {footerSecondary.label}
        </button>
      )}
      <span className="flex flex-col items-end gap-1">
        <button type="button" onClick={footerPrimary.onClick} disabled={footerPrimary.disabled} className={cn('min-h-[48px] rounded-[10px] px-5 text-[14px] font-semibold', FOOTER_TONE_CLASSES[footerPrimary.tone], disabledClasses)}>
          {footerPrimary.label}
        </button>
        {footerPrimary.disabled && footerPrimary.disabledReason && (
          <span className="text-[12px] text-slate-700 dark:text-white/65">{footerPrimary.disabledReason}</span>
        )}
      </span>
    </>
  );
};
