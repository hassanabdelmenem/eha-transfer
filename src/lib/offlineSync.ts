import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { Notification, Referral, Role } from '../types';
import { getOfflineReferrals, deleteOfflineReferral } from './db';

// Matches the shape of DataContext's createNotification exactly (not a
// widened `string`/`string[]`), so that callback can be passed here directly
// without a TS2322 mismatch on `type`/`targetRoles`.
export type CreateNotificationFn = (params: {
  title: string;
  message: string;
  type: Notification['type'];
  referralId: string;
  facilityId: string;
  targetRoles?: Role[];
  departments?: string[];
}) => void;

/**
 * Flushes referrals created while offline (cached in IndexedDB by
 * addReferral) to Firestore. This is the durable fallback for the case
 * db.ts exists for: Firestore runs without persistent cache
 * (src/lib/firebase.ts), so a referral created offline lives only in this
 * IndexedDB cache until the tab reconnects -- if the tab closes or crashes
 * first, this cache is the only copy.
 *
 * The write uses the referral's own client-generated id, so re-running this
 * after a partial failure (some referrals synced, some didn't) is safe -- but
 * only because the write is conditioned on the document not existing yet (see
 * below), not because overwriting is harmless. `addReferral` already attempts
 * this same write itself, fire-and-forget, before ever caching to IndexedDB;
 * on a flaky connection that attempt can land (via the SDK's own internal
 * retry) before this device's `isOnline` flag catches up and this sweep runs
 * again with the same now-stale cached copy. A referral that already exists
 * in Firestore may have moved on since -- approved, rejected, even
 * dispatched, however unlikely in that window -- and blindly overwriting it
 * with the frozen pre-write snapshot would silently revert that. The live
 * onSnapshot listeners in DataContext pick up each synced referral on their
 * own once the write lands, so this does not touch React state directly.
 */
export async function syncOfflineReferrals(options: {
  createNotification: CreateNotificationFn;
  facilities: any[];
  setPendingSyncCount?: (n: number) => void;
}) {
  const { createNotification, facilities, setPendingSyncCount } = options;
  const facilitiesById = new Map(facilities.map(f => [f.id, f]));
  const offlineReferrals = await getOfflineReferrals();
  if (!offlineReferrals || offlineReferrals.length === 0) return;

  const synced: Referral[] = [];

  for (const ref of offlineReferrals) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await runTransaction(db, async (transaction) => {
        const refDocRef = doc(db, 'referrals', ref.id);
        const snap = await transaction.get(refDocRef);
        // Only write if nothing is there yet. If it already exists, this
        // device's own earlier fire-and-forget write from addReferral already
        // landed -- write nothing further, so whatever has happened to the
        // referral since is not clobbered by this stale cached copy.
        if (!snap.exists()) {
          transaction.set(refDocRef, ref);
        }
      });
    } catch (err) {
      // Left in IndexedDB for the next sync attempt (next reconnect, or next
      // app load) rather than lost -- a failed write here means the referral
      // still only exists in this cache.
      console.warn('Failed syncing offline referral', ref.id, err);
      continue;
    }

    // The write above succeeded: this referral now exists in Firestore and is
    // visible to its recipients, so it must be queued for notification even if
    // the IndexedDB cleanup below fails -- gating notification on the delete
    // succeeding meant a delete failure silently dropped the alert for a
    // referral that really is there, which is exactly the kind of silent
    // failure this module exists to end. Worst case on a delete failure is a
    // duplicate notification the next time this referral gets synced again;
    // that is recoverable in a way a missing notification is not.
    synced.push(ref);
    try {
      // eslint-disable-next-line no-await-in-loop
      await deleteOfflineReferral(ref.id);
    } catch (err) {
      console.warn('Failed to clear synced referral from the offline cache', ref.id, err);
    }
  }

  for (const ref of synced) {
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

  if (setPendingSyncCount) {
    const remaining = await getOfflineReferrals();
    setPendingSyncCount(remaining.length);
  }
}
