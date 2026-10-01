import { describe, it, expect, beforeEach } from 'vitest';
import { isAlertMuted, setAlertMuted } from './alertSound';

describe('alert sound preference (per device)', () => {
  beforeEach(() => localStorage.clear());

  it('sounds by default', () => {
    expect(isAlertMuted()).toBe(false);
  });

  it('remembers mute and unmute', () => {
    setAlertMuted(true);
    expect(isAlertMuted()).toBe(true);
    setAlertMuted(false);
    expect(isAlertMuted()).toBe(false);
  });
});
