# Ismailia Health Connect (eha-transfer) — Survey Report 3
**Focus**: Edge Case & Exception Pathways, Test Suites & Test Infrastructure  
**Author**: Explorer Survey 3  
**Date**: 2026-08-22  
**Working Directory**: `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_survey_3/`

---

## Executive Summary

An exhaustive architectural and empirical investigation was conducted on the Ismailia Health Connect (`eha-transfer`) codebase at `/Users/hassanabdelmenem/antigravity/eha-transfer`. This report details the technical implementation, security constraints, exception mechanisms, and testing infrastructure of the system.

### Core Discoveries:
1. **Edge Cases & Exception Handling**:
   - **Cancellation & Patient Decline**: Fully guarded against privilege escalation and state tampering at both client (`DataContext.tsx`) and database (`firestore.rules`) layers. Once a patient is in motion (`in_transit`, `arrived`, `admitted`, `discharged`), cancellation is irreversibly locked.
   - **Rejection Reason Gap**: While cancellation and patient decline prompt for reasons, Manager/Admin rejection (`handleStatusUpdate('rejected')`) in `ReferralDetailPage.tsx` executes directly without prompting for a mandatory rejection reason.
   - **Fast-Track & Emergency Safeguards**: Emergency/urgent referrals for critical beds (ICU/CCU/PICU) are tracked by a strict 30-minute SLA countdown and auto-escalation engine. In addition, an emergency clinical escort gate (`requiresAccompanyingDoctor`) enforces that no ambulance can be marked `in_transit` until an ER Room Official records the escorting doctor's identity and phone number.
   - **0-Bed Capacity Exhaustion**: Non-blocking referral submission immediately routes unaccommodated patients to System Administration via `no_matching_facility` or `no_beds_available` auto-escalation, supported by Admin Destination Override capabilities.
   - **Media Attachments & ECG Viewer**: The ECG Quick-Viewer (`ECGViewerOverlay.tsx`) features full 2D drag panning, zoom scaling (0.5x–5.0x), high-contrast rendering, and accessible controls. However, file upload in `NewReferralPage.tsx` relies on temporary `URL.createObjectURL(file)` blob URLs and lacks file size limit validation.
2. **Test Suites & Test Infrastructure**:
   - `npm run lint` (`tsc --noEmit`): **100% clean**, 0 TypeScript type errors.
   - `npm test` (`vitest run`): **26 test files, 120 tests passed** (100% pass rate) covering components, contexts, hooks, routing algorithms, SLA timers, CSP headers, and offline IndexedDB sync.
   - `npm run test:rules` (`vitest.rules.config.ts`): Comprehensive 807-line Firestore security rules suite validating multi-role permissions, field immutability, query shapes, and transition graphs against the local Firestore emulator. Requires JDK 21+ (OpenJDK 23.0.1 located at `/opt/homebrew/opt/openjdk`).
   - `npm run test:e2e` (`playwright.config.ts`): Baseline E2E suite with 3 tests across 2 files (`auth.spec.ts`, `navigation.spec.ts`). Large coverage gap in multi-role end-to-end lifecycle workflows.

---

## 1. Edge Case & Exception Pathways

### 1.1 Transfer Cancellation and Rejection with Mandatory Reason Logging

#### A. Transfer Cancellation Mechanics
- **Location**: `src/contexts/DataContext.tsx` (`cancelReferral`, lines 1098–1154), `src/pages/ReferralDetailPage.tsx` (lines 310–322, 1082–1114), `firestore.rules` (lines 171–189, 440–443).
- **Authorization**:
  - `owner` and `system_admin` (system-wide authority).
  - The original clinician creator (`r.referringUserId === user.id`).
  - Senior leadership at the referring facility (`SENIOR_CANCEL_ROLES`: `medical_director`, `hospital_manager`, `deputy_manager`, `head_of_department`).
  - Receiving facility staff and non-senior staff cannot cancel a referral created by another user.
- **Locking Lifecycle**:
  - `CANCEL_LOCKED_STATUSES = ['in_transit', 'arrived', 'admitted', 'discharged']`.
  - Once a patient enters motion (`in_transit`), cancellation is strictly refused in both client transaction logic and `firestore.rules`.
  - `firestore.rules` prohibits backwards transitions from locked states to unlocked states, closing any cancel-lock bypass attacks.
