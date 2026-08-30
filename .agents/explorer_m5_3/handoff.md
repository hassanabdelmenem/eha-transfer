# Milestone 5 Technical Investigation: Test Suites, DOM Selector Contracts & Invariant Analysis

## 1. Observation

### 1.1 Test Suite Inventory & Scope
A full scan of the test directories across the repository identifies all test suites exercising bed management, capacity updates, direct admissions, and patient intake workflows:

| Test Suite / Path | Framework | Scope & Workflow Covered | Key Assertion & Contract References |
|---|---|---|---|
| `e2e/referral-lifecycle.spec.ts` | Playwright E2E | End-to-end multi-role transfer journey from intake to nurse bed admission & referral detail confirmation | Lines 153–174: Nurse logs in, visits `/bed-management`, admits arrived patient to ICU, checks bed count decrement (`free of 10`), checks referral detail banner (`Patient Admitted Successfully`) |
| `e2e/exceptions-edge-cases.spec.ts` | Playwright E2E | Exception workflows, mandatory rejection/cancellation reasons, ECG viewer controls | Lines 79–129, 131–218: Pre-transit cancellation lock, dialog selectors, modal accessibility |
| `e2e/navigation.spec.ts` | Playwright E2E | Authentication guard, routing to `/referrals` and `/dashboard` | Lines 15–28: Header/heading invariants (`/^Referrals$/i`, `/overview/i`) |
| `e2e/auth.spec.ts` | Playwright E2E | Unauthenticated redirect to login | Lines 3–12: `#loginEmail`, `#loginPassword`, heading `/sign in to your account/i` |
| `tests/persona-lifecycle.test.ts` | Vitest Integration | Multi-party healthcare simulation harness covering 7-stage transfer lifecycle and branch pathways | Lines 221–254 (Stage 6): Nurse admits patient to ICU bed, capacity occupied increments 2 $\to$ 3; discharge decrements 3 $\to$ 2. Lines 465–508 (Branch D): Direct walk-in admission and shift handover |
| `tests/rbac-boundaries.test.ts` | Vitest Security/RBAC | 14-role taxonomy, permission matrix, cross-facility tenant isolation, bed configuration boundaries | Lines 588–606: Direct admission facility isolation. Lines 682–750: Floor nurse bed occupancy updates vs. leadership total capacity rules |
| `tests/edge-cases-exceptions.test.ts` | Vitest Unit/Integration | Fast-track SLA engine, 0-bed capacity exhaustion, auto-escalation, patient decline re-routing, ECG viewer | Lines 493–675: 0-bed exhaustion (`no_beds_available`, `no_matching_facility`), admin destination override. Lines 74–122: Cancellation status locking |
| `tests/firestore.rules.test.ts` | Vitest Emulator | Firestore security rules validation against local emulator | Lines 93–97, 230–240: `directAdmissions` collection constraints, `facilities` bed capacity update permissions, `referrals` admission actor binding |
| `tests/persona-simulation.adversarial.test.ts` | Vitest Adversarial | Adversarial state machine transitions, illegal status jumps, cancellation locking | Lines 297–318: Rejects jumping `in_transit` $\to$ `admitted`. Lines 351–380: Cancellation lock on `admitted`. Lines 580–585: Cross-facility admission rejection |
| `tests/tier5-whitebox.adversarial.test.ts` | Vitest Adversarial | Rapid serial cycles, candidate array exhaustion, extreme vitals, boundary bed allocation balance | Lines 86–165: Serial lifecycle. Lines 542–644: Rapid batch admit/discharge (5 referrals), direct admission idempotent discharge, capacity bounds validation |
| `src/pages/tier5-ui.adversarial.test.tsx` | Vitest UI Integration | ReferralDetailPage & NewReferralPage adversarial stress testing, cancellation lock, modal states | Lines 734–746: Cancellation button absence for `admitted` referrals. Lines 936–942: Non-doctor access restriction |
| `src/components/dashboard/DashboardCockpits.test.tsx` | Vitest UI Integration | Clinical cockpit widgets, NurseCockpit bed steppers, arrived transfer intake CTA | Lines 478–496 (Section 7): `NurseCockpit` renders `/Ward Capacity & Bed Management Console/i`, `/Arrived Transfers · Waiting for Bed Assignment/i`, `/Admit to CCU bed/i` |
| `src/contexts/DataContext.cancel.test.tsx` | Vitest Context | `cancelReferral` and `recordPatientDecline` transactional guards | Lines 137–148: Refusal of cancellation for `in_transit`, `arrived`, `admitted`, `discharged` |
| `src/contexts/DataContext.test.tsx` | Vitest Context | Offline queueing, IndexedDB synchronization, optimistic updates | Lines 42–90: Offline referral creation and pending sync count |

---

### 1.2 Verbatim DOM Selector Contracts & Element Identifiers

