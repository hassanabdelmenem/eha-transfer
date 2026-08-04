/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';

// Lazy-load route pages to reduce initial bundle size.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ERDashboard = lazy(() => import('./pages/ERDashboard'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const ReferralDetailPage = lazy(() => import('./pages/ReferralDetailPage'));
const NewReferralPage = lazy(() => import('./pages/NewReferralPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdmitPatientPage = lazy(() => import('./pages/AdmitPatientPage'));
const DepartmentPage = lazy(() => import('./pages/DepartmentPage'));
const NetworkDirectoryPage = lazy(() => import('./pages/NetworkDirectoryPage'));
const FacilitySettingsPage = lazy(() => import('./pages/FacilitySettingsPage'));
const BedManagementPage = lazy(() => import('./pages/BedManagementPage'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const PendingVerification = lazy(() => import('./pages/PendingVerification'));


// Shown while Firebase restores a session. Without it, a refresh on any deep
// link renders one frame with user === null and redirects to /login.
const AuthLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Loading</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, authReady } = useAuth();
  if (!authReady) {
    return <AuthLoading />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.profileCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  if (!user.verified) {
    return <Navigate to="/pending-verification" replace />;
  }
  return <>{children}</>;
};

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  if (user?.role === 'system_admin' || user?.role === 'owner') {
    return <AdminDashboard />;
  }
  if (user?.role === 'er_room' || user?.role === 'er_official') {
    return <ERDashboard />;
  }
  return <Dashboard />;
};

const AppRoutes = () => {
  const { user, authReady } = useAuth();

  // Same reason as ProtectedRoute: /login and /onboarding branch on `user`, so
  // rendering them before auth resolves flashes the login form at a signed-in
  // user and can bounce them away from the page they asked for.
  if (!authReady) {
    return <AuthLoading />;
  }

  return (
    <Suspense fallback={<AuthLoading />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/onboarding" element={user ? (user.profileCompleted ? <Navigate to="/" replace /> : <Onboarding />) : <Navigate to="/login" replace />} />
        <Route path="/pending-verification" element={<PendingVerification />} />
        
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/referrals" replace />} />
          <Route path="dashboard" element={<RoleBasedDashboard />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="referrals/new" element={<NewReferralPage />} />
          <Route path="referrals/:id" element={<ReferralDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admissions/new" element={<AdmitPatientPage />} />
          <Route path="department" element={<DepartmentPage />} />
          <Route path="directory" element={<NetworkDirectoryPage />} />
          <Route path="facility-settings" element={<FacilitySettingsPage />} />
          <Route path="bed-management" element={<BedManagementPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <AuthProvider>
        <DataProvider>
          <Router>
            <AppRoutes />
          </Router>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
