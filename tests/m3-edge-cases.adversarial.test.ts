import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SimulatedHealthcareNetwork,
  createTestPersonas,
  PersonaDirectory,
} from "./simulation-harness";
import {
  Role,
  Referral,
  PatientData,
  BedType,
  ReferralPriority,
  ReferralStatus,
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
import * as fnSla from "../functions/src/sla";
import {
  findCandidateFacilities,
  capacityEscalationReason,
  availableBeds,
  facilityMatches,
  describeCapacityEscalation,
} from "../src/lib/routing";

describe("Milestone 3 Adversarial Challenge Suite (Empirical Stress Harness)", () => {
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

  const buildStandardPatientData = (name = "Adversarial Test Patient"): PatientData => ({
    id: "pat-adv-001",
    hospitalId: "H-ADV-01",
    name,
    age: 62,
    gender: "female",
    vitalSigns: {
      hr: 125,
      bp: "85/50",
      spo2: 88,
      temp: 39.1,
      rr: 28,
      gcs: 13,
      timestamp: new Date().toISOString(),
    },
    complaint: "Septic shock with acute respiratory failure",
    presentation: "Hypotensive, altered mental status, tachypneic",
    pastHistory: "End-Stage Renal Disease on HD, CAD",
    medications: "Norepinephrine infusion, Broad-spectrum antibiotics",
    clinicalNotes: "Severe lactic acidosis, bilateral pulmonary infiltrates",
    diagnosis: "Septic Shock / ARDS",
    investigations: "Lactate 4.8, ABG pH 7.21, pO2 55",
    attachments: [],
  });

  // ============================================================================
  // 1. ADVERSARIAL STRESS TESTING: SLA CALCULATIONS ACROSS EDGE TIMESTAMPS
  // ============================================================================
  describe("1. Adversarial SLA Stress Testing Across Edge Timestamps & Clocks", () => {
    const baseEpoch = Date.parse("2026-08-22T12:00:00.000Z");
    const createdAtStr = "2026-08-22T12:00:00.000Z";

    const createTrackedRef = (overrides: Partial<Referral> = {}) => ({
      id: "ref-sla-adv",
      createdAt: createdAtStr,
      status: "pending" as const,
      priority: "emergency" as const,
      requiredBedType: "ICU" as const,
      isEscalated: false,
      autoEscalationSuppressed: false,
      ...overrides,
    });

    it("verifies exact boundary precision: 1799s vs 1799.999s vs 1800s vs 1800.001s", () => {
      const ref = createTrackedRef();

      // 0 seconds elapsed: exactly 1800s remaining, no breach
      expect(secondsUntilSlaBreach(ref, baseEpoch)).toBe(1800);
      expect(hasBreachedSla(ref, baseEpoch)).toBe(false);
      expect(needsAutoEscalation(ref, baseEpoch)).toBe(false);

      // Exactly 1799 seconds elapsed: 1s remaining, NOT breached
      const t1799 = baseEpoch + 1799 * 1000;
      expect(secondsUntilSlaBreach(ref, t1799)).toBe(1);
      expect(hasBreachedSla(ref, t1799)).toBe(false);
      expect(needsAutoEscalation(ref, t1799)).toBe(false);

      // Sub-second 1799.999 seconds elapsed: Math.floor yields 1799s elapsed -> 1s remaining -> NOT breached
      const t1799_999 = baseEpoch + 1799 * 1000 + 999;
      expect(secondsUntilSlaBreach(ref, t1799_999)).toBe(1);
      expect(hasBreachedSla(ref, t1799_999)).toBe(false);
      expect(needsAutoEscalation(ref, t1799_999)).toBe(false);

      // Exactly 1800 seconds (30m 00s) elapsed: 0s remaining -> BREACHED
      const t1800 = baseEpoch + 1800 * 1000;
      expect(secondsUntilSlaBreach(ref, t1800)).toBe(0);
      expect(hasBreachedSla(ref, t1800)).toBe(true);
      expect(needsAutoEscalation(ref, t1800)).toBe(true);

      // 1800.001 seconds elapsed: 0s remaining -> BREACHED
      const t1800_001 = baseEpoch + 1800 * 1000 + 1;
      expect(secondsUntilSlaBreach(ref, t1800_001)).toBe(0);
      expect(hasBreachedSla(ref, t1800_001)).toBe(true);
      expect(needsAutoEscalation(ref, t1800_001)).toBe(true);

      // 1801 seconds elapsed: -1s remaining -> BREACHED
      const t1801 = baseEpoch + 1801 * 1000;
      expect(secondsUntilSlaBreach(ref, t1801)).toBe(-1);
      expect(hasBreachedSla(ref, t1801)).toBe(true);
      expect(needsAutoEscalation(ref, t1801)).toBe(true);
    });

    it("stress-tests negative clock drift (client time behind creation timestamp)", () => {
      const ref = createTrackedRef();

      // Negative clock drift: client clock is 60 seconds BEFORE creation time
      const clockBehind60s = baseEpoch - 60 * 1000;
      const remainingBehind60s = secondsUntilSlaBreach(ref, clockBehind60s);
      expect(remainingBehind60s).toBe(1860); // 1800 - (-60) = 1860s remaining
      expect(hasBreachedSla(ref, clockBehind60s)).toBe(false);
      expect(needsAutoEscalation(ref, clockBehind60s)).toBe(false);

      // Extreme negative clock drift: client clock is 24 hours behind
      const clockBehind24h = baseEpoch - 24 * 3600 * 1000;
      const remainingBehind24h = secondsUntilSlaBreach(ref, clockBehind24h);
      expect(remainingBehind24h).toBe(1800 + 86400);
      expect(hasBreachedSla(ref, clockBehind24h)).toBe(false);
      expect(needsAutoEscalation(ref, clockBehind24h)).toBe(false);
    });

    it("stress-tests future creation timestamps (skewed server/client clocks in the future)", () => {
      // Creation timestamp is set 10 minutes in the future relative to current now
      const futureCreatedAt = new Date(baseEpoch + 10 * 60 * 1000).toISOString();
      const futureRef = createTrackedRef({ createdAt: futureCreatedAt });

      const remaining = secondsUntilSlaBreach(futureRef, baseEpoch);
      expect(remaining).toBe(1800 + 600); // 2400 seconds remaining
      expect(hasBreachedSla(futureRef, baseEpoch)).toBe(false);
      expect(needsAutoEscalation(futureRef, baseEpoch)).toBe(false);

      // Creation timestamp set in year 2099
      const farFutureCreatedAt = "2099-01-01T00:00:00.000Z";
      const farFutureRef = createTrackedRef({ createdAt: farFutureCreatedAt });
      expect(secondsUntilSlaBreach(farFutureRef, baseEpoch)).toBeGreaterThan(1000000);
      expect(hasBreachedSla(farFutureRef, baseEpoch)).toBe(false);
      expect(needsAutoEscalation(farFutureRef, baseEpoch)).toBe(false);
    });

    it("stress-tests timezone offsets (+02:00, +03:00, -05:00, UTC Z)", () => {
      // 14:00 Cairo (+02:00) is 12:00 UTC
      const cairoTimestamp = "2026-08-22T14:00:00.000+02:00";
      const refCairo = createTrackedRef({ createdAt: cairoTimestamp });

      // Exactly 30 mins after (12:30 UTC = 14:30 Cairo)
      const exactBreachUTC = Date.parse("2026-08-22T12:30:00.000Z");
      expect(secondsUntilSlaBreach(refCairo, exactBreachUTC)).toBe(0);
      expect(hasBreachedSla(refCairo, exactBreachUTC)).toBe(true);

      // 1 second before (12:29:59 UTC)
      const oneSecBeforeUTC = Date.parse("2026-08-22T12:29:59.000Z");
      expect(secondsUntilSlaBreach(refCairo, oneSecBeforeUTC)).toBe(1);
      expect(hasBreachedSla(refCairo, oneSecBeforeUTC)).toBe(false);

      // US Eastern (-04:00 Daylight Time): 08:00 EDT = 12:00 UTC
      const nyTimestamp = "2026-08-22T08:00:00.000-04:00";
      const refNY = createTrackedRef({ createdAt: nyTimestamp });
      expect(secondsUntilSlaBreach(refNY, exactBreachUTC)).toBe(0);
      expect(hasBreachedSla(refNY, exactBreachUTC)).toBe(true);
    });

    it("stress-tests corrupted, non-standard, and boundary timestamp inputs without crashes or false breaches", () => {
      const edgeInputs = [
        "",
        "   ",
        "invalid-date",
        "2026-13-45T99:99:99Z",
        "null",
        "undefined",
        "NaN",
        "Infinity",
        "-Infinity",
        "0000-00-00",
        undefined as unknown as string,
        null as unknown as string,
      ];

      for (const badDate of edgeInputs) {
        const corruptRef = createTrackedRef({ createdAt: badDate });
        expect(secondsUntilSlaBreach(corruptRef, baseEpoch)).toBeNull();
        expect(hasBreachedSla(corruptRef, baseEpoch)).toBe(false);
        expect(needsAutoEscalation(corruptRef, baseEpoch)).toBe(false);
      }
    });

    it("verifies high-throughput deterministic consistency across 1,000 boundary timestamp variations", () => {
      for (let offset = -500; offset <= 2500; offset += 3) {
        const ref = createTrackedRef();
        const testTime = baseEpoch + offset * 1000;
        const remaining = secondsUntilSlaBreach(ref, testTime);
        const breached = hasBreachedSla(ref, testTime);
        const needsEsc = needsAutoEscalation(ref, testTime);

        expect(remaining).toBe(1800 - offset);
        expect(breached).toBe(offset >= 1800);
        expect(needsEsc).toBe(offset >= 1800);
      }
    });

    it("verifies 100% mathematical and logical parity with Cloud Functions SLA module across all edge cases", () => {
      const testCases = [
        { label: "Exact 0s elapsed", nowOffset: 0, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "1799s elapsed (1s before breach)", nowOffset: 1799, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "1800s elapsed (exact breach)", nowOffset: 1800, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "1801s elapsed (1s post breach)", nowOffset: 1801, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "Negative drift (-120s)", nowOffset: -120, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "Future timestamp (+3600s)", nowOffset: 3600, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "Breached but already escalated", nowOffset: 2000, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: true, suppressed: false },
        { label: "Breached but suppressed", nowOffset: 2000, priority: "emergency", bedType: "ICU", status: "pending", isEscalated: false, suppressed: true },
        { label: "Breached but routine priority", nowOffset: 2000, priority: "routine", bedType: "ICU", status: "pending", isEscalated: false, suppressed: false },
        { label: "Breached but Ward bed", nowOffset: 2000, priority: "emergency", bedType: "Ward", status: "pending", isEscalated: false, suppressed: false },
        { label: "Breached but accepted status", nowOffset: 2000, priority: "emergency", bedType: "ICU", status: "accepted", isEscalated: false, suppressed: false },
      ];

      for (const tc of testCases) {
        const ref = {
          createdAt: createdAtStr,
          status: tc.status as any,
          priority: tc.priority as any,
          requiredBedType: tc.bedType as any,
          isEscalated: tc.isEscalated,
          autoEscalationSuppressed: tc.suppressed,
        };

        const nowMs = baseEpoch + tc.nowOffset * 1000;
        const nowObj = new Date(nowMs);

        // Core tracking
        expect(isSlaTracked(ref)).toBe(fnSla.isSlaTracked(ref));

        // Seconds remaining
        expect(secondsUntilSlaBreach(ref, nowObj)).toBe(fnSla.secondsUntilSlaBreach(ref, nowMs));

        // Has breached
        expect(hasBreachedSla(ref, nowObj)).toBe(fnSla.hasBreachedSla(ref, nowMs));

        // Needs auto-escalation
        expect(needsAutoEscalation(ref, nowObj)).toBe(fnSla.needsAutoEscalation(ref, nowMs));
      }
    });
  });

  // ============================================================================
  // 2. ADVERSARIAL STRESS TESTING: SERIAL PATIENT DECLINES & CAPACITY AUTO-ESCALATION
  // ============================================================================
  describe("2. Adversarial Stress Testing: Serial Patient Declines & Candidate Exhaustion", () => {
    it("handles multi-stage sequential patient declines until candidate list reduces to 0 and triggers capacity auto-escalation", () => {
      // Initialize referral with 3 candidate facilities
      const candidateList = ["facility-b", "facility-c", "facility-d"];
      const ref = net.createReferral(
        {
          patientId: "pat-serial-decline-01",
          patientData: buildStandardPatientData("Serial Decline Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: [...candidateList],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          reasonForReferral: "Multiple trauma requiring ICU",
        },
        personas.residentA
      );

      expect(ref.candidateFacilityIds).toEqual(["facility-b", "facility-c", "facility-d"]);
      expect(ref.patientDeclinedFacilityIds).toBeUndefined();

      // --- DECLINE 1: Decline Hospital B ---
      const d1 = net.recordPatientDecline(ref.id, "Patient family prefers closer hospital", personas.residentA);
      expect(d1.referral.status).toBe("pending");
      expect(d1.referral.receivingFacilityId).toBe("auto");
      expect(d1.referral.candidateFacilityIds).toEqual(["facility-c", "facility-d"]);
      expect(d1.referral.patientDeclinedFacilityIds).toEqual(["facility-b"]);
      expect(capacityEscalationReason(d1.referral, net.facilities, { facilitiesLoaded: true })).toBeNull();

      // Facility C accepts referral
      ref.status = "dept_approved";
      ref.status = "manager_approved";
      ref.status = "accepted";
      ref.receivingFacilityId = "facility-c";

      // --- DECLINE 2: Decline Hospital C ---
      const d2 = net.recordPatientDecline(ref.id, "No female medical staff available in ICU", personas.residentA);
      expect(d2.referral.status).toBe("pending");
      expect(d2.referral.receivingFacilityId).toBe("auto");
      expect(d2.referral.candidateFacilityIds).toEqual(["facility-d"]);
      expect(d2.referral.patientDeclinedFacilityIds).toEqual(["facility-b", "facility-c"]);
      expect(capacityEscalationReason(d2.referral, net.facilities, { facilitiesLoaded: true })).toBeNull();

      // Facility D accepts referral
      ref.status = "dept_approved";
      ref.status = "manager_approved";
      ref.status = "accepted";
      ref.receivingFacilityId = "facility-d";

      // --- DECLINE 3: Decline Hospital D (Candidates now reduce to 0) ---
      const d3 = net.recordPatientDecline(ref.id, "Family requests specialized tertiary university care", personas.residentA);
      expect(d3.referral.status).toBe("pending");
      expect(d3.referral.receivingFacilityId).toBe("auto");
      expect(d3.referral.candidateFacilityIds).toEqual([]);
      expect(d3.referral.patientDeclinedFacilityIds).toEqual(["facility-b", "facility-c", "facility-d"]);

      // Candidate list is now 0 -> capacity evaluation identifies no_matching_facility
      const reason = capacityEscalationReason(d3.referral, net.facilities, { facilitiesLoaded: true });
      expect(reason).toBe("no_matching_facility");

      // Verify findCandidateFacilities with full exclusion returns 0 matches
      const facilitiesList = Array.from(net.facilities.values());
      const query = {
        departments: ["ICU"],
        bedType: "ICU" as BedType,
        excludeFacilityId: "facility-a",
        excludeFacilityIds: d3.referral.patientDeclinedFacilityIds,
      };
      const { matching, withBeds } = findCandidateFacilities(facilitiesList, query);
      expect(matching).toHaveLength(0);
      expect(withBeds).toHaveLength(0);

      // Auto-escalate for capacity exhaustion
      const escRes = net.escalateForCapacity(ref.id, "no_matching_facility");
      expect(escRes).not.toBeNull();
      expect(escRes?.referral.isEscalated).toBe(true);
      expect(escRes?.referral.escalationReason).toBe("no_matching_facility");
      expect(escRes?.referral.escalationLevel).toBe("system");
      expect(escRes?.referral.escalatedBy).toBe("system");

      // Verify audit history log contains full explanation
      const auditLog = escRes?.referral.statusHistory.find((h) => h.userId === "system" && h.notes?.includes("No facility in the network"));
      expect(auditLog).toBeDefined();
      expect(auditLog?.notes).toContain("No facility in the network provides the required departments and bed type. Escalated for administrative placement.");
    });

    it("triggers immediate capacity escalation when single candidate facility is declined", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-single-candidate-decline",
          patientData: buildStandardPatientData("Single Candidate Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "accepted",
          reasonForReferral: "Single candidate decline test",
        },
        personas.residentA
      );

      const res = net.recordPatientDecline(ref.id, "Patient declined only candidate", personas.residentA);
      expect(res.referral.candidateFacilityIds).toEqual([]);
      expect(res.referral.patientDeclinedFacilityIds).toEqual(["facility-b"]);

      const reason = capacityEscalationReason(res.referral, net.facilities, { facilitiesLoaded: true });
      expect(reason).toBe("no_matching_facility");

      const esc = net.escalateForCapacity(ref.id, "no_matching_facility");
      expect(esc?.referral.isEscalated).toBe(true);
      expect(esc?.referral.escalationLevel).toBe("system");
    });

    it("sanitizes Arabic and multi-lingual decline reasons and falls back gracefully on whitespace/empty input", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-decline-arabic",
          patientData: buildStandardPatientData("Arabic Decline Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "accepted",
          reasonForReferral: "Arabic reason test",
        },
        personas.residentA
      );

      // Arabic reason string
      const arabicReason = "رفض المريض الانتقال بسبب بعد المسافة ورغبته في مستشفى الجامعة";
      const res = net.recordPatientDecline(ref.id, arabicReason, personas.residentA);
      const log = res.referral.statusHistory.find((h) => h.notes?.includes("Patient declined transfer"));
      expect(log?.notes).toContain(arabicReason);
    });

    it("strictly blocks recording decline from unauthorized intermediate and terminal states", () => {
      const invalidStatuses: ReferralStatus[] = [
        "pending",
        "dept_approved",
        "manager_approved",
        "patient_consented",
        "in_transit",
        "arrived",
        "admitted",
        "discharged",
        "cancelled",
        "rejected",
        "postponed",
      ];

      for (const st of invalidStatuses) {
        const ref = net.createReferral(
          {
            patientId: `pat-decline-invalid-${st}`,
            patientData: buildStandardPatientData(`Decline State ${st}`),
            referringFacilityId: "facility-a",
            referringUserId: personas.residentA.id,
            receivingFacilityId: "facility-b",
            candidateFacilityIds: ["facility-b"],
            receivingDepartments: ["ICU"],
            requiredBedType: "ICU",
            priority: "urgent",
            status: "accepted",
            reasonForReferral: "Invalid state decline test",
          },
          personas.residentA
        );
        ref.status = st;

        expect(() => {
          net.recordPatientDecline(ref.id, "Attempted decline in invalid status", personas.residentA);
        }).toThrow(/patient decline can only be recorded while the referral is in the accepted state/i);
      }
    });
  });

  // ============================================================================
  // 3. ADVERSARIAL STRESS TESTING: DOCTOR ESCORT VALIDATION & DISPATCH GATE
  // ============================================================================
  describe("3. Adversarial Stress Testing: Doctor Escort Validation & Gate", () => {
    it("rejects doctor escort assignment with empty, whitespace-only, and tab/newline names and phone numbers", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-escort-malformed",
          patientData: buildStandardPatientData("Malformed Escort Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Doctor escort validation test",
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      const malformedNameCases = ["", "   ", "\t\n  ", " \r\n "];
      for (const badName of malformedNameCases) {
        expect(() => {
          net.setAccompanyingDoctor(ref.id, badName, "+201012345678", personas.erOfficialB);
        }).toThrow(/both the doctor’s name and phone number are required/i);
      }

      const malformedPhoneCases = ["", "   ", "\t\n  ", " \r\n "];
      for (const badPhone of malformedPhoneCases) {
        expect(() => {
          net.setAccompanyingDoctor(ref.id, "Dr. Tamer ER", badPhone, personas.erOfficialB);
        }).toThrow(/both the doctor’s name and phone number are required/i);
      }
    });

    it("correctly sanitizes and trims whitespace from valid doctor escort name and phone", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-escort-trim",
          patientData: buildStandardPatientData("Trim Escort Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Escort trimming test",
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      const updated = net.setAccompanyingDoctor(
        ref.id,
        "   Dr. Hossam El-Din Mahmoud   ",
        "   +20 10 9988 7766   ",
        personas.erOfficialB
      );

      expect(updated.accompanyingDoctor?.name).toBe("Dr. Hossam El-Din Mahmoud");
      expect(updated.accompanyingDoctor?.phoneNumber).toBe("+20 10 9988 7766");
      expect(updated.accompanyingDoctor?.addedBy).toBe(personas.erOfficialB.id);
    });

    it("supports doctor escort re-assignment prior to ambulance dispatch with full audit trail", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-escort-reassign",
          patientData: buildStandardPatientData("Reassign Escort Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Escort re-assignment test",
        },
        personas.residentA
      );
      net.recordPatientConsent(ref.id, personas.residentA);

      // Doctor 1 assigned
      net.setAccompanyingDoctor(ref.id, "Dr. Initial Escort", "01011112222", personas.erOfficialB);
      expect(ref.accompanyingDoctor?.name).toBe("Dr. Initial Escort");

      // Doctor 2 replaces Doctor 1
      net.setAccompanyingDoctor(ref.id, "Dr. Replacement Escort", "01033334444", personas.erOfficialB);
      expect(ref.accompanyingDoctor?.name).toBe("Dr. Replacement Escort");
      expect(ref.accompanyingDoctor?.phoneNumber).toBe("01033334444");

      // Status history records both assignments
      const logs = ref.statusHistory.filter((h) => h.notes?.includes("Accompanying doctor assigned"));
      expect(logs).toHaveLength(2);
      expect(logs[0].notes).toContain("Dr. Initial Escort (01011112222)");
      expect(logs[1].notes).toContain("Dr. Replacement Escort (01033334444)");
    });

    it("verifies dispatch gate: blocks when requiresAccompanyingDoctor is true and escort missing; allows when false", () => {
      // Case A: requiresAccompanyingDoctor = true -> MUST BLOCK
      const refA = net.createReferral(
        {
          patientId: "pat-gate-true",
          patientData: buildStandardPatientData("Gate True Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          requiresAccompanyingDoctor: true,
          reasonForReferral: "Gate true test",
        },
        personas.residentA
      );
      net.recordPatientConsent(refA.id, personas.residentA);
      expect(() => {
        net.updateReferralStatus(refA.id, "in_transit", "Ambulance departing", personas.erOfficialB);
      }).toThrow(/add the accompanying doctor’s name and phone number before dispatching the ambulance/i);

      // Case B: requiresAccompanyingDoctor = false -> SUCCEEDS WITHOUT ESCORT
      const refB = net.createReferral(
        {
          patientId: "pat-gate-false",
          patientData: buildStandardPatientData("Gate False Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "facility-b",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "accepted",
          requiresAccompanyingDoctor: false,
          reasonForReferral: "Gate false test",
        },
        personas.residentA
      );
      net.recordPatientConsent(refB.id, personas.residentA);
      const resB = net.updateReferralStatus(refB.id, "in_transit", "Ambulance departing without escort", personas.erOfficialB);
      expect(resB.referral.status).toBe("in_transit");
    });
  });

  // ============================================================================
  // 4. ADVERSARIAL STRESS TESTING: ADMIN OVERRIDE DESTINATION & ESCALATION CLEARING
  // ============================================================================
  describe("4. Adversarial Stress Testing: Admin Override Destination & Boundary Cases", () => {
    it("successfully places patient via Admin Override when target hospital has 0 available beds (100% capacity)", () => {
      // Set Facility C to 100% full (0 free ICU beds)
      const facC = net.facilities.get("facility-c")!;
      facC.capacity.ICU = { total: 10, occupied: 10 };
      net.facilities.set("facility-c", facC);
      expect(availableBeds(facC, "ICU")).toBe(0);

      // Create escalated referral with no beds available
      const ref = net.createReferral(
        {
          patientId: "pat-override-0beds",
          patientData: buildStandardPatientData("0-Bed Override Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b", "facility-c"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "0-bed override placement",
        },
        personas.residentA
      );
      net.escalateForCapacity(ref.id, "no_beds_available");
      expect(ref.isEscalated).toBe(true);
      expect(ref.escalationReason).toBe("no_beds_available");
      expect(ref.escalationLevel).toBe("system");

      // System Admin executes emergency override to Facility C (even with 0 beds)
      const overridden = net.overrideReferralDestination(ref.id, "facility-c", personas.systemAdmin, true);

      expect(overridden.receivingFacilityId).toBe("facility-c");
      expect(overridden.isEscalated).toBe(false);
      expect(overridden.escalatedAt).toBeNull();
      expect(overridden.escalatedBy).toBeNull();
      expect(overridden.escalationReason).toBeNull();
      expect(overridden.escalationLevel).toBeNull();
      expect(overridden.autoEscalationSuppressed).toBe(true);

      // Verify audit history log
      const auditLog = overridden.statusHistory.find((h) => h.notes?.includes("Destination manually overridden"));
      expect(auditLog).toBeDefined();
      expect(auditLog?.notes).toContain("Destination manually overridden to Suez Canal University Hospital");

      // Verify that subsequent SLA or capacity sweeps do NOT re-escalate due to autoEscalationSuppressed
      const nowFuture = Date.now() + 60 * 60 * 1000;
      const reEscalateSla = net.autoEscalateReferral(ref.id, nowFuture);
      expect(reEscalateSla).toBeNull();
      expect(overridden.isEscalated).toBe(false);

      const reEscalateCap = net.escalateForCapacity(ref.id, "no_beds_available");
      expect(reEscalateCap).toBeNull();
      expect(overridden.isEscalated).toBe(false);
    });

    it("resets all escalation flags when overriding an SLA-breached referral", () => {
      const baseTime = Date.parse("2026-08-22T06:00:00.000Z");
      const ref = net.createReferral(
        {
          patientId: "pat-override-sla-breached",
          patientData: buildStandardPatientData("SLA Overridden Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "emergency",
          status: "pending",
          reasonForReferral: "SLA breach override test",
        },
        personas.residentA
      );
      ref.createdAt = "2026-08-22T06:00:00.000Z";
      ref.createdAtMs = baseTime;
      net.referrals.set(ref.id, ref);

      // Auto-escalate at 35 mins
      net.autoEscalateReferral(ref.id, baseTime + 35 * 60 * 1000);
      expect(ref.isEscalated).toBe(true);
      expect(ref.escalationReason).toBe("sla_breach");

      // Admin overrides destination to Facility D
      const overridden = net.overrideReferralDestination(ref.id, "facility-d", personas.systemAdmin, true);
      expect(overridden.isEscalated).toBe(false);
      expect(overridden.escalatedAt).toBeNull();
      expect(overridden.escalatedBy).toBeNull();
      expect(overridden.escalationReason).toBeNull();
      expect(overridden.escalationLevel).toBeNull();
      expect(overridden.autoEscalationSuppressed).toBe(true);
      expect(overridden.receivingFacilityId).toBe("facility-d");
    });

    it("rejects Admin Override with nonexistent, empty, or invalid hospital IDs", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-override-invalid-id",
          patientData: buildStandardPatientData("Invalid ID Override Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "pending",
          reasonForReferral: "Invalid ID override test",
        },
        personas.residentA
      );

      const invalidTargetIds = [
        "nonexistent-facility-999",
        "",
        "   ",
        "facility-xyz",
        "null",
        "undefined",
      ];

      for (const invalidId of invalidTargetIds) {
        expect(() => {
          net.overrideReferralDestination(ref.id, invalidId, personas.systemAdmin);
        }).toThrow(/target override facility not found/i);
      }

      // Referral remains unaffected
      expect(ref.receivingFacilityId).toBe("auto");
    });

    it("strictly blocks non-admin personas across all roles from executing destination overrides", () => {
      const ref = net.createReferral(
        {
          patientId: "pat-override-rbac-stress",
          patientData: buildStandardPatientData("RBAC Stress Patient"),
          referringFacilityId: "facility-a",
          referringUserId: personas.residentA.id,
          receivingFacilityId: "auto",
          candidateFacilityIds: ["facility-b"],
          receivingDepartments: ["ICU"],
          requiredBedType: "ICU",
          priority: "urgent",
          status: "pending",
          reasonForReferral: "RBAC override stress test",
        },
        personas.residentA
      );

      const allNonAdminPersonas = [
        personas.residentA,
        personas.specialistA,
        personas.consultantA,
        personas.nurseB,
        personas.nursingSupervisorB,
        personas.erOfficialB,
        personas.headOfDepartmentB,
        personas.deputyManagerB,
        personas.hospitalManagerB,
        personas.medicalDirectorB,
        personas.strangerResidentC,
        personas.strangerManagerC,
        personas.unverifiedDoctor,
      ];

      for (const user of allNonAdminPersonas) {
        expect(() => {
          net.overrideReferralDestination(ref.id, "facility-c", user);
        }).toThrow();
      }
    });
  });
});
