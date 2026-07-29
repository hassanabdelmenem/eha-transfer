// db.edge.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('db edge cases', () => {
  it('returns [] and no-ops when window is undefined', async () => {
    const origWindow = (global as any).window;
    try {
      (global as any).window = undefined;
      vi.resetModules();
      const { getOfflineReferrals, saveOfflineReferral, deleteOfflineReferral, clearOfflineReferrals } = await import('./db');

      const res = await getOfflineReferrals();
      expect(res).toEqual([]);

      // ensure other functions do not throw when dbPromise is absent
      await expect(saveOfflineReferral({ id: 'x' } as any)).resolves.toBeUndefined();
      await expect(deleteOfflineReferral('x')).resolves.toBeUndefined();
      await expect(clearOfflineReferrals()).resolves.toBeUndefined();
    } finally {
      (global as any).window = origWindow;
    }
  });

  it('calls underlying idb methods when openDB is present', async () => {
    vi.resetModules();

    const put = vi.fn();
    const getAll = vi.fn().mockResolvedValue([{ id: '1' }]);
    const del = vi.fn();
    const clear = vi.fn();

    vi.doMock('idb', () => ({
      openDB: () => Promise.resolve({ put, getAll, delete: del, clear }),
    }));

    const { saveOfflineReferral, getOfflineReferrals, deleteOfflineReferral, clearOfflineReferrals } = await import('./db');

    await saveOfflineReferral({ id: '1' } as any);
    expect(put).toHaveBeenCalledWith('offline-referrals', { id: '1' });

    const res = await getOfflineReferrals();
    expect(res).toEqual([{ id: '1' }]);

    await deleteOfflineReferral('1');
    expect(del).toHaveBeenCalledWith('offline-referrals', '1');

    await clearOfflineReferrals();
    expect(clear).toHaveBeenCalledWith('offline-referrals');

    vi.dontMock('idb');
  });
});
