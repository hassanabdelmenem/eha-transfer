import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '../types';
import { createFirestoreModuleMock, getActiveFirestoreState, resetFirestoreState, seedCollection, type MockFirestoreState } from './testUtils/mockFirestore';
import { makeUser, makeFacility, makeReferral, makeDirectAdmission } from './testUtils/fixtures';
import { DataProvider, useData } from './DataContext';

vi.mock('firebase/firestore', () => createFirestoreModuleMock());
let fsState: MockFirestoreState;
vi.mock('../lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('../lib/db', () => ({
  saveOfflineReferral: vi.fn().mockResolvedValue(undefined),
  getOfflineReferrals: vi.fn().mockResolvedValue([]),
  deleteOfflineReferral: vi.fn().mockResolvedValue(undefined),
}));

let mockUser: User | null = null;
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

let capturedError: string | null = null;

const Consumer = () => {
  const {
    addReferral, updateReferralStatus, overrideReferralDestination, addDeptComment,
    recordPatientConsent, setAccompanyingDoctor, quickTransfer, addDirectAdmission, dischargeDirectAdmission,
    referrals, directAdmissions, facilities,
  } = useData();
  return (
    <div>
      <div data-testid="referral-status">{referrals.find(r => r.id === 'r1')?.status}</div>
      <div data-testid="referral-receiving">{referrals.find(r => r.id === 'r1')?.receivingFacilityId}</div>
      <div data-testid="admission-department">{directAdmissions.find(a => a.id === 'a1')?.department}</div>
      <div data-testid="admission-status">{directAdmissions.find(a => a.id === 'a1')?.status}</div>
      <div data-testid="facility-occupied">{facilities.find(f => f.id === 'f1')?.capacity.Ward.occupied}</div>
      <button onClick={() => addReferral({
        patientId: 'p1', patientData: makeReferral().patientData,
        referringFacilityId: 'f1', referringUserId: 'u1', receivingFacilityId: 'f2', candidateFacilityIds: [],
        receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'urgent', status: 'pending', reasonForReferral: '',
      })}>AddDirect</button>
      <button onClick={() => addReferral({
        patientId: 'p1', patientData: makeReferral().patientData,
        referringFacilityId: 'f1', referringUserId: 'u1', receivingFacilityId: 'auto', candidateFacilityIds: ['f2', 'f3'],
        receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'urgent', status: 'pending', reasonForReferral: '',
      }, true)}>AddAutoRoutedCritical</button>
      <button onClick={() => addReferral({
        patientId: 'p1', patientData: makeReferral().patientData,
        referringFacilityId: 'no-such-facility', referringUserId: 'u1', receivingFacilityId: 'f2', candidateFacilityIds: [],
        receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'routine', status: 'pending', reasonForReferral: '',
      })}>AddDirectRoutineUnknownFacility</button>
      <button onClick={() => addReferral({
        patientId: 'p1', patientData: makeReferral().patientData,
        referringFacilityId: 'f1', referringUserId: 'u1', receivingFacilityId: 'f2', candidateFacilityIds: [],
        receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'routine', status: 'pending', reasonForReferral: '',
      }, true)}>AddDirectCritical</button>
      <button onClick={() => addReferral({
        patientId: 'p1', patientData: makeReferral().patientData,
        referringFacilityId: 'no-such-facility', referringUserId: 'u1', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'],
        receivingDepartments: ['Cardiology'], requiredBedType: 'Ward', priority: 'routine', status: 'pending', reasonForReferral: '',
      })}>AddAutoRoutedRoutine</button>
      <button onClick={async () => {
        capturedError = null;
        try { await updateReferralStatus('r1', 'accepted'); } catch (e: any) { capturedError = e.message; }
      }}>Accept</button>
      <button onClick={async () => {
        capturedError = null;
        try { await updateReferralStatus('r1', 'rejected', 'not appropriate'); } catch (e: any) { capturedError = e.message; }
      }}>Reject</button>
      <button onClick={async () => {
        capturedError = null;
        try { await updateReferralStatus('r1', 'rejected', ''); } catch (e: any) { capturedError = e.message; }
      }}>RejectNoReason</button>
      <button onClick={async () => {
        capturedError = null;
        try { await updateReferralStatus('r1', 'in_transit'); } catch (e: any) { capturedError = e.message; }
      }}>Dispatch</button>
      <button onClick={async () => {
        capturedError = null;
        try { await updateReferralStatus('r1', 'admitted'); } catch (e: any) { capturedError = e.message; }
      }}>Admit</button>
      <button onClick={async () => {
        capturedError = null;
        try { await updateReferralStatus('r1', 'discharged'); } catch (e: any) { capturedError = e.message; }
      }}>Discharge</button>
      <button onClick={() => overrideReferralDestination('r1', 'f9')}>Override</button>
      <button onClick={() => addDeptComment('r1', 'direct_approval', 'looks fine')}>DirectApprove</button>
      <button onClick={() => addDeptComment('r1', 'requirements_needed', 'need ECG')}>RequirementsNeeded</button>
      <button onClick={() => addDeptComment('r1', 'requirements_needed', '')}>RequirementsNeededNoComment</button>
      <button onClick={() => addDeptComment('r1', 'no_role', 'fyi')}>NoRoleComment</button>
      <button onClick={async () => {
        capturedError = null;
        try { await recordPatientConsent('r1'); } catch (e: any) { capturedError = e.message; }
      }}>Consent</button>
      <button onClick={async () => {
        capturedError = null;
        try { await setAccompanyingDoctor('r1', 'Dr. Amr', '0100000000'); } catch (e: any) { capturedError = e.message; }
      }}>SetEscort</button>
      <button onClick={async () => {
        capturedError = null;
        try { await setAccompanyingDoctor('r1', '', ''); } catch (e: any) { capturedError = e.message; }
      }}>SetEscortBlank</button>
      <button onClick={() => quickTransfer('referral', 'r1', 'ICU', 'stable')}>QuickTransferReferral</button>
      <button onClick={() => quickTransfer('referral', 'r1', 'ICU', '')}>QuickTransferReferralNoNotes</button>
      <button onClick={() => quickTransfer('admission', 'a1', 'ICU', '')}>QuickTransferAdmission</button>
      <button onClick={() => addDirectAdmission({ facilityId: 'f1', department: 'Emergency', bedType: 'Ward', patientName: 'New Patient', hospitalId: 'H9', admittedBy: 'u1' })}>Admit1</button>
      <button onClick={() => addDirectAdmission({ facilityId: 'no-such-facility', department: 'Emergency', bedType: 'Ward', patientName: 'New Patient', hospitalId: 'H9', admittedBy: 'u1' })}>AdmitMissingFacility</button>
      <button onClick={() => addDirectAdmission({ facilityId: 'f1', department: 'Emergency', bedType: 'PICU', patientName: 'New Patient', hospitalId: 'H9', admittedBy: 'u1' })}>AdmitUnconfiguredBedType</button>
      <button onClick={() => dischargeDirectAdmission('a1')}>DischargeAdmission</button>
      <button onClick={() => dischargeDirectAdmission('a1')} id="discharge-twice">DischargeTwice</button>
    </div>
  );
};

