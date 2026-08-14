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

export const SLA_TRACKED_PRIORITIES: readonly string[] = ['emergency', 'urgent'];
export const SLA_TRACKED_BED_TYPES: readonly string[] = ['ICU', 'CCU', 'PICU'];
export const SLA_TRACKED_STATUS = 'pending';

export interface SlaCandidate {
  status?: string;
  priority?: string;
  requiredBedType?: string;
  createdAt?: string;
  isEscalated?: boolean;
  autoEscalationSuppressed?: boolean;
}

export function isSlaTracked(referral: SlaCandidate): boolean {
  return (
    referral.status === SLA_TRACKED_STATUS &&
    !!referral.priority &&
    SLA_TRACKED_PRIORITIES.includes(referral.priority) &&
    !!referral.requiredBedType &&
    SLA_TRACKED_BED_TYPES.includes(referral.requiredBedType)
  );
}

/** Negative once breached. Null when `createdAt` is missing or unparseable. */
export function secondsUntilSlaBreach(referral: SlaCandidate, nowMs: number): number | null {
  if (!referral.createdAt) return null;
  const createdAt = Date.parse(referral.createdAt);
  if (Number.isNaN(createdAt)) return null;
  return SLA_SECONDS - Math.floor((nowMs - createdAt) / 1000);
}

export function hasBreachedSla(referral: SlaCandidate, nowMs: number): boolean {
  if (!isSlaTracked(referral)) return false;
  const remaining = secondsUntilSlaBreach(referral, nowMs);
  return remaining !== null && remaining <= 0;
}

/**
 * Breached, not yet escalated, and not deliberately de-escalated by a human.
 * `isEscalated` makes the write idempotent; `autoEscalationSuppressed` is what
 * stops a manual De-escalate from being undone on the next pass.
 */
export function needsAutoEscalation(referral: SlaCandidate, nowMs: number): boolean {
  if (referral.isEscalated || referral.autoEscalationSuppressed) return false;
  return hasBreachedSla(referral, nowMs);
}
