# Analysis Report: Role Alignment & Inclusion for `clinician`

**Milestone 1 — Core Exception & Alignment Hardening**  
**Explorer M1.2 Investigation Report**  
**Date**: 2026-08-22  

---

## 1. Executive Summary

In Ismailia Health Connect (`eha-transfer`), 14 distinct roles are defined in `src/types/index.ts`:
`'owner' | 'system_admin' | 'medical_director' | 'hospital_manager' | 'deputy_manager' | 'head_of_department' | 'consultant' | 'specialist' | 'resident' | 'clinician' | 'nursing_supervisor' | 'nurse' | 'er_official' | 'er_room'`.

The role `'clinician'` represents primary care physicians and frontline general clinical practitioners (such as those at primary care units like Fayed and Abu Suwir, or outpatient clinics). While Firestore security rules (`firestore.rules`) and seed data (`src/lib/mock-data.ts:87`, `u2` at `f4` Fayed Primary Care Unit) already permit verified clinicians to create and manage referrals, several frontend UI components, navigation bars, page-level access guards, notification fan-outs, and administrative selectors have omitted `'clinician'` from doctor role checks (e.g., `['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner']`).

This omission causes severe workflow blockage for clinicians:
1. Clinicians are greeted with **"Access Denied. Only doctors can create new referrals"** when attempting to open `/referrals/new`.
2. Navigation links to "New Referral" are invisible on both desktop sidebar and mobile navigation.
3. The dashboard CTA button for creating referrals is hidden.
4. Clinicians cannot be assigned the role in Onboarding or Facility Settings dropdowns.
5. Clinicians are omitted from the Network / Hospital directory.
6. Clinicians miss facility-wide clinical notification broadcasts (status changes, cancellations, and patient decline re-routes).

---

## 2. Complete Inventory of Discrepancies and Gap Analysis

The following table summarizes all identified files, line numbers, exact code snippets, and failure modes across the codebase:

| # | File Path | Line(s) | Current Code Snippet | Defect & Impact |
|---|---|---|---|---|
| **1** | `src/components/layout/AppLayout.tsx` | 59 | `const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);` | Missing `'clinician'`. Clinicians cannot see "New Referral" in Desktop Sidebar (line 344) or Mobile Nav (line 408). Also prevents `generatesShiftLog` (line 61) from triggering shift handover calculations. |
| **2** | `src/pages/NewReferralPage.tsx` | 162–169 | `const isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);`<br>`if (!isDoctor) { return (<div ...>Access Denied. Only doctors can create new referrals.</div>); }` | Missing `'clinician'`. Directly hard-blocks any user with the `clinician` role from accessing or submitting the referral intake form. |
| **3** | `src/pages/Dashboard.tsx` | 208 | `const canCreateReferral = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role);` | Missing `'clinician'`. Hides the primary "New referral" bottom action button (lines 398–405) on the clinician mobile dashboard. |
| **4** | `src/pages/Dashboard.tsx` | 618 | `{(user.role === 'nurse' \|\| user.role === 'nursing_supervisor' \|\| user.role === 'consultant' \|\| user.role === 'specialist' \|\| user.role === 'resident' \|\| user.role === 'head_of_department' \|\| user.role === 'owner') && recentShiftLogs.length > 0 && (` | Missing `user.role === 'clinician'`. Hides the "Recent Shift Logs (Handover)" card for active clinicians. |
| **5** | `src/pages/FacilitySettingsPage.tsx` | 486–507 | `<select ... value={u.role}>`<br>`  <option value="consultant">Consultant</option>`<br>`  <option value="specialist">Specialist</option>`<br>`  <option value="resident">Resident</option>`<br>`  <option value="nurse">Nurse</option>`<br>`  <option value="nursing_supervisor">Nursing Supervisor</option>`<br>`  <option value="er_official">ER Room Official</option>`... | Missing `<option value="clinician">Clinician</option>`. Facility managers and system administrators cannot assign or reclassify users into the `clinician` role. |
| **6** | `src/pages/FacilitySettingsPage.tsx` | 510 | `{['consultant', 'specialist', 'resident', 'head_of_department', 'nurse', 'nursing_supervisor'].includes(u.role) ? (` | Missing `'clinician'`. Department selection dropdown is replaced with "N/A" for clinicians in user management. |
| **7** | `src/pages/Onboarding.tsx` | 104–115 | `<select id="onboardRole" ...>`<br>`  <option value="hospital_manager">Hospital Manager</option>`<br>`  <option value="medical_director">Medical Director</option>`<br>`  <option value="deputy_manager">Deputy Manager</option>`<br>`  <option value="head_of_department">Head of Department</option>`<br>`  <option value="consultant">Consultant</option>`<br>`  <option value="specialist">Specialist</option>`<br>`  <option value="resident">Resident</option>`<br>`  <option value="nursing_supervisor">Nursing Supervisor</option>`<br>`  <option value="nurse">Nurse</option>`<br>`  <option value="er_official">ER Room Official</option>` | Missing `<option value="clinician">Clinician</option>`. New medical staff completing profile self-registration cannot request the `clinician` role. |
| **8** | `src/pages/Onboarding.tsx` | 139 | `{(role === 'consultant' \|\| role === 'specialist' \|\| role === 'resident' \|\| role === 'head_of_department' \|\| role === 'nurse' \|\| role === 'nursing_supervisor') && selectedFacility && (` | Missing `role === 'clinician'`. Clinicians registering cannot select their clinical department. |
| **9** | `src/pages/NetworkDirectoryPage.tsx` | 70, 75, 81 | `['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department', 'consultant', 'specialist', 'resident'].includes(u.role)` | Missing `'clinician'`. Staff with `clinician` role are excluded from `isUserAllowed`, making them invisible in hospital and network directories. |
| **10** | `src/pages/NetworkDirectoryPage.tsx` | 111 | `if (['consultant', 'specialist', 'resident'].includes(u.role)) {` | Missing `'clinician'`. Clinicians with active shift assignments are excluded from the "On call right now" quick directory. |
| **11** | `src/contexts/DataContext.tsx` | 430 | `if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role))` | Missing `'clinician'`. Notification delegation logic skips clinicians assigned to department head shifts. |
| **12** | `src/contexts/DataContext.tsx` | 791, 1080, 1143 | `targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']` | Missing `'clinician'`. Broadcast notifications for status updates (line 791), patient decline re-routes (line 1080), and referral cancellations (line 1143) miss facility clinicians. |
| **13** | `src/lib/notifications.ts` | 20 | `if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role))` | Missing `'clinician'`. Standalone notification compiler skips clinicians assigned to department head shifts. |
| **14** | `src/pages/DepartmentPage.tsx` | 118 | `['consultant', 'specialist'].includes(u.role)` | Checks available doctors for shift delegation. In primary care and emergency departments, clinicians and residents also provide clinical coverage. |
| **15** | `e2e/seed.ts` & `e2e/.auth_state.json` | 60 | `role: str('consultant')` | Note: E2E Clinician test account was seeded as `'consultant'` to bypass the UI gate. With role alignment in place, seed can properly reflect `clinician` or test both. |