const renderProvider = () => render(<DataProvider><Consumer /></DataProvider>);

describe('DataContext referral mutations', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    capturedError = null;
    mockUser = makeUser({ id: 'u1', role: 'hospital_manager', facilityId: 'f2', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' }), makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1', facilityId: 'f2', role: 'hospital_manager' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
  });

  it('creates a directly-routed referral online and notifies the receiving facility', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddDirect').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['notifications'] || {}).length).toBeGreaterThan(0));
  });

  it('creates an auto-routed critical referral and notifies every candidate facility', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddAutoRoutedCritical').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['referrals'] || {}).length).toBe(1));
    const notifs = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some((n: any) => n.title.includes('CRITICAL ALERT'))).toBe(true);
  });

  it('sends a plain (non-critical) auto-routed notification and falls back to "Facility" for an unknown referrer', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddDirectRoutineUnknownFacility').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['referrals'] || {}).length).toBe(1));

    const notifs: any[] = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some(n => n.title === 'New ROUTINE Referral')).toBe(true);
    expect(notifs.some(n => n.type === 'info')).toBe(true);
    expect(notifs.some(n => n.message.includes('Referral from Facility for'))).toBe(true);
  });

  it('sends a critical alert for a directly-routed referral', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddDirectCritical').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['referrals'] || {}).length).toBe(1));

    const notifs: any[] = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some(n => n.title.includes('CRITICAL ALERT') && n.type === 'urgent')).toBe(true);
  });

  it('sends a plain (non-critical) auto-routed referral notification per candidate', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddAutoRoutedRoutine').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['referrals'] || {}).length).toBe(1));

    const notifs: any[] = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some(n => n.title === 'New ROUTINE Referral (Auto-Routed)' && n.type === 'info')).toBe(true);
  });
});

