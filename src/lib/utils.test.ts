import { describe, it, expect } from 'vitest';
import { cn, formatDateTime } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names and arrays and returns a string', () => {
      // existing checks from both branches
      expect(cn('a', ['b', false && 'c'], { d: true } as any)).toContain('a');
      const out = cn('px-2', 'px-2', 'py-1');
      expect(typeof out).toBe('string');
      expect(out.indexOf('px-2')).toBeGreaterThanOrEqual(0);
    });

    it('should merge class names correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    it('should resolve tailwind conflicts', () => {
      // tailwind-merge resolves this to just bg-blue-500
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const isTrue = true;
      const isFalse = false;
      expect(cn('base', isTrue && 'truthy', isFalse && 'falsy')).toBe('base truthy');
    });
  });

  describe('formatDateTime', () => {
    it('formatDateTime returns a formatted string containing month short name and year', () => {
      const s = formatDateTime('2020-01-02T03:04:05Z');
      expect(typeof s).toBe('string');
      // Should contain short month name like 'Jan' and the year
      expect(s).toContain('Jan');
      expect(s).toContain('2020');
    });

    it('should format ISO string correctly (specific case)', () => {
      const isoString = '2024-01-15T14:30:00Z';
      const formatted = formatDateTime(isoString);
      // Depending on timezone, ensure pattern matches DD Mon YYYY, HH:mm
      expect(formatted).toMatch(/Jan 15, 2024 \d{1,2}:\d{2} [AP]M/);
    });
  });
});
