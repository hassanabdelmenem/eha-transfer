import {
  Role,
  User,
  Facility,
  Referral,
  Notification,
  ShiftAssignment,
  ShiftLog,
  DeptApprovalStatus,
  ReferralStatus,
  BedType,
  DOCTOR_ROLES,
  NURSE_ROLES,
  CLINICAL_PRACTITIONER_ROLES,
  CLINICAL_BROADCAST_ROLES,
  isDoctorRole,
  isNurseRole,
} from '../src/types';
import {
  SENIOR_CANCEL_ROLES,
  CANCEL_LOCKED_STATUSES,
  DirectAdmission,
} from '../src/contexts/DataContext';
import { needsAutoEscalation, SLA_MINUTES } from '../src/lib/sla';
import { CapacityEscalationReason, describeCapacityEscalation } from '../src/lib/routing';
import { v4 as uuidv4 } from 'uuid';

/**
 * Canonical test personas representing all 14 roles across 4 healthcare facilities.
 */
export interface PersonaDirectory {
  owner: User;
  systemAdmin: User;
  medicalDirectorA: User;
  medicalDirectorB: User;
  hospitalManagerB: User;
  deputyManagerB: User;
  headOfDepartmentB: User;
  consultantA: User;
  specialistA: User;
  residentA: User;
  clinicianA: User;
  nursingSupervisorB: User;
  nurseB: User;
  erOfficialB: User;
  erRoomA: User;
  strangerResidentC: User;
  strangerManagerC: User;
  unverifiedDoctor: User;
  unverifiedApplicant: User;
}

export function createTestPersonas(): PersonaDirectory {
  return {
    owner: {
      id: 'usr-owner-001',
      name: 'Dr. Tarek Owner',
      email: 'owner@ismailia.gov.eg',
      role: 'owner',
      verified: true,
      profileCompleted: true,
    },
    systemAdmin: {
      id: 'usr-admin-002',
      name: 'Eng. Karim Admin',
      email: 'admin@ismailia.gov.eg',
      role: 'system_admin',
      verified: true,
      profileCompleted: true,
      facilityId: 'branch',
    },
    medicalDirectorA: {
      id: 'usr-meddir-a-003',
      name: 'Dr. Mona MedDirector A',
      email: 'mona.director@fac-a.gov.eg',
      role: 'medical_director',
      facilityId: 'facility-a',
      department: 'Administration',
      verified: true,
      profileCompleted: true,
    },
    medicalDirectorB: {
      id: 'usr-meddir-b-004',
      name: 'Dr. Hesham MedDirector B',
      email: 'hesham.director@fac-b.gov.eg',
      role: 'medical_director',
      facilityId: 'facility-b',
      department: 'Administration',
      verified: true,
      profileCompleted: true,
    },
    hospitalManagerB: {
      id: 'usr-manager-b-005',
      name: 'Mr. Essam Manager B',
      email: 'essam.manager@fac-b.gov.eg',
      role: 'hospital_manager',
      facilityId: 'facility-b',
      department: 'Operations',
      verified: true,
      profileCompleted: true,
    },
    deputyManagerB: {
      id: 'usr-deputy-b-006',
      name: 'Dr. Nadia Deputy B',
      email: 'nadia.deputy@fac-b.gov.eg',
      role: 'deputy_manager',
      facilityId: 'facility-b',
      department: 'Operations',
      verified: true,
      profileCompleted: true,
    },
    headOfDepartmentB: {
      id: 'usr-hod-b-007',
      name: 'Dr. Magdy HoD ICU B',
      email: 'magdy.hod@fac-b.gov.eg',
      role: 'head_of_department',
      facilityId: 'facility-b',
      department: 'ICU',
      verified: true,
      profileCompleted: true,
    },
    consultantA: {
      id: 'usr-consultant-a-008',
      name: 'Dr. Khaled Consultant A',
      email: 'khaled.consultant@fac-a.gov.eg',
      role: 'consultant',
      facilityId: 'facility-a',
      department: 'Cardiology',
      verified: true,
      profileCompleted: true,
    },
    specialistA: {
      id: 'usr-specialist-a-009',
      name: 'Dr. Reem Specialist A',
      email: 'reem.specialist@fac-a.gov.eg',
      role: 'specialist',
      facilityId: 'facility-a',
      department: 'ICU',
      verified: true,
      profileCompleted: true,
    },
    residentA: {
      id: 'usr-resident-a-010',
      name: 'Dr. Mostafa Resident A',
      email: 'mostafa.resident@fac-a.gov.eg',
      role: 'resident',
      facilityId: 'facility-a',
      department: 'Emergency',
      verified: true,
      profileCompleted: true,
    },
    clinicianA: {
      id: 'usr-clinician-a-011',
      name: 'Dr. Sarah Clinician A',
      email: 'sarah.clinician@fac-a.gov.eg',
      role: 'clinician',
      facilityId: 'facility-a',
      department: 'Primary Care',
      verified: true,
      profileCompleted: true,
    },
    nursingSupervisorB: {
      id: 'usr-nsup-b-012',
      name: 'Nurse Hoda Nursing Supervisor B',
      email: 'hoda.nurse@fac-b.gov.eg',
      role: 'nursing_supervisor',
      facilityId: 'facility-b',
      department: 'ICU',
      verified: true,
      profileCompleted: true,
    },
    nurseB: {
      id: 'usr-nurse-b-013',
      name: 'Nurse Fatima Staff Nurse B',
      email: 'fatima.nurse@fac-b.gov.eg',
      role: 'nurse',
      facilityId: 'facility-b',
      department: 'ICU',
      verified: true,
      profileCompleted: true,
    },
    erOfficialB: {
      id: 'usr-eroff-b-014',
      name: 'Capt. Walid ER Official B',
      email: 'walid.er@fac-b.gov.eg',
      role: 'er_official',
      facilityId: 'facility-b',
      department: 'Emergency',
      verified: true,
      profileCompleted: true,
    },
    erRoomA: {
      id: 'usr-erroom-a-015',
      name: 'Capt. Samy ER Room A',
      email: 'samy.er@fac-a.gov.eg',
      role: 'er_room',
      facilityId: 'facility-a',
      department: 'Emergency',
      verified: true,
      profileCompleted: true,
    },
    strangerResidentC: {
      id: 'usr-stranger-c-016',
      name: 'Dr. Ibrahim Resident C',
      email: 'ibrahim.resident@fac-c.gov.eg',
      role: 'resident',
      facilityId: 'facility-c',
      department: 'Emergency',
      verified: true,
      profileCompleted: true,
    },
    strangerManagerC: {
      id: 'usr-stranger-mgr-c-017',
      name: 'Mr. Mahmoud Manager C',
      email: 'mahmoud.manager@fac-c.gov.eg',
      role: 'hospital_manager',
      facilityId: 'facility-c',
      department: 'Administration',
      verified: true,
      profileCompleted: true,
    },
    unverifiedDoctor: {
      id: 'usr-unverified-018',
      name: 'Dr. Tariq Unverified',
      email: 'tariq.unverified@fac-a.gov.eg',
      role: 'resident',
      facilityId: 'facility-a',
      department: 'Emergency',
      verified: false,
      profileCompleted: true,
    },
    unverifiedApplicant: {
      id: 'usr-unverified-019',
      name: 'Applicant User',
      email: 'applicant@random.com',
      role: 'resident',
      verified: false,
      profileCompleted: false,
    },
  };
}

