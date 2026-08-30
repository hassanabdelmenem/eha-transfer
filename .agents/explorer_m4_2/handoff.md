# Milestone 4 Handoff Report: Referral Detail, Timeline & Action Console

**Explorer Persona**: Explorer 2 (Milestone 4 - Referral Detail, Timeline & Action Console)  
**Working Directory**: `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m4_2`  
**Date**: 2026-08-29  

---

## 1. Observation

A direct code and test inspection of the Ismailia Health Connect repository was conducted across `e2e/referral-lifecycle.spec.ts`, `e2e/exceptions-edge-cases.spec.ts`, `src/pages/ReferralDetailPage.tsx`, `src/pages/ReferralDetailPage.test.tsx`, `src/pages/ReferralDetailPage.adversarial.test.tsx`, `src/components/referrals/ECGViewerOverlay.tsx`, `src/components/referrals/ECGViewerOverlay.test.tsx`, `src/components/referrals/ECGViewerOverlay.adversarial.test.tsx`, `src/pages/tier5-ui.adversarial.test.tsx`, `src/components/referrals/StatusTimeline.tsx`, `src/components/referrals/PatientCard.tsx`, and `src/pages/ReferralWorkspacePane.tsx`.

### Exact Tested Selectors & Contracts Observed:

| Component / Workflow | Target DOM Element / Attribute | Tested Regex / Selector | Source File & Lines |
|---|---|---|---|
| **HoD Review Section** | `<div id="dept-review-section">` | `#dept-review-section` | `e2e/referral-lifecycle.spec.ts:84-88`, `src/pages/ReferralDetailPage.tsx:703` |
| | `<select>` action dropdown | `deptReviewSection.locator('select')` | `e2e/referral-lifecycle.spec.ts:86`, `src/pages/ReferralDetailPage.tsx:705` |
| | `<textarea>` comment field | `deptReviewSection.locator('textarea')` | `e2e/referral-lifecycle.spec.ts:87`, `src/pages/ReferralDetailPage.tsx:718` |
| | Submit Review Button | `page.getByRole('button', { name: /Submit Review/i })` | `e2e/referral-lifecycle.spec.ts:88`, `src/pages/ReferralDetailPage.tsx:724` |
| | Approved Badge Verification | `page.getByText(/direct approval/i).first()` | `e2e/referral-lifecycle.spec.ts:91`, `src/pages/ReferralDetailPage.tsx:691` |
| **Manager Actions** | Accept Transfer Button | `page.getByRole('button', { name: /Accept the Transfer/i })` | `e2e/referral-lifecycle.spec.ts:100`, `src/pages/ReferralDetailPage.tsx:914` |
| | Ready for Receive Button | `page.getByRole('button', { name: /Ready for Receive/i })` | `e2e/referral-lifecycle.spec.ts:105`, `src/pages/ReferralDetailPage.tsx:924` |
| **Patient Consent** | Consent Button | `page.getByRole('button', { name: /Accepted Transfer/i })` | `e2e/referral-lifecycle.spec.ts:117`, `src/pages/ReferralDetailPage.tsx:958` |
| | Decline Facility Button | `page.getByRole('button', { name: /Declined This Facility/i })` | `src/pages/ReferralDetailPage.tsx:960`, `src/pages/tier5-ui.adversarial.test.tsx:648` |
| **Escort Doctor Form** | `<div id="escort-form-section">` | `#escort-form-section` | `e2e/referral-lifecycle.spec.ts:126`, `src/pages/ReferralDetailPage.tsx:998` |
| | Doctor Name Input | `escortSection.locator('input[type="text"]')` | `e2e/referral-lifecycle.spec.ts:129`, `src/pages/ReferralDetailPage.tsx:1005` |
| | Doctor Phone Input | `escortSection.locator('input[type="tel"]')` | `e2e/referral-lifecycle.spec.ts:130`, `src/pages/ReferralDetailPage.tsx:1012` |
| | Save Escort Button | `page.getByRole('button', { name: /Save Accompanying Doctor/i })` | `e2e/referral-lifecycle.spec.ts:131`, `src/pages/ReferralDetailPage.tsx:1020` |
| | Saved Escort Display | `page.getByText(/Dr\. Youssef Kamel — 01012345678/i)` | `e2e/referral-lifecycle.spec.ts:134`, `src/pages/ReferralDetailPage.tsx:994` |
| **Dispatch & Arrival** | Dispatch Ambulance Button | `page.getByRole('button', { name: /Dispatch Ambulance/i })` | `e2e/referral-lifecycle.spec.ts:137`, `src/pages/ReferralDetailPage.tsx:1038` |
| | In-Transit Text Indicator | `page.getByText(/Currently in transit/i)` | `e2e/referral-lifecycle.spec.ts:142`, `src/pages/ReferralDetailPage.tsx:757` |
| | Mark as Arrived Button | `page.getByRole('button', { name: /Mark as Arrived/i })` | `e2e/referral-lifecycle.spec.ts:145`, `src/pages/ReferralDetailPage.tsx:929` |
| | Admitted Status Badge | `page.getByText(/Patient Admitted Successfully/i)` | `e2e/referral-lifecycle.spec.ts:173`, `src/pages/ReferralDetailPage.tsx:1049` |
| **Rejection Modal** | Open Rejection Button | `page.getByRole('button', { name: /Reject Transfer\|Decline/i })` | `e2e/exceptions-edge-cases.spec.ts:53`, `src/pages/ReferralDetailPage.tsx:917` |
| | Rejection Modal Dialog | `page.locator('div[role="dialog"]', { hasText: 'Reject Transfer' })` | `e2e/exceptions-edge-cases.spec.ts:58`, `src/pages/ReferralDetailPage.tsx:1195` |
| | Rejection Reason Input | `modal.locator('#rejectionReasonInput')` | `e2e/exceptions-edge-cases.spec.ts:66`, `src/pages/ReferralDetailPage.tsx:1212` |
| | Confirm Rejection Button | `modal.getByRole('button', { name: /Confirm Rejection/i })` | `e2e/exceptions-edge-cases.spec.ts:62`, `src/pages/ReferralDetailPage.tsx:1220` |
| | Close Rejection Button | `button[aria-label="Close rejection dialog"]` | `src/pages/ReferralDetailPage.tsx:1201`, `ReferralDetailPage.adversarial.test.tsx:729` |
| **Cancellation Modal** | Open Cancel Button | `page.getByRole('button', { name: /Cancel Referral/i })` | `e2e/exceptions-edge-cases.spec.ts:107`, `src/pages/ReferralDetailPage.tsx:1105` |
| | Confirmation Warning Copy | `page.getByText(/This withdraws the referral and archives it/i)` | `e2e/exceptions-edge-cases.spec.ts:112`, `src/pages/ReferralDetailPage.tsx:1112` |
| | Cancellation Reason Textarea | `page.locator('textarea[placeholder*="Reason for cancellation"]')` | `e2e/exceptions-edge-cases.spec.ts:119`, `src/pages/ReferralDetailPage.tsx:1115` |
| | Confirm Cancellation Button | `page.getByRole('button', { name: /Confirm Cancellation/i })` | `e2e/exceptions-edge-cases.spec.ts:115`, `src/pages/ReferralDetailPage.tsx:1126` |
| | Keep Referral (Cancel) | `page.getByRole('button', { name: /Keep Referral/i })` | `src/pages/ReferralDetailPage.tsx:1123`, `tier5-ui.adversarial.test.tsx:772` |
| **ECG Quick-Viewer** | Open Quick View Button | `page.locator('button', { hasText: 'Quick View' })` | `e2e/exceptions-edge-cases.spec.ts:164`, `src/pages/ReferralDetailPage.tsx:646` |
| | Overlay Dialog | `page.locator('div[role="dialog"]', { hasText: 'ECG Quick-Viewer' })` | `e2e/exceptions-edge-cases.spec.ts:169`, `src/components/referrals/ECGViewerOverlay.tsx:60-69` |
| | High Contrast Toggle | `viewerModal.getByRole('button', { name: /Toggle high contrast\|High Contrast/i })` | `e2e/exceptions-edge-cases.spec.ts:173`, `src/components/referrals/ECGViewerOverlay.tsx:72-83` |
| | Zoom In Button | `viewerModal.getByLabel('Zoom in')` | `e2e/exceptions-edge-cases.spec.ts:184`, `src/components/referrals/ECGViewerOverlay.tsx:100-104` |
| | Zoom Out Button | `viewerModal.getByLabel('Zoom out')` | `e2e/exceptions-edge-cases.spec.ts:185`, `src/components/referrals/ECGViewerOverlay.tsx:86-90` |
| | Reset View Button | `viewerModal.getByLabel('Reset view')` | `e2e/exceptions-edge-cases.spec.ts:186`, `src/components/referrals/ECGViewerOverlay.tsx:107-115` |
| | Zoom Percentage Readout | `viewerModal.getByText('100%')`, `150%`, `200%` | `e2e/exceptions-edge-cases.spec.ts:189-205`, `src/components/referrals/ECGViewerOverlay.tsx:93-95` |
| | Close Button | `viewerModal.getByLabel('Close ECG viewer')` | `e2e/exceptions-edge-cases.spec.ts:215`, `src/components/referrals/ECGViewerOverlay.tsx:118-123` |
| | Keyboard Escape Dismissal | `page.keyboard.press('Escape')` | `e2e/exceptions-edge-cases.spec.ts:208`, `src/components/referrals/ECGViewerOverlay.tsx:25-30` |