- **Audit & Metadata**:
  - Sets `status: 'cancelled'`, `cancelledAt: ISOString`, `cancelledBy: user.id`, `cancelReason: reason || 'Not specified'`, `updatedAt: ISOString`.
  - Appends an audit entry to `statusHistory`: `{ status: 'cancelled', timestamp, userId, notes: reason ? 'Cancelled: ' + reason : 'Cancelled' }`.
- **Identified Gap / Observation**:
  - In `ReferralDetailPage.tsx` (line 1098), the `VoiceTextarea` placeholder reads `"Reason for cancellation (optional)..."`, and `DataContext.tsx` falls back to `'Not specified'`. Under mandatory reason requirements, the UI button should be disabled when `cancelReason.trim()` is empty.

#### B. Transfer Rejection Mechanics
- **Location**: `src/pages/ReferralDetailPage.tsx` (lines 880, 904), `src/contexts/DataContext.tsx` (`updateReferralStatus`, lines 698–804), `firestore.rules` (lines 321–343, 360–371).
- **Authorization**:
  - Only authorized receiving facility members (`isReceivingParty`) or privileged admins can transition a referral to `rejected`.
- **Workflow & Reason Logging Gap**:
  - On the UI, pressing "Decline" / "Reject Transfer" triggers `handleStatusUpdate('rejected')` directly.
  - Unlike cancellation or patient decline, there is **no reason capture modal or prompt** for rejection; the status changes to `rejected` with `notes: undefined`, leaving the rejection cause unrecorded in the audit history.

#### C. Patient Decline & Dynamic Re-Routing
- **Location**: `src/contexts/DataContext.tsx` (`recordPatientDecline`, lines 1045–1093), `src/pages/ReferralDetailPage.tsx` (lines 297–308, 933–968).
- **Mechanism**:
  - When patient decline is recorded at the referring facility (status `accepted`):
    1. Referral status resets to `'pending'`.
    2. `receivingFacilityId` is reset to `'auto'`.
    3. The declined facility is removed from `candidateFacilityIds` and appended to `patientDeclinedFacilityIds`.
    4. Notifications are dispatched to all remaining candidate hospitals: `"Referral Re-routed After Patient Decline"`.
  - Audit trail appends: `{ status: 'pending', timestamp, userId, notes: 'Patient declined transfer to [Hospital Name]: [reason]' }`.

---

### 1.2 Fast-Track vs Routine Workflows

#### A. Priority Categorization & Visual Hierarchy
- **Location**: `src/types/index.ts` (line 47), `src/lib/referralPriority.ts`, `src/components/referrals/PatientCard.tsx`, `src/components/referrals/ReferralList.tsx`.
- **Priority Tiers**:
  - `emergency`: Immediate life-threat / resuscitation.
  - `urgent`: High acuity requiring timely intervention.
  - `routine`: Standard elective/subacute ward transfers.
- **Workflow Sorting (`sortByWorkflow`)**:
  - Primary sort: Escalated cases (`isEscalated: true`) pinned to top.
  - Secondary sort: `emergency` (weight 2) > `urgent` (weight 1) > `routine` (weight 0).
  - Tertiary sort: Oldest `createdAt` first (longest waiting case surfaced).
- **Visual Signals**:
  - Left rail color indicator (`priorityRailClass`): 6px solid border (`border-critical-700` for emergency/escalated, `border-warning-500` for urgent, `border-slate-200` for routine).
  - Priority badge chips (`priorityChipClasses`).

#### B. Time-to-Treatment SLA & Auto-Escalation
- **Location**: `src/lib/sla.ts`, `src/contexts/DataContext.tsx` (lines 1306–1352), `functions/src/sla.ts`.
- **SLA Parameters**:
  - Window: 30 minutes (`SLA_MINUTES = 30`).
  - Scoped strictly to critical cases: `SLA_TRACKED_PRIORITIES = ['emergency', 'urgent']` and `SLA_TRACKED_BED_TYPES = ['ICU', 'CCU', 'PICU']`.
  - Routine Ward transfers are deliberately exempt from SLA auto-escalation to prevent alarm fatigue.