describe('createNotification on-call delegation', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'hospital_manager', facilityId: 'f2', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' }), makeFacility({ id: 'f2' }), makeFacility({ id: 'f3' })]);
    seedCollection(fsState, 'users', [
      makeUser({ id: 'u1', facilityId: 'f2', role: 'hospital_manager' }),
      // Not a head_of_department, but covering Cardiology per the shift
      // assignment below -- must still be notified as a delegate.
      makeUser({ id: 'delegate-1', role: 'resident', facilityId: 'f2', department: 'Emergency' }),
      // Eligible for delegation by role, but not covering anything -- excluded.
      makeUser({ id: 'resident-not-on-call', role: 'resident', facilityId: 'f2', department: 'Neurology' }),
      // A head_of_department in the WRONG department, with no delegation --
      // must be excluded despite matching role and facility.
      makeUser({ id: 'hod-wrong-dept', role: 'head_of_department', facilityId: 'f2', department: 'Neurology' }),
      // Eligible for delegation by role, at a facility with no shift-assignment
      // entry at all (as opposed to one with entries that just don't match).
      makeUser({ id: 'resident-f3', role: 'resident', facilityId: 'f3', department: 'Neurology' }),
    ]);
    seedCollection(fsState, 'shiftAssignments', [
      { id: 'sa1', facilityId: 'f2', department: 'Cardiology', assignedUserId: 'delegate-1' },
    ]);
  });

  it('notifies the on-call delegate covering the department and excludes an off-department head of department', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddDirect').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['referrals'] || {}).length).toBe(1));

    const notifs: any[] = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some(n => n.userId === 'delegate-1')).toBe(true);
    expect(notifs.some(n => n.userId === 'hod-wrong-dept')).toBe(false);
    expect(notifs.some(n => n.userId === 'resident-not-on-call')).toBe(false);
  });

  it('excludes an eligible-role recipient at a facility with no shift-assignment entry at all', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddAutoRoutedCritical').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['referrals'] || {}).length).toBe(1));

    const notifs: any[] = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some(n => n.userId === 'resident-f3')).toBe(false);
  });
});

