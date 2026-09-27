import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppSidebar } from './AppSidebar';
import { ROLE_CONFIGS } from './RoleBadge';
import { Button } from '../ui/Button';
import { toastError } from '../../lib/toast';
import { isDoctorRole, isNurseRole } from '../../types';
import {
  X,
  Menu,
  Bell,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useMediaQuery } from '../../hooks/useMediaQuery';

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
  // One sidebar in the DOM at a time: the rail on desktop, the drawer on phones.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // A referral's detail screen carries its own ink header (back, patient, stage
  // rail), so on phones it replaces the identity header rather than stacking.
  const onReferralDetail = /^\/referrals\/(?!new$)[^/]+$/.test(location.pathname);
  // The intake wizard does the same: its header names the patient and the step.
  const onWizard = location.pathname === '/referrals/new';
  const ownHeader = onReferralDetail || onWizard;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [profilePhone, setProfilePhone] = useState(user?.phoneNumber || '');
  const [profileSchedule, setProfileSchedule] = useState(user?.monthlySchedule || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const profileModalRef = useRef<HTMLDivElement>(null);
  useDialogA11y(showProfile, () => setShowProfile(false), profileModalRef);

  const [showHotline, setShowHotline] = useState(false);
  const [showEndOfShift, setShowEndOfShift] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const endOfShiftModalRef = useRef<HTMLDivElement>(null);
  useDialogA11y(showEndOfShift, () => setShowEndOfShift(false), endOfShiftModalRef);

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
        handover.carryOver.push(r.patientData.name);
      } else {
        handover.watch.push(r.patientData.name);
      }
    });

    const activeAdmissions = directAdmissions.filter(a => a.facilityId === myFacilityId);
    handover.doneThisShift += activeAdmissions.length;
    handover.doneThisShift += relevantReferrals.filter(r => r.status === 'discharged').length;

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
          department: user.department,
          facilityId: user.facilityId,
          summary: handover.summary,
          pendingTransfersCount: handover.carryOver.length,
          admittedPatientsCount: handover.doneThisShift
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
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHotline, mobileMenuOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-dvh w-full flex bg-paper dark:bg-ink font-sans text-ink dark:text-paper overflow-hidden">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-paper focus:text-ink focus:px-4 focus:py-3 focus:rounded-[10px] focus:shadow-xl font-semibold text-sm"
      >
        Skip to main content
      </a>

      {/* Desktop: the ink rail is always there. */}
      {isDesktop && <div className="flex shrink-0">
        <AppSidebar
          user={user}
          facility={facility}
          referrals={referrals}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          unreadNotifsCount={unreadNotifs}
          onOpenProfile={openProfile}
          onOpenHotline={openHotline}
          onLogoutClick={handleLogoutClick}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>}

      {/* Phone: the same rail, in a drawer opened from the header. */}
      {!isDesktop && mobileMenuOpen && (
        <div
          data-testid="drawer-backdrop"
          className="fixed inset-0 z-[80] bg-ink/60"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {!isDesktop && <div
        className={cn(
          'fixed inset-y-0 left-0 z-[90] w-[85vw] max-w-[320px] shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        inert={!mobileMenuOpen}
      >
        <AppSidebar
          user={user}
          facility={facility}
          referrals={referrals}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          unreadNotifsCount={unreadNotifs}
          isMobile={true}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenProfile={openProfile}
          onOpenHotline={openHotline}
          onLogoutClick={handleLogoutClick}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Phone identity header: who you are and where, in ink. */}
        {!isDesktop && !ownHeader && <header className="shrink-0 bg-ink text-paper px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-[1.3]">{user.name}</p>
              <p className="mt-0.5 truncate text-[12.5px] leading-[1.3] text-white/60">
                {ROLE_CONFIGS[user.role]?.label ?? user.role}{facility ? ` · ${facility.name}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/notifications"
                aria-label={unreadNotifs > 0 ? `Inbox, ${unreadNotifs} unread` : 'Inbox'}
                className="relative flex h-12 w-12 items-center justify-center rounded-[10px] border border-white/25 hover:bg-white/10"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-[9px] w-[9px] rounded-full border-2 border-ink bg-critical-500" aria-hidden="true" />
                )}
              </Link>
              <button
                ref={mobileMenuTriggerRef}
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
                className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-white/25 hover:bg-white/10"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          {(!isOnline || pendingSyncCount > 0) && (
            <p role="status" className="mt-3.5 flex items-center gap-2 rounded-lg border border-warning-700 bg-warning-800/30 px-[11px] py-[9px] text-[12.5px] font-semibold text-warning-300">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!isOnline
                ? `Offline · ${pendingSyncCount} action${pendingSyncCount === 1 ? '' : 's'} queued, will send automatically`
                : `Back online · sending ${pendingSyncCount} queued action${pendingSyncCount === 1 ? '' : 's'}`}
            </p>
          )}
        </header>}

        <main
          id="main-content"
          tabIndex={-1}
          className={cn('flex-1 overflow-y-auto overflow-x-hidden scroll-pb-40 px-[18px] pb-10 lg:px-8 lg:py-8 focus:outline-none', !isDesktop && ownHeader ? 'pt-0' : 'pt-5')}
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Profile Settings Dialog */}
      {showProfile && (
        <div
          ref={profileModalRef}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-title"
          tabIndex={-1}
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
                className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
            ref={endOfShiftModalRef}
            className="fixed inset-0 bg-slate-950 z-[100] flex flex-col text-white overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eos-title"
            tabIndex={-1}
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
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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