- **Auto-Escalation Engine**:
  - Client-side background sweep runs every 30 seconds (`setInterval(sweep, 30_000)`).
  - Uses `needsAutoEscalation(r, now)`: verifies `!r.isEscalated`, `!r.autoEscalationSuppressed`, and `elapsedSeconds >= 1800`.
  - Transactional update: sets `isEscalated: true`, `escalatedBy: 'system'`, `escalationReason: 'sla_breach'`, `escalationLevel: 'facility'`, and appends system audit entry.
  - Dispatches `urgent` priority notifications across referring and candidate facilities.

#### C. Emergency Doctor Escort Gate (`requiresAccompanyingDoctor`)
- **Location**: `src/pages/NewReferralPage.tsx` (line 71), `src/contexts/DataContext.tsx` (`setAccompanyingDoctor`, lines 1010–1043; guard at line 725), `firestore.rules` (`accompanyingDoctorSatisfied`, lines 378–387; `accompanyingDoctorWriteAuthorized`, lines 398–406).
- **Mechanism**:
  - Referring doctor checks "Accompanying Doctor Required" during intake for critical patients.
  - Guard: `updateReferralStatus` and `firestore.rules` strictly block advancing to `in_transit` unless `accompanyingDoctor` is populated with a valid name and phone number.
  - Authorized Roles: Only ER Room officials (`er_official`, `er_room`) at party facilities can record or clear the escort doctor.

---

### 1.3 0-Bed Capacity Exhaustion & Fallback Routing

#### A. Capacity Verification Algorithm
- **Location**: `src/lib/routing.ts`, `src/contexts/DataContext.tsx` (lines 1327–1345).
- **Core Functions**:
  - `availableBeds(facility, bedType)`: computes `(total - occupied)`, floored at 0.
  - `facilityMatches(facility, departments, bedType)`: requires all requested departments **and** `capacity[bedType].total > 0`.
  - `findCandidateFacilities(facilities, query)`: filters matching candidate facilities and partitions into `{ matching, withBeds }`.

#### B. 0-Bed Exhaustion Pathways
1. **Network Specialty Deficit (`no_matching_facility`)**:
   - Condition: `matching.length === 0` (no hospital in the network has the specialty departments and configured bed type).
   - Action: Referral creation proceeds (non-blocking). User receives a persistent error toast: *"No hospital in the network can take this patient. The referral was created and sent to a system administrator for placement."*
   - Immediate system-level escalation: `escalationReason: 'no_matching_facility'`, `escalationLevel: 'system'`.
2. **100% Network Occupancy (`no_beds_available`)**:
   - Condition: `matching.length > 0` but `withBeds.length === 0` (every matching facility is currently at capacity).
   - Action: Referral is created with all matching facility IDs in `candidateFacilityIds`. User receives persistent toast.
   - Immediate system-level escalation: `escalationReason: 'no_beds_available'`, `escalationLevel: 'system'`.

#### C. Fallback & Admin Destination Override
- **Location**: `src/pages/ReferralDetailPage.tsx` (lines 850–878, 1054–1080), `src/contexts/DataContext.tsx` (`overrideReferralDestination`, lines 806–838).
- **Mechanisms**:
  - System Administrators can manually override destination to contracted external facilities (`isExternal: true`) or reallocate beds.
  - Destination override updates `receivingFacilityId`, logs `{ status: current, notes: 'Destination overridden to [Hospital]' }`, and dispatches targeted alerts to the new facility.

---

### 1.4 ECG Viewer & Media Attachment Validation

#### A. Attachment Schema & Data Flow
- **Location**: `src/types/index.ts` (lines 62–67):
  ```typescript
  export interface Attachment {
    id: string;
    url: string;
    type: 'image' | 'video' | 'document';
    name: string;
  }
  ```

#### B. Upload Handling & Validation Gaps
- **Location**: `src/pages/NewReferralPage.tsx` (lines 265–281, 594–597):
  ```typescript
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      const file = e.target.files[0];
      setTimeout(() => {
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          url: URL.createObjectURL(file) // In-memory preview blob
        };
        setPatientData(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
        setUploading(false);
      }, 1000);
    }
  };
  ```
