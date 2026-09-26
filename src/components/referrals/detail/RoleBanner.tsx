import React from 'react';
import { cn } from '../../../lib/utils';
import type { BannerTint } from './ReferralDetailHeader';

const TINTS: Record<BannerTint, { box: string; label: string }> = {
  info: { box: 'border-info-300 bg-info-100 dark:border-info-700 dark:bg-info-900/50', label: 'text-info-800 dark:text-info-300' },
  success: { box: 'border-success-300 bg-success-100 dark:border-success-700 dark:bg-success-900/60', label: 'text-success-700 dark:text-success-300' },
  warning: { box: 'border-warning-300 bg-warning-100 dark:border-warning-700 dark:bg-warning-900/40', label: 'text-warning-800 dark:text-warning-300' },
  critical: { box: 'border-critical-200 bg-critical-50 dark:border-critical-800 dark:bg-critical-950/60', label: 'text-critical-700 dark:text-critical-300' },
};

export interface RoleBannerProps {
  label: string;
  text?: string;
  tint: BannerTint;
}

/** What this referral means to the person looking at it: one label, one sentence. */
export const RoleBanner: React.FC<RoleBannerProps> = ({ label, text, tint }) => (
  <section aria-label={label} className={cn('rounded-[11px] border p-[13px]', TINTS[tint].box)}>
    <p className={cn('text-[11px] font-bold uppercase tracking-[0.08em]', TINTS[tint].label)}>{label}</p>
    {text && <p className="mt-[5px] text-[15px] font-medium leading-[1.4] text-ink dark:text-paper">{text}</p>}
  </section>
);
