import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppSidebar } from './AppSidebar';
import { ShellContext } from './ShellContext';
import { WORKSPACE_QUERY } from './Workspace';
import { ROLE_CONFIGS } from './RoleBadge';
import { Button } from '../ui/Button';
import { toastError, showToast } from '../../lib/toast';
import { isDoctorRole, isNurseRole } from '../../types';
import {
  X,
  Menu,
  Bell,
  WifiOff,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** Day runs 08:00–20:00; the handover goes to whichever shift comes next. */
const nextShift = (shiftType: string) => (shiftType === 'Day' ? 'night' : 'day');

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
  // Secondary screens draw a ScreenHeader (title + action + menu) instead.
  const onTitledScreen = ['/notifications', '/directory', '/archive', '/facility-settings'].includes(location.pathname);
  const ownHeader = onReferralDetail || onWizard || onTitledScreen;
  // 3d: the role home on a wide screen is a two-pane workspace that scrolls per pane.
  const wide = useMediaQuery(WORKSPACE_QUERY);
  const workspace = wide && location.pathname === '/dashboard' && !!user && user.role !== 'system_admin' && user.role !== 'owner';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [profilePhone, setProfilePhone] = useState(user?.phoneNumber || '');
  const [profileSchedule, setProfileSchedule] = useState(user?.monthlySchedule || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const profileModalRef = useRef<HTMLDivElement>(null);
  useDialogA11y(showProfile, () => setShowProfile(false), profileModalRef);

  const [showEndOfShift, setShowEndOfShift] = useState(false);
  const [sendingHandover, setSendingHandover] = useState(false);
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

  // "Emergency hotline" is the directory's on-call list (2e): who to phone now.
  const navigate = useNavigate();
  const openHotline = () => {
    setMobileMenuOpen(false);
    navigate('/directory');
  };

  // Signing out is always a deliberate, separate act; the handover never does it.
  const handleLogoutClick = () => {
    setMobileMenuOpen(false);
    logout();
  };

  const openHandover = () => {
    setMobileMenuOpen(false);
    setShowEndOfShift(true);
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
      shiftType,
      summary: `${shiftType} shift ending. ${pendingTransfersCount} active transfers in progress for ${user.department || 'General'} department.`,
      doneThisShift: 0,
      carryOver: [] as string[],
      watch: [] as string[],
    };

    pendingTransfers.forEach(r => {
      // Still waiting on a decision carries over; accepted or moving is watched.
      const isWaitlist = r.status === 'pending' || r.status === 'dept_approved' || r.status === 'manager_approved';
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
    const handover = buildHandover();
    if (!user || !user.facilityId || !handover) {
      setShowEndOfShift(false);
      return;
    }
    setSendingHandover(true);
    try {
      await addShiftLog({
        userId: user.id,
        userName: user.name || 'Unknown',
        department: user.department,
        facilityId: user.facilityId,
        summary: handover.summary,
        pendingTransfersCount: handover.carryOver.length,
        admittedPatientsCount: handover.doneThisShift
      });
      setShowEndOfShift(false);
      showToast(`Handover sent to the ${nextShift(handover.shiftType)} shift. You are still signed in.`, 'success');
    } catch (err: any) {
      toastError(err, 'Could not send the handover. Check the connection and try again.');
    } finally {
      setSendingHandover(false);
    }
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="h-dvh w-full flex bg-paper dark:bg-ink font-sans text-ink dark:text-paper overflow-hidden">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-paper focus:text-ink focus:px-4 focus:py-3 focus:rounded-[10px] focus:shadow-[0_8px_24px_rgba(20,20,19,0.14)] font-semibold text-sm"
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
          onOpenHandover={generatesShiftLog ? openHandover : undefined}
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
          'fixed inset-y-0 left-0 z-[90] w-[85vw] max-w-[320px] shadow-[8px_0_30px_rgba(20,20,19,0.18)] transition-transform duration-200 ease-out motion-reduce:transition-none',
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
          onOpenHandover={generatesShiftLog ? openHandover : undefined}
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
          className={cn(
            'flex-1 overflow-x-hidden scroll-pb-40 focus:outline-none',
            workspace ? 'overflow-hidden p-0' : cn('overflow-y-auto px-[18px] pb-10 lg:px-8 lg:py-8', !isDesktop && ownHeader ? 'pt-0' : 'pt-5')
          )}
        >
          <div className={workspace ? 'h-full' : 'max-w-7xl mx-auto w-full'}>
            <ShellContext.Provider value={{ openMenu: () => setMobileMenuOpen(true), isDesktop }}>
              <Outlet />
            </ShellContext.Provider>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-[0_8px_24px_rgba(20,20,19,0.14)] flex flex-col max-h-[90vh]">
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
        const card = 'rounded-xl border border-paper/12 bg-paper/[0.05] p-[14px]';
        const kind = 'text-[11px] font-bold uppercase tracking-[0.09em]';
        return (
          <div
            ref={endOfShiftModalRef}
            className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-ink text-paper"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eos-title"
            tabIndex={-1}
          >
            {/* 2f: the handover is written for you; sending it keeps you signed in. */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-paper/12 px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-4">
              <div className="min-w-0">
                <h2 id="eos-title" className="text-[17px] font-semibold leading-tight">End of shift</h2>
                {handover && (
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-paper/80">
                    {handover.shiftType} shift · {handover.shiftType === 'Day' ? '08:00–20:00' : '20:00–08:00'}
                  </p>
                )}
                <p className="mt-0.5 truncate text-[13px] text-paper/65">
                  {user.name}{user.department ? ` · ${user.department}` : ''}{facility ? ` · ${facility.name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEndOfShift(false)}
                aria-label="Close the handover"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-paper/25 hover:bg-paper/10"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mx-auto w-full max-w-xl flex-1 space-y-3 px-[18px] py-5">
              <p className={cn(card, 'flex items-start gap-2.5 text-[14px] leading-[1.45] text-paper/85')}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-400" aria-hidden="true" />
                Signed in since {signedInSince} on this device. Sending the handover keeps you signed in; sign out from the menu when you leave.
              </p>

              {handover ? (
                <>
                  <div className={card}>
                    <p className={cn(kind, 'text-paper/60')}>Handover, written for you</p>
                    <p className="mt-1.5 text-[15px] leading-[1.6]">{handover.summary}</p>
                  </div>

                  {handover.carryOver.length > 0 && (
                    <div className={card}>
                      <p className={cn(kind, 'flex items-center gap-1.5 text-warning-300')}><Clock className="h-3.5 w-3.5" aria-hidden="true" />Carry over · waiting on review</p>
                      <p className="mt-1.5 text-[15px] leading-[1.5]">{handover.carryOver.join(', ')} — still waiting on a department or manager decision.</p>
                    </div>
                  )}

                  {handover.watch.length > 0 && (
                    <div className={card}>
                      <p className={cn(kind, 'text-paper/60')}>On the move</p>
                      <p className="mt-1.5 text-[15px] leading-[1.5]">{handover.watch.join(', ')} — accepted, in transit or arrived; the next shift sees them through.</p>
                    </div>
                  )}

                  <div className={card}>
                    <p className={cn(kind, 'text-success-300')}>On record</p>
                    <p className="mt-1 text-[15px]">
                      {handover.doneThisShift} patient admission{handover.doneThisShift === 1 ? '' : 's'}/discharge{handover.doneThisShift === 1 ? '' : 's'} recorded.
                    </p>
                  </div>
                </>
              ) : (
                <p className={cn(card, 'py-6 text-center text-[14.5px] text-paper/70')}>
                  No active clinical handover summary required for your role.
                </p>
              )}
            </div>

            <div className="mx-auto w-full max-w-xl shrink-0 border-t border-paper/12 px-[18px] pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={sendingHandover}
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-paper text-[16px] font-semibold text-ink transition-colors hover:bg-slate-200 disabled:opacity-60"
              >
                {handover && <Send className="h-4 w-4" aria-hidden="true" />}
                <span>{sendingHandover ? 'Sending…' : handover ? `Send handover to the ${nextShift(handover.shiftType)} shift` : 'Close'}</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
