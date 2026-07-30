import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debouncedSetItem, safeGetItem, safeSetItem } from './storage';

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('safeSetItem and safeGetItem work', () => {
    safeSetItem('k1', { a: 1 });
    const v = safeGetItem('k1');
    expect(v).toEqual({ a: 1 });
  });

  it('debouncedSetItem delays writes', () => {
    debouncedSetItem('k2', { b: 2 }, 1000);
    expect(localStorage.getItem('k2')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(localStorage.getItem('k2') || 'null')).toEqual({ b: 2 });
  });
});