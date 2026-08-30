import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppSidebar } from './AppSidebar';
import { Button } from '../ui/Button';
import { toastError } from '../../lib/toast';
import { isDoctorRole, isNurseRole } from '../../types';
import {
  X,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const AppLayout: React.FC = () => {
  const { user, logout, updateUserProfile } = useAuth();
  const {
    notifications,
    facilities,
    facilitiesById,
    isOnline,
    pendingSyncCount,
    referrals,
    directAdmissions,
    addShiftLog,
    users,
    markNotificationRead,
    markAllNotificationsRead,
  } = useData();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [profilePhone, setProfilePhone] = useState(user?.phoneNumber || '');
  const [profileSchedule, setProfileSchedule] = useState(user?.monthlySchedule || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [showHotline, setShowHotline] = useState(false);
  const [showEndOfShift, setShowEndOfShift] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [signedInSince] = useState(() => {
    try {
      const existing = localStorage.getItem('authSinceDate');
      if (existing) return existing;
      const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      localStorage.setItem('authSinceDate', today);
      return today;
    } catch {
      return new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  });

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateUserProfile({ phoneNumber: profilePhone, monthlySchedule: profileSchedule });
      setShowProfile(false);
    } catch (err: any) {
      toastError(err, 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const openProfile = () => {
    setProfilePhone(user?.phoneNumber || '');
    setProfileSchedule(user?.monthlySchedule || '');
    setShowProfile(true);
    setMobileMenuOpen(false);
  };

  const openHotline = () => {
    setShowHotline(true);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setMobileMenuOpen(false);
    if (!user) return;
    const isDoctor = isDoctorRole(user.role);
    const isNurse = isNurseRole(user.role) || user.role === 'owner';
    const generatesShiftLog = !!user.facilityId && (isDoctor || isNurse);
    if (generatesShiftLog) {
      setShowEndOfShift(true);
    } else {
      logout();
    }
  };

  if (!user) return null;

  const facility = facilitiesById.get(user.facilityId || '');
  const unreadNotifs = notifications.filter(n => n.userId === user.id && !n.read).length;

  const isDoctor = isDoctorRole(user.role);
  const isNurse = isNurseRole(user.role) || user.role === 'owner';
  const generatesShiftLog = !!user.facilityId && (isDoctor || isNurse);

  const buildHandover = () => {
    if (!generatesShiftLog || !user.facilityId) return null;
    const myFacilityId = user.facilityId;
    const myDept = user.department;

    const relevantReferrals = referrals.filter(r =>
      (r.receivingFacilityId === myFacilityId || r.referringFacilityId === myFacilityId) &&
      (!myDept || r.receivingDepartments?.includes(myDept))
    );

    const pendingTransfers = relevantReferrals.filter(r =>
      ['pending', 'dept_approved', 'manager_approved', 'accepted', 'in_transit', 'arrived'].includes(r.status)
    );
    const pendingTransfersCount = pendingTransfers.length;

    let shiftType = 'Day';
    const hour = new Date().getHours();
    if (hour >= 20 || hour < 8) shiftType = 'Night';

    const handover = {
      summary: `${shiftType} shift ending. ${pendingTransfersCount} active transfers in progress for ${user.department || 'General'} department.`,
      doneThisShift: 0,
      carryOver: [] as string[],
      watch: [] as string[],
    };

    pendingTransfers.forEach(r => {
      const isWaitlist = r.status === 'pending' || r.status === 'dept_approved';
      if (isWaitlist) {
        handover.carryOver.push(r.patientName);
      } else {
        handover.watch.push(r.patientName);
      }
    });

    const activeAdmissions = directAdmissions.filter(a => a.facilityId === myFacilityId);
    handover.doneThisShift += activeAdmissions.length;
    handover.doneThisShift += relevantReferrals.filter(r => r.status === 'completed' || r.status === 'discharged').length;

    return handover;
  };

  const handleConfirmHandover = async () => {
    if (!user || !user.facilityId) {
      logout();
      return;
    }

    setSigningOut(true);
    try {
      const handover = buildHandover();
      if (handover) {
        await addShiftLog({
          userId: user.id,
          userName: user.name || 'Unknown',
          role: user.role,
          department: user.department,
          facilityId: user.facilityId,
          shiftSummary: handover.summary,
          handoverData: {
            carryOverCases: handover.carryOver.length,
            watchCases: handover.watch.length,
            completedCases: handover.doneThisShift
          }
        });
      }
      setShowEndOfShift(false);
      logout();
    } catch (err: any) {
      toastError(err, 'Failed to save handover log. Continuing logout.');
      logout();
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHotline) setShowHotline(false);
        if (showProfile) setShowProfile(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHotline, showProfile, mobileMenuOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-screen w-full flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-sm"
      >
        Skip to main content
      </a>

      {/* FLOATING BUTTON (The only way to open the drawer now) */}
      <button
        ref={mobileMenuTriggerRef}
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      >
        <Menu className="w-6 h-6" />
        {unreadNotifs > 0 && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-critical-500 border-2 border-blue-600 rounded-full"></span>
        )}
      </button>

      {/* Off-Canvas Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[80] motion-safe:animate-[fadeIn_150ms_ease-out]"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Off-Canvas Drawer (Now used for Desktop AND Mobile) */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-[90] w-[85vw] max-w-xs shadow-2xl transition-transform duration-300 ease-out will-change-transform bg-white dark:bg-slate-900',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AppSidebar
          user={user}
          facility={facility}
          referrals={referrals}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          unreadNotifsCount={unreadNotifs}
          collapsed={false}
          isMobile={true}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenProfile={openProfile}
          onOpenHotline={openHotline}
          onLogoutClick={handleLogoutClick}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Primary Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Scrollable Main Workspace */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 focus:outline-none"
        >
          <div className="max-w-7xl mx-auto w-full pt-16">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Profile Settings Dialog */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h2 id="profile-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  My Profile & Settings
                </h2>
              </div>
              <button
                onClick={() => setShowProfile(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg"
                aria-label="Close profile settings"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="profilePhone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  On-Call Phone Number
                </label>
                <input
                  id="profilePhone"
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label htmlFor="profileSchedule" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Schedule & Availability
                </label>
                <textarea
                  id="profileSchedule"
                  value={profileSchedule}
                  onChange={(e) => setProfileSchedule(e.target.value)}
                  placeholder="E.g. Mondays & Wednesdays 8am-8pm, On-call weekends..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This schedule is published to the regional Network Directory to assist triage coordination.
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End of Shift Handover Dialog */}
      {showEndOfShift && (() => {
        const handover = buildHandover();
        return (
          <div
            className="fixed inset-0 bg-slate-950 z-[100] flex flex-col text-white overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eos-title"
          >
            <div className="px-4 sm:px-6 pt-5 pb-4 flex items-start justify-between shrink-0 border-b border-white/10">
              <div>
                <h2 id="eos-title" className="text-xl font-bold tracking-tight">
                  End of Shift Clinical Handover
                </h2>
                <p className="text-xs text-white/60 mt-0.5">
                  {user.name} {user.department ? `· ${user.department}` : ''} {facility ? `· ${facility.name}` : ''}
                </p>
              </div>
              <button
                onClick={() => setShowEndOfShift(false)}
                aria-label="Cancel, stay signed in"
                className="h-10 w-10 -mr-2 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 px-4 sm:px-6 py-6 space-y-4 max-w-xl w-full mx-auto">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-success-400" />
                <p className="text-sm text-white/85 leading-relaxed">
                  Signed in since {signedInSince} on this workstation. You will not be asked to sign in again after handover.
                </p>
              </div>

              {handover ? (
                <>
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">
                      Automated Handover Summary
                    </p>
                    <p className="text-sm leading-relaxed text-white/95 font-medium">
                      {handover.summary}
                    </p>
                  </div>

                  {handover.carryOver.length > 0 && (
                    <div className="rounded-2xl border border-warning-500/30 bg-warning-950/20 p-4">
                      <div className="flex items-center gap-2 text-warning-400 mb-1">
                        <Clock className="w-4 h-4 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-wider">Carry Over Cases</p>
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed">
                        {handover.carryOver.join(', ')} — active transfers in transit/review for next shift.
                      </p>
                    </div>
                  )}

                  {handover.watch.length > 0 && (
                    <div className="rounded-2xl border border-critical-500/30 bg-critical-950/20 p-4">
                      <div className="flex items-center gap-2 text-critical-400 mb-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-wider">Escalated Watch Cases</p>
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed">
                        {handover.watch.join(', ')} — urgent clinical escalations requiring priority attention.
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/50">Completed This Shift</p>
                      <p className="text-sm text-white/90 mt-0.5 font-medium">
                        {handover.doneThisShift} patient admission{handover.doneThisShift === 1 ? '' : 's'}/discharge{handover.doneThisShift === 1 ? '' : 's'} recorded.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-500/20 text-success-300 border border-success-500/30">
                      {handover.doneThisShift} Done
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-center">
                  <p className="text-sm text-white/70">
                    No active clinical handover summary required for your role.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 sm:px-6 pb-6 pt-3 max-w-xl w-full mx-auto border-t border-white/10">
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={signingOut}
                className="w-full min-h-[52px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>{signingOut ? 'Signing out…' : 'Send handover to the day shift'}</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
