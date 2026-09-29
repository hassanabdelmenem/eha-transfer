import React from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import { describeCapacityEscalation } from '../../lib/routing';
import { EscalationAlertBannerProps } from './types';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../layout/Workspace';

// Why the case escalated, in the words the strip uses ("Escalated · no
// response 34 min"). Lower-case: the strip sets its own case.
const REASON_WORDS: Record<string, string> = {
  sla_breach: 'no response',
  no_beds_available: 'no beds in network',
  no_matching_facility: 'no matching facility',
  requirements_needed: 'requirements outstanding',
  manual: 'raised by hand',
};

const minutesSince = (iso: string | undefined): number | null => {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
};

/**
 * The escalated case, pinned above the queue: a 2px brick card whose solid
 * header strip states the reason and how long it has waited. System-level
 * escalations (no bed anywhere in the network) say so, and carry the capacity
 * sentence from lib/routing instead of the referral context line.
 */
export const EscalationAlertBanner: React.FC<EscalationAlertBannerProps> = ({
  referral,
  onAction,
  actionLabel = 'Review now',
  secondaryAction,
  referrerPhone,
  referringFacilityName,
}) => {
  // In the desktop workspace, mark the pinned case when it is the one open beside the queue.
  const ws = useWorkspace();
  const selected = !!ws && ws.selectedId === referral.id;
  const reasonKey = referral.escalationReason || 'manual';
  const reason = REASON_WORDS[reasonKey] || reasonKey.replace(/_/g, ' ');
  const systemLevel = referral.escalationLevel === 'system';
  const mins = minutesSince(referral.escalatedAt || referral.createdAt);
  const strip = systemLevel
    ? `System level · ${reason}`
    : `Escalated · ${reason}${mins === null ? '' : ` ${mins} min`}`;

  const capacitySentence =
    reasonKey === 'no_beds_available' || reasonKey === 'no_matching_facility'
      ? describeCapacityEscalation(reasonKey)
      : null;

  return (
    <section
      aria-label="Escalated case"
      aria-current={selected ? 'true' : undefined}
      className={cn('shrink-0 overflow-hidden rounded-xl border-2 border-critical-700 bg-critical-100 dark:border-critical-400/70 dark:bg-critical-950/45', selected && 'ring-4 ring-critical-700/25 dark:ring-critical-400/30')}
    >
      <p className="flex items-center gap-2 bg-critical-700 px-[14px] py-2 text-[11.5px] font-bold uppercase leading-tight tracking-[0.08em] text-white dark:bg-transparent dark:pb-0 dark:pt-3 dark:text-critical-300">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {strip}
      </p>
      <div className="px-[14px] pt-3 pb-[14px]">
        <p className="text-[17px] font-semibold leading-[1.25] text-ink dark:text-paper">
          {referral.patientData.name}, {referral.patientData.age}
          {systemLevel && <span> · {referral.requiredBedType}</span>}
        </p>
        <p className="mt-[3px] text-[13.5px] leading-[1.4] text-slate-700 dark:text-white/70">
          {capacitySentence ?? (
            <>
              {referral.requiredBedType} bed
              {referral.reasonForReferral ? ` · ${referral.reasonForReferral}` : ''}
              {referringFacilityName ? ` · from ${referringFacilityName}` : ''}
            </>
          )}
        </p>

        {/* In the workspace the open case's header carries the action. */}
        {!ws && (onAction || secondaryAction || referrerPhone) && (
          <div className="mt-3 flex gap-2.5">
            {onAction && (
              <button
                type="button"
                onClick={() => onAction(referral)}
                className="min-h-[52px] flex-1 rounded-[10px] bg-ink px-3 text-[15px] font-semibold text-paper transition-colors hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200"
              >
                {actionLabel}
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={() => secondaryAction.onClick(referral)}
                className="min-h-[52px] flex-1 rounded-[10px] border border-critical-700/50 bg-transparent px-3 text-[15px] font-semibold text-ink transition-colors hover:bg-critical-200/60 dark:border-white/25 dark:text-paper dark:hover:bg-white/10"
              >
                {secondaryAction.label}
              </button>
            )}
            {referrerPhone && (
              <a
                href={`tel:${referrerPhone}`}
                aria-label="Call the referring doctor"
                className={cn(
                  'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] border border-critical-700 bg-white text-critical-700 transition-colors hover:bg-critical-50',
                  'dark:border-critical-400/70 dark:bg-transparent dark:text-critical-300 dark:hover:bg-critical-950/60'
                )}
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
