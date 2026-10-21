import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStatusHistory } from './useStatusHistory';
import type { StatusHistoryEntry } from '../types';

let mockUser: any = { id: 'u1', verified: true, facilityId: 'f1' };
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
}));

let snapshotCallback: ((snapshot: any) => void) | null = null;
let snapshotErrorCallback: ((err: any) => void) | null = null;
const unsubscribeMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((_q, onNext, onError) => {
    snapshotCallback = onNext;
    snapshotErrorCallback = onError;
    return unsubscribeMock;
  }),
}));

describe('useStatusHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotCallback = null;
    snapshotErrorCallback = null;
    mockUser = { id: 'u1', verified: true, facilityId: 'f1' };
  });

  it('merges legacyHistory and subcollectionHistory, deduplicating and sorting ascending', () => {
    const legacy: StatusHistoryEntry[] = [
      { status: 'pending', timestamp: '2026-10-21T01:00:00Z', userId: 'u1', notes: 'Legacy 1' },
      { status: 'dept_approved', timestamp: '2026-10-21T02:00:00Z', userId: 'u2', notes: 'Legacy 2' },
    ];

    const { result } = renderHook(() =>
      useStatusHistory('ref-123', legacy, { referringFacilityId: 'f1' })
    );

    // Initial state before snapshot returns: shows legacy entries
    expect(result.current.history).toHaveLength(2);
    expect(result.current.loading).toBe(true);

    // Simulate snapshot delivery with 1 duplicated entry and 1 new subcollection entry
    act(() => {
      snapshotCallback?.({
        docs: [
          {
            data: () => ({
              status: 'dept_approved',
              timestamp: '2026-10-21T02:00:00Z',
              userId: 'u2',
              notes: 'Subcollection duplicate',
            }),
          },
          {
            data: () => ({
              status: 'accepted',
              timestamp: '2026-10-21T03:00:00Z',
              userId: 'u3',
              notes: 'Subcollection new',
            }),
          },
        ],
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.history).toHaveLength(3);
    expect(result.current.history?.map((h) => h.status)).toEqual([
      'pending',
      'dept_approved',
      'accepted',
    ]);
  });

  it('surfaces snapshot errors', () => {
    const { result } = renderHook(() => useStatusHistory('ref-123'));

    act(() => {
      snapshotErrorCallback?.(new Error('Permission denied'));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Permission denied');
  });

  it('re-subscribes when parent party fields or caller verified state change', () => {
    const { rerender } = renderHook(
      ({ id, parties }) => useStatusHistory(id, undefined, parties),
      {
        initialProps: {
          id: 'ref-123',
          parties: { referringFacilityId: 'f1', receivingFacilityId: 'f2' },
        },
      }
    );

    expect(unsubscribeMock).not.toHaveBeenCalled();

    // Change receiving facility
    rerender({
      id: 'ref-123',
      parties: { referringFacilityId: 'f1', receivingFacilityId: 'f3' },
    });

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
