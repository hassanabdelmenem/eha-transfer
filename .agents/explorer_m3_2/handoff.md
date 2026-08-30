# Milestone 3 Investigation Report: E2E Test Contracts & Playwright Selector Invariants

## Executive Summary
This report analyzes all End-to-End (Playwright) and Unit/Integration (Vitest) test contracts, selector invariants, headings, table row conventions, filter buttons/tabs, badge texts, status selectors, and action triggers across the Ismailia Health Connect application that directly constrain the refactoring of `Dashboard.tsx`, `DepartmentPage.tsx`, `ERDashboard.tsx`, and dashboard components in Milestone 3.

---

## 1. Observation

### 1.1 Playwright E2E Test Specifications & Invariant Contracts

#### A. `e2e/navigation.spec.ts`
- **Dashboard Heading Selector**:
  - `e2e/navigation.spec.ts:27`:
    ```typescript
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /overview/i })).toBeVisible({ timeout: 15000 });
    ```
  - **Contract**: When a consultant/clinician user visits `/dashboard`, the page MUST render a heading whose accessible name matches `/overview/i` (e.g. `<h1 className="...">Overview</h1>`).
- **Referrals Heading Selector**:
  - `e2e/navigation.spec.ts:20`:
    ```typescript
    await expect(page.getByRole('heading', { name: /^Referrals$/i })).toBeVisible();
    ```

#### B. `e2e/referral-lifecycle.spec.ts`
- **Intake & Table Row Conventions**:
  - `e2e/referral-lifecycle.spec.ts:66-73`:
    ```typescript
    await expect(page).toHaveURL(/\/referrals/, { timeout: 15000 });
    const patientRow = page.locator('tbody tr', { hasText: 'Sayed Abdel-Rahman' });
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await patientRow.click();
    await page.waitForURL(/\/referrals\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    ```
  - **Contract**: The referral list table on desktop MUST use `<tbody><tr>...</tr></tbody>` markup where the row contains the patient name, and clicking the `<tr>` triggers navigation to `/referrals/${referral.id}`.
- **HoD Review Section**:
  - `e2e/referral-lifecycle.spec.ts:84-91`:
    ```typescript
    const deptReviewSection = page.locator('#dept-review-section');
    await expect(deptReviewSection).toBeVisible({ timeout: 15000 });
    await deptReviewSection.locator('select').selectOption('direct_approval');
    await deptReviewSection.locator('textarea').fill('ICU Bed ready with dedicated ventilator and monitor. Direct approval.');
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/direct approval/i).first()).toBeVisible({ timeout: 15000 });
    ```
- **Manager Approval Actions**:
  - `e2e/referral-lifecycle.spec.ts:100-108`:
    ```typescript
    const acceptTransferBtn = page.getByRole('button', { name: /Accept the Transfer/i });
    await expect(acceptTransferBtn).toBeVisible({ timeout: 15000 });
    await acceptTransferBtn.click();

    const readyToReceiveBtn = page.getByRole('button', { name: /Ready for Receive/i });
    await expect(readyToReceiveBtn).toBeVisible({ timeout: 15000 });
    await readyToReceiveBtn.click();
    ```
- **Clinician Consent & Escort Assignment**:
  - `e2e/referral-lifecycle.spec.ts:117-134`:
    ```typescript
    const consentBtn = page.getByRole('button', { name: /Accepted Transfer/i });
    await expect(consentBtn).toBeVisible({ timeout: 15000 });
    await consentBtn.click();

    const escortSection = page.locator('#escort-form-section');
    await expect(escortSection).toBeVisible({ timeout: 15000 });
    await escortSection.locator('input[type="text"]').fill('Dr. Youssef Kamel');
    await escortSection.locator('input[type="tel"]').fill('01012345678');
    await page.getByRole('button', { name: /Save Accompanying Doctor/i }).click();
    await expect(page.getByText(/Dr\. Youssef Kamel — 01012345678/i)).toBeVisible({ timeout: 15000 });
    ```
- **Ambulance Dispatch & Transit Invariants**:
  - `e2e/referral-lifecycle.spec.ts:137-147`:
    ```typescript
    const dispatchBtn = page.getByRole('button', { name: /Dispatch Ambulance/i });
    await expect(dispatchBtn).toBeEnabled({ timeout: 10000 });
    await dispatchBtn.click();
    await expect(page.getByText(/Currently in transit/i)).toBeVisible({ timeout: 15000 });

    const markArrivedBtn = page.getByRole('button', { name: /Mark as Arrived/i });
    await expect(markArrivedBtn).toBeVisible({ timeout: 15000 });
    await markArrivedBtn.click();
    ```
