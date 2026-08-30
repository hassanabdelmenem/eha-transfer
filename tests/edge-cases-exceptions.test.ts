import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  SimulatedHealthcareNetwork,
  createTestPersonas,
  PersonaDirectory,
} from './simulation-harness';
import {
  Role,
  Referral,
  PatientData,
  BedType,
  ReferralPriority,
  Attachment,
  ReferralStatus,
} from '../src/types';
import {
  isSlaTracked,
  secondsUntilSlaBreach,
  hasBreachedSla,
  needsAutoEscalation,
  SLA_MINUTES,
  SLA_SECONDS,
  SLA_TRACKED_PRIORITIES,
  SLA_TRACKED_BED_TYPES,
  SLA_TRACKED_STATUS,
} from '../src/lib/sla';
import {
  findCandidateFacilities,
  capacityEscalationReason,
  availableBeds,
  facilityMatches,
  describeCapacityEscalation,
  CapacityEscalationReason,
} from '../src/lib/routing';
import { ECGViewerOverlay } from '../src/components/referrals/ECGViewerOverlay';
import { CANCEL_LOCKED_STATUSES, SENIOR_CANCEL_ROLES } from '../src/contexts/DataContext';

describe('Milestone 3 (R3) - Edge Case & Exception Pathway Verification', () => {
  let net: SimulatedHealthcareNetwork;
  let personas: PersonaDirectory;

  beforeEach(() => {
    net = new SimulatedHealthcareNetwork();
    personas = createTestPersonas();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const buildStandardPatientData = (name = 'Edge Case Patient'): PatientData => ({
    id: 'pat-edge-001',
    hospitalId: 'H-EDGE-01',
    name,
    age: 58,
    gender: 'male',
    vitalSigns: {
      hr: 110,
      bp: '160/95',
      spo2: 92,
      temp: 38.2,
      rr: 24,
      gcs: 14,
      timestamp: new Date().toISOString(),
    },
    complaint: 'Severe chest pain radiating to left arm',
    presentation: 'Diaphoretic, acute distress',
    pastHistory: 'Hypertension, Type 2 Diabetes',
    medications: 'Aspirin, Metformin',
    clinicalNotes: 'ST elevation in leads II, III, aVF',
    diagnosis: 'Acute Inferior STEMI',
    investigations: 'ECG completed, Troponin I elevated',
    attachments: [],
  });

  // ============================================================================
  // 1. FAST-TRACK 30-MINUTE SLA ENGINE
  // ============================================================================
  describe('1. Fast-Track 30-Minute SLA Engine', () => {
    it('verifies SLA tracking criteria: strictly ICU, CCU, PICU with emergency/urgent in pending status', () => {
      const trackedBedTypes: BedType[] = ['ICU', 'CCU', 'PICU'];
      const trackedPriorities: ReferralPriority[] = ['emergency', 'urgent'];

      // All 6 critical combinations must be SLA-tracked
      for (const bedType of trackedBedTypes) {
        for (const priority of trackedPriorities) {
          expect(isSlaTracked({ status: 'pending', priority, requiredBedType: bedType })).toBe(true);
        }
      }

      // Ward referrals are exempt across all priorities
      expect(isSlaTracked({ status: 'pending', priority: 'emergency', requiredBedType: 'Ward' })).toBe(false);
      expect(isSlaTracked({ status: 'pending', priority: 'urgent', requiredBedType: 'Ward' })).toBe(false);
      expect(isSlaTracked({ status: 'pending', priority: 'routine', requiredBedType: 'Ward' })).toBe(false);

      // Routine priority is exempt across all bed types
      expect(isSlaTracked({ status: 'pending', priority: 'routine', requiredBedType: 'ICU' })).toBe(false);
      expect(isSlaTracked({ status: 'pending', priority: 'routine', requiredBedType: 'CCU' })).toBe(false);
      expect(isSlaTracked({ status: 'pending', priority: 'routine', requiredBedType: 'PICU' })).toBe(false);

      // Non-pending active statuses are exempt from SLA countdown
      const nonPendingStatuses: ReferralStatus[] = [
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
      for (const st of nonPendingStatuses) {
        expect(isSlaTracked({ status: st, priority: 'emergency', requiredBedType: 'ICU' })).toBe(false);
      }
    });

    it('calculates secondsUntilSlaBreach and triggers breach when elapsedSeconds >= 1800 (30 minutes)', () => {
      const baseTime = Date.parse('2026-08-22T10:00:00.000Z');
      const createdAt = '2026-08-22T10:00:00.000Z';

      const ref = {
        createdAt,
        status: 'pending' as const,
        priority: 'emergency' as const,
        requiredBedType: 'ICU' as const,
      };

      // 0 seconds elapsed: 1800 seconds remaining
      expect(secondsUntilSlaBreach(ref, baseTime)).toBe(1800);
      expect(hasBreachedSla(ref, baseTime)).toBe(false);

      // 15 minutes (900s) elapsed: 900 seconds remaining
      const fifteenMin = baseTime + 900 * 1000;
      expect(secondsUntilSlaBreach(ref, fifteenMin)).toBe(900);
      expect(hasBreachedSla(ref, fifteenMin)).toBe(false);

      // 29 minutes 59 seconds (1799s) elapsed: 1 second remaining
      const justBeforeBreach = baseTime + 1799 * 1000;
      expect(secondsUntilSlaBreach(ref, justBeforeBreach)).toBe(1);
      expect(hasBreachedSla(ref, justBeforeBreach)).toBe(false);

      // Exactly 30 minutes (1800s) elapsed: 0 seconds remaining -> BREACH
      const exactBreach = baseTime + 1800 * 1000;
      expect(secondsUntilSlaBreach(ref, exactBreach)).toBe(0);
      expect(hasBreachedSla(ref, exactBreach)).toBe(true);

      // 32 minutes (1920s) elapsed: -120 seconds (2 mins over) -> BREACH
      const afterBreach = baseTime + 1920 * 1000;
      expect(secondsUntilSlaBreach(ref, afterBreach)).toBe(-120);
      expect(hasBreachedSla(ref, afterBreach)).toBe(true);
    });

    it('handles unparseable or corrupted createdAt timestamps safely without false-positive breaches', () => {
      const invalidRef = {
        createdAt: 'invalid-timestamp-xyz',
        status: 'pending' as const,
        priority: 'emergency' as const,
        requiredBedType: 'ICU' as const,
      };

      expect(secondsUntilSlaBreach(invalidRef, Date.now())).toBeNull();
      expect(hasBreachedSla(invalidRef, Date.now())).toBe(false);
      expect(needsAutoEscalation({ ...invalidRef, isEscalated: false, autoEscalationSuppressed: false }, Date.now())).toBe(false);
    });

    it('executes auto-escalation on SLA breach with system attribution, facility level, and audit logging', () => {
      const baseTime = Date.parse('2026-08-22T08:00:00.000Z');
      const createdAt = '2026-08-22T08:00:00.000Z';

      const ref = net.createReferral(
        {
          patientId: 'pat-sla-exec-01',
          patientData: buildStandardPatientData('SLA Breach Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b', 'facility-c'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'pending',
          reasonForReferral: 'Acute respiratory failure requiring ICU',
        },
        personas.residentA
      );
      // Set timestamp
      ref.createdAt = createdAt;
      ref.createdAtMs = baseTime;
      net.referrals.set(ref.id, ref);

      // Verify before 30 mins: no auto-escalation needed
      const twentyMinsAfter = baseTime + 20 * 60 * 1000;
      expect(needsAutoEscalation(ref, twentyMinsAfter)).toBe(false);
      const earlyAttempt = net.autoEscalateReferral(ref.id, twentyMinsAfter);
      expect(earlyAttempt).toBeNull();
      expect(ref.isEscalated).toBe(false);

      // After 30 minutes (31 mins): auto-escalation executes
      const thirtyOneMinsAfter = baseTime + 31 * 60 * 1000;
      expect(needsAutoEscalation(ref, thirtyOneMinsAfter)).toBe(true);

      const res = net.autoEscalateReferral(ref.id, thirtyOneMinsAfter);
      expect(res).not.toBeNull();
      expect(res?.referral.isEscalated).toBe(true);
      expect(res?.referral.escalatedBy).toBe('system');
      expect(res?.referral.escalationReason).toBe('sla_breach');
      expect(res?.referral.escalationLevel).toBe('facility');

      // Verify system audit trail
      const auditLog = res?.referral.statusHistory.find((h) => h.userId === 'system');
      expect(auditLog).toBeDefined();
      expect(auditLog?.notes).toMatch(/No response within 30 minutes\. Automatically escalated for administrative intervention\./i);

      // Verify urgent notifications dispatched to referring and candidate facilities
      expect(res?.notifications.length).toBeGreaterThan(0);
      const urgentNotif = res?.notifications.find((n) => n.type === 'urgent');
      expect(urgentNotif).toBeDefined();
      expect(urgentNotif?.title).toMatch(/Referral Escalated — No Response in 30 Minutes/i);
    });

    it('enforces autoEscalationSuppressed to prevent duplicate or recurring escalations after human de-escalation', () => {
      const baseTime = Date.parse('2026-08-22T08:00:00.000Z');
      const createdAt = '2026-08-22T08:00:00.000Z';

      const ref = net.createReferral(
        {
          patientId: 'pat-sla-suppress-01',
          patientData: buildStandardPatientData('SLA Suppressed Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['CCU'],
          requiredBedType: 'CCU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Unstable angina',
        },
        personas.residentA
      );
      ref.createdAt = createdAt;
      ref.createdAtMs = baseTime;
      net.referrals.set(ref.id, ref);

      // First breach at 30 mins
      const thirtyFiveMins = baseTime + 35 * 60 * 1000;
      net.autoEscalateReferral(ref.id, thirtyFiveMins);
      expect(ref.isEscalated).toBe(true);

      // Medical Director de-escalates referral
      net.toggleReferralEscalation(ref.id, false, personas.medicalDirectorA);
      expect(ref.isEscalated).toBe(false);
      expect(ref.autoEscalationSuppressed).toBe(true);

      // Next tick (e.g. 36 mins, 40 mins): auto-escalation stands down
      const fortyMins = baseTime + 40 * 60 * 1000;
      expect(hasBreachedSla(ref, fortyMins)).toBe(true);
      expect(needsAutoEscalation(ref, fortyMins)).toBe(false);

      const repeatAttempt = net.autoEscalateReferral(ref.id, fortyMins);
      expect(repeatAttempt).toBeNull();
      expect(ref.isEscalated).toBe(false);
    });

    it('guarantees idempotence: already-escalated referral does not re-escalate or duplicate audit entries', () => {
      const baseTime = Date.parse('2026-08-22T08:00:00.000Z');
      const ref = net.createReferral(
        {
          patientId: 'pat-sla-idemp-01',
          patientData: buildStandardPatientData('SLA Idempotence Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['PICU'],
          requiredBedType: 'PICU',
          priority: 'emergency',
          status: 'pending',
          reasonForReferral: 'Pediatric respiratory distress',
        },
        personas.residentA
      );
      ref.createdAt = '2026-08-22T08:00:00.000Z';
      ref.createdAtMs = baseTime;
      net.referrals.set(ref.id, ref);

      const breachTime = baseTime + 32 * 60 * 1000;
      const first = net.autoEscalateReferral(ref.id, breachTime);
      expect(first).not.toBeNull();
      const historyCountAfterFirst = ref.statusHistory.length;

      // Second concurrent/subsequent sweep execution
      const second = net.autoEscalateReferral(ref.id, breachTime + 30000);
      expect(second).toBeNull();
      expect(ref.statusHistory.length).toBe(historyCountAfterFirst);
    });
  });

  // ============================================================================
  // 2. EMERGENCY DOCTOR ESCORT GATE (requiresAccompanyingDoctor)
  // ============================================================================
  describe('2. Emergency Doctor Escort Gate (requiresAccompanyingDoctor)', () => {
    it('blocks ambulance transit dispatch (in_transit) when requiresAccompanyingDoctor is true and escort is missing', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-01',
          patientData: buildStandardPatientData('Escort Missing Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Critical ventilator transfer',
        },
        personas.residentA
      );

      // Record patient consent
      net.recordPatientConsent(ref.id, personas.residentA);
      expect(ref.status).toBe('patient_consented');
      expect(ref.accompanyingDoctor).toBeUndefined();

      // Attempt dispatch without assigning accompanying doctor
      expect(() => {
        net.updateReferralStatus(ref.id, 'in_transit', 'Ambulance departing', personas.erOfficialB);
      }).toThrow(/add the accompanying doctor’s name and phone number before dispatching the ambulance/i);

      expect(ref.status).toBe('patient_consented');
    });

    it('rejects incomplete escort doctor details (empty name or phone number)', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-02',
          patientData: buildStandardPatientData('Incomplete Escort Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Critical escort needed',
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      // Empty doctor name
      expect(() => {
        net.setAccompanyingDoctor(ref.id, '   ', '+201012345678', personas.erOfficialB);
      }).toThrow(/both the doctor’s name and phone number are required/i);

      // Empty phone number
      expect(() => {
        net.setAccompanyingDoctor(ref.id, 'Dr. Mahmoud ER', '', personas.erOfficialB);
      }).toThrow(/both the doctor’s name and phone number are required/i);

      expect(ref.accompanyingDoctor).toBeUndefined();
    });

    it('succeeds dispatch when valid doctor name and phone are assigned by ER official', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-03',
          patientData: buildStandardPatientData('Valid Escort Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Cardiogenic shock requiring active vasopressor infusion in transit',
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      // ER Official records escort doctor
      const updated = net.setAccompanyingDoctor(
        ref.id,
        'Dr. Sherif Abdelwahab',
        '+201099887766',
        personas.erOfficialB
      );

      expect(updated.accompanyingDoctor).toBeDefined();
      expect(updated.accompanyingDoctor?.name).toBe('Dr. Sherif Abdelwahab');
      expect(updated.accompanyingDoctor?.phoneNumber).toBe('+201099887766');
      expect(updated.accompanyingDoctor?.addedBy).toBe(personas.erOfficialB.id);

      // Audit trail record without advancing status prematurely
      expect(updated.status).toBe('patient_consented');
      const escortLog = updated.statusHistory.find((h) => h.notes?.includes('Accompanying doctor assigned'));
      expect(escortLog).toBeDefined();
      expect(escortLog?.notes).toContain('Dr. Sherif Abdelwahab (+201099887766)');

      // Dispatch to in_transit now succeeds
      const dispatchRes = net.updateReferralStatus(ref.id, 'in_transit', 'Ambulance dispatched with escort', personas.erOfficialB);
      expect(dispatchRes.referral.status).toBe('in_transit');
    });

    it('enforces that escort doctor can only be recorded after patient consent and before transit dispatch', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-04',
          patientData: buildStandardPatientData('Premature Escort Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'pending',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Premature assignment test',
        },
        personas.residentA
      );

      // Attempt assigning escort from pending status
      expect(() => {
        net.setAccompanyingDoctor(ref.id, 'Dr. Early', '+201000', personas.erOfficialB);
      }).toThrow(/can only be recorded after the patient has consented to transfer/i);

      // Advance to dept_approved
      net.addDeptComment(ref.id, 'direct_approval', 'Approved', personas.headOfDepartmentB);
      expect(() => {
        net.setAccompanyingDoctor(ref.id, 'Dr. Early', '+201000', personas.erOfficialB);
      }).toThrow(/can only be recorded after the patient has consented to transfer/i);

      // Advance to manager_approved and accepted
      net.updateReferralStatus(ref.id, 'manager_approved', 'Mgr OK', personas.hospitalManagerB);
      net.updateReferralStatus(ref.id, 'accepted', 'Accepted', personas.erOfficialB);
      expect(() => {
        net.setAccompanyingDoctor(ref.id, 'Dr. Early', '+201000', personas.erOfficialB);
      }).toThrow(/can only be recorded after the patient has consented to transfer/i);
    });

    it('strictly forbids non-ER roles from setting doctor escort details', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-05',
          patientData: buildStandardPatientData('Unauthorized Escort Setter'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'RBAC escort test',
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      const unauthorizedUsers = [
        personas.residentA,
        personas.specialistA,
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.hospitalManagerB,
        personas.medicalDirectorB,
        personas.strangerResidentC,
      ];

      for (const unauth of unauthorizedUsers) {
        expect(() => {
          net.setAccompanyingDoctor(ref.id, 'Dr. Fake', '+201000', unauth);
        }).toThrow(/only ER official\/room roles at party facilities can assign escort doctors/i);
      }
    });
  });

  // ============================================================================
  // 3. 0-BED CAPACITY EXHAUSTION & ADMIN DESTINATION OVERRIDE
  // ============================================================================
  describe('3. 0-Bed Capacity Exhaustion & Admin Destination Override', () => {
    it('detects network specialty deficit (no_matching_facility) and auto-escalates to System Admin', () => {
      // Query for an unsupported department / bed combination (e.g. Oncology PICU at facility A origin)
      const facilitiesList = Array.from(net.facilities.values());
      const query = {
        departments: ['Oncology', 'Neurology'],
        bedType: 'PICU' as BedType,
        excludeFacilityId: 'facility-a',
      };

      const { matching, withBeds } = findCandidateFacilities(facilitiesList, query);
      expect(matching).toHaveLength(0);
      expect(withBeds).toHaveLength(0);

      // Create referral with empty candidate list
      const ref = net.createReferral(
        {
          patientId: 'pat-nomatch-01',
          patientData: buildStandardPatientData('Specialty Deficit Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: [],
          receivingDepartments: ['Oncology', 'Neurology'],
          requiredBedType: 'PICU',
          priority: 'emergency',
          status: 'pending',
          reasonForReferral: 'Pediatric neuro-oncology crisis',
        },
        personas.residentA
      );

      // Evaluate capacity reason
      const reason = capacityEscalationReason(ref, net.facilities, { facilitiesLoaded: true });
      expect(reason).toBe('no_matching_facility');
      expect(describeCapacityEscalation('no_matching_facility')).toBe(
        'No facility in the network provides the required departments and bed type.'
      );

      // Execute capacity escalation
      const res = net.escalateForCapacity(ref.id, 'no_matching_facility');
      expect(res).not.toBeNull();
      expect(res?.referral.isEscalated).toBe(true);
      expect(res?.referral.escalationReason).toBe('no_matching_facility');
      expect(res?.referral.escalationLevel).toBe('system');
      expect(res?.referral.escalatedBy).toBe('system');

      // System notification
      expect(res?.notifications[0].title).toBe('ESCALATION: No Matching Facility');
      expect(res?.notifications[0].type).toBe('urgent');
    });

    it('detects 100% capacity exhaustion (no_beds_available) across all matching facilities and auto-escalates to System Admin', () => {
      // Set all facilities to 100% occupied for CCU
      const facB = net.facilities.get('facility-b')!;
      facB.capacity.CCU = { total: 6, occupied: 6 };
      net.facilities.set('facility-b', facB);

      const facC = net.facilities.get('facility-c')!;
      facC.capacity.CCU = { total: 15, occupied: 15 };
      net.facilities.set('facility-c', facC);

      const facD = net.facilities.get('facility-d')!;
      facD.capacity.CCU = { total: 5, occupied: 5 };
      net.facilities.set('facility-d', facD);

      const facilitiesList = Array.from(net.facilities.values());
      const query = {
        departments: ['Cardiology'],
        bedType: 'CCU' as BedType,
        excludeFacilityId: 'facility-a',
      };

      const { matching, withBeds } = findCandidateFacilities(facilitiesList, query);
      expect(matching.length).toBeGreaterThan(0);
      expect(withBeds).toHaveLength(0); // All full

      const candidateIds = matching.map((f) => f.id);
      const ref = net.createReferral(
        {
          patientId: 'pat-nobeds-01',
          patientData: buildStandardPatientData('Full Network Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: candidateIds,
          receivingDepartments: ['Cardiology'],
          requiredBedType: 'CCU',
          priority: 'emergency',
          status: 'pending',
          reasonForReferral: 'Massive STEMI with cardiogenic shock',
        },
        personas.residentA
      );

      const reason = capacityEscalationReason(ref, net.facilities, { facilitiesLoaded: true });
      expect(reason).toBe('no_beds_available');
      expect(describeCapacityEscalation('no_beds_available')).toBe(
        'Every matching facility is at full capacity for the required bed type.'
      );

      const res = net.escalateForCapacity(ref.id, 'no_beds_available');
      expect(res?.referral.isEscalated).toBe(true);
      expect(res?.referral.escalationReason).toBe('no_beds_available');
      expect(res?.referral.escalationLevel).toBe('system');

      expect(res?.notifications[0].title).toBe('ESCALATION: No Beds Available');
    });

    it('allows System Admin to execute overrideReferralDestination to place patient and clears escalation flags', () => {
      // Referral escalated for no_beds_available
      const ref = net.createReferral(
        {
          patientId: 'pat-override-01',
          patientData: buildStandardPatientData('Admin Override Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b', 'facility-c'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'pending',
          reasonForReferral: 'Emergency placement needed',
        },
        personas.residentA
      );
      net.escalateForCapacity(ref.id, 'no_beds_available');
      expect(ref.isEscalated).toBe(true);

      // System Admin overrides destination to contracted external center Facility D
      const overridden = net.overrideReferralDestination(ref.id, 'facility-d', personas.systemAdmin, true);

      expect(overridden.receivingFacilityId).toBe('facility-d');
      expect(overridden.isEscalated).toBe(false);
      expect(overridden.escalatedAt).toBeNull();
      expect(overridden.escalationReason).toBeNull();
      expect(overridden.escalationLevel).toBeNull();
      expect(overridden.autoEscalationSuppressed).toBe(true);

      // Audit history logged
      const overrideLog = overridden.statusHistory.find((h) => h.notes?.includes('Destination manually overridden'));
      expect(overrideLog).toBeDefined();
      expect(overrideLog?.notes).toContain('Specialized Medical Center (Contracted)');
    });

    it('strictly blocks non-administrators (Residents, Nurses, Facility Managers) from executing destination overrides', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-override-unauth',
          patientData: buildStandardPatientData('Unauthorized Override Attempt'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Override test',
        },
        personas.residentA
      );

      const nonAdminUsers = [
        personas.residentA,
        personas.specialistA,
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.hospitalManagerB,
        personas.medicalDirectorB,
        personas.erOfficialB,
      ];

      for (const user of nonAdminUsers) {
        expect(() => {
          net.overrideReferralDestination(ref.id, 'facility-c', user);
        }).toThrow(/only system administrators \/ owners can override referral destinations/i);
      }
    });
  });

  // ============================================================================
  // 4. PATIENT DECLINE & CANDIDATE RE-ROUTING
  // ============================================================================
  describe('4. Patient Decline & Candidate Re-Routing', () => {
    it('resets status to pending, resets destination to auto, removes declined facility, and re-notifies remaining candidates', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-decline-01',
          patientData: buildStandardPatientData('Declining Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b', 'facility-c', 'facility-d'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'accepted',
          reasonForReferral: 'ICU Transfer',
        },
        personas.residentA
      );

      // Record patient decline at referring facility
      const res = net.recordPatientDecline(
        ref.id,
        'Patient family prefers University Hospital due to proximity',
        personas.residentA
      );

      // 1. Status resets to pending
      expect(res.referral.status).toBe('pending');

      // 2. ReceivingFacilityId resets to auto
      expect(res.referral.receivingFacilityId).toBe('auto');

      // 3. Declined facility removed from candidate list
      expect(res.referral.candidateFacilityIds).toEqual(['facility-c', 'facility-d']);
      expect(res.referral.candidateFacilityIds).not.toContain('facility-b');

      // 4. Declined facility recorded in patientDeclinedFacilityIds
      expect(res.referral.patientDeclinedFacilityIds).toEqual(['facility-b']);

      // 5. Audit trail records decline reason
      const declineLog = res.referral.statusHistory.find((h) => h.notes?.includes('Patient declined transfer'));
      expect(declineLog).toBeDefined();
      expect(declineLog?.notes).toContain('Patient family prefers University Hospital due to proximity');

      // 6. Broadcast notifications dispatched to remaining candidates
      const remainingCandidateNotifs = res.notifications.filter((n) =>
        n.userId === personas.strangerManagerC.id
      );
      expect(remainingCandidateNotifs.length).toBeGreaterThan(0);
      expect(remainingCandidateNotifs[0].title).toBe('Referral Re-routed After Patient Decline');
    });

    it('handles sequential declines across multiple hospitals until candidates are exhausted', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-seq-decline-01',
          patientData: buildStandardPatientData('Serial Declining Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b', 'facility-c'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'accepted',
          reasonForReferral: 'Serial decline test',
        },
        personas.residentA
      );

      // 1st Decline: declines Facility B
      net.recordPatientDecline(ref.id, 'Decline Hospital B', personas.residentA);
      expect(ref.candidateFacilityIds).toEqual(['facility-c']);
      expect(ref.patientDeclinedFacilityIds).toEqual(['facility-b']);

      // Facility C accepts referral
      net.updateReferralStatus(ref.id, 'dept_approved', 'HoD C OK', personas.medicalDirectorB);
      net.updateReferralStatus(ref.id, 'manager_approved', 'Mgr C OK', personas.hospitalManagerB);
      net.updateReferralStatus(ref.id, 'accepted', 'Accepted C', personas.erOfficialB);
      ref.receivingFacilityId = 'facility-c';

      // 2nd Decline: declines Facility C as well
      net.recordPatientDecline(ref.id, 'Decline Hospital C', personas.residentA);
      expect(ref.candidateFacilityIds).toEqual([]);
      expect(ref.patientDeclinedFacilityIds).toEqual(['facility-b', 'facility-c']);
      expect(ref.receivingFacilityId).toBe('auto');

      // Candidate list is now exhausted -> capacityEscalationReason identifies no_matching_facility
      const reason = capacityEscalationReason(ref, net.facilities, { facilitiesLoaded: true });
      expect(reason).toBe('no_matching_facility');
    });

    it('strictly forbids recording patient decline from states other than accepted', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-decline-timing',
          patientData: buildStandardPatientData('Decline Timing Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Decline timing test',
        },
        personas.residentA
      );

      // Attempt from pending
      expect(() => {
        net.recordPatientDecline(ref.id, 'Premature decline', personas.residentA);
      }).toThrow(/patient decline can only be recorded while the referral is in the accepted state/i);

      // Attempt from in_transit
      ref.status = 'in_transit';
      expect(() => {
        net.recordPatientDecline(ref.id, 'In-transit decline', personas.residentA);
      }).toThrow(/patient decline can only be recorded while the referral is in the accepted state/i);
    });

    it('strictly forbids receiving facility staff or non-referring staff from recording patient decline', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-decline-rbac',
          patientData: buildStandardPatientData('Decline RBAC Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'accepted',
          reasonForReferral: 'Decline RBAC test',
        },
        personas.residentA
      );

      const unauthorizedUsers = [
        personas.hospitalManagerB,
        personas.medicalDirectorB,
        personas.erOfficialB,
        personas.nurseB,
        personas.strangerResidentC,
      ];

      for (const unauth of unauthorizedUsers) {
        expect(() => {
          net.recordPatientDecline(ref.id, 'Unauthorized decline', unauth);
        }).toThrow(/only referring facility staff can record patient decline/i);
      }
    });
  });

  // ============================================================================
  // 5. ECG VIEWER & MEDIA ATTACHMENTS
  // ============================================================================
  describe('5. ECG Viewer & Media Attachments', () => {
    describe('File Size & MIME Whitelist Validation Rules', () => {
      const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
      const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/pdf',
      ];
      const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|pdf)$/i;

      const validateAttachment = (file: { name: string; size: number; type: string }) => {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          return { valid: false, error: `File "${file.name}" exceeds the 15MB size limit (${sizeMB}MB).` };
        }
        const isAllowedMime = file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
        const isAllowedExt = ALLOWED_EXTENSIONS.test(file.name);
        if (!isAllowedMime && !isAllowedExt) {
          return { valid: false, error: `Unsupported file type for "${file.name}".` };
        }
        return { valid: true, error: null };
      };

      it('validates 15MB upper file size boundary: accepts <= 15MB and rejects > 15MB', () => {
        // Valid sizes
        expect(validateAttachment({ name: 'ecg_trace.png', size: 1024, type: 'image/png' }).valid).toBe(true);
        expect(validateAttachment({ name: 'scan.pdf', size: 10 * 1024 * 1024, type: 'application/pdf' }).valid).toBe(true);
        expect(validateAttachment({ name: 'exact_15mb.jpg', size: 15 * 1024 * 1024, type: 'image/jpeg' }).valid).toBe(true);
        expect(validateAttachment({ name: 'zero_byte.png', size: 0, type: 'image/png' }).valid).toBe(true);

        // Oversized files
        const oversized1 = validateAttachment({ name: 'huge_scan.pdf', size: 15 * 1024 * 1024 + 1, type: 'application/pdf' });
        expect(oversized1.valid).toBe(false);
        expect(oversized1.error).toContain('exceeds the 15MB size limit');

        const oversized2 = validateAttachment({ name: 'video_clip.mp4', size: 50 * 1024 * 1024, type: 'video/mp4' });
        expect(oversized2.valid).toBe(false);
        expect(oversized2.error).toContain('exceeds the 15MB size limit');
      });

      it('validates MIME whitelist and extension rules: accepts clinical images/PDFs and rejects executables/scripts/archives', () => {
        // Allowed formats
        expect(validateAttachment({ name: 'trace.jpg', size: 5000, type: 'image/jpeg' }).valid).toBe(true);
        expect(validateAttachment({ name: 'trace.jpeg', size: 5000, type: 'image/jpeg' }).valid).toBe(true);
        expect(validateAttachment({ name: 'rhythm.png', size: 5000, type: 'image/png' }).valid).toBe(true);
        expect(validateAttachment({ name: 'diagram.webp', size: 5000, type: 'image/webp' }).valid).toBe(true);
        expect(validateAttachment({ name: 'strip.gif', size: 5000, type: 'image/gif' }).valid).toBe(true);
        expect(validateAttachment({ name: 'vector.svg', size: 5000, type: 'image/svg+xml' }).valid).toBe(true);
        expect(validateAttachment({ name: 'report.pdf', size: 5000, type: 'application/pdf' }).valid).toBe(true);

        // Disallowed / Malicious formats
        const exe = validateAttachment({ name: 'virus.exe', size: 5000, type: 'application/x-msdownload' });
        expect(exe.valid).toBe(false);
        expect(exe.error).toContain('Unsupported file type');

        const script = validateAttachment({ name: 'exploit.js', size: 5000, type: 'application/javascript' });
        expect(script.valid).toBe(false);

        const html = validateAttachment({ name: 'phishing.html', size: 5000, type: 'text/html' });
        expect(html.valid).toBe(false);

        const zip = validateAttachment({ name: 'bundle.zip', size: 5000, type: 'application/zip' });
        expect(zip.valid).toBe(false);
      });
    });

    describe('ECGViewerOverlay Component Interactive Behavior & Accessibility', () => {
      it('renders nothing when isOpen is false', () => {
        const { container } = render(
          React.createElement(ECGViewerOverlay, {
            isOpen: false,
            imageUrl: 'https://storage.eha.gov.eg/ecg.png',
            onClose: vi.fn(),
          })
        );
        expect(container).toBeEmptyDOMElement();
      });

      it('renders accessible dialog with image when isOpen is true', () => {
        render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/ecg_trace_01.png',
            onClose: vi.fn(),
          })
        );

        const dialog = screen.getByRole('dialog', { name: /ecg diagnostic viewer/i });
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByText(/ECG Quick-Viewer/i)).toBeInTheDocument();
        expect(screen.getByAltText(/ECG Diagnostic View/i)).toBeInTheDocument();
      });

      it('clamps zoom controls strictly within 0.5x (50%) and 5.0x (500%) range', () => {
        render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/ecg_trace_01.png',
            onClose: vi.fn(),
          })
        );

        const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
        const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });
        const resetBtn = screen.getByRole('button', { name: /reset view/i });

        // Initial scale: 100%
        expect(screen.getByText('100%')).toBeInTheDocument();

        // Zoom Out to minimum (0.5x / 50%)
        fireEvent.click(zoomOutBtn);
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(zoomOutBtn).toBeDisabled();

        // Attempt extra zoom out -> remains 50%
        fireEvent.click(zoomOutBtn);
        expect(screen.getByText('50%')).toBeInTheDocument();

        // Reset view
        fireEvent.click(resetBtn);
        expect(screen.getByText('100%')).toBeInTheDocument();

        // Zoom In to maximum (5.0x / 500%) in steps of 0.5x (8 clicks: 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0)
        for (let i = 0; i < 8; i++) {
          fireEvent.click(zoomInBtn);
        }
        expect(screen.getByText('500%')).toBeInTheDocument();
        expect(zoomInBtn).toBeDisabled();

        // Attempt extra zoom in -> remains 500%
        fireEvent.click(zoomInBtn);
        expect(screen.getByText('500%')).toBeInTheDocument();
      });

      it('toggles high-contrast diagnostic mode filter and aria-pressed attribute', () => {
        render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/ecg_trace_01.png',
            onClose: vi.fn(),
          })
        );

        const img = screen.getByAltText(/ECG Diagnostic View/i);
        const contrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });

        expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');
        expect(img.style.filter).toBe('none');

        // Turn on high contrast
        fireEvent.click(contrastBtn);
        expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');
        expect(img.style.filter).toBe('contrast(1.6) brightness(0.9) grayscale(0.5)');

        // Turn off high contrast
        fireEvent.click(contrastBtn);
        expect(contrastBtn).toHaveAttribute('aria-pressed', 'false');
        expect(img.style.filter).toBe('none');
      });

      it('renders accessible error alert fallback when imageUrl is null, undefined, or empty', () => {
        const handleClose = vi.fn();
        render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: null,
            onClose: handleClose,
          })
        );

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute('aria-live', 'assertive');
        expect(screen.getByText(/ECG Image Unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/No valid image URL was provided for this clinical attachment/i)).toBeInTheDocument();

        // Zoom/contrast controls should be disabled in error state
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /toggle high contrast/i })).toBeDisabled();
      });

      it('renders error alert when image fails to load and supports recovery via Retry button', () => {
        render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/corrupt_lead.png',
            onClose: vi.fn(),
          })
        );

        const img = screen.getByAltText(/ECG Diagnostic View/i);
        expect(img).toBeInTheDocument();

        // Trigger load error
        fireEvent.error(img);

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(screen.getByText(/The ECG \/ diagnostic image could not be loaded/i)).toBeInTheDocument();

        // Retry button recovers image mount
        const retryBtn = screen.getByRole('button', { name: /retry/i });
        expect(retryBtn).toBeInTheDocument();
        fireEvent.click(retryBtn);

        expect(screen.getByAltText(/ECG Diagnostic View/i)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      it('dismisses ECG viewer on Escape key and close button click', () => {
        const handleClose = vi.fn();
        render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/ecg_trace_01.png',
            onClose: handleClose,
          })
        );

        // Dismiss via close button
        const closeBtn = screen.getByRole('button', { name: /close ecg viewer/i });
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);

        // Dismiss via Escape key
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(handleClose).toHaveBeenCalledTimes(2);

        // Non-Escape keys do not trigger close
        fireEvent.keyDown(window, { key: 'Enter' });
        fireEvent.keyDown(window, { key: 'Space' });
        expect(handleClose).toHaveBeenCalledTimes(2);
      });

      it('resets zoom scale and high-contrast toggle when reopened with a new image URL', () => {
        const { rerender } = render(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/ecg_01.png',
            onClose: vi.fn(),
          })
        );

        const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
        const contrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });

        // Zoom to 200% and enable contrast
        fireEvent.click(zoomInBtn);
        fireEvent.click(zoomInBtn);
        expect(screen.getByText('200%')).toBeInTheDocument();
        fireEvent.click(contrastBtn);
        expect(contrastBtn).toHaveAttribute('aria-pressed', 'true');

        // Close and reopen with different URL
        rerender(
          React.createElement(ECGViewerOverlay, {
            isOpen: false,
            imageUrl: 'https://storage.eha.gov.eg/ecg_01.png',
            onClose: vi.fn(),
          })
        );
        rerender(
          React.createElement(ECGViewerOverlay, {
            isOpen: true,
            imageUrl: 'https://storage.eha.gov.eg/ecg_02.png',
            onClose: vi.fn(),
          })
        );

        // Scale should be reset to 100% and contrast to false
        expect(screen.getByText('100%')).toBeInTheDocument();
        const reopenedContrastBtn = screen.getByRole('button', { name: /toggle high contrast/i });
        expect(reopenedContrastBtn).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  // ============================================================================
  // 6. MULTI-VECTOR COMPLEX INTEGRATION & RESILIENCY
  // ============================================================================
  describe('6. Multi-Vector Complex Integration & Exception Resiliency', () => {
    it('correctly parses ISO timestamps with non-UTC timezone offsets (+02:00) for SLA countdown', () => {
      // 10:00 Cairo time (+02:00) is 08:00 UTC
      const createdAtCairo = '2026-08-22T10:00:00.000+02:00';
      const ref = {
        createdAt: createdAtCairo,
        status: 'pending' as const,
        priority: 'emergency' as const,
        requiredBedType: 'ICU' as const,
      };

      const nowUTC = Date.parse('2026-08-22T08:25:00.000Z'); // 25 minutes after
      expect(secondsUntilSlaBreach(ref, nowUTC)).toBe(300); // 5 mins remaining
      expect(hasBreachedSla(ref, nowUTC)).toBe(false);

      const breachUTC = Date.parse('2026-08-22T08:31:00.000Z'); // 31 minutes after
      expect(secondsUntilSlaBreach(ref, breachUTC)).toBe(-60);
      expect(hasBreachedSla(ref, breachUTC)).toBe(true);
    });

    it('allows updating escort doctor info before dispatch while trimming whitespace and logging changes', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-escort-update',
          patientData: buildStandardPatientData('Escort Update Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'emergency',
          status: 'accepted',
          requiresAccompanyingDoctor: true,
          reasonForReferral: 'Escort update test',
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      // Initial assignment: Dr. First
      net.setAccompanyingDoctor(ref.id, '  Dr. First Escort  ', '  01011223344  ', personas.erOfficialB);
      expect(ref.accompanyingDoctor?.name).toBe('Dr. First Escort');
      expect(ref.accompanyingDoctor?.phoneNumber).toBe('01011223344');

      // Re-assignment before dispatch: Dr. Second replaces Dr. First
      net.setAccompanyingDoctor(ref.id, 'Dr. Second Escort', '+201099887766', personas.erOfficialB);
      expect(ref.accompanyingDoctor?.name).toBe('Dr. Second Escort');
      expect(ref.accompanyingDoctor?.phoneNumber).toBe('+201099887766');

      // Both events logged in statusHistory
      const escortLogs = ref.statusHistory.filter((h) => h.notes?.includes('Accompanying doctor assigned'));
      expect(escortLogs).toHaveLength(2);
      expect(escortLogs[1].notes).toContain('Dr. Second Escort (+201099887766)');
    });

    it('rejects destination override targeting the originating facility or a nonexistent facility ID', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-override-invalid',
          patientData: buildStandardPatientData('Invalid Override Target'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'auto',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'pending',
          reasonForReferral: 'Invalid target test',
        },
        personas.residentA
      );

      // Nonexistent facility
      expect(() => {
        net.overrideReferralDestination(ref.id, 'nonexistent-hospital-99', personas.systemAdmin);
      }).toThrow(/target override facility not found/i);
    });

    it('handles patient decline with empty/whitespace reason by defaulting to "Not specified"', () => {
      const ref = net.createReferral(
        {
          patientId: 'pat-decline-empty-reason',
          patientData: buildStandardPatientData('Empty Reason Decline Patient'),
          referringFacilityId: 'facility-a',
          referringUserId: personas.residentA.id,
          receivingFacilityId: 'facility-b',
          candidateFacilityIds: ['facility-b'],
          receivingDepartments: ['ICU'],
          requiredBedType: 'ICU',
          priority: 'urgent',
          status: 'accepted',
          reasonForReferral: 'Empty reason test',
        },
        personas.residentA
      );

      const res = net.recordPatientDecline(ref.id, '   ', personas.residentA);
      expect(res.referral.status).toBe('pending');
      const declineLog = res.referral.statusHistory.find((h) => h.notes?.includes('Patient declined transfer'));
      expect(declineLog?.notes).toContain('Reason: Not specified.');
    });
  });
});
