import { Referral } from '../types';
import { translate, type MessageKey, type MessageVars } from '../i18n';

/**
 * The 6-segment stage rail shown on the shared referral detail screen, and on
 * the intake wizard's progress bar. Purely a display projection of `status` --
 * it does not gate anything; the existing per-status conditions in
 * ReferralDetailPage.tsx remain the only source of truth for what a viewer
 * can do.
 */
export const STAGE_LABELS = ['Sent', 'Dept', 'Manager', 'Consent', 'Transit', 'Admitted'] as const;

/**
 * Index of the stage the referral is waiting on, i.e. the rail's "current"
 * segment; every segment before it is done. A sent referral is waiting on its
 * department, so `pending` points at Dept, not Sent. Returns STAGE_LABELS.length
 * once the patient is admitted (every segment done), and null for a terminal
 * exception (rejected/cancelled) that isn't meaningfully "further along".
 */
export function stageIndexForStatus(status: Referral['status']): number | null {
  switch (status) {
    case 'pending':
    case 'postponed':
      return 1;
    case 'dept_approved':
      return 2;
    case 'manager_approved':
    case 'accepted':
      return 3;
    case 'patient_consented':
    case 'in_transit':
      return 4;
    case 'arrived':
      return 5;
    case 'admitted':
    case 'discharged':
      return STAGE_LABELS.length;
    case 'rejected':
    case 'cancelled':
      return null;
    default:
      return 1;
  }
}

/**
 * Where a referral stands, in the words a clinician card's context line uses
 * ("Qassasin asked for requirements", "consent recorded, escort needed").
 * Display only, like the rail above. Pass the screen's `t` for its language;
 * without one it speaks English.
 */
export function standingPhrase(
  referral: Pick<Referral, 'status' | 'receivingDepartments' | 'requiresAccompanyingDoctor' | 'accompanyingDoctor'>,
  receivingName: string,
  t: (key: MessageKey, vars?: MessageVars) => string = (key, vars) => translate('en', key, vars)
): string {
  const dept = referral.receivingDepartments?.[0];
  const facility = receivingName;
  switch (referral.status) {
    case 'pending':
      return dept ? t('standing.pendingDept', { dept, facility }) : t('standing.pending', { facility });
    case 'postponed':
      return t('standing.postponed', { facility });
    case 'dept_approved':
      return t('standing.deptApproved', { dept: dept ?? t('standing.department') });
    case 'manager_approved':
    case 'accepted':
      return t('standing.accepted', { facility });
    case 'patient_consented':
      return referral.requiresAccompanyingDoctor && !referral.accompanyingDoctor
        ? t('standing.consentEscort')
        : t('standing.consentAmbulance');
    case 'in_transit':
      return t('standing.inTransit', { facility });
    case 'arrived':
      return t('standing.arrived', { facility });
    case 'admitted':
      return t('standing.admitted', { facility });
    default:
      return receivingName;
  }
}
