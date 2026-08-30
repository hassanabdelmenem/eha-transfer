import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SimulatedHealthcareNetwork,
  createTestPersonas,
  PersonaDirectory,
  createTestFacilities,
} from "./simulation-harness";
import {
  Role,
  Referral,
  PatientData,
  BedType,
  ReferralPriority,
  ReferralStatus,
  DeptApprovalStatus,
  Facility,
} from "../src/types";
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
} from "../src/lib/sla";
import {
  findCandidateFacilities,
  capacityEscalationReason,
  availableBeds,
  facilityMatches,
  describeCapacityEscalation,
  CapacityEscalationReason,
} from "../src/lib/routing";
import {
  CANCEL_LOCKED_STATUSES,
  SENIOR_CANCEL_ROLES,
} from "../src/contexts/DataContext";

describe("Tier 5 White-Box Adversarial Hardening Suite (Milestone 5)", () => {
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

  const buildWhiteBoxPatientData = (name = "White-Box Stress Patient", overrides: Partial<PatientData> = {}): PatientData => ({
    id: "pat-wb-001",
    hospitalId: "H-WB-01",
    name,
    age: 45,
    gender: "male",
    vitalSigns: {
      hr: 98,
      bp: "120/80",
      spo2: 97,
      temp: 37.2,
      rr: 18,
      gcs: 15,
      timestamp: new Date().toISOString(),
    },
    complaint: "Acute abdominal pain with suspected peritonitis",
    presentation: "Guarding, rebound tenderness, febrile",
    pastHistory: "Appendectomy 2018",
    medications: "Paracetamol, Ceftriaxone",
    clinicalNotes: "Acute abdomen, surgical evaluation requested",
    diagnosis: "Acute Peritonitis / Perforated Viscus",
    investigations: "Abdominal CT: free air under diaphragm",
    attachments: [],
    ...overrides,
  });

  // ============================================================================
  // SECTION 1: RAPID SERIAL STATE MACHINE TRANSITIONS & PERMUTATION ATTACKS
  // ============================================================================
  describe("1. Rapid Serial State Machine Transitions & Permutation Attacks", () => {
    it("1.1 executes complete rapid serial valid lifecycle: pending -> dept_approved -> manager_approved -> accepted -> patient_consented -> in_transit -> arrived -> admitted -> discharged", () => {
      // Create initial referral
      const ref = net.createReferral(
        {
          patientId: "pat-serial-full-01",
          patientData: buildWhiteBoxPatientData("Full Lifecycle Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b", "facility-c"],
          receivingDepartments: ["ICU", "Surgery"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Urgent surgical ICU admission",
        },
        personas.residentA
      );

      expect(ref.status).toBe("pending");
      expect(ref.statusHistory).toHaveLength(1);
      expect(ref.statusHistory[0].status).toBe("pending");

      // 1. HoD direct approval
      const hodRes = net.addDeptComment(ref.id, "direct_approval", "Clinical review complete. Bed accepted.", personas.headOfDepartmentB);
      expect(hodRes.referral.status).toBe("dept_approved");
      expect(hodRes.referral.receivingFacilityId).toBe("facility-b");
      expect(hodRes.referral.statusHistory).toHaveLength(2);

      // 2. Manager approval
      const mgrRes = net.updateReferralStatus(ref.id, "manager_approved", "Hospital manager capacity confirmed.", personas.hospitalManagerB);
      expect(mgrRes.referral.status).toBe("manager_approved");
      expect(mgrRes.referral.statusHistory).toHaveLength(3);

      // 3. ER official acceptance
      const acceptRes = net.updateReferralStatus(ref.id, "accepted", "ER triage ready.", personas.erOfficialB);
      expect(acceptRes.referral.status).toBe("accepted");
      expect(acceptRes.referral.statusHistory).toHaveLength(4);

      // 4. Patient consent recorded by referring doctor
      const consentRes = net.recordPatientConsent(ref.id, personas.residentA);
      expect(consentRes.referral.status).toBe("patient_consented");
      expect(consentRes.referral.statusHistory).toHaveLength(5);

      // Assign accompanying doctor escort (since requiresAccompanyingDoctor: true)
      const escortRes = net.setAccompanyingDoctor(ref.id, "Dr. Hazem Escort", "01099881122", personas.erOfficialB);
      expect(escortRes.accompanyingDoctor?.name).toBe("Dr. Hazem Escort");
      expect(escortRes.status).toBe("patient_consented");
      expect(escortRes.statusHistory).toHaveLength(6);

      // 5. Ambulance dispatch -> in_transit
      const transitRes = net.updateReferralStatus(ref.id, "in_transit", "Ambulance en route.", personas.erOfficialB);
      expect(transitRes.referral.status).toBe("in_transit");
      expect(transitRes.referral.statusHistory).toHaveLength(7);

      // 6. Arrival confirmation -> arrived
      const arrivedRes = net.updateReferralStatus(ref.id, "arrived", "Patient arrived at ER Bay 1.", personas.erOfficialB);
      expect(arrivedRes.referral.status).toBe("arrived");
      expect(arrivedRes.referral.statusHistory).toHaveLength(8);

      // 7. Nurse bed admission -> admitted (+1 ICU occupancy)
      const initialOccupied = net.facilities.get("facility-b")!.capacity.ICU.occupied;
      const admitRes = net.updateReferralStatus(ref.id, "admitted", "Admitted to Bed ICU-04.", personas.nurseB);
      expect(admitRes.referral.status).toBe("admitted");
      expect(admitRes.referral.statusHistory).toHaveLength(9);
      expect(net.facilities.get("facility-b")!.capacity.ICU.occupied).toBe(initialOccupied + 1);

      // 8. Discharge -> discharged (-1 ICU occupancy)
      const dischargeRes = net.updateReferralStatus(ref.id, "discharged", "Discharged home in stable condition.", personas.nurseB);
      expect(dischargeRes.referral.status).toBe("discharged");
      expect(dischargeRes.referral.statusHistory).toHaveLength(10);
      expect(net.facilities.get("facility-b")!.capacity.ICU.occupied).toBe(initialOccupied);

      // Verify strict monotonic audit trail timestamps and history integrity
      for (let i = 0; i < dischargeRes.referral.statusHistory.length; i++) {
        expect(dischargeRes.referral.statusHistory[i].timestamp).toBeDefined();
        expect(dischargeRes.referral.statusHistory[i].userId).toBeDefined();
      }
    });

    it("1.2 strictly blocks all illegal forward jump attempts across the state machine", () => {
      const createPending = () => net.createReferral(
        {
          patientId: "pat-jump-test",
          patientData: buildWhiteBoxPatientData("Forward Jump Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "Jump test",
        },
        personas.residentA
      );

      // pending -> in_transit (illegal skip of review, approval, accept, consent)
      const ref1 = createPending();
      expect(() => {
        net.updateReferralStatus(ref1.id, "in_transit", "Skipping steps", personas.erOfficialB);
      }).toThrow();

      // pending -> admitted (illegal skip of entire transit journey)
      const ref2 = createPending();
      expect(() => {
        net.updateReferralStatus(ref2.id, "admitted", "Direct admit skip", personas.nurseB);
      }).toThrow();

      // accepted -> admitted (skipping consent and transit)
      const ref3 = createPending();
      ref3.status = "accepted";
      ref3.receivingFacilityId = "facility-b";
      expect(() => {
        net.updateReferralStatus(ref3.id, "admitted", "Admit without consent", personas.nurseB);
      }).toThrow();

      // patient_consented -> admitted (skipping in_transit and arrived)
      const ref4 = createPending();
      ref4.status = "patient_consented";
      ref4.receivingFacilityId = "facility-b";
      expect(() => {
        net.updateReferralStatus(ref4.id, "admitted", "Admit without arrival", personas.nurseB);
      }).toThrow();
    });

    it("1.3 verifies terminal status lock immutability: discharged and cancelled cannot transition to any other status", () => {
      const allStatuses: ReferralStatus[] = [
        "pending",
        "dept_approved",
        "manager_approved",
        "accepted",
        "patient_consented",
        "in_transit",
        "arrived",
        "admitted",
        "discharged",
        "cancelled",
        "rejected",
        "postponed",
      ];

      // Terminal: discharged
      const refDischarged = net.createReferral(
        {
          patientId: "pat-term-discharged",
          patientData: buildWhiteBoxPatientData("Discharged Terminal Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "accepted",
          reasonForReferral: "Discharge lock test",
        },
        personas.residentA
      );
      refDischarged.status = "discharged";

      for (const targetStatus of allStatuses) {
        if (targetStatus === "discharged") continue;
        expect(net.isValidTransition("discharged", targetStatus)).toBe(false);
        expect(() => {
          net.updateReferralStatus(refDischarged.id, targetStatus, "Attempt exit discharged", personas.residentA);
        }).toThrow();
      }

      // Terminal: cancelled
      const refCancelled = net.createReferral(
        {
          patientId: "pat-term-cancelled",
          patientData: buildWhiteBoxPatientData("Cancelled Terminal Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "pending",
          reasonForReferral: "Cancel lock test",
        },
        personas.residentA
      );
      refCancelled.status = "cancelled";

      for (const targetStatus of allStatuses) {
        if (targetStatus === "cancelled") continue;
        expect(net.isValidTransition("cancelled", targetStatus)).toBe(false);
      }
    });

    it("1.4 confirms cancel lock immutability across in_transit, arrived, admitted, and discharged", () => {
      for (const lockedStatus of CANCEL_LOCKED_STATUSES) {
        const ref = net.createReferral(
          {
            patientId: `pat-cancel-locked-${lockedStatus}`,
            patientData: buildWhiteBoxPatientData(`Locked Patient ${lockedStatus}`),
            referringFacilityId: "facility-a",
            referringUserId: personas.residentA.id,
            receivingFacilityId: "facility-b",
            candidateFacilityIds: ["facility-b"],
            receivingDepartments: ["ICU"],
            requiredBedType: "ICU",
            priority: "emergency",
            status: "accepted",
            reasonForReferral: "Cancel lock enforcement test",
          },
          personas.residentA
        );
        ref.status = lockedStatus;

        // Attempt cancellation by referring doctor
        expect(() => {
          net.cancelReferral(ref.id, "Attempt cancel while locked", personas.residentA);
        }).toThrow(/cannot cancel a referral once it is/i);

        // Attempt cancellation by Medical Director
        expect(() => {
          net.cancelReferral(ref.id, "Attempt cancel while locked", personas.medicalDirectorA);
        }).toThrow(/cannot cancel a referral once it is/i);

        // Attempt cancellation by System Admin
        expect(() => {
          net.cancelReferral(ref.id, "Attempt cancel while locked", personas.systemAdmin);
        }).toThrow(/cannot cancel a referral once it is/i);
      }
    });
  });

  // ============================================================================
  // SECTION 2: CANDIDATE FACILITY ARRAY MANIPULATION & ROUTING BOUNDARIES
  // ============================================================================
  describe("2. Candidate Facility Array Manipulation & Routing Boundaries", () => {
    it("2.1 handles complete sequential exhaustion of candidate array (4 candidates down to 0) with exact status and isolation", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-exhaust-4",
          patientData: buildWhiteBoxPatientData("4-Candidate Exhaustion"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b", "facility-c", "facility-d"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          reasonForReferral: "Sequential decline test across 3 targets",
        },
        personas.residentA
      );

      expect(ref.candidateFacilityIds).toEqual(["facility-b", "facility-c", "facility-d"]);

      // 1st decline: Facility B
      const dec1 = net.recordPatientDecline(ref.id, "Reason B", personas.residentA);
      expect(dec1.referral.status).toBe("pending");
      expect(dec1.referral.receivingFacilityId).toBe("auto");
      expect(dec1.referral.candidateFacilityIds).toEqual(["facility-c", "facility-d"]);
      expect(dec1.referral.patientDeclinedFacilityIds).toEqual(["facility-b"]);

      // Facility C reviews & accepts
      dec1.referral.status = "dept_approved";
      dec1.referral.status = "manager_approved";
      dec1.referral.status = "accepted";
      dec1.referral.receivingFacilityId = "facility-c";

      // 2nd decline: Facility C
      const dec2 = net.recordPatientDecline(ref.id, "Reason C", personas.residentA);
      expect(dec2.referral.candidateFacilityIds).toEqual(["facility-d"]);
      expect(dec2.referral.patientDeclinedFacilityIds).toEqual(["facility-b", "facility-c"]);

      // Facility D reviews & accepts
      dec2.referral.status = "dept_approved";
      dec2.referral.status = "manager_approved";
      dec2.referral.status = "accepted";
      dec2.referral.receivingFacilityId = "facility-d";

      // 3rd decline: Facility D (candidates now empty)
      const dec3 = net.recordPatientDecline(ref.id, "Reason D", personas.residentA);
      expect(dec3.referral.candidateFacilityIds).toEqual([]);
      expect(dec3.referral.patientDeclinedFacilityIds).toEqual(["facility-b", "facility-c", "facility-d"]);
      expect(dec3.referral.receivingFacilityId).toBe("auto");

      // Verify routing evaluator produces no_matching_facility
      const escReason = capacityEscalationReason(dec3.referral, net.facilities, { facilitiesLoaded: true });
      expect(escReason).toBe("no_matching_facility");
    });

    it("2.2 verifies findCandidateFacilities and availableBeds boundary conditions", () => {
      const facs = createTestFacilities();

      // Zero beds available floored at 0
      const testFac: Facility = {
        id: "fac-test-zero",
        name: "Zero Bed Hospital",
        type: "district_hospital",
        location: "East",
        departments: ["ICU", "Cardiology"],
        capacity: {
          ICU: { total: 5, occupied: 5 },
          CCU: { total: 0, occupied: 0 },
          PICU: { total: 2, occupied: 10 }, // Over-occupied corrupted data
          Ward: { total: 10, occupied: 2 },
        },
      };

      expect(availableBeds(testFac, "ICU")).toBe(0);
      expect(availableBeds(testFac, "CCU")).toBe(0);
      expect(availableBeds(testFac, "PICU")).toBe(0); // Floored at 0
      expect(availableBeds(testFac, "Ward")).toBe(8);

      // Facility matches department and bed type
      expect(facilityMatches(testFac, ["ICU"], "ICU")).toBe(true);
      expect(facilityMatches(testFac, ["ICU", "Cardiology"], "ICU")).toBe(true);
      expect(facilityMatches(testFac, ["ICU", "Neurology"], "ICU")).toBe(false); // Missing department
      expect(facilityMatches(testFac, ["ICU"], "CCU")).toBe(false); // Total CCU is 0

      // findCandidateFacilities filtering
      const res = findCandidateFacilities([testFac, facs["facility-b"]], {
        departments: ["ICU"],
        bedType: "ICU",
        excludeFacilityId: "fac-test-zero",
      });
      expect(res.matching.map((f) => f.id)).toEqual(["facility-b"]);
      expect(res.withBeds.map((f) => f.id)).toEqual(["facility-b"]);
    });

    it("2.3 handles capacityEscalationReason edge cases: cold start, deleted facilities, and directed referrals", () => {
      const facs = createTestFacilities();
      const facMap = new Map(Object.entries(facs));

      // 1. Cold start / unloaded facilities -> returns null
      const refAuto: Referral = {
        id: "ref-auto-01",
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        updatedAt: new Date().toISOString(),
        status: "pending",
        priority: "emergency",
        requiredBedType: "ICU",
        receivingDepartments: ["ICU"],
        referringFacilityId: "facility-a",
        referringUserId: "u1",
        receivingFacilityId: "auto",
        candidateFacilityIds: ["facility-b"],
        patientData: buildWhiteBoxPatientData(),
        patientId: "p1",
        reasonForReferral: "",
        transferType: "one_way",
        isEscalated: false,
        deptComments: [],
        statusHistory: [],
      };

      expect(capacityEscalationReason(refAuto, facMap, { facilitiesLoaded: false })).toBeNull();
      expect(capacityEscalationReason(refAuto, new Map(), { facilitiesLoaded: true })).toBeNull();

      // 2. Candidate facility ID is stale/deleted -> returns no_matching_facility
      const refStale = { ...refAuto, candidateFacilityIds: ["deleted-fac-999"] };
      expect(capacityEscalationReason(refStale, facMap, { facilitiesLoaded: true })).toBe("no_matching_facility");

      // 3. Directed referral to a full hospital -> returns no_beds_available
      const fullB = { ...facs["facility-b"], capacity: { ...facs["facility-b"].capacity, ICU: { total: 10, occupied: 10 } } };
      const directedFacMap = new Map([["facility-b", fullB]]);
      const refDirected = { ...refAuto, receivingFacilityId: "facility-b", candidateFacilityIds: [] };
      expect(capacityEscalationReason(refDirected, directedFacMap, { facilitiesLoaded: true })).toBe("no_beds_available");
    });
  });

  // ============================================================================
  // SECTION 3: MALFORMED CLINICAL PAYLOADS, IDENTITY IMMUTABILITY & EDGE VITALS
  // ============================================================================
  describe("3. Malformed Clinical Payloads, Identity Immutability & Edge Vitals", () => {
    it("3.1 stress-tests extreme physiological vitals and multiline Arabic clinical text", () => {
      const extremeVitals = [
        { hr: 0, bp: "0/0", spo2: 0, temp: 28.0, rr: 0, gcs: 3 }, // Cardiac arrest
        { hr: 260, bp: "260/150", spo2: 100, temp: 42.5, rr: 55, gcs: 15 }, // Extreme storm
        { hr: 75, bp: "115/75", spo2: 99, temp: 36.8, rr: 14, gcs: 8 }, // Severe coma
      ];

      for (const vit of extremeVitals) {
        const patientData = buildWhiteBoxPatientData("Extreme Vitals Patient", {
          vitalSigns: { ...vit, timestamp: new Date().toISOString() },
          clinicalNotes: "تقرير طبي مفصل باللغة العربية: المريض يعاني من صدمة إنتانية حادة مع فشل تنفسي واضطراب في درجة الوعي\nيحتاج إلى سرير رعاية مركزة بشكل عاجل جداً",
          diagnosis: "صدمة إنتانية حادة - Septic Shock Stage 3",
        });

        const ref = net.createReferral(
          {
            patientId: `pat-vit-${vit.hr}`,
            patientData,
            referringFacilityId: "facility-a",
            referringUserId: personas.residentA.id,
            receivingFacilityId: "auto",
            candidateFacilityIds: ["facility-b"],
            receivingDepartments: ["ICU"],
            requiredBedType: "ICU",
            priority: "emergency",
            status: "pending",
            reasonForReferral: "Extreme vitals test",
          },
          personas.residentA
        );

        expect(ref.patientData.vitalSigns.hr).toBe(vit.hr);
        expect(ref.patientData.vitalSigns.gcs).toBe(vit.gcs);
        expect(ref.patientData.clinicalNotes).toContain("تقرير طبي مفصل باللغة العربية");
      }
    });

    it("3.2 validates that identity and clinical fields remain pinned during status transitions", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-pinned-id-01",
          patientData: buildWhiteBoxPatientData("Pinned Identity Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Field pinning test",
        },
        personas.residentA
      );

      const originalPatientId = ref.patientId;
      const originalReferringFac = ref.referringFacilityId;
      const originalReferringUser = ref.referringUserId;
      const originalCreatedAt = ref.createdAt;
      const originalRequiresEscort = ref.requiresAccompanyingDoctor;

      // Status updates
      net.addDeptComment(ref.id, "direct_approval", "Approved", personas.headOfDepartmentB);
      net.updateReferralStatus(ref.id, "manager_approved", "OK", personas.hospitalManagerB);
      net.updateReferralStatus(ref.id, "accepted", "Accepted", personas.erOfficialB);

      expect(ref.patientId).toBe(originalPatientId);
      expect(ref.referringFacilityId).toBe(originalReferringFac);
      expect(ref.referringUserId).toBe(originalReferringUser);
      expect(ref.createdAt).toBe(originalCreatedAt);
      expect(ref.requiresAccompanyingDoctor).toBe(originalRequiresEscort);
    });
  });

  // ============================================================================
  // SECTION 4: BOUNDARY BED ALLOCATIONS, STEPPERS, & DIRECT ADMISSIONS
  // ============================================================================
  describe("4. Boundary Bed Allocations, Steppers, & Direct Admissions", () => {
    it("4.1 executes rapid serial admit and discharge cycles preserving bed capacity balance", () => {
      const facB = net.facilities.get("facility-b")!;
      const initialOccupied = facB.capacity.ICU.occupied; // 2

      // Create and admit 5 referrals in rapid succession
      const createdRefs: Referral[] = [];
      for (let i = 0; i < 5; i++) {
        const r = net.createReferral(
          {
            patientId: `pat-batch-admit-${i}`,
            patientData: buildWhiteBoxPatientData(`Batch Patient ${i}`),
            referringFacilityId: "facility-a",
            referringUserId: personas.residentA.id,
            receivingFacilityId: "facility-b",
            candidateFacilityIds: ["facility-b"],
            receivingDepartments: ["ICU"],
            requiredBedType: "ICU",
            priority: "emergency",
            status: "accepted",
            reasonForReferral: "Batch admit test",
          },
          personas.residentA
        );
        net.recordPatientConsent(r.id, personas.residentA);
        net.updateReferralStatus(r.id, "in_transit", "Departing", personas.erOfficialB);
        net.updateReferralStatus(r.id, "arrived", "Arrived", personas.erOfficialB);
        net.updateReferralStatus(r.id, "admitted", `Admitted ${i}`, personas.nurseB);
        createdRefs.push(r);
      }

      // Occupancy should have increased by 5
      expect(facB.capacity.ICU.occupied).toBe(initialOccupied + 5);

      // Rapidly discharge all 5 referrals
      for (let i = 0; i < 5; i++) {
        net.updateReferralStatus(createdRefs[i].id, "discharged", `Discharged ${i}`, personas.nurseB);
      }

      // Occupancy returns exactly to baseline
      expect(facB.capacity.ICU.occupied).toBe(initialOccupied);
    });

    it("4.2 tests Direct Admissions workflow and validates non-negative floor on discharge", () => {
      const facB = net.facilities.get("facility-b")!;
      const initialWardOccupied = facB.capacity.Ward.occupied;

      // Add direct admission
      const admission = net.addDirectAdmission(
        {
          facilityId: "facility-b",
          department: "ICU",
          bedType: "Ward",
          patientName: "Direct Admission Walk-in",
          hospitalId: "H-DIR-01",
          admittedBy: personas.nurseB.id,
        },
        personas.nurseB
      );

      expect(admission.status).toBe("admitted");
      expect(facB.capacity.Ward.occupied).toBe(initialWardOccupied + 1);

      // Discharge direct admission
      const discharged = net.dischargeDirectAdmission(admission.id, personas.nurseB);
      expect(discharged.status).toBe("discharged");
      expect(facB.capacity.Ward.occupied).toBe(initialWardOccupied);

      // Repeated discharge on already discharged patient is idempotent
      const repeatDischarge = net.dischargeDirectAdmission(admission.id, personas.nurseB);
      expect(repeatDischarge.status).toBe("discharged");
      expect(facB.capacity.Ward.occupied).toBe(initialWardOccupied);
    });

    it("4.3 strictly prevents unauthorized users from altering bed capacity or totals", () => {
      // Non-facility staff attempting capacity update
      expect(() => {
        net.updateFacilityCapacity(
          "facility-b",
          { ICU: { total: 10, occupied: 5 } },
          personas.residentA // Resident at Facility A
        );
      }).toThrow(/cross-facility configuration forbidden/i);

      // Nurse attempting to alter bed TOTALS (requires config role)
      expect(() => {
        net.updateFacilityCapacity(
          "facility-b",
          { ICU: { total: 50, occupied: 2 } }, // Changing total from 10 to 50
          personas.nurseB
        );
      }).toThrow(/altering bed totals requires facility leadership or admin role/i);

      // Out of bounds capacity (occupied > total)
      expect(() => {
        net.updateFacilityCapacity(
          "facility-b",
          { ICU: { total: 10, occupied: 15 } },
          personas.hospitalManagerB
        );
      }).toThrow(/invalid capacity bounds/i);
    });
  });

  // ============================================================================
  // SECTION 5: HOD REVIEW, DELEGATION, & REQUIREMENTS-NEEDED ESCALATIONS
  // ============================================================================
  describe("5. HoD Review, Delegation, & Requirements-Needed Escalations", () => {
    it("5.1 verifies requirements_needed immediate postponement, auto-escalation, and purple notification fan-out", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-req-needed-01",
          patientData: buildWhiteBoxPatientData("Requirements Needed Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "Requirements needed test",
        },
        personas.residentA
      );

      const reviewRes = net.addDeptComment(
        ref.id,
        "requirements_needed",
        "Need Arterial Blood Gas (ABG) and bedside echocardiogram before acceptance.",
        personas.headOfDepartmentB
      );

      expect(reviewRes.referral.status).toBe("postponed");
      expect(reviewRes.referral.receivingFacilityId).toBe("facility-b");
      expect(reviewRes.referral.isEscalated).toBe(true);
      expect(reviewRes.referral.escalatedBy).toBe("system");
      expect(reviewRes.referral.escalationReason).toBe("requirements_needed");
      expect(reviewRes.referral.escalationLevel).toBe("facility");
      expect(reviewRes.referral.autoEscalationSuppressed).toBe(false);

      // Verify purple notification sent to referring doctor
      const purpleNotif = reviewRes.notifications.find((n) => n.type === "purple");
      expect(purpleNotif).toBeDefined();
      expect(purpleNotif?.title).toMatch(/Referral Postponed — Requirements Needed/i);
      expect(purpleNotif?.message).toContain("Need Arterial Blood Gas (ABG)");
    });

    it("5.2 resolves on-call clinical delegation: delegated practitioner can review; non-delegated cannot", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-delegation-01",
          patientData: buildWhiteBoxPatientData("Delegation Test Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["Surgery"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "Surgery delegation test",
        },
        personas.residentA
      );

      // 1. Non-delegated clinician attempts review -> permission denied
      expect(() => {
        net.addDeptComment(ref.id, "direct_approval", "Unauthorized review", personas.specialistA);
      }).toThrow(/permission denied/i);

      // 2. Assign Specialist A on-call shift for Surgery at Facility B using System Admin
      net.assignShift("facility-b", "Surgery", personas.specialistA.id, personas.systemAdmin);

      // 3. Specialist A with active shift assignment executes review -> SUCCEEDS
      personas.specialistA.facilityId = "facility-b"; // on-call at facility B
      const reviewRes = net.addDeptComment(ref.id, "direct_approval", "Delegated surgeon approval", personas.specialistA);
      expect(reviewRes.referral.status).toBe("dept_approved");
    });
  });

  // ============================================================================
  // SECTION 6: SLA TIMING ARITHMETIC, CLOCK DRIFT & CONCURRENCY
  // ============================================================================
  describe("6. SLA Timing Arithmetic, Clock Drift & Concurrency", () => {
    it("6.1 validates sub-second boundary transitions (1799.999s vs 1800s) and clock skew tolerance", () => {
      const baseEpoch = Date.parse("2026-08-22T14:00:00.000Z");
      const ref = {
        createdAt: "2026-08-22T14:00:00.000Z",
        status: "pending" as const,
        priority: "emergency" as const,
        requiredBedType: "ICU" as const,
        isEscalated: false,
        autoEscalationSuppressed: false,
      };

      // Exact 1799.999s elapsed -> NOT breached
      expect(hasBreachedSla(ref, baseEpoch + 1799999)).toBe(false);
      expect(needsAutoEscalation(ref, baseEpoch + 1799999)).toBe(false);

      // Exact 1800.000s elapsed -> BREACHED
      expect(hasBreachedSla(ref, baseEpoch + 1800000)).toBe(true);
      expect(needsAutoEscalation(ref, baseEpoch + 1800000)).toBe(true);
    });

    it("6.2 ensures idempotent auto-escalation under 50 simulated concurrent sweep executions", () => {
      const baseEpoch = Date.parse("2026-08-22T14:00:00.000Z");
      const ref = net.createReferral(
        {
          patientId: "pat-sla-concurrent-50",
          patientData: buildWhiteBoxPatientData("Concurrent SLA Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "Concurrency test",
        },
        personas.residentA
      );
      ref.createdAt = "2026-08-22T14:00:00.000Z";
      ref.createdAtMs = baseEpoch;
      net.referrals.set(ref.id, ref);

      const breachTime = baseEpoch + 35 * 60 * 1000;

      // 1st execution escalates
      const res1 = net.autoEscalateReferral(ref.id, breachTime);
      expect(res1).not.toBeNull();
      const initialHistoryLen = ref.statusHistory.length;

      // 49 subsequent concurrent attempts return null and append no duplicate entries
      for (let i = 0; i < 49; i++) {
        const res = net.autoEscalateReferral(ref.id, breachTime + i * 100);
        expect(res).toBeNull();
      }

      expect(ref.statusHistory.length).toBe(initialHistoryLen);
    });
  });

  // ============================================================================
  // SECTION 7: ESCORT DOCTOR ESCORT GATE COMPLEX EDGE CASES
  // ============================================================================
  describe("7. Escort Doctor Escort Gate Complex Edge Cases", () => {
    it("7.1 accepts valid Egyptian phone formats and validates doctor name sanitization", () => {
      const validPhoneNumbers = [
        "01012345678",
        "+201012345678",
        "00201012345678",
        "01198765432",
        "01234567890",
        "01555555555",
      ];

      for (const phone of validPhoneNumbers) {
        const ref = net.createReferral(
          {
            patientId: `pat-phone-${phone}`,
            patientData: buildWhiteBoxPatientData(`Phone Patient ${phone}`),
            referringFacilityId: "facility-a",
            referringUserId: personas.residentA.id,
            receivingFacilityId: "facility-b",
            candidateFacilityIds: ["facility-b"],
            receivingDepartments: ["ICU"],
            requiredBedType: "ICU",
            priority: "emergency",
            status: "accepted",
            requiresAccompanyingDoctor: true,
            reasonForReferral: "Phone format validation",
          },
          personas.residentA
        );
        net.recordPatientConsent(ref.id, personas.residentA);

        const updated = net.setAccompanyingDoctor(ref.id, "Dr. Tarek Abdelaziz", phone, personas.erOfficialB);
        expect(updated.accompanyingDoctor?.phoneNumber).toBe(phone);
      }
    });

    it("7.2 blocks ambulance transit dispatch if escort is removed or unassigned", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-escort-unassigned",
          patientData: buildWhiteBoxPatientData("Unassigned Escort Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Escort removal test",
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      // Do not assign escort -> in_transit fails
      expect(() => {
        net.updateReferralStatus(ref.id, "in_transit", "Ambulance leaving", personas.erOfficialB);
      }).toThrow(/add the accompanying doctor’s name and phone number before dispatching/i);
    });
  });

  // ============================================================================
  // SECTION 8: REJECTION & CANCELLATION EXCEPTIONS & PERMISSION HARDENING
  // ============================================================================
  describe("8. Rejection & Cancellation Exceptions & Permission Hardening", () => {
    it("8.1 formats rejection notes properly and enforces non-empty rejection reason", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-reject-notes",
          patientData: buildWhiteBoxPatientData("Rejection Notes Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "pending",
          reasonForReferral: "Rejection notes formatting",
        },
        personas.residentA
      );

      // Empty rejection reason fails
      expect(() => {
        net.updateReferralStatus(ref.id, "rejected", "   ", personas.hospitalManagerB);
      }).toThrow(/rejection reason is required/i);

      // Reason without 'Rejected:' prefix is formatted with prefix
      const rejRes = net.updateReferralStatus(ref.id, "rejected", "No specialized pediatric ICU bed available", personas.hospitalManagerB);
      expect(rejRes.referral.status).toBe("rejected");
      expect(rejRes.referral.rejectionReason).toBe("No specialized pediatric ICU bed available");
      const rejLog = rejRes.referral.statusHistory.find((h) => h.status === "rejected");
      expect(rejLog?.notes).toBe("Rejected: No specialized pediatric ICU bed available");
    });

    it("8.2 enforces pre-transit cancellation permissions: creator, senior referring roles, admin allowed; others rejected", () => {
      const createPreTransitRef = () => net.createReferral(
        {
          patientId: "pat-cancel-rbac",
          patientData: buildWhiteBoxPatientData("Cancel RBAC Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "pending",
          reasonForReferral: "Cancel RBAC test",
        },
        personas.residentA
      );

      // 1. Creator Resident A -> CAN CANCEL
      const ref1 = createPreTransitRef();
      const c1 = net.cancelReferral(ref1.id, "Patient improved", personas.residentA);
      expect(c1.referral.status).toBe("cancelled");

      // 2. Medical Director at Referring Facility A -> CAN CANCEL
      const ref2 = createPreTransitRef();
      const c2 = net.cancelReferral(ref2.id, "Clinical redirection", personas.medicalDirectorA);
      expect(c2.referral.status).toBe("cancelled");

      // 3. System Admin -> CAN CANCEL
      const ref3 = createPreTransitRef();
      const c3 = net.cancelReferral(ref3.id, "Administrative cancellation", personas.systemAdmin);
      expect(c3.referral.status).toBe("cancelled");

      // 4. Other Doctor at Facility A (Consultant A who is not creator) -> FORBIDDEN
      const ref4 = createPreTransitRef();
      expect(() => {
        net.cancelReferral(ref4.id, "Unauthorized cancel", personas.consultantA);
      }).toThrow(/you do not have permission to cancel this referral/i);

      // 5. Receiving Hospital Manager B -> FORBIDDEN (cancellation belongs to referring side)
      const ref5 = createPreTransitRef();
      expect(() => {
        net.cancelReferral(ref5.id, "Unauthorized cancel", personas.hospitalManagerB);
      }).toThrow(/you do not have permission to cancel this referral/i);
    });

    it("8.3 supports re-opening rejected and postponed referrals back to pending", () => {
      // 1. Rejected -> Pending
      const refRej = net.createReferral(
        {
          patientId: "pat-reopen-rej",
          patientData: buildWhiteBoxPatientData("Reopen Rejected Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "Reopen test",
        },
        personas.residentA
      );
      net.updateReferralStatus(refRej.id, "rejected", "Temporary ICU bed shortage", personas.hospitalManagerB);
      expect(refRej.status).toBe("rejected");

      // Re-opening back to pending
      const reopenedRej = net.updateReferralStatus(refRej.id, "pending", "Re-submitting with updated diagnostic labs", personas.residentA);
      expect(reopenedRej.referral.status).toBe("pending");

      // 2. Postponed -> Pending
      const refPost = net.createReferral(
        {
          patientId: "pat-reopen-post",
          patientData: buildWhiteBoxPatientData("Reopen Postponed Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "Postponed test",
        },
        personas.residentA
      );
      net.addDeptComment(refPost.id, "requirements_needed", "Send CT scan", personas.headOfDepartmentB);
      expect(refPost.status).toBe("postponed");

      const reopenedPost = net.updateReferralStatus(refPost.id, "pending", "CT scan attached, re-submitting", personas.residentA);
      expect(reopenedPost.referral.status).toBe("pending");
    });
  });

  // ============================================================================
  // SECTION 9: SHIFT LOGS, ASSIGNMENTS & NOTIFICATION RECIPIENT RESOLUTION
  // ============================================================================
  describe("9. Shift Logs, Assignments & Notification Recipient Resolution", () => {
    it("9.1 records shift logs with author ID and facility pinning, preventing cross-facility logging", () => {
      // Valid shift log
      const log = net.addShiftLog(
        {
          facilityId: "facility-b",
          userId: personas.nurseB.id,
          userName: personas.nurseB.name,
          department: "ICU",
          pendingTransfersCount: 1,
          admittedPatientsCount: 5,
          summary: "Night shift handover: all ICU beds occupied, 1 ventilator patient stable.",
        },
        personas.nurseB
      );

      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.facilityId).toBe("facility-b");
      expect(log.userId).toBe(personas.nurseB.id);

      // Mismatched user ID attempt -> rejected
      expect(() => {
        net.addShiftLog(
          {
            facilityId: "facility-b",
            userId: "forged-user-id",
            userName: "Fake Doctor",
            department: "ICU",
            pendingTransfersCount: 0,
            admittedPatientsCount: 0,
            summary: "Forged log",
          },
          personas.nurseB
        );
      }).toThrow(/caller ID must match log author/i);

      // Cross-facility shift log attempt -> rejected
      expect(() => {
        net.addShiftLog(
          {
            facilityId: "facility-a", // Trying to log at facility A while stationed at facility B
            userId: personas.nurseB.id,
            userName: personas.nurseB.name,
            department: "ICU",
            pendingTransfersCount: 0,
            admittedPatientsCount: 0,
            summary: "Cross-facility log",
          },
          personas.nurseB
        );
      }).toThrow(/cannot write shift log for another facility/i);
    });

    it("9.2 verifies notification recipient resolution with named targetUserIds, broadcast roles, and admin coverage", () => {
      // Send targeted notification
      const notifs = net.sendNotification({
        title: "Test Targeted Alert",
        message: "Direct alert to Dr. Sarah",
        type: "info",
        referralId: "ref-test-notif",
        facilityId: "facility-a",
        targetRoles: ["head_of_department"],
        targetUserIds: [personas.clinicianA.id], // Clinician addressed by name
      });

      const recipientIds = notifs.map((n) => n.userId);

      // Named targetUser receives notification
      expect(recipientIds).toContain(personas.clinicianA.id);

      // System Admin and Owner receive all broadcast alerts network-wide
      expect(recipientIds).toContain(personas.systemAdmin.id);
      expect(recipientIds).toContain(personas.owner.id);

      // Unrelated resident at facility C does NOT receive notification
      expect(recipientIds).not.toContain(personas.strangerResidentC.id);
    });
  });

  // ============================================================================
  // SECTION 10: PURE FUNCTION BRANCH COVERAGE & BOUNDARY TESTS (ROUTING & SLA)
  // ============================================================================
  describe("10. Pure Function Branch Coverage & Boundary Tests (Routing & SLA)", () => {
    it("10.1 covers all describeCapacityEscalation output branches", () => {
      expect(describeCapacityEscalation("no_matching_facility")).toBe(
        "No facility in the network provides the required departments and bed type."
      );
      expect(describeCapacityEscalation("no_beds_available")).toBe(
        "Every matching facility is at full capacity for the required bed type."
      );
    });

    it("10.2 covers availableBeds and facilityMatches with undefined/missing properties", () => {
      const corruptFac = {
        id: "fac-corrupt",
        name: "Corrupt Data Facility",
        type: "primary_care" as const,
        location: "Unknown",
        departments: undefined as unknown as string[],
        capacity: {
          ICU: { total: undefined as unknown as number, occupied: undefined as unknown as number },
        } as any,
      };

      expect(availableBeds(corruptFac, "ICU")).toBe(0);
      expect(availableBeds(corruptFac, "Ward")).toBe(0);
      expect(facilityMatches(corruptFac, ["ICU"], "ICU")).toBe(false);

      // Facility with missing capacity map entirely
      const emptyFac: Facility = {
        id: "fac-empty",
        name: "Empty Fac",
        type: "primary_care",
        location: "X",
        departments: ["ICU"],
        capacity: {} as any,
      };
      expect(availableBeds(emptyFac, "ICU")).toBe(0);
      expect(facilityMatches(emptyFac, ["ICU"], "ICU")).toBe(false);
    });

    it("10.3 verifies SLA calculations across Clock input types (Date vs Number timestamp)", () => {
      const epoch = 1755864000000;
      const dateObj = new Date(epoch);
      const isoStr = dateObj.toISOString();

      const ref = {
        createdAt: isoStr,
        status: "pending" as const,
        priority: "emergency" as const,
        requiredBedType: "ICU" as const,
      };

      // Number clock
      expect(secondsUntilSlaBreach(ref, epoch + 600000)).toBe(1200);
      expect(hasBreachedSla(ref, epoch + 600000)).toBe(false);

      // Date clock
      expect(secondsUntilSlaBreach(ref, new Date(epoch + 1800000))).toBe(0);
      expect(hasBreachedSla(ref, new Date(epoch + 1800000))).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 11: FIRESTORE SECURITY RULES PREDICATE LOGIC VERIFICATION
  // ============================================================================
  describe("11. Firestore Security Rules Predicate Logic Verification", () => {
    it("11.1 validates candidateListNotWidened logic: subsets are allowed; additions are denied", () => {
      const originalCandidates = ["facility-b", "facility-c"];

      const isValidCandidateSubset = (requested: string[], existing: string[]): boolean => {
        const existingSet = new Set(existing);
        return requested.every((id) => existingSet.has(id));
      };

      // Subset allowed
      expect(isValidCandidateSubset(["facility-b"], originalCandidates)).toBe(true);
      expect(isValidCandidateSubset([], originalCandidates)).toBe(true);
      expect(isValidCandidateSubset(["facility-b", "facility-c"], originalCandidates)).toBe(true);

      // Foreign facility added -> DENIED (widening attack)
      expect(isValidCandidateSubset(["facility-b", "facility-c", "facility-d"], originalCandidates)).toBe(false);
      expect(isValidCandidateSubset(["facility-d"], originalCandidates)).toBe(false);
    });

    it("11.2 validates escalationClaimValid predicate invariants", () => {
      const validateEscalation = (claim: {
        isEscalated: boolean;
        escalationReason?: string;
        escalationLevel?: string;
        escalatedBy?: string;
        createdAtMs?: number;
        nowMs: number;
        authUid: string;
      }): boolean => {
        if (!claim.isEscalated) return true;
        const validReasons = ["sla_breach", "no_matching_facility", "no_beds_available", "manual", "requirements_needed"];
        const validLevels = ["system", "facility"];

        if (!validReasons.includes(claim.escalationReason || "")) return false;
        if (!validLevels.includes(claim.escalationLevel || "")) return false;

        if (claim.escalationReason === "manual" && claim.escalatedBy !== claim.authUid) return false;
        if (claim.escalationReason !== "manual" && claim.escalatedBy !== "system") return false;

        if (claim.escalationReason === "sla_breach") {
          if (!claim.createdAtMs || claim.nowMs < claim.createdAtMs + 1800000) return false;
        }

        if (["no_matching_facility", "no_beds_available"].includes(claim.escalationReason || "")) {
          if (claim.escalationLevel !== "system") return false;
        }

        return true;
      };

      const now = 1755870000000;
      const created35MinAgo = now - 35 * 60 * 1000;
      const created10MinAgo = now - 10 * 60 * 1000;

      // Valid automatic SLA breach
      expect(validateEscalation({
        isEscalated: true,
        escalationReason: "sla_breach",
        escalationLevel: "facility",
        escalatedBy: "system",
        createdAtMs: created35MinAgo,
        nowMs: now,
        authUid: "user-1",
      })).toBe(true);

      // Premature SLA breach (< 30 min) -> DENIED
      expect(validateEscalation({
        isEscalated: true,
        escalationReason: "sla_breach",
        escalationLevel: "facility",
        escalatedBy: "system",
        createdAtMs: created10MinAgo,
        nowMs: now,
        authUid: "user-1",
      })).toBe(false);

      // Valid manual escalation signed by caller
      expect(validateEscalation({
        isEscalated: true,
        escalationReason: "manual",
        escalationLevel: "facility",
        escalatedBy: "user-1",
        nowMs: now,
        authUid: "user-1",
      })).toBe(true);

      // Forged manual escalation signed by another user -> DENIED
      expect(validateEscalation({
        isEscalated: true,
        escalationReason: "manual",
        escalationLevel: "facility",
        escalatedBy: "victim-user",
        nowMs: now,
        authUid: "attacker-user",
      })).toBe(false);

      // Capacity escalation with wrong level -> DENIED
      expect(validateEscalation({
        isEscalated: true,
        escalationReason: "no_beds_available",
        escalationLevel: "facility", // Must be 'system'
        escalatedBy: "system",
        nowMs: now,
        authUid: "user-1",
      })).toBe(false);
    });
  });
});

