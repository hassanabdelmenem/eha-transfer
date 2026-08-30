# Milestone 5 Technical Investigation: Integrated Bed Management & Capacity Hub

## 1. Observation

### 1.1 Existing File Structure & Component Inventory
- **Current Main Page**: `src/pages/BedManagementPage.tsx` (259 lines)
- **Direct Admission Standalone Route**: `src/pages/AdmitPatientPage.tsx` (205 lines, route `/admissions/new`)
- **Dashboard Nursing Cockpit**: `src/components/dashboard/NurseCockpit.tsx` (304 lines)
- **Network Heatmap**: `src/components/dashboard/BedOccupancyHeatmap.tsx` (91 lines)
- **Target Component Directory**: `src/components/beds/` (currently unpopulated)
- **Shared Data Layer**: `src/contexts/DataContext.tsx` (`updateFacilityCapacity`, `addDirectAdmission`, `dischargeDirectAdmission`, `updateReferralStatus`)
- **Security & Authorization Rules**: `firestore.rules` (lines 58–74, 115–150, 483–502)
- **E2E & Unit Test Invariants**:
  - `e2e/referral-lifecycle.spec.ts` (lines 153–174)
  - `PROJECT.md` Interface Contracts (lines 78–99)
  - `src/components/dashboard/DashboardCockpits.test.tsx` & `.adversarial.test.tsx`

---

### 1.2 `BedManagementPage.tsx` Detailed Code Analysis

```tsx
// src/pages/BedManagementPage.tsx:10
import { RoleHomeHeader } from '../components/layout/RoleHomeHeader';

// Lines 13-63: Inline BedStepper
const BedStepper: React.FC<{
  bedType: BedType;
  total: number;
  occupied: number;
  onChange: (occupied: number) => void;
}> = ({ bedType, total, occupied, onChange }) => { ... };

// Lines 69-83: Inline ArrivedReferralRow
const ArrivedReferralRow: React.FC<{
  patientName: string;
  age: number;
  bedType: BedType;
  onAdmit: () => void;
  busy: boolean;
}> = ({ patientName, age, bedType, onAdmit, busy }) => { ... };

// Lines 85-258: BedManagementPage Component
export const BedManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, facilitiesById, updateFacilityCapacity, referrals, updateReferralStatus, loading } = useData();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const [capacities, setCapacities] = useState<Record<BedType, { total: number; occupied: number }>>({} as Record<BedType, { total: number; occupied: number }>);
  const [admittingId, setAdmittingId] = useState<string | null>(null);

  const writeTimers = useRef<Partial<Record<BedType, ReturnType<typeof setTimeout>>>>({});
  useEffect(() => () => {
    Object.values(writeTimers.current).forEach(t => t && clearTimeout(t));
  }, []);

  useEffect(() => {
    const selected = facilitiesById.get(selectedFacilityId || '');
    if (selected) {
      setCapacities(selected.capacity as any);
    }
  }, [selectedFacilityId, facilitiesById]);
  ...
```

#### Observations on Current Architecture & Flaws:
1. **Legacy Header Violation**: Line 155 renders `<RoleHomeHeader identity={`${user.name} · ${facility?.name || 'Facility'}`} />`. `PROJECT.md` Section 1 mandates removing duplicated `<RoleHomeHeader />` across all pages in favor of the global topbar and integrated page headers.
2. **Disconnected Walk-in Flow**: Lines 217–223 render `<Link to="/admissions/new">Direct admit a walk-in</Link>`. Navigating away disrupts the bed management workflow for nursing staff.
3. **State Reseed Race Condition**: The `useEffect` on line 107 depends on `[selectedFacilityId, facilitiesById]`. In `DataContext.tsx`, any Firestore snapshot creates a new `Map` instance for `facilitiesById`. When `facilitiesById` reference changes while a user is tapping steppers, `setCapacities` resets local state with stale server data before the 500ms debounce timer executes, causing UI flicker and dropped clicks.
4. **Whole-Map Overwrite Hazard**: In `DataContext.tsx:506-515`, `updateFacilityCapacity` spreads `...facility.capacity, ...capacities` and overwrites the entire `capacity` map in Firestore:
   ```typescript
   updateDoc(doc(db, 'facilities', facilityId), {
     capacity: {
       ...facility.capacity,
       ...capacities
     }
   })
   ```
   If a user rapidly adjusts ICU (timer 1) and CCU (timer 2), when timer 2 executes before snapshot 1 returns, timer 2 reads stale ICU state and clobbers the ICU adjustment.
