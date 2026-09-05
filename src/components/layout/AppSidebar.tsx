import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Facility, Referral } from '../../types';
import { RoleBadge } from './RoleBadge';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Archive,
  BookOpen,
  Bed,
  Activity,
  Settings,
  Phone,
  Sun,
  Moon,
  Cloud,
  Database,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Shield,
  Hospital,
  Flame,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { isDoctorRole, isNurseRole } from '../../types';
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
  onLogoutClick: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
  theme: string;
  onToggleTheme: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  facility,
  referrals,
  isOnline,
  pendingSyncCount,
  unreadNotifsCount,
  collapsed = false,
  onToggleCollapse,
  onOpenProfile,
  onOpenHotline,
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

  const [adminExpanded, setAdminExpanded] = useState(false);

  // Active referrals count for user's facility or network
  const activeReferralsCount = referrals.filter(r =>
    !['admitted', 'discharged', 'cancelled', 'rejected'].includes(r.status)
  ).length;

  const escalatedCount = referrals.filter(r => r.isEscalated).length;

  const isActivePath = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/referrals') return location.pathname === '/referrals';
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const navLinkClass = (active: boolean) =>
    cn(
      'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
      active
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25 font-semibold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white',
      collapsed && !isMobile && 'justify-center px-2.5'
    );

  const formatFacilityType = (type?: string) => {
    switch (type) {
      case 'tertiary_care':
        return 'Tertiary Center';
      case 'district_hospital':
        return 'District Hospital';
      case 'primary_care':
        return 'Primary Care';
      case 'external_contracted':
        return 'Contracted Facility';
      default:
        return 'Regional Facility';
    }
  };

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 select-none',
        collapsed && !isMobile ? 'w-20' : 'w-64 sm:w-72'
      )}
    >
      {/* Brand & Hospital Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                Ismailia Health
              </h1>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                EHA Transfer Portal
              </p>
            </div>
          )}
        </div>

        {isMobile && onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : null}
      </div>

      {/* Facility Context Card & Sync Pill */}
      {(!collapsed || isMobile) && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Hospital className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {facility?.name || 'Network Central'}
                </span>
              </div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0">
                {formatFacilityType(facility?.type)}
              </span>
            </div>

            {/* Sync State */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
              {!isOnline ? (
                <span className="flex items-center gap-1.5 text-critical-600 dark:text-critical-400 font-medium">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline ({pendingSyncCount})</span>
                </span>
              ) : pendingSyncCount > 0 ? (
                <span className="flex items-center gap-1.5 text-warning-600 dark:text-warning-400 font-medium">
                  <Database className="w-3 h-3 animate-pulse" />
                  <span>Syncing {pendingSyncCount}…</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-success-600 dark:text-success-400 font-medium">
                  <Cloud className="w-3 h-3" />
                  <span>Online & Synced</span>
                </span>
              )}
              {user.department && (
                <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] truncate max-w-[90px]">
                  {user.department}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links (Categorized) */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Section 1: Clinical Workflow */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Clinical Workflow
            </p>
          )}
          <div className="space-y-1">
            <Link
              to="/dashboard"
              onClick={onCloseMobile}
              className={navLinkClass(isActivePath('/dashboard'))}
              title={collapsed ? "Dashboard" : undefined}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" aria-hidden="true" />
              {(!collapsed || isMobile) && <span className="flex-1 truncate">Dashboard</span>}
            </Link>

            <Link
              to="/referrals"
              onClick={onCloseMobile}
              className={navLinkClass(isActivePath('/referrals'))}
              title={collapsed ? "Referrals" : undefined}
            >
              <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1 truncate">Referrals</span>
                  {activeReferralsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {activeReferralsCount}
                    </span>
                  )}
                </>
              )}
            </Link>

            {isDoctor && (
              <Link
                to="/referrals/new"
                onClick={onCloseMobile}
                className={navLinkClass(isActivePath('/referrals/new'))}
                title={collapsed ? "New Referral" : undefined}
              >
                <PlusCircle className="w-5 h-5 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                {(!collapsed || isMobile) && <span className="flex-1 truncate font-semibold">New Referral</span>}
              </Link>
            )}

            <Link
              to="/archive"
              onClick={onCloseMobile}
              className={navLinkClass(isActivePath('/archive'))}
              title={collapsed ? "Archive" : undefined}
            >
              <Archive className="w-5 h-5 shrink-0" aria-hidden="true" />
              {(!collapsed || isMobile) && <span className="flex-1 truncate">Archive</span>}
            </Link>
          </div>
        </div>

        {/* Section 2: Emergency & Triage */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Emergency & Triage
            </p>
          )}
          <div className="space-y-1">
            {isNurse && (
              <Link
                to="/admissions/new"
                onClick={onCloseMobile}
                className={navLinkClass(isActivePath('/admissions/new'))}
                title={collapsed ? "Direct Admit" : undefined}
              >
                <PlusCircle className="w-5 h-5 shrink-0 text-emerald-500" aria-hidden="true" />
                {(!collapsed || isMobile) && <span className="flex-1 truncate">Direct Admit</span>}
              </Link>
            )}

            <button
              type="button"
              onClick={onOpenHotline}
              className={cn(
                'w-full group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors text-critical-600 dark:text-critical-400 hover:bg-critical-50 dark:hover:bg-critical-950/40',
                collapsed && !isMobile && 'justify-center px-2.5'
              )}
              title={collapsed ? "Emergency Hotline" : undefined}
            >
              <Phone className="w-5 h-5 shrink-0 animate-pulse" aria-hidden="true" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1 text-left truncate font-semibold">Emergency Hotline</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-critical-100 dark:bg-critical-900/50 text-critical-700 dark:text-critical-300">
                    24/7
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 3: Hospital Capacity */}
        <div>
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Hospital Capacity
            </p>
          )}
          <div className="space-y-1">
            {(isNurse || isLeadership) && (
              <Link
                to="/bed-management"
                onClick={onCloseMobile}
                className={navLinkClass(isActivePath('/bed-management'))}
                title={collapsed ? "Bed Management" : undefined}
              >
                <Bed className="w-5 h-5 shrink-0" aria-hidden="true" />
                {(!collapsed || isMobile) && <span className="flex-1 truncate">Bed Management</span>}
              </Link>
            )}

            <Link
              to="/directory"
              onClick={onCloseMobile}
              className={navLinkClass(isActivePath('/directory'))}
              title={collapsed ? "Network Directory" : undefined}
            >
              <BookOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
              {(!collapsed || isMobile) && <span className="flex-1 truncate">Network Directory</span>}
            </Link>
          </div>
        </div>

        {/* Section 4: Administration & Leadership */}
        {(isHeadOfDept || isLeadership) && (
          <div>
            {(!collapsed || isMobile) && (
              <button
                type="button"
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="w-full flex items-center justify-between px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <span>Settings & Admin</span>
                {adminExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            {((!collapsed || isMobile) ? adminExpanded : true) && (
              <div className="space-y-1">
                {isHeadOfDept && (
                  <Link
                    to="/department"
                    onClick={onCloseMobile}
                    className={navLinkClass(isActivePath('/department'))}
                    title={collapsed ? "Department" : undefined}
                  >
                    <Activity className="w-5 h-5 shrink-0" aria-hidden="true" />
                    {(!collapsed || isMobile) && <span className="flex-1 truncate">Department</span>}
                  </Link>
                )}

                {isLeadership && (
                  <Link
                    to="/facility-settings"
                    onClick={onCloseMobile}
                    className={navLinkClass(isActivePath('/facility-settings'))}
                    title={collapsed ? "Facility Settings" : undefined}
                  >
                    <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />
                    {(!collapsed || isMobile) && <span className="flex-1 truncate">Facility Settings</span>}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: User Profile & Quick Actions */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-1.5">
        {/* User Card */}
        <button
          type="button"
          onClick={onOpenProfile}
          className={cn(
            'w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
            collapsed && !isMobile && 'justify-center p-2'
          )}
          title="My Profile & On-Call Schedule"
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {user.name}
              </p>
              <div className="mt-0.5">
                <RoleBadge role={user.role} size="sm" showIcon={false} />
              </div>
            </div>
          )}
        </button>

        {/* Theme Toggle & Sign Out Button */}
        <div className={cn(
          "flex items-center gap-1",
          collapsed && !isMobile ? "flex-col" : "justify-between pt-1"
        )}>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onLogoutClick}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-critical-600 dark:hover:text-critical-400 transition-colors",
              collapsed && !isMobile && "px-2 py-2"
            )}
            title="Log out"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            {(!collapsed || isMobile) && <span>Log out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
