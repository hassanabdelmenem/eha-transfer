# Handoff Report — Data Models, State Management & Business Logic

**Subagent ID**: `explorer_survey_data`  
**Parent Agent**: `parent` (`766bae12-bf7c-4a24-9eee-eec96c61abd0`)  
**Mission**: Data Layer, State Management, Firebase Integration, and Referral State Machine Survey  
**Date**: 2026-08-29  

---

## 1. Observation

1. **Firestore Schemas & Collections (`firestore.rules:1-528`, `src/types/index.ts:1-252`):**
   - Collections defined: `/users/{userId}`, `/facilities/{facilityId}`, `/referrals/{referralId}`, `/notifications/{notificationId}`, `/directAdmissions/{admissionId}`, `/shiftAssignments/{assignmentId}`, `/shiftLogs/{logId}`.
   - Core types in `src/types/index.ts`:
     - `Role`: 14 roles (`owner`, `system_admin`, `medical_director`, `hospital_manager`, `deputy_manager`, `head_of_department`, `consultant`, `specialist`, `resident`, `clinician`, `nursing_supervisor`, `nurse`, `er_official`, `er_room`).
     - `BedType`: 4 types (`ICU`, `CCU`, `PICU`, `Ward`).
     - `ReferralStatus`: 12 statuses (`pending`, `dept_approved`, `manager_approved`, `accepted`, `patient_consented`, `rejected`, `in_transit`, `arrived`, `admitted`, `discharged`, `postponed`, `cancelled`).
     - `ReferralPriority`: 3 priorities (`routine`, `urgent`, `emergency`).
   - Security constraints (`firestore.rules:430-444`):
     - `referralIdentityPinned()`: `referringFacilityId`, `referringUserId`, `patientId`, `createdAt`, `createdAtMs`, `requiresAccompanyingDoctor` cannot be edited.
     - `referralClinicalDataPinned()`: `patientData` and `requiredBedType` are locked to referring doctor and admin.
     - `accompanyingDoctorSatisfied()` (`firestore.rules:378-387`): Dispatch (`in_transit`) is rejected if `requiresAccompanyingDoctor == true` unless `accompanyingDoctor` is populated.
     - `canCancelReferral()` (`firestore.rules:182-189`): Blocked if in `CANCEL_LOCKED_STATUSES` (`in_transit`, `arrived`, `admitted`, `discharged`).

2. **State Management & Contexts (`src/contexts/AuthContext.tsx`, `src/contexts/DataContext.tsx`):**
   - `AuthContext.tsx:41-272`: Manages authentication state, idle timeout (15 min), Google/email login, and profile merging.
   - `DataContext.tsx:37-83`: Exposes 25+ mutation actions (`addReferral`, `updateReferralStatus`, `addDeptComment`, `recordPatientConsent`, `recordPatientDecline`, `cancelReferral`, `setAccompanyingDoctor`, `overrideReferralDestination`, `toggleReferralEscalation`, `addDirectAdmission`, `dischargeDirectAdmission`, `updateFacilityCapacity`, etc.).
   - Multi-query partitioned subscriptions (`DataContext.tsx:222-234`, `350-370`): Bounded queries on `referringFacilityId`, `receivingFacilityId`, and `candidateFacilityIds` array-contains, merged by ID.
   - Real-time SLA background sweep (`DataContext.tsx:1306-1352`): 30s timer checking `needsAutoEscalation()` and `capacityEscalationReason()`.

3. **Routing, SLA & Priority Logic (`src/lib/routing.ts`, `src/lib/sla.ts`, `src/lib/referralPriority.ts`, `src/lib/referralStage.ts`):**
   - `findCandidateFacilities` (`src/lib/routing.ts:64-77`): Matches facilities that have both required departments and `capacity[bedType].total > 0`.
   - `isSlaTracked` (`src/lib/sla.ts:44-50`): Strictly tracks `pending` status with `emergency`/`urgent` priority and `ICU`/`CCU`/`PICU` bed types (30 minutes).
   - `sortByWorkflow` (`src/lib/referralPriority.ts:15-26`): Orders cases by: `isEscalated` pinned top -> `emergency` -> `urgent` -> `routine` -> oldest first.
   - `STAGE_LABELS` (`src/lib/referralStage.ts:10`): `['Sent', 'Dept', 'Manager', 'Consent', 'Transit', 'Admitted']`.

4. **Existing Verification & Test Commands (`package.json:6-19`):**
   - `npm run lint` -> `tsc --noEmit` (passes with 0 errors).
   - `npm test` -> Vitest unit/integration tests.
   - `npm run test:e2e` -> Playwright full end-to-end tests with Auth/Firestore emulators.

---

## 2. Logic Chain

1. **State Machine & Rules Co-Dependency**: 
   - `firestore.rules` directly enforces the state transitions defined in `validStatusTransition()` (`firestore.rules:321-343`) and actor permissions in `transitionActorAllowed()` (`firestore.rules:360-371`).
   - Client-side code in `DataContext.tsx` and UI pages (`ReferralDetailPage.tsx`) must adhere strictly to these transitions; any UI shortcut that skips `patient_consented` before `in_transit` or bypasses `manager_approved` for standard workflows will fail at the database rule layer.

2. **Data Model Immutability Requirements**:
   - Fields such as `createdAtMs`, `referringFacilityId`, and `patientId` are cryptographically and logically verified by rules; UI components cannot omit them when updating documents.
   - `statusHistory` must only grow by 1 item per update and preserve the original creation entry.

3. **Preservation of Core Action Contracts for UI Redesign**:
   - The UI redesign has full creative freedom to overhaul layouts, merge screens into single-pane or two-pane workspaces, and upgrade components, provided that all user interactions dispatch the existing methods in `DataContext` (`updateReferralStatus`, `addDeptComment`, `recordPatientConsent`, `recordPatientDecline`, `cancelReferral`, `setAccompanyingDoctor`, `addReferral`).

---

## 3. Caveats

1. **Cloud Function Scheduling**: The scheduled Cloud Function `escalateBreachedReferrals` in `functions/src/index.ts` requires the Blaze plan and is not run in standard client builds; client-side interval sweep in `DataContext.tsx` acts as the primary runtime evaluator during active sessions.
2. **Offline IndexedDB Storage**: Offline storage in `src/lib/db.ts` (`referral-store`) caches submitted offline referrals until reconnection, whereas in-progress form drafts are stored in `localStorage['newReferralDraft']`.
3. No other uninvestigated areas remain in the data or business logic layer.

---

## 4. Conclusion

The data layer and business logic architecture is robust, fully typed, and strictly enforced by Firestore security rules. The complete referral state machine, 14-role permission taxonomy, auto-routing algorithm, 30-minute SLA engine, capacity management, and data mutations have been mapped in detail in `analysis.md`. The UI redesign can safely proceed by restyling and restructuring presentation components while keeping the `DataContext` actions, `AuthContext` user model, and core action contracts intact.

---

## 5. Verification Method

To independently verify the data layer, schemas, and state logic:

1. **Type Checking:**
   ```bash
   npm run lint
   ```
   *Expected output:* Exits with code 0 (zero TypeScript errors).

2. **Inspect Comprehensive Survey Report:**
   ```bash
   cat /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_survey_data/analysis.md
   ```

3. **Validation of Rules & Data Context Integration:**
   Inspect `src/contexts/DataContext.tsx`, `src/types/index.ts`, `firestore.rules`, and `src/lib/routing.ts`.
