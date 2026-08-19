import { Referral } from '../types';

/**
 * The 6-segment stage rail shown on the shared referral detail screen, and on
 * the intake wizard's progress bar. Purely a display projection of `status` --
 * it does not gate anything; the existing per-status conditions in
 * ReferralDetailPage.tsx remain the only source of truth for what a viewer
 * can do.
 */
export const STAGE_LABELS = ['Sent', 'Dept', 'Manager', 'Consent', 'Transit', 'Admitted'] as const;

/** Index into STAGE_LABELS the referral has reached, or null for a terminal
 * exception state (rejected/cancelled) that isn't meaningfully "further along". */
export function stageIndexForStatus(status: Referral['status']): number | null {
  switch (status) {
    case 'pending':
    case 'postponed':
      return 0;
    case 'dept_approved':
      return 1;
    case 'manager_approved':
    case 'accepted':
      return 2;
    case 'patient_consented':
      return 3;
    case 'in_transit':
      return 4;
    case 'arrived':
      return 4;
    case 'admitted':
    case 'discharged':
      return 5;
    case 'rejected':
    case 'cancelled':
      return null;
    default:
      return 0;
  }
}
