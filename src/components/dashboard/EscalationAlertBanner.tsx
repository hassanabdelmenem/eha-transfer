import React from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import { EscalationAlertBannerProps } from './types';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../layout/Workspace';
import { useI18n } from '../../i18n';
import { en } from '../../i18n/en';

// Why the case escalated, in the words the strip uses ("Escalated · no
// response 34 min"): escalation.reason.* in the catalogue. Lower-case: the
// strip sets its own case.
type ReasonKey = keyof typeof en.escalation.reason;
const isKnownReason = (k: string): k is ReasonKey => k in en.escalation.reason;

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
  actionLabel,
  secondaryAction,
  referrerPhone,
  referringFacilityName,
}) => {
  // In the desktop workspace, mark the pinned case when it is the one open beside the queue.
  const { t } = useI18n();
  const ws = useWorkspace();
  const selected = !!ws && ws.selectedId === referral.id;
  const reasonKey = referral.escalationReason || 'manual';
  const reason = isKnownReason(reasonKey) ? t(`escalation.reason.${reasonKey}`) : String(reasonKey).replace(/_/g, ' '); // legacy values outside the union
  const systemLevel = referral.escalationLevel === 'system';
  const mins = minutesSince(referral.escalatedAt || referral.createdAt);
  const strip = systemLevel
    ? t('escalation.systemLevel', { reason })
    : mins === null
      ? t('escalation.escalated', { reason })
      : t('escalation.escalatedFor', { reason, mins });

  // Same sentences as lib/routing describeCapacityEscalation, which stays
  // English because the sweep stores it in the referral's history.
  const capacitySentence =
    reasonKey === 'no_matching_facility'
      ? t('escalation.noMatchingFacility')
      : reasonKey === 'no_beds_available'
        ? t('escalation.allFull')
        : null;

  return (
    <section
      aria-label={t('escalation.label')}
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
          {systemLevel && <span> · <bdi>{referral.requiredBedType}</bdi></span>}
        </p>
        <p className="mt-[3px] text-[13.5px] leading-[1.4] text-slate-700 dark:text-white/70">
          {capacitySentence ?? (
            <>
              {t('escalation.bed', { bed: referral.requiredBedType })}
              {referral.reasonForReferral ? <> · <bdi>{referral.reasonForReferral}</bdi></> : null}
              {referringFacilityName ? ` · ${t('card.from', { facility: referringFacilityName })}` : ''}
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
                {actionLabel ?? t('home.reviewNow')}
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
                aria-label={t('card.callReferrer')}
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