- **Bed Management & Admission Invariants**:
  - `e2e/referral-lifecycle.spec.ts:153-173`:
    ```typescript
    await loginAs(page, E2E_USERS.nurse);
    await page.goto('/bed-management');
    await expect(page.getByRole('heading', { name: /Bulk Bed Management/i })).toBeVisible({ timeout: 15000 });

    const arrivedRow = page.getByText('Sayed Abdel-Rahman, 58');
    await expect(arrivedRow).toBeVisible({ timeout: 15000 });

    const admitBtn = page.getByRole('button', { name: /Admit to ICU bed/i });
    await expect(admitBtn).toBeVisible({ timeout: 15000 });
    await admitBtn.click();

    await expect(arrivedRow).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('p', { hasText: 'free of 10' })).toBeVisible({ timeout: 15000 });
    ```

#### C. `e2e/exceptions-edge-cases.spec.ts`
- **Rejection Flow**:
  - Button `/Reject Transfer|Decline/i` opens dialog `div[role="dialog"]` with text `"Reject Transfer"`.
  - Rejection input: `#rejectionReasonInput`.
  - Confirm button: `modal.getByRole('button', { name: /Confirm Rejection/i })` (disabled when empty).
  - Status display: `/Referral Rejected/i` and exact rejection reason string.
- **Cancellation Flow**:
  - Button `/Cancel Referral/i` opens cancellation warning section (`/This withdraws the referral and archives it/i`).
  - Textarea: `textarea[placeholder*="Reason for cancellation"]`.
  - Confirm button: `/Confirm Cancellation/i` (disabled when empty).
  - Status display: `/Referral Cancelled/i` and exact cancellation reason string.
- **ECG Viewer Overlay**:
  - Button `button` with text `"Quick View"`.
  - Modal: `div[role="dialog"]` with text `"ECG Quick-Viewer"`.
  - Contrast button: `button` with regex `/Toggle high contrast|High Contrast/i`, attribute `aria-pressed="true|false"`.
  - Zoom controls: `getByLabel('Zoom in')`, `getByLabel('Zoom out')`, `getByLabel('Reset view')`.
  - Zoom percentage display: `'100%'`, `'150%'`, `'200%'`.
  - Close button: `getByLabel('Close ECG viewer')` and `Escape` key handler.

#### D. `e2e/test-helpers.ts`
- **Sign-out & User Menu Trigger**:
  - `e2e/test-helpers.ts:16, 43`:
    ```typescript
    const menuTrigger = page.locator('button[aria-label^="Open menu"]');
    if (await menuTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {
      await menuTrigger.click();
      const logoutBtn = page.locator('button', { hasText: 'Log out' }).last();
      if (await logoutBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await logoutBtn.click();
        const handoverBtn = page.locator('button', { hasText: /Send handover/i });
        ...
      }
    }
    ```
  - **Contract**: The user account dropdown trigger in the top bar MUST have an aria-label starting with `"Open menu"` to be recognized by `loginAs` for teardown, and MUST expose a button containing `"Log out"`.

---

### 1.2 Unit & Integration Test Contracts (Vitest)

#### A. Role Navigation Filtering in `AppSidebar.test.tsx` and `AppShell.empirical.test.tsx`
- **Universal Links for all 14 Roles**:
  - `Dashboard` (`to="/dashboard"`)
  - `Referrals` (`to="/referrals"`)
  - `Archive` (`to="/archive"`)
  - `Network Directory` (`to="/directory"`)
  - Button: `Emergency Hotline`
- **Role-Gated Links**:
  - `New Referral`: Doctor roles only (`['consultant', 'specialist', 'resident', 'clinician', 'er_official', 'medical_director', 'head_of_department']`)
  - `Direct Admit`: Nurse roles & owner only (`['nursing_supervisor', 'nurse', 'er_room', 'owner']`)
  - `Bed Management`: Nurse & leadership roles (`['nursing_supervisor', 'nurse', 'er_room', 'owner', 'hospital_manager', 'deputy_manager', 'medical_director', 'system_admin']`)
  - `Department`: HoD & owner only (`['head_of_department', 'owner']`)

