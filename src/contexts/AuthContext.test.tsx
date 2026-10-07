import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth, resolveEmailVerified } from './AuthContext';

// --- Mock firebase/auth. onAuthStateChanged's callback is captured so tests
// can drive it manually, simulating a firebaseUser signing in or out. ---
let authStateCallback: ((firebaseUser: any) => void) | null = null;
let getRedirectResultImpl: () => Promise<any> = () => Promise.resolve(null);

const signOutMock = vi.fn().mockResolvedValue(undefined);
const signInWithPopupMock = vi.fn().mockResolvedValue({});
const signInWithRedirectMock = vi.fn().mockResolvedValue(undefined);
const signInWithEmailAndPasswordMock = vi.fn().mockResolvedValue({});
const createUserWithEmailAndPasswordMock = vi.fn();
const sendEmailVerificationMock = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: any, cb: any) => { authStateCallback = cb; return vi.fn(); }),
  getRedirectResult: vi.fn(() => getRedirectResultImpl()),
  signOut: (...args: any[]) => signOutMock(...args),
  signInWithPopup: (...args: any[]) => signInWithPopupMock(...args),
  signInWithRedirect: (...args: any[]) => signInWithRedirectMock(...args),
  signInWithEmailAndPassword: (...args: any[]) => signInWithEmailAndPasswordMock(...args),
  createUserWithEmailAndPassword: (...args: any[]) => createUserWithEmailAndPasswordMock(...args),
  sendEmailVerification: (...args: any[]) => sendEmailVerificationMock(...args),
}));

// --- Mock firebase/firestore. onSnapshot's success/error callbacks are
// captured the same way, keyed to whichever doc ref onAuthStateChanged opened
// most recently (AuthContext only ever has one user-doc listener open at a
// time, so a single pair of captured callbacks is enough). ---
let snapshotSuccessCallback: ((snap: any) => void) | null = null;
let snapshotErrorCallback: ((err: any) => void) | null = null;
const setDocMock = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...parts: string[]) => ({ path: parts.join('/') }),
  getDoc: vi.fn(),
  setDoc: (...args: any[]) => setDocMock(...args),
  onSnapshot: vi.fn((_ref: any, successCb: any, errorCb: any) => {
    snapshotSuccessCallback = successCb;
    snapshotErrorCallback = errorCb;
    return vi.fn();
  }),
}));

const mockAuth = vi.hoisted(() => ({ currentUser: null as any }));
vi.mock('../lib/firebase', () => ({ auth: mockAuth, googleProvider: {}, db: {} }));

const clearOfflineReferralsMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../lib/db', () => ({ clearOfflineReferrals: (...args: any[]) => clearOfflineReferralsMock(...args) }));

let capturedError: string | null = null;
let capturedResult: any = null;

const AuthConsumer = () => {
  const {
    user, authReady, emailVerified, redirectError, login, logout, hasRole,
    loginWithGoogle, loginWithEmail, registerWithEmail, resendVerificationEmail, updateUserProfile,
  } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
      <div data-testid="role">{user ? user.role : 'none'}</div>
      <div data-testid="verified">{user ? String(user.verified) : 'n/a'}</div>
      <div data-testid="authReady">{String(authReady)}</div>
      <div data-testid="emailVerified">{String(emailVerified)}</div>
      <div data-testid="redirectError">{redirectError || 'none'}</div>
      <div data-testid="role-admin">{hasRole(['system_admin']) ? 'Is Admin' : 'Not Admin'}</div>

      <button onClick={() => login?.('u1')}>Login U1</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={async () => {
        capturedError = null;
        try { await loginWithGoogle(); } catch (e: any) { capturedError = e.message || e.code; }
      }}>LoginGoogle</button>
      <button onClick={async () => {
        capturedError = null;
        try { await loginWithEmail('a@x.com', 'pw'); } catch (e: any) { capturedError = e.message; }
      }}>LoginEmail</button>
      <button onClick={async () => {
        capturedError = null;
        try { await registerWithEmail('a@x.com', 'pw'); } catch (e: any) { capturedError = e.message; }
      }}>Register</button>
      <button onClick={async () => { await resendVerificationEmail(); }}>ResendVerification</button>
      <button onClick={async () => { await updateUserProfile({ name: 'Updated Name' }); }}>UpdateProfile</button>
    </div>
  );
};

