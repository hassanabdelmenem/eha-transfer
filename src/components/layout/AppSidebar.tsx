import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Facility, Referral } from '../../types';
import { ROLE_CONFIGS } from './RoleBadge';
import {
  LayoutDashboard,
  Users,
  Plus,
  Archive,
  BookOpen,
  Bed,
  Activity,
  Settings,
  Phone,
  Sun,
  Moon,
  WifiOff,
  LogOut,
  Send,
  X,
  Bell,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { isNurseRole } from '../../types';
import { cn } from '../../lib/utils';
import { useI18n } from '../../i18n';
import { waitingOnYouCount } from '../../lib/waitingOnYou';

export interface AppSidebarProps {
  user: User;
  facility?: Facility;
  referrals: Referral[];
  isOnline: boolean;
  pendingSyncCount: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenProfile: () => void;
  onOpenHotline: () => void;
  /** Opens the end-of-shift handover; absent for roles that write no shift log. */
  onOpenHandover?: () => void;
  onLogoutClick: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
  theme: string;
  onToggleTheme: () => void;
}

// Facility-type words beside the facility name: shell.facilityType.* in the catalogue.
const FACILITY_TYPES = ['tertiary_care', 'district_hospital', 'primary_care', 'external_contracted'] as const;
const isFacilityType = (v: string): v is (typeof FACILITY_TYPES)[number] => (FACILITY_TYPES as readonly string[]).includes(v);

// The ink rail from the handoff's unified desktop (3d): persistent at lg and up,
// and the same component inside the phone's menu drawer. Flat rows, no section
// headings: the list is short enough that grouping would only add reading.
export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  facility,
  referrals,
  isOnline,
  pendingSyncCount,
  onOpenProfile,
  onOpenHotline,
  onOpenHandover,
  onLogoutClick,
  onCloseMobile,
  isMobile = false,
  theme,
  onToggleTheme,
}) => {
  const location = useLocation();
  const { t } = useI18n();

  const isDoctor = ['consultant', 'specialist', 'resident', 'clinician', 'er_official', 'medical_director', 'head_of_department', 'owner', 'system_admin'].includes(user.role);
  const isNurse = isNurseRole(user.role) || user.role === 'owner' || user.role === 'er_room';
  const isHeadOfDept = user.role === 'head_of_department' || user.role === 'owner';
  const isManager = ['hospital_manager', 'deputy_manager', 'medical_director'].includes(user.role);
  const isLeadership = ['hospital_manager', 'deputy_manager', 'medical_director', 'owner', 'system_admin'].includes(user.role);

  // One count on the rail, on the item that holds your work; the same number as
  // the role home's headline. Other items stay plain (owner decision, 29 Sep).
  const waitingCount = waitingOnYouCount(user, referrals) ?? 0;

  const isActivePath = (path: string) => {
    if (path === '/dashboard' || path === '/referrals') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const row = (active: boolean) =>
    cn(
      'flex min-h-[48px] w-full items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-300',
      active ? 'bg-white/12 text-paper' : 'text-white/70 hover:bg-white/[0.07] hover:text-paper'
    );

  const count = (n: number, active: boolean) =>
    n > 0 ? (
      <span className={cn('ms-auto min-w-[28px] rounded-full px-2 py-0.5 text-center text-[12px] font-bold tabular', active ? 'bg-paper text-ink' : 'bg-white/12 text-paper')}>
        <span className="sr-only">, </span>{n}
      </span>
    ) : null;

  const navLink = (to: string, Icon: React.ElementType, label: string, n = 0) => {
    const active = isActivePath(to);
    return (
      <Link key={to} to={to} onClick={onCloseMobile} className={row(active)} aria-current={active ? 'page' : undefined}>
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
        {count(n, active)}
      </Link>
    );
  };

  const roleLabel = user.role in ROLE_CONFIGS ? t(`role.${user.role}`) : user.role;

  return (
    <aside className="flex h-full w-[228px] flex-col bg-ink text-paper select-none max-lg:w-full" aria-label={t('rail.mainNavigation')}>
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-paper text-ink">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight">{t('rail.brand')}</span>
            <span className="block truncate text-[12.5px] text-white/60">{t('rail.brandSub')}</span>
          </span>
        </div>
        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t('rail.closeMenu')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-white/25 text-paper hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {(!isOnline || pendingSyncCount > 0) && (
        <p role="status" className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-warning-700 bg-warning-800/30 px-3 py-2 text-[12.5px] font-semibold text-warning-300">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!isOnline ? t('rail.offlineQueued', { count: pendingSyncCount }) : t('rail.sendingQueued', { count: pendingSyncCount })}
        </p>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {navLink("/dashboard", LayoutDashboard, isNurseRole(user.role) ? t('rail.beds') : t('rail.waitingOnYou'), waitingCount)}
        {navLink("/referrals", Users, t('rail.referrals'))}
        {isDoctor && navLink("/referrals/new", Plus, t('rail.newReferral'))}
        {navLink("/notifications", Bell, t('rail.inbox'))}
        {(isNurse || isLeadership) && navLink("/bed-management", Bed, t('rail.bedManagement'))}
        {isNurse && navLink("/admissions/new", ClipboardList, t('rail.directAdmit'))}
        {isHeadOfDept && navLink("/department", Activity, t('rail.department'))}
        {isManager && navLink("/reports", BarChart3, t('rail.reports'))}
        {navLink("/directory", BookOpen, t('rail.directory'))}
        {navLink("/archive", Archive, t('rail.archive'))}
        {isLeadership && navLink("/facility-settings", Settings, t('rail.facilitySettings'))}
        <button type="button" onClick={onOpenHotline} className={cn(row(false), 'text-start')}>
          <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('rail.emergencyHotline')}</span>
        </button>
        {onOpenHandover && (
          <button type="button" onClick={onOpenHandover} className={cn(row(false), 'text-start')}>
            <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('rail.endOfShift')}</span>
          </button>
        )}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/12 px-3 pt-3 pb-4">
        <button type="button" onClick={onOpenProfile} className="w-full rounded-[10px] px-3 py-2 text-start hover:bg-white/[0.07]" title={t('shell.profileHint')}>
          <span className="block truncate text-[14px] font-semibold">{user.name}</span>
          <span className="block truncate text-[12.5px] text-white/60">
            {roleLabel}{user.department ? <> · <bdi>{user.department}</bdi></> : null}
          </span>
          <span className="block text-[12.5px] leading-[1.35] text-white/60">
            <bdi>{facility?.name ?? t('rail.network')}</bdi>
            <span aria-hidden="true"> · </span>
            <span className="whitespace-nowrap">{facility?.type && isFacilityType(facility.type) ? t(`shell.facilityType.${facility.type}`) : t('shell.regionalFacility')}</span>
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? t('rail.toLight') : t('rail.toDark')}
            className="flex h-12 w-12 items-center justify-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-paper"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={onLogoutClick} className={cn(row(false), 'flex-1 text-[14px]')} title={t('rail.logOut')}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{t('rail.logOut')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
