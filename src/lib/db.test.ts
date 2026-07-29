import { describe, it, expect, vi } from 'vitest';

// Top-level mocks must be hoisted — prepare them before importing the module
const put = vi.fn();
const getAll = vi.fn().mockResolvedValue([{ id: 'r1', note: 'hello' }]);
const del = vi.fn();
const clear = vi.fn();
const openDB = vi.fn().mockResolvedValue({ put, getAll, delete: del, clear });

vi.stubGlobal('window', {} as any);
vi.mock('idb', () => ({ openDB }));

describe('lib/db (indexedDB wrappers)', () => {
  it('save/get/delete/clear offline referrals using mocked idb', async () => {
    // Import the module after mocks are in place
    const db = await import('./db');

    // Call saveOfflineReferral and assert put was called
    await db.saveOfflineReferral({ id: 'r1', note: 'hello' } as any);
    expect(put).toHaveBeenCalledWith('offline-referrals', { id: 'r1', note: 'hello' });

    // getOfflineReferrals should return the mocked value
    const items = await db.getOfflineReferrals();
    expect(getAll).toHaveBeenCalledWith('offline-referrals');
    expect(items).toEqual([{ id: 'r1', note: 'hello' }]);

    // deleteOfflineReferral
    await db.deleteOfflineReferral('r1');
    expect(del).toHaveBeenCalledWith('offline-referrals', 'r1');

    // clearOfflineReferrals
    await db.clearOfflineReferrals();
    expect(clear).toHaveBeenCalledWith('offline-referrals');

    // cleanup: restore mocks/global and modules
    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
