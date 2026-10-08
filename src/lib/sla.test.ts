import { describe, it, expect } from 'vitest';
import {
  SLA_MINUTES,
  SLA_SECONDS,
  SLA_TRACKED_PRIORITIES,
  SLA_TRACKED_BED_TYPES,
  SLA_TRACKED_STATUS,
  isSlaTracked,
  secondsUntilSlaBreach,
  hasBreachedSla,
  needsAutoEscalation,
} from './sla';
import { Referral } from '../types';

const CREATED = '2026-01-01T00:00:00.000Z';
const at = (offsetSeconds: number) => new Date(Date.parse(CREATED) + offsetSeconds * 1000);

const referral = (over: Partial<Referral> = {}): Referral =>
  ({
    id: 'ref1',
    status: 'pending',
    priority: 'emergency',
    requiredBedType: 'ICU',
    createdAt: CREATED,
    ...over,
  } as Referral);

describe('isSlaTracked', () => {
  it('tracks a pending emergency ICU referral', () => {
    expect(isSlaTracked(referral())).toBe(true);
  });

  it('tracks urgent as well as emergency', () => {
    expect(isSlaTracked(referral({ priority: 'urgent' }))).toBe(true);
  });

  it('does not track routine priority', () => {
    expect(isSlaTracked(referral({ priority: 'routine' }))).toBe(false);
  });

  it('does not track a Ward bed', () => {
    expect(isSlaTracked(referral({ requiredBedType: 'Ward' }))).toBe(false);
  });

  it.each(['dept_approved', 'accepted', 'in_transit', 'cancelled', 'rejected'] as const)(
    'stops tracking once the status is %s',
    (status) => {
      expect(isSlaTracked(referral({ status }))).toBe(false);
    }
  );
});

describe('secondsUntilSlaBreach', () => {
  it('reports the full window at creation', () => {
    expect(secondsUntilSlaBreach(referral(), at(0))).toBe(SLA_SECONDS);
  });

  it('counts down', () => {
    expect(secondsUntilSlaBreach(referral(), at(600))).toBe(SLA_SECONDS - 600);
  });

  it('goes negative once the window has passed, so callers can render the overrun', () => {
    expect(secondsUntilSlaBreach(referral(), at(SLA_SECONDS + 135))).toBe(-135);
  });

  it('returns null rather than NaN for an unparseable timestamp', () => {
    expect(secondsUntilSlaBreach(referral({ createdAt: 'not-a-date' }), at(0))).toBeNull();
  });

  it('returns null rather than NaN for a missing timestamp', () => {
    expect(secondsUntilSlaBreach(referral({ createdAt: undefined as unknown as string }), at(0))).toBeNull();
  });

  it('accepts a millisecond clock as well as a Date', () => {
    expect(secondsUntilSlaBreach(referral(), at(60).getTime())).toBe(SLA_SECONDS - 60);
  });
});

describe('hasBreachedSla', () => {
  it('is false one second before the limit', () => {
    expect(hasBreachedSla(referral(), at(SLA_SECONDS - 1))).toBe(false);
  });

  it('is true exactly at the limit', () => {
    expect(hasBreachedSla(referral(), at(SLA_SECONDS))).toBe(true);
  });

  it('is true after the limit', () => {
    expect(hasBreachedSla(referral(), at(SLA_SECONDS + 3600))).toBe(true);
  });

  it('is false for an untracked referral no matter how old', () => {
    expect(hasBreachedSla(referral({ priority: 'routine' }), at(SLA_SECONDS * 100))).toBe(false);
  });

  it('does not breach on an unreadable timestamp', () => {
    expect(hasBreachedSla(referral({ createdAt: '' }), at(SLA_SECONDS * 100))).toBe(false);
  });
});

describe('needsAutoEscalation', () => {
  it('is true for a breached, un-escalated referral', () => {
    expect(needsAutoEscalation(referral(), at(SLA_SECONDS + 1))).toBe(true);
  });

  it('is false once already escalated, which is what keeps escalation idempotent', () => {
    expect(needsAutoEscalation(referral({ isEscalated: true }), at(SLA_SECONDS + 1))).toBe(false);
  });

  it('is false before the window elapses', () => {
    expect(needsAutoEscalation(referral(), at(SLA_SECONDS - 1))).toBe(false);
  });

  it('is false once a human has de-escalated, so De-escalate is not undone on the next sweep', () => {
    expect(needsAutoEscalation(referral({ autoEscalationSuppressed: true }), at(SLA_SECONDS + 600))).toBe(false);
  });

  it('is false for a referral that was accepted inside the window', () => {
    // The clinically important case: responded to at 29 minutes, so it must not
    // escalate at 31 just because the document is still around.
    expect(needsAutoEscalation(referral({ status: 'accepted' }), at(SLA_SECONDS + 600))).toBe(false);
  });
});
