# Milestone 3 Review & Adversarial Challenge Report: Clinical Cockpits & Role Dashboards

**Reviewer**: Reviewer 1 (`reviewer_m3_1`)  
**Roles**: reviewer, critic  
**Working Directory**: `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/reviewer_m3_1`  
**Date**: 2026-08-29  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Command Execution Output

#### A. `npm run lint` (`tsc --noEmit`)
```text
> eha-transfer@0.0.0 lint
> tsc --noEmit

Exit code: 0 (No type errors)
```

#### B. `npm test` (Vitest Unit & Integration Test Suite)
```text
> eha-transfer@0.0.0 test
> vitest run

 Test Files  52 passed (52)
      Tests  520 passed (520)
   Start at  08:09:50
   Duration  42.54s (transform 12.64s, setup 17.00s, import 71.75s, tests 82.69s, environment 103.21s)

Exit code: 0
```

#### C. `npm run build` (Vite Production Build)
```text
> eha-transfer@0.0.0 build
> vite build

vite v8.2.1 building client environment for production...
transforming...✓ 3248 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                  0.92 kB │ gzip:   0.45 kB
dist/assets/index-BfbS0CTN.css                 122.67 kB │ gzip:  18.49 kB
dist/assets/ERCockpit-BRJlWqdy.js                5.06 kB │ gzip:   1.73 kB
dist/assets/HodCockpit-BhK_N8AR.js              19.38 kB │ gzip:   5.39 kB
dist/assets/ReferralCockpitCard-3O_x45gP.js     12.70 kB │ gzip:   2.61 kB
dist/assets/Dashboard-BSCxdDbk.js              421.97 kB │ gzip: 118.65 kB
✓ built in 875ms

Exit code: 0
```

#### D. `npm run test:rules` (Firestore Emulator Rules Suite)
```text
> eha-transfer@0.0.0 test:rules
> firebase emulators:exec --only firestore --project eha-transfer-rules-test "vitest run --config vitest.rules.config.ts"

Error: Process `java -version` has exited with code 1. Please make sure Java is installed and on your system PATH.
The operation couldn’t be completed. Unable to locate a Java Runtime.
```

---

### 1.2 Direct Source Code Observations

#### Observation 1: React Hook Rule Violations (Hooks called after conditional early returns)

1. **`src/components/dashboard/ClinicianCockpit.tsx`**:
   - Lines 16–21 call top-level hooks: `useAuth()`, `useData()`, `useNavigate()`, `useState('you')`, `useState(null)`.
   - **Line 23**: Early conditional return:
     ```tsx
     23:   if (!user) return null;
     ```
   - **Lines 35–85**: Five `useMemo` hooks are called **after** the early return:
     ```tsx
     35:   const myReferrals = useMemo(() => referrals.filter(r => r.referringUserId === user.id), [referrals, user.id]);
     40:   const youBucket = useMemo(() => sortByWorkflow(...), [myReferrals]);
     54:   const themBucket = useMemo(() => sortByWorkflow(...), [myReferrals]);
     64:   const movingBucket = useMemo(() => sortByWorkflow(...), [myReferrals]);
     72:   const inboundBucket = useMemo(() => sortByWorkflow(...), [referrals, user.facilityId, user.department]);
     ```
   - **Result**: When `user` is null, 5 hooks execute. When `user` is present, 10 hooks execute. This breaks React's fundamental invariant that hook order and count must remain constant between renders.

2. **`src/components/dashboard/ManagerCockpit.tsx`**:
   - Lines 18–30 call `useAuth()`, `useData()`, `useNavigate()`, `useState(null)`, `useState(null)`.
   - **Line 32**: Early conditional return:
     ```tsx
     32:   if (!user) return null;
     ```
   - **Lines 45–65**: Two `useMemo` hooks are called **after** the early return:
     ```tsx
     45:   const managerEscalations = useMemo(() => sortByWorkflow(...), [facilityReferrals]);
     57:   const managerQueue = useMemo(() => sortByWorkflow(...), [facilityReferrals, user.facilityId]);
     ```
   - **Result**: Hook count dynamically shifts depending on `user` nullability.

3. **`src/components/dashboard/ERCockpit.tsx`**:
   - Lines 11–12 call `useAuth()`, `useData()`.
   - **Line 14**: Early conditional return:
     ```tsx
     14:   if (!user) return null;
     ```
   - **Lines 42–43**: Two `useMemo` hooks are called **after** the early return:
     ```tsx
     42:   const outboundQueue = useMemo(() => sortByWorkflow(awaitingTransport), [awaitingTransport]);
     43:   const inboundQueue = useMemo(() => sortByWorkflow(inboundArriving), [inboundArriving]);
     ```
   - **Result**: Hook count dynamically shifts depending on `user` nullability.

---

### 1.3 Positive Observations & Best Practices

1. **DOM Invariant Preservation**:
   - `src/pages/Dashboard.tsx:77-82` renders `<h1 id="dashboard-overview-heading">Overview</h1>` ensuring strict compliance with `page.getByRole('heading', { name: /overview/i })` required by Playwright test suites (`e2e/navigation.spec.ts:27`).
   - `src/components/dashboard/ReferralCockpitCard.tsx` preserves all action and role selectors (`/Direct Approve/i`, `/Accept/i`, `/Dispatch ambulance/i`, `/Confirm arrival/i`, `/Admit to .* bed/i`, `#escort-form-section`).
