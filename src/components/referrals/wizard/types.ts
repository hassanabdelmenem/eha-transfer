import { PatientData, ReferralPriority, BedType, ReferralTransferType, Facility } from '../../../types';

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

export interface AiRankedFacility extends Facility {
  availableBeds: number;
  randomDistance: number;
  score: number;
  reason: string;
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

export const PRIORITY_OPTIONS: { label: string; value: ReferralPriority; description: string }[] = [
  { label: 'Routine (24–48h)', value: 'routine', description: 'Standard inter-facility transfer with stable vitals' },
  { label: 'Urgent (2–6h)', value: 'urgent', description: 'Time-sensitive clinical condition requiring specialized care' },
  { label: 'Emergency (Immediate)', value: 'emergency', description: 'Life-threatening condition requiring immediate placement' }
];

export const TRANSFER_TYPES: { label: string; value: ReferralTransferType }[] = [
  { label: 'Going (One-Way Transfer)', value: 'one_way' },
  { label: 'Service & Return (e.g. Scans, PCI)', value: 'service_and_return' },
  { label: 'Assessment (Possible Return)', value: 'assessment_with_return' }
];

export const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Destination & Priority',
    shortTitle: 'Destination',
    description: 'Target facility, bed type, priority & escort'
  },
  {
    id: 2,
    title: 'Patient Identification',
    shortTitle: 'Patient ID',
    description: 'Demographics, Hospital ID & National ID'
  },
  {
    id: 3,
    title: 'Clinical & Vitals',
    shortTitle: 'Clinical',
    description: 'Vital signs, presentation & diagnosis'
  },
  {
    id: 4,
    title: 'Diagnostics & Review',
    shortTitle: 'Review',
    description: 'ECG/scans, summary & submission'
  }
] as const;
