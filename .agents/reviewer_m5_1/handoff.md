# Milestone 5 Code Review & Adversarial Challenge Report

**Reviewer**: Reviewer 1 (Milestone 5)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Automated Suite Execution

1. **TypeScript Type Check (`npm run lint`)**:
   - Command: `npm run lint` (`tsc --noEmit`)
   - **Result**: FAILED with exit code 1.
   - Verbatim Output:
     ```
     tests/m5-dom-integration.adversarial.test.tsx(17,3): error TS2322: Type '"general"' is not assignable to type 'FacilityType'.
     tests/m5-dom-integration.adversarial.test.tsx(31,3): error TS2322: Type '"specialized"' is not assignable to type 'FacilityType'.
     ```

2. **Vitest Unit & Integration Test Suite (`npm test -- --run`)**:
   - Command: `npm test -- --run`
   - **Result**: FAILED (67 passed, 1 failed; 614 passed, 1 failed).
   - Verbatim Failure:
     ```
     FAIL tests/m5-dom-integration.adversarial.test.tsx > Milestone 5 Adversarial DOM & Contract Verification > Contract 5: Direct admission form inputs > verifies #admitFacility selector is present when Admin is viewing DirectAdmissionForm
     Error: expect(received).toBeInTheDocument()

     received value must be an HTMLElement or an SVGElement.
     Received has type: Null
     Received has value: null
      ❯ tests/m5-dom-integration.adversarial.test.tsx:404:56
         402|       );
         403|
         404|       expect(document.querySelector('#admitFacility')).toBeInTheDocument();
     ```

3. **Vite Production Build (`npm run build`)**:
   - Command: `npm run build`
   - **Result**: PASSED with zero compilation errors in 548ms.

---

### 1.2 Review Checklist Verification

| Contract / Criterion | Target / Rule | Observed Status | Evidence / Notes |
|---|---|---|---|
| **React Hook Rules** | Unconditional hook calls at top of component body | **PASS** | `BedManagementPage.tsx` lines 16-115, `AdmitPatientPage.tsx` lines 12-40, `DirectAdmissionForm.tsx` lines 47-60, `DirectAdmissionModal.tsx` lines 30-52 all declare all hooks prior to early returns. |
| **Heading: `/Bulk Bed Management/i`** | `BedManagementPage.tsx` | **PASS** | `h1` with `Bulk Bed Management` on line 199. |
| **Arrived Row: `${patientName}, ${age}`** | `ArrivedTransfersQueue.tsx` | **PASS** | Exact string `{patientName}, {age}` on line 53. |
| **Button: `/Admit to (ICU\|CCU\|PICU\|Ward) bed/i`** | `ArrivedTransfersQueue.tsx` | **PASS** | `Admit to {bedType} bed` on line 113. |
| **Counter: `free of ${total}`** | `BedCapacityCard.tsx` | **PASS** | `free of {safeTotal}` on line 83. |
| **Heading: `/Direct Patient Admission/i`** | `AdmitPatientPage.tsx` | **PASS** | `h1` with `Direct Patient Admission` on line 94. |
| **Heading: `/Currently Admitted (Direct)/i`** | `ActiveInpatientCensus.tsx` | **PASS** | `h2` with `Currently Admitted (Direct)` on line 20 & 28. |
| **Button: `/Discharge/i`** | `ActiveInpatientCensus.tsx` | **PASS** | Button with `Discharge` on line 99. |
| **Input: `#admitPatientName`** | `DirectAdmissionForm.tsx` | **PASS** | `<input id="admitPatientName" ... />` on line 177. |
| **Input: `#admitHospitalId`** | `DirectAdmissionForm.tsx` | **PASS** | `<input id="admitHospitalId" ... />` on line 210. |
| **Select: `#admitDepartment`** | `DirectAdmissionForm.tsx` | **PASS** | `<select id="admitDepartment" ... />` on line 245. |
| **Select: `#admitBedType`** | `DirectAdmissionForm.tsx` | **PASS** | `<select id="admitBedType" ... />` on line 282. |
| **Select: `#admitFacility`** | `DirectAdmissionForm.tsx` | **FAIL (Edge Case)** | `<select id="admitFacility" ... />` is present on line 133, but unreachable when Admin has `user.facilityId === ''` because form is not rendered when `!facility`. |
| **Modal Accessibility** | `role="dialog"`, `aria-modal="true"`, Escape key | **PASS** | `DirectAdmissionModal.tsx` lines 34-52 (Escape listener + overflow lock) and lines 80-82 (`role="dialog"`, `aria-modal="true"`). |
| **Touch Target Sizing** | `>= 44px` / `48px` targets | **PASS** | Stepper buttons `h-12 w-12` (48px), inputs `min-h-[44px]`, CTA buttons `min-h-[48px]`. |

