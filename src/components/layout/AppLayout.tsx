import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed, Cloud, Database, Eye, Phone, X, User, Archive } from 'lucide-react';
import { Button } from '../ui/Button';
import { MOCK_USERS } from '../../lib/mock-data';
import { toastError } from '../../lib/toast';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications, facilities, facilitiesById, isOnline, pendingSyncCount, referrals, directAdmissions, addShiftLog, users } = useData();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const [showProfile, setShowProfile] = React.useState(false);
  const [profilePhone, setProfilePhone] = React.useState(user?.phoneNumber || '');
  const [profileSchedule, setProfileSchedule] = React.useState(user?.monthlySchedule || '');
  const { updateUserProfile } = useAuth();

  const [savingProfile, setSavingProfile] = React.useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      // Await before closing: a rejected write used to leave the dialog looking saved,
      // so staff kept a stale on-call number in the hotline directory.
      await updateUserProfile({ phoneNumber: profilePhone, monthlySchedule: profileSchedule });
      setShowProfile(false);
    } catch (err: any) {
      toastError(err, "Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const openProfile = () => {
    setProfilePhone(user?.phoneNumber || '');
    setProfileSchedule(user?.monthlySchedule || '');
    setShowProfile(true);
  };

  const [showHotline, setShowHotline] = React.useState(false);
  const hotlineContacts = users.filter(u =>
    u.facilityId === user?.facilityId &&
    ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'nursing_supervisor'].includes(u.role)
  );


  if (!user) return null;

  const facility = facilitiesById.get(user.facilityId || '');
  const unreadNotifs = notifications.filter(n => n.userId === user.id && !n.read).length;

  const isNurse = user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'owner';
  const isHeadOfDept = user.role === 'head_of_department' || user.role === 'owner';
  const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);

  const generatesShiftLog = !!user.facilityId && (isDoctor || isNurse);

  // 2f end-of-shift: the handover summary plus three categorised carry-over
  // lists, computed without side effects so the confirmation screen can show
  // it before anything is written. Returns null for roles that don't get a
  // shift log at all (unchanged from the original behaviour).
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

    const relevantAdmissions = directAdmissions.filter(a => a.facilityId === myFacilityId && (!myDept || a.department === myDept));
    const admittedPatientsCount = relevantAdmissions.filter(a => a.status !== 'discharged').length +
      relevantReferrals.filter(r => r.status === 'admitted').length;

    let summary = `Handover: ${myDept || 'General'} Dept. `;
    if (pendingTransfersCount > 0) {
      summary += `${pendingTransfersCount} active transfers (` + pendingTransfers.slice(0, 3).map(r => r.patientData.name).join(', ') + (pendingTransfersCount > 3 ? '...' : '') + `). `;
    }
    summary += `Currently admitted: ${admittedPatientsCount} patients.`;

    // "Carry over": still moving, needs someone to pick it up next shift.
    const carryOver = pendingTransfers.slice(0, 3).map(r => r.patientData.name);
    // "Watch": escalated -- the case most likely to need attention overnight.
    const watch = relevantReferrals.filter(r => r.isEscalated).slice(0, 3).map(r => r.patientData.name);
    const doneThisShift = relevantReferrals.filter(r => ['admitted', 'discharged'].includes(r.status)).length;

    return { myFacilityId, pendingTransfersCount, admittedPatientsCount, summary, carryOver, watch, doneThisShift };
  };

  const performLogout = async (handover: ReturnType<typeof buildHandover>) => {
    if (handover) {
      // Await before signing out: firebaseSignOut revokes the token this write needs,
      // so a fire-and-forget log was being rejected and lost.
      await addShiftLog({
        userId: user.id,
        userName: user.name,
        facilityId: handover.myFacilityId,
        department: user.department,
        pendingTransfersCount: handover.pendingTransfersCount,
        admittedPatientsCount: handover.admittedPatientsCount,
        summary: handover.summary
      });
    }
    await logout();
  };

  const [showEndOfShift, setShowEndOfShift] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const handleLogoutClick = () => {
    if (generatesShiftLog) {
      setShowEndOfShift(true);
    } else {
      performLogout(null);
    }
  };
  const handleConfirmHandover = async () => {
    setSigningOut(true);
    try {
      await performLogout(buildHandover());
    } finally {
      setSigningOut(false);
    }
  };

  // "Signed in since ... on this phone": a real, per-device date, set once on
  // first render after sign-in and read back from then on -- matches the
  // "you will not be asked to sign in again" persistent-session model, since
  // localStorage is itself scoped to this device's browser.
  const [signedInSince] = React.useState(() => {
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

  // Neither modal below closed on Escape, which WCAG 2.1.2 (No Keyboard Trap)
  // expects for anything opened this way -- a keyboard user had no way out
  // short of tabbing to the close button. showEndOfShift is deliberately not
  // included: it ends in a real sign-out, not a dismiss, so Escape shouldn't
  // silently skip the handover the way it dismisses the other two.
  React.useEffect(() => {
    if (!showHotline && !showProfile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHotline(false);
        setShowProfile(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHotline, showProfile]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Referrals', path: '/referrals', icon: Users },
    { name: 'Archive', path: '/archive', icon: Archive },
    { name: 'Directory', path: '/directory', icon: BookOpen },
  ];

  if (isHeadOfDept) {
    navItems.push({ name: 'Department', path: '/department', icon: Activity });
  }

  if (['hospital_manager', 'deputy_manager', 'medical_director', 'owner'].includes(user.role)) {
    navItems.push({ name: 'Facility Settings', path: '/facility-settings', icon: Settings });
  }
  if (isNurse) {
    navItems.push({ name: 'Bed Management', path: '/bed-management', icon: Bed });
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans overflow-hidden w-full">
      {/* Visually hidden until focused: a keyboard user landing on this page
          otherwise has to tab through the full header and sidebar nav (which
          on a small facility list is a lot of links) before reaching the
          referral list every other interaction on this page is about. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        Skip to main content
      </a>
      <header className="min-h-[4rem] h-auto py-3 md:py-2 bg-blue-900 text-white flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-6 border-b-4 border-blue-700 w-full relative gap-y-3">
        {/* Logo Section */}
        <div className="flex items-center gap-3 shrink-0 mx-auto md:mx-0">
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-md flex items-center justify-center shrink-0">
            <Activity className="h-7 w-7 text-blue-900" />
          </div>
          <div>
            {/* Not an h1: every routed page below already declares its own, and two
                h1 elements per document leaves screen-reader users without a single
                unambiguous page title. The app name is a banner label, not the
                heading of the content. */}
            <p className="text-lg md:text-xl font-bold tracking-tight uppercase text-center md:text-left">Ismailia Health Connect</p>
            <p className="text-xs opacity-80 uppercase tracking-widest text-center md:text-left">Referral Coordination System</p>
          </div>
        </div>

        {/* Actions Section - Full width on mobile, right-aligned on desktop.
            md:w-max: overflow-x-auto resets this flex item's automatic min-width to 0,
            which let the header's flex layout shrink it well below its content's natural
            width even with plenty of spare room (it was getting squeezed to ~635px and
            leaving ~450px of dead space next to the logo on a 1440px viewport;
            flex-shrink-0 alone didn't stop it — the browser was still resolving
            width:auto via shrink-to-fit against the auto margin). width:max-content
            forces the box to size to its content instead. overflow-x-auto still applies
            below md, where the row genuinely needs to scroll.
            justify-start (not end): on the narrow viewports where this row *does*
            overflow, justify-end would align the *end* of the content into view and let
            the *start* spill past the left edge — unreachable, since browsers can't
            scroll left past 0. Left-packing keeps everything reachable by scrolling right. */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full md:w-max mx-auto md:ml-auto md:mr-0 justify-between pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!isOnline && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded text-red-100 text-xs font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" title="IndexedDB Offline Mode active">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
              {pendingSyncCount > 0 && <span className="bg-red-500/50 px-1.5 py-0.5 rounded ml-1">{pendingSyncCount} <span className="hidden sm:inline">pending upload</span></span>}
            </div>
          )}
          {isOnline && pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded text-amber-100 text-xs font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" title="Uploading IndexedDB data to server">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Pending Upload</span> ({pendingSyncCount})
            </div>
          )}
          {isOnline && pendingSyncCount === 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded text-emerald-100 text-xs font-bold uppercase tracking-wide shrink-0 whitespace-nowrap" title="IndexedDB fully synced with server">
              <Cloud className="w-3.5 h-3.5" />
              Database Synced
            </div>
          )}
          
          {/* Desktop: full identity. Always rendered from lg up. */}
          <button
            onClick={openProfile}
            className="hidden lg:flex flex-col items-end hover:opacity-80 transition-opacity text-left shrink-0 min-w-0 max-w-[16rem]"
            title={`${user.name} — ${user.role?.replace(/_/g, ' ')}${facility ? ` • ${facility.name}` : ''}`}
          >
            <span className="text-xs font-semibold truncate max-w-full">{user.name}</span>
            <span className="text-xs bg-blue-800 px-2 py-0.5 rounded truncate max-w-full">{user.role?.replace(/_/g, ' ')} {facility ? `• ${facility.name}` : ''}</span>
          </button>

          {/* Mobile/tablet fallback: identity is still visible and profile still reachable. */}
          <button
            onClick={openProfile}
            className="lg:hidden flex items-center gap-2 min-h-[40px] px-2 rounded hover:bg-blue-800/60 transition-colors shrink-0 min-w-0 max-w-[45vw]"
            aria-label={`Profile settings for ${user.name}, ${user.role?.replace(/_/g, ' ')}`}
          >
            <span className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center shrink-0" aria-hidden="true">
              <User className="w-4 h-4" />
            </span>
            <span className="flex flex-col items-start min-w-0 text-left">
              <span className="text-xs font-semibold leading-tight truncate max-w-full">{user.name}</span>
              <span className="text-xs uppercase tracking-wide opacity-80 leading-tight truncate max-w-full">{user.role?.replace(/_/g, ' ')}</span>
            </span>
          </button>

          <div className="hidden lg:block h-10 w-px bg-blue-700 shrink-0 mx-2"></div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 flex-1 md:flex-none whitespace-nowrap px-1 w-full md:w-auto">
            <button
              onClick={() => setShowHotline(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 min-h-[40px] rounded transition-colors text-xs font-bold uppercase tracking-wider shadow-sm"
              title="Emergency Hotline"
              aria-label="Emergency Hotline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Hotline</span>
            </button>
            <div className="hidden sm:block h-6 w-px bg-blue-700 mx-1"></div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center justify-center min-w-[40px] min-h-[40px] text-blue-200 hover:text-white transition-colors"
              title="Toggle Theme"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link
              to="/notifications"
              className="relative flex items-center justify-center min-w-[40px] min-h-[40px] text-blue-200 hover:text-white transition-colors"
              aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : 'Notifications'}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-xs font-bold leading-none">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogoutClick}
              className="flex items-center justify-center min-w-[40px] min-h-[40px] text-blue-200 hover:text-white transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-w-0 w-full">
        {/* Sidebar Navigation */}
        <aside className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 shrink-0 hidden sm:flex">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-r-4 border-blue-900 dark:border-blue-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-r-4 border-transparent'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase">{item.name}</span>
                </Link>
              );
            })}
            {isDoctor && (
              <Link
                to="/referrals/new"
                className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                  location.pathname.startsWith('/referrals/new')
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-r-4 border-blue-900 dark:border-blue-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-r-4 border-transparent'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">New Referral</span>
              </Link>
            )}
            {isNurse && (
              <Link
                to="/admissions/new"
                className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                  location.pathname.startsWith('/admissions/new')
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-r-4 border-blue-900 dark:border-blue-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-r-4 border-transparent'
                }`}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">Direct Admit</span>
              </Link>
            )}
          </nav>
          
          <div className="mt-auto p-4 bg-slate-900 dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-lg">
            <div className="text-xs text-blue-300 font-bold uppercase mb-2">Session</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white">Role</span>
                <span className="text-xs text-green-400">{(user.role || 'Unknown').replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white">Verified</span>
                <span className="text-xs text-green-400">{user.verified ? 'YES' : 'NO'}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 overflow-auto p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex flex-col items-center py-2 px-4 shrink-0 snap-center min-w-[80px] min-h-[40px] text-xs uppercase font-bold tracking-wider ${
                    isActive ? 'text-blue-900 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <item.icon className="h-6 w-6 mb-1" />
                  {item.name}
                </Link>
              );
            })}
            {isDoctor && (
            <Link
               to="/referrals/new"
               className={`flex flex-col items-center py-2 px-4 shrink-0 snap-center min-w-[80px] min-h-[40px] text-xs uppercase font-bold tracking-wider ${
                  location.pathname.startsWith('/referrals/new') ? 'text-blue-900 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
               }`}
            >
               <PlusCircle className="h-6 w-6 mb-1" />
               New
            </Link>
            )}
            {isNurse && (
              <Link
                 to="/admissions/new"
                 className={`flex flex-col items-center py-2 px-4 shrink-0 snap-center min-w-[80px] min-h-[40px] text-xs uppercase font-bold tracking-wider ${
                    location.pathname.startsWith('/admissions/new') ? 'text-blue-900 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                 }`}
              >
                 <PlusCircle className="h-6 w-6 mb-1" />
                 Admit
              </Link>
            )}
          </div>
          {/* Fade cue: signals there are more nav items to scroll to on narrow screens. */}
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent" aria-hidden="true" />
        </div>
      </div>

      {showHotline && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowHotline(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hotline-dialog-title"
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-critical-500 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-critical-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" aria-hidden="true" />
                <h2 id="hotline-dialog-title" className="text-sm font-bold uppercase tracking-wider">Emergency Hotline</h2>
              </div>
              <button onClick={() => setShowHotline(false)} className="text-critical-100 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center" aria-label="Close emergency hotline">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Clinical Leadership Directory</p>
              {hotlineContacts.length > 0 ? (
                <div className="space-y-3">
                  {hotlineContacts.map(contact => (
                    <div key={contact.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{contact.name}</p>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">{contact.role?.replace(/_/g, ' ')} {contact.department ? `• ${contact.department}` : ''}</p>
                        </div>
                        {contact.phoneNumber ? (
                          <a href={`tel:${contact.phoneNumber}`} className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold uppercase hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </a>
                        ) : (
                          <span className="text-xs uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">No Number</span>
                        )}
                      </div>
                      {contact.monthlySchedule && (
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 text-xs text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          <span className="font-bold uppercase mr-1">Schedule:</span>
                          {contact.monthlySchedule}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-950 rounded border border-dashed border-slate-200 dark:border-slate-800">No clinical leadership contacts found for this facility.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {showProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" aria-hidden="true" />
                <h2 id="profile-dialog-title" className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">My Profile Settings</h2>
              </div>
              <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center" aria-label="Close profile settings">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="profilePhone" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                <input
                  id="profilePhone"
                  type="tel"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="profileSchedule" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monthly Schedule & Availability</label>
                <textarea
                  id="profileSchedule"
                  value={profileSchedule}
                  onChange={e => setProfileSchedule(e.target.value)}
                  placeholder="E.g. Mondays & Wednesdays 8am-8pm, On-call weekends..."
                  rows={4}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-400 mt-1">This will be visible to other staff in the Network Directory to facilitate communication.</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showEndOfShift && (() => {
        const handover = buildHandover();
        return (
          <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col text-white overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="eos-title">
            <div className="px-4 sm:px-6 pt-5 pb-4 flex items-start justify-between shrink-0">
              <div>
                <h2 id="eos-title" className="text-lg font-heading font-semibold">End of shift</h2>
                <p className="text-xs text-white/60 mt-0.5">{user.name}{user.department ? ` · ${user.department}` : ''}</p>
              </div>
              <button
                onClick={() => setShowEndOfShift(false)}
                aria-label="Cancel, stay signed in"
                className="h-11 w-11 -mr-2 flex items-center justify-center rounded text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 px-4 sm:px-6 pb-4 space-y-3 max-w-lg w-full mx-auto">
              <div className="rounded-xl border border-white/15 bg-white/5 p-3.5 flex items-start gap-2.5">
                <CheckCircleIcon />
                <p className="text-sm text-white/85">Signed in since {signedInSince} on this phone. You will not be asked to sign in again.</p>
              </div>

              {handover ? (
                <>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/50">Handover, written for you</p>
                    <p className="text-[15px] leading-relaxed text-white/90 mt-1.5">{handover.summary}</p>
                  </div>

                  {handover.carryOver.length > 0 && (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-warning-400">Carry over</p>
                      <p className="text-[15px] text-white/90 mt-1.5">{handover.carryOver.join(', ')} — still moving, needs the next shift to pick it up.</p>
                    </div>
                  )}

                  {handover.watch.length > 0 && (
                    <div className="rounded-xl border border-white/15 bg-white/5 p-3.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-critical-400">Watch</p>
                      <p className="text-[15px] text-white/90 mt-1.5">{handover.watch.join(', ')} — escalated.</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-white/15 bg-white/5 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-white/50">Done this shift</p>
                    <p className="text-[15px] text-white/90 mt-1.5">{handover.doneThisShift} admission{handover.doneThisShift === 1 ? '' : 's'}/discharge{handover.doneThisShift === 1 ? '' : 's'} completed.</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/60">No handover summary for your role.</p>
              )}
            </div>

            <div className="shrink-0 px-4 sm:px-6 pb-6 pt-2 max-w-lg w-full mx-auto">
              <button
                onClick={handleConfirmHandover}
                disabled={signingOut}
                className="w-full min-h-[54px] rounded-xl bg-white text-slate-950 text-sm font-bold uppercase tracking-wide disabled:opacity-60"
              >
                {signingOut ? 'Signing out…' : 'Send handover to the day shift'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const CheckCircleIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0 mt-0.5 text-success-400" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
