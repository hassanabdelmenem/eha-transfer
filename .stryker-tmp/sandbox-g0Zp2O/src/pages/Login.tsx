// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_USERS, FACILITIES } from '../lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Shield, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // For demo: direct user selection
  const [selectedUser, setSelectedUser] = useState(MOCK_USERS[0].id);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedUser);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      login(found.id);
    } else {
      alert("User not found in mock data. Use the dropdown for demo.");
    }
  };

  const handleGoogleLogin = () => {
    // Simulate Google Login for Owner
    login('u0'); 
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
          Ismailia Health Connect
        </h2>
        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Referral Coordination & Governance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-t-4 border-t-blue-900 shadow-xl">
          <CardHeader className="bg-white dark:bg-slate-900">
            <CardTitle>Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <Button 
              variant="outline" 
              className="w-full h-12 flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    className="pl-10" 
                    placeholder="you@hospital.gov"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full h-12 text-sm bg-blue-900 hover:bg-blue-800">
                Sign in with Email
              </Button>
            </form>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <form onSubmit={handleLogin}>
                <label htmlFor="user" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Demo Fast Login (Select Role)
                </label>
                <div className="flex gap-2">
                  <select
                    id="user"
                    className="flex-1 block w-full pl-3 pr-10 py-2 text-xs border-slate-300 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 border rounded"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    {MOCK_USERS.map((user) => {
                      const facility = FACILITIES.find(f => f.id === user.facilityId);
                      return (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.role.replace(/_/g, ' ')} {facility ? `(${facility.name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <Button type="submit" variant="secondary" className="px-6">Go</Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