describe('DataContext.updateReferralStatus', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    capturedError = null;
    mockUser = makeUser({ id: 'u1', role: 'hospital_manager', facilityId: 'f2', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' }), makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1', facilityId: 'f2', role: 'hospital_manager' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'accepted', receivingFacilityId: 'f2' })]);
  });

  it('claims an auto referral for the accepting facility on approval', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'] })]);
    renderProvider();
    await act(async () => { screen.getByText('Accept').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-receiving')).toHaveTextContent('f2'));
  });

  it('leaves an auto referral unclaimed when the approving caller has no facility of their own', async () => {
    mockUser = makeUser({ id: 'u1', role: 'system_admin', facilityId: undefined, verified: true });
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'] })]);
    renderProvider();
    await act(async () => { screen.getByText('Accept').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].status).toBe('accepted'));
    expect(fsState.stores['referrals']['r1'].receivingFacilityId).toBe('auto');
  });

  it('refuses a rejection with no reason', async () => {
    renderProvider();
    await act(async () => { screen.getByText('RejectNoReason').click(); });
    expect(capturedError).toMatch(/rejection reason is required/i);
  });

  it('prefixes a rejection reason that does not already read as one', async () => {
    renderProvider();
    await act(async () => { screen.getByText('Reject').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('rejected'));
    const stored = fsState.stores['referrals']['r1'];
    expect(stored.statusHistory.at(-1).notes).toBe('Rejected: not appropriate');
    expect(stored.rejectionReason).toBe('not appropriate');
    expect(stored.rejectedBy).toBe('u1');
  });

  it('does not double-prefix a reason that already starts with "rejected"', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'accepted', receivingFacilityId: 'f2' })]);
    const Wrapper = () => {
      const { updateReferralStatus } = useData();
      return <button onClick={() => updateReferralStatus('r1', 'rejected', 'Rejected: bed unavailable')}>RejectPrefixed</button>;
    };
    render(<DataProvider><Wrapper /></DataProvider>);
    await act(async () => { screen.getByText('RejectPrefixed').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].status).toBe('rejected'));
    expect(fsState.stores['referrals']['r1'].statusHistory.at(-1).notes).toBe('Rejected: bed unavailable');
  });

  it('refuses to dispatch before patient consent', async () => {
    renderProvider();
    await act(async () => { screen.getByText('Dispatch').click(); });
    expect(capturedError).toMatch(/before the patient has consented/i);
  });

  it('refuses to dispatch a transfer flagged as needing an escort with none recorded', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'patient_consented', receivingFacilityId: 'f2', requiresAccompanyingDoctor: true })]);
    renderProvider();
    await act(async () => { screen.getByText('Dispatch').click(); });
    expect(capturedError).toMatch(/accompanying doctor/i);
  });

  it('dispatches once consented and escorted', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({
      id: 'r1', status: 'patient_consented', receivingFacilityId: 'f2', requiresAccompanyingDoctor: true,
      accompanyingDoctor: { name: 'Dr. Amr', phoneNumber: '01000', addedBy: 'u1', addedAt: new Date().toISOString() },
    })]);
    renderProvider();
    await act(async () => { screen.getByText('Dispatch').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('in_transit'));
  });

  it('increments occupied beds on admission and decrements on discharge, gated on receiving-facility staff', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'in_transit', receivingFacilityId: 'f2', requiredBedType: 'Ward' })]);
    renderProvider();
    await act(async () => { screen.getByText('Admit').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('admitted'));

    await act(async () => { screen.getByText('Discharge').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('discharged'));
  });

  it('does not adjust capacity for staff outside the receiving facility', async () => {
    mockUser = makeUser({ id: 'u-referring', role: 'hospital_manager', facilityId: 'f1', verified: true });
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'in_transit', receivingFacilityId: 'f2', requiredBedType: 'Ward' })]);
    renderProvider();
    const before = fsState.stores['facilities']['f2'].capacity.Ward.occupied;
    await act(async () => { screen.getByText('Admit').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('admitted'));
    expect(fsState.stores['facilities']['f2'].capacity.Ward.occupied).toBe(before);
  });

  it('is a no-op when the referral no longer exists', async () => {
    resetFirestoreState(fsState);
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
    renderProvider();
    await act(async () => { screen.getByText('Accept').click(); });
    expect(capturedError).toBeNull();
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    renderProvider();
    await act(async () => { screen.getByText('Accept').click(); });
    expect(fsState.stores['referrals']?.['r1']?.status).toBe('accepted');
  });
});

describe('DataContext.overrideReferralDestination', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f9', name: 'Ninth Facility' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', receivingFacilityId: 'f2' })]);
  });

  it('overrides the destination and records who did it', async () => {
    renderProvider();
    await act(async () => { screen.getByText('Override').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-receiving')).toHaveTextContent('f9'));
    expect(fsState.stores['referrals']['r1'].statusHistory.at(-1).notes).toMatch(/Ninth Facility/);
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    renderProvider();
    await act(async () => { screen.getByText('Override').click(); });
    expect(fsState.stores['referrals']['r1'].receivingFacilityId).toBe('f2');
  });

  it('is a no-op when the referral no longer exists', async () => {
    resetFirestoreState(fsState);
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f9' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    renderProvider();
    await expect(act(async () => { screen.getByText('Override').click(); })).resolves.not.toThrow();
  });
});

