import { Referral, ReferralPriority, BedType } from '../types';

/**
 * The 30-minute response SLA for time-critical referrals, and the single source
 * of truth for whether one has been breached.
 *
 * This logic previously lived inline inside the UrgencyTimer render function in
 * ReferralList.tsx, where it could only ever produce a badge. The countdown ran,
 * turned red, announced "SLA Breach", and nothing happened -- `isEscalated` was
 * only ever written by a human pressing the Mark Escalated button. A timer that
 * expires and takes no action is worse than no timer, because it reads as though
 * the system is handling it.
 *
 * Extracted here so that the display, the client-side escalation sweep, and the
 * scheduled Cloud Function all decide "has this breached?" the same way. If these
 * three ever disagree, a referral either escalates twice or shows a red badge
 * that no longer matches its escalation state.
 */

export const SLA_MINUTES = 30;
export const SLA_SECONDS = SLA_MINUTES * 60;

/**
 * Scope of the SLA. Deliberately narrow: a routine Ward referral sitting for 30
 * minutes is normal, and escalating it would bury the ICU cases that matter in
 * noise. Widening this is a clinical decision, not a technical one.
 */
export const SLA_TRACKED_PRIORITIES: readonly ReferralPriority[] = ['emergency', 'urgent'];
export const SLA_TRACKED_BED_TYPES: readonly BedType[] = ['ICU', 'CCU', 'PICU'];

/** The clock only runs while nobody has responded. */
export const SLA_TRACKED_STATUS = 'pending';

type Clock = Date | number;

const toMillis = (clock: Clock): number => (clock instanceof Date ? clock.getTime() : clock);

/**
 * Whether this referral is subject to the SLA at all.
 *
 * Returns false for anything already moving, so a referral accepted at 29
 * minutes never escalates at 31.
 */
export function isSlaTracked(referral: Pick<Referral, 'status' | 'priority' | 'requiredBedType'>): boolean {
  return (
    referral.status === SLA_TRACKED_STATUS &&
    SLA_TRACKED_PRIORITIES.includes(referral.priority) &&
    SLA_TRACKED_BED_TYPES.includes(referral.requiredBedType)
  );
}

/**
 * Seconds remaining before breach; negative once breached (so callers can render
 * "+2:15 over" from the same number).
 *
 * Returns null when `createdAt` is missing or unparseable rather than a number,
 * because every arithmetic result involving NaN is falsy in a comparison and
 * would silently read as "not breached" -- or, worse, as breached-by-NaN. A
 * referral whose timestamp we cannot read must not be escalated on a guess.
 */
export function secondsUntilSlaBreach(
  referral: Pick<Referral, 'createdAt'>,
  now: Clock
): number | null {
  const createdAt = Date.parse(referral.createdAt);
  if (Number.isNaN(createdAt)) return null;
  const elapsedSeconds = Math.floor((toMillis(now) - createdAt) / 1000);
  return SLA_SECONDS - elapsedSeconds;
}

/** True only for a tracked referral whose window has actually elapsed. */
export function hasBreachedSla(
  referral: Pick<Referral, 'status' | 'priority' | 'requiredBedType' | 'createdAt'>,
  now: Clock
): boolean {
  if (!isSlaTracked(referral)) return false;
  const remaining = secondsUntilSlaBreach(referral, now);
  return remaining !== null && remaining <= 0;
}

/**
 * The escalation trigger: breached, and not already escalated.
 *
 * The `isEscalated` check is what makes escalation idempotent. Both writers (the
 * client sweep and the scheduled function) re-check it inside a transaction, so
 * whichever loses the race writes nothing rather than appending a second
 * escalation entry to the audit trail.
 */
export function needsAutoEscalation(
  referral: Pick<Referral, 'status' | 'priority' | 'requiredBedType' | 'createdAt' | 'isEscalated'>,
  now: Clock
): boolean {
  return !referral.isEscalated && hasBreachedSla(referral, now);
}
