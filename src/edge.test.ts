import { describe, it, expect } from 'vitest';
import { sum } from './sum';
import { multiply } from './multiply';
import { fetchData } from './async';

describe('edge cases', () => {
  it('handles large integers', () => {
    const a = Number.MAX_SAFE_INTEGER;
    expect(sum(a, 1)).toBe(a + 1);
  });

  it('multiplies negative floats', () => {
    expect(multiply(-1.2345, 2)).toBeCloseTo(-2.469);
  });

  it('fetchData preserves objects', async () => {
    const obj = { nested: { value: 7 } };
    const res = await fetchData(obj);
    expect(res).toEqual({ data: obj });
  });
});
