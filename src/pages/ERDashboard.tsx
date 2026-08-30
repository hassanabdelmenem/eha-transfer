import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ERCockpit } from '../components/dashboard/ERCockpit';

export const ERDashboard: React.FC = () => {
  const { user } = useAuth();
  const { facilitiesById } = useData();

  if (!user) return null;

  const facilityName = user.facilityId ? facilitiesById.get(user.facilityId)?.name || 'Facility' : 'Facility';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
          ER Room & Dispatch Console
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {facilityName} · Track active emergency referrals, validate escort doctors, and manage ambulance transits.
        </p>
      </div>

      <ERCockpit />
    </div>
  );
};
