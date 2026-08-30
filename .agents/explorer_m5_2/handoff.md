# Milestone 5 Technical Investigation: Direct Patient Admission Workflows & Capacity Integration

**Explorer**: `explorer_m5_2` (Explorer 2 — Milestone 5)  
**Date**: 2026-08-29T12:33:00+03:00  
**Scope**: Direct Patient Admission (`AdmitPatientPage.tsx`), Form Specification, Mutations & Validation, Modal/Drawer Architecture in `BedManagementPage.tsx`, Route Backwards-Compatibility, and Accessibility.

---

## 1. Observation

### 1.1 `src/pages/AdmitPatientPage.tsx` Current Implementation
- **File location & size**: `src/pages/AdmitPatientPage.tsx` (205 lines).
- **Current State**:
  - Contains a 4-field direct admission form (lines 90–147):
    - Patient Name (`patientName` state, input id `#admitPatientName`, line 93)
    - Hospital ID (`hospitalId` state, input id `#admitHospitalId`, line 105)
    - Admitting Department (`department` state, select id `#admitDepartment`, line 120)
    - Bed Type (`bedType` state, select id `#admitBedType`, line 135)
  - Admin view facility selector (lines 62–79):
    - Select id `#admitFacility` (line 67) allows `system_admin` and `owner` roles to toggle `selectedFacilityId`.
  - Active admissions table (lines 159–195):
    - Queries `directAdmissions.filter(a => a.facilityId === selectedFacilityId && a.status !== 'discharged')`.
    - Renders each record with patient name, HID, department, admission date, bed type badge, and a "Discharge" button calling `dischargeDirectAdmission(admission.id)` (lines 182–189).
  - Form submission handling (lines 31–49):
    ```typescript
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!patientName || !hospitalId || !department || !bedType || !selectedFacilityId) return;

      addDirectAdmission({
        facilityId: selectedFacilityId,
        department,
        bedType,
        patientName,
        hospitalId,
        admittedBy: user.id
      });

      // Provide feedback and reset form
      setPatientName('');
      setHospitalId('');
      setDepartment('');
      setBedType('Ward');
    };
    ```

### 1.2 `src/contexts/DataContext.tsx` Interface & Mutations
- **DirectAdmission Model** (`src/contexts/DataContext.tsx:25-35`):
  ```typescript
  export interface DirectAdmission {
    id: string;
    facilityId: string;
    department: string;
    bedType: BedType;
    patientName: string;
    hospitalId: string;
    admittedAt: string;
    admittedBy: string;
    status?: 'admitted' | 'discharged';
  }
  ```
- **Direct Admission Mutation** (`src/contexts/DataContext.tsx:546-566`):
  ```typescript
  const addDirectAdmission = useCallback((admissionData: Omit<DirectAdmission, 'id' | 'admittedAt'>) => {
    const newAdmission: DirectAdmission = {
      ...admissionData,
      id: uuidv4(),
      admittedAt: new Date().toISOString(),
      status: 'admitted'
    };
    
    setDoc(doc(db, 'directAdmissions', newAdmission.id), newAdmission).catch(writeFailed("Could not record the admission."));

    // Update facility capacity
    const facility = facilitiesById.get(admissionData.facilityId);
    if (facility) {
      const bedCap = facility.capacity[admissionData.bedType];
      if (bedCap) {
        updateDoc(doc(db, 'facilities', facility.id), {
          [`capacity.${admissionData.bedType}.occupied`]: increment(1)
        }).catch(writeFailed("Could not update bed capacity for this admission."));
      }
    }
  }, [facilities]);
  ```
- **Discharge Mutation** (`src/contexts/DataContext.tsx:595-612`):
  - Uses `runTransaction` on `doc(db, 'directAdmissions', id)`.
  - Decrements `capacity.${admission.bedType}.occupied` by -1 on `facilities/${facility.id}`.
  - Updates `status: 'discharged'`.
- **Referral Admission Mutation** (`src/contexts/DataContext.tsx:789-793`):
  - In `updateReferralStatus(referralId, 'admitted')`, transitions arrived referral to `admitted` and increments `capacity.${r.requiredBedType}.occupied` by 1.

