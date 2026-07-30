import { describe, it, expect } from 'vitest';
import { fetchData } from './async';

describe('fetchData', () => {
  it('resolves with the provided value', async () => {
    const res = await fetchData('hello');
    expect(res).toEqual({ data: 'hello' });
  });

  it('works with numbers', async () => {
    const res = await fetchData(42);
    expect(res).toEqual({ data: 42 });
  });
});
