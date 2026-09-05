"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsAutoEscalation = exports.hasBreachedSla = exports.secondsUntilSlaBreach = exports.isSlaTracked = exports.SLA_TRACKED_STATUS = exports.SLA_TRACKED_BED_TYPES = exports.SLA_TRACKED_PRIORITIES = exports.SLA_SECONDS = exports.SLA_MINUTES = void 0;
exports.SLA_MINUTES = 30;
exports.SLA_SECONDS = exports.SLA_MINUTES * 60;
exports.SLA_TRACKED_PRIORITIES = ['emergency', 'urgent'];
exports.SLA_TRACKED_BED_TYPES = ['ICU', 'CCU', 'PICU'];
exports.SLA_TRACKED_STATUS = 'pending';
function isSlaTracked(referral) {
    return (referral.status === exports.SLA_TRACKED_STATUS &&
        !!referral.priority &&
        exports.SLA_TRACKED_PRIORITIES.includes(referral.priority) &&
        !!referral.requiredBedType &&
        exports.SLA_TRACKED_BED_TYPES.includes(referral.requiredBedType));
}
exports.isSlaTracked = isSlaTracked;
/** Negative once breached. Null when `createdAt` is missing or unparseable. */
function secondsUntilSlaBreach(referral, nowMs) {
    if (!referral.createdAt)
        return null;
    const createdAt = Date.parse(referral.createdAt);
    if (Number.isNaN(createdAt))
        return null;
    return exports.SLA_SECONDS - Math.floor((nowMs - createdAt) / 1000);
}
exports.secondsUntilSlaBreach = secondsUntilSlaBreach;
function hasBreachedSla(referral, nowMs) {
    if (!isSlaTracked(referral))
        return false;
    const remaining = secondsUntilSlaBreach(referral, nowMs);
    return remaining !== null && remaining <= 0;
}
exports.hasBreachedSla = hasBreachedSla;
/**
 * Breached, not yet escalated, and not deliberately de-escalated by a human.
 * `isEscalated` makes the write idempotent; `autoEscalationSuppressed` is what
 * stops a manual De-escalate from being undone on the next pass.
 */
function needsAutoEscalation(referral, nowMs) {
    if (referral.isEscalated || referral.autoEscalationSuppressed)
        return false;
    return hasBreachedSla(referral, nowMs);
}
exports.needsAutoEscalation = needsAutoEscalation;
//# sourceMappingURL=sla.js.map