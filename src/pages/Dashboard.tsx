import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { isNurseRole, isDoctorRole } from '../types';
import { ReferralList } from '../components/referrals/ReferralList';
import { DashboardStatGrid } from '../components/dashboard/DashboardStatGrid';
import { ClinicianCockpit } from '../components/dashboard/ClinicianCockpit';
import { HodCockpit } from '../components/dashboard/HodCockpit';
import { ManagerCockpit } from '../components/dashboard/ManagerCockpit';
import { ERCockpit } from '../components/dashboard/ERCockpit';
import { NurseCockpit } from '../components/dashboard/NurseCockpit';
import { AdminCockpit } from '../components/dashboard/AdminCockpit';
import { AlertTriangle, ArrowDownUp } from 'lucide-react';
import { useAudioAlert } from '../hooks/useAudioAlert';
import { BedCapacityGrid } from '../components/beds/BedCapacityGrid';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, loading, facilitiesById } = useData();
  const [prioritySort, setPrioritySort] = useState(false);

  const facilityReferrals = useMemo(() => {
    if (!user) return [];
    if (user.role === 'system_admin' || user.role === 'owner') return referrals;
    return referrals.filter(
      r =>
        r.referringFacilityId === user.facilityId ||
        r.receivingFacilityId === user.facilityId ||
        (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || ''))
    );
  }, [referrals, user]);

  const pendingEmergencies = useMemo(
    () =>
      facilityReferrals.filter(
        r => r.priority === 'emergency' && (r.status === 'pending' || r.status === 'in_transit')
      ),
    [facilityReferrals]
  );

  // Trigger audio alert when pending emergencies exist
  useAudioAlert(pendingEmergencies.length > 0);

  if (!user) return null;

  // Render role-tailored clinical cockpit workspace
  const renderRoleCockpit = () => {
    if (user.role === 'system_admin' || user.role === 'owner') {
      return <AdminCockpit />;
    }
    if (user.role === 'er_room' || user.role === 'er_official') {
      return <ERCockpit />;
    }
    if (
      user.role === 'hospital_manager' ||
      user.role === 'deputy_manager' ||
      user.role === 'medical_director'
    ) {
      return <ManagerCockpit />;
    }
    if (user.role === 'head_of_department') {
      return <HodCockpit />;
    }
    if (isNurseRole(user.role)) {
      return <NurseCockpit />;
    }
    return <ClinicianCockpit />;
  };

  return (
    <div className="space-y-6">
      {/* Role-Specific Workspace Cockpit */}
      {renderRoleCockpit()}

      {/* Global Overview Section (DOM invariant: page.getByRole('heading', { name: /overview/i })) */}
      <section aria-labelledby="dashboard-overview-heading" className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h1
            id="dashboard-overview-heading"
            className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
          >
            Overview
          </h1>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Updates
          </div>
        </div>

        {/* Emergency Alert Banner if emergencies are pending */}
        {pendingEmergencies.length > 0 && (
          <div className="bg-critical-50 dark:bg-critical-950/40 border border-critical-200 dark:border-critical-900/60 p-4 rounded-2xl flex items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-5 w-5 text-critical-600 dark:text-critical-400 shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-critical-900 dark:text-critical-200">
                Critical Emergency Alerts Active
              </h3>
              <p className="text-xs text-critical-700 dark:text-critical-400 mt-0.5">
                There {pendingEmergencies.length === 1 ? 'is 1' : `are ${pendingEmergencies.length}`}{' '}
                high-priority emergency transfer{pendingEmergencies.length === 1 ? '' : 's'} requiring
                immediate attention.
              </p>
            </div>
          </div>
        )}

        {/* Standardized KPI Metric Tiles */}
        <DashboardStatGrid facilityReferrals={facilityReferrals} loading={loading} />

        {/* Bed Capacity Overview (New detail added) */}
        {user.facilityId && facilitiesById.get(user.facilityId) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xs p-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
              Live Bed Capacity
            </h3>
            <BedCapacityGrid 
              facility={facilitiesById.get(user.facilityId)!}
              capacities={facilitiesById.get(user.facilityId)!.capacity}
              onCapacityChange={() => {}}
              disabled={true}
            />
          </div>
        )}

        {/* Incoming Referrals Grid Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Incoming Referrals Grid
            </h3>
            <button
              type="button"
              onClick={() => setPrioritySort(!prioritySort)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                prioritySort
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Priority Sort</span>
            </button>
          </div>
          <div className="p-0 overflow-auto">
            <ReferralList limit={5} facilityId={user.facilityId} prioritySort={prioritySort} />
          </div>
        </div>
      </section>
    </div>
  );
};
