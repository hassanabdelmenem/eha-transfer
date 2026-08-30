import React from 'react';
import { ShieldAlert } from 'lucide-react';
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

export const EscalationAlertBanner: React.FC<EscalationAlertBannerProps> = ({ referral }) => {
  return (
    <>
      {referral.isEscalated && (
        <div className="p-4 bg-critical-700 text-white rounded-lg shadow-md flex items-center justify-between border-2 border-critical-800">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-sm">
                {ESCALATION_HEADLINE[referral.escalationReason || 'manual']}
              </h3>
              <p className="text-sm text-white">
                {ESCALATION_DETAIL[referral.escalationReason || 'manual']}
                {referral.escalatedAt ? ` Escalated ${formatDateTime(referral.escalatedAt)}.` : ''}
              </p>
            </div>
          </div>
          <span className="text-xs bg-critical-900 text-white font-semibold px-2 py-1 rounded whitespace-nowrap">
            Admin can act now
          </span>
        </div>
      )}

      {referral.status === 'rejected' && (
        <div className="p-4 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg text-critical-800 dark:text-critical-200">
          <h3 className="font-semibold text-sm mb-1">Rejection Reason:</h3>
          <p className="text-sm">{referral.rejectionReason || 'No rejection reason specified.'}</p>
        </div>
      )}
    </>
  );
};