From exhaustive inspection of the source code and test files, the following DOM selector contracts and accessibility signatures are established:

#### 1.2.1 Bed Management Page (`src/pages/BedManagementPage.tsx` at `/bed-management`)
- **Main Heading**:
  - Element: `<h1 ...>Bulk Bed Management</h1>`
  - Playwright Selector Contract: `page.getByRole('heading', { name: /Bulk Bed Management/i })` (Verified in `e2e/referral-lifecycle.spec.ts:155`)
- **Admin Facility View Switcher**:
  - Element: `<select id="bedMgmtFacility" ...>`
  - Associated Label: `<label htmlFor="bedMgmtFacility">Admin View:</label>`
- **Facility Settings Link (Hospital Leadership / Admin)**:
  - Element: `<Link to="/facility-settings" ...>`
  - Accessible Name: `/Edit total capacity/i`
- **Direct Admit Navigation Link**:
  - Element: `<Link to="/admissions/new" ...>`
  - Accessible Name: `/Direct admit a walk-in/i`
- **Loading Skeleton State**:
  - Container: `div[role="status"][aria-busy="true"][aria-live="polite"]`
  - Accessible Text: `<span className="sr-only">Loading facility data…</span>`
- **Arrived Transfers Waiting Queue**:
  - Section Heading: `h2` with text `/Arrived · waiting to be admitted \(\d+\)/i`
  - Patient Row Identifier: `page.getByText('<Patient Name>, <Age>')` (e.g. `'Sayed Abdel-Rahman, 58'`) (Verified in `e2e/referral-lifecycle.spec.ts:158`)
  - Subtitle: `Arrived · waiting to be admitted`
  - Quick-Admit Button: `page.getByRole('button', { name: /Admit to (ICU|CCU|PICU|Ward) bed/i })` (Verified in `e2e/referral-lifecycle.spec.ts:161`)
  - Dismissal Invariant: Upon click, patient row is removed from DOM (`expect(arrivedRow).not.toBeVisible()`)
- **Real-Time Bed Stepper Components (`BedStepper`)**:
  - Bed Types Supported: `'ICU' | 'CCU' | 'PICU' | 'Ward'`
  - Stepper Minus Button (Increments Occupied / Decrements Free):
    - `button[aria-label="One more <BedType> bed occupied"]` (e.g. `aria-label="One more ICU bed occupied"`)
    - State: `disabled` when `occupied >= total`
  - Stepper Plus Button (Decrements Occupied / Increments Free):
    - `button[aria-label="One fewer <BedType> bed occupied"]` (e.g. `aria-label="One fewer ICU bed occupied"`)
    - State: `disabled` when `occupied <= 0`
  - Free Beds Text Counter:
    - Element: `<p className="...">free of {total}</p>`
    - Playwright Contract: `page.locator('p', { hasText: 'free of <Total>' })` (e.g. `page.locator('p', { hasText: 'free of 10' })`, verified in `e2e/referral-lifecycle.spec.ts:169`)
  - Capacity Status Badges:
    - `Full`: when `free <= 0` (color: `text-critical-600`)
    - `Low`: when `free / total < 0.2` (color: `text-warning-600`)
    - `Available`: when `free / total >= 0.2` (color: `text-success-600`)
- **Role Permission Guard**:
  - Non-nursing, non-admin users receive: `<div className="...">Access Denied. Nursing staff privileges required.</div>`

---

#### 1.2.2 Direct Admission Page & Modal (`src/pages/AdmitPatientPage.tsx` at `/admissions/new`)
- **Page Heading**:
  - Element: `<h1 ...>Direct Patient Admission</h1>`
  - Playwright Selector Contract: `page.getByRole('heading', { name: /Direct Patient Admission/i })`
- **Admin Facility Switcher**:
  - Element: `<select id="admitFacility" ...>`
  - Associated Label: `<label htmlFor="admitFacility">Admin View:</label>`
- **Direct Admission Form**:
  - Form Element: `<form onSubmit={handleSubmit}>`
  - Patient Name Input:
    - Element: `<input id="admitPatientName" type="text" required placeholder="Full Name" />`
    - Associated Label: `<label htmlFor="admitPatientName">Patient Name</label>`
  - Hospital ID (HID) Input:
    - Element: `<input id="admitHospitalId" type="text" required placeholder="e.g. H-12345" />`
    - Associated Label: `<label htmlFor="admitHospitalId">Hospital ID (HID)</label>`
  - Admitting Department Dropdown:
    - Element: `<select id="admitDepartment" required>`
    - Associated Label: `<label htmlFor="admitDepartment">Admitting Department</label>`
    - Options: populated dynamically from `facility.departments`
  - Bed Type Dropdown:
    - Element: `<select id="admitBedType" required>`
    - Associated Label: `<label htmlFor="admitBedType">Bed Type</label>`
    - Options: `<option value="Ward">General Ward</option>`, `<option value="ICU">ICU (Intensive Care)</option>`, `<option value="CCU">CCU (Cardiac Care)</option>`, `<option value="PICU">PICU (Pediatric ICU)</option>`
  - Submit Button:
    - Element: `<Button type="submit" ...>`
    - Accessible Name: `/Admit Patient & Update Capacity/i`
