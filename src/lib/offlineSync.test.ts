import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTransaction } from 'firebase/firestore';
import { syncOfflineReferrals } from './offlineSync';
import * as db from './db';

// syncOfflineReferrals writes through firebase/firestore's runTransaction
// against the db exported from './firebase'. Both must be mocked, or this
// test reaches for a real Firestore backend and hangs on ECONNREFUSED
// instead of asserting anything.
vi.mock('./firebase', () => ({ db: {} }));

let existingDocs: Record<string, any> = {};
let capturedSets: { path: string; data: any }[] = [];
let transactionShouldReject: Error | null = null;

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: any, ...pathParts: string[]) => ({ path: pathParts.join('/'), id: pathParts[pathParts.length - 1] })),
  runTransaction: vi.fn(async (_db: any, updateFn: (tx: any) => Promise<any>) => {
    if (transactionShouldReject) throw transactionShouldReject;
    const tx = {
      get: vi.fn(async (ref: any) => ({
        exists: () => ref.id in existingDocs,
        data: () => existingDocs[ref.id],
      })),
      set: vi.fn((ref: any, data: any) => {
        capturedSets.push({ path: ref.path, data });
        existingDocs[ref.id] = data;
      }),
    };
    return updateFn(tx);
  }),
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
    (runTransaction as any).mockClear();
    existingDocs = {};
    capturedSets = [];
    transactionShouldReject = null;
  });

  it('reads offline referrals, writes them to Firestore, notifies, and deletes the cached copy', async () => {
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
    expect(capturedSets).toEqual([expect.objectContaining({ path: 'referrals/r1', data: expect.objectContaining({ id: 'r1' }) })]);
    expect(notifications.length).toBeGreaterThan(0);
    expect(delSpy).toHaveBeenCalledWith('r1');
    // setPendingSyncCount is called with a fresh read of the cache after
    // flushing; the mocked getOfflineReferrals keeps returning the same
    // referral, so the reported remaining count is 1, not 0.
    expect(pendingCount).toBe(1);
  });

  it('leaves the cached referral in place and reports the error when the write fails', async () => {
    transactionShouldReject = new Error('offline');
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

  it('does not overwrite a referral that already landed via another path, but still notifies and clears the cache', async () => {
    // Simulates addReferral's own fire-and-forget write having already
    // succeeded (and possibly been acted on since) before this sweep runs
    // against the same now-stale cached copy.
    existingDocs['r1'] = { ...sampleReferral, status: 'accepted', updatedAt: 'later' };
    vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([sampleReferral as any]);
    const delSpy = vi.spyOn(db, 'deleteOfflineReferral').mockResolvedValue(undefined as any);

    const notifications: any[] = [];
    await syncOfflineReferrals({
      createNotification: (p) => notifications.push(p),
      facilities: [{ id: 'f2', name: 'F2' }],
    });

    // No set call for r1 -- the already-live document (and whatever has
    // happened to it since) must not be clobbered by the stale cached copy.
    expect(capturedSets).toHaveLength(0);
    expect(existingDocs['r1'].status).toBe('accepted');
    // The recipient still needs to hear about it, and the local cache entry
    // for a referral that is confirmed live is still stale and safe to drop.
    expect(notifications.length).toBeGreaterThan(0);
    expect(delSpy).toHaveBeenCalledWith('r1');
  });

  it('still notifies for a referral whose write succeeded even when clearing it from the offline cache fails', async () => {
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
    expect(runTransaction).not.toHaveBeenCalled();
    expect(notifications).toHaveLength(0);
  });

  it('notifies the single receiving facility for a directly-routed referral, falling back to "Facility" for an unknown referrer', async () => {
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
