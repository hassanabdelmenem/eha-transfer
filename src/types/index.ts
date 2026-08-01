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
  vitalSigns: {
    hr: number;
    bp: string;
    spo2: number;
    temp: number;
    rr: number;
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
  reasonForReferral: string;
  createdAt: string;
  updatedAt: string;
  deptComments: DeptComment[];
  statusHistory: {
    status: ReferralStatus;
    timestamp: string;
    userId: string;
    notes?: string;
  }[];
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
