import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Clock, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useI18n } from '../i18n';
import { ROLE_CONFIGS } from '../components/layout/RoleBadge';
import { Role } from '../types';

export const PendingVerification: React.FC = () => {
  const { user, emailVerified, resendVerificationEmail, logout } = useAuth();
  const { facilitiesById } = useData();
  const { t } = useI18n();
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!user) return <Navigate to="/login" replace />;
  if (user.verified && emailVerified) return <Navigate to="/" replace />;

  const handleResend = async () => {
    setResendStatus('sending');
    try {
      await resendVerificationEmail();
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  };

  // After the user clicks the link in their inbox: reload the Auth user so
  // emailVerified updates, and force a new ID token so the email_verified claim
  // the Firestore rules check updates too. A page reload alone keeps the cached
  // token, and the rules keep rejecting the user for up to an hour.
  const handleRefresh = async () => {
    try {
      await auth.currentUser?.reload();
      await auth.currentUser?.getIdToken(true);
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-t-4 border-t-yellow-500">
          <CardHeader className="bg-white dark:bg-slate-900 text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-12 w-12 text-warning-500" />
            </div>
            <CardTitle>{t('pending.title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 text-center space-y-6">
            {/* Email verification status */}
            {!emailVerified && (
              <div className="rounded-lg bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-warning-700 dark:text-warning-400">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm font-semibold">{t('pending.emailNotVerified')}</span>
                </div>
                <p className="text-xs text-warning-600 dark:text-warning-400">
                  {t('pending.checkInbox')}
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleResend}
                    variant="outline"
                    size="sm"
                    disabled={resendStatus === 'sending' || resendStatus === 'sent'}
                    className="w-full text-xs"
                  >
                    {resendStatus === 'sending' ? t('pending.sending') :
                     resendStatus === 'sent' ? t('pending.sent') :
                     resendStatus === 'error' ? t('pending.failed') :
                     t('pending.resend')}
                  </Button>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    {t('pending.refresh')}
                  </Button>
                </div>
              </div>
            )}

            {emailVerified && (
              <div className="rounded-lg bg-success-50 dark:bg-success-950/30 border border-success-200 dark:border-success-800 p-4">
                <div className="flex items-center justify-center gap-2 text-success-700 dark:text-success-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">{t('pending.emailVerified')}</span>
                </div>
              </div>
            )}

            {user.verified ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('pending.approvedConfirm')}
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {(() => {
                    // The role they asked for, and the hospital by name (it used to show the raw id).
                    const r = (user.requestedRole || user.role) as Role;
                    const role = r in ROLE_CONFIGS ? t(`role.${r}`) : String(r || '').replace(/_/g, ' ');
                    const facility = (user.facilityId && facilitiesById.get(user.facilityId)?.name) || user.facilityId || t('pending.globalNetwork');
                    return t('pending.submitted').split(/(\{role\}|\{facility\})/).map((part, i) =>
                      part === '{role}' ? <strong key={i}>{role}</strong> : part === '{facility}' ? <strong key={i}><bdi>{facility}</bdi></strong> : part);
                  })()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('pending.review')}
                </p>
              </>
            )}
            <Button onClick={logout} variant="outline" className="w-full">
              {t('pending.signOut')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
