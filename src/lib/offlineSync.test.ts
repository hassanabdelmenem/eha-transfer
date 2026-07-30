import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncOfflineReferrals } from './offlineSync';
import * as db from './db';

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

  it('reads offline referrals, notifies and deletes them', async () => {
    const getSpy = vi.spyOn(db, 'getOfflineReferrals').mockResolvedValue([sampleReferral as any]);
    const delSpy = vi.spyOn(db, 'deleteOfflineReferral').mockResolvedValue(undefined as any);

    const added: any[] = [];
    const notifications: any[] = [];

    await syncOfflineReferrals({
      addReferralsToState: (refs) => added.push(...refs),
      createNotification: (p) => notifications.push(p),
      facilities: [{ id: 'f2', name: 'F2' }],
      setPendingSyncCount: (n: number) => {
        // noop
      }
    });

    expect(getSpy).toHaveBeenCalled();
    expect(added.length).toBe(1);
    expect(notifications.length).toBeGreaterThan(0);
    expect(delSpy).toHaveBeenCalledWith('r1');
  });
});
