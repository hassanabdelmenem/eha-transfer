import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { StatusHistoryEntry } from '../types';

export interface ParentPartyFields {
  referringFacilityId?: string;
  receivingFacilityId?: string;
  candidateFacilityIds?: string[];
}

/**
 * The referral's audit trail, read from referrals/{id}/statusHistory.
 *
 * Merges legacyHistory (pre-subcollection array) with entries from the subcollection,
 * deduplicating on (timestamp + status + userId) and sorting ascending by timestamp.
 * Re-subscribes whenever the caller's verified state or parent party fields change.
 */
export function useStatusHistory(
  referralId: string | undefined,
  legacyHistory?: StatusHistoryEntry[],
  parentParties?: ParentPartyFields
) {
  const { user } = useAuth();
  const [subcollectionHistory, setSubcollectionHistory] = useState<StatusHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isVerified = user?.verified ?? false;
  const candidateKey = parentParties?.candidateFacilityIds?.slice().sort().join(',') ?? '';
  const partyKey = `${parentParties?.referringFacilityId ?? ''}|${parentParties?.receivingFacilityId ?? ''}|${candidateKey}`;

  useEffect(() => {
    if (!referralId) {
      setSubcollectionHistory(null);
      setLoading(false);
      setError(null);
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
        setSubcollectionHistory(entries);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching status history:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [referralId, isVerified, partyKey]);

  // Merge legacyHistory + subcollectionHistory, de-dup by (timestamp + status + userId), sort by timestamp ascending
  const merged = (() => {
    if (!legacyHistory?.length && !subcollectionHistory?.length) {
      return subcollectionHistory;
    }
    const map = new Map<string, StatusHistoryEntry>();
    for (const entry of (legacyHistory || [])) {
      if (entry && entry.timestamp) {
        const key = `${entry.timestamp}_${entry.status}_${entry.userId}`;
        map.set(key, entry);
      }
    }
    for (const entry of (subcollectionHistory || [])) {
      if (entry && entry.timestamp) {
        const key = `${entry.timestamp}_${entry.status}_${entry.userId}`;
        map.set(key, entry);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  })();

  return { history: merged, loading, error };
}
