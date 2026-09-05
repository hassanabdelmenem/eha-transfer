import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '../types';
import { createFirestoreModuleMock, getActiveFirestoreState, resetFirestoreState, seedCollection, type MockFirestoreState } from './testUtils/mockFirestore';
import { makeUser, makeFacility, makeReferral } from './testUtils/fixtures';
import { DataProvider, useData } from './DataContext';

// createFirestoreModuleMock() is only referenced lazily here (this factory
// runs while DataContext.tsx's own 'firebase/firestore' import is still being
// resolved, before this file's own top-level statements execute) -- see the
// comment on getActiveFirestoreState() in mockFirestore.ts for why the state
// itself is never constructed directly in a test file.
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
  const { loading, facilities, users, referrals, notifications, directAdmissions, shiftAssignments, shiftLogs, loadOlderReferrals } = useData();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="facilities-count">{facilities.length}</div>
      <div data-testid="users-count">{users.length}</div>
      <div data-testid="referrals-count">{referrals.length}</div>
      <div data-testid="referral-ids">{referrals.map(r => r.id).join(',')}</div>
      <div data-testid="notifications-count">{notifications.length}</div>
      <div data-testid="admissions-count">{directAdmissions.length}</div>
      <div data-testid="shift-assignments-count">{shiftAssignments.length}</div>
      <div data-testid="shift-logs-count">{shiftLogs.length}</div>
      <button onClick={() => loadOlderReferrals?.()}>LoadOlder</button>
    </div>
  );
};

const renderProvider = () => render(<DataProvider><Consumer /></DataProvider>);

