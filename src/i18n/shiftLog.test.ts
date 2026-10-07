import { describe, it, expect } from 'vitest';
import { shiftSummaryVars, shiftLogSummary } from './notifications';
import { translate } from './index';

describe('end-of-shift summary in the reader\'s language', () => {
  const vars = shiftSummaryVars('Night', 2, 'Cardiology');

  it('builds catalogue values: the shift word and a missing department are references', () => {
    expect(vars).toEqual({ shift: '@endOfShift.shiftWord.Night', count: 2, dept: 'Cardiology' });
    expect(shiftSummaryVars('Day', 0, undefined).dept).toBe('@endOfShift.general');
  });

  it('renders a keyed log in Arabic and in English from the same template', () => {
    const log = { summary: 'Night shift ending. 2 active transfers in progress for Cardiology department.', key: 'summary', vars };
    expect(shiftLogSummary('ar', log)).toContain('انتهاء المناوبة الليلية');
    expect(shiftLogSummary('ar', log)).toContain('Cardiology');
    expect(shiftLogSummary('en', log)).toBe(log.summary);
  });

  it('shows the stored English for a log written before keys existed, or with an unknown key', () => {
    expect(shiftLogSummary('ar', { summary: 'Old handover text.' })).toBe('Old handover text.');
    expect(shiftLogSummary('ar', { summary: 'Future.', key: 'somethingNew', vars: {} })).toBe('Future.');
  });
});

// Audit run-1 (7 Oct 2026), lead 6: a stored '@' reference that names an
// inherited property or a namespace used to throw during render and take the
// whole app down for every colleague who opened the dashboard.
describe('catalogue references cannot crash rendering', () => {
  it.each(['@__proto__', '@constructor', '@toString', '@hasOwnProperty', '@notif', '@status'])('%s stays as typed', (ref) => {
    expect(() => shiftLogSummary('en', { summary: '', key: 'summary', vars: { shift: ref } } as any)).not.toThrow();
    expect(shiftLogSummary('en', { summary: '', key: 'summary', vars: { shift: ref } } as any)).toContain(ref);
  });
  it('translate returns the key for a non-leaf or inherited key', () => {
    expect(translate('en', '__proto__' as any)).toBe('__proto__');
    expect(translate('en', 'notif' as any)).toBe('notif');
  });
});
