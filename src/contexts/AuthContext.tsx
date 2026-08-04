import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Mobile browsers (especially iOS Safari) routinely block or break signInWithPopup —
// third-party storage restrictions and popup blockers make the popup either never
// open or lose the auth state before it completes. signInWithRedirect navigates the
// whole page to Google and back instead, which works reliably on mobile.
const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

interface AuthContextType {
  user: User | null;
  // False until Firebase has reported the initial auth state. Routing must wait
  // for this: on a page refresh the SDK restores the session asynchronously, and
  // treating the intervening null as "signed out" bounced deep links to /login.
  authReady: boolean;
  login?: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: User['role'][]) => boolean;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // DEV/EMULATOR ONLY: Check for a locally-stored mock user used by tests/dev harnesses.
    // Never accept a locally-set auth_user in production — that allows full auth bypass.
    const isDevAuthAllowed = import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
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
      console.error('Redirect sign-in failed:', err);
      alert('Google sign-in failed: ' + err.message);
    });

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to real-time updates for the logged-in user
        unsubscribeUserDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
            setAuthReady(true);
          } else {
            // Document doesn't exist, create it
            let newUser: User;
            if (firebaseUser.email?.toLowerCase() === 'hassan.abdelmenem@gmail.com') {
              newUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Hassan',
                email: firebaseUser.email,
                role: 'owner',
                verified: true
              };
            } else {
              newUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
                email: firebaseUser.email || '',
                role: 'resident',
                verified: false
              };
            }
            await setDoc(userRef, newUser);
            setUser(newUser);
            setAuthReady(true);
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
    if (isMobileDevice()) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  };
  
  const loginWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const registerWithEmail = async (e: string, p: string) => {
    await createUserWithEmailAndPassword(auth, e, p);
  };

  const login = (id: string) => {
    // DEV/EMULATOR ONLY: create a local mock user. Disabled in production.
    if (!(import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true')) {
      console.warn('Mock login is disabled in production.');
      return;
    }
    const mockUser: User = {
      id,
      name: id,
      email: `${id}@example.com`,
      role: 'resident'
    } as User;
    setUser(mockUser);
    try {
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
    } catch (e) {}
  };
  
  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    try {
      localStorage.removeItem('auth_user');
    } catch (e) {}
  };

  const hasRole = (roles: User['role'][]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, { ...data, profileCompleted: true }, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ user, authReady, login, loginWithGoogle, loginWithEmail, registerWithEmail, logout, hasRole, updateUserProfile }}>
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