export function createTestFacilities(): Record<string, Facility> {
  return {
    'facility-a': {
      id: 'facility-a',
      name: 'Ismailia Primary Health Care Center',
      type: 'primary_care',
      location: 'Ismailia City Center',
      departments: ['Emergency', 'Primary Care', 'Cardiology'],
      capacity: {
        Ward: { total: 10, occupied: 2 },
        ICU: { total: 2, occupied: 1 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
      },
    },
    'facility-b': {
      id: 'facility-b',
      name: 'Ismailia General District Hospital',
      type: 'district_hospital',
      location: 'Ismailia North',
      departments: ['Emergency', 'ICU', 'Cardiology', 'Surgery'],
      capacity: {
        Ward: { total: 30, occupied: 10 },
        ICU: { total: 10, occupied: 2 },
        CCU: { total: 6, occupied: 1 },
        PICU: { total: 4, occupied: 0 },
      },
    },
    'facility-c': {
      id: 'facility-c',
      name: 'Suez Canal University Hospital',
      type: 'tertiary_care',
      location: 'University Campus',
      departments: ['Emergency', 'ICU', 'Cardiology', 'Surgery', 'Pediatrics', 'Neurology'],
      capacity: {
        Ward: { total: 50, occupied: 20 },
        ICU: { total: 20, occupied: 5 },
        CCU: { total: 15, occupied: 4 },
        PICU: { total: 10, occupied: 2 },
      },
    },
    'facility-d': {
      id: 'facility-d',
      name: 'Specialized Medical Center (Contracted)',
      type: 'external_contracted',
      location: 'Ismailia East',
      isExternal: true,
      contractedServices: ['ICU', 'CCU', 'Cardiology', 'Oncology'],
      departments: ['Emergency', 'ICU', 'Cardiology', 'Surgery', 'Oncology'],
      capacity: {
        Ward: { total: 20, occupied: 0 },
        ICU: { total: 8, occupied: 0 },
        CCU: { total: 5, occupied: 0 },
        PICU: { total: 2, occupied: 0 },
      },
    },
  };
}

/**
 * In-memory simulated healthcare network database engine.
 * Faithfully mirrors Firestore security rules and DataContext execution.
 */
export class SimulatedHealthcareNetwork {
  users = new Map<string, User>();
  facilities = new Map<string, Facility>();
  referrals = new Map<string, Referral>();
  notifications = new Map<string, Notification>();
  directAdmissions = new Map<string, DirectAdmission>();
  shiftAssignments = new Map<string, ShiftAssignment>();
  shiftLogs = new Map<string, ShiftLog>();

  constructor() {
    this.reset();
  }

  reset() {
    this.users.clear();
    this.facilities.clear();
    this.referrals.clear();
    this.notifications.clear();
    this.directAdmissions.clear();
    this.shiftAssignments.clear();
    this.shiftLogs.clear();

    const personas = createTestPersonas();
    Object.values(personas).forEach((u) => this.users.set(u.id, { ...u }));

    const facs = createTestFacilities();
    Object.values(facs).forEach((f) => this.facilities.set(f.id, JSON.parse(JSON.stringify(f))));
  }

  // --- Auth / Caller Helpers ---
  isVerifiedCaller(caller?: User | null): boolean {
    return !!caller && caller.verified === true;
  }

  isPrivileged(caller?: User | null): boolean {
    return !!caller && (caller.role === 'owner' || caller.role === 'system_admin');
  }

  isDoctor(caller?: User | null): boolean {
    return !!caller && isDoctorRole(caller.role);
  }

  isNurse(caller?: User | null): boolean {
    return !!caller && isNurseRole(caller.role);
  }

  isFacilityConfigRole(caller?: User | null): boolean {
    if (!caller) return false;
    return ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department'].includes(caller.role);
  }

  isReferralParty(referral: Referral, caller: User): boolean {
    if (this.isPrivileged(caller)) return true;
    if (!caller.facilityId) return false;
    if (referral.referringFacilityId === caller.facilityId) return true;
    if (referral.receivingFacilityId === caller.facilityId) return true;
    if (
      referral.receivingFacilityId === 'auto' &&
      Array.isArray(referral.candidateFacilityIds) &&
      referral.candidateFacilityIds.includes(caller.facilityId)
    ) {
      return true;
    }
    return false;
  }

  isReferringParty(referral: Referral, caller: User): boolean {
    if (this.isPrivileged(caller)) return true;
    return !!caller.facilityId && caller.facilityId === referral.referringFacilityId;
  }

  isReceivingParty(referral: Referral, caller: User): boolean {
    if (this.isPrivileged(caller)) return true;
    if (!caller.facilityId) return false;
    if (referral.receivingFacilityId === caller.facilityId) return true;
    if (
      referral.receivingFacilityId === 'auto' &&
      Array.isArray(referral.candidateFacilityIds) &&
      referral.candidateFacilityIds.includes(caller.facilityId)
    ) {
      return true;
    }
    return false;
  }

  // --- Notifications Helper ---
  sendNotification(params: {
    title: string;
    message: string;
    type: Notification['type'];
    referralId: string;
    facilityId?: string;
    facilityIds?: string[];
    targetRoles?: Role[];
    departments?: string[];
    targetUserIds?: string[];
  }): Notification[] {
    const targetFacilityIds = params.facilityIds ?? (params.facilityId ? [params.facilityId] : []);
    const relevantUsers = Array.from(this.users.values()).filter((u) => {
      if (params.targetUserIds?.includes(u.id)) return true;
      if (u.role === 'owner' || u.role === 'system_admin') return true;
      if (!u.facilityId || !targetFacilityIds.includes(u.facilityId)) return false;

      let isDelegatedTarget = false;
      if (
        params.targetRoles?.includes('head_of_department') &&
        (CLINICAL_PRACTITIONER_ROLES as readonly string[]).includes(u.role)
      ) {
        const assignments = Array.from(this.shiftAssignments.values()).filter(
          (s) => s.facilityId === u.facilityId
        );
        const assignment = assignments.find(
          (s) =>
            s.assignedUserId === u.id &&
            (!params.departments || params.departments.includes(s.department))
        );
        if (assignment) isDelegatedTarget = true;
      }

      if (params.targetRoles && !params.targetRoles.includes(u.role) && !isDelegatedTarget) return false;
      if (params.departments && u.department && !params.departments.includes(u.department)) return false;
      return true;
    });

    const now = new Date().toISOString();
    const createdAtMs = Date.parse(now);
    const generated: Notification[] = [];
    relevantUsers.forEach((u) => {
      const id = uuidv4();
      const notif: Notification = {
        id,
        userId: u.id,
        title: params.title,
        message: params.message,
        type: params.type,
        read: false,
        createdAt: now,
        createdAtMs,
        referralId: params.referralId,
      };
      this.notifications.set(id, notif);
      generated.push(notif);
    });
    return generated;
  }

  // --- Stage 1: Add Referral ---
  createReferral(
    referralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'>,
    caller: User,
    sendCriticalAlert = false
  ): Referral {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: caller must be verified to create a referral.');
    }
    if (!this.isDoctor(caller) && !this.isPrivileged(caller)) {
      throw new Error('Permission denied: only doctors can initiate referrals.');
    }
    if (!this.isPrivileged(caller) && caller.facilityId !== referralData.referringFacilityId) {
      throw new Error('Permission denied: cannot create referral on behalf of another facility.');
    }

    const now = new Date().toISOString();
    const createdAtMs = Date.parse(now);
    const newReferral: Referral = {
      ...referralData,
      id: uuidv4(),
      createdAt: now,
      createdAtMs,
      updatedAt: now,
      isEscalated: false,
      deptComments: [],
      statusHistory: [
        {
          status: referralData.status,
          timestamp: now,
          userId: caller.id,
          notes: 'Referral created',
        },
      ],
    };

    this.referrals.set(newReferral.id, newReferral);

    // Fan-out notifications to candidate facilities
    if (newReferral.receivingFacilityId === 'auto' && newReferral.candidateFacilityIds) {
      newReferral.candidateFacilityIds.forEach((candidateId) => {
        this.sendNotification({
          title: sendCriticalAlert
            ? `CRITICAL ALERT: ${newReferral.priority.toUpperCase()} ${newReferral.requiredBedType} Transfer`
            : `New ${newReferral.priority.toUpperCase()} Referral (Auto-Routed)`,
          message: `Referral from ${this.facilities.get(newReferral.referringFacilityId)?.name || 'Facility'} for ${newReferral.receivingDepartments.join(', ')}`,
          type: sendCriticalAlert || newReferral.priority === 'emergency' ? 'urgent' : 'info',
          referralId: newReferral.id,
          facilityId: candidateId,
          targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
          departments: newReferral.receivingDepartments,
        });
      });
    } else {
      this.sendNotification({
        title: sendCriticalAlert
          ? `CRITICAL ALERT: ${newReferral.priority.toUpperCase()} ${newReferral.requiredBedType} Transfer`
          : `New ${newReferral.priority.toUpperCase()} Referral`,
        message: `Referral from ${this.facilities.get(newReferral.referringFacilityId)?.name || 'Facility'} for ${newReferral.receivingDepartments.join(', ')}`,
        type: sendCriticalAlert || newReferral.priority === 'emergency' ? 'urgent' : 'info',
        referralId: newReferral.id,
        facilityId: newReferral.receivingFacilityId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
        departments: newReferral.receivingDepartments,
      });
    }

    return newReferral;
  }

  // --- Stage 2: Head of Department Review / Comments ---
  addDeptComment(
    referralId: string,
    status: DeptApprovalStatus,
    comment: string,
    caller: User
  ): { referral: Referral; notifications: Notification[] } {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isReceiving = this.isReceivingParty(r, caller);
    if (!isPrivileged && !isReceiving) {
      throw new Error('Permission denied: caller not at receiving facility.');
    }

    // Role check for HoD
    const isDelegatedClinician =
      (CLINICAL_PRACTITIONER_ROLES as readonly string[]).includes(caller.role) &&
      Array.from(this.shiftAssignments.values()).some(
        (s) =>
          s.facilityId === caller.facilityId &&
          s.assignedUserId === caller.id &&
          r.receivingDepartments.includes(s.department)
      );

    const isHoD =
      caller.role === 'head_of_department' &&
      (r.receivingDepartments.includes(caller.department || '') || isPrivileged);

    if (!isPrivileged && !isHoD && !isDelegatedClinician) {
      throw new Error('Permission denied: caller is not Head of Department or delegated clinician for this department.');
    }

    const now = new Date().toISOString();
    const newComment = { id: uuidv4(), userId: caller.id, timestamp: now, status, comment };
    const isApprovalStatus = ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(status);
    const isRequirementsNeeded = status === 'requirements_needed';

    let claimedReceivingFacilityId: string | undefined;
    let requirementsSentBack:
      | { referringFacilityId: string; receivingFacilityId: string; referringUserId: string; patientName: string }
      | undefined;

    r.deptComments = [...(r.deptComments || []), newComment];

    if (isApprovalStatus && r.status === 'pending') {
      claimedReceivingFacilityId = r.receivingFacilityId === 'auto' ? (caller.facilityId || 'auto') : r.receivingFacilityId;
      r.status = 'dept_approved';
      r.receivingFacilityId = claimedReceivingFacilityId;
      r.updatedAt = now;
      r.statusHistory = [
        ...r.statusHistory,
        { status: 'dept_approved', timestamp: now, userId: caller.id, notes: 'Department Head Approved' },
      ];
    } else if (isRequirementsNeeded && r.status === 'pending') {
      const claimedFacilityId = r.receivingFacilityId === 'auto' ? (caller.facilityId || 'auto') : r.receivingFacilityId;
      r.status = 'postponed';
      r.receivingFacilityId = claimedFacilityId;
      r.updatedAt = now;
      r.isEscalated = true;
      r.escalatedAt = now;
      r.escalatedBy = 'system';
      r.escalationReason = 'requirements_needed';
      r.escalationLevel = 'facility';
      r.autoEscalationSuppressed = false;
      r.statusHistory = [
        ...r.statusHistory,
        {
          status: 'postponed',
          timestamp: now,
          userId: caller.id,
          notes: comment ? `Requirements needed: ${comment}` : 'Requirements needed before this referral can proceed.',
        },
      ];

      requirementsSentBack = {
        referringFacilityId: r.referringFacilityId,
        receivingFacilityId: claimedFacilityId,
        referringUserId: r.referringUserId,
        patientName: r.patientData.name,
      };
    }

    this.referrals.set(r.id, r);

    const generatedNotifications: Notification[] = [];
    if (claimedReceivingFacilityId) {
      const notifs = this.sendNotification({
        title: `Department Approved - Needs Final Approval`,
        message: `Dr. ${caller.name} approved referral ${referralId}. Needs manager approval.`,
        type: 'info',
        referralId,
        facilityId: claimedReceivingFacilityId,
        targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager'],
      });
      generatedNotifications.push(...notifs);
    }

    if (requirementsSentBack) {
      const { referringFacilityId, receivingFacilityId, referringUserId, patientName } = requirementsSentBack;
      const fromName = this.facilities.get(referringFacilityId)?.name || 'the referring facility';
      const notifs = this.sendNotification({
        title: 'Referral Postponed — Requirements Needed',
        message: `${patientName}'s referral (from ${fromName}) was sent back with requirements${comment ? `: "${comment}"` : ''}. Returned directly, without administrative approval, and escalated automatically.`,
        type: 'purple',
        referralId,
        facilityId: referringFacilityId,
        facilityIds: [referringFacilityId, receivingFacilityId],
        targetRoles: ['medical_director', 'deputy_manager', 'hospital_manager'],
        targetUserIds: [referringUserId],
      });
      generatedNotifications.push(...notifs);
    }

    return { referral: r, notifications: generatedNotifications };
  }

  // --- Stage 3 & General: Update Referral Status ---
  updateReferralStatus(
    referralId: string,
    newStatus: ReferralStatus,
    notes: string | undefined,
    caller: User
  ): { referral: Referral; notifications: Notification[] } {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isReceiving = this.isReceivingParty(r, caller);
    const isReferring = this.isReferringParty(r, caller);

    // Validate Transition Graph (validStatusTransition)
    const valid = this.isValidTransition(r.status, newStatus);
    if (!valid && !isPrivileged) {
      throw new Error(`Invalid status transition from ${r.status} to ${newStatus}.`);
    }

    // Role checks per target status
    if (newStatus === 'manager_approved') {
      const isManager =
        isPrivileged ||
        (isReceiving && ['medical_director', 'hospital_manager', 'deputy_manager'].includes(caller.role));
      if (!isManager) {
        throw new Error('Permission denied: only hospital managers / medical directors can give manager approval.');
      }
    }

    if (newStatus === 'rejected') {
      if (!notes || !notes.trim()) {
        throw new Error('A rejection reason is required.');
      }
      const canReject =
        isPrivileged ||
        (isReceiving && ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department'].includes(caller.role));
      if (!canReject) {
        throw new Error('Permission denied: caller cannot reject referral.');
      }
    }

    if (newStatus === 'in_transit') {
      if (r.status !== 'patient_consented' && !isPrivileged) {
        throw new Error('Cannot mark in transit before the patient has consented to this destination.');
      }
      if (r.requiresAccompanyingDoctor && !r.accompanyingDoctor && !isPrivileged) {
        throw new Error('Add the accompanying doctor’s name and phone number before dispatching the ambulance.');
      }
      const canDispatch =
        isPrivileged ||
        ((isReceiving || isReferring) && ['er_official', 'er_room', 'resident', 'specialist', 'consultant', 'medical_director', 'hospital_manager'].includes(caller.role));
      if (!canDispatch) {
        throw new Error('Permission denied: unauthorized to dispatch ambulance.');
      }
    }

    if (newStatus === 'admitted' || newStatus === 'discharged') {
      const canAdmitOrDischarge =
        isPrivileged ||
        (isReceiving && ['nurse', 'nursing_supervisor', 'medical_director', 'hospital_manager', 'resident', 'specialist', 'consultant'].includes(caller.role));
      if (!canAdmitOrDischarge) {
        throw new Error(`Permission denied: caller cannot mark patient as ${newStatus}.`);
      }
    }

    const now = new Date().toISOString();
    const finalReceivingFacilityId =
      r.receivingFacilityId === 'auto' && ['dept_approved', 'manager_approved', 'accepted'].includes(newStatus)
        ? caller.facilityId || r.receivingFacilityId
        : r.receivingFacilityId;

    const trimmedReason = notes?.trim() || '';
    const formattedNotes =
      newStatus === 'rejected'
        ? trimmedReason.toLowerCase().startsWith('rejected')
          ? trimmedReason
          : `Rejected: ${trimmedReason}`
        : notes;

    r.statusHistory.push({
      status: newStatus,
      timestamp: now,
      userId: caller.id,
      notes: formattedNotes,
    });

    const previousStatus = r.status;
    r.status = newStatus;
    r.receivingFacilityId = finalReceivingFacilityId;
    r.updatedAt = now;

    if (newStatus === 'rejected') {
      r.rejectionReason = trimmedReason;
      r.rejectedAt = now;
      r.rejectedBy = caller.id;
    }

    // Bed capacity adjustment
    const canAdjustCapacity =
      isPrivileged || (!!caller.facilityId && caller.facilityId === r.receivingFacilityId);

    if (canAdjustCapacity) {
      const facility = this.facilities.get(r.receivingFacilityId);
      if (facility && facility.capacity[r.requiredBedType]) {
        if (newStatus === 'admitted' && previousStatus !== 'admitted') {
          facility.capacity[r.requiredBedType].occupied += 1;
        } else if (newStatus === 'discharged' && previousStatus !== 'discharged') {
          facility.capacity[r.requiredBedType].occupied = Math.max(
            0,
            facility.capacity[r.requiredBedType].occupied - 1
          );
        }
      }
    }

    this.referrals.set(r.id, r);

    // Notifications
    const generated: Notification[] = [];
    const n1 = this.sendNotification({
      title: `Referral Status Updated: ${newStatus.toUpperCase()}`,
      message: `Referral for ${r.patientData.name} is now ${newStatus}.`,
      type: newStatus === 'rejected' ? 'warning' : 'success',
      referralId: r.id,
      facilityId: r.referringFacilityId,
      targetRoles: [...CLINICAL_BROADCAST_ROLES, 'specialist', 'consultant', 'resident'],
      targetUserIds: [r.referringUserId],
    });
    generated.push(...n1);

    if (['manager_approved', 'accepted', 'arrived'].includes(newStatus) && finalReceivingFacilityId !== 'auto') {
      const n2 = this.sendNotification({
        title: `Referral ${newStatus.toUpperCase()}`,
        message: `Patient ${r.patientData.name} referral is now ${newStatus.replace('_', ' ')}.`,
        type: 'info',
        referralId: r.id,
        facilityId: finalReceivingFacilityId,
      });
      generated.push(...n2);
    }

    return { referral: r, notifications: generated };
  }

  // --- Stage 4: Patient Consent ---
  recordPatientConsent(
    referralId: string,
    caller: User
  ): { referral: Referral; notifications: Notification[] } {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isReferring = this.isReferringParty(r, caller);
    if (!isPrivileged && !isReferring) {
      throw new Error('Permission denied: only referring facility staff can record patient consent.');
    }
    if (r.status !== 'accepted' && !isPrivileged) {
      throw new Error('Patient consent can only be recorded while the referral is in the accepted state.');
    }

    const now = new Date().toISOString();
    r.status = 'patient_consented';
    r.updatedAt = now;
    r.statusHistory.push({
      status: 'patient_consented',
      timestamp: now,
      userId: caller.id,
      notes: 'Patient consented to transfer.',
    });

    this.referrals.set(r.id, r);

    const generated: Notification[] = [];
    if (r.receivingFacilityId && r.receivingFacilityId !== 'auto') {
      const notifs = this.sendNotification({
        title: 'Patient Consented to Transfer',
        message: `Patient ${r.patientData.name} has consented; dispatch can proceed.`,
        type: 'success',
        referralId: r.id,
        facilityId: r.receivingFacilityId,
      });
      generated.push(...notifs);
    }
    return { referral: r, notifications: generated };
  }

  // --- Stage 4 Exception: Patient Decline ---
  recordPatientDecline(
    referralId: string,
    reason: string,
    caller: User
  ): { referral: Referral; notifications: Notification[] } {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isReferring = this.isReferringParty(r, caller);
    if (!isPrivileged && !isReferring) {
      throw new Error('Permission denied: only referring facility staff can record patient decline.');
    }
    if (r.status !== 'accepted' && !isPrivileged) {
      throw new Error('Patient decline can only be recorded while the referral is in the accepted state.');
    }

    const now = new Date().toISOString();
    const declinedFacilityId = r.receivingFacilityId;
    const patientDeclinedFacilityIds = [...(r.patientDeclinedFacilityIds || []), declinedFacilityId];
    const remainingCandidateIds = (r.candidateFacilityIds || []).filter((fid) => fid !== declinedFacilityId);

    r.status = 'pending';
    r.receivingFacilityId = 'auto';
    r.candidateFacilityIds = remainingCandidateIds;
    r.patientDeclinedFacilityIds = patientDeclinedFacilityIds;
    r.updatedAt = now;
    r.statusHistory.push({
      status: 'pending',
      timestamp: now,
      userId: caller.id,
      notes: `Patient declined transfer to this facility. Reason: ${reason?.trim() || 'Not specified'}. Re-routing.`,
    });

    this.referrals.set(r.id, r);

    const generated: Notification[] = [];
    const n1 = this.sendNotification({
      title: 'Patient Declined Transfer — Re-routing',
      message: `Patient ${r.patientData.name} declined the proposed facility; referral is back in review.`,
      type: 'warning',
      referralId: r.id,
      facilityId: r.referringFacilityId,
      targetRoles: [...CLINICAL_BROADCAST_ROLES],
    });
    generated.push(...n1);

    remainingCandidateIds.forEach((candId) => {
      const n2 = this.sendNotification({
        title: 'Referral Re-routed After Patient Decline',
        message: `Patient ${r.patientData.name} declined another facility; this referral is active again.`,
        type: 'info',
        referralId: r.id,
        facilityId: candId,
        targetRoles: ['head_of_department', 'medical_director', 'hospital_manager'],
      });
      generated.push(...n2);
    });

    return { referral: r, notifications: generated };
  }

  // --- Stage 5: Accompanying Doctor Assignment ---
  setAccompanyingDoctor(
    referralId: string,
    name: string,
    phoneNumber: string,
    caller: User
  ): Referral {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isER = caller.role === 'er_official' || caller.role === 'er_room';
    const isParty = this.isReferralParty(r, caller);

    if (!isPrivileged && (!isER || !isParty)) {
      throw new Error('Permission denied: only ER official/room roles at party facilities can assign escort doctors.');
    }
    if (!name.trim() || !phoneNumber.trim()) {
      throw new Error('Both the doctor’s name and phone number are required.');
    }
    if (r.status !== 'patient_consented' && !isPrivileged) {
      throw new Error('The accompanying doctor can only be recorded after the patient has consented to transfer, before dispatch.');
    }

    const now = new Date().toISOString();
    const accompanyingDoctor = {
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      addedBy: caller.id,
      addedAt: now,
    };

    r.accompanyingDoctor = accompanyingDoctor;
    r.updatedAt = now;
    r.statusHistory.push({
      status: r.status,
      timestamp: now,
      userId: caller.id,
      notes: `Accompanying doctor assigned: ${accompanyingDoctor.name} (${accompanyingDoctor.phoneNumber})`,
    });

    this.referrals.set(r.id, r);
    return r;
  }

  // --- Cancellation (Pre-Transit Lock & Permission Enforcement) ---
  cancelReferral(
    referralId: string,
    reason: string,
    caller: User
  ): { referral: Referral; notifications: Notification[] } {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('A cancellation reason is required.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    if (CANCEL_LOCKED_STATUSES.includes(r.status)) {
      throw new Error(`Cannot cancel a referral once it is ${r.status.replace(/_/g, ' ')}.`);
    }

    const isPrivileged = this.isPrivileged(caller);
    const isCreator = r.referringUserId === caller.id;
    const isSeniorAtReferringFacility =
      caller.facilityId === r.referringFacilityId && SENIOR_CANCEL_ROLES.includes(caller.role);

    if (!isPrivileged && !isCreator && !isSeniorAtReferringFacility) {
      throw new Error('You do not have permission to cancel this referral.');
    }

    const now = new Date().toISOString();
    r.status = 'cancelled';
    r.cancelledAt = now;
    r.cancelledBy = caller.id;
    r.cancelReason = reason.trim();
    r.updatedAt = now;
    r.statusHistory.push({
      status: 'cancelled',
      timestamp: now,
      userId: caller.id,
      notes: `Cancelled: ${reason.trim()}`,
    });

    this.referrals.set(r.id, r);

    const generated: Notification[] = [];
    const n1 = this.sendNotification({
      title: 'Referral Cancelled',
      message: `The referral for ${r.patientData.name} was cancelled by ${caller.name}.`,
      type: 'warning',
      referralId: r.id,
      facilityId: r.referringFacilityId,
      targetRoles: [...CLINICAL_BROADCAST_ROLES],
    });
    generated.push(...n1);

    if (r.receivingFacilityId && r.receivingFacilityId !== 'auto' && r.receivingFacilityId !== r.referringFacilityId) {
      const n2 = this.sendNotification({
        title: 'Referral Cancelled',
        message: `The referral for ${r.patientData.name} was cancelled by the referring facility.`,
        type: 'warning',
        referralId: r.id,
        facilityId: r.receivingFacilityId,
      });
      generated.push(...n2);
    }

    return { referral: r, notifications: generated };
  }

  // --- Stage 7 & Admin Override ---
  overrideReferralDestination(
    referralId: string,
    newFacilityId: string,
    caller: User,
    clearEscalation = true
  ): Referral {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    if (!this.isPrivileged(caller)) {
      throw new Error('Permission denied: only system administrators / owners can override referral destinations.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const newFacility = this.facilities.get(newFacilityId);
    if (!newFacility) throw new Error('Target override facility not found.');

    const now = new Date().toISOString();
    r.receivingFacilityId = newFacilityId;
    if (clearEscalation && r.isEscalated) {
      r.isEscalated = false;
      r.escalatedAt = null;
      r.escalatedBy = null;
      r.escalationReason = null;
      r.escalationLevel = null;
      r.autoEscalationSuppressed = true;
    }
    r.updatedAt = now;
    r.statusHistory.push({
      status: r.status,
      timestamp: now,
      userId: caller.id,
      notes: `Destination manually overridden to ${newFacility.name}`,
    });

    this.referrals.set(r.id, r);
    return r;
  }

  autoEscalateReferral(
    referralId: string,
    nowClock: Date | number = Date.now()
  ): { referral: Referral; notifications: Notification[] } | null {
    const r = this.referrals.get(referralId);
    if (!r) return null;
    if (!needsAutoEscalation(r, nowClock)) return null;

    const now = new Date().toISOString();
    r.isEscalated = true;
    r.escalatedAt = now;
    r.escalatedBy = 'system';
    r.escalationReason = 'sla_breach';
    r.escalationLevel = 'facility';
    r.updatedAt = now;
    r.statusHistory.push({
      status: r.status,
      timestamp: now,
      userId: 'system',
      notes: `No response within ${SLA_MINUTES} minutes. Automatically escalated for administrative intervention.`,
    });

    this.referrals.set(r.id, r);

    const generated: Notification[] = [];
    const targetFacilityIds = [r.referringFacilityId, ...(r.candidateFacilityIds || [])];
    const n = this.sendNotification({
      title: `Referral Escalated — No Response in ${SLA_MINUTES} Minutes`,
      message: `${r.patientData.name} (${r.priority} ${r.requiredBedType}) has had no response and has been escalated for intervention.`,
      type: 'urgent',
      referralId: r.id,
      facilityIds: targetFacilityIds,
      targetRoles: ['medical_director', 'hospital_manager', 'deputy_manager', 'head_of_department', 'er_official'],
    });
    generated.push(...n);

    return { referral: r, notifications: generated };
  }

  escalateForCapacity(
    referralId: string,
    reason: CapacityEscalationReason
  ): { referral: Referral; notifications: Notification[] } | null {
    const r = this.referrals.get(referralId);
    if (!r) return null;
    if (r.isEscalated || r.autoEscalationSuppressed || r.status !== 'pending') return null;

    const now = new Date().toISOString();
    r.isEscalated = true;
    r.escalatedAt = now;
    r.escalatedBy = 'system';
    r.escalationReason = reason;
    r.escalationLevel = 'system';
    r.updatedAt = now;
    r.statusHistory.push({
      status: r.status,
      timestamp: now,
      userId: 'system',
      notes: describeCapacityEscalation(reason) + ' Escalated for administrative placement.',
    });

    this.referrals.set(r.id, r);

    const generated: Notification[] = [];
    const n = this.sendNotification({
      title: reason === 'no_matching_facility'
        ? 'ESCALATION: No Matching Facility'
        : 'ESCALATION: No Beds Available',
      message: `${r.patientData?.name || 'A patient'} needs ${r.receivingDepartments.join(', ')} (${r.requiredBedType}). ${describeCapacityEscalation(reason)} Administrative placement required.`,
      type: 'urgent',
      referralId: r.id,
      facilityId: r.referringFacilityId,
      facilityIds: [],
    });
    generated.push(...n);

    return { referral: r, notifications: generated };
  }

  toggleReferralEscalation(
    referralId: string,
    isEscalated: boolean,
    caller: User
  ): Referral {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const r = this.referrals.get(referralId);
    if (!r) throw new Error('Referral not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isParty = this.isReferralParty(r, caller);
    if (!isPrivileged && !isParty) {
      throw new Error('Permission denied: non-party cannot toggle escalation.');
    }

    const now = new Date().toISOString();
    r.isEscalated = isEscalated;
    r.escalatedAt = isEscalated ? now : null;
    r.escalatedBy = isEscalated ? caller.id : null;
    r.escalationReason = isEscalated ? 'manual' : null;
    r.escalationLevel = isEscalated ? 'facility' : null;
    r.autoEscalationSuppressed = !isEscalated;
    r.updatedAt = now;
    r.statusHistory.push({
      status: r.status,
      timestamp: now,
      userId: caller.id,
      notes: isEscalated ? 'Marked as Escalated for System Admin Intervention' : 'De-escalated referral',
    });

    this.referrals.set(r.id, r);
    return r;
  }

  // --- Direct Admissions (Nurse / Floor workflow) ---
  addDirectAdmission(
    admissionData: Omit<DirectAdmission, 'id' | 'admittedAt' | 'status'>,
    caller: User
  ): DirectAdmission {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const isPrivileged = this.isPrivileged(caller);
    if (!isPrivileged && caller.facilityId !== admissionData.facilityId) {
      throw new Error('Permission denied: cannot admit patient into another facility.');
    }

    const now = new Date().toISOString();
    const newAdmission: DirectAdmission = {
      ...admissionData,
      id: uuidv4(),
      admittedAt: now,
      status: 'admitted',
    };

    this.directAdmissions.set(newAdmission.id, newAdmission);

    const facility = this.facilities.get(admissionData.facilityId);
    const bedType = admissionData.bedType as BedType;
    if (facility && facility.capacity[bedType]) {
      facility.capacity[bedType].occupied += 1;
    }

    return newAdmission;
  }

  dischargeDirectAdmission(admissionId: string, caller: User): DirectAdmission {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const adm = this.directAdmissions.get(admissionId);
    if (!adm) throw new Error('Direct admission not found.');

    const isPrivileged = this.isPrivileged(caller);
    if (!isPrivileged && caller.facilityId !== adm.facilityId) {
      throw new Error('Permission denied: cannot discharge patient from another facility.');
    }

    if (adm.status === 'discharged') return adm;

    adm.status = 'discharged';
    const facility = this.facilities.get(adm.facilityId);
    const bedType = adm.bedType as BedType;
    if (facility && facility.capacity[bedType]) {
      facility.capacity[bedType].occupied = Math.max(0, facility.capacity[bedType].occupied - 1);
    }

    return adm;
  }

  // --- Shift Logs & Assignments ---
  addShiftLog(
    logData: Omit<ShiftLog, 'id' | 'timestamp'>,
    caller: User
  ): ShiftLog {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    if (!this.isPrivileged(caller) && caller.facilityId !== logData.facilityId) {
      throw new Error('Permission denied: cannot write shift log for another facility.');
    }
    if (!this.isPrivileged(caller) && caller.id !== logData.userId) {
      throw new Error('Permission denied: caller ID must match log author.');
    }

    const now = new Date().toISOString();
    const newLog: ShiftLog = {
      ...logData,
      id: uuidv4(),
      timestamp: now,
    };
    this.shiftLogs.set(newLog.id, newLog);
    return newLog;
  }

  assignShift(
    facilityId: string,
    department: string,
    assignedUserId: string | null,
    caller: User
  ): ShiftAssignment {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const isPrivileged = this.isPrivileged(caller);
    const isHoD =
      caller.role === 'head_of_department' &&
      caller.facilityId === facilityId &&
      caller.department === department;

    if (!isPrivileged && !isHoD) {
      throw new Error('Permission denied: only Head of Department or admin can assign shifts.');
    }

    const existing = Array.from(this.shiftAssignments.values()).find(
      (s) => s.facilityId === facilityId && s.department === department
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.assignedUserId = assignedUserId;
      existing.updatedAt = now;
      this.shiftAssignments.set(existing.id, existing);
      return existing;
    } else {
      const newAssignment: ShiftAssignment = {
        id: uuidv4(),
        facilityId,
        department,
        assignedUserId,
        updatedAt: now,
      };
      this.shiftAssignments.set(newAssignment.id, newAssignment);
      return newAssignment;
    }
  }

  // --- Facility Administration ---
  updateFacilityCapacity(
    facilityId: string,
    capacities: Record<string, { total: number; occupied: number }>,
    caller: User
  ): Facility {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const fac = this.facilities.get(facilityId);
    if (!fac) throw new Error('Facility not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isAtFacility = caller.facilityId === facilityId;

    if (!isPrivileged && !isAtFacility) {
      throw new Error('Permission denied: cross-facility configuration forbidden.');
    }

    // Check if totals are being changed
    const bedTypes: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];
    let totalsChanged = false;
    for (const bt of bedTypes) {
      if (capacities[bt] && capacities[bt].total !== fac.capacity[bt].total) {
        totalsChanged = true;
        break;
      }
    }

    if (totalsChanged && !isPrivileged && !this.isFacilityConfigRole(caller)) {
      throw new Error('Permission denied: altering bed totals requires facility leadership or admin role.');
    }

    // Check occupancy validity (0 <= occupied <= total)
    for (const bt of bedTypes) {
      const cap = capacities[bt] || fac.capacity[bt];
      if (cap.occupied < 0 || cap.total < 0 || cap.occupied > cap.total) {
        throw new Error(`Invalid capacity bounds for ${bt}: occupied must be between 0 and total.`);
      }
    }

    fac.capacity = {
      ...fac.capacity,
      ...(capacities as any),
    };
    this.facilities.set(fac.id, fac);
    return fac;
  }

  updateFacilityDepartments(
    facilityId: string,
    departments: string[],
    caller: User
  ): Facility {
    if (!this.isVerifiedCaller(caller)) {
      throw new Error('Permission denied: unverified caller.');
    }
    const fac = this.facilities.get(facilityId);
    if (!fac) throw new Error('Facility not found.');

    const isPrivileged = this.isPrivileged(caller);
    const isConfigRole = this.isFacilityConfigRole(caller) && caller.facilityId === facilityId;

    if (!isPrivileged && !isConfigRole) {
      throw new Error('Permission denied: only facility leadership or system admin can modify departments.');
    }

    fac.departments = [...departments];
    this.facilities.set(fac.id, fac);
    return fac;
  }

  // --- Helper State Machine Transition Checker ---
  isValidTransition(from: ReferralStatus, to: ReferralStatus): boolean {
    if (from === to) return true;
    if (from === 'pending') {
      return ['dept_approved', 'manager_approved', 'accepted', 'rejected', 'postponed', 'cancelled'].includes(to);
    }
    if (from === 'dept_approved') {
      return ['manager_approved', 'accepted', 'rejected', 'postponed', 'cancelled'].includes(to);
    }
    if (from === 'manager_approved') {
      return ['accepted', 'rejected', 'postponed', 'cancelled'].includes(to);
    }
    if (from === 'accepted') {
      return ['patient_consented', 'pending', 'rejected', 'postponed', 'cancelled'].includes(to);
    }
    if (from === 'patient_consented') {
      return ['in_transit', 'accepted', 'pending', 'cancelled'].includes(to);
    }
    if (from === 'postponed') {
      return ['pending', 'dept_approved', 'manager_approved', 'accepted', 'rejected', 'cancelled'].includes(to);
    }
    if (from === 'rejected') {
      return ['pending', 'cancelled'].includes(to);
    }
    if (from === 'in_transit') {
      return to === 'arrived';
    }
    if (from === 'arrived') {
      return ['admitted', 'discharged'].includes(to);
    }
    if (from === 'admitted') {
      return to === 'discharged';
    }
    return false;
  }
}
