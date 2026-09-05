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
    (setDoc as any).mockReset();
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

  it('still notifies for a referral whose write succeeded even when clearing it from the offline cache fails', async () => {
    (setDoc as any).mockResolvedValue(undefined);
    vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([sampleReferral as any]);
    const delSpy = vi.spyOn(db, 'deleteOfflineReferral').mockRejectedValueOnce(new Error('indexeddb blocked'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const notifications: any[] = [];
    await syncOfflineReferrals({
      createNotification: (p) => notifications.push(p),
      facilities: [{ id: 'f2', name: 'F2' }],
    });

    expect(delSpy).toHaveBeenCalledWith('r1');
    // The referral is live in Firestore regardless of whether the local cache
    // cleanup succeeded -- its recipients must still hear about it.
    expect(notifications.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith('Failed to clear synced referral from the offline cache', 'r1', expect.any(Error));
  });

  it('is a no-op when there is nothing cached', async () => {
    vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([]);
    const notifications: any[] = [];
    await syncOfflineReferrals({ createNotification: (p) => notifications.push(p), facilities: [] });
    expect(setDoc).not.toHaveBeenCalled();
    expect(notifications).toHaveLength(0);
  });

  it('notifies the single receiving facility for a directly-routed referral, falling back to "Facility" for an unknown referrer', async () => {
    (setDoc as any).mockResolvedValue(undefined);
    vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([{
      id: 'r2', priority: 'routine', receivingFacilityId: 'f9', referringFacilityId: 'unknown-facility', receivingDepartments: ['Cardiology'],
    } as any]);
    vi.spyOn(db, 'deleteOfflineReferral').mockResolvedValue(undefined as any);

    const notifications: any[] = [];
    await syncOfflineReferrals({ createNotification: (p) => notifications.push(p), facilities: [] });

    expect(notifications).toEqual([expect.objectContaining({
      title: 'New ROUTINE Referral (Synced)',
      type: 'info',
      facilityId: 'f9',
      message: expect.stringContaining('Referral from Facility for'),
    })]);
  });
});