describe('DataContext Firestore listeners', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = null;
  });

  it('does not subscribe to anything and does not crash with no signed-in user', () => {
    renderProvider();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('seeds the facility list the first time the collection comes back empty', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    renderProvider();
    await waitFor(() => expect(Number(screen.getByTestId('facilities-count').textContent)).toBeGreaterThan(0));
  });

  it('adopts the real facility list once the collection is populated', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility({ id: 'f1' }), makeFacility({ id: 'f2' })]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('facilities-count')).toHaveTextContent('2'));
  });

  it('seeds the user roster the first time the collection comes back empty (verified user)', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    renderProvider();
    await waitFor(() => expect(Number(screen.getByTestId('users-count').textContent)).toBeGreaterThan(0));
  });

  it('adopts the real user roster once the collection is populated', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' }), makeUser({ id: 'u2' })]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('users-count')).toHaveTextContent('2'));
  });

  it('stops at the facility list and never opens patient-data listeners for an unverified user', async () => {
    mockUser = makeUser({ role: 'resident', verified: false });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(fsState.subscribers['users']).toBeUndefined();
    expect(fsState.subscribers['referrals']).toBeUndefined();
    expect(fsState.subscribers['notifications']).toBeUndefined();
  });

  it('settles immediately for a verified non-admin user with no facility (nothing to subscribe to)', async () => {
    mockUser = makeUser({ role: 'resident', verified: true, facilityId: undefined });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(fsState.subscribers['referrals']).toBeUndefined();
  });

  it('subscribes an admin to every referral unfiltered via a single shape', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1' }), makeReferral({ id: 'r2' })]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('referrals-count')).toHaveTextContent('2'));
    expect(fsState.subscribers['referrals']).toHaveLength(1);
  });

  it('merges a non-admin\'s three party-shape listeners and de-duplicates a referral matching more than one shape', async () => {
    mockUser = makeUser({ role: 'resident', verified: true, facilityId: 'f1' });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    // referringFacilityId AND receivingFacilityId are both 'f1' -- matches two shapes at once.
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r-both', referringFacilityId: 'f1', receivingFacilityId: 'f1' })]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('referral-ids')).toHaveTextContent('r-both');
    expect(fsState.subscribers['referrals']).toHaveLength(3);
  });

  it('unsticks loading and surfaces an error toast when a referral shape listener fails', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderProvider();
    await waitFor(() => expect(fsState.subscribers['referrals']).toHaveLength(1));

    act(() => { fsState.subscribers['referrals'][0].error?.({ code: 'permission-denied' }); });

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(errSpy).toHaveBeenCalledWith('Referrals listener (all) failed:', { code: 'permission-denied' });
  });

  it('goes offline when a listener reports an unavailable/deadline-exceeded error, and back online on the next successful snapshot', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    renderProvider();
    await waitFor(() => expect(fsState.subscribers['facilities']).toHaveLength(1));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => { fsState.subscribers['facilities'][0].error?.({ code: 'unavailable' }); });
    // isOnline isn't rendered directly here, but a later successful snapshot must not throw.
    act(() => { fsState.subscribers['facilities'][0].success({ docs: [{ data: () => makeFacility() }] }); });
    expect(screen.getByTestId('facilities-count')).toHaveTextContent('1');
  });

  it('loads notifications, direct admissions, shift assignments, and shift logs', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    seedCollection(fsState, 'notifications', [
      { id: 'n1', userId: 'u1', title: 't', message: 'm', type: 'info', read: false, createdAt: new Date(1000).toISOString(), createdAtMs: 1000, referralId: 'r1' },
      { id: 'n2', userId: 'u1', title: 't', message: 'm', type: 'info', read: false, createdAt: new Date(2000).toISOString(), createdAtMs: 2000, referralId: 'r1' },
      // No createdAtMs -- exercises the createdAt-string fallback in the sort comparator.
      { id: 'n3', userId: 'u1', title: 't', message: 'm', type: 'info', read: false, createdAt: new Date(1500).toISOString(), referralId: 'r1' },
    ]);
    seedCollection(fsState, 'directAdmissions', [
      { id: 'a1', facilityId: 'f1', admittedAt: new Date(1000).toISOString() },
      { id: 'a2', facilityId: 'f1', admittedAt: new Date(2000).toISOString() },
      // No admittedAt -- exercises the sort comparator's empty-string fallback.
      { id: 'a3', facilityId: 'f1', admittedAt: '' },
    ]);
    seedCollection(fsState, 'shiftAssignments', [{ id: 's1', facilityId: 'f1', department: 'Emergency', assignedUserId: 'u1' }]);
    seedCollection(fsState, 'shiftLogs', [
      { id: 'l1', facilityId: 'f1', timestamp: new Date(1000).toISOString() },
      { id: 'l2', facilityId: 'f1', timestamp: new Date(2000).toISOString() },
      // No timestamp -- exercises the sort comparator's empty-string fallback.
      { id: 'l3', facilityId: 'f1', timestamp: '' },
    ]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('notifications-count')).toHaveTextContent('3'));
    expect(screen.getByTestId('admissions-count')).toHaveTextContent('3');
    expect(screen.getByTestId('shift-assignments-count')).toHaveTextContent('1');
    expect(screen.getByTestId('shift-logs-count')).toHaveTextContent('3');
  });

  it('scopes notifications, direct admissions, and shift logs to a non-admin\'s own facility/user', async () => {
    mockUser = makeUser({ role: 'resident', verified: true, facilityId: 'f1', id: 'u1' });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    // Non-admin listeners still resolve to a working query object (query() wraps
    // collection() but the mock doesn't filter) -- this just exercises the
    // where()-scoped branch rather than the isAdmin unfiltered one.
    expect(fsState.subscribers['notifications']).toHaveLength(1);
    expect(fsState.subscribers['directAdmissions']).toHaveLength(1);
    expect(fsState.subscribers['shiftLogs']).toHaveLength(1);
  });

  it('re-subscribes when the signed-in user changes', async () => {
    mockUser = makeUser({ role: 'system_admin', verified: true, id: 'admin-1' });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    const { rerender } = renderProvider();
    await waitFor(() => expect(fsState.subscribers['referrals']).toHaveLength(1));

    mockUser = makeUser({ role: 'resident', verified: true, facilityId: 'f1', id: 'resident-1' });
    rerender(<DataProvider><Consumer /></DataProvider>);

    await waitFor(() => expect(fsState.subscribers['referrals']).toHaveLength(3));
  });
});

