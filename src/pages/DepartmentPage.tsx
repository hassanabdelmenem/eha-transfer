import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HodCockpit } from '../components/dashboard/HodCockpit';

export const DepartmentPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';

  if (!user || (user.role !== 'head_of_department' && !isAdmin)) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Access Denied. Head of Department privileges required.
      </div>
    );
  }

  if ((!user.facilityId || !user.department) && !isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Facility or Department configuration missing.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {user.department ? `${user.department} Department Console` : 'Department Console'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review incoming department referrals, manage shift delegations, and monitor active inpatients.
        </p>
      </div>

      <HodCockpit isDepartmentRoute={true} />
    </div>
  );
};
