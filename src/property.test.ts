import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { sum } from './sum';
import { multiply } from './multiply';

describe('property-based tests (fast-check)', () => {
  it('sum is commutative for integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000000, max: 1000000 }), fc.integer({ min: -1000000, max: 1000000 }), (a, b) => {
        return sum(a, b) === sum(b, a);
      })
    );
  });

  it('sum has identity 0 for integers', () => {
    fc.assert(
      fc.property(fc.integer(), (a) => sum(a, 0) === a)
    );
  });

  it('multiply is commutative for integers', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 100000 }), fc.integer({ min: -100000, max: 100000 }), (a, b) => {
        return multiply(a, b) === multiply(b, a);
      })
    );
  });

  it('distributive law holds for small integers: a*(b+c) == a*b + a*c', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b, c) => multiply(a, sum(b, c)) === sum(multiply(a, b), multiply(a, c))
      )
    );
  });
});