5. **Unmount Write Dropping**: On line 101, `useEffect` cleanup calls `clearTimeout(t)`. If the nurse leaves the page within 500ms of clicking a stepper, pending updates are canceled and never sent to Firestore.
6. **Division by Zero Handling**: `BedStepper` checks `total > 0 ? free / total : 0`, but `BedManagementPage` filters bed types with `(capacities[bt]?.total ?? 0) > 0`. If a facility has zero beds for a type, the stepper is hidden.

---

### 1.3 Arrived Transfer Queue Contract & Invariants
In `BedManagementPage.tsx:138-140` and `e2e/referral-lifecycle.spec.ts:153-174`:
- **Filter**: `referrals.filter(r => r.status === 'arrived' && r.receivingFacilityId === facility.id)`
- **E2E Matchers**:
  - Page Heading: `page.getByRole('heading', { name: /Bulk Bed Management/i })`
  - Patient Row: `page.getByText('Sayed Abdel-Rahman, 58')` (format: `<patientName>, <age>`)
  - Admit CTA: `page.getByRole('button', { name: /Admit to ICU bed/i })` (regex: `/Admit to (ICU|CCU|PICU|Ward) bed/i`)
  - Counter Text: `page.locator('p', { hasText: 'free of 10' })`
  - Stepper Action: Decrements free beds (increments occupied) upon admission.

---

### 1.4 Direct Admission Workflow (`AdmitPatientPage.tsx`)
In `src/pages/AdmitPatientPage.tsx:11-205`:
- **Form Selectors**:
  - `#admitPatientName` (Patient Name, required)
  - `#admitHospitalId` (Hospital ID / HID, required)
  - `#admitDepartment` (Department select, required)
  - `#admitBedType` (Bed Type select: Ward, ICU, CCU, PICU, required)
  - `#admitFacility` (Admin view selector when user is admin)
- **Mutation**: `addDirectAdmission({ facilityId, department, bedType, patientName, hospitalId, admittedBy })`
  - Creates record in `directAdmissions` collection with `status: 'admitted'`.
  - Atomically increments facility bed occupancy: `[`capacity.${bedType}.occupied`]: increment(1)`.
- **Discharge Action**: `dischargeDirectAdmission(admission.id)`
  - Transactionally updates `status: 'discharged'` and decrements `[`capacity.${bedType}.occupied`]: increment(-1)`.

---

## 2. Logic Chain

1. **Premise 1 (Redesign Alignment)**: Per `PROJECT.md` Section 5, Milestone 5 combines capacity management, arrived transfer quick-admissions, and direct walk-in admissions into a unified hub.
2. **Premise 2 (Selector & E2E Stability)**: `e2e/referral-lifecycle.spec.ts` directly asserts `/bed-management` with heading `/Bulk Bed Management/i`, arrived patient text `Sayed Abdel-Rahman, 58`, button `/Admit to ICU bed/i`, and stepper count text `free of 10`. Any refactored layout must strictly retain these DOM identities and accessible names.
3. **Premise 3 (Component Decomposition)**: Decomposing `BedManagementPage.tsx` into modular components under `src/components/beds/` improves maintainability and reusability:
   - `BedCapacityGrid.tsx` & `BedCapacityCard.tsx` (steppers with visual occupancy gauge, full/low/available status, debounce state)
   - `ArrivedTransfersQueue.tsx` (arrived referral cards with clinical vitals, origin facility, quick admit CTA)
   - `DirectAdmissionModal.tsx` / `DirectAdmissionForm.tsx` (embedded slide-over / dialog with field validation)
   - `ActiveInpatientCensus.tsx` (unified census of admitted referrals and direct admissions with discharge CTA)
