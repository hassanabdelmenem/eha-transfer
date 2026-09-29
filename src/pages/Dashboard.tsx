import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { isNurseRole } from '../types';
import { ClinicianCockpit } from '../components/dashboard/ClinicianCockpit';
import { HodCockpit } from '../components/dashboard/HodCockpit';
import { ManagerCockpit } from '../components/dashboard/ManagerCockpit';
import { ERCockpit } from '../components/dashboard/ERCockpit';
import { NurseCockpit } from '../components/dashboard/NurseCockpit';
import { useAudioAlert } from '../hooks/useAudioAlert';
import { CaseWorkspace } from '../components/layout/CaseWorkspace';

/**
 * The role home. Each role opens on the cases blocked on that person, in
 * workflow order; the home IS the queue, with no KPI overview above or around it.
 */
export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals } = useData();

  const hasPendingEmergency = useMemo(() => {
    if (!user) return false;
    const mine = (r: (typeof referrals)[number]) =>
      user.role === 'system_admin' ||
      user.role === 'owner' ||
      r.referringFacilityId === user.facilityId ||
      r.receivingFacilityId === user.facilityId ||
      (r.receivingFacilityId === 'auto' && !!r.candidateFacilityIds?.includes(user.facilityId || ''));
    return referrals.some(r => mine(r) && r.priority === 'emergency' && (r.status === 'pending' || r.status === 'in_transit'));
  }, [referrals, user]);

  // Audible alert while an emergency is pending or on the road.
  useAudioAlert(hasPendingEmergency);

  if (!user) return null;

  // Wide screens: the queue column with the selected case beside it (3d).
  return <CaseWorkspace>{roleHome(user.role)}</CaseWorkspace>;
};

function roleHome(role: string) {
  if (role === 'er_room' || role === 'er_official') return <ERCockpit />;
  if (role === 'hospital_manager' || role === 'deputy_manager' || role === 'medical_director') return <ManagerCockpit />;
  if (role === 'head_of_department') return <HodCockpit />;
  if (isNurseRole(role as Parameters<typeof isNurseRole>[0])) return <NurseCockpit />;
  return <ClinicianCockpit />;
}