describe('DataContext.addDeptComment', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'head_of_department', facilityId: 'f2', verified: true, name: 'Dr. Head' });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' }), makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
  });

  it('claims an auto-routed pending referral on direct approval and notifies managers', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'] })]);
    renderProvider();
    await act(async () => { screen.getByText('DirectApprove').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('dept_approved'));
    expect(screen.getByTestId('referral-receiving')).toHaveTextContent('f2');
    const notifs = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some((n: any) => n.title.includes('Department Approved'))).toBe(true);
  });

  it('keeps an already-directed referral\'s receiving facility unchanged on direct approval', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('DirectApprove').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('dept_approved'));
    expect(screen.getByTestId('referral-receiving')).toHaveTextContent('f2');
  });

  it('falls back to "auto" when the approving caller has no facility of their own', async () => {
    mockUser = makeUser({ id: 'u1', role: 'system_admin', facilityId: undefined, verified: true, name: 'Dr. Head' });
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'] })]);
    renderProvider();
    await act(async () => { screen.getByText('DirectApprove').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('dept_approved'));
    expect(screen.getByTestId('referral-receiving')).toHaveTextContent('auto');
  });

  it('claims an auto-routed referral for the reviewer\'s facility when requirements are needed', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'] })]);
    renderProvider();
    await act(async () => { screen.getByText('RequirementsNeeded').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('postponed'));
    expect(screen.getByTestId('referral-receiving')).toHaveTextContent('f2');
  });

  it('falls back to "auto" for a requirements-needed review with no facility of the reviewer\'s own', async () => {
    mockUser = makeUser({ id: 'u1', role: 'system_admin', facilityId: undefined, verified: true, name: 'Dr. Head' });
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'auto', candidateFacilityIds: ['f2'] })]);
    renderProvider();
    await act(async () => { screen.getByText('RequirementsNeeded').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('postponed'));
    expect(screen.getByTestId('referral-receiving')).toHaveTextContent('auto');
  });

  it('uses a generic status note and message, and falls back to "the referring facility" for an unknown referrer, when no comment is given', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2', referringFacilityId: 'no-such-facility' })]);
    renderProvider();
    await act(async () => { screen.getByText('RequirementsNeededNoComment').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('postponed'));

    const stored = fsState.stores['referrals']['r1'];
    expect(stored.statusHistory.at(-1).notes).toBe('Requirements needed before this referral can proceed.');
    const notifs: any[] = Object.values(fsState.stores['notifications'] || {});
    const postponedNotif = notifs.find(n => n.title.includes('Requirements Needed'));
    expect(postponedNotif.message).toMatch(/from the referring facility/);
    expect(postponedNotif.message).not.toMatch(/:\s*"/);
  });

  it('sends requirements-needed referrals straight back, escalated, without a manager step, and always reaches the referring doctor by name', async () => {
    // Named by targetUserIds, with a role/facility that would otherwise never
    // match this notification's facilityIds/targetRoles -- proves the named-
    // individual branch, not facility/role scoping, is what includes them.
    seedCollection(fsState, 'users', [
      ...Object.values(fsState.stores['users']),
      makeUser({ id: 'creator-1', role: 'resident', facilityId: 'f9' }),
    ]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2', referringFacilityId: 'f1', referringUserId: 'creator-1' })]);
    renderProvider();
    await act(async () => { screen.getByText('RequirementsNeeded').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('postponed'));

    const stored = fsState.stores['referrals']['r1'];
    expect(stored.isEscalated).toBe(true);
    expect(stored.escalationReason).toBe('requirements_needed');
    const notifs = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some((n: any) => n.title.includes('Requirements Needed'))).toBe(true);
    expect(notifs.some((n: any) => n.userId === 'creator-1')).toBe(true);
  });

  it('records a no_role comment without changing status or claiming the referral', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('NoRoleComment').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].deptComments.length).toBe(1));
    expect(screen.getByTestId('referral-status')).toHaveTextContent('pending');
  });

  it('does not re-claim a referral that has already left pending', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'dept_approved', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('DirectApprove').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].deptComments.length).toBe(1));
    expect(fsState.stores['referrals']['r1'].status).toBe('dept_approved');
  });

  it('logs and swallows a transaction failure', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2' })]);
    const firestore = await import('firebase/firestore');
    vi.spyOn(firestore, 'runTransaction').mockRejectedValueOnce(new Error('boom'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderProvider();
    await act(async () => { screen.getByText('NoRoleComment').click(); });
    expect(errSpy).toHaveBeenCalled();
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('NoRoleComment').click(); });
    expect(fsState.stores['referrals']['r1'].deptComments).toHaveLength(0);
  });

  it('is a no-op when the referral no longer exists', async () => {
    renderProvider();
    await expect(act(async () => { screen.getByText('NoRoleComment').click(); })).resolves.not.toThrow();
  });
});

