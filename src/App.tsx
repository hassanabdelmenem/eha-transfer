/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ERDashboard } from './pages/ERDashboard';
import { ReferralsPage } from './pages/ReferralsPage';
import { ReferralDetailPage } from './pages/ReferralDetailPage';
import { NewReferralPage } from './pages/NewReferralPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdmitPatientPage } from './pages/AdmitPatientPage';
import { DepartmentPage } from './pages/DepartmentPage';
import { NetworkDirectoryPage } from './pages/NetworkDirectoryPage';
import { FacilitySettingsPage } from './pages/FacilitySettingsPage';
import { BedManagementPage } from './pages/BedManagementPage';
import { Onboarding } from './pages/Onboarding';
import { PendingVerification } from './pages/PendingVerification';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
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
  const { user } = useAuth();
  
  return (
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
