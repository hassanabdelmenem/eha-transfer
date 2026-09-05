import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataProvider, useData } from './DataContext';
import type { Facility, Referral, User } from '../types';

// --- Mock the authenticated caller (swapped per test via setMockUser) ---
let mockUser: User | null = null;
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// --- Mock Firestore.
//
// toggleReferralEscalation and recordPatientDecline are exposed directly by
// useData() and read the referral via transaction.get(), so those describe
// blocks just seed `referralsStore` and call them through the Consumer below
// -- the same pattern as DataContext.cancel.test.tsx.
//
// autoEscalateReferral and escalateForCapacity are NOT exposed by useData() --
// they're only ever invoked internally by the periodic SLA/capacity sweep
// effect (which runs synchronously once on mount, in addition to on its 30s
// interval). To exercise them, those describe blocks instead populate the
// `referrals`/`facilities`/`users` onSnapshot listeners the sweep reads from
// and assert on the resulting transaction writes.
let referralsStore: Record<string, Referral> = {};
let mockFacilitiesList: Facility[] = [];
let mockUsersList: any[] = [];
const capturedUpdates: { path: string; data: any }[] = [];

vi.mock('firebase/firestore', () => {
  const doc = (_db: any, ...pathParts: string[]) => ({ path: pathParts.join('/') });
  const collection = (_db: any, name: string) => ({ path: name });
  const where = (field: string, op: string, value: any) => ({ field, op, value });
  const orderBy = (field: string, direction?: string) => ({ orderBy: field, direction });
  const limit = (n: number) => ({ limit: n });
  const startAfter = (...cursor: any[]) => ({ startAfter: cursor });
  const query = (ref: any, ...constraints: any[]) => ({ ...ref, constraints });
  const onSnapshot = (ref: any, cb: (snap: any) => void) => {
    let docs: any[] = [];
    if (ref.path === 'facilities') docs = mockFacilitiesList.map(f => ({ data: () => f }));
    else if (ref.path === 'users') docs = mockUsersList.map(u => ({ data: () => u }));
    else if (ref.path === 'referrals') docs = Object.values(referralsStore).map(r => ({ data: () => r }));
    cb({ docs });
    return () => {};
  };
  const writeBatchStub = () => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  });
  const runTransaction = async (_db: any, updateFn: (tx: any) => Promise<any>) => {
    const tx = {
      get: vi.fn(async (ref: any) => {
        const id = ref.path.split('/').pop();
        const r = referralsStore[id];
        return { exists: () => r !== undefined, data: () => r };
      }),
      update: vi.fn((ref: any, data: any) => {
        const id = ref.path.split('/').pop();
        capturedUpdates.push({ path: ref.path, data });
        if (referralsStore[id]) referralsStore[id] = { ...referralsStore[id], ...data };
      }),
      set: vi.fn((ref: any, data: any) => {
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
    orderBy,
    limit,
    startAfter,
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

vi.mock('../lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: 'success' })),
}));

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
    statusHistory: [],
    createdAt: now,
    updatedAt: now,
    deptComments: [],
    isEscalated: false,
    ...overrides,
  };
}

function makeFacility(overrides: Partial<Facility> = {}): Facility {
  return {
    id: 'f2',
    name: 'Facility Two',
    type: 'district_hospital',
    location: 'Cairo',
    departments: ['Emergency'],
    capacity: {
      ICU: { total: 0, occupied: 0 },
      CCU: { total: 0, occupied: 0 },
      PICU: { total: 0, occupied: 0 },
      Ward: { total: 1, occupied: 1 },
    },
    ...overrides,
  };
}

/** `createdAt` far enough in the past to have breached the 30-minute SLA window. */
const breachedCreatedAt = () => new Date(Date.now() - 40 * 60 * 1000).toISOString();

let capturedError: string | null = null;

