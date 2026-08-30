# Comprehensive Survey & Architecture Report: Ismailia Health Connect (eha-transfer)

**Surveyor**: Explorer 1 (Survey Phase)  
**Date**: 2026-08-22  
**Target Repository**: `/Users/hassanabdelmenem/antigravity/eha-transfer`  

---

## 1. Executive Summary

Ismailia Health Connect (`eha-transfer`) is an acute inter-facility referral and transfer coordination platform built for the Universal Health Insurance system in Ismailia Governorate, Egypt. The application facilitates time-critical patient transfers, bed capacity management, clinical handovers, and administrative governance across primary care units, district hospitals, tertiary care centers, and external contracted hospitals.

### Core Architectural Highlights
- **Tech Stack**: React 19 (`^19.2.8`), TypeScript (`~7.0.2`), Vite (`^8.2.1`), Tailwind CSS v4 (`^4.3.3`), React Router v7 (`^7.18.2`), Firebase SDK (`^12.17.1`), IndexedDB (`idb` `^8.0.3`), and Lucide React.
- **Backend Model**: Serverless architecture backed by Cloud Firestore and Cloud Functions for Firebase. Client-side state and security are strictly gated by comprehensive Firestore Security Rules (`firestore.rules`).
- **Role-Based Access Control (RBAC)**: Support for 14 system roles categorized into 6 core clinical and administrative personas with strict cross-facility data isolation.
- **Workflow State Machine**: A 10-state primary transfer lifecycle (`pending` $\to$ `dept_approved` $\to$ `manager_approved` $\to$ `accepted` $\to$ `patient_consented` $\to$ `in_transit` $\to$ `arrived` $\to$ `admitted` $\to$ `discharged`) augmented with robust exception pathways (`postponed`, `rejected`, `cancelled`, `patient_declined`).
- **Resilience & Offline Handling**: Client-side draft persistence (`localStorage`), offline submission queueing (`IndexedDB`), dual-engine 30-minute SLA breach tracking, and automated capacity depletion escalation.
- **Verification Status**: `tsc --noEmit` passes with 0 type errors; 26 Vitest test suites (120 unit/integration tests) pass cleanly.

---

## 2. Architecture, Tech Stack & Data Flow

### 2.1 Technology Stack & Dependencies
| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | `^19.2.8` | Component UI rendering |
| **Language** | TypeScript | `~7.0.2` | Static type safety and domain modeling |
| **Build & Dev Tool** | Vite | `^8.2.1` | Fast HMR dev server and production bundling |
| **Styling** | Tailwind CSS | `^4.3.3` | Utility-first styling with dark/light themes |
| **Routing** | React Router DOM | `^7.18.2` | Client-side routing with lazy-loaded pages |
| **Database & Auth** | Firebase (Web SDK) | `^12.17.1` | Auth, Firestore real-time subscriptions, transactions |
| **Offline Storage** | IndexedDB (`idb`) | `^8.0.3` | Offline referral submission queue |
| **Animation** | Motion (`motion/react`) | `^13.0.0` | Modal animations, ECG viewer gesture drag/zoom |
| **Charts & Metrics** | Recharts | `^3.10.1` | Referral analytics and volume telemetry |
| **Document Generation** | React-to-Print | `^3.3.0` | Client-side printable clinical summary PDFs |
| **Testing** | Vitest & Playwright | `^4.1.10` / `^1.62.1` | Unit, security rules, and E2E emulator testing |