- **Observations & Gaps**:
  1. **File Size Limit Missing**: No client-side `file.size` validation (e.g. 10MB or 25MB max limit). Large uploads could cause memory exhaustion in browser tabs.
  2. **Storage Persistence**: Attachments currently use `URL.createObjectURL(file)`, which produces ephemeral in-memory URLs (`blob:http://...`). When another user on a different terminal views the referral, the blob URL is inaccessible.
  3. **MIME Type Validation**: The file input specifies `accept="image/*,.pdf"`, but no secondary JavaScript type check enforces allowed magic bytes or file extensions.

#### C. ECG Viewer Overlay (`ECGViewerOverlay.tsx`)
- **Location**: `src/components/referrals/ECGViewerOverlay.tsx` (99 lines).
- **Features & Capabilities**:
  - **Zoom Control**: Scale range `0.5x` to `5.0x` in steps of `0.5x` with real-time percentage display and accessible `role="status"` screen reader text.
  - **2D Pan Interaction**: Smooth dragging via `motion.div` with boundaries (`dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}`) and elastic resistance.
  - **High-Contrast Diagnostic Mode**: Toggles CSS filter `contrast(1.6) brightness(0.9) grayscale(0.5)` for enhancing faint ECG rhythm traces and P/QRS/T wave details.
  - **Accessibility**: Full ARIA labels (`aria-label="Toggle high contrast"`, `aria-pressed`, `aria-label="Zoom in"`, `aria-label="Close ECG viewer"`).

---

## 2. Test Suites and Test Infrastructure

### 2.1 Test Scripts in `package.json`

| Script Command | Target / Engine | Description | Verified Status |
|---|---|---|---|
| `npm run lint` | `tsc --noEmit` | TypeScript compiler typecheck across all project files | **Passes cleanly (0 errors)** |
| `npm test` | `vitest` (`jsdom`) | Unit & integration component/context/utility tests | **26 files, 120 tests passed** |
| `npm run test:rules` | `@firebase/rules-unit-testing` | Firestore security rules emulator verification | Emulator-backed suite (requires JDK 21+) |
| `npm run test:e2e` | Playwright (`chromium`) | End-to-end user journeys against emulators | 2 spec files (3 baseline tests) |
| `npm run test:csp-headers` | `verify-csp-headers.mjs` | Verifies security headers in Firebase Hosting config | CI build verification tool |
| `npm run test:coverage` | `@vitest/coverage-v8` | Code coverage report generator | Integrated with Vitest |
| `npm run mutate` | `@stryker-mutator` | Mutation testing suite | Stryker Vitest runner |

---

### 2.2 Test Suite Architecture & Verification Results

#### A. TypeScript Typecheck (`npm run lint`)
- Command: `tsc --noEmit`
- Result: Exited with code 0. Clean compilation across all 95+ source and script files.

#### B. Vitest Unit & Integration Suite (`npm test`)
- Command: `npx vitest run`
- Execution Duration: ~4.02s
- Total Results: **26 test files passed, 120 tests passed, 0 failed**.
- Test Coverage Breakdown:
  1. `src/lib/sla.test.ts` (35 tests): Tests all status transitions, tracked priorities, bed types, seconds until breach, and auto-escalation suppression.
  2. `src/lib/routing.test.ts` (18 tests): Tests bed calculation, department matching, multi-criteria filtering, and capacity escalation logic.
  3. `src/lib/utils.test.ts` (6 tests): Time/date formatting, phone number sanitization, string utilities.
  4. `src/lib/csp.security.test.ts` (5 tests): Content Security Policy directive compliance.
  5. `src/contexts/DataContext.cancel.test.tsx`: Validates cancellation role guards, in-transit locking, and patient decline re-routing.
  6. `src/contexts/AuthContext.test.tsx` (3 tests): Authentication state transitions, session persistence, and logout teardown.
  7. `src/hooks/useSpeechRecognition.*.test.ts` (9 tests across 4 files): Web Speech API mock injection, factory instantiation, edge error states.
  8. `src/hooks/useAudioAlert.*.test.ts` (5 tests): Web Audio API synthesis, frequency/gain timing for alert tones.
  9. UI Component Tests: `Button.test.tsx` (6 tests), `Badge.test.tsx` (6 tests), `Input.test.tsx` (4 tests), `Card.test.tsx` (1 test).
  10. Offline / Storage / Database: `db.test.ts`, `db.edge.test.ts`, `storage.test.ts`, `offlineSync.test.ts`, `notifications.test.ts`.

