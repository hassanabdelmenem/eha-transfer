import { describe, it, expect } from 'vitest';
import { sum } from './sum';
import { multiply } from './multiply';

describe('sum', () => {
  it('adds negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3);
  });

  it('adds floats', () => {
    expect(sum(1.5, 2.25)).toBeCloseTo(3.75);
  });
});

describe('multiply', () => {
  it('multiplies numbers', () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it('multiplies by zero', () => {
    expect(multiply(5, 0)).toBe(0);
  });

  it('multiplies floats', () => {
    expect(multiply(1.5, 2)).toBeCloseTo(3);
  });
});