const renderAuth = () => render(<AuthProvider><AuthConsumer /></AuthProvider>);

describe('AuthContext dev mock login', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authStateCallback = null;
    snapshotSuccessCallback = null;
    snapshotErrorCallback = null;
    getRedirectResultImpl = () => Promise.resolve(null);
    mockAuth.currentUser = null;
  });

  it('provides null user initially and waits for Firebase before becoming ready', () => {
    renderAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('role-admin')).toHaveTextContent('Not Admin');
  });

  it('logs in user and saves to localStorage', async () => {
    renderAuth();
    await userEvent.click(screen.getByText('Login U1'));

    expect(screen.getByTestId('user')).not.toHaveTextContent('No User');
    const savedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    expect(savedUser.id).toBe('u1');
  });

  it('logs out user and clears localStorage, IndexedDB, and Firebase Auth', async () => {
    renderAuth();
    await userEvent.click(screen.getByText('Login U1'));
    await userEvent.click(screen.getByText('Logout'));

    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(signOutMock).toHaveBeenCalled();
    expect(clearOfflineReferralsMock).toHaveBeenCalled();
  });

  it('removes an unsent referral draft so the next account on a shared PC never sees it (audit run-1, lead 8)', async () => {
    localStorage.setItem('newReferralDraft', JSON.stringify({ patientData: { name: 'Previous Patient' } }));
    renderAuth();
    await userEvent.click(screen.getByText('Login U1'));
    await userEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect(localStorage.getItem('newReferralDraft')).toBeNull());
  });

  it('picks the mock user back up from localStorage on the next mount, bypassing the Firebase listener', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u2', name: 'u2', email: 'u2@example.com', role: 'resident' }));
    renderAuth();

    expect(screen.getByTestId('user')).toHaveTextContent('u2');
    expect(screen.getByTestId('authReady')).toHaveTextContent('true');
    const { onAuthStateChanged } = await import('firebase/auth');
    expect(onAuthStateChanged).not.toHaveBeenCalled();
  });

  it('falls through to the real Firebase listener when the stored mock user is corrupt JSON', async () => {
    localStorage.setItem('auth_user', '{not json');
    renderAuth();

    const { onAuthStateChanged } = await import('firebase/auth');
    expect(onAuthStateChanged).toHaveBeenCalled();
  });
});

