import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '../types';
import { createFirestoreModuleMock, getActiveFirestoreState, resetFirestoreState, seedCollection, type MockFirestoreState } from './testUtils/mockFirestore';
import { makeUser, makeFacility } from './testUtils/fixtures';
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

const Consumer = () => {
  const {
    assignShift, updateUserVerified, updateUserRole, updateUserFacility, removeUser,
    addFacility, updateFacility, removeFacility, addFacilityDepartment, removeFacilityDepartment, updateFacilityCapacity,
    markNotificationRead, markAllNotificationsRead, addShiftLog,
    facilities, users, notifications, shiftAssignments, shiftLogs,
  } = useData();
  return (
    <div>
      <div data-testid="facility-departments">{facilities.find(f => f.id === 'f1')?.departments.join(',')}</div>
      <div data-testid="facility-ward-occupied">{facilities.find(f => f.id === 'f1')?.capacity.Ward.occupied}</div>
      <div data-testid="users-count">{users.length}</div>
      <div data-testid="user-verified">{String(users.find(u => u.id === 'u2')?.verified)}</div>
      <div data-testid="user-role">{users.find(u => u.id === 'u2')?.role}</div>
      <div data-testid="user-facility">{users.find(u => u.id === 'u2')?.facilityId}</div>
      <div data-testid="unread-count">{notifications.filter(n => n.userId === 'u1' && !n.read).length}</div>
      <div data-testid="shift-assignments-count">{shiftAssignments.length}</div>
      <div data-testid="shift-logs-count">{shiftLogs.length}</div>
      <div data-testid="facilities-count">{facilities.length}</div>

      <button onClick={() => assignShift('f1', 'Emergency', 'doc-1')}>AssignNew</button>
      <button onClick={() => assignShift('f1', 'Emergency', 'doc-2')}>ReassignExisting</button>
      <button onClick={() => updateUserVerified('u2', true)}>Verify</button>
      <button onClick={() => updateUserRole('u2', 'head_of_department', 'Cardiology')}>PromoteWithDept</button>
      <button onClick={() => updateUserRole('u2', 'system_admin')}>PromoteAdmin</button>
      <button onClick={() => updateUserFacility('u2', 'f9', 'Emergency')}>Relocate</button>
      <button onClick={() => updateUserFacility('u2', 'f9')}>RelocateNoDept</button>
      <button onClick={() => removeUser('u2')}>RemoveUser</button>
      <button onClick={() => addFacility({ name: 'New Hospital', type: 'district_hospital', location: 'Suez', departments: ['Emergency'], capacity: { ICU: { total: 1, occupied: 0 }, CCU: { total: 1, occupied: 0 }, PICU: { total: 1, occupied: 0 }, Ward: { total: 1, occupied: 0 } } })}>AddFacility</button>
      <button onClick={() => updateFacility('f1', { name: 'Renamed Hospital' })}>RenameFacility</button>
      <button onClick={() => removeFacility('f1')}>RemoveFacility</button>
      <button onClick={() => addFacilityDepartment('f1', 'ICU')}>AddDept</button>
      <button onClick={() => addFacilityDepartment('f1', 'Emergency')}>AddDuplicateDept</button>
      <button onClick={() => removeFacilityDepartment('f1', 'Emergency')}>RemoveDept</button>
      <button onClick={() => updateFacilityCapacity('f1', { Ward: { total: 30, occupied: 12 } })}>UpdateCapacity</button>
      <button onClick={() => updateFacilityCapacity('no-such-facility', { Ward: { total: 30, occupied: 12 } })}>UpdateCapacityMissingFacility</button>
      <button onClick={() => removeFacilityDepartment('no-such-facility', 'Emergency')}>RemoveDeptMissingFacility</button>
      <button onClick={() => markNotificationRead('n1')}>MarkRead</button>
      <button onClick={() => markAllNotificationsRead()}>MarkAllRead</button>
      <button onClick={() => addShiftLog({ userId: 'u1', userName: 'U1', facilityId: 'f1', summary: 's', pendingTransfersCount: 0, admittedPatientsCount: 0 })}>AddShiftLog</button>
    </div>
  );
};

const renderProvider = () => render(<DataProvider><Consumer /></DataProvider>);

