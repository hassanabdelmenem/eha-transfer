import { describe, it, expect } from 'vitest';
import { sum } from './sum';
import { multiply } from './multiply';

describe('coercion and invalid inputs', () => {
  it('sum coerces strings', () => {
    expect((sum as any)('1', 2)).toBe('12');
  });

  it('multiply with numeric string coerces to number', () => {
    expect((multiply as any)('2', 3)).toBe(6);
  });

  it('sum with undefined produces NaN', () => {
    const res = (sum as any)(undefined, 2);
    expect(Number.isNaN(res)).toBe(true);
  });

  it('multiply with null coerces to 0', () => {
    expect((multiply as any)(null, 5)).toBe(0);
  });
});