describe('AuthContext onAuthStateChanged', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authStateCallback = null;
    snapshotSuccessCallback = null;
    snapshotErrorCallback = null;
    getRedirectResultImpl = () => Promise.resolve(null);
    mockAuth.currentUser = null;
  });

  it('marks authReady with a null user when signed out', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());

    await act(async () => { authStateCallback!(null); });

    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('authReady')).toHaveTextContent('true');
  });

  it('surfaces a redirect sign-in failure without blocking the rest of auth', async () => {
    getRedirectResultImpl = () => Promise.reject(new Error('redirect boom'));
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('redirectError')).toHaveTextContent('redirect boom'));
  });

  it('falls back to a generic message when a redirect failure carries none', async () => {
    getRedirectResultImpl = () => Promise.reject({});
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('redirectError')).toHaveTextContent('Redirect sign-in failed'));
  });

  it('loads an existing user document and normalizes its role/verified/profileCompleted fields', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());

    await act(async () => {
      authStateCallback!({ uid: 'uid-1', email: 'staff@x.com', emailVerified: true, displayName: 'Staff' });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => {
      snapshotSuccessCallback!({
        exists: () => true,
        id: 'uid-1',
        data: () => ({ name: 'Staff Member', email: 'staff@x.com', role: 'resident', verified: true, profileCompleted: true }),
      });
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Staff Member');
    expect(screen.getByTestId('role')).toHaveTextContent('resident');
    expect(screen.getByTestId('verified')).toHaveTextContent('true');
    expect(screen.getByTestId('emailVerified')).toHaveTextContent('true');
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('treats a non-boolean verified field as unverified rather than truthy', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => { authStateCallback!({ uid: 'uid-2', email: 'staff2@x.com', emailVerified: true }); });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => {
      snapshotSuccessCallback!({
        exists: () => true,
        id: 'uid-2',
        // A stray string "false" must not read as truthy.
        data: () => ({ name: 'Staff Two', role: 'resident', verified: 'false' as any, profileCompleted: true }),
      });
    });

    expect(screen.getByTestId('verified')).toHaveTextContent('false');
  });

  it('defaults role to resident and name to Unknown when the document omits them', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => { authStateCallback!({ uid: 'uid-3', email: 'bare@x.com', emailVerified: true }); });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => { snapshotSuccessCallback!({ exists: () => true, id: 'uid-3', data: () => ({}) }); });

    expect(screen.getByTestId('user')).toHaveTextContent('Unknown');
    expect(screen.getByTestId('role')).toHaveTextContent('resident');
  });

  it('creates a resident-role document for a brand new non-admin user', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => {
      authStateCallback!({ uid: 'new-uid', email: 'new@x.com', emailVerified: true, displayName: 'New Person' });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => { snapshotSuccessCallback!({ exists: () => false }); });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/new-uid' }),
      expect.objectContaining({ id: 'new-uid', name: 'New Person', role: 'resident', verified: false, profileCompleted: false })
    );
    expect(screen.getByTestId('user')).toHaveTextContent('New Person');
    expect(screen.getByTestId('authReady')).toHaveTextContent('true');
  });

  it('falls back to "Unknown" and an empty email when the firebaseUser record carries neither', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => { authStateCallback!({ uid: 'anon-uid', email: null, emailVerified: true, displayName: null }); });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());
    await act(async () => { snapshotSuccessCallback!({ exists: () => false }); });

    expect(screen.getByTestId('user')).toHaveTextContent('Unknown');
    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/anon-uid' }),
      expect.objectContaining({ name: 'Unknown', email: '' })
    );
  });

  it('falls back to the email local-part for the display name when Google supplies none', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => { authStateCallback!({ uid: 'new-uid2', email: 'noname@x.com', emailVerified: true, displayName: null }); });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());
    await act(async () => { snapshotSuccessCallback!({ exists: () => false }); });

    expect(screen.getByTestId('user')).toHaveTextContent('noname');
  });

  it('still marks authReady after a failed write for a brand new user document', async () => {
    setDocMock.mockRejectedValueOnce(new Error('quota exceeded'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => { authStateCallback!({ uid: 'new-uid3', email: 'fails@x.com', emailVerified: true }); });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => { snapshotSuccessCallback!({ exists: () => false }); });

    expect(errSpy).toHaveBeenCalledWith('Failed to create user profile document:', expect.any(Error));
    expect(screen.getByTestId('authReady')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  it('unblocks routing when the user-document subscription itself fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => { authStateCallback!({ uid: 'uid-err', email: 'err@x.com', emailVerified: true }); });
    await waitFor(() => expect(snapshotErrorCallback).not.toBeNull());

    await act(async () => { snapshotErrorCallback!(new Error('permission-denied')); });

    expect(errSpy).toHaveBeenCalledWith('User profile subscription failed:', expect.any(Error));
    expect(screen.getByTestId('authReady')).toHaveTextContent('true');
  });

  it('tears down the previous user-doc listener before opening a new one on re-auth', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    const { onSnapshot } = await import('firebase/firestore');

    await act(async () => { authStateCallback!({ uid: 'uid-a', email: 'a@x.com', emailVerified: true }); });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());
    const firstUnsubscribe = (onSnapshot as any).mock.results[0].value;

    await act(async () => { authStateCallback!({ uid: 'uid-b', email: 'b@x.com', emailVerified: true }); });

    expect(firstUnsubscribe).toHaveBeenCalled();
  });
});