- **Active Direct Admissions List (`Currently Admitted (Direct)`)**:
  - Section Heading: `h2` with text `/Currently Admitted \(Direct\)/i`
  - Empty State: `No direct admissions currently active.`
  - Admission Card Row:
    - Patient Name: `<h3 ...>{admission.patientName}</h3>`
    - Badges / Text: `HID: {admission.hospitalId}`, `{admission.department}`, `<Badge variant="info">{admission.bedType}</Badge>`
    - Discharge Button: `button` with accessible name `/Discharge/i` (calls `dischargeDirectAdmission(admission.id)`)

---

#### 1.2.3 Referral Detail Page Post-Admission Banner (`src/pages/ReferralDetailPage.tsx`)
- **Admission Confirmation Banner**:
  - Element Text: `/Patient Admitted Successfully/i` (Verified in `e2e/referral-lifecycle.spec.ts:173`)
- **Action Consolidation**:
  - Once status is `admitted`, no further action buttons (except discharge if configured) or cancellation buttons are displayed (`CANCEL_LOCKED_STATUSES` invariant).

---

#### 1.2.4 Role Cockpit & Navigation Invariants (`NurseCockpit.tsx`, `AppSidebar.tsx`)
- **Nurse Cockpit Header**:
  - Element: `<h2 ...>Ward Capacity & Bed Management Console</h2>`
- **Direct Admit Action Button**:
  - Element: `<Link to="/admissions/new" ...>Direct Admit Walk-In</Link>`
- **Arrived Transfers Sub-Section**:
  - Header: `Arrived Transfers · Waiting for Bed Assignment`
  - Cards: Rendered via `ReferralCockpitCard` with `variant="nurse"` and button `Admit to <BedType> bed`
- **Sidebar Nav Links**:
  - Bed Management Link: `<Link to="/bed-management" ...>` (visible to nurse roles, leadership, admins)
  - Direct Admit Link: `<Link to="/admissions/new" ...>` (visible to nurse roles)

---

## 2. Logic Chain

### 2.1 State Flow & Mutation Lifecycle
1. **Referral Intake to Arrival**:
   - Referring Clinician submits referral at `/referrals/new` $\to$ status `pending`.
   - HoD at receiving facility reviews and approves $\to$ status `dept_approved`.
   - Hospital Manager signs off $\to$ status `manager_approved` $\to$ `accepted`.
   - Referring Clinician records patient consent $\to$ status `patient_consented`.
   - ER Official sets accompanying doctor escort and dispatches $\to$ status `in_transit`.
   - ER Official confirms arrival at receiving bay $\to$ status `arrived`.
2. **Arrived Queue to Admission on BedManagementPage**:
   - Nurse logs in and navigates to `/bed-management`.
   - `referrals.filter(r => r.status === 'arrived' && r.receivingFacilityId === facility.id)` populates the "Arrived · waiting to be admitted" queue.
   - Nurse clicks `Admit to ICU bed`.
   - `handleAdmit(referralId)` executes `updateReferralStatus(referralId, 'admitted')`.
   - Firestore transaction inside `DataContext.tsx`:
     - Reads existing referral document.
     - Sets `status = 'admitted'`.
     - Appends `{ status: 'admitted', timestamp: now, userId: user.id }` to `statusHistory`.
     - Increments receiving facility capacity: `facilities/{facilityId}.capacity[requiredBedType].occupied` by `+1` (via `increment(1)`).
     - Closes transaction.
   - Real-time snapshot updates `referrals` and `facilities`.
   - The referral leaves the `arrived` queue (dismissed from UI).
   - The ICU Stepper free bed counter instantly reflects the new count: `free = total - occupied` (e.g. 10 - 3 = 7).
   - Visiting `/referrals/{referralId}` displays the `Patient Admitted Successfully` banner.

3. **Direct Walk-In Admission Flow**:
   - Staff fills direct admission form (Patient Name, Hospital ID, Department, Bed Type).
   - `addDirectAdmission` creates a document in `directAdmissions` collection with `status: 'admitted'`.
   - Simultaneously fires `updateDoc` on `facilities/{facilityId}` with `capacity[bedType].occupied: increment(1)`.
   - When patient is discharged, `dischargeDirectAdmission` transactionally sets status to `'discharged'` and decrements `capacity[bedType].occupied: increment(-1)`.