---

## 2. Logic Chain

### A. Referral Lifecycle Progression & State Gate Mapping
1. **Intake to Pending**: When referring clinician creates a referral, status is set to `'pending'`.
2. **Pending to Dept Approved / Postponed**:
   - Head of Department (`isTargetDeptHead`) or Admin (`isAdmin`) sees `#dept-review-section`.
   - Action dropdown provides: `direct_approval`, `urgent_approval`, `scheduled_approval`, `requirements_needed`, `no_role`.
   - If `direct_approval` / `urgent_approval` / `scheduled_approval` selected -> status transitions to `'dept_approved'`.
   - If `requirements_needed` selected -> status transitions directly to `'postponed'` and is flagged `isEscalated: true` with reason `'requirements_needed'`.
3. **Dept Approved to Manager Approved**:
   - Facility Manager (`isFacilityManager`) at receiving facility reviews case and clicks "Accept the Transfer".
   - Status transitions to `'manager_approved'`.
4. **Manager Approved to Accepted (Bed Allocated)**:
   - Receiving facility clinical staff (non-nurse) sees "Ready for Receive (Accepted)".
   - Clicking transitions status to `'accepted'`.
5. **Accepted to Patient Consented**:
   - Referring facility staff / clinician contacts patient and clicks "Accepted Transfer" under Patient Consent.
   - Status transitions to `'patient_consented'`.
