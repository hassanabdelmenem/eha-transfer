import type { Referral, ShiftAssignment, User } from '../types';
import { isAdmin } from './permissions';
import { DELEGATABLE_ON_CALL_ROLES } from './notificationRecipients';

export interface EscortAuthority {
  allowed: boolean;
  /** Set when the user acts as the sending department's shift delegate: the rules
   *  read this assignment to verify the delegation (written into accompanyingDoctor). */
  viaShiftAssignmentId?: string;
}

/**
 * Who records a transfer's escort doctor (name and phone), after the patient
 * consents and before dispatch. Owner decision, 3 Oct 2026: the head of the
 * department the patient leaves (`referringDepartment`) at the sending facility,
 * or that department's current shift delegate; admins as a fallback. Not ER-room
 * staff, and not the receiving facility.
 *
 * Mirrors firestore.rules accompanyingDoctorWriteAuthorized() exactly, so the
 * screen never offers a form the rules would refuse. Referrals made before
 * `referringDepartment` existed fall back to any head of department at the
 * sending facility, as the rules do.
 */
export function escortAuthority(
  user: User | null | undefined,
  referral: Pick<Referral, 'referringFacilityId' | 'referringDepartment'>,
  shiftAssignments: ShiftAssignment[]
): EscortAuthority {
  if (!user) return { allowed: false };
  if (isAdmin(user)) return { allowed: true };
  if (!user.verified || !user.facilityId || user.facilityId !== referral.referringFacilityId) return { allowed: false };

  const dept = referral.referringDepartment;
  if (user.role === 'head_of_department' && (!dept || user.department === dept)) return { allowed: true };

  if (DELEGATABLE_ON_CALL_ROLES.includes(user.role)) {
    const cover = shiftAssignments.find(s =>
      s.facilityId === referral.referringFacilityId
      && s.assignedUserId === user.id
      && (!dept || s.department === dept)
    );
    if (cover) return { allowed: true, viaShiftAssignmentId: cover.id };
  }
  return { allowed: false };
}
