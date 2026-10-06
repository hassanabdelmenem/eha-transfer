import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StatusHistoryEntry } from '../types';

/**
 * The referral's audit trail, read from referrals/{id}/statusHistory.
 *
 * `legacyHistory` is the pre-subcollection array field. Referrals not yet run
 * through scripts/migrate-status-history.mjs still carry it and have no entries
 * in the subcollection; until they do, that array is what is shown.
 */
export function useStatusHistory(referralId: string | undefined, legacyHistory?: StatusHistoryEntry[]) {
  const [history, setHistory] = useState<StatusHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!referralId) {
      setHistory(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, `referrals/${referralId}/statusHistory`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map((doc) => doc.data() as StatusHistoryEntry);
        setHistory(entries);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching status history:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [referralId]);

  // Also covers a failed subcollection read, so the trail never goes blank.
  const shown = !history?.length && legacyHistory?.length ? legacyHistory : history;
  return { history: shown, loading, error };
}
