import { describe, it, expect, beforeEach } from 'vitest';
import {
  SimulatedHealthcareNetwork,
  createTestPersonas,
  PersonaDirectory,
} from './simulation-harness';
import { Referral, PatientData } from '../src/types';

describe('Milestone 2 - Multi-Party Healthcare Persona Lifecycle Simulations (R1)', () => {
  let net: SimulatedHealthcareNetwork;
  let personas: PersonaDirectory;

  beforeEach(() => {
    net = new SimulatedHealthcareNetwork();
    personas = createTestPersonas();
  });

  const buildPatientData = (name = 'Ahmed Hassan', bedType = 'ICU'): PatientData => ({
    id: 'pat-1001',
    hospitalId: 'H-9876',
    nationalId: '29001011901234',
    name,
    age: 58,
    gender: 'male',
    bloodType: 'A+',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    vitalSigns: {
      hr: 115,
      bp: '160/95',
      spo2: 91,
      temp: 38.2,
      rr: 24,
      gcs: 14,
      timestamp: new Date().toISOString(),
    },
    complaint: 'Severe acute crushing chest pain radiating to left jaw',
    presentation: 'Diaphoretic, tachypneic, acutely distressed',
    pastHistory: 'Known hypertensive for 10 years, on ACE inhibitors',
    medications: 'Ramipril 5mg OD, Metformin 500mg BD',
    clinicalNotes: 'ST elevations in leads II, III, aVF. Requires urgent cardiac catheterization / ICU transfer.',
    diagnosis: 'Acute Inferior Wall ST-Elevation Myocardial Infarction (STEMI)',
    investigations: 'Troponin I elevated at 4.2 ng/mL, ECG shows 3mm ST elevation in inferior leads',
    attachments: [
      {
        id: 'att-1',
        name: '12_lead_ecg.jpg',
        url: 'https://storage.ismailia-health.gov.eg/attachments/ecg1.jpg',
        type: 'image',
        size: 2400000,
        mimeType: 'image/jpeg',
      },
      {
        id: 'att-2',
        name: 'cardiac_enzymes_report.pdf',
        url: 'https://storage.ismailia-health.gov.eg/attachments/report.pdf',
        type: 'document',
        size: 512000,
        mimeType: 'application/pdf',
      },
    ],
  });

  describe('Primary Happy-Path End-to-End Persona Lifecycle Handoff (Stages 1 through 7)', () => {
    it('executes full 7-stage multi-role transfer: Resident -> HoD -> Hospital Manager -> Consent -> ER Escort & Dispatch -> Nurse Admission & Discharge -> Admin Audit', () => {
      // --------------------------------------------------------------------------------
      // STAGE 1: Referring Doctor (Resident at Facility A) creates acute transfer
      // --------------------------------------------------------------------------------
      const patientData = buildPatientData('Mohamed Ali', 'ICU');
      const initialReferralData: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'deptComments'> = {
        patientId: patientData.id,
        patientData,
        referringFacilityId: 'facility-a',
        referringUserId: personas.residentA.id,
        receivingFacilityId: 'auto',
        candidateFacilityIds: ['facility-b', 'facility-c'],
        receivingDepartments: ['ICU', 'Cardiology'],
        requiredBedType: 'ICU',
        priority: 'emergency',
        transferType: 'one_way',
        requiresAccompanyingDoctor: true,
        reasonForReferral: 'Acute STEMI needing immediate ICU bed and cath lab backup',
        status: 'pending',
      };

      const ref = net.createReferral(initialReferralData, personas.residentA, true);
      expect(ref.id).toBeDefined();
      expect(ref.status).toBe('pending');
      expect(ref.isEscalated).toBe(false);
      expect(ref.requiresAccompanyingDoctor).toBe(true);
      expect(ref.statusHistory).toHaveLength(1);
      expect(ref.statusHistory[0]).toMatchObject({
        status: 'pending',
        userId: personas.residentA.id,
      });

      // Verify notification fan-out to candidate facilities (Facility B and C leaders)
      const stage1Notifs = Array.from(net.notifications.values()).filter((n) => n.referralId === ref.id);
      expect(stage1Notifs.length).toBeGreaterThanOrEqual(4);
      const hodBNotif = stage1Notifs.find((n) => n.userId === personas.headOfDepartmentB.id);
      expect(hodBNotif).toBeDefined();
      expect(hodBNotif?.type).toBe('urgent');
      expect(hodBNotif?.title).toContain('CRITICAL ALERT');

      // --------------------------------------------------------------------------------
      // STAGE 2: Head of Department (Facility B) reviews diagnostics and approves
      // --------------------------------------------------------------------------------
      const hodReview = net.addDeptComment(
        ref.id,
        'direct_approval',
        'Reviewed ECG and cardiac enzymes. Cath team and ICU bed 4 prepared. Direct approval.',
        personas.headOfDepartmentB
      );

      expect(hodReview.referral.status).toBe('dept_approved');
      expect(hodReview.referral.receivingFacilityId).toBe('facility-b');
      expect(hodReview.referral.deptComments).toHaveLength(1);
      expect(hodReview.referral.deptComments[0].status).toBe('direct_approval');
      expect(hodReview.referral.statusHistory).toHaveLength(2);
      expect(hodReview.referral.statusHistory[1]).toMatchObject({
        status: 'dept_approved',
        userId: personas.headOfDepartmentB.id,
      });

      // Notification sent to Facility B Managers for executive signature
      const stage2Notifs = hodReview.notifications;
      const mgrNotif = stage2Notifs.find((n) => n.userId === personas.hospitalManagerB.id);
      expect(mgrNotif).toBeDefined();
      expect(mgrNotif?.title).toContain('Department Approved - Needs Final Approval');

      // --------------------------------------------------------------------------------
      // STAGE 3: Medical Director / Hospital Manager (Facility B) authorizes admission
      // --------------------------------------------------------------------------------
      // Step 3a: Manager approval
      const mgrApproval = net.updateReferralStatus(
        ref.id,
        'manager_approved',
        'Executive capacity approved by Hospital Manager Mr. Essam.',
        personas.hospitalManagerB
      );
      expect(mgrApproval.referral.status).toBe('manager_approved');
      expect(mgrApproval.referral.statusHistory).toHaveLength(3);

      // Step 3b: Facility accepts patient
      const acceptResult = net.updateReferralStatus(
        ref.id,
        'accepted',
        'Facility B confirmed acceptance.',
        personas.hospitalManagerB
      );
      expect(acceptResult.referral.status).toBe('accepted');
      expect(acceptResult.referral.statusHistory).toHaveLength(4);

      // --------------------------------------------------------------------------------
      // STAGE 4: Referring Doctor (Resident at Facility A) records patient consent
      // --------------------------------------------------------------------------------
      const consentResult = net.recordPatientConsent(ref.id, personas.residentA);
      expect(consentResult.referral.status).toBe('patient_consented');
      expect(consentResult.referral.statusHistory).toHaveLength(5);
      expect(consentResult.referral.statusHistory[4].status).toBe('patient_consented');

      // Notification sent to Receiving ER Official
      const consentNotif = consentResult.notifications.find((n) => n.userId === personas.erOfficialB.id);
      expect(consentNotif).toBeDefined();
      expect(consentNotif?.title).toContain('Patient Consented to Transfer');

      // --------------------------------------------------------------------------------
      // STAGE 5: Receiving ER Official coordinates escort doctor and ambulance dispatch
      // --------------------------------------------------------------------------------
      // Attempting dispatch without escort doctor must throw error
      expect(() => {
        net.updateReferralStatus(ref.id, 'in_transit', 'Ambulance departing', personas.erOfficialB);
      }).toThrow(/accompanying doctor/i);

      // ER Official assigns escort doctor
      const escortedRef = net.setAccompanyingDoctor(
        ref.id,
        'Dr. Ahmed Taha',
        '+201012345678',
        personas.erOfficialB
      );
      expect(escortedRef.accompanyingDoctor).toEqual({
        name: 'Dr. Ahmed Taha',
        phoneNumber: '+201012345678',
        addedBy: personas.erOfficialB.id,
        addedAt: expect.any(String),
      });
      expect(escortedRef.statusHistory).toHaveLength(6);
      expect(escortedRef.statusHistory[5].notes).toContain('Dr. Ahmed Taha (+201012345678)');

      // ER Official dispatches ambulance -> in_transit
      const dispatchResult = net.updateReferralStatus(
        ref.id,
        'in_transit',
        'Ambulance Unit 104 en route with Dr. Ahmed Taha escort.',
        personas.erOfficialB
      );
      expect(dispatchResult.referral.status).toBe('in_transit');
      expect(dispatchResult.referral.statusHistory).toHaveLength(7);

      // Cancel-lock verification: once in_transit, cancellation MUST be rejected
      expect(() => {
        net.cancelReferral(ref.id, 'Doctor wants to cancel transfer', personas.residentA);
      }).toThrow(/Cannot cancel a referral once it is in transit/i);

      expect(() => {
        net.cancelReferral(ref.id, 'Admin cancellation attempt', personas.owner);
      }).toThrow(/Cannot cancel a referral once it is in transit/i);

      // Inbound tracking & Arrival confirmation at Facility B ER
      const arrivalResult = net.updateReferralStatus(
        ref.id,
        'arrived',
        'Patient safely arrived at Facility B ER Bay 2.',
        personas.erOfficialB
      );
      expect(arrivalResult.referral.status).toBe('arrived');
      expect(arrivalResult.referral.statusHistory).toHaveLength(8);

      // --------------------------------------------------------------------------------
      // STAGE 6: Floor Nurse / Nursing Supervisor admits to ICU and manages bed count
      // --------------------------------------------------------------------------------
      const facBInitial = net.facilities.get('facility-b')!;
      const initialOccupied = facBInitial.capacity.ICU.occupied; // 2
      expect(initialOccupied).toBe(2);

      // Nurse admits patient to ICU bed
      const admitResult = net.updateReferralStatus(
        ref.id,
        'admitted',
        'Patient admitted to ICU Bed #4. Central line and monitor attached.',
        personas.nurseB
      );
      expect(admitResult.referral.status).toBe('admitted');
      expect(admitResult.referral.statusHistory).toHaveLength(9);

      // Bed capacity must transactionally increment from 2 to 3
      const facBAfterAdmit = net.facilities.get('facility-b')!;
      expect(facBAfterAdmit.capacity.ICU.occupied).toBe(3);

      // Patient completes treatment and is discharged
      const dischargeResult = net.updateReferralStatus(
        ref.id,
        'discharged',
        'Patient successfully treated, stabilized, and discharged.',
        personas.nursingSupervisorB
      );
      expect(dischargeResult.referral.status).toBe('discharged');
      expect(dischargeResult.referral.statusHistory).toHaveLength(10);

      // Bed capacity must transactionally decrement back from 3 to 2
      const facBAfterDischarge = net.facilities.get('facility-b')!;
      expect(facBAfterDischarge.capacity.ICU.occupied).toBe(2);

      // --------------------------------------------------------------------------------
      // STAGE 7: System Administrator / Network Owner Governance & Audit Inspection
      // --------------------------------------------------------------------------------
      const storedRef = net.referrals.get(ref.id)!;
      expect(storedRef.statusHistory).toHaveLength(10);
      const statuses = storedRef.statusHistory.map((s) => s.status);
      expect(statuses).toEqual([
        'pending',
        'dept_approved',
        'manager_approved',
        'accepted',
        'patient_consented',
        'patient_consented', // Accompanying doctor note entry
        'in_transit',
        'arrived',
        'admitted',
        'discharged',
      ]);

      // System Admin updates network facility capacity
      const updatedFac = net.updateFacilityCapacity(
        'facility-b',
        {
          ICU: { total: 12, occupied: 2 },
          CCU: { total: 8, occupied: 1 },
          PICU: { total: 4, occupied: 0 },
          Ward: { total: 30, occupied: 10 },
        },
        personas.systemAdmin
      );
      expect(updatedFac.capacity.ICU.total).toBe(12);
      expect(updatedFac.capacity.CCU.total).toBe(8);
    });

    it('supports all 4 clinical referring doctor personas (Resident, Specialist, Consultant, Clinician)', () => {
      const roles: (keyof PersonaDirectory)[] = ['residentA', 'specialistA', 'consultantA', 'clinicianA'];

      roles.forEach((personaKey, idx) => {
        const caller = personas[personaKey];
        const patientData = buildPatientData(`Patient ${caller.name}`, 'Ward');
        const ref = net.createReferral(
          {
            patientId: `pat-role-${idx}`,
            patientData,
            referringFacilityId: 'facility-a',
            referringUserId: caller.id,
            receivingFacilityId: 'facility-b',
            receivingDepartments: ['Emergency'],
            requiredBedType: 'Ward',
            priority: 'urgent',
            status: 'pending',
            reasonForReferral: `Referral raised by ${caller.role}`,
          },
          caller
        );

        expect(ref.id).toBeDefined();
        expect(ref.referringUserId).toBe(caller.id);
        expect(ref.status).toBe('pending');
      });
    });
  });

  describe('Exception & Branch Lifecycle Pathways', () => {
    it('Branch A: Head of Department Postponement with Requirements Needed and Auto-Escalation', () => {
      const patientData = buildPatientData('Mahmoud Reda', 'ICU');
      const ref = net.createReferral(
        {
          patientId: patientData.id,
          patientData,
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Need ICU bed',
        },
        personas.residentA
      );

      // HoD reviews and selects requirements_needed
      const commentResult = net.addDeptComment(
        ref.id,
        'requirements_needed',
        'Missing CT Brain scan and arterial blood gas (ABG) panel.',
        personas.headOfDepartmentB
      );

      expect(commentResult.referral.status).toBe('postponed');
      expect(commentResult.referral.receivingFacilityId).toBe('facility-b');
      expect(commentResult.referral.isEscalated).toBe(true);
      expect(commentResult.referral.escalatedBy).toBe('system');
      expect(commentResult.referral.escalationReason).toBe('requirements_needed');
      expect(commentResult.referral.escalationLevel).toBe('facility');

      // Assert purple urgent notifications dispatched
      const purpleNotifs = commentResult.notifications.filter((n) => n.type === 'purple');
      expect(purpleNotifs.length).toBeGreaterThanOrEqual(1);
      const refDocNotif = purpleNotifs.find((n) => n.userId === personas.residentA.id);
      expect(refDocNotif).toBeDefined();
      expect(refDocNotif?.title).toContain('Referral Postponed — Requirements Needed');

      // Referring doctor answers requirements, HoD re-reviews and approves
      const approvalResult = net.addDeptComment(
        ref.id,
        'direct_approval',
        'CT Brain and ABG panel uploaded. Approved for admission.',
        personas.headOfDepartmentB
      );
      expect(approvalResult.referral.deptComments).toHaveLength(2);
    });

    it('Branch B: Medical Director Rejection with Mandatory Reason Logging', () => {
      const patientData = buildPatientData('Tarek Fathy', 'ICU');
      const ref = net.createReferral(
        {
          patientId: patientData.id,
          patientData,
          referringFacilityId: 'facility-a',
          referringUserId: personas.specialistA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Complex post-op case',
        },
        personas.specialistA
      );

      // Attempting rejection without notes/reason throws
      expect(() => {
        net.updateReferralStatus(ref.id, 'rejected', '', personas.medicalDirectorB);
      }).toThrow(/rejection reason is required/i);

      expect(() => {
        net.updateReferralStatus(ref.id, 'rejected', '   ', personas.medicalDirectorB);
      }).toThrow(/rejection reason is required/i);

      // Rejection with valid clinical reason
      const rejectionResult = net.updateReferralStatus(
        ref.id,
        'rejected',
        'No isolation ICU beds available due to sterilization schedule.',
        personas.medicalDirectorB
      );

      expect(rejectionResult.referral.status).toBe('rejected');
      expect(rejectionResult.referral.rejectionReason).toBe(
        'No isolation ICU beds available due to sterilization schedule.'
      );
      expect(rejectionResult.referral.rejectedBy).toBe(personas.medicalDirectorB.id);
      expect(rejectionResult.referral.rejectedAt).toBeDefined();
      expect(rejectionResult.referral.statusHistory.at(-1)?.notes).toContain('Rejected:');

      // Warning notification sent to referring clinician at Facility A
      const notifs = rejectionResult.notifications;
      const refNotif = notifs.find((n) => n.userId === personas.specialistA.id);
      expect(refNotif?.type).toBe('warning');
    });

    it('Branch C: Patient Decline & Automatic Candidate Re-Routing', () => {
      const patientData = buildPatientData('Hoda Mostafa', 'ICU');
      const ref = net.createReferral(
        {
          patientId: patientData.id,
          patientData,
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b', 'facility-c'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'ICU evaluation',
        },
        personas.residentA
      );

      // Facility B approves and accepts
      net.addDeptComment(ref.id, 'direct_approval', 'Accepted at B', personas.headOfDepartmentB);
      net.updateReferralStatus(ref.id, 'manager_approved', 'Manager approval B', personas.hospitalManagerB);
      net.updateReferralStatus(ref.id, 'accepted', 'Accepted at B', personas.hospitalManagerB);

      expect(net.referrals.get(ref.id)?.status).toBe('accepted');
      expect(net.referrals.get(ref.id)?.receivingFacilityId).toBe('facility-b');

      // Patient declines transfer to Facility B
      const declineResult = net.recordPatientDecline(
        ref.id,
        'Patient family prefers University Hospital C closer to home.',
        personas.residentA
      );

      const reroutedRef = declineResult.referral;
      expect(reroutedRef.status).toBe('pending');
      expect(reroutedRef.receivingFacilityId).toBe('auto');
      expect(reroutedRef.patientDeclinedFacilityIds).toEqual(['facility-b']);
      expect(reroutedRef.candidateFacilityIds).toEqual(['facility-c']);

      // Notifications dispatched to Facility C leadership
      const cNotifs = declineResult.notifications.filter((n) => n.userId === personas.strangerManagerC.id);
      expect(cNotifs.length).toBeGreaterThanOrEqual(1);
      expect(cNotifs[0].title).toContain('Referral Re-routed After Patient Decline');
    });

    it('Branch D: Floor Nurse Direct Walk-in Admission & Shift Handover Logging', () => {
      const facB = net.facilities.get('facility-b')!;
      const initialWardOccupied = facB.capacity.Ward.occupied; // 10

      // Direct Walk-In Admission
      const directAdm = net.addDirectAdmission(
        {
          facilityId: 'facility-b',
          department: 'ICU',
          bedType: 'Ward',
          patientName: 'Walk-in Patient Youssef',
          hospitalId: 'WALK-505',
          admittedBy: personas.nurseB.id,
        },
        personas.nurseB
      );

      expect(directAdm.id).toBeDefined();
      expect(directAdm.status).toBe('admitted');
      expect(facB.capacity.Ward.occupied).toBe(initialWardOccupied + 1); // 11

      // Discharge Direct Admission
      const discharged = net.dischargeDirectAdmission(directAdm.id, personas.nursingSupervisorB);
      expect(discharged.status).toBe('discharged');
      expect(facB.capacity.Ward.occupied).toBe(initialWardOccupied); // 10

      // Shift Handover Log
      const shiftLog = net.addShiftLog(
        {
          userId: personas.nurseB.id,
          userName: personas.nurseB.name,
          facilityId: 'facility-b',
          department: 'ICU',
          pendingTransfersCount: 2,
          admittedPatientsCount: 14,
          summary: 'Night shift handover: All ICU patients stable. Bed 4 sanitized after discharge.',
        },
        personas.nurseB
      );

      expect(shiftLog.id).toBeDefined();
      expect(shiftLog.timestamp).toBeDefined();
      expect(net.shiftLogs.get(shiftLog.id)).toBeDefined();
    });

    it('Branch E: System Admin Forced Destination Override to Contracted Facility D', () => {
      const patientData = buildPatientData('Farah Nader', 'CCU');
      const ref = net.createReferral(
        {
          patientId: patientData.id,
          patientData,
          referringFacilityId: 'facility-a',
          referringUserId: personas.consultantA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['Cardiology'],
          requiredBedType: 'CCU',
          priority: 'emergency',
          status: 'pending',
          reasonForReferral: 'Emergency CCU Bed required',
        },
        personas.consultantA
      );

      // System Admin overrides destination directly to contracted external hospital Facility D
      const overridden = net.overrideReferralDestination(ref.id, 'facility-d', personas.systemAdmin);
      expect(overridden.receivingFacilityId).toBe('facility-d');
      expect(overridden.statusHistory.at(-1)?.notes).toContain(
        'Destination manually overridden to Specialized Medical Center (Contracted)'
      );
    });
  });
});
