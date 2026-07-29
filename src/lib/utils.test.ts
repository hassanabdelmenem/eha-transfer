import { describe, it, expect } from 'vitest';
import { cn, formatDateTime } from './utils';

describe('lib/utils', () => {
  it('cn merges class names and arrays', () => {
    expect(cn('a', ['b', false && 'c'], { d: true } as any)).toContain('a');
    // twMerge will dedupe; ensure string returned
    const out = cn('px-2', 'px-2', 'py-1');
    expect(typeof out).toBe('string');
    expect(out.indexOf('px-2')).toBeGreaterThanOrEqual(0);
  });

  it('formatDateTime returns a formatted string for ISO', () => {
    const s = formatDateTime('2020-01-02T03:04:05Z');
    expect(typeof s).toBe('string');
    // should include year
    expect(s).toContain('2020');
  });
});
