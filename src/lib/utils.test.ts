import { describe, it, expect } from 'vitest';
import { cn, formatDateTime } from './utils';

describe('utils', () => {
  describe('cn', () => {
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
    it('should format ISO string correctly', () => {
      const isoString = '2024-01-15T14:30:00Z';
      const formatted = formatDateTime(isoString);
      // Depending on the environment's timezone, the output hour may vary, 
      // but it should follow the DD MMM YYYY, HH:mm format.
      // Since it's using 'en-GB', it typically looks like "15 Jan 2024, 14:30" if in UTC
      expect(formatted).toMatch(/15 Jan 2024, \d{2}:\d{2}/);
    });
  });
});
