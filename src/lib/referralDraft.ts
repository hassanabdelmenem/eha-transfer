import { PatientData, ReferralPriority, BedType, ReferralTransferType } from '../types';

// 1d draft persistence: "resume from any step" on this phone. Deliberately
// localStorage, not the IndexedDB offline-referral queue in lib/db.ts -- that
// queue is for a referral that has already been submitted while offline; this
// is the in-progress form itself, before Submit is ever pressed.
//
// Shared with Dashboard.tsx (1a), which surfaces this draft as a "Resume
// draft" card in the clinician's "You" bucket per the redesign spec.
export const DRAFT_KEY = 'newReferralDraft';

export interface WizardDraft {
  step: number;
  patientData: Partial<PatientData>;
  receivingDepartments: string[];
  requiredBedType: BedType;
  priority: ReferralPriority;
  transferType: ReferralTransferType;
  reasonForReferral: string;
  isAutoRouting: boolean;
  receivingFacilityId: string;
  sendCriticalAlert: boolean;
  requiresAccompanyingDoctor: boolean;
}

export const saveReferralDraft = (draft: WizardDraft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or unavailable -- draft just won't persist */
  }
};

export const loadReferralDraft = (): WizardDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearReferralDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable -- nothing to clear */
  }
};
