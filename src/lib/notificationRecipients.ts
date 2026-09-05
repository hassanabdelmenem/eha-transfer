import { Role } from '../types';

/**
 * Who actually receives a fanned-out notification, given the caller's targeting
 * params (facility scope, role/department broadcast, named individuals) and one
 * candidate user plus their facility's on-call shift assignments.
 *
 * Pulled out of DataContext's createNotification so the exact same verdict is
 * reachable from the Cloud Function in functions/src/notificationRecipients.ts,
 * which fans out identically but resolves its candidate users via Firestore
 * queries instead of an in-memory `users` array. That Function's copy is a
 * deliberate, self-contained duplicate for the same reason functions/src/sla.ts
 * is (see its header) -- src/lib/sla.test.ts's parity block is the template;
 * this module's parity block lives in the same file.
 */
export interface NotificationRecipientCandidate {
  id: string;
  role: Role;
  facilityId?: string;
  department?: string;
}

export interface RecipientShiftAssignment {
  assignedUserId: string | null;
  department: string;
}

export interface NotificationTargetParams {
  /** Already resolved by the caller: `facilityIds ?? [facilityId]`. */
  facilityIds: string[];
  targetRoles?: Role[];
  departments?: string[];
  targetUserIds?: string[];
}

/** Roles eligible to stand in for an absent head_of_department via shiftAssignments. */
export const DELEGATABLE_ON_CALL_ROLES: readonly Role[] = ['consultant', 'specialist', 'resident'];

export function isNotificationRecipient(
  user: NotificationRecipientCandidate,
  /** This user's own facility's shift assignments only -- the caller looks these
   *  up keyed by `user.facilityId`, not by the first id in `facilityIds`, so
   *  delegated on-call cover still resolves in a multi-facility fan-out. */
  userFacilityShiftAssignments: RecipientShiftAssignment[],
  params: NotificationTargetParams
): boolean {
  // Named individuals (e.g. the doctor who raised the referral) always get it,
  // regardless of role or department -- those filters exist to scope a
  // role-based broadcast, not to gate someone addressed by name.
  if (params.targetUserIds?.includes(user.id)) return true;
  if (user.role === 'owner' || user.role === 'system_admin') return true;
  if (!user.facilityId || !params.facilityIds.includes(user.facilityId)) return false;

  let isDelegatedTarget = false;
  if (params.targetRoles?.includes('head_of_department') && DELEGATABLE_ON_CALL_ROLES.includes(user.role)) {
    const assignment = userFacilityShiftAssignments.find(s =>
      s.assignedUserId === user.id &&
      (!params.departments || params.departments.includes(s.department))
    );
    if (assignment) {
      isDelegatedTarget = true;
    }
  }

  if (params.targetRoles && !params.targetRoles.includes(user.role) && !isDelegatedTarget) return false;
  // A delegated target is covering the requested department per shiftAssignments,
  // already confirmed above -- their own department must not be re-checked here,
  // or on-call coverage for a department other than their own never notifies.
  if (!isDelegatedTarget && params.departments && user.department && !params.departments.includes(user.department)) return false;
  return true;
}
