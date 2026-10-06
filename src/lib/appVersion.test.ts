import { describe, it, expect, beforeEach } from 'vitest';
import { checkForNewRelease, isStale, __resetForTests } from './appVersion';

const respond = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('checkForNewRelease', () => {
  beforeEach(() => __resetForTests());

  it('stays current while the live build matches', async () => {
    expect(await checkForNewRelease(respond({ build: 'abc' }), 'abc')).toBe(false);
  });
  it('turns stale once a different build is live, and stays stale', async () => {
    expect(await checkForNewRelease(respond({ build: 'new' }), 'abc')).toBe(true);
    expect(await checkForNewRelease(respond({ build: 'abc' }), 'abc')).toBe(true);
    expect(isStale()).toBe(true);
  });
  it('ignores failures and missing ids', async () => {
    expect(await checkForNewRelease((async () => { throw new Error('offline'); }) as unknown as typeof fetch, 'abc')).toBe(false);
    expect(await checkForNewRelease(respond({}, true), 'abc')).toBe(false);
    expect(await checkForNewRelease(respond({ build: 'x' }, false), 'abc')).toBe(false);
  });
});