describe('AuthContext sign-in methods', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    signOutMock.mockResolvedValue(undefined);
    signInWithPopupMock.mockResolvedValue({});
    signInWithRedirectMock.mockResolvedValue(undefined);
    signInWithEmailAndPasswordMock.mockResolvedValue({});
    sendEmailVerificationMock.mockResolvedValue(undefined);
    capturedError = null;
    capturedResult = null;
    mockAuth.currentUser = null;
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (Macintosh) Desktop' });
  });

  it('signs in with a popup on desktop', async () => {
    renderAuth();
    await userEvent.click(screen.getByText('LoginGoogle'));
    expect(signInWithPopupMock).toHaveBeenCalled();
    expect(signInWithRedirectMock).not.toHaveBeenCalled();
  });

  it('signs in with a redirect on a mobile user agent', async () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS)' });
    renderAuth();
    await userEvent.click(screen.getByText('LoginGoogle'));
    expect(signInWithRedirectMock).toHaveBeenCalled();
    expect(signInWithPopupMock).not.toHaveBeenCalled();
  });

  it('falls back to a redirect when the popup is closed by the user', async () => {
    signInWithPopupMock.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    renderAuth();
    await userEvent.click(screen.getByText('LoginGoogle'));
    expect(signInWithRedirectMock).toHaveBeenCalled();
    expect(capturedError).toBeNull();
  });

  it('rethrows a popup error that is not a closed-popup case', async () => {
    signInWithPopupMock.mockRejectedValueOnce({ code: 'auth/network-request-failed', message: 'network down' });
    renderAuth();
    await userEvent.click(screen.getByText('LoginGoogle'));
    expect(capturedError).toBe('network down');
    expect(signInWithRedirectMock).not.toHaveBeenCalled();
  });

  it('signs in with email and password', async () => {
    renderAuth();
    await userEvent.click(screen.getByText('LoginEmail'));
    expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(expect.anything(), 'a@x.com', 'pw');
  });

  it('registers with email and sends a verification email', async () => {
    createUserWithEmailAndPasswordMock.mockResolvedValueOnce({ user: { uid: 'new' } });
    renderAuth();
    await userEvent.click(screen.getByText('Register'));
    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(expect.anything(), 'a@x.com', 'pw');
    expect(sendEmailVerificationMock).toHaveBeenCalledWith({ uid: 'new' });
  });

  it('logs and swallows a failed verification email during registration', async () => {
    createUserWithEmailAndPasswordMock.mockResolvedValueOnce({ user: { uid: 'new2' } });
    sendEmailVerificationMock.mockRejectedValueOnce(new Error('send failed'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAuth();
    await userEvent.click(screen.getByText('Register'));
    expect(errSpy).toHaveBeenCalledWith('Failed to send verification email:', expect.any(Error));
  });

  it('resends a verification email for an unverified current user', async () => {
    mockAuth.currentUser = { emailVerified: false };
    renderAuth();
    await userEvent.click(screen.getByText('ResendVerification'));
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(mockAuth.currentUser);
  });

  it('does not resend a verification email once already verified', async () => {
    mockAuth.currentUser = { emailVerified: true };
    renderAuth();
    await userEvent.click(screen.getByText('ResendVerification'));
    expect(sendEmailVerificationMock).not.toHaveBeenCalled();
  });

  it('does not resend a verification email with no current user', async () => {
    mockAuth.currentUser = null;
    renderAuth();
    await userEvent.click(screen.getByText('ResendVerification'));
    expect(sendEmailVerificationMock).not.toHaveBeenCalled();
  });
});

describe('AuthContext.updateUserProfile', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does nothing with no signed-in user', async () => {
    renderAuth();
    await userEvent.click(screen.getByText('UpdateProfile'));
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('merges profile data and marks profileCompleted for the signed-in user', async () => {
    renderAuth();
    await userEvent.click(screen.getByText('Login U1'));
    await userEvent.click(screen.getByText('UpdateProfile'));

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1' }),
      { name: 'Updated Name', profileCompleted: true },
      { merge: true }
    );
  });
});

