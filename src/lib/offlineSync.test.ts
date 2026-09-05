import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDoc } from 'firebase/firestore';
import { syncOfflineReferrals } from './offlineSync';
import * as db from './db';

// syncOfflineReferrals writes through firebase/firestore's setDoc against the
// db exported from './firebase'. Both must be mocked, or this test reaches for
// a real Firestore backend and hangs on ECONNREFUSED instead of asserting
// anything.
vi.mock('./firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: any, ...pathParts: string[]) => ({ path: pathParts.join('/') })),
  setDoc: vi.fn(),
}));

const sampleReferral = {
  id: 'r1',
  priority: 'urgent',
  receivingFacilityId: 'auto',
  candidateFacilityIds: ['f1'],
  referringFacilityId: 'f2',
  receivingDepartments: ['Emergency']
};

describe('offlineSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reads offline referrals, writes them to Firestore, notifies, and deletes the cached copy', async () => {
    (setDoc as any).mockResolvedValue(undefined);
    const getSpy = vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([sampleReferral as any]);
    const delSpy = vi.spyOn(db, 'deleteOfflineReferral').mockResolvedValue(undefined as any);

    const notifications: any[] = [];
    let pendingCount: number | null = null;

    await syncOfflineReferrals({
      createNotification: (p) => notifications.push(p),
      facilities: [{ id: 'f2', name: 'F2' }],
      setPendingSyncCount: (n: number) => { pendingCount = n; }
    });

    expect(getSpy).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'r1' }));
    expect(notifications.length).toBeGreaterThan(0);
    expect(delSpy).toHaveBeenCalledWith('r1');
    // setPendingSyncCount is called with a fresh read of the cache after
    // flushing; the mocked getOfflineReferrals keeps returning the same
    // referral, so the reported remaining count is 1, not 0.
    expect(pendingCount).toBe(1);
  });

  it('leaves the cached referral in place and reports the error when the write fails', async () => {
    (setDoc as any).mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([sampleReferral as any]);
    const delSpy = vi.spyOn(db, 'deleteOfflineReferral').mockResolvedValue(undefined as any);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const notifications: any[] = [];
    await syncOfflineReferrals({
      createNotification: (p) => notifications.push(p),
      facilities: [{ id: 'f2', name: 'F2' }],
    });

    expect(warnSpy).toHaveBeenCalled();
    expect(delSpy).not.toHaveBeenCalled();
    expect(notifications.length).toBe(0);
  });
});
