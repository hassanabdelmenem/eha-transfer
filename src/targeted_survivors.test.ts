import { describe, it, expect } from 'vitest';
import { sum } from './sum';
import { multiply } from './multiply';
import { formatUser } from './format';
import { fetchData } from './async';

describe('targeted survivor tests', () => {
  it('associativity for integers in small range', () => {
    for (let a = -5; a <= 5; a++) {
      for (let b = -5; b <= 5; b++) {
        for (let c = -5; c <= 5; c++) {
          expect(sum(sum(a, b), c)).toBe(sum(a, sum(b, c)));
        }
      }
    }
  });

  it('distributive and Infinity/NaN behavior', () => {
    // distributive for some sample ints
    for (let a of [0, 1, -1, 2, -3]) {
      for (let b of [0, 1, -2, 3]) {
        for (let c of [0, 2, -1]) {
          const lhs = multiply(a, sum(b, c));
          const rhs = sum(multiply(a, b), multiply(a, c));
          expect(Object.is(lhs, rhs) || (Number.isNaN(lhs) && Number.isNaN(rhs))).toBe(true);
        }
      }
    }

    // Infinity * 0 -> NaN
    const r = multiply(Infinity as any, 0 as any);
    expect(Number.isNaN(r)).toBe(true);

    // 0 * Infinity -> NaN
    expect(Number.isNaN(multiply(0 as any, Infinity as any))).toBe(true);
  });

  it('formatUser returns active flag and preserves fields', () => {
    const u = formatUser('Eve', 40);
    expect(u).toHaveProperty('name', 'Eve');
    expect(u).toHaveProperty('age', 40);
    expect(u).toHaveProperty('active', true);
  });

  it('fetchData returns same value for primitives and deep-equal for objects', async () => {
    const s = await fetchData('x');
    expect(s).toEqual({ data: 'x' });

    const obj = { a: 1, b: { c: 2 } };
    const r = await fetchData(obj);
    expect(r).toEqual({ data: obj });
    // should preserve reference (implementation currently returns same object)
    expect(r.data).toBe(obj);
  });
});