### 1.3 `firestore.rules` Security Rules for Direct Admissions
- **File location**: `firestore.rules:483-503`:
  ```ruby
  match /directAdmissions/{admissionId} {
    allow read: if isPrivileged() || (isVerifiedCaller() && resource.data.facilityId == callerFacility());
    allow create: if isPrivileged() || atFacility(request.resource.data.facilityId);
    allow update: if isPrivileged()
                  || (isVerifiedCaller()
                      && resource.data.facilityId == callerFacility()
                      && request.resource.data.facilityId == resource.data.facilityId
                      && request.resource.data.patientName == resource.data.patientName
                      && request.resource.data.hospitalId == resource.data.hospitalId
                      && request.resource.data.admittedAt == resource.data.admittedAt
                      && request.resource.data.admittedBy == resource.data.admittedBy);
    allow delete: if isPrivileged();
  }
  ```
- **Observation**: `allow create` allows any document fields provided `atFacility(request.resource.data.facilityId)` or `isPrivileged()`. Adding optional patient fields (e.g. `age`, `gender`, `nationalId`, `phoneNumber`, `diagnosis`, `chiefComplaint`, `notes`) is permitted by Firestore rules with zero security rule changes required.

### 1.4 `src/pages/BedManagementPage.tsx` Current Structure
- **File location & size**: `src/pages/BedManagementPage.tsx` (259 lines).
- **Current Flow**:
  - Gated by role check (lines 114–116): `nurse`, `nursing_supervisor`, `head_of_department`, `er_room`, `system_admin`, `owner`.
  - Heading: `<h1>Bulk Bed Management</h1>` (line 158).
  - Bed Steppers: `BedStepper` component for `ICU`, `CCU`, `PICU`, `Ward` with debounced Firestore writes (lines 13–63, 124–136).
  - Arrived Referrals queue: `ArrivedReferralRow` (lines 69–83, 199–215), renders `"${patientName}, ${age}"` with admit button `Admit to ${bedType} bed` calling `updateReferralStatus(referralId, 'admitted')`.
  - Link to direct admission (lines 217–223):
    ```tsx
    <Link
      to="/admissions/new"
      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 mb-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <UserPlus className="w-4 h-4" />
      Direct admit a walk-in
    </Link>
    ```
  - **Issue**: Forces nursing staff to leave the bed capacity screen and navigate to a separate route `/admissions/new` to record walk-in admissions.

### 1.5 Route & Navigation Call Sites
- `src/App.tsx:105`: `<Route path="admissions/new" element={<AdmitPatientPage />} />`
- `src/components/layout/AppSidebar.tsx:274-283`: Direct Admit link pointing to `/admissions/new` for nurses.
- `src/components/layout/AppLayout.tsx:376-390`: Mobile bottom bar "Admit" button pointing to `/admissions/new` for nurses.
- `src/components/dashboard/NurseCockpit.tsx:162-168`: "Direct Admit Walk-In" button pointing to `/admissions/new`.
- `e2e/referral-lifecycle.spec.ts:153-170`: Playwright E2E test navigates to `/bed-management`, expects `/Bulk Bed Management/i`, locates row `Sayed Abdel-Rahman, 58`, clicks `/Admit to ICU bed/i`, and verifies bed occupancy `free of 10`.

---

## 2. Logic Chain

### 2.1 Form Field Schema & Validation Logic (Observation 1.1, 1.2, 1.3)
1. **Extended Direct Admission Schema**:
   To support comprehensive clinical intake while remaining 100% compatible with existing Firestore consumers and tests:
   ```typescript
   export interface DirectAdmission {
     id: string;
     facilityId: string;
     department: string;
     bedType: BedType;
     patientName: string;
     hospitalId: string;
     admittedAt: string;
     admittedBy: string;
     status?: 'admitted' | 'discharged';
     // Enhanced clinical & demographic fields
     age?: number;
     gender?: 'male' | 'female' | 'other';
     nationalId?: string;
     phoneNumber?: string;
     diagnosis?: string;
     chiefComplaint?: string;
     notes?: string;
   }
   ```
