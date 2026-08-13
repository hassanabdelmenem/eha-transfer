/**
 * The 30-minute response SLA, as the Functions build sees it.
 *
 * This is a deliberate, self-contained copy of `src/lib/sla.ts`. Sharing the
 * browser module directly would mean pointing this package's `rootDir` at the
 * repo root, which moves every emitted path and changes the deploy entrypoint
 * from `lib/index.js` to `lib/functions/src/index.js` -- a restructure of a
 * working build, for one small module.
 *
 * The duplication is guarded instead: `src/lib/sla.test.ts` imports both copies
 * and fails if the threshold or the tracked scope drift apart. A clinical rule
 * silently diverging between the badge the staff see and the job that escalates
 * is the failure this protects against, so if you change one file, change the
 * other and let that test confirm it.
 *
 * Kept free of imports on purpose, so it type-checks identically under this
 * package's tsconfig and the root one.
 */

export const SLA_MINUTES = 30;
export const SLA_SECONDS = SLA_MINUTES * 60;

/**
 * Scope of the SLA. Deliberately narrow: a routine Ward referral sitting for 30
 * minutes is normal, and escalating it would bury the ICU cases that matter in
 * noise. Widening this is a clinical decision, not a technical one.
 */
export const SLA_TRACKED_PRIORITIES: readonly string[] = ['emergency', 'urgent'];
export const SLA_TRACKED_BED_TYPES: readonly string[] = ['ICU', 'CCU', 'PICU'];

/** The clock only runs while nobody has responded. */
export const SLA_TRACKED_STATUS = 'pending';

type Clock = Date | number;

const toMillis = (clock: Clock): number => (clock instanceof Date ? clock.getTime() : clock);

export interface SlaCandidate {
  status?: string;
  priority?: string;
  requiredBedType?: string;
  createdAt?: string;
  isEscalated?: boolean;
}

/**
 * Whether this referral is subject to the SLA at all.
 *
 * Returns false for anything already moving, so a referral accepted at 29
 * minutes never escalates at 31.
 */
export function isSlaTracked(referral: SlaCandidate): boolean {
  return (
    referral.status === SLA_TRACKED_STATUS &&
    !!referral.priority &&
    SLA_TRACKED_PRIORITIES.includes(referral.priority) &&
    !!referral.requiredBedType &&
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
  referral: SlaCandidate,
  now: Clock
): number | null {
  if (!referral.createdAt) return null;
  const createdAt = Date.parse(referral.createdAt);
  if (Number.isNaN(createdAt)) return null;
  const elapsedSeconds = Math.floor((toMillis(now) - createdAt) / 1000);
  return SLA_SECONDS - elapsedSeconds;
}

/** True only for a tracked referral whose window has actually elapsed. */
export function hasBreachedSla(
  referral: SlaCandidate,
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
  referral: SlaCandidate,
  now: Clock
): boolean {
  return !referral.isEscalated && hasBreachedSla(referral, now);
}
