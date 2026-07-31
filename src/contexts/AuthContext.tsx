import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login?: (id: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: User['role'][]) => boolean;
  verifyMFA: (pin: string) => boolean;
  mfaVerifiedAt: number | null;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<number | null>(null);

  useEffect(() => {
    const savedMFA = localStorage.getItem('eha_mfa_v2');
    if (savedMFA) {
      setMfaVerifiedAt(parseInt(savedMFA, 10));
    }

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
          }
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  
  const loginWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const registerWithEmail = async (e: string, p: string) => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    await createUserWithEmailAndPassword(auth, e, p);
  };

  const login = (id: string) => {
    const mockUser: User = {
      id,
      name: id,
      email: `${id}@example.com`,
      role: 'resident'
    } as User;
    setUser(mockUser);
  };
  
  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setMfaVerifiedAt(null);
    localStorage.removeItem('eha_mfa_v2');
  };

  const hasRole = (roles: User['role'][]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const verifyMFA = (pin: string) => {
    if (pin === '1234' || pin === '0000') {
      const now = Date.now();
      setMfaVerifiedAt(now);
      try {
        localStorage.setItem('eha_mfa_v2', now.toString());
      } catch (err) {}
      return true;
    }
    return false;
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, { ...data, profileCompleted: true }, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, loginWithEmail, registerWithEmail, logout, hasRole, verifyMFA, mfaVerifiedAt, updateUserProfile }}>
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
