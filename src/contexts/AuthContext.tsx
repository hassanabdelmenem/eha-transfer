import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: User['role'][]) => boolean;
  verifyMFA: (pin: string) => boolean;
  mfaVerifiedAt: number | null;
  updateUserProfile: (data: Partial<User>) => void;
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

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const savedUsers = JSON.parse(localStorage.getItem('eha_users_v2') || '[]');
        let foundUser = savedUsers.find((u: any) => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        
        if (!foundUser && firebaseUser.email?.toLowerCase() === 'hassan.abdelmenem@gmail.com') {
          foundUser = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Hassan',
            email: firebaseUser.email,
            role: 'owner',
            verified: true
          };
          savedUsers.push(foundUser);
          localStorage.setItem('eha_users_v2', JSON.stringify(savedUsers));
        } else if (!foundUser) {
          foundUser = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
            email: firebaseUser.email || '',
            role: 'resident',
            verified: false
          };
          savedUsers.push(foundUser);
          localStorage.setItem('eha_users_v2', JSON.stringify(savedUsers));
        }

        setUser(foundUser);
        localStorage.setItem('eha_auth_user_v2', JSON.stringify(foundUser));
      } else {
        setUser(null);
        localStorage.removeItem('eha_auth_user_v2');
      }
    });
    return unsubscribe;
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

  const updateUserProfile = (data: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data, profileCompleted: true };
    setUser(updatedUser);
    localStorage.setItem('eha_auth_user_v2', JSON.stringify(updatedUser));
    
    // Also update it in the main user list so DataContext can pick it up
    const savedUsers = JSON.parse(localStorage.getItem('eha_users_v2') || '[]');
    const newUsers = savedUsers.map((u: any) => u.id === user.id ? updatedUser : u);
    localStorage.setItem('eha_users_v2', JSON.stringify(newUsers));
    
    // Trigger storage event manually in case same window needs to know
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithEmail, logout, hasRole, verifyMFA, mfaVerifiedAt, updateUserProfile }}>
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