describe('DataContext.recordPatientConsent', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'resident', facilityId: 'f1', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
  });

  it('records consent and notifies the receiving facility', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'accepted', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('Consent').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('patient_consented'));
    const notifs = Object.values(fsState.stores['notifications'] || {});
    expect(notifs.some((n: any) => n.title.includes('Consented'))).toBe(true);
  });

  it('skips the notification for an auto-pending receiving facility', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'accepted', receivingFacilityId: 'auto' })]);
    renderProvider();
    await act(async () => { screen.getByText('Consent').click(); });
    await waitFor(() => expect(screen.getByTestId('referral-status')).toHaveTextContent('patient_consented'));
    expect(Object.values(fsState.stores['notifications'] || {})).toHaveLength(0);
  });

  it('is refused outside the accepted status', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'pending', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('Consent').click(); });
    expect(capturedError).toMatch(/accepted/i);
  });

  it('is refused when the referral no longer exists', async () => {
    renderProvider();
    await act(async () => { screen.getByText('Consent').click(); });
    expect(capturedError).toMatch(/not found/i);
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'accepted', receivingFacilityId: 'f2' })]);
    renderProvider();
    await act(async () => { screen.getByText('Consent').click(); });
    expect(fsState.stores['referrals']['r1'].status).toBe('accepted');
  });
});

describe('DataContext.setAccompanyingDoctor', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'er_official', facilityId: 'f2', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
  });

  it('requires both a name and a phone number', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'patient_consented' })]);
    renderProvider();
    await act(async () => { screen.getByText('SetEscortBlank').click(); });
    expect(capturedError).toMatch(/name.*phone number.*required/i);
  });

  it('records the escort once patient-consented', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'patient_consented' })]);
    renderProvider();
    await act(async () => { screen.getByText('SetEscort').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].accompanyingDoctor?.name).toBe('Dr. Amr'));
  });

  it('is refused outside the patient_consented status', async () => {
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'accepted' })]);
    renderProvider();
    await act(async () => { screen.getByText('SetEscort').click(); });
    expect(capturedError).toMatch(/patient has consented/i);
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', status: 'patient_consented' })]);
    renderProvider();
    await act(async () => { screen.getByText('SetEscort').click(); });
    expect(fsState.stores['referrals']['r1'].accompanyingDoctor).toBeUndefined();
  });

  it('is refused when the referral no longer exists', async () => {
    renderProvider();
    await act(async () => { screen.getByText('SetEscort').click(); });
    expect(capturedError).toMatch(/not found/i);
  });
});

