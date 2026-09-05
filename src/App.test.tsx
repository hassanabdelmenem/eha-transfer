import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { User } from './types';

// App.tsx hardcodes <Router> (BrowserRouter) itself with no props, so the only
// way to control the current path per test is to swap it for a MemoryRouter
// seeded from this mutable path, read lazily when the mock component renders.
let mockInitialPath = '/';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <actual.MemoryRouter initialEntries={[mockInitialPath]}>{children}</actual.MemoryRouter>
    ),
  };
});

let mockAuthState: { user: User | null; authReady: boolean } = { user: null, authReady: false };
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockAuthState,
}));
vi.mock('./contexts/DataContext', () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./components/ui/Toaster', () => ({ Toaster: () => null }));
vi.mock('./components/layout/AppLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { AppLayout: () => <div data-testid="app-layout"><Outlet /></div> };
});

vi.mock('./pages/Login', () => ({ Login: () => <div>Login Page</div> }));
vi.mock('./pages/Dashboard', () => ({ Dashboard: () => <div>Resident Dashboard</div> }));
vi.mock('./pages/AdminDashboard', () => ({ AdminDashboard: () => <div>Admin Dashboard</div> }));
vi.mock('./pages/ERDashboard', () => ({ ERDashboard: () => <div>ER Dashboard</div> }));
vi.mock('./pages/ReferralsPage', () => ({ ReferralsPage: () => <div>Referrals Page</div> }));
vi.mock('./pages/ArchivePage', () => ({ ArchivePage: () => <div>Archive Page</div> }));
vi.mock('./pages/ReferralWorkspacePane', () => ({ ReferralWorkspacePane: () => <div>Referral Workspace</div> }));
vi.mock('./pages/NewReferralPage', () => ({ NewReferralPage: () => <div>New Referral Page</div> }));
vi.mock('./pages/NotificationsPage', () => ({ NotificationsPage: () => <div>Notifications Page</div> }));
vi.mock('./pages/AdmitPatientPage', () => ({ AdmitPatientPage: () => <div>Admit Patient Page</div> }));
vi.mock('./pages/DepartmentPage', () => ({ DepartmentPage: () => <div>Department Page</div> }));
vi.mock('./pages/NetworkDirectoryPage', () => ({ NetworkDirectoryPage: () => <div>Network Directory Page</div> }));
vi.mock('./pages/FacilitySettingsPage', () => ({ FacilitySettingsPage: () => <div>Facility Settings Page</div> }));
vi.mock('./pages/BedManagementPage', () => ({ BedManagementPage: () => <div>Bed Management Page</div> }));
vi.mock('./pages/Onboarding', () => ({ Onboarding: () => <div>Onboarding Page</div> }));
vi.mock('./pages/PendingVerification', () => ({ PendingVerification: () => <div>Pending Verification Page</div> }));

// Imported after the mocks above so App.tsx picks them up.
const { default: App } = await import('./App');

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', email: 'u1@x.com', name: 'U1', role: 'resident',
    verified: true, profileCompleted: true,
    ...overrides,
  } as User;
}

describe('App routing', () => {
  beforeEach(() => {
    mockInitialPath = '/';
    mockAuthState = { user: null, authReady: false };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the loading screen until Firebase reports the initial auth state', () => {
    render(<App />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor at "/" to the login page', async () => {
    mockAuthState = { user: null, authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  it('sends a signed-in user with an incomplete profile to onboarding', async () => {
    mockAuthState = { user: makeUser({ profileCompleted: false }), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Onboarding Page')).toBeInTheDocument());
  });

  it('sends a completed-but-unverified user to the pending-verification screen', async () => {
    mockAuthState = { user: makeUser({ verified: false }), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Pending Verification Page')).toBeInTheDocument());
  });

  it('lands a fully cleared user on the referrals queue via the index redirect', async () => {
    mockAuthState = { user: makeUser(), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Referrals Page')).toBeInTheDocument());
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
  });

  it('bounces a signed-in user away from /login back into the app', async () => {
    mockInitialPath = '/login';
    mockAuthState = { user: makeUser(), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Referrals Page')).toBeInTheDocument());
  });

  it('bounces a signed-in, profile-complete user away from /onboarding back into the app', async () => {
    mockInitialPath = '/onboarding';
    mockAuthState = { user: makeUser(), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Referrals Page')).toBeInTheDocument());
  });

  it('sends a signed-out visitor at /onboarding to login instead', async () => {
    mockInitialPath = '/onboarding';
    mockAuthState = { user: null, authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  it('routes owners and system admins to the admin dashboard', async () => {
    mockInitialPath = '/dashboard';
    mockAuthState = { user: makeUser({ role: 'owner' }), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Admin Dashboard')).toBeInTheDocument());
  });

  it('routes ER staff to the ER dashboard', async () => {
    mockInitialPath = '/dashboard';
    mockAuthState = { user: makeUser({ role: 'er_official' }), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('ER Dashboard')).toBeInTheDocument());
  });

  it('routes every other role to the default dashboard', async () => {
    mockInitialPath = '/dashboard';
    mockAuthState = { user: makeUser({ role: 'resident' }), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText('Resident Dashboard')).toBeInTheDocument());
  });

  it('falls back to its own loading screen even if reached with authReady somehow already false (defensive, unreachable via AppRoutes today)', async () => {
    mockInitialPath = '/';
    // AppRoutes calls useAuth() once and gates on it before ProtectedRoute
    // ever renders, so this sequence -- true for AppRoutes' own check, then
    // false once ProtectedRoute calls useAuth() again -- can only happen by
    // directly overriding the hook like this, not through real app state.
    let call = 0;
    mockAuthState = { user: makeUser(), authReady: true };
    const authAccessor = () => (call++ === 0 ? { user: makeUser(), authReady: true } : { user: makeUser(), authReady: false });
    const authModule = await import('./contexts/AuthContext');
    vi.spyOn(authModule, 'useAuth').mockImplementation(authAccessor as any);

    render(<App />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it.each([
    ['/archive', 'Archive Page'],
    ['/referrals/new', 'New Referral Page'],
    ['/referrals/r1', 'Referral Workspace'],
    ['/notifications', 'Notifications Page'],
    ['/admissions/new', 'Admit Patient Page'],
    ['/department', 'Department Page'],
    ['/directory', 'Network Directory Page'],
    ['/facility-settings', 'Facility Settings Page'],
    ['/bed-management', 'Bed Management Page'],
  ])('mounts the page registered for %s', async (path, expectedText) => {
    mockInitialPath = path;
    mockAuthState = { user: makeUser(), authReady: true };
    render(<App />);
    await waitFor(() => expect(screen.getByText(expectedText)).toBeInTheDocument());
  });
});
