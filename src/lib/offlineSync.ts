import { Referral } from '../types';
import { getOfflineReferrals, deleteOfflineReferral } from './db';

export type CreateNotificationFn = (params: {
  title: string;
  message: string;
  type: string;
  referralId: string;
  facilityId: string;
  targetRoles?: string[];
  departments?: string[];
}) => void;

export async function syncOfflineReferrals(options: {
  addReferralsToState: (refs: Referral[]) => void;
  createNotification: CreateNotificationFn;
  facilities: any[];
  setPendingSyncCount?: (n: number) => void;
}) {
  const { addReferralsToState, createNotification, facilities, setPendingSyncCount } = options;
  // build a quick lookup map to avoid repeated linear scans when emitting notifications for many referrals
  const facilitiesById = new Map(facilities.map(f => [f.id, f]));
  const offlineReferrals = await getOfflineReferrals();
  if (!offlineReferrals || offlineReferrals.length === 0) return;

  // Merge into state (new ones first)
  addReferralsToState(offlineReferrals);

  // Emit notifications for each synced referral
  for (const ref of offlineReferrals) {
    if (ref.receivingFacilityId === 'auto' && ref.candidateFacilityIds) {
      for (const candidateId of ref.candidateFacilityIds) {
        createNotification({
          title: `New ${ref.priority.toUpperCase()} Referral (Auto-Routed - Synced)`,
          message: `Referral from ${facilitiesById.get(ref.referringFacilityId)?.name || 'Facility'} for ${ref.receivingDepartments.join(', ')}`,
          type: ref.priority === 'emergency' ? 'urgent' : 'info',
          referralId: ref.id,
          facilityId: candidateId,
          targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
          departments: ref.receivingDepartments
        });
      }
    } else {
      createNotification({
        title: `New ${ref.priority.toUpperCase()} Referral (Synced)`,
        message: `Referral from ${facilitiesById.get(ref.referringFacilityId)?.name || 'Facility'} for ${ref.receivingDepartments.join(', ')}`,
        type: ref.priority === 'emergency' ? 'urgent' : 'info',
        referralId: ref.id,
        facilityId: ref.receivingFacilityId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
        departments: ref.receivingDepartments
      });
    }
  }

  // Remove offline entries
  for (const ref of offlineReferrals) {
    try {
      // best-effort
      // eslint-disable-next-line no-await-in-loop
      await deleteOfflineReferral(ref.id);
    } catch (err) {
      // swallow
      // eslint-disable-next-line no-console
      console.warn('Failed deleting offline referral', err);
    }
  }

  if (setPendingSyncCount) setPendingSyncCount(0);
}
