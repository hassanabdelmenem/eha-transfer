# Handoff Report: Milestone 1 — `clinician` Role Alignment

**Agent**: Explorer M1.2  
**Working Directory**: `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m1_2`  
**Date**: 2026-08-22  
**Handoff Type**: Hard (Investigation Complete)  

---

## 1. Observation

Direct code inspections and grep searches revealed the following concrete locations where doctor role checks exclude `'clinician'`:

1. **`src/types/index.ts:1–15`**:
   `Role` union includes `'clinician'`:
   ```typescript
   export type Role =
     | 'owner'
     | 'system_admin'
     | 'medical_director'
     | 'hospital_manager'
     | 'deputy_manager'
     | 'head_of_department'
     | 'consultant'
     | 'specialist'
     | 'resident'
     | 'clinician'
     | 'nursing_supervisor'
     | 'nurse'
     | 'er_official'
     | 'er_room';
   ```

2. **`src/components/layout/AppLayout.tsx:59`**:
   ```typescript
   const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);
   ```
   - Used on line 61: `const generatesShiftLog = !!user.facilityId && (isDoctor || isNurse);`
   - Used on line 344 (Desktop Nav): `{isDoctor && (<Link to="/referrals/new" ...>New Referral</Link>)}`
   - Used on line 408 (Mobile Nav): `{isDoctor && (<Link to="/referrals/new" ...>New</Link>)}`

3. **`src/pages/NewReferralPage.tsx:162–169`**:
   ```typescript
   const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);
   if (!isDoctor) {
     return (
       <div className="p-8 text-center text-slate-500 dark:text-slate-400">
         Access Denied. Only doctors can create new referrals.
       </div>
     );
   }
   ```

4. **`src/pages/Dashboard.tsx:208, 398–405, 618`**:
   - Line 208:
     ```typescript
     const canCreateReferral = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);
     ```
   - Line 398: `{canCreateReferral && (<button onClick={() => navigate('/referrals/new')} ...>New referral</button>)}`
   - Line 618:
     ```typescript
     {(user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'consultant' || user.role === 'specialist' || user.role === 'resident' || user.role === 'head_of_department' || user.role === 'owner') && recentShiftLogs.length > 0 && (
     ```

5. **`src/pages/FacilitySettingsPage.tsx:486–507, 510`**:
   - Lines 486–507: Dropdown `<select>` for assigning user roles omits `<option value="clinician">Clinician</option>`.
   - Line 510:
     ```typescript
     {['consultant', 'specialist', 'resident', 'head_of_department', 'nurse', 'nursing_supervisor'].includes(u.role) ? (
     ```

6. **`src/pages/Onboarding.tsx:104–115, 139`**:
   - Lines 104–115: Requested role dropdown `<select id="onboardRole">` omits `<option value="clinician">Clinician</option>`.
   - Line 139:
     ```typescript
     {(role === 'consultant' || role === 'specialist' || role === 'resident' || role === 'head_of_department' || role === 'nurse' || role === 'nursing_supervisor') && selectedFacility && (
     ```

7. **`src/pages/NetworkDirectoryPage.tsx:70, 75, 81, 111`**:
   - Lines 70, 75, 81:
     ```typescript
     ['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department', 'consultant', 'specialist', 'resident'].includes(u.role)
     ```
   - Line 111:
     ```typescript
     if (['consultant', 'specialist', 'resident'].includes(u.role)) {
     ```

8. **`src/contexts/DataContext.tsx:430, 791, 1080, 1143`**:
   - Line 430:
     ```typescript
     if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role))
     ```
   - Lines 791, 1080, 1143:
     ```typescript
     targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']
     ```

9. **`src/lib/notifications.ts:20`**:
   ```typescript
   if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role))
   ```

10. **`src/lib/mock-data.ts:87`**:
    ```typescript
    { id: 'u2', name: 'Clinician (seed)', email: 'clinician@example.invalid', role: 'clinician', facilityId: 'f4', department: 'Emergency' },
    ```
    Confirms `clinician` is an active doctor seed role assigned to primary care unit `f4`.

---

## 2. Logic Chain

