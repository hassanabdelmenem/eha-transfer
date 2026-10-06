import { Facility, Referral, Role } from '../types';
import { SLA_MINUTES, needsAutoEscalation } from './sla';
import { CapacityEscalationReason, capacityEscalationReason, describeCapacityEscalation } from './routing';
import { notificationText, type NotificationKey, type NotificationVars } from '../i18n/notifications';

/**
 * The escalation rules, shared by the two writers that apply them:
 *
 * - the in-app sweep in DataContext (every 30s while someone is signed in), and
 * - scripts/escalation-sweep.ts, run on a timer by
 *   .github/workflows/escalation-sweep.yml, so a referral raised at 3am with
 *   nobody signed in still escalates.
 *
 * Both re-check the condition inside a transaction against the stored document,
 * so whichever gets there first wins and the other is a no-op. Keeping the
 * update and the notification here means the two cannot drift: the same event
 * produces the same document whichever writer ran.
 */
export type EscalationAction =
  | { kind: 'sla' }
  | { kind: 'capacity'; reason: CapacityEscalationReason };

type SweepReferral = Pick<
  Referral,
  'status' | 'priority' | 'requiredBedType' | 'createdAt' | 'isEscalated' | 'autoEscalationSuppressed' |
  'receivingDepartments' | 'receivingFacilityId' | 'candidateFacilityIds' | 'referringFacilityId'
>;

/**
 * What, if anything, should happen to this referral now. SLA silence first
 * (it is the older, facility-level path); otherwise a pending referral with
 * nowhere to go escalates to system level. `facilitiesLoaded` must be true only
 * when `facilitiesById` holds real data: a verdict computed from an empty map
 * would escalate everything.
 */
export function escalationFor(
  r: SweepReferral,
  facilitiesById: Map<string, Facility>,
  now: number,
  facilitiesLoaded: boolean
): EscalationAction | null {
  if (needsAutoEscalation(r, now)) return { kind: 'sla' };
  if (!facilitiesLoaded) return null;
  if (r.status !== 'pending' || r.isEscalated || r.autoEscalationSuppressed) return null;
  const reason = capacityEscalationReason(r as Referral, facilitiesById, { facilitiesLoaded });
  return reason ? { kind: 'capacity', reason } : null;
}

/** Re-check against the stored document inside the transaction. */
export function stillEscalates(r: SweepReferral, action: EscalationAction, now: number): boolean {
  if (action.kind === 'sla') return needsAutoEscalation(r, now);
  return !r.isEscalated && !r.autoEscalationSuppressed && r.status === 'pending';
}

/** The fields written to the referral. */
export function escalationUpdate(r: Pick<Referral, 'status'>, action: EscalationAction, nowIso: string) {
  const sla = action.kind === 'sla';
  return {
    referralUpdates: {
      isEscalated: true,
      escalatedAt: nowIso,
      escalatedBy: 'system',
      escalationReason: sla ? 'sla_breach' : action.reason,
      // SLA silence is the facilities' to chase; no capacity anywhere goes straight
      // to system administrators, because no receiving facility can act on it.
      escalationLevel: sla ? 'facility' : 'system',
      updatedAt: nowIso,
      statusUpdatedAt: nowIso,
      statusUpdatedBy: 'system',
    },
    historyEntry: {
      status: r.status,
      timestamp: nowIso,
      userId: 'system',
      notes: sla
        ? `No response within ${SLA_MINUTES} minutes. Automatically escalated for administrative intervention.`
        : describeCapacityEscalation(action.reason) + ' Escalated for administrative placement.',
    },
  };
}

export interface EscalationNotice {
  /** Stored English, rendered from notif.<key> so old clients still read it. */
  title: string;
  message: string;
  /** What the inbox renders in the reader's language (src/i18n/notifications). */
  key: NotificationKey;
  vars: NotificationVars;
  type: 'urgent';
  referralId: string;
  facilityId: string;
  facilityIds: string[];
  targetRoles?: Role[];
}

/** Who hears about it and what they read. Owners and system_admins always. */
export function escalationNotice(
  r: Pick<Referral, 'id' | 'patientData' | 'priority' | 'requiredBedType' | 'createdAt' | 'referringFacilityId' | 'candidateFacilityIds' | 'receivingDepartments'>,
  action: EscalationAction
): EscalationNotice {
  const patient = r.patientData?.name || '@notif.aPatient';
  if (action.kind === 'sla') {
    const vars = { patient, priority: `@priorityWord.${r.priority}`, bed: r.requiredBedType, minutes: SLA_MINUTES, since: `#date:${r.createdAt}` };
    return {
      ...notificationText('en', 'escalationSla', vars),
      key: 'escalationSla',
      vars,
      type: 'urgent',
      referralId: r.id,
      facilityId: r.referringFacilityId,
      // The referring facility must chase it; the candidates are the ones who
      // have not answered.
      facilityIds: [r.referringFacilityId, ...(r.candidateFacilityIds || [])],
      targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'er_official'],
    };
  }
  const key: NotificationKey = action.reason === 'no_matching_facility' ? 'escalationNoMatch' : 'escalationNoBeds';
  const vars = {
    patient,
    depts: (r.receivingDepartments || []).join(', '),
    bed: r.requiredBedType,
    capacity: action.reason === 'no_matching_facility' ? '@escalation.noMatchingFacility' : '@escalation.allFull',
  };
  return {
    ...notificationText('en', key, vars),
    key,
    vars,
    type: 'urgent',
    referralId: r.id,
    facilityId: r.referringFacilityId,
    // No facility-scoped staff: only the unconditional owner/system_admin branch.
    facilityIds: [],
  };
}