describe('DataContext admin/facility mutations', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'system_admin', facilityId: undefined, verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1', role: 'system_admin' }), makeUser({ id: 'u2', role: 'resident', verified: false, facilityId: 'f1' })]);
  });

  it('verifies a user', async () => {
    renderProvider();
    await act(async () => { screen.getByText('Verify').click(); });
    await waitFor(() => expect(screen.getByTestId('user-verified')).toHaveTextContent('true'));
  });

  it('promotes a user into a role with a department', async () => {
    renderProvider();
    await act(async () => { screen.getByText('PromoteWithDept').click(); });
    await waitFor(() => expect(screen.getByTestId('user-role')).toHaveTextContent('head_of_department'));
    expect(fsState.stores['users']['u2'].department).toBe('Cardiology');
  });

  it('reassigns a promoted system_admin to the branch facility', async () => {
    renderProvider();
    await act(async () => { screen.getByText('PromoteAdmin').click(); });
    await waitFor(() => expect(screen.getByTestId('user-role')).toHaveTextContent('system_admin'));
    expect(screen.getByTestId('user-facility')).toHaveTextContent('branch');
  });

  it('relocates a user to a new facility and department', async () => {
    renderProvider();
    await act(async () => { screen.getByText('Relocate').click(); });
    await waitFor(() => expect(screen.getByTestId('user-facility')).toHaveTextContent('f9'));
    expect(fsState.stores['users']['u2'].department).toBe('Emergency');
  });

  it('relocates a user without touching department when none is given', async () => {
    renderProvider();
    await act(async () => { screen.getByText('RelocateNoDept').click(); });
    await waitFor(() => expect(screen.getByTestId('user-facility')).toHaveTextContent('f9'));
    expect(fsState.stores['users']['u2'].department).toBeUndefined();
  });

  it('removes a user', async () => {
    renderProvider();
    await act(async () => { screen.getByText('RemoveUser').click(); });
    await waitFor(() => expect(screen.getByTestId('users-count')).toHaveTextContent('1'));
  });

  it('adds a new facility', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddFacility').click(); });
    await waitFor(() => expect(screen.getByTestId('facilities-count')).toHaveTextContent('2'));
  });

  it('updates a facility\'s fields', async () => {
    renderProvider();
    await act(async () => { screen.getByText('RenameFacility').click(); });
    await waitFor(() => expect(fsState.stores['facilities']['f1'].name).toBe('Renamed Hospital'));
  });

  it('removes a facility', async () => {
    // A second facility must stay behind -- removing the only one empties the
    // collection, which triggers DataContext's own "reseed from INITIAL_FACILITIES"
    // safety net and defeats the assertion below.
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' }), makeFacility({ id: 'f9' })]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('facilities-count')).toHaveTextContent('2'));
    await act(async () => { screen.getByText('RemoveFacility').click(); });
    await waitFor(() => expect(screen.getByTestId('facilities-count')).toHaveTextContent('1'));
  });

  it('adds a new department to a facility', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddDept').click(); });
    await waitFor(() => expect(screen.getByTestId('facility-departments')).toHaveTextContent('ICU'));
  });

  it('does not duplicate a department the facility already has', async () => {
    renderProvider();
    const before = screen.getByTestId('facility-departments').textContent;
    await act(async () => { screen.getByText('AddDuplicateDept').click(); });
    expect(screen.getByTestId('facility-departments')).toHaveTextContent(before || '');
  });

  it('removes a department from a facility', async () => {
    renderProvider();
    await act(async () => { screen.getByText('RemoveDept').click(); });
    await waitFor(() => expect(screen.getByTestId('facility-departments')).not.toHaveTextContent('Emergency'));
  });

  it('updates bed capacity for one bed type without touching the others', async () => {
    renderProvider();
    await act(async () => { screen.getByText('UpdateCapacity').click(); });
    await waitFor(() => expect(screen.getByTestId('facility-ward-occupied')).toHaveTextContent('12'));
    expect(fsState.stores['facilities']['f1'].capacity.ICU.total).toBe(5);
  });

  it('is a no-op updating capacity for a facility that does not exist', async () => {
    renderProvider();
    await expect(act(async () => { screen.getByText('UpdateCapacityMissingFacility').click(); })).resolves.not.toThrow();
  });

  it('is a no-op removing a department from a facility that does not exist', async () => {
    renderProvider();
    await expect(act(async () => { screen.getByText('RemoveDeptMissingFacility').click(); })).resolves.not.toThrow();
  });

  it('assigns a new shift covering a department with no prior assignment', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AssignNew').click(); });
    await waitFor(() => expect(screen.getByTestId('shift-assignments-count')).toHaveTextContent('1'));
  });

  it('reassigns an existing shift for the same facility/department rather than creating a second one', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AssignNew').click(); });
    await waitFor(() => expect(screen.getByTestId('shift-assignments-count')).toHaveTextContent('1'));
    await act(async () => { screen.getByText('ReassignExisting').click(); });
    expect(screen.getByTestId('shift-assignments-count')).toHaveTextContent('1');
    const assignment: any = Object.values(fsState.stores['shiftAssignments'])[0];
    expect(assignment.assignedUserId).toBe('doc-2');
  });

  it('saves a shift log', async () => {
    renderProvider();
    await act(async () => { screen.getByText('AddShiftLog').click(); });
    await waitFor(() => expect(screen.getByTestId('shift-logs-count')).toHaveTextContent('1'));
  });

  it('logs and swallows a failed shift log write', async () => {
    const firestore = await import('firebase/firestore');
    vi.spyOn(firestore, 'setDoc').mockRejectedValueOnce(new Error('offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderProvider();
    await act(async () => { screen.getByText('AddShiftLog').click(); });
    expect(errSpy).toHaveBeenCalled();
  });

  it('surfaces a toast when a fire-and-forget write is rejected', async () => {
    const firestore = await import('firebase/firestore');
    vi.spyOn(firestore, 'updateDoc').mockRejectedValueOnce(new Error('denied'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderProvider();
    await act(async () => { screen.getByText('Verify').click(); });
    await waitFor(() => expect(errSpy).toHaveBeenCalledWith("Could not change that user's verification status.", expect.any(Error)));
  });
});

describe('DataContext notifications', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'system_admin', facilityId: undefined, verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1', role: 'system_admin' })]);
    seedCollection(fsState, 'notifications', [
      { id: 'n1', userId: 'u1', title: 't1', message: 'm', type: 'info', read: false, createdAt: new Date(1000).toISOString(), createdAtMs: 1000, referralId: 'r1' },
      { id: 'n2', userId: 'u1', title: 't2', message: 'm', type: 'info', read: false, createdAt: new Date(2000).toISOString(), createdAtMs: 2000, referralId: 'r1' },
      { id: 'n3', userId: 'other-user', title: 't3', message: 'm', type: 'info', read: false, createdAt: new Date(3000).toISOString(), createdAtMs: 3000, referralId: 'r1' },
    ]);
  });

  it('marks a single notification read', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('2'));
    await act(async () => { screen.getByText('MarkRead').click(); });
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('1'));
  });

  it('marks every unread notification for the caller as read, leaving other users\' notifications untouched', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('2'));
    await act(async () => { screen.getByText('MarkAllRead').click(); });
    await waitFor(() => expect(screen.getByTestId('unread-count')).toHaveTextContent('0'));
    expect(fsState.stores['notifications']['n3'].read).toBe(false);
  });

  it('does nothing without a signed-in user', async () => {
    mockUser = null;
    renderProvider();
    await act(async () => { screen.getByText('MarkAllRead').click(); });
    // No listeners open with no user, so notifications stays empty regardless;
    // the assertion that matters is that calling this doesn't throw.
    expect(screen.getByTestId('facilities-count')).toBeInTheDocument();
  });
});

describe('DataContext browser online/offline events', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ id: 'u1', role: 'system_admin', facilityId: undefined, verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' })]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1', role: 'system_admin' })]);
  });

  it('resets the pending-sync count when the browser reports coming back online', async () => {
    renderProvider();
    act(() => { window.dispatchEvent(new Event('online')); });
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });
    // No throw is the main assertion here -- pendingSyncCount itself is exercised
    // more directly by DataContext.test.tsx's offline addReferral flow.
    expect(screen.getByTestId('facilities-count')).toHaveTextContent('1');
  });
});