6. **Patient Consented to In Transit**:
   - If `requiresAccompanyingDoctor === true`:
     - ER Room Official (`isErRoom`) sees `#escort-form-section` to enter doctor name and phone number.
     - "Dispatch Ambulance" button is disabled until accompanying doctor is saved.
   - Once escort is saved (or if escort not required):
     - Clinician or ER Official clicks "Dispatch Ambulance".
     - Status transitions to `'in_transit'`.
     - Timeline / Transfer Journey indicates "Currently in transit".
7. **In Transit to Arrived**:
   - Receiving hospital or ER Official sees "Mark as Arrived".
   - Clicking transitions status to `'arrived'`.
8. **Arrived to Admitted**:
   - Nurse at receiving hospital accesses `/bed-management` or Referral Detail to admit patient to bed.
   - Bed occupancy increments and referral status transitions to `'admitted'`.
   - Detail page displays "Patient Admitted Successfully".

### B. Exception Pathways & Modal State Machines
1. **Rejection Pathway**:
   - Triggerable at manager approval stage via "Reject Transfer" or by System Admin via direct actions.
   - Dialog with `aria-label="Reject Transfer"` and text "Reject Transfer" appears.
   - Confirm button `/Confirm Rejection/i` is disabled while `#rejectionReasonInput` is empty or whitespace-only.
   - Upon submitting non-empty reason, status becomes `'rejected'`, `rejectionReason` is recorded in Firestore, and rejection banner is displayed.
2. **Cancellation Pathway**:
   - Gated to: System Admin, senior staff at referring facility (`SENIOR_CANCEL_ROLES`), or referral creator (`referringUserId`).
   - Gated to pre-transit statuses only (`pending`, `dept_approved`, `manager_approved`, `accepted`, `patient_consented`, `postponed`). Locked once `in_transit`, `arrived`, `admitted`, `discharged`.
   - Inline card displays warning "This withdraws the referral and archives it".
   - Confirm button `/Confirm Cancellation/i` is disabled while `textarea[placeholder*="Reason for cancellation"]` is empty.
   - Upon submission, status becomes `'cancelled'`, `cancelReason` is recorded, and status badge displays reason.
