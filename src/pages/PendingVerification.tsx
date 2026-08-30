import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Clock, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const PendingVerification: React.FC = () => {
  const { user, emailVerified, resendVerificationEmail, logout } = useAuth();
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!user) return <Navigate to="/login" replace />;
  if (user.verified) return <Navigate to="/" replace />;

  const handleResend = async () => {
    setResendStatus('sending');
    try {
      await resendVerificationEmail();
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  };

  // Refresh the page to pick up the updated emailVerified status from Firebase
  // Auth after the user clicks the verification link in their inbox.
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-t-4 border-t-yellow-500 shadow-xl">
          <CardHeader className="bg-white dark:bg-slate-900 text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-12 w-12 text-warning-500" />
            </div>
            <CardTitle>Account Pending Verification</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-center space-y-6">
            {/* Email verification status */}
            {!emailVerified && (
              <div className="rounded-lg bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-warning-700 dark:text-warning-400">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm font-semibold">Email Not Verified</span>
                </div>
                <p className="text-xs text-warning-600 dark:text-warning-400">
                  Please check your inbox for a verification link. You must verify your email address before an administrator can approve your account.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleResend}
                    variant="outline"
                    size="sm"
                    disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                    className="w-full text-xs"
                  >
                    {resendStatus === 'sending' ? 'Sending…' :
                     resendStatus === 'sent' ? '✓ Verification email sent' :
                     resendStatus === 'error' ? 'Failed — try again' :
                     'Resend Verification Email'}
                  </Button>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    I've verified — refresh
                  </Button>
                </div>
              </div>
            )}

            {emailVerified && (
              <div className="rounded-lg bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800 p-4">
                <div className="flex items-center justify-center gap-2 text-success-700 dark:text-success-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">Email Verified</span>
                </div>
              </div>
            )}

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