2. **Form Fields & Selectors**:
   | Field | Key | Input Type | Required | Selector ID | Validation Rule |
   |---|---|---|---|---|---|
   | Facility | `facilityId` | Select | Yes (Admin) | `#admitFacility` | Non-empty string |
   | Patient Name | `patientName` | Text | Yes | `#admitPatientName` | Non-empty, trimmed, min 2 chars |
   | Hospital ID | `hospitalId` | Text | Yes | `#admitHospitalId` | Non-empty, trimmed (e.g. `HID-12345`) |
   | Age | `age` | Number | Yes | `#admitPatientAge` | Integer `0 <= age <= 125` |
   | Gender | `gender` | Select | Yes | `#admitPatientGender` | `'male' \| 'female' \| 'other'` |
   | National ID | `nationalId` | Text | No | `#admitNationalId` | Optional; if provided, 14 digits or alphanumeric |
   | Phone Number | `phoneNumber` | Tel | No | `#admitPhoneNumber` | Optional; if provided, valid Egyptian phone (11 digits) |
   | Diagnosis | `diagnosis` | Text | No | `#admitDiagnosis` | Optional string |
   | Chief Complaint | `chiefComplaint` | Text / Textarea | No | `#admitChiefComplaint` | Optional clinical presentation |
   | Admitting Dept | `department` | Select | Yes | `#admitDepartment` | Must match facility department list |
   | Bed Type | `bedType` | Select / Radios | Yes | `#admitBedType` | `'ICU' \| 'CCU' \| 'PICU' \| 'Ward'` |
   | Notes | `notes` | Textarea | No | `#admitNotes` | Optional nursing/clinical notes |

3. **Validation & Feedback State Machine**:
   - `errors: Record<string, string>` holds per-field validation error messages.
   - Validation triggers on submit and optionally on blur after touch (`touched: Record<string, boolean>`).
   - If invalid: focus first invalid field, render helper text with `role="alert"` and red border (`border-critical-500`).
   - If valid: set `isSubmitting = true`, call `addDirectAdmission(...)`, show `showToast('Direct admission recorded successfully', 'success')`, clear form or close modal.
   - If mutation throws: catch with `toastError(err, 'Failed to record admission')`, set `isSubmitting = false`.

