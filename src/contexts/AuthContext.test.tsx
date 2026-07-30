import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import React from 'react';

// Mock component to test the context
const AuthConsumer = () => {
  const { user, login, logout, hasRole, verifyMFA } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
      <div data-testid="role-admin">{hasRole(['system_admin']) ? 'Is Admin' : 'Not Admin'}</div>
      
      <button onClick={() => login('u1')}>Login U1</button>
      <button onClick={() => logout()}>Logout</button>
      
      <button onClick={() => {
        const success = verifyMFA('1234');
        document.getElementById('mfa-result')!.textContent = success ? 'MFA Success' : 'MFA Fail';
      }}>Verify MFA</button>
      <div id="mfa-result"></div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides null user initially', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('role-admin')).toHaveTextContent('Not Admin');
  });

  it('logs in user and saves to localStorage', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    
    await userEvent.click(screen.getByText('Login U1'));
    
    // Check state update
    expect(screen.getByTestId('user')).not.toHaveTextContent('No User');
    
    // Check localStorage
    const savedUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    expect(savedUser.id).toBe('u1');
  });

  it('logs out user and clears localStorage', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    
    await userEvent.click(screen.getByText('Login U1'));
    await userEvent.click(screen.getByText('Logout'));
    
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('verifies MFA correctly', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    
    await userEvent.click(screen.getByText('Verify MFA'));
    expect(document.getElementById('mfa-result')).toHaveTextContent('MFA Success');
    expect(localStorage.getItem('mfa_timestamp')).not.toBeNull();
  });
});
