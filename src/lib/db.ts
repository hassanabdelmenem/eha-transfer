import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Referral } from '../types';

interface ReferralDB extends DBSchema {
  'offline-referrals': {
    key: string;
    value: Referral;
  };
}

let dbPromise: Promise<IDBPDatabase<ReferralDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<ReferralDB>('referral-store', 1, {
    upgrade(db) {
      db.createObjectStore('offline-referrals', { keyPath: 'id' });
    },
  });
}

export async function saveOfflineReferral(referral: Referral) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('offline-referrals', referral);
}

export async function getOfflineReferrals(): Promise<Referral[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('offline-referrals');
}

export async function deleteOfflineReferral(id: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('offline-referrals', id);
}

export async function clearOfflineReferrals() {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.clear('offline-referrals');
}
