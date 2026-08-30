import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimulatedHealthcareNetwork,
  createTestPersonas,
  PersonaDirectory,
} from './simulation-harness';
import { ReferralStatus, BedType, Role, PatientData } from '../src/types';

describe('Adversarial Persona Simulation & Boundary Stress Harness', () => {
  let net: SimulatedHealthcareNetwork;
  let personas: PersonaDirectory;

  beforeEach(() => {
    net = new SimulatedHealthcareNetwork();
    personas = createTestPersonas();
  });

  const buildStandardPatientData = (name = 'Stress Test Patient'): PatientData => ({
    id: 'pat-stress-001',
    hospitalId: 'H-STRESS-01',
    name,
    age: 50,
    gender: 'female',
    vitalSigns: {
      hr: 100,
      bp: '130/85',
      spo2: 95,
      temp: 37.5,
      rr: 20,
      timestamp: new Date().toISOString(),
    },
    complaint: 'Acute severe pain',
    presentation: 'Distressed',
    pastHistory: 'None',
    medications: 'None',
    clinicalNotes: 'Under stress test',
    diagnosis: 'Severe acute condition',
    investigations: 'Pending',
    attachments: [],
  });

  // ============================================================================
  // SECTION 1: Permission Escalation Edge Cases
  // ============================================================================
  describe('1. Permission Escalation Edge Cases', () => {
    it('rejects Resident attempting Manager Approval at any facility', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-esc-01',
          patientData: buildStandardPatientData('Escalation 1'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'dept_approved',
          reasonForReferral: 'Escalation test',
        },
        personas.residentA
      );

      // Referring resident
      expect(() => {
        net.updateReferralStatus(ref.id, 'manager_approved', 'Resident trying manager sign-off', personas.residentA);
      }).toThrow(/only hospital managers \/ medical directors can give manager approval/i);

      // Receiving resident (e.g. resident at facility B)
      const residentB = {
        ...personas.residentA,
        id: 'usr-resident-b-test',
        facilityId: 'facility-b',
      };
      net.users.set(residentB.id, residentB);

      expect(() => {
        net.updateReferralStatus(ref.id, 'manager_approved', 'Resident B trying manager sign-off', residentB);
      }).toThrow(/only hospital managers \/ medical directors can give manager approval/i);
    });

    it('rejects Staff Nurse and Nursing Supervisor attempting Doctor Escort Assignment', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-esc-02',
          patientData: buildStandardPatientData('Escalation 2'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Escort assignment escalation test',
        },
        personas.residentA
      );

      net.recordPatientConsent(ref.id, personas.residentA);

      // Staff nurse at receiving hospital
      expect(() => {
        net.setAccompanyingDoctor(ref.id, 'Dr. Fake Escort', '+201099999999', personas.nurseB);
      }).toThrow(/only ER official\/room roles at party facilities can assign escort doctors/i);

      // Nursing supervisor at receiving hospital
      expect(() => {
        net.setAccompanyingDoctor(ref.id, 'Dr. Fake Escort 2', '+201099999998', personas.nursingSupervisorB);
      }).toThrow(/only ER official\/room roles at party facilities can assign escort doctors/i);
    });

    it('rejects third-party Facility Manager modifying another hospital bed count or departments', () => {
      // Stranger Manager C attempting to modify Facility A capacity
      expect(() => {
        net.updateFacilityCapacity(
          'facility-a',
          {
            Ward: { total: 20, occupied: 5 },
            ICU: { total: 5, occupied: 1 },
            CCU: { total: 0, occupied: 0 },
            PICU: { total: 0, occupied: 0 },
          },
          personas.strangerManagerC
        );
      }).toThrow(/permission denied: cross-facility configuration forbidden/i);

      // Stranger Manager C attempting to modify Facility A departments
      expect(() => {
        net.updateFacilityDepartments('facility-a', ['ICU', 'HackedDept'], personas.strangerManagerC);
      }).toThrow(/permission denied: only facility leadership or system admin can modify departments/i);
    });

    it('rejects non-doctor personas (Nurses, ER Officials, Managers) attempting to create referrals', () => {
      const nonDoctors = [
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.erOfficialB,
        personas.erRoomA,
        personas.hospitalManagerB,
        personas.deputyManagerB,
      ];

      nonDoctors.forEach((user) => {
        expect(() => {
          net.createReferral(
            {
              patientId: `pat-non-doc-${user.id}`,
              patientData: buildStandardPatientData(user.name),
              referringFacilityId: user.facilityId || 'facility-a',
              referringUserId: user.id,
              receivingFacilityId: 'facility-b',
              receivingDepartments: ['ICU'],
              requiredBedType: 'ICU',
              priority: 'urgent',
              status: 'pending',
              reasonForReferral: 'Non-doctor creation attempt',
            },
            user
          );
        }).toThrow(/only doctors can initiate referrals/i);
      });
    });

    it('rejects unverified doctors from any clinical operations', () => {
      // Create referral
      expect(() => {
        net.createReferral(
          {
            patientId: 'pat-unver-1',
            patientData: buildStandardPatientData('Unverified'),
            referringFacilityId: 'facility-a',
            referringUserId: personas.unverifiedDoctor.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'pending',
            reasonForReferral: 'Unverified creation',
          },
          personas.unverifiedDoctor
        );
      }).toThrow(/caller must be verified/i);

      // Create a valid referral first
      const ref = net.createReferral(
        {
          patientId: 'pat-unver-2',
          patientData: buildStandardPatientData('Valid Ref'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Valid Ref',
        },
        personas.residentA
      );

      // Unverified doctor attempting HoD review
      expect(() => {
        net.addDeptComment(ref.id, 'direct_approval', 'Unverified review', personas.unverifiedDoctor);
      }).toThrow(/unverified caller/i);

      // Unverified doctor attempting status update
      expect(() => {
        net.updateReferralStatus(ref.id, 'manager_approved', 'Unverified manager', personas.unverifiedDoctor);
      }).toThrow(/unverified caller/i);

      // Unverified doctor attempting consent
      expect(() => {
        net.recordPatientConsent(ref.id, personas.unverifiedDoctor);
      }).toThrow(/unverified caller/i);

      // Unverified doctor attempting cancellation
      expect(() => {
        net.cancelReferral(ref.id, 'Unverified cancel', personas.unverifiedDoctor);
      }).toThrow(/unverified caller/i);
    });
  });

  // ============================================================================
  // SECTION 2: Illegal Lifecycle State Transition Jumps & Pre-requisite Skipping
  // ============================================================================
  describe('2. Lifecycle State Transition Illegal Jumps & Bypass Stress', () => {
    it('strictly blocks jumping directly from pending to in_transit', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-jump-01',
          patientData: buildStandardPatientData('Illegal Jump 1'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Jump test',
        },
        personas.residentA
      );

      expect(() => {
        net.updateReferralStatus(ref.id, 'in_transit', 'Bypassing approvals and consent', personas.erOfficialB);
      }).toThrow(/invalid status transition from pending to in_transit/i);
    });

    it('strictly blocks dispatching in_transit without patient consent (from accepted status)', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-jump-02',
          patientData: buildStandardPatientData('Illegal Jump 2'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'accepted',
          requiresAccompanyingDoctor: false,
          reasonForReferral: 'Skip consent test',
        },
        personas.residentA
      );

      expect(() => {
        net.updateReferralStatus(ref.id, 'in_transit', 'Dispatch before consent', personas.erOfficialB);
      }).toThrow(/Invalid status transition from accepted to in_transit|Cannot mark in transit before the patient has consented/i);
    });

    it('strictly blocks dispatching in_transit when doctor escort is required but not assigned', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-jump-03',
          patientData: buildStandardPatientData('Illegal Jump 3'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Escort missing test',
        },
        personas.residentA
      );

      net.recordPatientConsent(ref.id, personas.residentA);

      expect(() => {
        net.updateReferralStatus(ref.id, 'in_transit', 'Dispatching without doctor escort', personas.erOfficialB);
      }).toThrow(/add the accompanying doctor’s name and phone number before dispatching the ambulance/i);
    });

    it('strictly blocks jumping directly from in_transit to admitted or discharged (must arrive first)', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-jump-04',
          patientData: buildStandardPatientData('Illegal Jump 4'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'in_transit',
          reasonForReferral: 'Skip arrival test',
        },
        personas.residentA
      );

      // Attempt in_transit -> admitted
      expect(() => {
        net.updateReferralStatus(ref.id, 'admitted', 'Admitting directly from ambulance', personas.nurseB);
      }).toThrow(/invalid status transition from in_transit to admitted/i);

      // Attempt in_transit -> discharged
      expect(() => {
        net.updateReferralStatus(ref.id, 'discharged', 'Discharging from ambulance', personas.nurseB);
      }).toThrow(/invalid status transition from in_transit to discharged/i);
    });

    it('strictly blocks reopening or modifying a discharged referral back to pending, accepted, or admitted', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-jump-05',
          patientData: buildStandardPatientData('Illegal Jump 5'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'discharged',
          reasonForReferral: 'Terminal state test',
        },
        personas.residentA
      );

      const targetStatuses: ReferralStatus[] = ['pending', 'dept_approved', 'manager_approved', 'accepted', 'patient_consented', 'in_transit', 'arrived', 'admitted', 'cancelled'];

      targetStatuses.forEach((status) => {
        expect(() => {
          net.updateReferralStatus(ref.id, status, `Reopening to ${status}`, personas.medicalDirectorB);
        }).toThrow(/invalid status transition from discharged to/i);
      });
    });

    it('enforces cancellation lock on all locked statuses (in_transit, arrived, admitted, discharged)', () => {
      const lockedStatuses: ReferralStatus[] = ['in_transit', 'arrived', 'admitted', 'discharged'];

      lockedStatuses.forEach((status) => {
        const ref = net.createReferral(
          {
            patientId: `pat-lock-${status}`,
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
          net.cancelReferral(ref.id, 'Creator cancel attempt', personas.residentA);
        }).toThrow(/cannot cancel a referral once it is/i);

        // Senior Leader attempt
        expect(() => {
          net.cancelReferral(ref.id, 'Senior leader cancel attempt', personas.medicalDirectorA);
        }).toThrow(/cannot cancel a referral once it is/i);

        // System Admin attempt
        expect(() => {
          net.cancelReferral(ref.id, 'Admin cancel attempt', personas.systemAdmin);
        }).toThrow(/cannot cancel a referral once it is/i);
      });
    });
  });

  // ============================================================================
  // SECTION 3: Bed Capacity Bounds & Over-Allocation Stress
  // ============================================================================
  describe('3. Bed Capacity Bounds & Arithmetic Stress', () => {
    it('prevents bed capacity underflow when discharging from 0 occupied beds', () => {
      // Set Facility A CCU occupied to 0
      const facA = net.facilities.get('facility-a')!;
      facA.capacity.CCU = { total: 5, occupied: 0 };

      // Create and discharge a direct admission
      const adm = net.addDirectAdmission(
        {
          facilityId: 'facility-a',
          department: 'Cardiology',
          bedType: 'CCU',
          patientName: 'Zero Bed Patient',
          hospitalId: 'H-000',
          admittedBy: personas.residentA.id,
        },
        personas.residentA
      );

      // Occupied became 1
      expect(facA.capacity.CCU.occupied).toBe(1);

      // First discharge
      net.dischargeDirectAdmission(adm.id, personas.residentA);
      expect(facA.capacity.CCU.occupied).toBe(0);

      // Redundant discharge must not decrement below 0
      net.dischargeDirectAdmission(adm.id, personas.residentA);
      expect(facA.capacity.CCU.occupied).toBe(0);
    });

    it('rejects setting occupied > total or negative capacity in facility configuration', () => {
      // Occupied > Total
      expect(() => {
        net.updateFacilityCapacity(
          'facility-b',
          {
            ICU: { total: 10, occupied: 11 },
          },
          personas.hospitalManagerB
        );
      }).toThrow(/invalid capacity bounds for ICU: occupied must be between 0 and total/i);

      // Negative occupied
      expect(() => {
        net.updateFacilityCapacity(
          'facility-b',
          {
            ICU: { total: 10, occupied: -2 },
          },
          personas.hospitalManagerB
        );
      }).toThrow(/invalid capacity bounds for ICU: occupied must be between 0 and total/i);

      // Negative total
      expect(() => {
        net.updateFacilityCapacity(
          'facility-b',
          {
            ICU: { total: -5, occupied: 0 },
          },
          personas.hospitalManagerB
        );
      }).toThrow(/invalid capacity bounds for ICU: occupied must be between 0 and total/i);
    });

    it('handles multiple sequential admissions and discharges transactionally maintaining correct totals', () => {
      const facB = net.facilities.get('facility-b')!;
      const initialOccupied = facB.capacity.ICU.occupied; // 2

      // Admit 5 patients sequentially via referral workflow
      const refs = [];
      for (let i = 0; i < 5; i++) {
        const ref = net.createReferral(
          {
            patientId: `pat-seq-${i}`,
            patientData: buildStandardPatientData(`Seq Patient ${i}`),
            referringFacilityId: 'facility-a',
            referringUserId: personas.residentA.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'arrived',
            reasonForReferral: `Seq test ${i}`,
          },
          personas.residentA
        );

        net.updateReferralStatus(ref.id, 'admitted', `Admitted #${i}`, personas.nurseB);
        refs.push(ref);
      }

      expect(facB.capacity.ICU.occupied).toBe(initialOccupied + 5);

      // Discharge 3 of them
      for (let i = 0; i < 3; i++) {
        net.updateReferralStatus(refs[i].id, 'discharged', `Discharged #${i}`, personas.nurseB);
      }

      expect(facB.capacity.ICU.occupied).toBe(initialOccupied + 2);
    });
  });

  // ============================================================================
  // SECTION 4: Cross-Facility Tenant Isolation & Data Integrity
  // ============================================================================
  describe('4. Cross-Facility Tenant Isolation & Non-Party Intrusion Defense', () => {
    it('blocks third-party doctor from creating a referral on behalf of another hospital', () => {
      // Resident C (Facility C) attempting to create referral claiming referringFacilityId = facility-a
      expect(() => {
        net.createReferral(
          {
            patientId: 'pat-cross-create',
            patientData: buildStandardPatientData('Cross Facility Create'),
            referringFacilityId: 'facility-a',
            referringUserId: personas.strangerResidentC.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: 'pending',
            reasonForReferral: 'Cross facility spoofing',
          },
          personas.strangerResidentC
        );
      }).toThrow(/permission denied: cannot create referral on behalf of another facility/i);
    });

    it('blocks non-party hospital staff from receiving notifications for private direct referrals', () => {
      // Direct referral from Facility A to Facility B (not auto-routed to C)
      const ref = net.createReferral(
        {
          patientId: 'pat-private-01',
          patientData: buildStandardPatientData('Private Transfer'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Direct A to B',
        },
        personas.residentA
      );

      const notifsForRef = Array.from(net.notifications.values()).filter((n) => n.referralId === ref.id);

      // Verify no notifications were sent to Facility C users
      const facilityCUserIds = [personas.strangerResidentC.id, personas.strangerManagerC.id];
      const leakedNotifs = notifsForRef.filter((n) => facilityCUserIds.includes(n.userId));
      expect(leakedNotifs).toHaveLength(0);
    });

    it('blocks non-party facility from assigning shifts or tampering with shift assignments', () => {
      // Stranger Manager C attempting to assign shift at Facility B
      expect(() => {
        net.assignShift('facility-b', 'ICU', personas.strangerResidentC.id, personas.strangerManagerC);
      }).toThrow(/permission denied: only Head of Department or admin can assign shifts/i);
    });

    it('blocks caller ID spoofing in shift logs and direct admissions', () => {
      // Caller residentA trying to author log under nurseB identity
      expect(() => {
        net.addShiftLog(
          {
            userId: personas.nurseB.id,
            userName: personas.nurseB.name,
            facilityId: 'facility-a',
            department: 'Emergency',
            pendingTransfersCount: 0,
            admittedPatientsCount: 0,
            summary: 'Spoofed nurse log',
          },
          personas.residentA
        );
      }).toThrow(/caller ID must match log author/i);

      // Resident A trying to create direct admission for Facility B
      expect(() => {
        net.addDirectAdmission(
          {
            facilityId: 'facility-b',
            department: 'ICU',
            bedType: 'ICU',
            patientName: 'Cross facility direct admission',
            hospitalId: 'H-CROSS',
            admittedBy: personas.residentA.id,
          },
          personas.residentA
        );
      }).toThrow(/cannot admit patient into another facility/i);
    });
  });

  // ============================================================================
  // SECTION 5: Exhaustive Illegal State Transition Matrix Stress
  // ============================================================================
  describe('5. Exhaustive Illegal State Transition Matrix Stress', () => {
    it('exhaustively rejects all invalid direct transitions across the entire status matrix', () => {
      const allStatuses: ReferralStatus[] = [
        'pending',
        'dept_approved',
        'manager_approved',
        'accepted',
        'patient_consented',
        'in_transit',
        'arrived',
        'admitted',
        'discharged',
        'postponed',
        'rejected',
        'cancelled',
      ];

      const illegalMatrixPairs: [ReferralStatus, ReferralStatus][] = [
        ['pending', 'in_transit'],
        ['pending', 'arrived'],
        ['pending', 'admitted'],
        ['pending', 'discharged'],
        ['pending', 'patient_consented'],

        ['dept_approved', 'in_transit'],
        ['dept_approved', 'arrived'],
        ['dept_approved', 'admitted'],
        ['dept_approved', 'discharged'],
        ['dept_approved', 'patient_consented'],

        ['manager_approved', 'in_transit'],
        ['manager_approved', 'arrived'],
        ['manager_approved', 'admitted'],
        ['manager_approved', 'discharged'],
        ['manager_approved', 'patient_consented'],

        ['accepted', 'in_transit'],
        ['accepted', 'arrived'],
        ['accepted', 'admitted'],
        ['accepted', 'discharged'],

        ['patient_consented', 'dept_approved'],
        ['patient_consented', 'manager_approved'],
        ['patient_consented', 'arrived'],
        ['patient_consented', 'admitted'],
        ['patient_consented', 'discharged'],

        ['in_transit', 'pending'],
        ['in_transit', 'dept_approved'],
        ['in_transit', 'manager_approved'],
        ['in_transit', 'accepted'],
        ['in_transit', 'patient_consented'],
        ['in_transit', 'admitted'],
        ['in_transit', 'discharged'],
        ['in_transit', 'postponed'],
        ['in_transit', 'rejected'],
        ['in_transit', 'cancelled'],

        ['arrived', 'pending'],
        ['arrived', 'dept_approved'],
        ['arrived', 'manager_approved'],
        ['arrived', 'accepted'],
        ['arrived', 'patient_consented'],
        ['arrived', 'in_transit'],
        ['arrived', 'postponed'],
        ['arrived', 'rejected'],
        ['arrived', 'cancelled'],

        ['admitted', 'pending'],
        ['admitted', 'dept_approved'],
        ['admitted', 'manager_approved'],
        ['admitted', 'accepted'],
        ['admitted', 'patient_consented'],
        ['admitted', 'in_transit'],
        ['admitted', 'arrived'],
        ['admitted', 'postponed'],
        ['admitted', 'rejected'],
        ['admitted', 'cancelled'],

        ['discharged', 'pending'],
        ['discharged', 'dept_approved'],
        ['discharged', 'manager_approved'],
        ['discharged', 'accepted'],
        ['discharged', 'patient_consented'],
        ['discharged', 'in_transit'],
        ['discharged', 'arrived'],
        ['discharged', 'admitted'],
        ['discharged', 'postponed'],
        ['discharged', 'rejected'],
        ['discharged', 'cancelled'],
      ];

      illegalMatrixPairs.forEach(([fromStatus, toStatus]) => {
        const isValid = net.isValidTransition(fromStatus, toStatus);
        expect(isValid, `Transition from ${fromStatus} to ${toStatus} must be ILLEGAL`).toBe(false);

        // Attempting via updateReferralStatus
        const ref = net.createReferral(
          {
            patientId: `pat-mat-${fromStatus}-${toStatus}`,
            patientData: buildStandardPatientData(`Matrix ${fromStatus}->${toStatus}`),
            referringFacilityId: 'facility-a',
            referringUserId: personas.residentA.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['ICU'],
            requiredBedType: 'ICU',
            priority: 'urgent',
            status: fromStatus,
            reasonForReferral: 'Matrix stress test',
          },
          personas.residentA
        );

        expect(() => {
          net.updateReferralStatus(ref.id, toStatus, `Illegal jump ${fromStatus} -> ${toStatus}`, personas.residentA);
        }).toThrow();
      });
    });
  });
});