3. **ECG Viewer Overlay State Machine**:
   - Triggered by clicking "Quick View" button on image attachments in Clinical Attachments.
   - Dialog opens with `role="dialog"` containing text "ECG Quick-Viewer".
   - Zoom scale starts at 100% (1.0x). Step size: 0.5x per click. Min: 50% (0.5x), Max: 500% (5.0x).
   - High contrast toggles `aria-pressed="true"` and `filter: contrast(1.6) brightness(0.9) grayscale(0.5)`.
   - Reset View restores scale to 100% and disables high contrast.
   - Dismissable via Escape key and Close button (`aria-label="Close ECG viewer"`).
   - Handles null/broken images gracefully with accessible `role="alert"` and Retry button without throwing unhandled exceptions.

---

## 3. Caveats

1. **VoiceTextarea Rendering**: `VoiceTextarea` renders an HTML `<textarea>` element with an overlaid speech-to-text mic icon. Playwright locators using `.locator('textarea')` or `getByPlaceholderText(...)` resolve directly to the native textarea. The component does not interfere with Playwright typing or filling.
2. **Mobile Stage Rail vs. Desktop Actions**: The mobile Stage Rail (`StageRail.tsx`) and mobile pinned footer are responsive additions. All exact DOM element IDs (`#dept-review-section`, `#escort-form-section`, `#rejectionReasonInput`) and desktop action buttons remain permanently in the DOM hierarchy regardless of viewport.
3. **Two-Pane Workspace Route**: At `lg+` viewports, the route `/referrals/:id` renders `ReferralWorkspacePane.tsx`, which embeds `ReferralDetailPage.tsx` in its right pane. All DOM selectors and E2E assertions remain identical.

---

## 4. Conclusion & Invariant Checklist

### Invariant Checklist for 100% Playwright E2E Pass:

- [x] **Department Review**: `#dept-review-section` contains `<select>` with `'direct_approval'`, `<textarea>`, and button `/Submit Review/i`.
- [x] **Manager Approval**: Button `/Accept the Transfer/i` advances status to `manager_approved`; button `/Ready for Receive/i` advances status to `accepted`.
- [x] **Patient Consent**: Button `/Accepted Transfer/i` advances status to `patient_consented`.
- [x] **Accompanying Doctor**: `#escort-form-section` contains `input[type="text"]`, `input[type="tel"]`, and button `/Save Accompanying Doctor/i`.
- [x] **Ambulance Dispatch**: Button `/Dispatch Ambulance/i` is disabled until escort is saved when required; advances status to `in_transit` with indicator `Currently in transit`.
- [x] **Patient Arrival**: Button `/Mark as Arrived/i` advances status to `arrived`.
- [x] **Patient Admission**: Status badge `Patient Admitted Successfully` is rendered when referral status is `admitted`.
- [x] **Rejection Modal**: Dialog with text "Reject Transfer", `#rejectionReasonInput`, and button `/Confirm Rejection/i` (disabled when empty).
- [x] **Cancellation Modal**: Section with text "This withdraws the referral and archives it", `textarea[placeholder*="Reason for cancellation"]`, and button `/Confirm Cancellation/i` (disabled when empty).
- [x] **ECG Quick-Viewer**: Dialog with text "ECG Quick-Viewer", button `/Toggle high contrast|High Contrast/i` with `aria-pressed`, buttons with `aria-label` "Zoom in", "Zoom out", "Reset view", "Close ECG viewer", zoom percentages `100%`, `150%`, `200%`, and Escape key listener.

---

## 5. Verification Method

To independently verify the contracts and components:

1. **TypeScript Typecheck**:
   ```bash
   npm run lint
   ```
   *Expected: Zero type errors (`tsc --noEmit` exits with 0).*

2. **Unit & Adversarial Tests**:
   ```bash
   npx vitest run src/pages/ReferralDetailPage.test.tsx src/pages/ReferralDetailPage.adversarial.test.tsx src/components/referrals/ECGViewerOverlay.test.tsx src/components/referrals/ECGViewerOverlay.adversarial.test.tsx src/pages/tier5-ui.adversarial.test.tsx
   ```
   *Expected: 100% pass across all test suites.*

3. **Playwright E2E Tests**:
   ```bash
   npm run test:e2e
   ```
   *Expected: All tests in `e2e/referral-lifecycle.spec.ts` and `e2e/exceptions-edge-cases.spec.ts` pass with 100% success.*
