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
import { Toaster } from './components/ui/Toaster';

// Each page is imported by its named export.
//
// This replaces a helper that fell back to "the first export that is a function
// or an object" when a module had no default. Object.keys() on an ES module
// namespace is sorted alphabetically rather than in declaration order, so adding
// any export to a page whose name sorted before the component -- a constant, a
// type guard, a helper -- would silently hand React the wrong value and break
// that route at runtime. Naming the export removes the guesswork, and because
// these are typed rather than `any`, a rename now fails the build instead.
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ERDashboard = lazy(() => import('./pages/ERDashboard').then(m => ({ default: m.ERDashboard })));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage').then(m => ({ default: m.ReferralsPage })));
const ArchivePage = lazy(() => import('./pages/ArchivePage').then(m => ({ default: m.ArchivePage })));
const ReferralWorkspacePane = lazy(() => import('./pages/ReferralWorkspacePane').then(m => ({ default: m.ReferralWorkspacePane })));
const NewReferralPage = lazy(() => import('./pages/NewReferralPage').then(m => ({ default: m.NewReferralPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const AdmitPatientPage = lazy(() => import('./pages/AdmitPatientPage').then(m => ({ default: m.AdmitPatientPage })));
const DepartmentPage = lazy(() => import('./pages/DepartmentPage').then(m => ({ default: m.DepartmentPage })));
const NetworkDirectoryPage = lazy(() => import('./pages/NetworkDirectoryPage').then(m => ({ default: m.NetworkDirectoryPage })));
const FacilitySettingsPage = lazy(() => import('./pages/FacilitySettingsPage').then(m => ({ default: m.FacilitySettingsPage })));
const BedManagementPage = lazy(() => import('./pages/BedManagementPage').then(m => ({ default: m.BedManagementPage })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const PendingVerification = lazy(() => import('./pages/PendingVerification').then(m => ({ default: m.PendingVerification })));


// Shown while Firebase restores a session. Without it, a refresh on any deep
// link renders one frame with user === null and redirects to /login.
const AuthLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading</p>
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
          <Route path="archive" element={<ArchivePage />} />
          <Route path="referrals/new" element={<NewReferralPage />} />
          <Route path="referrals/:id" element={<ReferralWorkspacePane />} />
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
          {/* Above the router so it also covers Login and Onboarding, which render
              outside AppLayout. */}
          <Toaster />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
