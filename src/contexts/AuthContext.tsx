import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { DIRECTORY_COLLECTION, directoryEntryFor, sameEntry, type DirectoryEntry } from '../lib/directory';
import { markActivity, clearActivity, hasActivity, isIdleExpired } from '../lib/idleSession';
import { clearOfflineReferrals } from '../lib/db';
import { DRAFT_STORAGE_KEY } from '../components/referrals/wizard/types';

// Mobile browsers (especially iOS Safari) routinely block or break signInWithPopup —
// third-party storage restrictions and popup blockers make the popup either never
// open or lose the auth state before it completes. signInWithRedirect navigates the
// whole page to Google and back instead, which works reliably on mobile.
const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

interface AuthContextType {
  user: User | null;
  redirectError: string | null;

  // False until Firebase has reported the initial auth state. Routing must wait
  // for this: on a page refresh the SDK restores the session asynchronously, and
  // treating the intervening null as "signed out" bounced deep links to /login.
  authReady: boolean;
  // Whether the Firebase Auth account's email address has been verified (clicked
  // the link). Always true for Google sign-in; false until verified for
  // email/password registration. Firestore rules now gate isVerifiedCaller() on
  // this, so an unverified-email account cannot access patient data even if an
  // admin mistakenly sets verified: true.
  emailVerified: boolean;
  login?: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: User['role'][]) => boolean;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Whether the ID token the Firestore rules will see says the email is verified.
 * Falls back to the Auth user's flag only when the token can't be read (e.g.
 * offline with an expired token), where no Firestore request would succeed
 * anyway.
 */