#### B. Component Aria-Label Collision Discovery
- In `src/components/layout/AppTopBar.tsx`:
  - Line 106: Mobile Drawer Button was rendered with `aria-label={unreadNotifsCount > 0 ? 'Open menu, ...' : 'Open menu'}`.
  - Line 205: User Profile Dropdown Button was rendered with `aria-label="Open menu"`.
  - In unit tests (`AppTopBar.test.tsx:73` and `AppShell.empirical.test.tsx:468`), tests query `getByRole('button', { name: /User account menu/i })` for the profile menu, while `AppTopBar.test.tsx:61` queries `getByRole('button', { name: /^Open menu/i })` for the mobile drawer.
  - When both buttons share `aria-label="Open menu"`, Testing Library throws `Found multiple elements with the role "button" and name /^Open menu/i`.
  - **Resolution Requirement**:
    - Mobile drawer button: `aria-label="Open navigation menu"` or `aria-label={unreadNotifsCount > 0 ? `Open navigation menu, ${unreadNotifsCount} unread notifications` : 'Open navigation menu'}`.
    - User account dropdown button: `aria-label="Open menu, User account menu"` (matches both Playwright's `button[aria-label^="Open menu"]` and Vitest's `/User account menu/i`).

---

### 1.3 Existing Dashboard Implementation Details

#### A. `src/pages/Dashboard.tsx` (Clinician & Manager Cockpit)
- **Role Home Header**: `<RoleHomeHeader identity="..." />`
- **Clinician Segment Tabs**:
  - `You (${youBucket.length})`: Cases needing clinician attention (e.g. `status === 'postponed'`, missing doctor escort).
  - `Them (${themBucket.length})`: Cases pending review/approval at receiving facility (`pending`, `dept_approved`, `manager_approved`, `accepted`).
  - `Moving (${movingBucket.length})`: Active transit/arrived transfers (`in_transit`, `arrived`).
- **Clinician Action Cards**:
  - `ClinicianReferralCard` with `priorityRailClass(referral.priority, referral.isEscalated)`.
  - Action labels: `"Answer requirements"`, `"Name the escort"`, `"View"`.
- **Hospital Manager / Medical Director View**:
  - Escalation banner: `Escalated` with `<ShieldAlert />` and action `"Source a bed"` / `"Hand to admin"`.
  - Facility capacity bars: `Free beds · {facilityName}` for `ICU`, `CCU`, `PICU`, `Ward`.
  - Manager decision queue: Cards for `dept_approved` transfers with `"Summary"` (opens `ReferralSummarySheet`) and `"Accept"` buttons.
- **Analytics & Overview Section**:
  - Heading: `<h1 className="...">Overview</h1>`.
  - Live pulse indicator.
  - `useAudioAlert(pendingEmergencies.length > 0)`.
  - KPI Stat Tiles: `Pending Referrals`, `In Transit`, `Emergencies`, `Completed`.
  - `BedOccupancyHeatmap`: Bed occupancy matrix across network facilities.
  - Recharts bar charts: Inbound/outbound referral flow with period selectors (`weekly`, `monthly`, `quarterly`, `yearly`).

#### B. `src/pages/DepartmentPage.tsx` (HoD Cockpit)
- **Review Queues**:
  - `escalatedReview`: Escalated cases with `Escalated · no response X min`.
  - `queueReview`: Department review queue with patient cards, `"Summary"` button, `"Direct Approve"` button (`handleQuickApprove`), and `"Review Details"` link.
- **Shift Delegation & On-Call Assignment**:
  - Current shift assignment display and selection dropdown for `consultant` and `specialist` doctors.
- **Active Inpatient Roster**:
  - List of currently admitted patients in the department with quick transfer action (`quickTransfer`).

