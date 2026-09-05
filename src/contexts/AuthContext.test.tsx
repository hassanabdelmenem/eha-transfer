import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

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

  it('self-heals the bootstrap admin document into a verified owner', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => {
      authStateCallback!({ uid: 'admin-uid', email: 'hassan.abdelmenem@gmail.com', emailVerified: true });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => {
      snapshotSuccessCallback!({
        exists: () => true,
        id: 'admin-uid',
        data: () => ({ name: 'Hassan', role: 'resident', verified: false, profileCompleted: false }),
      });
    });

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/admin-uid' }),
      { role: 'owner', verified: true, profileCompleted: true },
      { merge: true }
    );
    expect(screen.getByTestId('role')).toHaveTextContent('owner');
    expect(screen.getByTestId('verified')).toHaveTextContent('true');
  });

  it('does not re-heal a bootstrap admin document already correct', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => {
      authStateCallback!({ uid: 'admin-uid', email: 'hassan.abdelmenem@gmail.com', emailVerified: true });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => {
      snapshotSuccessCallback!({
        exists: () => true,
        id: 'admin-uid',
        data: () => ({ name: 'Hassan', role: 'owner', verified: true, profileCompleted: true }),
      });
    });

    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('does not treat the bootstrap admin email as privileged before its email is verified', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => {
      authStateCallback!({ uid: 'admin-uid', email: 'hassan.abdelmenem@gmail.com', emailVerified: false });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => {
      snapshotSuccessCallback!({
        exists: () => true,
        id: 'admin-uid',
        data: () => ({ name: 'Hassan', role: 'resident', verified: false, profileCompleted: false }),
      });
    });

    expect(setDocMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('role')).toHaveTextContent('resident');
  });

  it('logs and swallows a self-heal write failure rather than blocking authReady', async () => {
    setDocMock.mockRejectedValueOnce(new Error('write denied'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => {
      authStateCallback!({ uid: 'admin-uid', email: 'hassan.abdelmenem@gmail.com', emailVerified: true });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());

    await act(async () => {
      snapshotSuccessCallback!({
        exists: () => true,
        id: 'admin-uid',
        data: () => ({ name: 'Hassan', role: 'resident', verified: false, profileCompleted: false }),
      });
    });

    expect(errSpy).toHaveBeenCalledWith('Failed to self-heal admin account:', expect.any(Error));
    expect(screen.getByTestId('authReady')).toHaveTextContent('true');
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

  it('creates the bootstrap admin as an already-verified owner on first sign-in', async () => {
    renderAuth();
    await waitFor(() => expect(authStateCallback).not.toBeNull());
    await act(async () => {
      authStateCallback!({ uid: 'admin-uid', email: 'hassan.abdelmenem@gmail.com', emailVerified: true, displayName: 'Hassan' });
    });
    await waitFor(() => expect(snapshotSuccessCallback).not.toBeNull());
    await act(async () => { snapshotSuccessCallback!({ exists: () => false }); });

    expect(screen.getByTestId('role')).toHaveTextContent('owner');
    expect(screen.getByTestId('verified')).toHaveTextContent('true');
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