#### C. Firestore Security Rules Suite (`tests/firestore.rules.test.ts`)
- File Size: 807 lines (36,025 bytes).
- Framework: `@firebase/rules-unit-testing` v5.0.1.
- Test Groups (13 distinct verification blocks):
  1. *Privilege Escalation Prevention*: Blocks self-promotion to `owner`, self-verification, and unauthorized facility transfer.
  2. *Protected Health Information (PHI) Isolation*: Prevents unverified users and non-party facilities from querying `directAdmissions`, `shiftLogs`, or cross-facility patient records.
  3. *Staff Directory Protection*: Protects `users` collection from unverified enumeration while permitting verified member lookups.
  4. *Referral Integrity*: Blocks forged `referringUserId`, prevents candidate facilities from hijacking referrals, and verifies audit trail non-truncation.
  5. *Referral List Query Shapes*: Directly validates query shapes executed by `DataContext` (`where('referringFacilityId', '==', f1)`, `where('receivingFacilityId', '==', f2)`, `array-contains` candidate queries) to prevent permission denial in production listeners.
  6. *Status Graph Enforcement*: Enforces legal transitions (`pending` -> `dept_approved` -> `manager_approved` -> `accepted` -> `patient_consented` -> `in_transit` -> `arrived` -> `admitted` -> `discharged`).
  7. *Transition Actor Binding*: Validates that only receiving facility staff can approve/accept/admit, and only referring facility staff can record patient consent.
  8. *SLA Escalation Time Validation*: Server clock check (`request.time >= createdAtMs + 1800000`) prevents client forged SLA breaches.
  9. *Accompanying Doctor Guard*: Prevents `in_transit` dispatch without escort, and restricts escort editing to ER Room official roles.
  10. *Bed Capacity Integrity*: Restricts total bed edits to senior facility managers; blocks negative or over-capacity values.

#### D. End-to-End Playwright Suite (`e2e/`)
- Configuration: `playwright.config.ts` running Chromium on `http://localhost:3000` against Firebase Emulators.
- Current Test Files:
  - `e2e/auth.spec.ts`: Tests redirection to `/login` when unauthenticated.
  - `e2e/navigation.spec.ts`: Tests credentials login with seeded consultant account and navigation between `/referrals` and `/dashboard`.
  - `e2e/global-setup.ts` & `e2e/seed.ts`: Seeds Auth (`e2e.clinician@example.com`, `e2e.owner@example.com`) and Firestore test documents.

---

### 2.3 Emulator & Environment Requirements

1. **Port Allocations (`firebase.json`)**:
   - Auth Emulator: `127.0.0.1:9099`
   - Firestore Emulator: `127.0.0.1:8080`
   - Cloud Functions Emulator: `127.0.0.1:5001`
   - Hosting Emulator: `127.0.0.1:5050`
   - Emulator Hub: `127.0.0.1:4400`
2. **Java Runtime Dependency**:
   - `firebase-tools` v15.26.0 requires **JDK 21 or higher**.
   - System investigation revealed `/Library/Java/JavaVirtualMachines/jdk-19.jdk` (Java 19) is default in macOS wrappers, causing Firebase tools to reject emulator launch.
   - Homebrew OpenJDK 23.0.1 is installed at `/opt/homebrew/opt/openjdk`.
   - Running emulator commands requires prefixing `export JAVA_HOME="/opt/homebrew/opt/openjdk" && export PATH="$JAVA_HOME/bin:$PATH"`.

---

### 2.4 Test Coverage Gaps & Expansion Plan