---

## 3. Detailed Component Analysis

### 3.1 `src/components/layout/AppLayout.tsx`
In `AppLayout.tsx`:
- Line 59 defines `isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role)`.
- Line 61 uses `generatesShiftLog = !!user.facilityId && (isDoctor || isNurse)`.
- Lines 344–356 render the desktop sidebar "New Referral" link:
  ```tsx
  {isDoctor && (
    <Link to="/referrals/new" ...>
      <PlusCircle className="w-5 h-5" />
      <span className="text-sm font-bold uppercase">New Referral</span>
    </Link>
  )}
  ```
- Lines 408–418 render the mobile navigation bar "New" link:
  ```tsx
  {isDoctor && (
    <Link to="/referrals/new" ...>
      <PlusCircle className="h-6 w-6 mb-1" />
      New
    </Link>
  )}
  ```
**Fix:** Add `'clinician'` to `isDoctor` or use a shared `isDoctorRole(user.role)` helper.

---

### 3.2 `src/pages/NewReferralPage.tsx`
In `NewReferralPage.tsx`:
- Line 162 defines `isDoctor = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role)`.
- Lines 163–169 enforce:
  ```tsx
  if (!isDoctor) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Access Denied. Only doctors can create new referrals.
      </div>
    );
  }
  ```
**Fix:** Add `'clinician'` to the `isDoctor` check.

---

### 3.3 `src/pages/Dashboard.tsx`
In `Dashboard.tsx`:
- Line 208 defines `canCreateReferral = ['consultant', 'specialist', 'resident', 'head_of_department', 'medical_director', 'owner'].includes(user.role)`.
- Lines 398–405 render the floating bottom action bar:
  ```tsx
  {canCreateReferral && (
    <button onClick={() => navigate('/referrals/new')} ...>
      <Plus className="w-4 h-4" /> New referral
    </button>
  )}
  ```
- Line 618 checks:
  ```tsx
  {(user.role === 'nurse' || user.role === 'nursing_supervisor' || user.role === 'consultant' || user.role === 'specialist' || user.role === 'resident' || user.role === 'head_of_department' || user.role === 'owner') && recentShiftLogs.length > 0 && (
  ```
**Fix:** Include `'clinician'` in `canCreateReferral` and in line 618.

---