4. **Premise 4 (Concurrency & State Safety)**:
   - Debounced writes must store pending modifications in a ref (`latestCapacitiesRef`) and only update Firestore using atomic dot paths (`capacity.${bedType}.occupied`) or batched payloads, preventing cross-unit clobbers.
   - The Firestore synchronization hook must not clobber pending in-flight debounce values for units currently being adjusted.
   - Component unmount must flush pending debounced writes immediately rather than discarding them.
5. **Premise 5 (Routing Compatibility)**: Retaining `/admissions/new` with a wrapper component that renders `DirectAdmissionForm` preserves bookmark and external deep link compatibility while embedding the modal on `/bed-management`.

---

## 3. Caveats

1. **Firestore Rules Strictness**: `firestore.rules` (lines 58–74, 141–150) enforces that non-leadership accounts cannot modify bed `total` values (`bedTotalsUnchanged()`), and `0 <= occupied <= total`. Attempting to write invalid bed totals from BedManagementPage will fail with security permission errors. Total configuration is reserved for `FacilitySettingsPage.tsx`.
2. **Direct Admission Constraints**: `firestore.rules` (lines 485–502) enforces pinned fields on direct admissions. Any update must preserve `facilityId`, `patientName`, `hospitalId`, `admittedAt`, `admittedBy`.
3. **No Caveats on E2E Invariants**: All required E2E selectors have been verified against `e2e/referral-lifecycle.spec.ts`.

---

## 4. Conclusion & Recommended Architecture

### Proposed Decomposition (`src/components/beds/`):

```
src/components/beds/
├── BedCapacityCard.tsx          # Single bed unit stepper card (ICU, CCU, PICU, Ward)
├── BedCapacityGrid.tsx          # 4-column responsive grid with aggregate facility totals
├── ArrivedTransfersQueue.tsx    # Intake queue for arrived referrals waiting for bed assignment
├── DirectAdmissionModal.tsx     # Accessible modal / slide-over dialog for walk-in admissions
├── DirectAdmissionForm.tsx      # Shared form (used in modal and /admissions/new route)
└── ActiveInpatientCensus.tsx    # Live admitted census table (referrals + direct walk-ins)
```

### Proposed State & Debounce Architecture:
1. **Local State + Ref Synchronization**:
   ```typescript
   const [capacities, setCapacities] = useState<Record<BedType, { total: number; occupied: number }>>(...);
   const capacitiesRef = useRef(capacities);
   capacitiesRef.current = capacities;
   const pendingUpdatesRef = useRef<Partial<Record<BedType, number>>>({});
   ```
2. **Flush on Unmount**:
   ```typescript
   useEffect(() => {
     return () => {
       // Flush any pending debounced writes before unmounting
       flushPendingCapacities();
     };
   }, []);
   ```
3. **Atomic Firestore Mutation Support**:
   - Update `DataContext.tsx` to support atomic field updates for individual bed types without clobbering other concurrent units.

---

## 5. Verification Method

1. **Unit & Adversarial Testing**:
   ```bash
   npm test
   ```
   Run Vitest tests covering bed stepper math, arrived referral filtering, debounce timers, direct admission submission, and role authorization.

2. **TypeScript Compilation & Linting**:
   ```bash
   npm run lint
   npm run build
   ```
   Ensure zero TypeScript compilation errors and zero React Hook rule violations.

3. **Playwright End-to-End Verification**:
   ```bash
   npm run test:e2e
   ```
   Specifically verifies `e2e/referral-lifecycle.spec.ts` (Nurse admits arrived transfer on `/bed-management`, verifies bed count decrement, and checks confirmation).
