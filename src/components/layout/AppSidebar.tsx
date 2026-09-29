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
} from 'lucide-react';
import { isNurseRole } from '../../types';
import { cn } from '../../lib/utils';

export interface AppSidebarProps {
  user: User;
  facility?: Facility;
  referrals: Referral[];
  isOnline: boolean;
  pendingSyncCount: number;
  unreadNotifsCount: number;
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

const FACILITY_TYPE_LABELS: Record<string, string> = {
  tertiary_care: 'Tertiary Center',
  district_hospital: 'District Hospital',
  primary_care: 'Primary Care',
  external_contracted: 'Contracted Facility',
};

// The ink rail from the handoff's unified desktop (3d): persistent at lg and up,
// and the same component inside the phone's menu drawer. Flat rows, no section
// headings: the list is short enough that grouping would only add reading.
export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  facility,
  referrals,
  isOnline,
  pendingSyncCount,
  unreadNotifsCount,
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

  const isDoctor = ['consultant', 'specialist', 'resident', 'clinician', 'er_official', 'medical_director', 'head_of_department', 'owner', 'system_admin'].includes(user.role);
  const isNurse = isNurseRole(user.role) || user.role === 'owner' || user.role === 'er_room';
  const isHeadOfDept = user.role === 'head_of_department' || user.role === 'owner';
  const isLeadership = ['hospital_manager', 'deputy_manager', 'medical_director', 'owner', 'system_admin'].includes(user.role);

  const activeReferralsCount = referrals.filter(r => !['admitted', 'discharged', 'cancelled', 'rejected'].includes(r.status)).length;

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
      <span className={cn('ml-auto min-w-[28px] rounded-full px-2 py-0.5 text-center text-[12px] font-bold tabular', active ? 'bg-paper text-ink' : 'bg-white/12 text-paper')}>
        {n}
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

  const roleLabel = ROLE_CONFIGS[user.role]?.label ?? user.role;

  return (
    <aside className="flex h-full w-[228px] flex-col bg-ink text-paper select-none max-lg:w-full" aria-label="Main navigation">
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-paper text-ink">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight">Ismailia Health</span>
            <span className="block truncate text-[12.5px] text-white/60">Connect</span>
          </span>
        </div>
        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-white/25 text-paper hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {(!isOnline || pendingSyncCount > 0) && (
        <p role="status" className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-warning-700 bg-warning-800/30 px-3 py-2 text-[12.5px] font-semibold text-warning-300">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!isOnline ? `Offline · ${pendingSyncCount} queued` : `Sending ${pendingSyncCount} queued…`}
        </p>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {navLink("/dashboard", LayoutDashboard, isNurseRole(user.role) ? "Beds" : "Waiting on you")}
        {navLink("/referrals", Users, "Referrals", activeReferralsCount)}
        {isDoctor && navLink("/referrals/new", Plus, "New Referral")}
        {navLink("/notifications", Bell, "Inbox", unreadNotifsCount)}
        {(isNurse || isLeadership) && navLink("/bed-management", Bed, "Bed Management")}
        {isNurse && navLink("/admissions/new", ClipboardList, "Direct Admit")}
        {isHeadOfDept && navLink("/department", Activity, "Department")}
        {navLink("/directory", BookOpen, "Network Directory")}
        {navLink("/archive", Archive, "Archive")}
        {isLeadership && navLink("/facility-settings", Settings, "Facility Settings")}
        <button type="button" onClick={onOpenHotline} className={cn(row(false), 'text-left')}>
          <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="truncate">Emergency Hotline</span>
        </button>
        {onOpenHandover && (
          <button type="button" onClick={onOpenHandover} className={cn(row(false), 'text-left')}>
            <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">End of shift</span>
          </button>
        )}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/12 px-3 pt-3 pb-4">
        <button type="button" onClick={onOpenProfile} className="w-full rounded-[10px] px-3 py-2 text-left hover:bg-white/[0.07]" title="My Profile & On-Call Schedule">
          <span className="block truncate text-[14px] font-semibold">{user.name}</span>
          <span className="block truncate text-[12.5px] text-white/60">
            {roleLabel}{user.department ? ` · ${user.department}` : ''}
          </span>
          <span className="block text-[12.5px] leading-[1.35] text-white/60">
            <span>{facility?.name ?? 'Network'}</span>
            <span aria-hidden="true"> · </span>
            <span className="whitespace-nowrap">{FACILITY_TYPE_LABELS[facility?.type ?? ''] ?? 'Regional Facility'}</span>
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-12 w-12 items-center justify-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-paper"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={onLogoutClick} className={cn(row(false), 'flex-1 text-[14px]')} title="Log out">
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
