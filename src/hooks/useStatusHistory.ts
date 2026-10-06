import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StatusHistoryEntry } from '../types';

export function useStatusHistory(referralId: string | undefined) {
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

  return { history, loading, error };
}