---

## 2. Logic Chain

1. **Root Cause Analysis: Admin User Facility Initialization Deadlock**:
   - In `src/pages/AdmitPatientPage.tsx` (lines 22, 28-34, 112) and `src/pages/BedManagementPage.tsx` (lines 29, 90-95, 235):
     ```tsx
     const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
     
     useEffect(() => {
       if (!selectedFacilityId && user?.facilityId) {
         setSelectedFacilityId(user.facilityId);
       }
     }, [user?.facilityId, selectedFacilityId]);

     const facility = facilitiesById.get(selectedFacilityId || '');
     ```
   - For `system_admin` and `owner` roles, `user.facilityId` is typically empty string `''` (as admins oversee the entire network).
   - Because `user.facilityId` is `''`, `selectedFacilityId` is `''`, and `facility` evaluates to `undefined`.
   - The conditional render `{facility ? (<DirectAdmissionForm ... />) : (<Card>Please select a facility above...</Card>)}` renders the fallback Card.
   - However, the facility picker (`#admitFacility` / `#bedMgmtFacility`) is located *inside* the child components (`DirectAdmissionForm` / `BedCapacityGrid`), which are never mounted because `facility` is `undefined`.
   - Consequently, the admin user is stuck on an unusable screen with no facility selector visible, and DOM query `document.querySelector('#admitFacility')` returns `null`.

2. **Root Cause Analysis: TypeScript Type Errors in Adversarial Test**:
   - In `tests/m5-dom-integration.adversarial.test.tsx` lines 17 and 31:
     ```tsx
     // Invalid FacilityType literals
     type: 'general',
     type: 'specialized',
     ```
   - `src/types/index.ts` line 17 defines `FacilityType = 'primary_care' | 'district_hospital' | 'tertiary_care' | 'external_contracted'`.
   - This invalid type assertion causes `tsc --noEmit` (`npm run lint`) to fail.

---

## 3. Caveats

- **No Caveats**: The codebase is well-structured, modular, and adheres to React hook rules and design system guidelines.
- Fixing the two identified issues (auto-selecting `facilities[0]?.id` when `!selectedFacilityId && isAdmin` and fixing the `FacilityType` enum in `tests/m5-dom-integration.adversarial.test.tsx`) will immediately bring both `npm run lint` and `npm test` to a 100% pass rate.

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

### Actionable Remediation Items for Worker:

1. **Fix Admin Facility Fallback in `src/pages/AdmitPatientPage.tsx` and `src/pages/BedManagementPage.tsx`**:
   - In `AdmitPatientPage.tsx` and `BedManagementPage.tsx`, ensure `selectedFacilityId` automatically falls back to `facilities[0]?.id` when `!selectedFacilityId && isAdmin && facilities.length > 0`:
     ```tsx
     useEffect(() => {
       if (!selectedFacilityId) {
         if (user?.facilityId) {
           setSelectedFacilityId(user.facilityId);
         } else if (isAdmin && facilities.length > 0) {
           setSelectedFacilityId(facilities[0].id);
         }
       }
     }, [user?.facilityId, selectedFacilityId, isAdmin, facilities]);
     ```
   - Alternatively, render the facility picker outside the `facility ? (...) : (...)` conditional guard so an admin can always select a facility when none is initially selected.

2. **Fix `FacilityType` literals in `tests/m5-dom-integration.adversarial.test.tsx`**:
   - Change `type: 'general'` on line 17 to `type: 'district_hospital'`.
   - Change `type: 'specialized'` on line 31 to `type: 'tertiary_care'`.

---

## 5. Verification Method

To verify resolution of these findings:

```bash
# 1. Run TypeScript check (must exit code 0)
npm run lint

# 2. Run full Vitest suite (must be 68/68 files passing)
npm test -- --run

# 3. Run production build (must exit code 0)
npm run build
```