const Consumer = () => {
  const { toggleReferralEscalation, recordPatientDecline } = useData();
  return (
    <div>
      <button onClick={async () => {
        capturedError = null;
        try { await toggleReferralEscalation('r1', true); } catch (e: any) { capturedError = e.message; }
      }}>Escalate</button>
      <button onClick={async () => {
        capturedError = null;
        try { await toggleReferralEscalation('r1', false); } catch (e: any) { capturedError = e.message; }
      }}>DeEscalate</button>
      <button onClick={async () => {
        capturedError = null;
        try { await recordPatientDecline('r1', 'patient said no'); } catch (e: any) { capturedError = e.message; }
      }}>Decline</button>
      <button onClick={async () => {
        capturedError = null;
        try { await recordPatientDecline('r1', ''); } catch (e: any) { capturedError = e.message; }
      }}>DeclineNoReason</button>
    </div>
  );
};

const renderConsumer = () => render(<DataProvider><Consumer /></DataProvider>);

describe('toggleReferralEscalation', () => {
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockFacilitiesList = [];
    mockUsersList = [];
    mockUser = { id: 'admin-1', email: 'a@x.com', name: 'Admin', role: 'system_admin', verified: true };
    referralsStore = { r1: makeReferral({ status: 'pending' }) };
  });

  it('marks a referral escalated with a manual reason attributed to the caller', async () => {
    renderConsumer();

    await act(async () => { screen.getByText('Escalate').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    const update = capturedUpdates[0].data;
    expect(update.isEscalated).toBe(true);
    expect(update.escalatedBy).toBe('admin-1');
    expect(update.escalationReason).toBe('manual');
    expect(update.escalationLevel).toBe('facility');
    expect(update.autoEscalationSuppressed).toBe(false);
    expect(update.statusHistory.at(-1).notes).toMatch(/Marked as Escalated/);
  });

  it('clears escalation fields and suppresses auto-escalation when de-escalated', async () => {
    referralsStore = { r1: makeReferral({ status: 'pending', isEscalated: true, escalationReason: 'sla_breach' }) };
    renderConsumer();

    await act(async () => { screen.getByText('DeEscalate').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    const update = capturedUpdates[0].data;
    expect(update.isEscalated).toBe(false);
    expect(update.escalatedAt).toBeNull();
    expect(update.escalatedBy).toBeNull();
    expect(update.escalationReason).toBeNull();
    expect(update.escalationLevel).toBeNull();
    expect(update.autoEscalationSuppressed).toBe(true);
    expect(update.statusHistory.at(-1).notes).toBe('De-escalated referral');
  });

  it('does nothing when the referral no longer exists', async () => {
    referralsStore = {};
    renderConsumer();

    await act(async () => { screen.getByText('Escalate').click(); });

    expect(capturedUpdates).toHaveLength(0);
    expect(capturedError).toBeNull();
  });

  it('attributes an escalation to "system" with no signed-in user', async () => {
    mockUser = null;
    renderConsumer();

    await act(async () => { screen.getByText('Escalate').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedUpdates[0].data.escalatedBy).toBe('system');
    expect(capturedUpdates[0].data.statusHistory.at(-1).userId).toBe('system');
  });
});

describe('SLA/capacity sweep -> autoEscalateReferral', () => {
  // autoEscalateReferral is private to DataContext -- reachable only through
  // the periodic sweep effect, which runs once synchronously on mount as soon
  // as a verified user's referrals/facilities/users listeners resolve. These
  // tests seed those listeners and assert on the resulting transaction write,
  // rather than calling the function directly.
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockFacilitiesList = [];
    mockUsersList = [];
    mockUser = { id: 'admin-1', email: 'a@x.com', name: 'Admin', role: 'system_admin', verified: true };
  });

  it('escalates an SLA-tracked referral once its 30-minute window has breached', async () => {
    const r = makeReferral({ status: 'pending', priority: 'emergency', requiredBedType: 'ICU', createdAt: breachedCreatedAt() });
    delete (r as any).candidateFacilityIds;
    referralsStore = { r1: r };
    renderConsumer();

    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    const update = capturedUpdates[0].data;
    expect(update.isEscalated).toBe(true);
    expect(update.escalatedBy).toBe('system');
    expect(update.escalationReason).toBe('sla_breach');
    expect(update.escalationLevel).toBe('facility');
    expect(update.statusHistory.at(-1).notes).toMatch(/Automatically escalated/);
  });

  it('is a no-op for a tracked referral still inside its SLA window', async () => {
    referralsStore = {
      r1: makeReferral({ status: 'pending', priority: 'emergency', requiredBedType: 'ICU', createdAt: new Date().toISOString() }),
    };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });

  it('logs but does not crash the sweep when the auto-escalation transaction itself fails', async () => {
    referralsStore = {
      r1: makeReferral({ status: 'pending', priority: 'emergency', requiredBedType: 'ICU', createdAt: breachedCreatedAt() }),
    };
    const firestore = await import('firebase/firestore');
    vi.spyOn(firestore, 'runTransaction').mockRejectedValueOnce(new Error('offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderConsumer();

    await waitFor(() => expect(errSpy).toHaveBeenCalledWith('Auto-escalation failed for referral r1:', expect.any(Error)));
  });

  it('is idempotent: does not re-escalate a referral that is already escalated', async () => {
    referralsStore = {
      r1: makeReferral({ status: 'pending', priority: 'emergency', requiredBedType: 'ICU', createdAt: breachedCreatedAt(), isEscalated: true }),
    };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });

  it('does not re-raise a breached referral a human has de-escalated', async () => {
    referralsStore = {
      r1: makeReferral({ status: 'pending', priority: 'emergency', requiredBedType: 'ICU', createdAt: breachedCreatedAt(), autoEscalationSuppressed: true }),
    };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });

  it('does not escalate a breached referral outside the tracked priority/bed-type set', async () => {
    referralsStore = {
      r1: makeReferral({ status: 'pending', priority: 'routine', requiredBedType: 'Ward', createdAt: breachedCreatedAt() }),
    };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });
});

describe('SLA/capacity sweep -> escalateForCapacity', () => {
  // Same reachability note as above: escalateForCapacity is private, invoked
  // only by the sweep once facilitiesLoadedRef/usersLoadedRef are both true --
  // hence every test here seeds at least one facility and one user doc.
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockUsersList = [{ id: 'admin-1', email: 'a@x.com', name: 'Admin', role: 'system_admin', verified: true }];
    mockUser = { id: 'admin-1', email: 'a@x.com', name: 'Admin', role: 'system_admin', verified: true };
  });

  it('escalates a pending, unescalated referral at the system level once every candidate is full', async () => {
    mockFacilitiesList = [makeFacility({ id: 'f2', capacity: { ICU: { total: 0, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 1, occupied: 1 } } })];
    referralsStore = {
      r1: makeReferral({ status: 'pending', isEscalated: false, autoEscalationSuppressed: false, receivingFacilityId: 'f2', candidateFacilityIds: [] }),
    };
    renderConsumer();

    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    const update = capturedUpdates[0].data;
    expect(update.isEscalated).toBe(true);
    expect(update.escalatedBy).toBe('system');
    expect(update.escalationReason).toBe('no_beds_available');
    expect(update.escalationLevel).toBe('system');
    expect(update.statusHistory.at(-1).notes).toMatch(/administrative placement/);
  });

  it('logs but does not crash the sweep when the capacity-escalation transaction itself fails', async () => {
    mockFacilitiesList = [makeFacility({ id: 'f2', capacity: { ICU: { total: 0, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 1, occupied: 1 } } })];
    referralsStore = {
      r1: makeReferral({ status: 'pending', isEscalated: false, autoEscalationSuppressed: false, receivingFacilityId: 'f2', candidateFacilityIds: [] }),
    };
    const firestore = await import('firebase/firestore');
    vi.spyOn(firestore, 'runTransaction').mockRejectedValueOnce(new Error('offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderConsumer();

    await waitFor(() => expect(errSpy).toHaveBeenCalledWith('Capacity escalation failed for referral r1:', expect.any(Error)));
  });

  it('escalates with no_matching_facility when the candidate list is empty', async () => {
    mockFacilitiesList = [makeFacility({ id: 'f9' })];
    referralsStore = {
      r1: makeReferral({ status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: [] }),
    };
    renderConsumer();

    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedUpdates[0].data.escalationReason).toBe('no_matching_facility');
  });

  it('is a no-op while a matching facility still has a free bed', async () => {
    mockFacilitiesList = [makeFacility({ id: 'f2', capacity: { ICU: { total: 0, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 2, occupied: 1 } } })];
    referralsStore = {
      r1: makeReferral({ status: 'pending', receivingFacilityId: 'f2', candidateFacilityIds: [] }),
    };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });

  it('is a no-op for a referral that is not in the pending status', async () => {
    mockFacilitiesList = [makeFacility()];
    referralsStore = { r1: makeReferral({ status: 'accepted', isEscalated: false }) };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });

  it('is a no-op for a referral already escalated', async () => {
    mockFacilitiesList = [makeFacility({ id: 'f2', capacity: { ICU: { total: 0, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 1, occupied: 1 } } })];
    referralsStore = { r1: makeReferral({ status: 'pending', isEscalated: true, receivingFacilityId: 'f2', candidateFacilityIds: [] }) };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });

  it('is a no-op for a referral a human has suppressed auto-escalation on', async () => {
    mockFacilitiesList = [makeFacility({ id: 'f2', capacity: { ICU: { total: 0, occupied: 0 }, CCU: { total: 0, occupied: 0 }, PICU: { total: 0, occupied: 0 }, Ward: { total: 1, occupied: 1 } } })];
    referralsStore = { r1: makeReferral({ status: 'pending', isEscalated: false, autoEscalationSuppressed: true, receivingFacilityId: 'f2', candidateFacilityIds: [] }) };
    renderConsumer();
    await act(async () => { await Promise.resolve(); });

    expect(capturedUpdates).toHaveLength(0);
  });
});

describe('recordPatientDecline exhausting all candidates', () => {
  beforeEach(() => {
    capturedUpdates.length = 0;
    capturedError = null;
    mockFacilitiesList = [];
    mockUsersList = [];
    mockUser = { id: 'referrer-1', email: 'ref@x.com', name: 'Referrer', role: 'resident', facilityId: 'f1', verified: true };
  });

  it('records an empty candidate list once the last candidate has declined', async () => {
    referralsStore = { r1: makeReferral({ status: 'accepted', receivingFacilityId: 'f2', candidateFacilityIds: ['f2'] }) };
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    const update = capturedUpdates[0].data;
    expect(update.candidateFacilityIds).toEqual([]);
    expect(update.patientDeclinedFacilityIds).toEqual(['f2']);
  });

  it('accumulates onto a pre-existing patientDeclinedFacilityIds list', async () => {
    referralsStore = {
      r1: makeReferral({
        status: 'accepted', receivingFacilityId: 'f2', candidateFacilityIds: ['f2', 'f3'], patientDeclinedFacilityIds: ['f0'],
      }),
    };
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedUpdates[0].data.patientDeclinedFacilityIds).toEqual(['f0', 'f2']);
  });

  it('records "Not specified" when declined with no reason', async () => {
    referralsStore = { r1: makeReferral({ status: 'accepted', receivingFacilityId: 'f2', candidateFacilityIds: [] }) };
    renderConsumer();

    await act(async () => { screen.getByText('DeclineNoReason').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedUpdates[0].data.statusHistory.at(-1).notes).toMatch(/Reason: Not specified/);
  });

  it('tolerates a referral with no candidateFacilityIds field at all', async () => {
    const r = makeReferral({ status: 'accepted', receivingFacilityId: 'f2' });
    delete (r as any).candidateFacilityIds;
    referralsStore = { r1: r };
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    await waitFor(() => expect(capturedUpdates.length).toBeGreaterThan(0));

    expect(capturedUpdates[0].data.candidateFacilityIds).toEqual([]);
  });

  it('is refused when the referral no longer exists', async () => {
    referralsStore = {};
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    await waitFor(() => expect(capturedError).toBeTruthy());
    expect(capturedError).toMatch(/not found/i);
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    referralsStore = { r1: makeReferral({ status: 'accepted', receivingFacilityId: 'f2' }) };
    renderConsumer();

    await act(async () => { screen.getByText('Decline').click(); });
    expect(capturedUpdates).toHaveLength(0);
  });
});
