# Milestone 4 Handoff Report: Referral Detail, Timeline & Action Console

**Explorer Agent**: `explorer_m4_1`  
**Milestone**: M4 — Referral Detail, Clinical Timeline & Action Console  
**Date**: 2026-08-29  

---

## 1. Observation

### Codebase Inventory & Current Implementation Analysis
1. **Monolithic Page Structure (`src/pages/ReferralDetailPage.tsx`)**:
   - Total length: 1,245 lines (71.6 KB) encompassing state management, role gating, 12-state transitions, multi-pane UI rendering, interactive modals, and mobile pinned action sheets in a single file.
   - Core dependencies: `useData` (DataContext), `useAuth` (AuthContext), `PatientCard`, `StatusTimeline`, `PrintableSummary`, `ECGViewerOverlay`, `VoiceTextarea`, `Badge`, `Button`, `Card`, `Skeleton`.
   - Lines 28–57: `StageRail` visual stepper component (6 stages: `Sent`, `Dept`, `Manager`, `Consent`, `Transit`, `Admitted`).
   - Lines 59–89: Escalation copy mapping (`ESCALATION_HEADLINE`, `ESCALATION_DETAIL`, `BANNER_TINT_CLASSES`).
   - Lines 171–196: Role resolution predicates (`isAdmin`, `isReceiving`, `isReferring`, `isTargetDeptHead`, `isFacilityManager`, `isNurse`, `isErRoom`, `canCancel`).
   - Lines 381–430: Mobile pinned footer action resolution matrix (`roleVariant`: `'dept-head' | 'manager' | 'er-room' | 'nurse' | 'clinician' | null`).
   - Lines 539–728: Left column containing Escalation banner, Rejection reason banner, `PatientCard`, extra clinical data / attachment gallery, and Department Reviews section (`#dept-review-section`).
   - Lines 733–1138: Right column containing Transfer Journey card, `StatusTimeline`, and Facility Actions panel (`#escort-form-section`, Admin direct actions, Consent form, Cancel referral).
   - Lines 1145–1181: Mobile pinned footer (`sm:hidden`).
   - Lines 1183–1239: Modals for `ECGViewerOverlay` and Rejection modal (`#rejectionReasonInput`).

2. **Visual Medical Timeline Components**:
   - `src/components/referrals/StatusTimeline.tsx` (114 lines): Renders a vertical time-ordered list of status updates and department review comments with user attribution (`usersById`), timestamps formatted via `formatDateTime`, status dots (`bg-success-500`, `bg-critical-500`, `bg-warning-500`, `bg-info-500`), and formatted description bubbles.
   - `src/lib/referralStage.ts` (40 lines): Maps the 12 `ReferralStatus` states to 6 primary clinical stages (`STAGE_LABELS = ['Sent', 'Dept', 'Manager', 'Consent', 'Transit', 'Admitted']`), returning null for terminal exception states (`rejected`, `cancelled`).

3. **Patient Demographics & Vitals Rendering (`src/components/referrals/PatientCard.tsx`)**:
   - 89 lines: Splits demographics (Name, Age, Gender, Blood type, Hospital ID, National ID) from clinical vitals and lab investigations.
   - `VitalStat` helper: Evaluates abnormal ranges for HR (<60 or >100), BP (systolic <90 or >140), SpO2 (<95%), Temp (<36 or >38°C), RR (<12 or >20), GCS (<15). Out-of-range vitals trigger `bg-critical-50`, `text-critical-700`, `AlertTriangle` icon, and screen-reader accessibility text (`(abnormal)`).

4. **ECG Quick-Viewer Overlay (`src/components/referrals/ECGViewerOverlay.tsx`)**:
   - 195 lines: Full-screen diagnostic modal with motion animations, pan/drag, zoom in/out (50% to 500%), reset view, and high-contrast toggle (`aria-pressed`).
   - Handles missing image URLs and broken image load errors with accessible alert dialogs and Escape key dismissals.