4. **Debounced Stepper Capacity Adjustments**:
   - When a nurse taps `+` or `-` on a bed stepper:
     - Local component state `capacities` updates immediately (0ms latency for smooth UI feedback).
     - Existing timer for that `bedType` in `writeTimers.current` is cleared.
     - New timer set for 500ms.
     - After 500ms of user inactivity, `updateFacilityCapacity(facilityId, { [bedType]: { total, occupied } })` fires a single consolidated Firestore write.

---

## 3. Caveats & Edge Modes

1. **Firestore Security Rule Boundaries**:
   - Non-privileged accounts can only update bed `occupied` counts. Modifying `total` bed counts or altering `departments` requires facility leadership (`hospital_manager`, `deputy_manager`, `medical_director`) or system administrators (`owner`, `system_admin`).
   - Occupancy is strictly validated: `0 <= occupied <= total`. Attempts to set `occupied < 0` or `occupied > total` fail at the security rule layer.
   - Cross-facility direct admissions and capacity writes are strictly rejected unless caller is a verified user at that facility or system admin.
2. **Cancellation Lock Invariant**:
   - Statuses `in_transit`, `arrived`, `admitted`, `discharged`, `cancelled`, `rejected` permanently lock cancellation. Neither creator, senior managers, nor admins can cancel a referral once it reaches `in_transit` or `admitted`.
3. **Multi-Tab / Multi-Client Concurrency**:
   - All status transitions and capacity increments (`increment(1)`, `increment(-1)`) are handled inside Firestore `runTransaction` blocks to prevent race conditions when multiple nurses admit or discharge patients simultaneously.
4. **Offline Resilience & Caching**:
   - Bed stepper debouncing prevents excessive Firestore network traffic during rapid adjustments.
   - Direct admissions use Firestore offline cache when connection is interrupted.
5. **Backwards Route Compatibility**:
   - Both `/bed-management` and `/admissions/new` routes must remain functional and accessible to ensure external bookmarks, sidebar links, and existing unit tests pass seamlessly.

---

## 4. Conclusion

For Milestone 5 implementation to achieve a 100% test pass rate across both Playwright E2E and Vitest unit/integration suites:
1. **Exact Selector Contracts to Preserve**:
   - Heading: `/Bulk Bed Management/i` on `/bed-management`.
   - Heading: `/Direct Patient Admission/i` on `/admissions/new`.
   - Heading: `/Ward Capacity & Bed Management Console/i` on `NurseCockpit`.
   - Arrived patient row format: `<Name>, <Age>` (e.g. `'Sayed Abdel-Rahman, 58'`).
   - Admit button text: `/Admit to (ICU|CCU|PICU|Ward) bed/i`.
   - Stepper counter text: `free of <Total>` (e.g. `free of 10`).
   - Stepper button aria-labels: `One more <BedType> bed occupied` and `One fewer <BedType> bed occupied`.
   - Direct admission form field IDs: `#admitPatientName`, `#admitHospitalId`, `#admitDepartment`, `#admitBedType`, `#admitFacility`.
   - Direct admission submit button: `/Admit Patient & Update Capacity/i`.
   - Direct admission discharge button: `/Discharge/i`.
   - Referral Detail confirmation banner: `/Patient Admitted Successfully/i`.
2. **Capacity State Synchronization**:
   - Maintain debounced 500ms updates on steppers.
   - Ensure transactional capacity increment on referral admission and direct admission.
   - Ensure transactional capacity decrement on direct admission discharge.
3. **Unified Capacity Hub Architecture**:
   - Embed the direct walk-in admission workflow as a modal/drawer inside `BedManagementPage.tsx` while preserving the standalone `/admissions/new` route as a wrapper.

---

## 5. Verification Method

To independently verify all findings and test suite contracts, execute the following commands in the workspace root:

```bash
# 1. Vitest Unit & Integration Test Suite (all 59 test files / 568 tests)
npm test

# 2. Firestore Security Rules Unit Tests (runs against local emulator on port 8080)
npm run test:rules

# 3. TypeScript Typecheck and Linting
npm run lint

# 4. Playwright End-to-End Test Suite
npm run test:e2e

# 5. Production Webpack/Vite Build Verification
npm run build
```

Specific test files to inspect for verification:
- `e2e/referral-lifecycle.spec.ts` (lines 153–174)
- `tests/persona-lifecycle.test.ts` (lines 221–254, 465–508)
- `tests/rbac-boundaries.test.ts` (lines 588–606, 682–750)
- `tests/tier5-whitebox.adversarial.test.ts` (lines 542–644)
- `src/components/dashboard/DashboardCockpits.test.tsx` (lines 478–496)
- `src/contexts/DataContext.test.tsx` and `src/contexts/DataContext.cancel.test.tsx`
- `tests/firestore.rules.test.ts` (lines 93–97, 230–240, 712–750)
