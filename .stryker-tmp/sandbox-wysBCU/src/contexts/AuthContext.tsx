// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { MOCK_USERS } from '../lib/mock-data';

interface AuthContextType {
  user: User | null;
  login: (userId: string) => void;
  logout: () => void;
  hasRole: (roles: User['role'][]) => boolean;
  verifyMFA: (pin: string) => boolean;
  mfaVerifiedAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mfaVerifiedAt, setMfaVerifiedAt] = useState<number | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    const savedMFA = localStorage.getItem('mfa_timestamp');
    if (savedMFA) {
      setMfaVerifiedAt(parseInt(savedMFA, 10));
    }
  }, []);

  const login = (userId: string) => {
    const foundUser = MOCK_USERS.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('auth_user', JSON.stringify(foundUser));
      setMfaVerifiedAt(null);
      localStorage.removeItem('mfa_timestamp');
    }
  };

  const logout = () => {
    setUser(null);
    setMfaVerifiedAt(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('mfa_timestamp');
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
      localStorage.setItem('mfa_timestamp', now.toString());
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, verifyMFA, mfaVerifiedAt }}>
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