describe('AuthContext idle timeout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('logs out automatically after 15 minutes of inactivity', async () => {
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });
    expect(screen.getByTestId('user')).not.toHaveTextContent('No User');

    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });

    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    vi.useRealTimers();
  });

  it('resets the idle timer on activity, so it does not log out early', async () => {
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });

    await act(async () => { await vi.advanceTimersByTimeAsync(14 * 60 * 1000); });
    act(() => { document.dispatchEvent(new Event('keydown')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60 * 1000); });

    // 16 minutes have passed in total, but activity at the 14-minute mark reset
    // the clock -- only 2 minutes have elapsed since, so the session is still up.
    expect(screen.getByTestId('user')).not.toHaveTextContent('No User');
    vi.useRealTimers();
  });

  // The Firebase session survives a browser restart (browserLocalPersistence),
  // so the in-memory timer alone let the next person at a shared workstation
  // open the browser as the previous clinician.
  it('signs out a session restored after the browser sat closed past the limit', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1', name: 'u1', role: 'resident' }));
    localStorage.setItem('eha_last_activity', String(Date.now() - 16 * 60 * 1000));
    renderAuth();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    vi.useRealTimers();
  });

  it('keeps a restored session whose last activity is recent', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1', name: 'u1', role: 'resident' }));
    localStorage.setItem('eha_last_activity', String(Date.now() - 5 * 60 * 1000));
    renderAuth();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId('user')).toHaveTextContent('u1');
    vi.useRealTimers();
  });

  it('a stale timestamp from an earlier session does not sign out a fresh login', async () => {
    localStorage.setItem('eha_last_activity', String(Date.now() - 24 * 60 * 60 * 1000));
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60 * 1000); });
    expect(screen.getByTestId('user')).toHaveTextContent('u1');
    vi.useRealTimers();
  });

  it('activity in another tab keeps this tab signed in', async () => {
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(14 * 60 * 1000); });
    // The other tab records its activity in shared storage; this tab sees no events.
    localStorage.setItem('eha_last_activity', String(Date.now()));
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60 * 1000); });
    expect(screen.getByTestId('user')).toHaveTextContent('u1');
    vi.useRealTimers();
  });

  it('signs out on wake when the machine slept past the limit (timers paused)', async () => {
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });
    // Wall clock jumps 20 minutes while no timer ran.
    vi.setSystemTime(Date.now() + 20 * 60 * 1000);
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    vi.useRealTimers();
  });

  it('forgets the activity timestamp on sign-out', async () => {
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });
    expect(localStorage.getItem('eha_last_activity')).not.toBeNull();
    await act(async () => { fireEvent.click(screen.getByText('Logout')); });
    expect(localStorage.getItem('eha_last_activity')).toBeNull();
    vi.useRealTimers();
  });
});

describe('useAuth outside a provider', () => {
  it('throws a clear error', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bare = () => { useAuth(); return null; };
    expect(() => render(<Bare />)).toThrow('useAuth must be used within an AuthProvider');
    errSpy.mockRestore();
  });
});

describe('AuthContext in production mode (isDevAuthAllowed false)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'false');
  });

  it('clears a leftover dev auth_user key from localStorage rather than honoring it', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: 'leftover', name: 'leftover' }));
    renderAuth();

    await waitFor(() => expect(localStorage.getItem('auth_user')).toBeNull());
    const { onAuthStateChanged } = await import('firebase/auth');
    expect(onAuthStateChanged).toHaveBeenCalled();
  });

  it('disables the mock login button', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderAuth();
    act(() => { fireEvent.click(screen.getByText('Login U1')); });

    expect(warnSpy).toHaveBeenCalledWith('Mock login is disabled in production.');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });
});

describe('resolveEmailVerified (follows the ID token claim the rules check)', () => {
  const fakeUser = (emailVerified: boolean, claims: Array<Record<string, unknown>>) => {
    const getIdTokenResult = vi.fn();
    claims.forEach((c) => getIdTokenResult.mockResolvedValueOnce({ claims: c }));
    return { emailVerified, getIdTokenResult } as unknown as import('firebase/auth').User;
  };

  it('is true when the cached token already says verified', async () => {
    const u = fakeUser(true, [{ email_verified: true }]);
    expect(await resolveEmailVerified(u)).toBe(true);
    expect(u.getIdTokenResult).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh token when the Auth flag is ahead of the cached claim', async () => {
    // The user clicked the link, then reloaded the page: flag true, token stale.
    const u = fakeUser(true, [{ email_verified: false }, { email_verified: true }]);
    expect(await resolveEmailVerified(u)).toBe(true);
    expect(u.getIdTokenResult).toHaveBeenLastCalledWith(true);
  });

  it('is false while the refreshed token still says unverified', async () => {
    const u = fakeUser(true, [{ email_verified: false }, { email_verified: false }]);
    expect(await resolveEmailVerified(u)).toBe(false);
  });

  it('is false for an unverified account without refreshing', async () => {
    const u = fakeUser(false, [{ email_verified: false }]);
    expect(await resolveEmailVerified(u)).toBe(false);
    expect(u.getIdTokenResult).toHaveBeenCalledTimes(1);
  });
});