5. **Interface & DOM Test Contracts (Playwright & Vitest Invariants)**:
   - Playwright E2E (`e2e/referral-lifecycle.spec.ts`, `e2e/exceptions-edge-cases.spec.ts`):
     - Department Review section: `#dept-review-section` with `select` and `textarea`, button `/Submit Review/i`.
     - Manager Acceptance: `/Accept the Transfer/i` -> `/Ready for Receive/i`.
     - Patient Consent: button `/Accepted Transfer/i` and `/Declined This Facility/i`.
     - Accompanying Doctor Escort section: `#escort-form-section` with `input[type="text"]`, `input[type="tel"]`, button `/Save Accompanying Doctor/i`.
     - Dispatch & Transit: `/Dispatch Ambulance/i` -> `/Mark as Arrived/i`.
     - Rejection Modal: dialog with title "Reject Transfer", `#rejectionReasonInput`, button `/Confirm Rejection/i`.
     - Cancellation Dialog: dialog/section with "Cancel Referral", `textarea[placeholder*="Reason for cancellation"]`, button `/Confirm Cancellation/i`.
     - ECG Viewer: dialog with title "ECG Quick-Viewer" / "ECG Diagnostic Viewer", button `/Toggle high contrast|High Contrast/i` with `aria-pressed`, labels `Zoom in`, `Zoom out`, `Reset view`, `Close ECG viewer`.

6. **Current Test Status**:
   - `npm test -- --run src/pages/ReferralDetailPage.test.tsx src/pages/ReferralDetailPage.adversarial.test.tsx` passes with 9/9 tests green.
   - `npm test -- --run src/components/referrals/ECGViewerOverlay.test.tsx src/components/referrals/ECGViewerOverlay.adversarial.test.tsx` passes with 19/19 tests green.
   - Full Vitest suite: 53 test files passed, 542 unit tests passed.

---

## 2. Logic Chain

1. **UX Problem Statement & Cognitive Load**:
   - Healthcare practitioners (e.g. ICU physicians, ER triage nurses, hospital directors) interact with `ReferralDetailPage` under extreme time pressure.
   - Currently, all 12 referral lifecycle stages, administrative overrides, department reviews, consent forms, escort details, clinical narratives, and diagnostic media are rendered in a long vertical scroll.
   - On mobile/tablet screens, action buttons are placed at the bottom of the page (below lengthy medical history and audit logs), which previously forced staff to scroll extensively; the newly introduced pinned mobile footer helps, but the page structure itself remains crowded.

2. **Split-View / Structured Layout Reasoning**:
   - **Left Column (Clinical Core)**: Patient identity, vitals strip with abnormal alerts, clinical narrative (complaint, HPI, past history, medications, labs), diagnostic media attachments (ECG/imaging), and department clinical reviews. This pane must focus purely on clinical decision-making.
   - **Right Column (Logistics & Action Console)**: Transfer route journey, visual status timeline, and role-adaptive action console.
   - **Top Bar (Executive Header)**: Global patient context (Hospital ID, priority badge, bed type requirement, referral ID quick copy), 6-stage lifecycle progress rail (`StageRail`), escalation toggles, and PDF summary generator.

3. **12-State Clinical Lifecycle Stepper & Medical Timeline**:
   - The 12 clinical referral states represent a deterministic state machine:
     ```
     pending -> dept_approved -> manager_approved -> accepted -> patient_consented -> in_transit -> arrived -> admitted -> discharged
       │              │                 │               │               │
       └──────────────┴─────────────────┴───────────────┴───────────────┴──> rejected / cancelled / postponed
     ```
   - **High-Level Stepper (`StageRail`)**: Represents the macro-milestones: `Sent` -> `Dept` -> `Manager` -> `Consent` -> `Transit` -> `Admitted`. This gives clinicians an immediate mental model of where the patient is in the network.
   - **Detailed Audit Timeline (`ReferralTimeline`)**: Chronological audit trail showing micro-events (department clinical reviews, manager approvals, escort additions, arrival logs, direct admin overrides) with user attribution, role tags, and notes.

4. **Role-Gated Action Console Architecture**:
   - The actions required on a referral are strictly partitioned by user role and referral state:
     - **Referring Clinician**: View clinical narrative, confirm patient consent (`accepted` state), view ambulance dispatch status, initiate cancellation (if needed).
     - **Target Department Head (HoD)**: Perform department review (`pending` state) with 5 clinical disposition options (`direct_approval`, `urgent_approval`, `scheduled_approval`, `requirements_needed`, `no_role`).
     - **Hospital Manager / Medical Director**: Accept transfer (`dept_approved` state) or reject with mandatory reason.
     - **ER Official**: Confirm readiness (`manager_approved` -> `accepted`), record escort doctor details (`#escort-form-section`), dispatch ambulance (`patient_consented` -> `in_transit`), mark arrived (`in_transit` -> `arrived`).
     - **Nursing Staff**: Receive arrived patient (`arrived` state), trigger bed admission to ICU/CCU/PICU/Ward, manage capacity.
     - **System Admin / Owner**: Direct action overrides (Direct Approve, Direct Decline, Direct Postpone, Force Move/Destination Override, Escalation toggle).
   - Organizing these actions into modular, dedicated action cards inside a unified `ReferralActionConsole` improves maintainability, reduces render overhead, and guarantees strict adherence to DOM test contracts.