### 2.2 Architectural Integration into `BedManagementPage.tsx` (Observation 1.4, 1.5)
1. **Component Modularization**:
   - Extract the direct admission form into a reusable component: `src/components/beds/DirectAdmissionForm.tsx` (or embedded in `src/components/beds/DirectAdmissionModal.tsx`).
   - Create `src/components/beds/DirectAdmissionModal.tsx`:
     - Renders an accessible overlay (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="direct-admit-title"`).
     - Provides responsive presentation:
       - **Desktop (md+)**: Centered dialog (`max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl`) or slide-over drawer with smooth transition.
       - **Mobile (<md)**: Bottom slide-up sheet (`max-h-[92vh] rounded-t-2xl w-full`) with sticky header, scrollable body, and fixed bottom action bar.
     - Escape key listener and backdrop click listener.
     - Auto-focuses `#admitPatientName` on open.
2. **Integration in `BedManagementPage.tsx`**:
   - Add local state `const [isDirectAdmitOpen, setIsDirectAdmitOpen] = useState(false);`.
   - Update the action button on line 217:
     ```tsx
     <button
       type="button"
       onClick={() => setIsDirectAdmitOpen(true)}
       className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition-all active:scale-[0.98]"
     >
       <UserPlus className="w-4 h-4" />
       Direct Admit Walk-In
     </button>
     ```
   - Render `<DirectAdmissionModal isOpen={isDirectAdmitOpen} onClose={() => setIsDirectAdmitOpen(false)} defaultFacilityId={selectedFacilityId} />`.
   - When a patient is directly admitted, `addDirectAdmission` immediately increments the bed occupancy, and `BedManagementPage` steppers reflect the updated capacity in real time without a page refresh.

3. **100% Routing Backwards-Compatibility (`AdmitPatientPage.tsx`)**:
   - Retain `/admissions/new` in `App.tsx` and maintain `AdmitPatientPage.tsx`.
   - `AdmitPatientPage.tsx` renders a clean full-page container wrapping `<DirectAdmissionForm />` and the active direct admissions list (`Currently Admitted (Direct)` with discharge actions).
   - Add a navigation back-link to `/bed-management` ("Back to Bed Management & Capacity Hub").
   - Existing links in `AppSidebar.tsx` (line 275), `AppLayout.tsx` (line 377), and `NurseCockpit.tsx` (line 163) can either continue pointing to `/admissions/new` or point to `/bed-management?action=direct-admit` while `/admissions/new` remains fully functional.

### 2.3 Accessibility & Ergonomic Requirements (Observation 1.1, 1.4)
1. **Touch Targets (WCAG 2.5.5 / 2.5.8)**:
   - All interactive controls (`input`, `select`, `textarea`, `button`) must have minimum height `>= 44px` (recommended `48px` for primary CTA, `min-h-[48px]`).
   - Close buttons (`<X />`) must have touch target of at least `44x44px` with `p-2.5` or `h-11 w-11`.
   - Spacing between adjacent inputs and buttons `>= 12px` (`gap-3` or `gap-4`).
2. **Keyboard Navigation & ARIA**:
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="direct-admit-title"`.
   - ESC key listener triggers `onClose()`.
   - Focus trapping within modal when open.
   - Form controls have explicit `<label htmlFor="...">` bindings.
   - High-contrast focus rings: `focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900`.
3. **E2E Invariants Preservation**:
   - Retain exact IDs `#admitPatientName`, `#admitHospitalId`, `#admitDepartment`, `#admitBedType`, `#admitFacility`.
   - Retain `BedManagementPage` contracts: Heading `/Bulk Bed Management/i`, Arrived patient row text `${patientName}, ${age}`, Admit button `/Admit to (ICU|CCU|PICU|Ward) bed/i`.

---

## 3. Caveats

1. **Direct Admission Document Schema vs Referral Model**:
   - Direct admissions are stored in the separate `directAdmissions` collection in Firestore, not in the `referrals` collection. They represent local walk-in/ER admissions that bypass multi-hospital transfer workflows.
   - When a direct admission is created, `DataContext` increments `facility.capacity[bedType].occupied` directly.
   - When an arrived referral is admitted via `handleAdmit` on `BedManagementPage`, `updateReferralStatus(referralId, 'admitted')` increments `facility.capacity[bedType].occupied` and transitions the referral document.
2. **Offline Mode**:
   - `setDoc` and `updateDoc` in `addDirectAdmission` are queued by Firebase offline persistence. If offline, the optimistic state is maintained.
3. **No Caveats Beyond Above**: All interfaces, security rules, and test contracts have been verified.

---

## 4. Conclusion

1. **Form Architecture**:
   - Direct admission should support the full 11-field clinical intake: Hospital ID, Patient Name, Age, Gender, National ID, Phone, Diagnosis, Chief Complaint, Target Department, Bed Type, Notes.
   - The `DirectAdmission` interface in `DataContext.tsx` should be extended with these optional demographic and clinical fields without altering existing mandatory fields (`id`, `facilityId`, `department`, `bedType`, `patientName`, `hospitalId`, `admittedAt`, `admittedBy`, `status`).
2. **Bed Management Hub Integration**:
   - `BedManagementPage.tsx` should integrate a `DirectAdmissionModal` (slide-over drawer on desktop, bottom-sheet on mobile) triggered directly from the page.
   - This unifies bed steppers, arrived transfer intake, and walk-in direct admissions into a single real-time Capacity Control Center.
3. **Route Backwards-Compatibility**:
   - `AdmitPatientPage.tsx` must remain mounted at `/admissions/new` in `src/App.tsx`, providing a standalone page wrapper with the same shared form and the active admissions census list.
   - All E2E test contracts and selector invariants must be strictly preserved.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Typecheck & Linting**:
   ```bash
   npm run lint
   ```
   *Expected*: 0 TypeScript errors, 0 hook violations.

2. **Unit & Integration Tests**:
   ```bash
   npm test
   ```
   *Expected*: All Vitest test suites in `src/` and `tests/` pass.

3. **Firestore Security Rules**:
   ```bash
   npm run test:rules
   ```
   *Expected*: 100% pass on `tests/firestore.rules.test.ts`.

4. **Playwright E2E Tests**:
   ```bash
   npm run test:e2e
   ```
   *Expected*: Full pass on `e2e/referral-lifecycle.spec.ts`, `e2e/exceptions-edge-cases.spec.ts`, `e2e/navigation.spec.ts`.

5. **Production Build**:
   ```bash
   npm run build
   ```
   *Expected*: Vite builds production bundle without errors.

### 5.2 Specific Files to Inspect During Implementation
- `src/types/index.ts`: Verify `BedType` and `PatientData` definitions.
- `src/contexts/DataContext.tsx`: Verify `DirectAdmission` type, `addDirectAdmission`, `dischargeDirectAdmission`, `updateReferralStatus`.
- `src/components/beds/DirectAdmissionModal.tsx` (new component): Verify modal accessibility, ARIA attributes, keyboard escape, and form fields.
- `src/pages/BedManagementPage.tsx`: Verify modal integration, steppers, arrived queue, and DOM selector contracts.
- `src/pages/AdmitPatientPage.tsx`: Verify standalone route rendering, form integration, and backwards-compatibility.
