import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  // Firebase distinguishes auth/user-not-found from auth/wrong-password, and
  // relaying err.message turned that into a user-enumeration oracle: anyone could
  // discover which hospital staff addresses hold accounts, which is exactly the
  // reconnaissance step before phishing a patient-transfer system. Both collapse
  // into one message here. The raw error still goes to the console for debugging.
  const describeAuthError = (err: unknown): string => {
    const code = (err as { code?: string } | null)?.code ?? '';
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-email':
        return 'Email or password is incorrect.';
      case 'auth/email-already-in-use':
        return 'An account already exists for that email address.';
      case 'auth/weak-password':
        return 'Please choose a password of at least six characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a few minutes and try again.';
      case 'auth/network-request-failed':
        return 'Could not reach the server. Check your connection and try again.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
      default:
        return 'Sign-in failed. Please try again.';
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      console.error('Email auth failed:', err);
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google auth failed:', err);
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
        </div>
        {/* h1, not h2: this page renders outside AppLayout, so nothing above it
            supplies the document's top-level heading. */}
        <h1 className="mt-6 text-center text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
          Ismailia Health Connect
        </h1>
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Referral Coordination & Governance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-t-4 border-t-blue-900 shadow-xl">
          <CardHeader className="bg-white dark:bg-slate-900">
            <CardTitle>{isRegistering ? 'Create your account' : 'Sign in to your account'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded border-l-4 border-l-critical-600 bg-critical-50 dark:bg-critical-950/40 px-4 py-3 text-sm text-critical-900 dark:text-critical-200"
              >
                {error}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full h-12 flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              disabled={submitting}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="loginEmail" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="loginEmail"
                    type="email"
                    required
                    autoComplete="email"
                    className="pl-10"
                    placeholder="you@hospital.gov"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="loginPassword" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Password</label>
                <Input
                  id="loginPassword"
                  type="password"
                  required
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-sm bg-blue-900 hover:bg-blue-800" disabled={submitting}>
                {submitting
                  ? 'Working…'
                  : isRegistering ? 'Sign up with Email' : 'Sign in with Email'}
              </Button>
            </form>
            
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>


          </CardContent>
        </Card>
      </div>
    </main>
  );
};