1. **Step 1 (Domain Role Definition)**: `src/types/index.ts` defines `clinician` as one of the 14 core system roles. In `src/lib/mock-data.ts:87`, `u2` is configured as a primary care doctor with role `clinician` at Fayed Primary Care Unit (`f4`).
2. **Step 2 (Database Permissions)**: Firestore rules (`firestore.rules:419–428`) grant referral creation permissions to any verified caller at the referring facility regardless of whether their role is `resident`, `consultant`, or `clinician`.
3. **Step 3 (Client-side UI Blockage)**: Despite database rules and type definitions supporting `clinician`, `src/pages/NewReferralPage.tsx:162–169` hardcoded `isDoctor` without `'clinician'`, rendering an "Access Denied" view whenever a user with `user.role === 'clinician'` opens the intake page.
4. **Step 4 (Navigation and Entry Point Invisibility)**: `src/components/layout/AppLayout.tsx:59` and `src/pages/Dashboard.tsx:208` omitted `'clinician'` from `isDoctor` and `canCreateReferral`, causing the "New Referral" links in sidebar nav, bottom mobile nav, and dashboard action bar to disappear for clinicians.
5. **Step 5 (Administrative & Directory Isolation)**: Because `Onboarding.tsx`, `FacilitySettingsPage.tsx`, and `NetworkDirectoryPage.tsx` failed to include `'clinician'` in their respective role options and filter predicates, clinician accounts cannot be selected during self-onboarding or manager role administration, and are excluded from facility rosters.
6. **Step 6 (Notification Disconnect)**: `DataContext.tsx` and `notifications.ts` omitted `'clinician'` from `targetRoles` broadcast arrays (`['consultant', 'specialist', 'resident', 'medical_director', 'er_official']`), so clinicians at referring facilities do not receive critical push notifications when a referral status is updated, re-routed, or cancelled.

---

## 3. Caveats

- **Department Delegation**: In `DepartmentPage.tsx:118`, `availableDoctors` is restricted to `['consultant', 'specialist']`. In large tertiary hospitals, department shift delegation is typically reserved for senior clinicians (`specialist` / `consultant`). However, in smaller primary care units or emergency departments where only `clinician` or `resident` staff exist, allowing assignment of `clinician` or `resident` can be considered based on facility type.
- **Cancellation Authority**: Clinicians can always cancel referrals they created (`isReferralCreator = user.id === referral.referringUserId`), but cannot cancel other staff members' referrals unless they have a senior managerial role (`SENIOR_CANCEL_ROLES`), which is intended security behavior.

---

## 4. Conclusion

The omission of `'clinician'` from doctor role lists across the frontend was an oversight of inline array literals (`isDoctor`, `canCreateReferral`, `targetRoles`, `isUserAllowed`).

To fix this reliably and permanently:
1. Define central canonical constants in `src/types/index.ts`:
   - `DOCTOR_ROLES = ['consultant', 'specialist', 'resident', 'clinician', 'head_of_department', 'medical_director', 'owner'] as const`
   - `CLINICAL_PRACTITIONER_ROLES = ['consultant', 'specialist', 'resident', 'clinician'] as const`
   - `CLINICAL_BROADCAST_ROLES = ['consultant', 'specialist', 'resident', 'clinician', 'medical_director', 'er_official'] as const`
   - `isDoctorRole(role?: Role): boolean`
2. Update `AppLayout.tsx`, `NewReferralPage.tsx`, `Dashboard.tsx`, `FacilitySettingsPage.tsx`, `Onboarding.tsx`, `NetworkDirectoryPage.tsx`, `DataContext.tsx`, and `notifications.ts` to reference these canonical definitions.
3. Verify that a user logged in with `role: 'clinician'` can navigate to `/referrals/new`, see the new referral buttons across UI viewports, create and submit a referral, and receive notifications.

---

## 5. Verification Method

To independently verify the findings:

1. **Verify Role Exclusions via Code Inspection**:
   - `grep -n "isDoctor" src/components/layout/AppLayout.tsx src/pages/NewReferralPage.tsx`
   - `grep -n "canCreateReferral" src/pages/Dashboard.tsx`
   - `grep -n "onboardRole" src/pages/Onboarding.tsx`
   - `grep -n "targetRoles" src/contexts/DataContext.tsx`

2. **Verify Typecheck and Unit Tests**:
   - Run `npm run lint` (runs `tsc --noEmit`).
   - Run `npm test -- --run` (executes all Vitest unit tests).

3. **Verify Post-Fix Runtime Behavior**:
   - Sign in as `u2` (`clinician@example.invalid`, `role: 'clinician'`) or an account with `role: 'clinician'`.
   - Navigate to `/referrals/new` -> Ensure the form renders cleanly without "Access Denied".
   - Verify that "New Referral" link is visible in sidebar (`AppLayout.tsx`) and floating CTA in `Dashboard.tsx`.
   - In `FacilitySettingsPage.tsx` -> Confirm "Clinician" is selectable in the role dropdown.
   - In `NetworkDirectoryPage.tsx` -> Confirm clinician profiles are visible under hospital directory.
