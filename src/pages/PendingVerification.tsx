import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const PendingVerification: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.verified) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-t-4 border-t-yellow-500 shadow-xl">
          <CardHeader className="bg-white dark:bg-slate-900 text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle>Account Pending Verification</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-center space-y-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your profile has been submitted successfully. You requested the role of <strong>{(user.role || "").replace('_', ' ')}</strong> at <strong>{user.facilityId || 'Global Network'}</strong>.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              An administrator will review and verify your account shortly. Please check back later.
            </p>
            <Button onClick={logout} variant="outline" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