### 2.2 Application State Management Hierarchy
1. **`AuthContext` (`src/contexts/AuthContext.tsx`)**:
   - Manages user authentication lifecycle via Firebase Auth (`signInWithPopup`, `signInWithRedirect`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendEmailVerification`, `signOut`).
   - Listens to real-time updates for `/users/{uid}` in Firestore.
   - Enforces 15-minute idle timeout auto-logout with DOM activity tracking.
   - Handles dev mock user injection (`localStorage.getItem('auth_user')`) strictly in development/emulator environments.
   - Clears offline IndexedDB caches on logout to avoid cross-session PHI exposure on shared hospital terminals.
2. **`DataContext` (`src/contexts/DataContext.tsx`)**:
   - Central domain state manager subscribing to collections: `facilities`, `users`, `referrals`, `notifications`, `directAdmissions`, `shiftAssignments`, `shiftLogs`.
   - Utilizes partition-based query shapes for referrals: `referring`, `receiving`, and `candidate` queries for facility-scoped staff, and unbounded queries for system administrators (`owner`/`system_admin`).
   - Implements transactional mutations with optimistic UI updates and server-side backstops: `addReferral`, `updateReferralStatus`, `overrideReferralDestination`, `toggleReferralEscalation`, `addDeptComment`, `recordPatientConsent`, `recordPatientDecline`, `cancelReferral`, `setAccompanyingDoctor`, `addDirectAdmission`, `dischargeDirectAdmission`, `quickTransfer`, `assignShift`.
   - Runs a 30-second sweep loop for SLA breach detection and capacity depletion auto-escalation.
3. **`ThemeContext` (`src/contexts/ThemeContext.tsx`)**:
   - Persists visual mode (`light`, `dark`, `system`) in `localStorage`.

### 2.3 Routing and Route Guards
- `/login`: Public authentication page with email/password and Google OAuth.
- `/onboarding`: Profile completion wizard for unassigned users (requests role, facility, department).
- `/pending-verification`: Block screen for unverified accounts pending administrative approval.
- `/` $\to$ Protected App Shell (`AppLayout.tsx`):
  - `/dashboard`: Dynamically resolves to `AdminDashboard` (admins), `ERDashboard` (ER staff), or standard `Dashboard` (clinicians, managers, nurses).
  - `/referrals`: Searchable, filterable master transfer grid.
  - `/referrals/new`: New referral creation wizard and intake form.
  - `/referrals/:id`: Comprehensive multi-role clinical workspace (`ReferralDetailPage`).
  - `/archive`: Historical view of completed, admitted, discharged, and cancelled transfers.
  - `/department`: Department Head shift assignments, on-call delegations, and pending approval queues.
  - `/bed-management`: Real-time bulk bed capacity stepper and direct admissions manager.
  - `/facility-settings`: Facility configuration, user verification portal, and capacity adjustments.
  - `/admissions/new`: Direct admission for unscheduled/walk-in patients.
  - `/directory`: Network-wide facility directory and on-call leadership contacts.
  - `/notifications`: Real-time notification tray.

---

## 3. Persona Simulation Systems & Role Workflows

The application defines 14 specific roles grouped into 6 clinical and administrative operational personas:

```
                                  ┌───────────────────────────┐
                                  │   Referring Clinician     │
                                  │ (resident, specialist,    │
                                  │  consultant, clinician)   │
                                  └─────────────┬─────────────┘
                                                │ 1. Creates Referral (vitals, attachments, bed type, escort flag)
                                                ▼
                                  ┌───────────────────────────┐
                                  │   Head of Department      │
                                  │   (head_of_department /   │
                                  │    on-call delegate)      │
                                  └──────┬──────────────┬─────┘
                     2a. Approves        │              │ 2b. Requirements Needed
                    (dept_approved)      │              │ (postponed + auto-escalated)
                                         ▼              ▼
                    ┌──────────────────────────┐   ┌───────────────────────────┐
                    │     Medical Director /   │   │ Return to Referring Doc   │
                    │     Hospital Manager     │   │ (Purple Urgent Alert)     │
                    └────────────┬─────────────┘   └───────────────────────────┘
                                 │ 3. Manager Signature (manager_approved)
                                 ▼
                    ┌──────────────────────────┐
                    │    Receiving ER/ICU      │
                    │ (er_official / er_room)  │
                    └────────────┬─────────────┘
                                 │ 4. Accepts Patient (accepted)
                                 ▼
                    ┌──────────────────────────┐
                    │   Patient Consent Gate   │
                    │ (Recorded by Referring)  │
                    └────────────┬─────────────┘
                                 │ 5. Consent Confirmed (patient_consented)
                                 │    [ER Records Accompanying Escort Doctor]
                                 ▼
                    ┌──────────────────────────┐
                    │   Ambulance Dispatch     │
                    │   (in_transit -> arrived)│
                    └────────────┬─────────────┘
                                 │ 6. Arrival Confirmed
                                 ▼
                    ┌──────────────────────────┐
                    │   Nursing Supervisor /   │
                    │   Bed Allocation Staff   │
                    └────────────┬─────────────┘
                                 │ 7. Bed Admitted (admitted -> capacity +1)
                                 ▼
                    ┌──────────────────────────┐
                    │   Discharge / Transfer   │
                    │   (discharged -> cap -1) │
                    └──────────────────────────┘
```

### 3.1 Referring Doctor (`resident`, `specialist`, `consultant`, `clinician`)
- **Primary Objectives**: Identify patient needing transfer, record comprehensive clinical summary, select appropriate bed type, attach diagnostics (ECG, imaging), determine escort requirements, track transfer progression.
- **Workflow & UI**:
  - **Intake**: Accesses `/referrals/new` (5-step mobile wizard or desktop form). Enters demographics (National ID, hospital ID, age, gender), vital signs (HR, BP, SpO2, Temp, RR, GCS), clinical presentation, reason for referral, priority (`routine`, `urgent`, `emergency`), bed type (`Ward`, `ICU`, `CCU`, `PICU`), transfer type (`one_way`, `service_and_return`, `assessment_with_return`), and toggles `requiresAccompanyingDoctor`.
  - **Routing**: Auto-routing executes `findCandidateFacilities` filtering by departments and non-zero total bed capacity. Features built-in AI triage score ranking simulator.
  - **Follow-up**: Dedicated dashboard segments (`you`, `them`, `moving`). Answers department requirements if returned as `postponed`. Records patient consent (`recordPatientConsent`) or decline (`recordPatientDecline`). Can initiate soft-cancellation (`cancelReferral`) prior to transit.

### 3.2 Head of Department (`head_of_department` + On-Call Delegates)
- **Primary Objectives**: Perform clinical assessment of inbound referral requests for their department, review diagnostic attachments via ECG Quick-Viewer, determine transfer feasibility, delegate on-call duties.
- **Workflow & UI**:
  - **Review Queue**: Accesses `/department` or `/referrals/:id`. Reviews patient card and clinical history.
  - **Actions**:
    - `direct_approval`, `urgent_approval`, `scheduled_approval`: Advances referral from `pending` to `dept_approved`. Claims the receiving facility if auto-routed; triggers notification to Medical Director for signature.
    - `requirements_needed`: Sets status to `postponed`, adds clinical requirements note, bypasses manager approval, triggers `escalationReason: 'requirements_needed'`, and fans out urgent purple notifications to the referring clinician and leadership at both hospitals.
    - `no_role`: Records opinion without advancing state.
  - **Shift Delegation**: Uses `/department` to assign on-call consultant/specialist cover via `shiftAssignments`, delegating department approval authority.

### 3.3 Medical Director & Hospital Manager (`medical_director`, `hospital_manager`, `deputy_manager`)
- **Primary Objectives**: Executive hospital oversight, financial/capacity verification, final managerial transfer sign-off, facility user governance.
- **Workflow & UI**:
  - **Manager Dashboard (`/dashboard`)**: Displays facility-wide bed capacity gauges, active escalations, and the `dept_approved` queue awaiting signature.
  - **Actions**: Direct approval (`manager_approved`) or rejection (`rejected`) with notes. Approval notifies receiving ER and nursing teams to prepare beds.
  - **Facility Administration (`/facility-settings`)**: Reviews unverified account queue; grants verified status and assigns roles up to their station; manages facility department directories and total bed limits.

### 3.4 Receiving ER / ICU Official (`er_official`, `er_room`)
- **Primary Objectives**: Coordinate ambulance fleet logistics, ensure medical escort compliance, track inbound transit, confirm physical arrival at the ER bay.
- **Workflow & UI**:
  - **ER Dashboard (`/dashboard` $\to$ `ERDashboard.tsx`)**:
    - **Outbound Queue (Awaiting Ambulance)**: Monitors accepted cases. Verifies patient consent status. If `requiresAccompanyingDoctor` is flagged, ER official inputs doctor name and phone (`setAccompanyingDoctor`) before ambulance dispatch button (`in_transit`) is unlocked.
    - **Inbound Queue (In Transit)**: Tracks approaching ambulances in transit. Features direct tel: dialing to the referring physician. Confirms arrival (`arrived`).

### 3.5 Nursing Supervisor & Staff (`nursing_supervisor`, `nurse`)
- **Primary Objectives**: Real-time bed occupancy tracking, patient admission to allocated beds, walk-in direct admissions, end-of-shift handover logging.
- **Workflow & UI**:
  - **Bed Management (`/bed-management`)**:
    - **Arrived Queue**: Displays arrived transfer patients. One-tap "Admit to [BedType] Bed" transitions status from `arrived` to `admitted` and transactionally increments occupied beds.
    - **Live Bed Stepper**: Real-time increment/decrement stepper for ICU, CCU, PICU, Ward beds with debounced (500ms) sync.
  - **Direct Admissions (`/admissions/new`)**: Direct intake of unscheduled walk-in patients into departments/beds, updating capacity.
  - **Discharge**: Discharges patients, decrementing occupied bed capacity.
  - **Shift Handover**: Generates structured handover summary upon logout (`shiftLogs`), cataloging active transfers, admitted census, carry-overs, and watch-list escalations.

### 3.6 System Administrator & Network Owner (`system_admin`, `owner`)
- **Primary Objectives**: Network-wide operational governance, top-level capacity resolution, administrative overrides, user directory management, audit trail inspection.
- **Workflow & UI**:
  - **Admin Dashboard (`/dashboard` $\to$ `AdminDashboard.tsx`)**:
    - **Escalation Console**: Resolves top-level system escalations (`no_matching_facility`, `no_beds_available`, unresponded `sla_breach`, `manual` escalations).
    - **Direct Intervention**: Overrides destination hospital (bypassing normal bed checks to place at contracted/alternate facilities), direct approvals, direct rejections, direct postponement.
    - **Network Telemetry**: Global bed capacity across all facilities and waitlist pressure analytics by facility and priority.
  - **Global Administration (`/facility-settings`, `/directory`)**: Creates/edits facilities, modifies contracted external services, adjusts user roles/privileges, removes users.

---

## 4. Referral Lifecycle State Transition Matrix & Enforcement

### 4.1 State Transition Graph
The state machine is formally enforced both in client transactions (`DataContext.tsx`) and in security rules (`firestore.rules` via `validStatusTransition()` and `transitionActorAllowed()`):

| Origin Status | Allowed Next Statuses | Permitted Actors | Conditions & Enforcement Notes |
|---|---|---|---|
| `pending` | `dept_approved`, `manager_approved`, `accepted`, `rejected`, `postponed`, `cancelled` | Receiving Dept Head / Manager / Admin; Referring (for cancel) | `dept_approved` claims auto-routed hospital; `postponed` triggers requirements escalation; `cancelled` requires creator or senior referring role. |
| `dept_approved` | `manager_approved`, `accepted`, `rejected`, `postponed`, `cancelled` | Receiving Manager / Admin | Manager final signature. |
| `manager_approved` | `accepted`, `rejected`, `postponed`, `cancelled` | Receiving ER / Staff / Admin | Facility confirms readiness to receive. |
| `accepted` | `patient_consented`, `pending`, `rejected`, `postponed`, `cancelled` | Referring Staff (consent/decline/cancel); Receiving Staff (reject/postpone) | Patient consent must be recorded here. If declined, resets to `pending`, adds facility to `patientDeclinedFacilityIds`, and re-routes. |
| `patient_consented` | `in_transit`, `accepted`, `pending`, `cancelled` | Referring / ER Staff / Admin | Dispatch gate: if `requiresAccompanyingDoctor` is true, requires `accompanyingDoctor` map (name + phone) before `in_transit` write is accepted. |
| `in_transit` | `arrived` | Receiving ER / Referring / Admin | **Lock point**: `cancelReferral` is permanently locked once in transit. |
| `arrived` | `admitted`, `discharged` | Receiving Staff (Nurses) / Admin | Physical arrival at hospital bay. |
| `admitted` | `discharged` | Receiving Staff (Nurses) / Admin | Transactionally increments occupied bed capacity. Discharge transactionally decrements bed capacity. |
| `postponed` | `pending`, `dept_approved`, `manager_approved`, `accepted`, `rejected`, `cancelled` | Referring Clinician / Admin | Re-activated once clinical requirements or delays are resolved. |
| `rejected` | `pending`, `cancelled` | Admin / Referring Staff | Terminal rejection or re-submission. |
| `cancelled` | *Terminal* | Referring Creator / Senior Leader / Admin | Immutable terminal soft-delete state with audit reason preservation. |
| `discharged` | *Terminal* | Receiving Staff / Admin | Case closed; patient discharged. |

---

## 5. Security Boundaries, RBAC & Data Isolation

### 5.1 Firestore Security Architecture (`firestore.rules`)
The platform operates without a custom backend server; Firestore Security Rules serve as the exclusive server-side authorization perimeter:

1. **Strict Verification Check (`isVerifiedCaller`)**:
   - Requires valid auth token: `request.auth.token.email_verified == true`.
   - Requires verified profile: `callerDoc().verified == true`.
   - Unverified accounts cannot read or write any patient data (referrals, direct admissions, patient vitals, shift logs).
2. **Cross-Facility Data Isolation (`isReferralParty`)**:
   - Non-privileged accounts can ONLY read referrals where `callerFacility() == referringFacilityId`, `callerFacility() == receivingFacilityId`, or `callerFacility() in candidateFacilityIds`.
   - Direct admissions (`directAdmissions`) and shift logs (`shiftLogs`) are strictly restricted to the caller's facility (`resource.data.facilityId == callerFacility()`).
3. **Data Integrity & Immutability Rules**:
   - **Identity Pinning (`referralIdentityPinned`)**: Referring facility, referring user, patient ID, `createdAt`, `createdAtMs`, and `requiresAccompanyingDoctor` cannot be altered after creation.
   - **Clinical Data Pinning (`referralClinicalDataPinned`)**: Patient clinical records (vitals, diagnosis, allergies, required bed type) cannot be modified by receiving facilities or candidate parties—only by the creator or admin (`mayEditClinicalData`).
   - **Candidate List Protection (`candidateListNotWidened`)**: Candidate facilities can be pruned upon patient decline, but never expanded post-creation (preventing unauthorized data visibility expansion).
   - **Audit Trail Protection (`auditTrailAppendOnly`)**: Status history is strictly append-only; existing entries and original timestamps cannot be deleted or mutated.
   - **Escort Doctor Authorization (`accompanyingDoctorWriteAuthorized`)**: Only `er_official` or `er_room` roles can assign or modify the escort doctor, attributed directly to `request.auth.uid`.
   - **Bed Configuration vs Occupancy Separation**: Facility staff can update `capacity.*.occupied`, but altering `capacity.*.total` or `departments` requires facility leadership roles (`isFacilityConfigRole`).

---

## 6. Edge Cases & Exception Handling Systems

| Edge Case / Feature | Code Location | Mechanism & Behavior |
|---|---|---|
| **30-Minute SLA Breach** | `src/lib/sla.ts`, `DataContext.tsx`, `functions/src/sla.ts` | Tracks `pending` emergency/urgent ICU/CCU/PICU cases. If unresponded after 30 min (`createdAtMs + 1800000 <= now`), auto-escalates to `escalatedBy: 'system'`, `escalationReason: 'sla_breach'`, `escalationLevel: 'facility'`, alerting referring and candidate hospitals. |
| **Network Capacity Depletion** | `src/lib/routing.ts`, `DataContext.tsx` | Evaluates if matching facilities have 0 available beds or no facility provides required departments/bed. Auto-escalates to `escalationLevel: 'system'`, `escalationReason: 'no_beds_available'` or `'no_matching_facility'`, notifying System Admins. |
| **Requirements Needed** | `DataContext.tsx`, `ReferralDetailPage.tsx` | HoD review selects `requirements_needed` $\to$ transitions status directly to `postponed`, bypasses management, auto-escalates at facility level, and broadcasts purple notifications to referring doctor & leadership. |
| **Patient Transfer Decline** | `DataContext.tsx`, `ReferralDetailPage.tsx` | Patient declines destination $\to$ `recordPatientDecline` resets status to `pending`, clears destination to `auto`, appends facility to `patientDeclinedFacilityIds`, removes from candidate list, and re-routes to remaining candidates. |
| **Referral Cancellation** | `DataContext.tsx`, `ReferralDetailPage.tsx`, `firestore.rules` | Soft-cancels referral with timestamp, actor ID, and mandatory reason. Gated strictly to creator, senior referring facility roles, or admin; locked once `in_transit` or later. |
| **Accompanying Doctor Guard** | `DataContext.tsx`, `ERDashboard.tsx`, `firestore.rules` | When `requiresAccompanyingDoctor` is set, ambulance dispatch (`in_transit`) is strictly blocked in UI and database rules until ER official inputs doctor name and phone number. |
| **ECG Quick-Viewer Overlay** | `src/components/referrals/ECGViewerOverlay.tsx` | Interactive modal with zoom in/out (50% to 500%), reset, drag-to-pan, high-contrast filter toggle, and ARIA accessibility labels. |
| **Offline Resilience** | `src/lib/db.ts`, `src/lib/offlineSync.ts`, `NewReferralPage.tsx` | Form draft auto-persists in `localStorage`. Offline submissions store in IndexedDB (`offline-referrals`) with header badge indicator; auto-syncs upon reconnect. |

---

## 7. Automated Test Suite & Quality Status

### 7.1 Static Analysis & Typechecking
- **Command**: `npm run lint` (`tsc --noEmit`)
- **Status**: **PASS (0 errors)**. All source code, contexts, pages, hooks, and test files are completely typed and conform to strict TypeScript settings.

### 7.2 Unit & Integration Tests (Vitest)
- **Command**: `npm test` (`vitest run`)
- **Status**: **PASS (120 tests across 26 test files)**
  - `src/lib/sla.test.ts`: 35 tests verifying SLA calculation, threshold evaluation, and breach logic.
  - `src/lib/routing.test.ts`: 18 tests verifying candidate matching, bed availability checks, and capacity escalation logic.
  - `src/contexts/DataContext.cancel.test.tsx`: 7 tests verifying cancellation permissions, status locks, and audit retention.
  - `src/lib/csp.security.test.ts`: 5 tests verifying Content Security Policy headers and protections.
  - `src/components/ui/*.test.tsx`: Component tests for Badge, Button, Card, Input.
  - `src/contexts/AuthContext.test.tsx`, `src/contexts/DataContext.test.tsx`, `src/hooks/*.test.ts`: Auth lifecycle, speech recognition, audio alerts, and storage tests.

### 7.3 Security Rules Emulator Test Suite
- **Configuration**: `vitest.rules.config.ts` running `tests/firestore.rules.test.ts` against the Firebase Firestore Emulator (`localhost:8080`).
- **Coverage**: Tests cover privilege escalation prevention, user self-verification blocking, facility boundary containment, PHI data isolation, clinical record pinning, accompanying doctor write authorization, status transition validity, and SLA timestamp verification.

### 7.4 End-to-End Test Suite (Playwright)
- **Configuration**: `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/seed.ts`, `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`.
- **Infrastructure**: Automated emulator seeding of auth users and hospital facilities via REST APIs, authenticated session generation, and navigation flow testing.

---

## 8. Summary Matrix of Roles, Permissions & Lifecycle Actions

| Role Name | Category | Primary Views | Core Workflow Actions | State Transition Capabilities |
|---|---|---|---|---|
| `owner` | Network Leadership | All views | Full network governance, admin overrides | All state transitions permitted |
| `system_admin` | Technical Admin | `AdminDashboard`, `FacilitySettingsPage`, `ReferralsPage` | Capacity escalation resolution, forced destination override, user role management | Direct approve (`manager_approved`), decline (`rejected`), postpone (`postponed`), cancel (`cancelled`) |
| `medical_director` | Hospital Leadership | `Dashboard` (Manager), `FacilitySettingsPage`, `ReferralDetailPage` | Inbound transfer sign-off, user verification, capacity limits | `dept_approved` $\to$ `manager_approved`, `rejected` |
| `hospital_manager` | Hospital Leadership | `Dashboard` (Manager), `FacilitySettingsPage`, `ReferralDetailPage` | Inbound transfer sign-off, user verification, capacity limits | `dept_approved` $\to$ `manager_approved`, `rejected` |
| `deputy_manager` | Hospital Leadership | `Dashboard` (Manager), `FacilitySettingsPage`, `ReferralDetailPage` | Deputy sign-off, staff verification | `dept_approved` $\to$ `manager_approved`, `rejected` |
| `head_of_department`| Clinical Leadership | `DepartmentPage`, `ReferralDetailPage` | Clinical review, requirements feedback, on-call shift delegation | `pending` $\to$ `dept_approved`, `postponed` (requirements needed) |
| `consultant` | Clinical Senior | `Dashboard` (Clinician), `DepartmentPage` (if delegated), `ReferralDetailPage` | Intake creation, consent recording, delegated review | Creates `pending`, records `patient_consented`, `dept_approved` (if on-call) |
| `specialist` | Clinical Doctor | `Dashboard` (Clinician), `DepartmentPage` (if delegated), `ReferralDetailPage` | Intake creation, consent recording, delegated review | Creates `pending`, records `patient_consented`, `dept_approved` (if on-call) |
| `resident` | Clinical Doctor | `Dashboard` (Clinician), `ReferralDetailPage`, `NewReferralPage` | Intake creation, vitals recording, patient consent recording | Creates `pending`, records `patient_consented`, `cancelled` (if creator) |
| `clinician` | Primary Care Doctor | `Dashboard` (Clinician), `ReferralDetailPage`, `NewReferralPage` | Primary care intake creation, consent recording | Creates `pending`, records `patient_consented` |
| `nursing_supervisor`| Nursing Leadership | `BedManagementPage`, `AdmitPatientPage`, `ReferralDetailPage` | Bed allocation, direct walk-in admission, shift handover | `arrived` $\to$ `admitted`, `admitted` $\to$ `discharged` |
| `nurse` | Nursing Staff | `BedManagementPage`, `AdmitPatientPage`, `ReferralDetailPage` | Bed allocation, direct walk-in admission, bed stepper | `arrived` $\to$ `admitted`, `admitted` $\to$ `discharged` |
| `er_official` | Emergency Logistics | `ERDashboard`, `ReferralDetailPage` | Escort doctor entry, ambulance dispatch, arrival confirmation | `accepted` $\to$ `in_transit` (with escort), `in_transit` $\to$ `arrived` |
| `er_room` | Emergency Room Staff| `ERDashboard`, `ReferralDetailPage` | Escort doctor entry, ambulance dispatch, arrival confirmation | `accepted` $\to$ `in_transit` (with escort), `in_transit` $\to$ `arrived` |

---

## 9. Next Steps for Multi-Role Testing Phase

1. **Scenario-Based Multi-Role Execution**: Deploy dedicated sub-agents to emulate each persona concurrently in end-to-end transfer scenarios (Intake $\to$ HoD Review $\to$ Manager Signature $\to$ ER Escort & Dispatch $\to$ Arrival $\to$ Bed Admission $\to$ Discharge).
2. **Boundary Penetration Testing**: Validate that negative tests (cross-facility read/write, unauthorized role transitions, pre-consent dispatch) are consistently rejected by both UI and Firestore rules.
3. **Emulator Integration**: Execute full Playwright multi-role scenarios against local Auth and Firestore emulators.

---