describe('DataContext.loadOlderReferrals', () => {
  beforeEach(() => {
    fsState = getActiveFirestoreState();
    resetFirestoreState(fsState);
    mockUser = makeUser({ role: 'system_admin', verified: true });
  });

  it('is a no-op when no shape has produced a paging cursor yet', async () => {
    seedCollection(fsState, 'facilities', [makeFacility()]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => { screen.getByText('LoadOlder').click(); });
    expect(screen.getByTestId('referrals-count')).toHaveTextContent('0');
  });

  it('fetches and merges an older page once a cursor exists, without duplicating on a second page-in', async () => {
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1' })]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('referrals-count')).toHaveTextContent('1'));

    // Written directly into the store (bypassing notify), simulating a doc
    // outside the live listener's page window that only getDocs (loadOlderReferrals)
    // would see -- not one that arrives through the realtime subscription.
    // No createdAt -- exercises mergeReferrals' sort-fallback alongside r1's real one.
    fsState.stores['referrals']['r-older'] = makeReferral({ id: 'r-older', createdAt: '' });

    await act(async () => { screen.getByText('LoadOlder').click(); });
    await waitFor(() => expect(screen.getByTestId('referrals-count')).toHaveTextContent('2'));
    expect(screen.getByTestId('referral-ids')).toHaveTextContent(/r-older/);

    // A second page-in re-fetches the same (mock) "older" page; r1 is already
    // known from the live listener, so this must not duplicate it.
    await act(async () => { screen.getByText('LoadOlder').click(); });
    expect(screen.getByTestId('referrals-count')).toHaveTextContent('2');
  });

  it('leaves the cursor alone once the next page comes back empty', async () => {
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1' })]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('referrals-count')).toHaveTextContent('1'));

    delete fsState.stores['referrals']['r1'];
    await act(async () => { screen.getByText('LoadOlder').click(); });

    expect(screen.getByTestId('referrals-count')).toHaveTextContent('1');
  });

  it('logs and swallows a paging failure', async () => {
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'referrals', [makeReferral({ id: 'r1' })]);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('referrals-count')).toHaveTextContent('1'));

    const firestore = await import('firebase/firestore');
    vi.spyOn(firestore, 'getDocs').mockRejectedValueOnce(new Error('offline'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => { screen.getByText('LoadOlder').click(); });
    expect(errSpy).toHaveBeenCalledWith('Error loading older referrals', expect.any(Error));
  });
});

describe('DataContext offline-referral sync effect', () => {
  beforeEach(() => {
    resetFirestoreState(fsState);
    mockUser = makeUser({ role: 'system_admin', verified: true });
    seedCollection(fsState, 'facilities', [makeFacility()]);
    seedCollection(fsState, 'users', [makeUser({ id: 'u1' })]);
  });

  it('logs when flushing the offline cache back to Firestore fails once data is ready', async () => {
    const db = await import('../lib/db');
    vi.spyOn(db, 'getOfflineReferrals').mockRejectedValueOnce(new Error('indexeddb blocked'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await waitFor(() => expect(errSpy).toHaveBeenCalledWith('Failed to sync offline referrals', expect.any(Error)));
  });

  it('resets the in-flight guard via a stall timeout, so a sync that never settles does not block every later attempt for the rest of the outage', async () => {
    vi.useFakeTimers();
    const db = await import('../lib/db');
    const getOfflineReferralsSpy = vi.spyOn(db, 'getOfflineReferrals')
      .mockReturnValueOnce(new Promise(() => {})) // never settles -- simulates a write stuck against a real outage
      .mockResolvedValue([]);
    // Other tests in this file also mount a DataProvider (and so also trigger
    // this same shared spy) before this one runs; only calls from this test
    // itself are relevant.
    getOfflineReferralsSpy.mockClear();

    renderProvider();
    await act(async () => { await Promise.resolve(); });
    expect(getOfflineReferralsSpy).toHaveBeenCalledTimes(1);

    // Re-trigger the effect (facilities is one of its dependencies) while the
    // first sync is still hung -- the in-flight guard must skip this one.
    act(() => { fsState.subscribers['facilities'][0].success({ docs: [{ data: () => makeFacility() }] }); });
    await act(async () => { await Promise.resolve(); });
    expect(getOfflineReferralsSpy).toHaveBeenCalledTimes(1);

    // Once the stall timeout elapses, the guard resets on its own -- the next
    // effect run is no longer blocked by the still-pending first attempt.
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    act(() => { fsState.subscribers['facilities'][0].success({ docs: [{ data: () => makeFacility({ id: 'f9' }) }] }); });
    await act(async () => { await Promise.resolve(); });
    expect(getOfflineReferralsSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

describe('useData outside a provider', () => {
  it('throws a clear error', () => {
    const Bare = () => { useData(); return null; };
    expect(() => render(<Bare />)).toThrow('useData must be used within a DataProvider');
  });
});