export async function resolveEmailVerified(firebaseUser: FirebaseUser): Promise<boolean> {
  try {
    let claims = (await firebaseUser.getIdTokenResult()).claims;
    if (firebaseUser.emailVerified && claims.email_verified !== true) {
      claims = (await firebaseUser.getIdTokenResult(true)).claims;
    }
    return claims.email_verified === true;
  } catch {
    return firebaseUser.emailVerified === true;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [redirectError, setRedirectError] = useState<string | null>(null);
  
  // Global flag used to gate dev-only shortcuts such as mock local auth or owner
  // auto-promotion. Never true in production builds.
  const isDevAuthAllowed = import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

  useEffect(() => {
    // DEV/EMULATOR ONLY: Check for a locally-stored mock user used by tests/dev harnesses.
    // Never accept a locally-set auth_user in production — that allows full auth bypass.
    if (isDevAuthAllowed) {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setAuthReady(true);
          return; // Skip Firebase auth listener completely if we have a mock user (dev only)
        } catch (e) { /* ignore parse errors */ }
      }
    } else {
      // Ensure any leftover auth_user keys don't permit bypass in production
      try { localStorage.removeItem('auth_user'); } catch (e) {}
    }
    // Complete a pending redirect-based sign-in (mobile Google login). signInWithRedirect
    // navigates away from the page, so there's no local call site left to catch a
    // failure here — this is the only place that can surface one.
    getRedirectResult(auth).catch((err) => {
      // Non-blocking failure handling so tests and CI aren't interrupted by alerts.
      console.error('Redirect sign-in failed:', err);
      setRedirectError(err.message || 'Redirect sign-in failed');
    });

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        // The rules check the ID token's email_verified claim, not the Auth
        // user's emailVerified flag, and the two diverge after the user clicks
        // the link in their inbox: a page load refreshes the flag but keeps the
        // cached token for up to an hour. Trusting the flag would let the user
        // into the app while every listener is rejected (and dies silently), so
        // follow the claim, and force a fresh token when the flag is ahead.
        setEmailVerified(await resolveEmailVerified(firebaseUser));
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to real-time updates for the logged-in user
        unsubscribeUserDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            // Ensure the Firestore document id is included — callers expect `user.id`.
            const data = docSnap.data() as Partial<User> | undefined;
            // The spread has to come FIRST. With it last, every key present in the
            // document overwrote the normalized value below it, which made these
            // defaults dead code -- a document carrying verified: "false" (the
            // string) sailed past the typeof guard and read as truthy, routing an
            // unverified account into the authenticated shell where every listener
            // then failed on the rules.
            const finalRole = (data?.role as User['role']) || 'resident';
            const finalVerified = data?.verified === true;
            const finalProfileCompleted = data?.profileCompleted === true;

            setUser({
              ...data,
              id: docSnap.id,
              name: data?.name || 'Unknown',
              email: data?.email || '',
              role: finalRole,
              verified: finalVerified,
              profileCompleted: finalProfileCompleted
            } as User);
            setAuthReady(true);
          } else {
            // Document doesn't exist, create it
            // Always create new users as non-owners by default. Owner assignment is
            // performed via emulator seeding or server-side admin tooling, not the
            // client. This prevents accidental client-side privilege escalation.
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
              email: firebaseUser.email || '',
              role: 'resident',
              verified: false,
              profileCompleted: false
            };
            try {
              await setDoc(userRef, newUser);
              setUser(newUser);
            } catch (err) {
              // This await was previously unguarded: a rejected write (rules,
              // network, quota) threw inside this async onSnapshot callback,
              // and setAuthReady(true) below never ran -- first-time sign-in
              // hung on the loading screen forever with no error surfaced.
              console.error('Failed to create user profile document:', err);
            } finally {
              setAuthReady(true);
            }
          }
        }, (err) => {
          // A denied/failed profile read must still unblock routing, or the app
          // hangs on the loading screen forever.
          console.error('User profile subscription failed:', err);
          setAuthReady(true);
        });
      } else {
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    markActivity(); // a fresh sign-in must not inherit a stale timestamp
    try {
      if (isMobileDevice()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // Fallback for strict mobile browsers that block popups even on desktop
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    }
  };
  
  const loginWithEmail = async (e: string, p: string) => {
    markActivity(); // a fresh sign-in must not inherit a stale timestamp
    await signInWithEmailAndPassword(auth, e, p);
  };

  const registerWithEmail = async (e: string, p: string) => {
    markActivity(); // a fresh sign-in must not inherit a stale timestamp
    const { user: newUser } = await createUserWithEmailAndPassword(auth, e, p);
    // Send a verification link immediately. The Firestore rules now require
    // email_verified before isVerifiedCaller() passes, so until the user clicks
    // this link they cannot access any patient data — even if an admin
    // prematurely sets verified: true on their Firestore document.
    try {
      await sendEmailVerification(newUser);
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }
  };

  const resendVerificationEmail = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser);
    }
  }, []);

  const login = (id: string) => {
    // DEV/EMULATOR ONLY: create a local mock user. Disabled in production.
    if (!isDevAuthAllowed) {
      console.warn('Mock login is disabled in production.');
      return;
    }
    const mockUser: User = {
      id,
      name: id,
      email: `${id}@example.com`,
      role: 'resident'
    } as User;
    markActivity();
    setUser(mockUser);
    try {
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
    } catch (e) {}
  };
  
  const logout = useCallback(async () => {
    clearActivity();
    await firebaseSignOut(auth);
    setUser(null);
    try {
      localStorage.removeItem('auth_user');
      // An unsent referral draft holds a patient's details; on a shared
      // workstation it must not greet the next account (audit run-1, lead 8).
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    // Patient records queued for offline sync are cached in IndexedDB
    // (src/lib/db.ts) so a flaky connection doesn't lose a referral. On a
    // shared workstation that cache must not outlive the session it was
    // written in -- clear it on every logout, synced or not, rather than
    // only after a successful sync in offlineSync.ts.
    try {
      await clearOfflineReferrals();
    } catch (e) {}
    // A full page load, not just a route change: it drops every patient record
    // still held in memory on a shared workstation, and it is how an open tab
    // picks up the current release (an old bundle can otherwise run for days).
    if (import.meta.env.MODE !== 'test') window.location.replace('/login');
  }, []);

  useEffect(() => {
    if (!user) return; // Only track idle time when logged in

    // A session restored after the browser sat closed (or asleep) past the
    // limit ends here, before anyone at a shared workstation can use it.
    if (isIdleExpired()) {
      console.log('Idle timeout reached, logging out.');
      logout();
      return;
    }
    if (!hasActivity()) markActivity();

    // Activity is recorded at most every few seconds: mousemove fires constantly.
    let lastWrite = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      markActivity(now);
    };
    const check = () => {
      if (isIdleExpired()) {
        console.log('Idle timeout reached, logging out.');
        logout();
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity));
    // Waking from sleep or returning to the tab checks at once; the interval
    // covers a screen left open and untouched.
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const intervalId = setInterval(check, 30 * 1000);

    return () => {
      clearInterval(intervalId);
      events.forEach(event => document.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [user, logout]);

  const hasRole = (roles: User['role'][]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    const patch = { ...data, profileCompleted: true };
    // A name or phone change reaches the network directory in the same write.
    const entry = directoryEntryFor({ ...user, ...patch, id: user.id });
    if (entry) {
      const batch = writeBatch(db);
      batch.set(userRef, patch, { merge: true });
      batch.set(doc(db, DIRECTORY_COLLECTION, user.id), entry);
      try { await batch.commit(); return; } catch { /* fall through: the profile still saves; the sweep reconciles the entry */ }
    }
    await setDoc(userRef, patch, { merge: true });
  };

  // Self-heal the signed-in user's own directory entry (audit S2): covers accounts
  // verified by an older app version and entries a refused write left stale.
  const healedEntryRef = useRef('');
  useEffect(() => {
    if (!user || user.verified !== true || !emailVerified) return;
    const entry = directoryEntryFor(user);
    const key = JSON.stringify(entry);
    if (!entry || healedEntryRef.current === key) return;
    healedEntryRef.current = key;
    const ref = doc(db, DIRECTORY_COLLECTION, user.id);
    (async () => {
      const snap = await getDoc(ref);
      if (!sameEntry(snap.exists() ? (snap.data() as DirectoryEntry) : null, entry)) await setDoc(ref, entry);
    })().catch(err => console.warn('Directory entry not synced:', err?.message));
  }, [user, emailVerified]);

  return (
    <AuthContext.Provider value={{ user, redirectError, authReady, emailVerified, login, loginWithGoogle, loginWithEmail, registerWithEmail, resendVerificationEmail, logout, hasRole, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