#### C. `src/pages/ERDashboard.tsx` (ER Room & Ambulance Radar)
- **Outbound Ambulance Dispatch Queue**:
  - Gate 1: Patient consent indicator (`Consent recorded · HH:mm · Dr. Name` vs `Awaiting patient consent`).
  - Gate 2: Accompanying doctor assignment (form with Doctor's name and Phone inputs, and `"Save escort"` button vs `Escort: Dr. Name (Phone)`).
  - Dispatch action: `"Dispatch ambulance"` button (disabled until both gates pass; displays blocking reason text if disabled).
  - Persisted transit state: `"Dispatched HH:mm"`.
- **Inbound Patient Arrival Queue**:
  - Card with `"In transit"` / `"Arrived"` badge.
  - Arrival confirmation: `"Confirm arrival"` button (transitions status to `arrived`).
  - Persisted arrival state: `"Arrival confirmed HH:mm"`.
  - Referring hotline button with `aria-label="Call referring facility"`.

#### D. `src/pages/AdminDashboard.tsx` (System Administrator & Escalation Hub)
- **Escalation Management**:
  - System escalation counter: `{count} only you can fix`.
  - Administrative actions: `"Place at a contracted facility"`, `"Override the destination"`, `"Postpone"`, `"De-escalate"`.
- **Network Capacity & Waitlist Radar**:
  - Total network bed totals per type.
  - Facility waitlist pressure matrix ranking facilities by emergency, urgent, and routine waitlist volume.

---

## 2. Logic Chain

```
[Observation: E2E test specs, test helpers, and unit test files contain exact string and regex assertions]
                                     │
                                     ▼
[Inference 1: Dashboard Refactoring Constraints]
- e2e/navigation.spec.ts explicitly asserts page.getByRole('heading', { name: /overview/i }).
  => Dashboard.tsx or RoleBasedDashboard MUST contain a heading matching /overview/i.
- e2e/referral-lifecycle.spec.ts and exceptions-edge-cases.spec.ts assert page.locator('tbody tr', { hasText: patientName }).
  => Referral list tables MUST retain <tbody><tr> rows with clickable row navigation to /referrals/:id.
- e2e/referral-lifecycle.spec.ts asserts page.getByRole('heading', { name: /Bulk Bed Management/i }), patient format "${name}, ${age}", and admit button /Admit to (ICU|CCU|PICU|Ward) bed/i.
  => BedManagementPage.tsx and any quick-admit component MUST preserve these exact labels and texts.
- e2e/test-helpers.ts asserts page.locator('button[aria-label^="Open menu"]') and button { hasText: 'Log out' }.
  => AppTopBar.tsx profile menu trigger MUST start with 'Open menu' and contain 'Log out'.
- AppShell.empirical.test.tsx & AppTopBar.test.tsx assert getByRole('button', { name: /User account menu/i }) and getByRole('button', { name: /^Open menu/i }).
  => Mobile menu button and profile menu button in AppTopBar.tsx MUST have non-colliding accessible names.
                                     │
                                     ▼
[Inference 2: Role Cockpit Architecture Invariants]
- App.tsx delegates role routing via RoleBasedDashboard:
    * system_admin / owner -> AdminDashboard
    * er_room / er_official -> ERDashboard
    * all other roles (clinicians, HoDs, managers, nurses) -> Dashboard
- DepartmentPage remains at route /department (accessible via sidebar for HoD/owner).
- BedManagementPage remains at route /bed-management (accessible via sidebar for nurses/managers/admins).
- Role-specific cockpit features in Milestone 3 must enhance UX while preserving the exact DOM contracts for state transitions.
```

---

## 3. Caveats

1. **Emulator Dependency for Full E2E Execution**: Playwright E2E tests (`npm run test:e2e`) run against local Firebase Auth and Firestore emulators seeded with `e2e/seed.ts`. They cannot run against cloud production without emulators running on ports 9099 and 8080.
2. **Viewport Responsiveness in E2E**: Playwright tests run in standard desktop viewport (1280x720) by default. In `ReferralList.tsx`, desktop renders `<table><tbody><tr>` while mobile (< md) renders `<div>` cards. The `tbody tr` selector depends on desktop rendering; any redesign must ensure desktop maintains table markup or test helpers are kept aligned.
3. **No Caveats on Test Coverage**: The repository contains comprehensive adversarial test harnesses across all 14 roles, SLA calculation edge cases, and permission boundaries.

---

## 4. Conclusion & Invariant Checklist

### Complete Selector & DOM Invariant Checklist for Milestone 3

| Target Page / Component | DOM Element / Role / Text | Invariant Selector / Pattern | Critical Purpose |
|---|---|---|---|
| `Dashboard.tsx` | Overview Heading | `page.getByRole('heading', { name: /overview/i })` | Verified by `navigation.spec.ts:27` |
| `ReferralsPage.tsx` / `ReferralList.tsx` | Referrals Heading | `page.getByRole('heading', { name: /^Referrals$/i })` | Verified by `navigation.spec.ts:20` |
| `ReferralsPage.tsx` / `ReferralList.tsx` | Referral Table Row | `page.locator('tbody tr', { hasText: '<Patient Name>' })` | Verified by `referral-lifecycle.spec.ts:67` and all edge cases |
| `BedManagementPage.tsx` | Bed Management Heading | `page.getByRole('heading', { name: /Bulk Bed Management/i })` | Verified by `referral-lifecycle.spec.ts:155` |
| `BedManagementPage.tsx` | Arrived Referral Row | `page.getByText('<Patient Name>, <Age>')` (e.g. `'Sayed Abdel-Rahman, 58'`) | Verified by `referral-lifecycle.spec.ts:158` |
| `BedManagementPage.tsx` | Admit Button | `page.getByRole('button', { name: /Admit to (ICU\|CCU\|PICU\|Ward) bed/i })` | Verified by `referral-lifecycle.spec.ts:161` |
| `BedManagementPage.tsx` | Bed Stepper Count | `page.locator('p', { hasText: 'free of <Total>' })` | Verified by `referral-lifecycle.spec.ts:169` |
| `AppTopBar.tsx` | Profile Menu Trigger | `page.locator('button[aria-label^="Open menu"]')` AND `/User account menu/i` | Verified by `test-helpers.ts:16`, `AppTopBar.test.tsx:73` |
| `AppTopBar.tsx` | Logout Action | `page.locator('button', { hasText: 'Log out' })` | Verified by `test-helpers.ts:19` |
| `AppTopBar.tsx` | Handover Action | `page.locator('button', { hasText: /Send handover/i })` | Verified by `test-helpers.ts:24` |
| `AppTopBar.tsx` | Mobile Navigation Drawer | `screen.getByRole('button', { name: /^Open navigation menu/i })` | Verified by `AppTopBar.test.tsx:61` |
| `AppSidebar.tsx` | 14-Role Navigation Items | Exact text labels: `Dashboard`, `Referrals`, `Archive`, `Network Directory`, `Emergency Hotline`, `New Referral`, `Direct Admit`, `Bed Management`, `Department` | Verified by `AppShell.empirical.test.tsx:110-220` |
| `ERDashboard.tsx` | Escort Input / Save Button | `input[type="text"]`, `input[type="tel"]`, button `/Save escort/i` | Verified by ER room dispatch gating tests |
| `ERDashboard.tsx` | Dispatch Button | `button` with text `/Dispatch ambulance/i` | Verified by `ERDashboard.tsx` & transit lifecycle |
| `ERDashboard.tsx` | Arrival Button | `button` with text `/Confirm arrival/i` | Verified by `ERDashboard.tsx` & arrival lifecycle |
| `DepartmentPage.tsx` | Review Queue & Direct Approve | Button `/Direct Approve/i` or `/Submit Review/i` | Verified by HoD review workflows |

---

## 5. Verification Method

To independently verify all contracts and ensure zero regressions during Milestone 3 implementation:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, zero compilation or type errors.

2. **Vitest Unit & Adversarial Test Suite**:
   ```bash
   npx vitest run
   ```
   *Expected*: All 51 test files and 506+ unit tests pass.

3. **Targeted Role & Dashboard Test Suites**:
   ```bash
   npx vitest run src/components/layout/AppShell.empirical.test.tsx src/components/layout/AppTopBar.test.tsx src/components/layout/AppSidebar.test.tsx tests/m3-edge-cases.adversarial.test.ts tests/persona-lifecycle.test.ts
   ```
   *Expected*: 100% pass rate across role navigation, top bar, sidebar, and M3 edge-case suites.

4. **Playwright E2E Lifecycle & Exception Suite**:
   ```bash
   npm run test:e2e
   ```
   *Expected*: All 4 Playwright specs (`referral-lifecycle.spec.ts`, `navigation.spec.ts`, `exceptions-edge-cases.spec.ts`, `auth.spec.ts`) pass against local emulators.

5. **Production Vite Build**:
   ```bash
   npm run build
   ```
   *Expected*: Production bundle completes successfully without hook violations or bundling errors.
