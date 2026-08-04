import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataProvider, useData } from './DataContext';
import type { Referral, User } from '../types';

// --- Mock the authenticated caller (swapped per test via setMockUser) ---
let mockUser: User | null = null;
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// --- Mock Firestore. cancelReferral/recordPatientDecline/recordPatientConsent read the
// referral via transaction.get(), so we control that directly per test rather than going
// through the onSnapshot-populated `referrals` array. ---
let mockReferral: Referral | null = null;
const capturedUpdates: { path: string; data: any }[] = [];

vi.mock('firebase/firestore', () => {
  const doc = (_db: any, ...pathParts: string[]) => ({ path: pathParts.join('/') });
  const collection = (_db: any, name: string) => ({ path: name });
  // DataContext scopes its listeners with query()/where() to match the `list`
  // rules in firestore.rules; the stub just needs to pass the ref through.
  const where = (field: string, op: string, value: any) => ({ field, op, value });
  const query = (ref: any, ...constraints: any[]) => ({ ...ref, constraints });
  const onSnapshot = (_ref: any, cb: (snap: any) => void) => {
    cb({ docs: [] });
    return () => {};
  };
  const writeBatchStub = () => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  });
  const runTransaction = async (_db: any, updateFn: (tx: any) => Promise<void>) => {
    const tx = {
      get: vi.fn(async (ref: any) => ({
        exists: () => mockReferral !== null,
        data: () => mockReferral,
      })),
      update: vi.fn((ref: any, data: any) => {
        capturedUpdates.push({ path: ref.path, data });
      }),
    };
    return updateFn(tx);
  };
  return {
    doc,
    collection,
    query,
    where,
    onSnapshot,
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    writeBatch: vi.fn(writeBatchStub),
    increment: (n: number) => ({ __increment: n }),
    runTransaction,
  };
});

vi.mock('../lib/firebase', () => ({ db: {} }));

function makeReferral(overrides: Partial<Referral> = {}): Referral {
  const now = new Date().toISOString();
  return {
    id: 'r1',
    patientId: 'p1',
    patientData: {
      id: 'p1', hospitalId: 'h1', name: 'Test Patient', age: 30, gender: 'male',
      vitalSigns: { hr: 80, bp: '120/80', spo2: 98, temp: 37, rr: 16, timestamp: now },
      complaint: '', presentation: '', pastHistory: '', medications: '', clinicalNotes: '',
      diagnosis: '', investigations: '', attachments: [],
    },
    referringFacilityId: 'f1',
    referringUserId: 'creator-1',
    receivingFacilityId: 'f2',
    candidateFacilityIds: ['f2', 'f3'],
    receivingDepartments: ['Emergency'],
    requiredBedType: 'Ward',
    priority: 'urgent',
    status: 'accepted',
    reasonForReferral: '',
    createdAt: now,
    updatedAt: now,
    deptComments: [],
    statusHistory: [{ status: 'pending', timestamp: now, userId: 'creator-1' }],
    ...overrides,
  };
}

let capturedError: string | null = null;

const Consumer = () => {
  const { cancelReferral, recordPatientDecline } = useData();
  return (
    <div>
      <button onClick={async () => {
        capturedError = null;
        try { await cancelReferral('r1', 'test reason'); } catch (e: any) { capturedError = e.message; }
      }}>Cancel</button>
      <button onClick={async () => {
        capturedError = null;
        try { await recordPatientDecline('r1', 'patient said no'); } catch (e: any) { capturedError = e.message; }
      }}>Decline</button>
    </div>
  );
};

const renderConsumer = () => render(<DataProvider><Consumer /></DataProvider>);

describe('cancelReferral guard', () => {
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockUser = null;
    mockReferral = null;
  });

  it('is refused once the referral is in_transit, even for a privileged caller', async () => {
    mockUser = { id: 'admin-1', email: 'a@x.com', name: 'Admin', role: 'system_admin', verified: true };
    mockReferral = makeReferral({ status: 'in_transit' });
    renderConsumer();

    await act(async () => { screen.getByText('Cancel').click(); });
    await waitFor(() => expect(capturedError).toBeTruthy());

    expect(capturedError).toMatch(/in transit/i);
    expect(capturedUpdates).toHaveLength(0);
  });

  it('is refused for a non-privileged, non-creator, non-senior caller', async () => {
    mockUser = { id: 'stranger-1', email: 's@x.com', name: 'Stranger', role: 'resident', facilityId: 'f1', verified: true };
    mockReferral = makeReferral({ status: 'pending', referringUserId: 'someone-else' });
    renderConsumer();

    await act(async () => { screen.getByText('Cancel').click(); });
    await waitFor(() => expect(capturedError).toBeTruthy());

    expect(capturedError).toMatch(/permission/i);
    expect(capturedUpdates).toHaveLength(0);
  });

  it('succeeds for the referral creator while still pending', async () => {
    mockUser = { id: 'creator-1', email: 'c@x.com', name: 'Creator', role: 'resident', facilityId: 'f1', verified: true };
    mockReferral = makeReferral({ status: 'pending', referringUserId: 'creator-1' });
    renderConsumer();

    await act(async () => { screen.getByText('Cancel').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedError).toBeNull();
    expect(capturedUpdates[0].data.status).toBe('cancelled');
    expect(capturedUpdates[0].data.cancelledBy).toBe('creator-1');
  });

  it('succeeds for a senior role at the referring facility, even if they did not create it', async () => {
    mockUser = { id: 'manager-1', email: 'm@x.com', name: 'Manager', role: 'hospital_manager', facilityId: 'f1', verified: true };
    mockReferral = makeReferral({ status: 'dept_approved', referringUserId: 'someone-else', referringFacilityId: 'f1' });
    renderConsumer();

    await act(async () => { screen.getByText('Cancel').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedError).toBeNull();
    expect(capturedUpdates[0].data.status).toBe('cancelled');
  });

  it('is refused for a senior role at the receiving facility (not the initiator)', async () => {
    mockUser = { id: 'receiving-manager', email: 'r@x.com', name: 'Receiving Mgr', role: 'hospital_manager', facilityId: 'f2', verified: true };
    mockReferral = makeReferral({ status: 'pending', referringUserId: 'someone-else', referringFacilityId: 'f1', receivingFacilityId: 'f2' });
    renderConsumer();

    await act(async () => { screen.getByText('Cancel').click(); });
    await waitFor(() => expect(capturedError).toBeTruthy());

    expect(capturedError).toMatch(/permission/i);
  });
});

describe('recordPatientDecline re-routing', () => {
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockUser = { id: 'referrer-1', email: 'ref@x.com', name: 'Referrer', role: 'resident', facilityId: 'f1', verified: true };
  });

  it('excludes the declined facility from future candidates and resets to auto-pending', async () => {
    mockReferral = makeReferral({ status: 'accepted', receivingFacilityId: 'f2', candidateFacilityIds: ['f2', 'f3'] });
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    const update = capturedUpdates[0].data;
    expect(update.status).toBe('pending');
    expect(update.receivingFacilityId).toBe('auto');
    expect(update.candidateFacilityIds).toEqual(['f3']);
    expect(update.patientDeclinedFacilityIds).toEqual(['f2']);
  });

  it('is refused outside the accepted status', async () => {
    mockReferral = makeReferral({ status: 'pending' });
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    await waitFor(() => expect(capturedError).toBeTruthy());

    expect(capturedError).toMatch(/accepted/i);
    expect(capturedUpdates).toHaveLength(0);
  });
});