| Area | Current Test Coverage | Identified Gap / Missing Scenarios | Recommended Addition |
|---|---|---|---|
| **E2E Multi-Role Referral Lifecycle** | None (only basic auth/nav) | No end-to-end test simulating Doctor create -> Dept Head approve -> Manager approve -> ER escort -> Nurse admit | Add `e2e/referral-lifecycle.spec.ts` exercising full 5-role handoff |
| **E2E Cancellation & Rejection** | Unit only (`DataContext.cancel.test.tsx`) | No browser test verifying Cancel modal, reason input, locked states, or manager rejection | Add `e2e/exceptions-cancellation.spec.ts` |
| **E2E 0-Bed Capacity & Override** | Unit only (`routing.test.ts`) | No UI test verifying 0-bed warning banner, auto-escalation toast, and Admin Override Destination dropdown | Add `e2e/capacity-override.spec.ts` |
| **ECG Viewer & Media Attachments** | None | No component or E2E tests for zoom buttons, drag panning, high-contrast toggle, or file upload | Add `src/components/referrals/ECGViewerOverlay.test.tsx` and `e2e/ecg-viewer.spec.ts` |
| **Rejection Reason Prompt** | None | UI lacks mandatory rejection reason modal; no unit test exists for mandatory rejection reason | Implement rejection reason modal in `ReferralDetailPage` and add unit test |

---

## 3. Comprehensive Synthesis Matrix

| Scenario / Pathway | Triggering Actor / Condition | System Response / State Transition | Database & Security Rule Enforcement | Gap / Recommendation |
|---|---|---|---|---|
| **Referral Cancellation** | Referring doctor or senior manager before patient in transit | Sets `status: 'cancelled'`, records `cancelReason` and user ID, dispatches alerts | `canCancelReferral()` checks `isSeniorCancelRole` and `!isCancelLocked()`; immutable `createdAtMs` and `patientId` | Make cancellation reason mandatory in UI instead of `(optional)` |
| **Manager Rejection** | Receiving Hospital Manager or Admin | Sets `status: 'rejected'`, notifies referring facility | `transitionActorAllowed()` requires caller at receiving facility; `validStatusTransition()` | Add mandatory Rejection Reason dialog to `ReferralDetailPage.tsx` |
| **Patient Decline** | Patient at referring hospital declines destination | Resets `status: 'pending'`, `receivingFacilityId: 'auto'`, removes facility from candidates | Candidate list cannot be widened (`candidateListNotWidened()`); caller must be referring party | Add E2E multi-candidate decline test |
| **Fast-Track Emergency** | Clinician sets `priority: 'emergency'` | 6px critical rail, urgent audio alert, priority notification fan-out | Tracks 30-min SLA; `slaWindowElapsed()` verifies server timestamp before escalation | Expand E2E coverage for audio alerts & critical banner |
| **Accompanying Doctor** | Clinician flags `requiresAccompanyingDoctor` | Blocks `in_transit` button until ER official enters doctor name and phone | `accompanyingDoctorSatisfied()` and `accompanyingDoctorWriteAuthorized()` strictly gate Firestore | Add E2E validation for escort doctor gate |
| **0-Bed Network Outage** | No matching facility or all candidates at 100% occupancy | Creates referral, alerts user, background sweep flags `isEscalated: true` (`no_beds_available` / `no_matching_facility`) | System escalation claims validated by `escalationClaimValid()`; only admins can override | Add E2E test for Admin Destination Override |
| **ECG Viewer Interaction** | User clicks clinical attachment thumbnail | Modal opens with 2D pan canvas, zoom controls (0.5x–5.0x), and high-contrast toggle | UI-level component rendered with Motion | Add client file size limit (e.g. 10MB) and test coverage |

---

## 4. Conclusion & Next Steps for Teamwork Execution

The Ismailia Health Connect codebase demonstrates mature security-in-depth architecture:
- Firestore security rules are rigorously hardened against privilege escalation, unauthorized PHI access, audit trail truncation, and invalid state transitions.
- The unit test suite (`120 tests`) provides strong coverage of domain logic, state management, SLA timing, and routing mathematics.
- All TypeScript types compile cleanly with zero errors.

The primary survey opportunities identified for the implementation and testing phases are:
1. **Enforce Mandatory Reason on Rejection & Cancellation**: Add a mandatory reason modal on `handleStatusUpdate('rejected')` in `ReferralDetailPage.tsx` and enforce non-empty reason validation on cancellation.
2. **Media Attachment Validation & Persistence**: Add client-side file size and MIME-type validation to `NewReferralPage.tsx`.
3. **Multi-Role Scenario E2E Expansion**: Implement comprehensive Playwright test suites covering full role lifecycles, emergency fast-track escorts, patient decline re-routing, 0-bed capacity overrides, and ECG viewer interactions.
