import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { Referral } from '../../../types';
import { SLA_MINUTES } from '../../../lib/sla';
import { formatDateTime } from '../../../lib/utils';
import { useI18n } from '../../../i18n';
import { formatDayMonthClock } from '../../../i18n/format';

export type EscalationKey = NonNullable<Referral['escalationReason']>;

export interface EscalationAlertBannerProps {
  referral: Referral;
}

/** Minutes since the escalation, spoken the way the strip reads ("34 min"). */
function ageOf(iso: string | null | undefined, t: ReturnType<typeof useI18n>['t']): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const m = Math.max(0, differenceInMinutes(Date.now(), ms));
  return m < 60 ? t('escalationDetail.minutes', { m }) : t('escalationDetail.hoursMinutes', { h: Math.floor(m / 60), m: m % 60 });
}

// Strip, headline and detail sentences: escalationDetail.* in the catalogue.
export const EscalationAlertBanner: React.FC<EscalationAlertBannerProps> = ({ referral }) => {
  const { t, lang } = useI18n();
  const key: EscalationKey = referral.escalationReason || 'manual';
  const age = ageOf(referral.escalatedAt, t);
  // English keeps its long form ("Sep 30, 2026 2:05 PM"); Arabic gets day, month and a 24-hour clock.
  const when = referral.escalatedAt
    ? lang === 'ar' ? formatDayMonthClock(new Date(referral.escalatedAt), lang) : formatDateTime(referral.escalatedAt)
    : null;
  return (
    <>
      {referral.isEscalated && (
        <section aria-label={t('escalationDetail.label')} className="overflow-hidden rounded-xl border-2 border-critical-700 bg-critical-50 dark:bg-critical-950/60">
          <p className="flex items-center gap-2 bg-critical-700 px-[14px] py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(`escalationDetail.strip.${key}`)}{age ? ` · ${age}` : ''}
          </p>
          <div className="p-[14px]">
            <h3 className="font-sans text-[15px] font-semibold leading-[1.35] tracking-normal text-ink dark:text-paper">{t(`escalationDetail.headline.${key}`, { minutes: SLA_MINUTES })}</h3>
            <p className="mt-1 text-[14px] leading-[1.45] text-slate-700 dark:text-white/70">
              {t(`escalationDetail.detail.${key}`, { minutes: SLA_MINUTES })}
              {when ? ` ${t('escalationDetail.escalatedAt', { when })}` : ''}
            </p>
          </div>
        </section>
      )}

      {referral.status === 'rejected' && (
        <section className="rounded-[11px] border border-critical-200 bg-critical-50 p-[13px] dark:border-critical-800 dark:bg-critical-950/60">
          <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-critical-700 dark:text-critical-300">{t('escalationDetail.rejectionReason')}</h3>
          <p dir="auto" className="mt-[5px] text-[15px] font-medium leading-[1.4] text-ink dark:text-paper">{referral.rejectionReason || t('escalationDetail.noRejectionReason')}</p>
        </section>
      )}
    </>
  );
};