### 3.4 `src/pages/FacilitySettingsPage.tsx`
In `FacilitySettingsPage.tsx`:
- Lines 486–507 render the `<select>` for assigning user roles. Currently, options are: `consultant`, `specialist`, `resident`, `nurse`, `nursing_supervisor`, `er_official`, `head_of_department`, `hospital_manager`, `deputy_manager`, `medical_director`, `system_admin`, `owner`. The value `clinician` is missing.
- Line 510 checks if the user is eligible for department assignment:
  `['consultant', 'specialist', 'resident', 'head_of_department', 'nurse', 'nursing_supervisor'].includes(u.role)`.
**Fix:** Add `<option value="clinician">Clinician</option>` and include `'clinician'` in the department selector check.

---

### 3.5 `src/pages/Onboarding.tsx`
In `Onboarding.tsx`:
- Lines 104–115 render the requested role dropdown during user onboarding.
- Line 139 checks whether to display the department dropdown:
  `{(role === 'consultant' || role === 'specialist' || role === 'resident' || role === 'head_of_department' || role === 'nurse' || role === 'nursing_supervisor') && selectedFacility && (`
**Fix:** Add `<option value="clinician">Clinician</option>` to the role dropdown and `role === 'clinician'` to the department conditional render.

---

### 3.6 `src/pages/NetworkDirectoryPage.tsx`
In `NetworkDirectoryPage.tsx`:
- `isUserAllowed` (lines 70, 75, 81) determines whether a user is displayed in the directory. Currently checks:
  `['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department', 'consultant', 'specialist', 'resident'].includes(u.role)`.
- `onCallNow` (line 111) filters staff on call:
  `if (['consultant', 'specialist', 'resident'].includes(u.role))`
**Fix:** Add `'clinician'` to both role lists so clinicians are visible in the directory and on-call filters.

---

### 3.7 `src/contexts/DataContext.tsx` & `src/lib/notifications.ts`
In `DataContext.tsx`:
- Line 430 and `notifications.ts` line 20 check:
  `if (params.targetRoles?.includes('head_of_department') && ['consultant', 'specialist', 'resident'].includes(u.role))`
- Lines 791, 1080, 1143 define broadcast recipient roles:
  `targetRoles: ['consultant', 'specialist', 'resident', 'medical_director', 'er_official']`
**Fix:** Add `'clinician'` to both delegated checks and `targetRoles` lists.

---

## 4. Recommended Fix Strategy & Architecture

### Step 1: Centralize Role Helper Constants in `src/types/index.ts`
To avoid copy-paste array drift across multiple files, declare standard role grouping constants and type guards in `src/types/index.ts`:

```typescript
// src/types/index.ts

export const DOCTOR_ROLES: readonly Role[] = [
  'consultant',
  'specialist',
  'resident',
  'clinician',
  'head_of_department',
  'medical_director',
  'owner',
] as const;

export const CLINICAL_PRACTITIONER_ROLES: readonly Role[] = [
  'consultant',
  'specialist',
  'resident',
  'clinician',
] as const;

export const CLINICAL_BROADCAST_ROLES: readonly Role[] = [
  'consultant',
  'specialist',
  'resident',
  'clinician',
  'medical_director',
  'er_official',
] as const;

export const isDoctorRole = (role?: Role | null): boolean =>
  !!role && (DOCTOR_ROLES as readonly string[]).includes(role);
```

### Step 2: Refactor All Components to Use Canonical Role Groupings
1. **`AppLayout.tsx`**:
   `const isDoctor = isDoctorRole(user.role);`
2. **`NewReferralPage.tsx`**:
   `const isDoctor = isDoctorRole(user.role);`
3. **`Dashboard.tsx`**:
   `const canCreateReferral = isDoctorRole(user.role);`
   Line 618: `(isDoctorRole(user.role) || isNurseRole(user.role)) && recentShiftLogs.length > 0`
4. **`Onboarding.tsx` & `FacilitySettingsPage.tsx`**:
   Add `<option value="clinician">Clinician</option>` and add `'clinician'` to department eligibility.
5. **`NetworkDirectoryPage.tsx`**:
   Include `'clinician'` in `isUserAllowed` and `onCallNow`.
6. **`DataContext.tsx` & `notifications.ts`**:
   Use `CLINICAL_PRACTITIONER_ROLES` for delegated check and `CLINICAL_BROADCAST_ROLES` for broadcast targets.

---

## 5. Verification Plan

1. **TypeScript Typecheck**:
   Run `npm run lint` (`tsc --noEmit`) to verify 0 type errors.
2. **Unit Tests**:
   - Add unit tests in `src/contexts/AuthContext.test.tsx` and `src/lib/notifications.test.ts` verifying that `clinician` role satisfies `isDoctorRole`, creates notifications correctly, and is processed by role utilities.
   - Run `npm test`.
3. **Firestore Security Rules**:
   Run `npm run test:rules` to confirm that Firestore rules continue to authorize verified clinician referral creation and status transitions.
4. **Playwright E2E**:
   Run `npm run test:e2e` with a user whose role is explicitly `'clinician'`.
