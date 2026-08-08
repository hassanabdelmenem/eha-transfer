import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import React from 'react';

// Mock component to test the context
const AuthConsumer = () => {
  const { user, login, logout, hasRole } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
      <div data-testid="role-admin">{hasRole(['system_admin']) ? 'Is Admin' : 'Not Admin'}</div>

      {/* `login` is optional on the context type, so it must be called optionally. */}
      <button onClick={() => login?.('u1')}>Login U1</button>
      <button onClick={() => logout()}>Logout</button>
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
});