2. **Component Modularity & Cleanliness**:
   - Monolithic `Dashboard.tsx` reduced from 780 lines to 136 lines acting as a role coordinator.
   - Six dedicated cockpits (`ClinicianCockpit`, `HodCockpit`, `ManagerCockpit`, `ERCockpit`, `NurseCockpit`, `AdminCockpit`) cleanly encapsulated in `src/components/dashboard/`.
   - `FacilityAnalyticsCharts.tsx` cleanly encapsulates Recharts with light/dark theme support and time aggregations.
3. **Accessibility**:
   - Minimum 48px touch targets implemented across all buttons and inputs (`min-h-[48px]`, `min-h-[50px]`, `h-[48px] w-[48px]`).
   - Appropriate ARIA semantics used: `role="status"` on loading skeletons, `role="region" aria-label="Critical Escalation Alert" aria-live="polite"` on alert banners, `role="dialog" aria-modal="true"` on modals.
4. **Debounced Capacity Updates**:
   - `NurseCockpit.tsx` properly debounces Firestore capacity updates by 500ms and cleans up timers in `useEffect` on unmount.
5. **Anti-facade & Integrity Audit**:
   - Zero hardcoded facade test mocks or shortcut bypasses detected in source code. All cockpits invoke real `DataContext` methods (`addDeptComment`, `updateReferralStatus`, `assignShift`, `quickTransfer`, `updateFacilityCapacity`, `setAccompanyingDoctor`, `overrideReferralDestination`, `toggleReferralEscalation`).

---

## 2. Logic Chain

1. **Requirement Check**: The dispatch instruction explicitly specifies:
   > "React Hook compliance: verify that hooks are called unconditionally at the top level of each cockpit component without conditional branching inside hook calls."
2. **React Specification**: The official React Rules of Hooks state:
   > "Don't call Hooks inside loops, conditions, or nested functions. Instead, always use Hooks at the top level of your React function, before any early returns."
3. **Observed Failure Mode**:
   - In `ClinicianCockpit.tsx`, `ManagerCockpit.tsx`, and `ERCockpit.tsx`, `if (!user) return null;` precedes `useMemo` declarations.
   - In standard React rendering, if an authenticated session initializes with `user === null` before AuthContext resolves or on user transition, React logs a critical hook ordering mismatch error and crashes the component subtree.
4. **Contrast with Compliant Components**:
   - `Dashboard.tsx:43`, `HodCockpit.tsx:59`, `NurseCockpit.tsx:110`, and `AdminCockpit.tsx:52` all place their early returns **after** all hook declarations.
5. **Conclusion**:
   - Because this violates both the explicit mandate of the user request and standard React runtime invariants, the reviewer verdict must be **REQUEST_CHANGES** with clear remediation instructions.

---

## 3. Caveats

1. **Firebase Security Rules Emulator**: `npm run test:rules` failed because Java Runtime is not installed in the local execution environment. This is an environment configuration limitation and not a source code regression.
2. **No Implementation Code Modified**: In accordance with the Reviewer identity constraint, no implementation files were edited by this agent.

---

## 4. Conclusion & Findings

### Findings Summary

| # | Severity | Category | File & Line | Description |
|---|---|---|---|---|
| 1 | **Major** | React Hook Rule Violation | `src/components/dashboard/ClinicianCockpit.tsx:23, 35-72` | 5 `useMemo` hooks declared after `if (!user) return null;` |
| 2 | **Major** | React Hook Rule Violation | `src/components/dashboard/ManagerCockpit.tsx:32, 45, 57` | 2 `useMemo` hooks declared after `if (!user) return null;` |
| 3 | **Major** | React Hook Rule Violation | `src/components/dashboard/ERCockpit.tsx:14, 42-43` | 2 `useMemo` hooks declared after `if (!user) return null;` |

---

### Remediation Guidance for Worker

To resolve these findings:
1. In `src/components/dashboard/ClinicianCockpit.tsx`:
   - Move `if (!user) return null;` down to right before `return (...)` (after all `useMemo` calls).
   - In the `useMemo` callbacks, guard with `if (!user) return [];` so they evaluate safely when `user` is null.
2. In `src/components/dashboard/ManagerCockpit.tsx`:
   - Move `if (!user) return null;` down to right before `return (...)` (after all `useMemo` calls).
   - In `facilityReferrals`, guard with `if (!user?.facilityId) ...`.
3. In `src/components/dashboard/ERCockpit.tsx`:
   - Move `if (!user) return null;` down to right before `return (...)` (after all `useMemo` calls).

---

## 5. Verification Method

Once the worker makes the fixes, independent verification can be executed via:

```bash
# 1. Typecheck (must exit 0)
npm run lint

# 2. Vitest unit tests (52 test files, 520 tests passing)
npm test

# 3. Production Vite build (must compile without warnings)
npm run build
```

Verify that searching for `return null` or `return <` in each file under `src/components/dashboard/` shows that zero `useMemo`, `useState`, `useEffect`, `useCallback`, or `useRef` calls appear after any `return` statement.
