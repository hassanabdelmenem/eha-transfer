import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { BedOccupancyHeatmap } from '../components/dashboard/BedOccupancyHeatmap';
import { FacilityAnalyticsCharts } from '../components/dashboard/FacilityAnalyticsCharts';

export const MANAGER_ROLES = ['hospital_manager', 'deputy_manager', 'medical_director'] as const;
export const isManagerRole = (role: string | undefined) => (MANAGER_ROLES as readonly string[]).includes(role ?? '');

/**
 * The manager's wider picture (network free beds and facility activity), moved
 * off the role home so the queue column holds only work (owner decision, 29 Sep).
 */
export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilities, directAdmissions } = useData();

  const facilityReferrals = useMemo(() => {
    const fid = user?.facilityId;
    if (!fid) return [];
    return referrals.filter(
      r =>
        r.referringFacilityId === fid ||
        r.receivingFacilityId === fid ||
        (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(fid))
    );
  }, [referrals, user?.facilityId]);

  const facilityAdmissions = useMemo(
    () => (user?.facilityId ? directAdmissions.filter(a => a.facilityId === user.facilityId) : []),
    [directAdmissions, user?.facilityId]
  );

  if (!user) return null;
  if (!isManagerRole(user.role)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-[960px]">
      <ScreenHeader title="Reports" subtitle="Network free beds and your facility's activity" />
      <div className="space-y-4">
        <BedOccupancyHeatmap facilities={facilities} />
        <FacilityAnalyticsCharts
          facilityReferrals={facilityReferrals}
          facilityAdmissions={facilityAdmissions}
          userFacilityId={user.facilityId}
        />
      </div>
    </div>
  );
};
