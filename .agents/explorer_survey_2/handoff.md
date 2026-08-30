# Handoff Report — Explorer 2 (Survey Phase)

## 1. Observation

Direct observations from the codebase, configuration, and test suites:

- **14 Roles Defined:** `src/types/index.ts` lines 1–15 defines the union `Role` consisting of 14 string literals: `'owner' | 'system_admin' | 'medical_director' | 'hospital_manager' | 'deputy_manager' | 'head_of_department' | 'consultant' | 'specialist' | 'resident' | 'clinician' | 'nursing_supervisor' | 'nurse' | 'er_official' | 'er_room'`.
- **Doctor Checks in UI:** `src/components/layout/AppLayout.tsx` line 59 and `src/pages/NewReferralPage.tsx` line 162 define `isDoctor` as `['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role)`. Note that `'clinician'` is absent from this list.
- **Firestore Security Rules:** `firestore.rules` (528 lines) enforces database access controls:
  - `isVerifiedCaller()` requires `callerExists() && request.auth.token.email_verified == true && callerDoc().verified == true` (lines 36–40).
  - User document updates in `match /users/{userId}` (lines 107–109) only permit `isPrivileged()` (`owner`, `system_admin`) or self-updates where `privilegeFieldsUnchanged()`.
  - Referral updates in `match /referrals/{referralId}` (lines 430–444) enforce `referralIdentityPinned()`, `auditTrailAppendOnly()`, `validStatusTransition()`, `transitionActorAllowed()`, `candidateListNotWidened()`, `escalationClaimValid()`, `accompanyingDoctorSatisfied()`, `accompanyingDoctorWriteAuthorized()`, and `canCancelReferral()`.
- **Facility Isolation:** `isReferralParty(data)` in `firestore.rules` lines 164–170 restricts reads to callers whose `callerFacility()` matches `referringFacilityId`, `receivingFacilityId`, or is in `candidateFacilityIds` when `receivingFacilityId == 'auto'`.
- **UI User Verification Inconsistency:** `src/pages/FacilitySettingsPage.tsx` lines 41, 79–88 renders user verification and role modification controls for `hospital_manager`, `deputy_manager`, `medical_director`, and `head_of_department`, whereas `firestore.rules` rejects `/users/{userId}` updates unless caller is `owner` or `system_admin`.
- **Automated Test Suite Status:**
  - `npm run lint`: Passed with 0 errors (`tsc --noEmit`).
  - `npm test`: 26 test files passed (120 unit/integration tests).
  - `npm run test:rules`: 1 test file passed (89 security rule tests across emulator).

---

## 2. Logic Chain

1. **Role Access and UI Gating:**
   - Observations show that all 14 roles have specific responsibilities mapped across navigation, dashboards, and action panels.
   - However, the omission of `clinician` from `isDoctor` in `NewReferralPage.tsx` and `AppLayout.tsx` prevents users assigned the `clinician` role from accessing referral creation, despite being a valid role in TypeScript and test seed data.
2. **User Administration Rules vs. UI:**
   - In `FacilitySettingsPage.tsx`, local facility managers are presented with buttons to verify unverified accounts at their facility and set their roles.
   - In `firestore.rules`, `allow update: if isPrivileged() || (signedIn() && request.auth.uid == userId && privilegeFieldsUnchanged())`. Because `isPrivileged()` only includes `owner` and `system_admin`, any update initiated by a `hospital_manager` to another user's document fails on Firestore security rules.
   - In `DataContext.tsx`, this failure is caught and surfaced as a toast error (`writeFailed`), preventing local leadership from completing user onboarding.
3. **Cross-Facility Data Isolation:**
   - For `referrals`, `directAdmissions`, and `shiftLogs`, security rules strictly compare `callerFacility()` with document facility fields.
   - For queries, `DataContext.tsx` partitions referral subscriptions into three disjoint queries matching the security rule clauses, ensuring Firestore does not reject collection list queries for non-privileged staff.
4. **Referral Lifecycle Security:**
   - All state transitions follow a strictly checked state machine. Cancel locks prevent cancellation after `in_transit`. Patient consent is mandatory prior to dispatch. ER official escort doctor binding is enforced both client-side and server-side.

---

## 3. Caveats

- **Cloud Functions SLA Scheduler:** `functions/src/index.ts` contains `escalateBreachedReferrals` configured for scheduled execution. The codebase documentation notes that this scheduled Cloud Function requires the Blaze billing tier and is not currently deployed; the client-side 30s interval in `DataContext.tsx` currently acts as the operational fallback.
- **Middle-of-array Audit Modification:** While the opening element (index 0) and overall length growth of `statusHistory` are strictly verified by `auditTrailAppendOnly()`, intermediate history modifications cannot be deeply checked by Firestore rules due to rule language iteration limits. Moving history to a create-only subcollection is the recommended architectural solution.

---

## 4. Conclusion

The application demonstrates strong security architecture and robust cross-facility isolation in `firestore.rules`. The permission boundaries for clinical actions, capacity modifications, and referral lifecycle states are strictly implemented. 

The primary action items for upcoming test execution and implementation phases are:
1. Reconciling user verification permissions (either widening `firestore.rules` for local facility leadership on `/users/{userId}` or updating `FacilitySettingsPage.tsx` to reflect admin-only verification).
2. Including `clinician` in `isDoctor` checks if the `clinician` role is intended for active doctor personas.
3. Executing the end-to-end multi-role test matrix covering all 14 personas across referral creation, departmental review, managerial approval, bed allocation, consent/escort recording, ambulance dispatch, arrival, and admission.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify TypeScript Typecheck:**
   ```bash
   npm run lint
   ```
2. **Verify Vitest Unit & Integration Tests:**
   ```bash
   npm test
   ```
3. **Verify Firestore Security Rules Test Suite:**
   ```bash
   npm run test:rules
   ```
4. **Inspect Code Locations:**
   - Role definitions: `src/types/index.ts` (lines 1–15)
   - User update security rule: `firestore.rules` (lines 107–109)
   - Facility settings user verification: `src/pages/FacilitySettingsPage.tsx` (lines 41, 79–88)
   - Doctor role gating: `src/pages/NewReferralPage.tsx` (line 162), `src/components/layout/AppLayout.tsx` (line 59)
