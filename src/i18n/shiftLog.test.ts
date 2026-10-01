import { describe, it, expect } from 'vitest';
import { shiftSummaryVars, shiftLogSummary } from './notifications';

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
