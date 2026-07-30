import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: User['role'][]) => boolean;
  verifyMFA: (pin: string) => boolean;
  mfaVerifiedAt: number | null;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  loading: boolean;
  activeFacilityId: string | undefined;
  setActiveFacilityId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<number | null>(null);
  const [activeFacilityId, setActiveFacilityId] = useState<string | undefined>();

  useEffect(() => {
    const savedMFA = localStorage.getItem('eha_mfa_v2');
    if (savedMFA) {
      setMfaVerifiedAt(parseInt(savedMFA, 10));
    }

    let unsubscribeSnapshot: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          let docSnap = await getDoc(userRef);
          
          let foundUser: User;
          if (!docSnap.exists()) {
            // Determine if it's the owner
            if (firebaseUser.email?.toLowerCase() === 'hassan.abdelmenem@gmail.com') {
              foundUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Hassan',
                email: firebaseUser.email,
                role: 'owner',
                verified: true
              };
            } else {
              foundUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
                email: firebaseUser.email || '',
                role: 'resident',
                verified: false
              };
            }
            const cleanData = JSON.parse(JSON.stringify(foundUser));
            await setDoc(userRef, cleanData);
          } else {
            foundUser = docSnap.data() as User;
          }

          setUser(foundUser);
          if (foundUser.facilityId) {
            setActiveFacilityId(foundUser.facilityId);
          }
          setLoading(false);

          // Listen for real-time updates on this user's document
          if (unsubscribeSnapshot) unsubscribeSnapshot();
          unsubscribeSnapshot = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              const updatedUser = doc.data() as User;
              setUser(updatedUser);
              if (updatedUser.facilityId && !activeFacilityId) {
                setActiveFacilityId(updatedUser.facilityId);
              }
            }
          });
        } catch (error) {
          const e = error as Error;
          console.error("Firebase auth/firestore error:", e);
          alert("Login error (database): " + e.message);
          await firebaseSignOut(auth); // force signout if db fails
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setMfaVerifiedAt(null);
    localStorage.removeItem('eha_auth_user_v2');
    localStorage.removeItem('eha_mfa_v2');
  };

  const hasRole = (roles: User['role'][]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const verifyMFA = (pin: string) => {
    // Mock MFA verification (Accepts '1234' or '0000')
    if (pin === '1234' || pin === '0000') {
      const now = Date.now();
      setMfaVerifiedAt(now);
      localStorage.setItem('eha_mfa_v2', now.toString());
      return true;
    }
    return false;
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data, profileCompleted: true };
    setUser(updatedUser);
    
    // Update in Firestore
    const userRef = doc(db, 'users', user.id);
    const cleanData = JSON.parse(JSON.stringify(updatedUser));
    try {
      await setDoc(userRef, cleanData, { merge: true });
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, logout, hasRole, verifyMFA, mfaVerifiedAt, updateUserProfile, activeFacilityId, setActiveFacilityId }}>
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
