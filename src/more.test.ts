import { describe, it, expect } from 'vitest';
import { sum } from './sum';
import { multiply } from './multiply';

describe('parameterized arithmetic', () => {
  const sumCases: Array<[number, number, number]> = [
    [1, 2, 3],
    [0, 0, 0],
    [-1, 1, 0],
    [1.5, 2.5, 4],
    [Number.MAX_SAFE_INTEGER, 1, Number.MAX_SAFE_INTEGER + 1],
  ];

  it.each(sumCases)('sum(%s, %s) === %s', (a, b, expected) => {
    expect(sum(a, b)).toBe(expected);
  });

  const mulCases: Array<[number, number, number]> = [
    [2, 3, 6],
    [0, 5, 0],
    [-2, 4, -8],
    [1.5, 2, 3],
  ];

  it.each(mulCases)('multiply(%s, %s) ≈ %s', (a, b, expected) => {
    expect(multiply(a, b)).toBeCloseTo(expected);
  });
});