5. **Layout Decomposition Strategy**:
   - Decouple `ReferralDetailPage.tsx` into modular sub-components located in `src/components/referrals/detail/` and `src/components/referrals/actions/`:
     ```
     src/components/referrals/
     ├── detail/
     │   ├── ReferralDetailHeader.tsx       # Top bar, patient badge, StageRail, quick actions
     │   ├── ClinicalSummaryCard.tsx        # Demographics, clinical narrative & history
     │   ├── VitalsSummaryGrid.tsx          # Abnormality-aware vitals tiles
     │   ├── DiagnosticMediaGallery.tsx     # Attachments list + Quick View trigger
     │   ├── DeptReviewsCard.tsx            # Dept comments feed & HoD review form (#dept-review-section)
     │   ├── TransferJourneyCard.tsx        # Visual transfer route (Origin -> Destination -> Return)
     │   ├── ReferralTimeline.tsx           # Enhanced status history event stream
     │   ├── EscalationAlertBanner.tsx      # Context-specific SLA & capacity alerts
     │   └── MobileActionFooter.tsx         # Pinned mobile footer with primary/secondary actions & phone trigger
     ├── actions/
     │   ├── ReferralActionConsole.tsx      # Main role-gated action hub
     │   ├── HodReviewForm.tsx              # #dept-review-section implementation
     │   ├── ManagerApprovalCard.tsx        # Manager acceptance & rejection triggers
     │   ├── PatientConsentCard.tsx         # Patient consent & decline flows
     │   ├── EscortAssignmentForm.tsx       # #escort-form-section implementation
     │   ├── DispatchTransitCard.tsx        # Ambulance dispatch & arrival confirmations
     │   ├── AdminDirectActionsCard.tsx     # Bypass approval, postpone, decline & destination override
     │   ├── RejectionModal.tsx             # Dialog with #rejectionReasonInput
     │   └── CancellationDialog.tsx         # Mandatory cancellation reason flow
     ├── ECGViewerOverlay.tsx               # Existing tested ECG diagnostic viewer
     ├── PatientCard.tsx                    # Existing patient card
     └── PrintableSummary.tsx               # Printable PDF summary
     ```

---

## 3. Caveats

1. **Strict Test Selectors**: Any refactoring must preserve exact DOM IDs and accessibility labels (`#dept-review-section`, `#escort-form-section`, `#rejectionReasonInput`, `/Submit Review/i`, `/Accept the Transfer/i`, `/Ready for Receive/i`, `/Accepted Transfer/i`, `/Save Accompanying Doctor/i`, `/Dispatch Ambulance/i`, `/Mark as Arrived/i`, `/Confirm Rejection/i`, `/Confirm Cancellation/i`, `/Toggle high contrast|High Contrast/i`, `Zoom in`, `Zoom out`, `Reset view`, `Close ECG viewer`).
2. **Read-Only Scope**: This report is strictly an architectural and UX investigation. No production application files were altered during this step.
3. **Print Layout**: `PrintableSummary` is consumed via `useReactToPrint`. The hidden container `<PrintableSummary ref={printRef} ... />` must remain present on the detail page without visual disruption.

---

## 4. Conclusion & Recommendations

1. **Recommended Architecture**:
   - Refactor `ReferralDetailPage.tsx` from 1,245 lines into a lightweight orchestrator page (~150 lines) that composes dedicated, well-tested components in `src/components/referrals/detail/` and `src/components/referrals/actions/`.
   - Maintain the responsive 2:1 split-view grid on desktop (`grid-cols-1 lg:grid-cols-3`), collapsing into a single-column layout on mobile with a pinned thumbs-reach footer.
   - Retain 100% selector and text invariant fidelity so all Vitest and Playwright E2E test suites pass with zero regressions.

2. **Component Mapping Table**:

| Proposed Component | Target Path | Responsibilities & Test Invariants |
|---|---|---|
| `ReferralDetailHeader` | `src/components/referrals/detail/ReferralDetailHeader.tsx` | Back button, patient name/age, Hospital ID, Copy ID button, `StageRail`, PDF print trigger, Escalation toggle button. |
| `EscalationAlertBanner` | `src/components/referrals/detail/EscalationAlertBanner.tsx` | Contextual alert banner for SLA breach, no matching facility, no beds, manual, requirements needed. |
| `ClinicalSummaryCard` | `src/components/referrals/detail/ClinicalSummaryCard.tsx` | Patient demographics, diagnosis, complaint, HPI, past history, medications, and referring doctor contact info. |
| `VitalsSummaryGrid` | `src/components/referrals/detail/VitalsSummaryGrid.tsx` | Abnormality-flagged HR, BP, SpO2, Temp, RR, GCS with warning icons and screen-reader tags. |
| `DiagnosticMediaGallery` | `src/components/referrals/detail/DiagnosticMediaGallery.tsx` | Attachment thumbnails with ECG Quick View trigger (`/Quick View/i`) and document download links (`/Download/i`). |
| `DeptReviewsCard` | `src/components/referrals/detail/DeptReviewsCard.tsx` | Department review history badges + HoD review form (`#dept-review-section`, `select`, `textarea`, `/Submit Review/i`). |
| `TransferJourneyCard` | `src/components/referrals/detail/TransferJourneyCard.tsx` | Visual transfer path (Origin facility -> Outbound -> Destination -> Return). |
| `ReferralTimeline` | `src/components/referrals/detail/ReferralTimeline.tsx` | 12-state audit trail, status dots, acting clinician details, timestamps, action/dept notes. |
| `ReferralActionConsole` | `src/components/referrals/actions/ReferralActionConsole.tsx` | Action notes voice textarea, role routing to Manager, ER, Clinician, Nurse, and Admin action cards. |
| `ManagerApprovalCard` | `src/components/referrals/actions/ManagerApprovalCard.tsx` | Buttons `/Accept the Transfer/i`, `/Reject Transfer/i`, `/Ready for Receive/i`. |
| `PatientConsentCard` | `src/components/referrals/actions/PatientConsentCard.tsx` | Buttons `/Accepted Transfer/i`, `/Declined This Facility/i`, patient decline reason textarea. |
| `EscortAssignmentForm` | `src/components/referrals/actions/EscortAssignmentForm.tsx` | `#escort-form-section`, text input for doctor's name, tel input for phone, button `/Save Accompanying Doctor/i`. |
| `DispatchTransitCard` | `src/components/referrals/actions/DispatchTransitCard.tsx` | Buttons `/Dispatch Ambulance/i`, `/Mark as Arrived/i`, `/Admit Patient/i`, `/Discharge Patient/i`. |
| `AdminDirectActionsCard`| `src/components/referrals/actions/AdminDirectActionsCard.tsx` | System Admin bypass approvals, direct decline, direct postpone, destination override dropdown. |
| `RejectionModal` | `src/components/referrals/actions/RejectionModal.tsx` | Dialog `Reject Transfer`, `#rejectionReasonInput`, button `/Confirm Rejection/i`. |
| `CancellationDialog` | `src/components/referrals/actions/CancellationDialog.tsx` | Cancel referral trigger, reason textarea (`placeholder*="Reason for cancellation"`), `/Confirm Cancellation/i`. |
| `MobileActionFooter` | `src/components/referrals/detail/MobileActionFooter.tsx` | Fixed bottom bar (`sm:hidden`) with primary CTA (54px), secondary CTA (48px), and telephone dialer button. |

---

## 5. Verification Method

To verify the findings and any subsequent implementation of Milestone 4:

1. **Vitest Unit & Component Tests**:
   ```bash
   npm test -- --run src/pages/ReferralDetailPage.test.tsx src/pages/ReferralDetailPage.adversarial.test.tsx src/components/referrals/ECGViewerOverlay.test.tsx src/components/referrals/ECGViewerOverlay.adversarial.test.tsx
   ```
   - **Expected**: All 28 tests pass with 0 failures.

2. **Full Unit Test Suite**:
   ```bash
   npm test -- --run
   ```
   - **Expected**: 53 test files pass, 542 unit tests pass.

3. **Playwright E2E Verification**:
   ```bash
   npm run test:e2e -- e2e/referral-lifecycle.spec.ts e2e/exceptions-edge-cases.spec.ts
   ```
   - **Expected**: Complete 5-step lifecycle simulation and edge case scenarios execute and pass with 100% success rate.

4. **Production Build & Typecheck**:
   ```bash
   npm run build
   ```
   - **Expected**: Vite builds without TypeScript compilation errors or React hook violations.

5. **Invalidation Conditions**:
   - If any DOM selector (`#dept-review-section`, `#escort-form-section`, `#rejectionReasonInput`) or button label text is altered, Playwright E2E tests will fail.
   - If `StageRail` or `StatusTimeline` fails to render on missing/unrecorded vitals or abnormal ranges, Vitest adversarial tests will fail.
