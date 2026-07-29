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
});
