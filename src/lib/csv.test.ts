import { describe, it, expect } from 'vitest';
import { csvCell, toCsv, isoOrEmpty } from './csv';

describe('csv', () => {
  it('quotes every cell and doubles embedded quotes', () => {
    expect(csvCell('Sayed "Abu" Ali, Jr')).toBe('"Sayed ""Abu"" Ali, Jr"');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(42)).toBe('"42"');
  });

  it('neutralises values a spreadsheet would run as a formula', () => {
    for (const bad of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd']) {
      expect(csvCell(bad).startsWith(`"'`)).toBe(true);
    }
    expect(csvCell('Normal name')).toBe('"Normal name"');
  });

  it('keeps columns aligned when a value contains commas or newlines', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'line1\nline2']]);
    expect(csv).toBe('"a","b"\r\n"x,y","line1\nline2"');
  });

  it('returns empty instead of throwing on an unparseable timestamp', () => {
    expect(isoOrEmpty('not-a-date')).toBe('');
    expect(isoOrEmpty(undefined)).toBe('');
    expect(isoOrEmpty('2026-09-27T10:00:00.000Z')).toBe('2026-09-27T10:00:00.000Z');
  });
});
