export type Role =
  | 'owner'
  | 'system_admin'
  | 'medical_director'
  | 'hospital_manager'
  | 'deputy_manager'
  | 'head_of_department'
  | 'consultant'
  | 'specialist'
  | 'resident'
  | 'clinician'
  | 'nursing_supervisor'
  | 'nurse'
  | 'er_official'
  | 'er_room';

export type FacilityType = 'primary_care' | 'district_hospital' | 'tertiary_care' | 'external_contracted';
export type BedType = 'ICU' | 'CCU' | 'PICU' | 'Ward';

export interface Facility {
  id: string;
  isExternal?: boolean;
  contractedServices?: string[];
  name: string;
  type: FacilityType;
  location: string;
  departments: string[];
  capacity: Record<BedType, { total: number; occupied: number }>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  role: Role;
  // What the user asked for during onboarding. Carries no authority: `role` is the
  // only field the security rules trust, and it can only be changed by an admin.
  requestedRole?: Role;
  facilityId?: string;
  department?: string;
  verified?: boolean;
  profileCompleted?: boolean;
  monthlySchedule?: string;
}

export type ReferralPriority = 'routine' | 'urgent' | 'emergency';
export type ReferralStatus =
  | 'pending'
  | 'dept_approved'
  | 'manager_approved'
  | 'accepted'
  | 'patient_consented'
  | 'rejected'
  | 'in_transit'
  | 'arrived'
  | 'admitted'
  | 'discharged'
  | 'postponed'
  | 'cancelled';

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
}

export interface PatientData {
  id: string;
  hospitalId: string;
  nationalId?: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  // Numeric vitals are optional: a value that was not recorded is absent, not
  // zero. The referral form's parseVital() already returns undefined for a
  // cleared or non-numeric field, so these were being assigned undefined while
  // typed as required. Read them with a presence check — an absent vital must
  // not be rendered as a number, and must not be evaluated for abnormality.
  vitalSigns: {
    hr?: number;
    bp: string;
    spo2?: number;
    temp?: number;
    rr?: number;
    timestamp: string;
  };
  complaint: string;
  presentation: string;
  pastHistory: string;
  medications: string;
  clinicalNotes: string;
  diagnosis: string;
  investigations: string;
  attachments: Attachment[];
}

export type DeptApprovalStatus = 'pending' | 'requirements_needed' | 'direct_approval' | 'no_role' | 'urgent_approval' | 'scheduled_approval';

export interface DeptComment {
  id: string;
  userId: string;
  timestamp: string;
  status: DeptApprovalStatus;
  comment: string;
}


export type ReferralTransferType = 'one_way' | 'service_and_return' | 'assessment_with_return';

export interface StatusHistoryEntry {
  status: ReferralStatus;
  timestamp: string;
  userId: string;
  notes?: string;
}

export interface Referral {
  id: string;
  transferType?: ReferralTransferType;
  patientId: string;
  patientData: PatientData;
  referringFacilityId: string;
  referringUserId: string;
  receivingFacilityId: string; // Will be "auto" until confirmed
  candidateFacilityIds?: string[]; // IDs of hospitals notified if receivingFacilityId is "auto"
  receivingDepartments: string[];
  requiredBedType: BedType;
  priority: ReferralPriority;
  status: ReferralStatus;
  isEscalated?: boolean;
  // Null rather than absent after a de-escalation: the fields are explicitly
  // cleared so a later re-escalation cannot inherit a stale reason or timestamp.
  escalatedAt?: string | null;
  // 'system' when the 30-minute SLA escalation fired automatically, otherwise the
  // id of the user who pressed Mark Escalated. Distinguishing the two matters for
  // audit: an automatic escalation means nobody responded, a manual one means
  // somebody judged it necessary.
  escalatedBy?: string | null;
  // 'sla_breach'            nobody responded inside the 30-minute window
  // 'no_matching_facility'  nothing in the network provides the departments + bed type
  // 'no_beds_available'     every matching facility is full
  // 'manual'                a human pressed Mark Escalated
  escalationReason?: 'sla_breach' | 'no_matching_facility' | 'no_beds_available' | 'manual' | null;
  // 'system' is the top level: chasing the receiving facilities cannot help
  // because the capacity does not exist, so only a system administrator can
  // resolve it. 'facility' escalations are still actionable locally.
  escalationLevel?: 'system' | 'facility' | null;
  reasonForReferral: string;
  createdAt: string;
  updatedAt: string;
  deptComments: DeptComment[];

  // Facilities the patient has declined transfer to; excluded from future auto-routing candidates.
  patientDeclinedFacilityIds?: string[];
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export interface ShiftLog {
  id: string;
  userId: string;
  userName: string;
  facilityId: string;
  department?: string;
  timestamp: string;
  pendingTransfersCount: number;
  admittedPatientsCount: number;
  summary: string;
}

export interface ShiftAssignment {
  id: string;
  facilityId: string;
  department: string;
  assignedUserId: string | null;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'urgent' | 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
  referralId?: string;
}
