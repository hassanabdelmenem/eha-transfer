import { Referral, User, isNurseRole } from '../types';
import { isAdmin } from './permissions';

/**
 * The number beside the rail's "Waiting on you" item. It must match the role
 * home's own headline, so the rules below mirror each cockpit's queue:
 *
 * - ER official / ER room: outbound cases to send plus inbound cases arriving
 *   ("N to send, M arriving").
 * - Manager roles: active escalations at the facility plus department-approved
 *   cases waiting on the manager's signature.
 * - Head of department: pending cases for the department at this facility.
 * - Admins: system-level escalations ("N only you can fix").
 * - Nurses: null. Their home is "Beds", and a count there would read as beds.
 * - Everyone else (clinicians): their own referrals that need them (postponed,
 *   or consented with an escort doctor still to name).
 */
const ENDED = ['admitted', 'discharged', 'rejected', 'cancelled'];

const atFacility = (r: Referral, facilityId: string) =>
  r.referringFacilityId === facilityId ||
  r.receivingFacilityId === facilityId ||
  (r.receivingFacilityId === 'auto' && !!r.candidateFacilityIds?.includes(facilityId));

export function waitingOnYouCount(user: Pick<User, 'id' | 'role' | 'facilityId' | 'department'>, referrals: Referral[]): number | null {
  const { role, facilityId, department } = user;

  if (isNurseRole(role)) return null;

  if (isAdmin(user)) {
    return referrals.filter(r => r.isEscalated && r.escalationLevel === 'system' && !ENDED.includes(r.status)).length;
  }

  if (role === 'er_official' || role === 'er_room') {
    if (!facilityId) return 0;
    const toSend = referrals.filter(r => r.referringFacilityId === facilityId && ['accepted', 'patient_consented'].includes(r.status)).length;
    const arriving = referrals.filter(r => r.receivingFacilityId === facilityId && r.status === 'in_transit').length;
    return toSend + arriving;
  }

  if (role === 'hospital_manager' || role === 'deputy_manager' || role === 'medical_director') {
    if (!facilityId) return 0;
    const ids = new Set<string>();
    for (const r of referrals) {
      if (!atFacility(r, facilityId)) continue;
      if (r.isEscalated && !ENDED.includes(r.status)) ids.add(r.id);
      else if (r.status === 'dept_approved' && r.receivingFacilityId === facilityId) ids.add(r.id);
    }
    return ids.size;
  }

  if (role === 'head_of_department') {
    if (!facilityId || !department) return 0;
    return referrals.filter(
      r =>
        r.status === 'pending' &&
        !!r.receivingDepartments?.includes(department) &&
        (r.receivingFacilityId === facilityId || (r.receivingFacilityId === 'auto' && !!r.candidateFacilityIds?.includes(facilityId)))
    ).length;
  }

  return referrals.filter(
    r =>
      r.referringUserId === user.id &&
      (r.status === 'postponed' || (r.status === 'patient_consented' && r.requiresAccompanyingDoctor && !r.accompanyingDoctor))
  ).length;
}
