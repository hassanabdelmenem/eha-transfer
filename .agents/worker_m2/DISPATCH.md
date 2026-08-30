## 2026-08-28T22:07:49Z
Scope of Work for Milestone 2:
1. Modernize and refactor `src/pages/NewReferralPage.tsx` and extract clean modular wizard components:
   - Replace the legacy 1086-line dual form (separate mobile-only wizard vs desktop-only form) with a single, responsive, modern 4-step wizard that adapts gracefully to both mobile and desktop screens.
   - Step 1: Destination & Priority (Target facility selection, bed type, priority selector with emergency pulse indicator, escort doctor requirement toggle).
   - Step 2: Patient Identification & Demographics (Hospital ID, Name, Age, Gender, National ID, Phone).
   - Step 3: Clinical Vitals & Presentation (HR, BP, SpO2, Temp, RR, GCS with real-time normal/warning ranges, Chief Complaint, Presentation, Diagnosis, Investigations).
   - Step 4: Diagnostics & Review (File attachment dropzone, ECG preview with quick view thumbnail, summary review card, offline draft notification, submit button).
2. CRITICAL DOM Invariants & Playwright Test Contracts (MUST preserve exact IDs and button names):
   - `#receivingFacility`, `#requiredBedType`, `#priority`, `#reasonForReferral`, `#requires-accompanying-doctor`
   - `#hospitalId`, `#patientName`, `#patientAge`, `#patientGender`
   - `#vitalHr`, `#vitalBp`, `#vitalSpo2`, `#vitalTemp`, `#vitalRr`, `#vitalGcs`
   - `#complaint`, `#presentation`, `#diagnosis`, `#investigations`
   - `input[type="file"]` (with image preview `img[alt="..."]` when an image is attached)
   - Submit button accessible text `/Submit Referral/i`
3. Clinical & Business Logic Invariants:
   - Draft auto-save in `localStorage['newReferralDraft']` with draft restore banner.
   - Full integration with `addReferral` in `DataContext.tsx`.
   - Voice-to-text capability on textareas with clean fallback.
4. Verification Requirements:
   - Run `npm run lint` (`tsc --noEmit`) and verify 0 errors.
   - Run `npm test` and verify all unit tests pass (add/update tests for the wizard if needed).
5. Output:
   - Write your implementation report to `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m2/handoff.md`.
   - Send a message back to parent when complete.

## 2026-08-28T22:20:23Z
**Context**: Milestone 2: Unified Referral Intake Wizard
**Content**: Checking in on status. How is progress on the NewReferralPage refactor and wizard step extraction?
**Action**: Please provide a brief status update on current implementation and verification.
