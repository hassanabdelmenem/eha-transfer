import { PatientData, ReferralPriority, BedType, ReferralTransferType } from '../../../types';

export const DRAFT_STORAGE_KEY = 'newReferralDraft';
export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

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
  lastSaved?: string;
}

export const NETWORK_DEPARTMENTS = [
  'Emergency',
  'ICU',
  'CCU',
  'PICU',
  'Cardiology',
  'Neurology',
  'Surgery',
  'Pediatrics',
  'Internal Medicine'
] as const;

export const BED_TYPES: { label: string; value: BedType }[] = [
  { label: 'Standard Ward', value: 'Ward' },
  { label: 'ICU (Intensive Care)', value: 'ICU' },
  { label: 'CCU (Coronary Care)', value: 'CCU' },
  { label: 'PICU (Pediatric ICU)', value: 'PICU' }
];

/**
 * The five required steps, in the order a clinician thinks: who, what was
 * measured, what is wrong, what the workup shows, then where it goes. Routing
 * is decided last, with the whole clinical picture already written.
 */
export const WIZARD_STEPS = [
  { id: 1, key: 'identity', title: 'Patient identity' },
  { id: 2, key: 'vitals', title: 'Vitals' },
  { id: 3, key: 'presentation', title: 'Complaint & presentation' },
  { id: 4, key: 'workup', title: 'Diagnosis, workup & ECG' },
  { id: 5, key: 'destination', title: 'Where it goes & send' },
] as const;
