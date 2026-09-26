import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { Referral } from '../../../types';
import { SLA_MINUTES } from '../../../lib/sla';
import { formatDateTime } from '../../../lib/utils';

export type EscalationKey = NonNullable<Referral['escalationReason']>;

export const ESCALATION_HEADLINE: Record<EscalationKey, string> = {
  sla_breach: `No response in ${SLA_MINUTES} minutes \u2014 escalated`,
  no_matching_facility: 'No hospital can take this patient',
  no_beds_available: 'Every matching hospital is full',
  manual: 'Escalated by staff',
  requirements_needed: 'Requirements needed \u2014 sent back to referring facility',
};

export const ESCALATION_DETAIL: Record<EscalationKey, string> = {
  sla_breach: `No facility responded within ${SLA_MINUTES} minutes of this referral being raised. System Admins can take direct actions regardless of department review.`,
  no_matching_facility: 'No facility in the network provides the required departments and bed type. Only a system administrator can place this patient \u2014 chasing the receiving facilities will not help.',
  no_beds_available: 'Every matching facility is at full capacity for the required bed type. Only a system administrator can place this patient \u2014 chasing the receiving facilities will not help.',
  manual: 'System Admins can take direct actions (Approve, Decline, Postpone) regardless of department review.',
  requirements_needed: 'The receiving department requested requirements before it can proceed. The referral was postponed and returned directly to the referring facility, without administrative approval \u2014 see the department review below for what is needed.',
};

export interface EscalationAlertBannerProps {
  referral: Referral;
}

const ESCALATION_STRIP: Record<EscalationKey, string> = {
  sla_breach: 'Escalated · no response',
  no_matching_facility: 'System level · no matching facility',
  no_beds_available: 'System level · no beds in network',
  manual: 'Escalated manually',
  requirements_needed: 'Sent back with requirements',
};

/** Minutes since the escalation, spoken the way the strip reads ("34 min"). */
function ageOf(iso?: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const m = Math.max(0, differenceInMinutes(Date.now(), t));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const EscalationAlertBanner: React.FC<EscalationAlertBannerProps> = ({ referral }) => {
  const key = referral.escalationReason || 'manual';
  const age = ageOf(referral.escalatedAt);
  return (
    <>
      {referral.isEscalated && (
        <section aria-label="Escalation" className="overflow-hidden rounded-xl border-2 border-critical-700 bg-critical-50 dark:bg-critical-950/60">
          <p className="flex items-center gap-2 bg-critical-700 px-[14px] py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {ESCALATION_STRIP[key]}{age ? ` · ${age}` : ''}
          </p>
          <div className="p-[14px]">
            <h3 className="font-sans text-[15px] font-semibold leading-[1.35] tracking-normal text-ink dark:text-paper">{ESCALATION_HEADLINE[key]}</h3>
            <p className="mt-1 text-[14px] leading-[1.45] text-slate-700 dark:text-white/70">
              {ESCALATION_DETAIL[key]}
              {referral.escalatedAt ? ` Escalated ${formatDateTime(referral.escalatedAt)}.` : ''}
            </p>
          </div>
        </section>
      )}

      {referral.status === 'rejected' && (
        <section className="rounded-[11px] border border-critical-200 bg-critical-50 p-[13px] dark:border-critical-800 dark:bg-critical-950/60">
          <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-critical-700 dark:text-critical-300">Rejection Reason:</h3>
          <p className="mt-[5px] text-[15px] font-medium leading-[1.4] text-ink dark:text-paper">{referral.rejectionReason || 'No rejection reason specified.'}</p>
        </section>
      )}
    </>
  );
};