describe('DataContext.quickTransfer', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'hospital_manager', facilityId: 'f2', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1', receivingDepartments: ['Cardiology'] })]);
    seedCollection(fsState, 'directAdmissions', [makeDirectAdmission({ id: 'a1', department: 'Emergency' })]);
  });

  it('moves a referral to a new department and records the transfer note', async () => {
    renderProvider();
    await act(async () => { screen.getByText('QuickTransferReferral').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].receivingDepartments).toEqual(['ICU']));
    expect(fsState.stores['referrals']['r1'].statusHistory.at(-1).notes).toMatch(/stable/);
  });

  it('omits the "Notes:" suffix entirely when no notes are given', async () => {
    renderProvider();
    await act(async () => { screen.getByText('QuickTransferReferralNoNotes').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].receivingDepartments).toEqual(['ICU']));
    expect(fsState.stores['referrals']['r1'].statusHistory.at(-1).notes).not.toMatch(/Notes:/);
  });

  it('attributes the transfer to "system" with no signed-in user', async () => {
    mockUser = null;
    renderProvider();
    await act(async () => { screen.getByText('QuickTransferReferral').click(); });
    await waitFor(() => expect(fsState.stores['referrals']['r1'].statusHistory.at(-1).userId).toBe('system'));
  });

  it('moves a direct admission to a new department', async () => {
    renderProvider();
    await act(async () => { screen.getByText('QuickTransferAdmission').click(); });
    await waitFor(() => expect(screen.getByTestId('admission-department')).toHaveTextContent('ICU'));
  });

  it('is a no-op when the referral no longer exists', async () => {
    resetFirestoreState(fsState);
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f2' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
    renderProvider();
    await expect(act(async () => { screen.getByText('QuickTransferReferral').click(); })).resolves.not.toThrow();
  });
});

describe('DataContext direct admissions', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'hospital_manager', facilityId: 'f1', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'admin-watcher', role: 'system_admin', facilityId: undefined })]);
  });

  it('records a new admission and increments the bed count', async () => {
    renderProvider();
    const before = fsState.stores['facilities']['f1'].capacity.Ward.occupied;
    await act(async () => { screen.getByText('Admit1').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['directAdmissions'] || {})).toHaveLength(1));
    expect(fsState.stores['facilities']['f1'].capacity.Ward.occupied).toBe(before + 1);
  });

  it('still records the admission when its facility does not exist, skipping the capacity update', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AdmitMissingFacility').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['directAdmissions'] || {})).toHaveLength(1));
  });

  it('still records the admission when its bed type is not configured on the facility', async () => {
    // A malformed/partial facility document -- the real Facility type always
    // carries every BedType, but nothing stops a legacy or hand-edited
    // Firestore doc from omitting one.
    const partial = { ...makeFacility({ id: 'f1' }), capacity: { ICU: { total: 5, occupied: 1 }, CCU: { total: 5, occupied: 1 }, Ward: { total: 20, occupied: 5 } } };
    delete (partial.capacity as any).PICU;
    seedCollection(fsState, 'facilities', [partial as any]);
    renderProvider();
    await act(async () => { screen.getByText('AdmitUnconfiguredBedType').click(); });
    await waitFor(() => expect(Object.keys(fsState.stores['directAdmissions'] || {})).toHaveLength(1));
  });

  it('discharges an admission exactly once, decrementing capacity only the first time', async () => {
    seedCollection(fsState, 'directAdmissions', [makeDirectAdmission({ id: 'a1', facilityId: 'f1', bedType: 'Ward', status: 'admitted' })]);
    renderProvider();
    const before = fsState.stores['facilities']['f1'].capacity.Ward.occupied;

    await act(async () => { screen.getByText('DischargeAdmission').click(); });
    await waitFor(() => expect(screen.getByTestId('admission-status')).toHaveTextContent('discharged'));
    expect(fsState.stores['facilities']['f1'].capacity.Ward.occupied).toBe(before - 1);

    await act(async () => { screen.getByText('DischargeTwice').click(); });
    expect(fsState.stores['facilities']['f1'].capacity.Ward.occupied).toBe(before - 1);
  });

  it('is a no-op when the admission no longer exists', async () => {
    renderProvider();
    await expect(act(async () => { screen.getByText('DischargeAdmission').click(); })).resolves.not.toThrow();
  });
});
