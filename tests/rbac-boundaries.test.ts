import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimulatedHealthcareNetwork,
  createTestPersonas,
  PersonaDirectory,
} from './simulation-harness';
import { Role, isDoctorRole, isNurseRole, Referral, PatientData } from '../src/types';
import { SENIOR_CANCEL_ROLES, CANCEL_LOCKED_STATUSES } from '../src/contexts/DataContext';

describe('Milestone 2 - Permission & Security Boundary Enforcement Audit (R2)', () => {
  let net: SimulatedHealthcareNetwork;
  let personas: PersonaDirectory;

  const ALL_14_ROLES: Role[] = [
    'owner',
    'system_admin',
    'medical_director',
    'hospital_manager',
    'deputy_manager',
    'head_of_department',
    'consultant',
    'specialist',
    'resident',
    'clinician',
    'nursing_supervisor',
    'nurse',
    'er_official',
    'er_room',
  ];

  beforeEach(() => {
    net = new SimulatedHealthcareNetwork();
    personas = createTestPersonas();
  });

  const buildStandardPatientData = (name = 'Patient Test'): PatientData => ({
    id: 'pat-audit-01',
    hospitalId: 'H-AUDIT-01',
    name,
    age: 45,
    gender: 'female',
    vitalSigns: {
      hr: 88,
      bp: '125/80',
      spo2: 97,
      temp: 37.0,
      rr: 18,
      timestamp: new Date().toISOString(),
    },
    complaint: 'Routine surgical consult',
    presentation: 'Stable',
    pastHistory: 'None',
    medications: 'None',
    clinicalNotes: 'Clear for transfer',
    diagnosis: 'Cholelithiasis',
    investigations: 'Abdominal ultrasound shows gallstones',
    attachments: [],
  });

  // --------------------------------------------------------------------------------
  // 1. 14-Role Taxonomy & Canonical Role Matrix Verification
  // --------------------------------------------------------------------------------
  describe('14-Role Taxonomy & Canonical Role Verification', () => {
    it('verifies all 14 roles are recognized and correctly partitioned into doctors, nurses, and administrative roles', () => {
      expect(ALL_14_ROLES).toHaveLength(14);

      // Doctors: 7 roles
      const expectedDoctorRoles: Role[] = [
        'owner',
        'medical_director',
        'head_of_department',
        'consultant',
        'specialist',
        'resident',
        'clinician',
      ];
      expectedDoctorRoles.forEach((role) => {
        expect(isDoctorRole(role)).toBe(true);
      });

      // Non-Doctors: 7 roles
      const expectedNonDoctorRoles: Role[] = [
        'system_admin',
        'hospital_manager',
        'deputy_manager',
        'nursing_supervisor',
        'nurse',
        'er_official',
        'er_room',
      ];
      expectedNonDoctorRoles.forEach((role) => {
        expect(isDoctorRole(role)).toBe(false);
      });

      // Nurses: 2 roles
      expect(isNurseRole('nurse')).toBe(true);
      expect(isNurseRole('nursing_supervisor')).toBe(true);
      expect(isNurseRole('resident')).toBe(false);
      expect(isNurseRole('medical_director')).toBe(false);

      // Senior Cancel Roles: 4 roles
      expect(SENIOR_CANCEL_ROLES).toEqual([
        'medical_director',
        'hospital_manager',
        'deputy_manager',
        'head_of_department',
      ]);

      // Cancel Locked Statuses: 4 statuses
      expect(CANCEL_LOCKED_STATUSES).toEqual([
        'in_transit',
        'arrived',
        'admitted',
        'discharged',
      ]);
    });
  });

  // --------------------------------------------------------------------------------
  // 2. Action 1: Referral Creation Boundaries
  // --------------------------------------------------------------------------------
  describe('Action Boundary: Referral Creation', () => {
    it('allows all 7 doctor roles to create referrals at their facility', () => {
      const doctorPersonas = [
        personas.residentA,
        personas.specialistA,
        personas.consultantA,
        personas.clinicianA,
        personas.headOfDepartmentB,
        personas.medicalDirectorA,
        personas.owner,
      ];

      doctorPersonas.forEach((docUser) => {
        const facId = docUser.facilityId || 'facility-a';
        const ref = net.createReferral(
          {
            patientId: `pat-${docUser.id}`,
            patientData: buildStandardPatientData(docUser.name),
            referringFacilityId: facId,
            referringUserId: docUser.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'pending',
            reasonForReferral: 'Doctor referral',
          },
          docUser
        );
        expect(ref.id).toBeDefined();
        expect(ref.referringUserId).toBe(docUser.id);
      });
    });

    it('strictly rejects non-doctor roles from creating referrals', () => {
      const nonDoctorPersonas = [
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.erOfficialB,
        personas.erRoomA,
        personas.hospitalManagerB,
        personas.deputyManagerB,
      ];

      nonDoctorPersonas.forEach((nonDocUser) => {
        expect(() => {
          net.createReferral(
            {
              patientId: `pat-fail-${nonDocUser.id}`,
              patientData: buildStandardPatientData(nonDocUser.name),
              referringFacilityId: nonDocUser.facilityId || 'facility-b',
              referringUserId: nonDocUser.id,
              receivingFacilityId: 'facility-c',
              receivingDepartments: ['Emergency'],
              requiredBedType: 'Ward',
              priority: 'routine',
              status: 'pending',
              reasonForReferral: 'Non-doctor intake attempt',
            },
            nonDocUser
          );
        }).toThrow(/only doctors can initiate referrals/i);
      });
    });
  });

  // --------------------------------------------------------------------------------
  // 3. Action 2: Head of Department Review Boundaries
  // --------------------------------------------------------------------------------
  describe('Action Boundary: Head of Department Review & Shift Delegation', () => {
    it('allows Head of Department for matching department to approve referrals', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-hod-01',
          patientData: buildStandardPatientData('HoD test'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'ICU request',
        },
        personas.residentA
      );

      const review = net.addDeptComment(
        ref.id,
        'direct_approval',
        'HoD approved',
        personas.headOfDepartmentB
      );
      expect(review.referral.status).toBe('dept_approved');
    });

    it('allows delegated on-call specialist to approve on behalf of HoD', () => {
      const specialistB = {
        ...personas.specialistA,
        id: 'usr-specialist-b-delegated',
        facilityId: 'facility-b',
        department: 'ICU',
      };
      net.users.set(specialistB.id, specialistB);

      net.assignShift('facility-b', 'ICU', specialistB.id, personas.headOfDepartmentB);

      const ref = net.createReferral(
        {
          patientId: 'pat-delegated-01',
          patientData: buildStandardPatientData('Delegated test'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'ICU transfer',
        },
        personas.residentA
      );

      const review = net.addDeptComment(
        ref.id,
        'direct_approval',
        'Delegated on-call specialist approval',
        specialistB
      );
      expect(review.referral.status).toBe('dept_approved');
    });

    it('rejects unassigned residents, nurses, or ER officials from performing HoD reviews', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-hod-reject-01',
          patientData: buildStandardPatientData('HoD reject test'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'ICU request',
        },
        personas.residentA
      );

      const unauthorizedReviewers = [
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.erOfficialB,
        personas.residentA,
      ];

      unauthorizedReviewers.forEach((unauth) => {
        expect(() => {
          net.addDeptComment(ref.id, 'direct_approval', 'Unauthorized approval', unauth);
        }).toThrow(/permission denied/i);
      });
    });
  });

  // --------------------------------------------------------------------------------
  // 4. Action 3: Hospital Manager Approval Boundaries
  // --------------------------------------------------------------------------------
  describe('Action Boundary: Hospital Manager / Medical Director Final Sign-off', () => {
    it('allows Hospital Manager, Medical Director, and Deputy Manager at receiving facility to approve', () => {
      const managers = [
        personas.hospitalManagerB,
        personas.medicalDirectorB,
        personas.deputyManagerB,
        personas.owner,
        personas.systemAdmin,
      ];

      managers.forEach((mgr) => {
        const ref = net.createReferral(
          {
            patientId: `pat-mgr-${mgr.id}`,
            patientData: buildStandardPatientData(mgr.name),
            referringFacilityId: 'facility-a',
            referringUserId: personas.residentA.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'dept_approved',
            reasonForReferral: 'ICU approval test',
          },
          personas.residentA
        );

        const res = net.updateReferralStatus(ref.id, 'manager_approved', 'Approved', mgr);
        expect(res.referral.status).toBe('manager_approved');
      });
    });

    it('strictly blocks residents, clinicians, nurses, and ER officials from manager sign-off', () => {
      const nonManagers = [
        personas.residentA,
        personas.clinicianA,
        personas.specialistA,
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.erOfficialB,
      ];

      nonManagers.forEach((nonMgr) => {
        const ref = net.createReferral(
          {
            patientId: `pat-block-${nonMgr.id}`,
            patientData: buildStandardPatientData(nonMgr.name),
            referringFacilityId: 'facility-a',
            referringUserId: personas.residentA.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'dept_approved',
            reasonForReferral: 'Block manager approval test',
          },
          personas.residentA
        );

        expect(() => {
          net.updateReferralStatus(ref.id, 'manager_approved', 'Bypass approval', nonMgr);
        }).toThrow(/only hospital managers \/ medical directors can give manager approval/i);
      });
    });
  });

  // --------------------------------------------------------------------------------
  // 5. Action 4: Accompanying Doctor Escort Gate & Assignment Boundaries
  // --------------------------------------------------------------------------------
  describe('Action Boundary: Accompanying Doctor Assignment', () => {
    it('allows ER official and ER room staff at party facilities to assign doctor escort', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-auth',
          patientData: buildStandardPatientData('Escort Auth Test'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Escort required',
        },
        personas.residentA
      );

      net.recordPatientConsent(ref.id, personas.residentA);

      // Facility B ER Official
      const assignedB = net.setAccompanyingDoctor(
        ref.id,
        'Dr. Hany Kamal',
        '+201122334455',
        personas.erOfficialB
      );
      expect(assignedB.accompanyingDoctor?.name).toBe('Dr. Hany Kamal');

      // Facility A ER Room
      const assignedA = net.setAccompanyingDoctor(
        ref.id,
        'Dr. Tamer Samir',
        '+201099887766',
        personas.erRoomA
      );
      expect(assignedA.accompanyingDoctor?.name).toBe('Dr. Tamer Samir');
    });

    it('strictly blocks non-ER roles (Residents, Nurses, Medical Directors) from setting escort doctor', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-block',
          patientData: buildStandardPatientData('Escort Block Test'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Escort required',
        },
        personas.residentA
      );

      net.recordPatientConsent(ref.id, personas.residentA);

      const nonErUsers = [
        personas.residentA,
        personas.specialistA,
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.medicalDirectorB,
        personas.hospitalManagerB,
      ];

      nonErUsers.forEach((unauth) => {
        expect(() => {
          net.setAccompanyingDoctor(ref.id, 'Dr. Fake', '+201000', unauth);
        }).toThrow(/only ER official\/room roles at party facilities can assign escort doctors/i);
      });
    });
  });

  // --------------------------------------------------------------------------------
  // 6. Action 5: Referral Cancellation Boundaries & Pre-Transit Lock
  // --------------------------------------------------------------------------------
  describe('Action Boundary: Referral Cancellation & Pre-Transit Lock', () => {
    it('allows the referral creator or senior referring facility leaders to cancel pre-transit referrals', () => {
      // Creator cancellation
      const ref1 = net.createReferral(
        {
          patientId: 'pat-cancel-creator',
          patientData: buildStandardPatientData('Cancel Creator'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Cancel test',
        },
        personas.residentA
      );

      const cancelRes1 = net.cancelReferral(ref1.id, 'Patient stabilized locally', personas.residentA);
      expect(cancelRes1.referral.status).toBe('cancelled');
      expect(cancelRes1.referral.cancelledBy).toBe(personas.residentA.id);

      // Senior Referring Leader cancellation (Medical Director A)
      const ref2 = net.createReferral(
        {
          patientId: 'pat-cancel-senior',
          patientData: buildStandardPatientData('Cancel Senior'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'dept_approved',
          reasonForReferral: 'Cancel test',
        },
        personas.residentA
      );

      const cancelRes2 = net.cancelReferral(ref2.id, 'Director clinical decision', personas.medicalDirectorA);
      expect(cancelRes2.referral.status).toBe('cancelled');
    });

    it('rejects cancellation by other non-creator residents or receiving facility managers', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-cancel-unauth',
          patientData: buildStandardPatientData('Cancel Unauth'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Cancel test',
        },
        personas.residentA
      );

      // Other resident at referring facility
      expect(() => {
        net.cancelReferral(ref.id, 'Stranger resident cancel', personas.clinicianA);
      }).toThrow(/you do not have permission to cancel this referral/i);

      // Receiving facility manager
      expect(() => {
        net.cancelReferral(ref.id, 'Receiving manager cancel', personas.hospitalManagerB);
      }).toThrow(/you do not have permission to cancel this referral/i);
    });

    it('permanently locks cancellation once status is in_transit, arrived, admitted, or discharged', () => {
      const lockedStatuses: Referral['status'][] = ['in_transit', 'arrived', 'admitted', 'discharged'];

      lockedStatuses.forEach((status) => {
        const ref = net.createReferral(
          {
            patientId: `pat-locked-${status}`,
            patientData: buildStandardPatientData(`Locked ${status}`),
            referringFacilityId: 'facility-a',
            referringUserId: personas.residentA.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status,
            reasonForReferral: 'Cancel lock test',
          },
          personas.residentA
        );

        // Creator attempt
        expect(() => {
          net.cancelReferral(ref.id, 'Attempt cancel', personas.residentA);
        }).toThrow(/cannot cancel a referral once it is/i);

        // System Admin attempt
        expect(() => {
          net.cancelReferral(ref.id, 'Admin override cancel attempt', personas.systemAdmin);
        }).toThrow(/cannot cancel a referral once it is/i);

        // Owner attempt
        expect(() => {
          net.cancelReferral(ref.id, 'Owner cancel attempt', personas.owner);
        }).toThrow(/cannot cancel a referral once it is/i);
      });
    });
  });

  // --------------------------------------------------------------------------------
  // 7. Cross-Facility Tenant Isolation & Security Boundaries
  // --------------------------------------------------------------------------------
  describe('Cross-Facility Tenant Isolation', () => {
    it('strictly isolates Facility A & B referrals from third-party Facility C staff', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-tenant-iso',
          patientData: buildStandardPatientData('Tenant Isolation Test'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Isolation test',
        },
        personas.residentA
      );

      // Facility C Resident attempting to act on Facility A/B referral
      expect(net.isReferralParty(ref, personas.strangerResidentC)).toBe(false);

      expect(() => {
        net.addDeptComment(ref.id, 'direct_approval', 'Illegal cross-facility approval', personas.strangerResidentC);
      }).toThrow(/permission denied: caller not at receiving facility/i);

      expect(() => {
        net.recordPatientConsent(ref.id, personas.strangerResidentC);
      }).toThrow(/permission denied: only referring facility staff can record patient consent/i);

      expect(() => {
        net.cancelReferral(ref.id, 'Illegal cross-facility cancel', personas.strangerManagerC);
      }).toThrow(/you do not have permission to cancel this referral/i);
    });

    it('strictly isolates Direct Admissions between facilities', () => {
      // Facility A Direct Admission
      const admA = net.addDirectAdmission(
        {
          facilityId: 'facility-a',
          department: 'Emergency',
          bedType: 'Ward',
          patientName: 'Facility A Walk-in',
          hospitalId: 'FAC-A-WALK',
          admittedBy: personas.residentA.id,
        },
        personas.residentA
      );

      // Facility C Staff attempting to discharge Facility A direct admission
      expect(() => {
        net.dischargeDirectAdmission(admA.id, personas.strangerResidentC);
      }).toThrow(/permission denied: cannot discharge patient from another facility/i);
    });

    it('strictly isolates Shift Logs between facilities and enforces author binding', () => {
      // Facility B Nurse creating shift log
      const log = net.addShiftLog(
        {
          userId: personas.nurseB.id,
          userName: personas.nurseB.name,
          facilityId: 'facility-b',
          department: 'ICU',
          pendingTransfersCount: 1,
          admittedPatientsCount: 8,
          summary: 'Facility B Shift Log',
        },
        personas.nurseB
      );
      expect(log.id).toBeDefined();

      // Facility C staff attempting to forge a log for Facility B
      expect(() => {
        net.addShiftLog(
          {
            userId: personas.strangerResidentC.id,
            userName: personas.strangerResidentC.name,
            facilityId: 'facility-b',
            department: 'ICU',
            pendingTransfersCount: 0,
            admittedPatientsCount: 0,
            summary: 'Forged cross-facility log',
          },
          personas.strangerResidentC
        );
      }).toThrow(/permission denied: cannot write shift log for another facility/i);

      // Caller attempting to impersonate another user in shift log
      expect(() => {
        net.addShiftLog(
          {
            userId: personas.nurseB.id,
            userName: personas.nurseB.name,
            facilityId: 'facility-a',
            department: 'Emergency',
            pendingTransfersCount: 0,
            admittedPatientsCount: 0,
            summary: 'Impersonation log',
          },
          personas.residentA
        );
      }).toThrow(/permission denied: caller ID must match log author/i);
    });

    it('strictly forbids cross-facility modification of bed counts or facility departments', () => {
      // Facility C manager attempting to modify Facility A capacity
      expect(() => {
        net.updateFacilityCapacity(
          'facility-a',
          {
            Ward: { total: 10, occupied: 5 },
            ICU: { total: 2, occupied: 2 },
            CCU: { total: 0, occupied: 0 },
            PICU: { total: 0, occupied: 0 },
          },
          personas.strangerManagerC
        );
      }).toThrow(/permission denied: cross-facility configuration forbidden/i);

      // Facility C manager attempting to modify Facility A departments
      expect(() => {
        net.updateFacilityDepartments('facility-a', ['Emergency', 'FakeDept'], personas.strangerManagerC);
      }).toThrow(/permission denied: only facility leadership or system admin can modify departments/i);
    });
  });

  // --------------------------------------------------------------------------------
  // 8. Facility Configuration vs Bed Occupancy Separation
  // --------------------------------------------------------------------------------
  describe('Facility Configuration vs Bed Occupancy Separation', () => {
    it('allows floor nurses to update bed occupancy without altering totals', () => {
      const facB = net.facilities.get('facility-b')!;
      const totalICU = facB.capacity.ICU.total;

      const updated = net.updateFacilityCapacity(
        'facility-b',
        {
          ICU: { total: totalICU, occupied: 4 },
          CCU: { total: facB.capacity.CCU.total, occupied: facB.capacity.CCU.occupied },
          PICU: { total: facB.capacity.PICU.total, occupied: facB.capacity.PICU.occupied },
          Ward: { total: facB.capacity.Ward.total, occupied: facB.capacity.Ward.occupied },
        },
        personas.nurseB
      );

      expect(updated.capacity.ICU.occupied).toBe(4);
      expect(updated.capacity.ICU.total).toBe(10);
    });

    it('strictly blocks floor nurses from altering bed totals or adding departments', () => {
      const facB = net.facilities.get('facility-b')!;

      // Nurse attempting to change total ICU beds from 10 to 50
      expect(() => {
        net.updateFacilityCapacity(
          'facility-b',
          {
            ICU: { total: 50, occupied: 2 },
            CCU: { total: facB.capacity.CCU.total, occupied: facB.capacity.CCU.occupied },
            PICU: { total: facB.capacity.PICU.total, occupied: facB.capacity.PICU.occupied },
            Ward: { total: facB.capacity.Ward.total, occupied: facB.capacity.Ward.occupied },
          },
          personas.nurseB
        );
      }).toThrow(/permission denied: altering bed totals requires facility leadership or admin role/i);

      // Nurse attempting to rewrite departments
      expect(() => {
        net.updateFacilityDepartments('facility-b', ['ICU', 'NewHeliport'], personas.nurseB);
      }).toThrow(/permission denied: only facility leadership or system admin can modify departments/i);
    });

    it('rejects insane bed count bounds (occupied < 0 or occupied > total)', () => {
      const facB = net.facilities.get('facility-b')!;

      // Occupied > Total
      expect(() => {
        net.updateFacilityCapacity(
          'facility-b',
          {
            ICU: { total: 10, occupied: 15 },
          },
          personas.hospitalManagerB
        );
      }).toThrow(/invalid capacity bounds/i);

      // Occupied < 0
      expect(() => {
        net.updateFacilityCapacity(
          'facility-b',
          {
            ICU: { total: 10, occupied: -1 },
          },
          personas.hospitalManagerB
        );
      }).toThrow(/invalid capacity bounds/i);
    });
  });

  // --------------------------------------------------------------------------------
  // 9. Unverified & Unauthenticated User Lockdown
  // --------------------------------------------------------------------------------
  describe('Unverified User Lockdown', () => {
    it('strictly rejects unverified users from creating referrals, updating status, or recording admissions', () => {
      expect(() => {
        net.createReferral(
          {
            patientId: 'pat-unverified',
            patientData: buildStandardPatientData('Unverified Test'),
            referringFacilityId: 'facility-a',
            referringUserId: personas.unverifiedDoctor.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'pending',
            reasonForReferral: 'Unverified test',
          },
          personas.unverifiedDoctor
        );
      }).toThrow(/caller must be verified/i);

      // Unverified user attempting direct admission
      expect(() => {
        net.addDirectAdmission(
          {
            facilityId: 'facility-a',
            department: 'Emergency',
            bedType: 'Ward',
            patientName: 'Unverified Admission',
            hospitalId: 'H-UNVERIFIED',
            admittedBy: personas.unverifiedDoctor.id,
          },
          personas.unverifiedDoctor
        );
      }).toThrow(/unverified caller/i);

      // Unverified user attempting shift log
      expect(() => {
        net.addShiftLog(
          {
            userId: personas.unverifiedDoctor.id,
            userName: personas.unverifiedDoctor.name,
            facilityId: 'facility-a',
            department: 'Emergency',
            pendingTransfersCount: 0,
            admittedPatientsCount: 0,
            summary: 'Unverified log',
          },
          personas.unverifiedDoctor
        );
      }).toThrow(/unverified caller/i);
    });

    it('rejects unauthenticated (null) callers on all operations', () => {
      expect(() => {
        net.createReferral(
          {
            patientId: 'pat-null',
            patientData: buildStandardPatientData('Null Test'),
            referringFacilityId: 'facility-a',
            referringUserId: 'anon',
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'pending',
            reasonForReferral: 'Null test',
          },
          null as any
        );
      }).toThrow();
    });
  });
});
