# Comprehensive E2E Test Suite & Test Contract Analysis
**Ismailia Health Connect (`eha-transfer`)**
**Author**: Explorer Subagent (E2E Test Suite & Test Contract Explorer)
**Date**: 2026-08-28

---

## 1. Executive Summary

This document provides an exhaustive specification of the automated test suite for the Ismailia Health Connect application, with primary emphasis on the **Playwright End-to-End (E2E) test suite**, its underlying test harness, emulator seeding, role personas, navigation pathways, DOM selectors, accessibility queries, and UI contract invariants.

The primary objective is to equip the UX & Structural Redesign team with an immutable contract catalog so that layout restructuring, page merging, component rewrites, and UX modernizations will preserve **100% automated test pass rates** (`npm run test:e2e`, `npm run lint`, `npm run build`, `npm run test:rules`, `npm test`).

---

## 2. Test Suite Architecture & Execution Topology

### 2.1 Test Execution Matrix

| Test Suite / Script | Command | Target Engine | Environment / Backend | Key Files |
| :--- | :--- | :--- | :--- | :--- |
| **Playwright E2E** | `npm run test:e2e` | Playwright (`chromium`) | Firebase Emulators (Auth :9099, Firestore :8080) + Vite Dev Server (:3000) | `e2e/*.spec.ts`, `e2e/global-setup.ts`, `e2e/seed.ts`, `e2e/test-helpers.ts` |
| **Firestore Security Rules** | `npm run test:rules` | Vitest (`vitest.rules.config.ts`) | Firestore Emulator (:8080) in Node environment | `tests/firestore.rules.test.ts`, `firestore.rules` |
| **Vitest Unit & Integration** | `npm test` | Vitest (`vite.config.ts`) | JSDOM + fake-indexeddb | `tests/*.test.ts`, `src/**/*.test.ts(x)` |
| **TypeScript Compilation** | `npm run lint` | `tsc --noEmit` | Node / TypeScript 7.0 | Entire codebase |
| **Production Build** | `npm run build` | `vite build` | Rollup / Vite | Entire codebase |

### 2.2 Playwright Configuration (`playwright.config.ts`)

- **Directory**: `./e2e`
- **Concurrency**: `workers: 1`, `fullyParallel: false` (serialized execution to prevent emulator race conditions).
- **Timeouts**:
  - Test Timeout: `60,000ms` (60s)
  - Navigation Timeout: `45,000ms` (45s)
  - Action Timeout: `20,000ms` (20s)
  - Dev Web Server Startup Timeout: `180,000ms` (180s)
- **Base URL**: `http://localhost:3000`
- **Global Setup**: `./e2e/global-setup.ts`
- **Environment**: Injected `VITE_USE_FIREBASE_EMULATORS=true` points Firebase SDK to local emulator ports (`Auth: 127.0.0.1:9099`, `Firestore: 127.0.0.1:8080`, Project: `eha-transfer-1785622025`).

### 2.3 Emulator Seed Data & Personas (`e2e/seed.ts`, `e2e/global-setup.ts`)

#### Seeded Facilities
1. **`f1` / `E2E General Hospital`**: Type: `tertiary_care`, Location: `Test City`, Depts: `['Emergency', 'ICU']`, Beds: `ICU: 10/2, CCU: 0/0, PICU: 0/0, Ward: 20/5`.
2. **`test-referring-1` / `Referring Hospital`**: Type: `district_hospital`, Location: `Test City 1`, Depts: `['Emergency', 'ICU']`, Beds: `ICU: 10/2, CCU: 0/0, PICU: 0/0, Ward: 20/5`.
3. **`test-receiving-2` / `Receiving Hospital`**: Type: `tertiary_care`, Location: `Test City 2`, Depts: `['Emergency', 'ICU']`, Beds: `ICU: 10/2, CCU: 0/0, PICU: 0/0, Ward: 20/5`.

#### Seeded User Personas
| Key in `E2E_USERS` | Email | Password | Name | Role | Facility ID | Department |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `clinician` | `e2e.resident@example.com` | `e2e-password` | Dr. Resident | `resident` | `test-referring-1` | `ICU` |
| `specialist` | `e2e.specialist@example.com` | `e2e-password` | Dr. Specialist | `specialist` | `test-referring-1` | `ICU` |
| `hod` | `e2e.hod@example.com` | `e2e-password` | Dr. Head | `head_of_department` | `test-receiving-2` | `ICU` |
| `manager` | `e2e.md1@example.com` | `e2e-password` | Dr. Med Dir 1 | `medical_director` | `test-receiving-2` | `ICU` |
| `medical_director_receiving` | `e2e.md2@example.com` | `e2e-password` | Dr. Med Dir 2 | `medical_director` | `test-receiving-2` | `ICU` |
| `erOfficial` | `e2e.ero@example.com` | `e2e-password` | Dr. ER | `er_official` | `test-receiving-2` | `ICU` |
| `nurse` | `e2e.nurse@example.com` | `e2e-password` | Nurse Jane | `nurse` | `test-receiving-2` | `ICU` |
| `nursing_supervisor` | `e2e.ns@example.com` | `e2e-password` | Nurse Super | `nursing_supervisor` | `test-receiving-2` | `ICU` |
| `system_admin` | `e2e.admin@example.com` | `e2e-password` | Sys Admin | `system_admin` | `test-receiving-2` | `ICU` |
| `E2E_USER` (Legacy) | `e2e.clinician@example.com` | `e2e-password-not-a-secret` | E2E Clinician | `consultant` | `f1` | `ICU` |
| `E2E Owner` | `e2e.owner@example.com` | `e2e-owner-password` | E2E Owner | `owner` | *(none)* | *(none)* |

---

## 3. Catalog of Playwright E2E Tests & Scenarios

### Spec File 1: `e2e/auth.spec.ts`

- **Test Name**: `'has title and redirects to login when unauthenticated'`
- **User Flow**:
  1. Script clears `auth_user` from `localStorage`.
  2. Direct navigation to `/`.
  3. Expects redirect/render of login page.
- **Key Assertions**:
  - `page.getByRole('heading', { name: /sign in to your account/i })` is visible within 15,000ms.

---

### Spec File 2: `e2e/navigation.spec.ts`

- **Hook**: `beforeEach` signs in via UI using `E2E_USER` (`e2e.clinician@example.com`):
  1. `page.goto('/login')`
  2. `page.fill('input[type="email"]', E2E_USER.email)`
  3. `page.fill('input[type="password"]', E2E_USER.password)`
  4. `page.click('button[type="submit"]')`
  5. Waits for URL not to match `/\/login/`.

- **Test 1**: `'signs in and reaches the authenticated app'`
  - **Route Assertion**: `expect(page).toHaveURL(/\/referrals/)` within 15,000ms.
  - **DOM Heading**: `expect(page.getByRole('heading', { name: /^Referrals$/i })).toBeVisible()`.

- **Test 2**: `'signed-in user can open the dashboard'`
  - **Navigation**: `page.goto('/dashboard')`
  - **DOM Heading**: `expect(page.getByRole('heading', { name: /overview/i })).toBeVisible({ timeout: 15000 })`.

---

### Spec File 3: `e2e/referral-lifecycle.spec.ts`

- **Test Suite**: `'Complete Referral Lifecycle Journey'`
- **Test Name**: `'simulates end-to-end patient referral intake, HoD review, manager approval, consent, escort assignment, ambulance dispatch, arrival, and bed admission'`

#### Flow Breakdown:
1. **Step 1: Referral Intake (Referring Clinician - Dr. Resident)**
   - `loginAs(page, E2E_USERS.clinician)`
   - Navigate to `/referrals/new`
   - Verify heading: `page.getByRole('heading', { name: /New Referral Request/i })`
   - Form operations on `page.locator('form')`:
     - Select Department: `form.getByRole('button', { name: 'ICU', exact: true }).click()`
     - Disable Auto-Route: `autoRouteCheckbox = form.getByRole('checkbox', { name: 'Auto-Route' })` -> `uncheck()`
     - Receiving Facility: `form.locator('#receivingFacility').selectOption('test-receiving-2')`
     - Required Bed: `form.locator('#requiredBedType').selectOption('ICU')`
     - Priority: `form.locator('#priority').selectOption('urgent')`
     - Reason: `form.locator('#reasonForReferral').fill('Severe acute respiratory distress with hemodynamic instability')`
     - Accompanying Doctor checkbox: `form.locator('#requires-accompanying-doctor').check()` -> assert `toBeChecked()`
     - Patient Identity:
       - Hospital ID: `form.locator('#hospitalId').fill('ISM-98231')`
       - Name: `form.locator('#patientName').fill('Sayed Abdel-Rahman')`
       - Age: `form.locator('#patientAge').fill('58')`
       - Gender: `form.locator('#patientGender').selectOption('male')`
     - Patient Vitals:
       - HR: `form.locator('#vitalHr').fill('118')`
       - BP: `form.locator('#vitalBp').fill('135/85')`
       - SpO2: `form.locator('#vitalSpo2').fill('89')`
       - Temp: `form.locator('#vitalTemp').fill('38.2')`
       - RR: `form.locator('#vitalRr').fill('26')`
       - GCS: `form.locator('#vitalGcs').fill('14')`
     - Clinical Assessment:
       - Complaint: `form.locator('#complaint').fill('Sudden onset severe chest tightness and dyspnea')`
       - Presentation: `form.locator('#presentation').fill('Patient presented with acute hypoxemic respiratory failure')`
       - Diagnosis: `form.locator('#diagnosis').fill('Severe ARDS and acute coronary syndrome')`
       - Investigations: `form.locator('#investigations').fill('Trop I positive, ST elevation on Lead II')`
     - Media Upload:
       - Attach file: `form.locator('input[type="file"]').setInputFiles(mockFile)`
       - Verify image preview: `form.locator('img[alt="ecg_lead2_trace.png"]')` is visible.
     - Form Submit: `form.getByRole('button', { name: /Submit Referral/i }).click()`
     - Verification:
       - URL matches `/\/referrals/`
       - Patient row: `patientRow = page.locator('tbody tr', { hasText: 'Sayed Abdel-Rahman' })` is visible.
       - Click row -> URL matches `/\/referrals\/[a-zA-Z0-9_-]+/` -> extract `referralId`.

2. **Step 2: Head of Department Review (HoD - Dr. Head)**
   - `loginAs(page, E2E_USERS.hod)`
   - Navigate to `/referrals/${referralId}`
   - Verify patient name in body: `page.locator('body')` contains `'Sayed Abdel-Rahman'`.
   - Dept review section: `deptReviewSection = page.locator('#dept-review-section')` is visible.
   - Action selection: `deptReviewSection.locator('select').selectOption('direct_approval')`
   - Notes: `deptReviewSection.locator('textarea').fill('ICU Bed ready with dedicated ventilator and monitor. Direct approval.')`
   - Submit: `page.getByRole('button', { name: /Submit Review/i }).click()`
   - Verify badge: `page.getByText(/direct approval/i).first()` is visible.

3. **Step 3: Hospital Manager Approval (Medical Director - Dr. Med Dir 1)**
   - `loginAs(page, E2E_USERS.manager)`
   - Navigate to `/referrals/${referralId}`
   - Click: `page.getByRole('button', { name: /Accept the Transfer/i }).click()`
   - Advance status: `readyBtn = page.getByRole('button', { name: /Ready for Receive/i })` -> `click()` -> assert `not.toBeVisible()`.

4. **Step 4: Patient Consent & Escort Assignment & Transit Dispatch**
   - **4a (Clinician Consent)**:
     - `loginAs(page, E2E_USERS.clinician)`
     - Navigate to `/referrals/${referralId}`
     - Click: `consentBtn = page.getByRole('button', { name: /Accepted Transfer/i })` -> assert `not.toBeVisible()`.
   - **4b (ER Room Official Escort Assignment)**:
     - `loginAs(page, E2E_USERS.erOfficial)`
     - Navigate to `/referrals/${referralId}`
     - Section: `escortSection = page.locator('#escort-form-section')` is visible.
     - Fill Doctor Name: `escortSection.locator('input[type="text"]').fill('Dr. Youssef Kamel')`
     - Fill Doctor Phone: `escortSection.locator('input[type="tel"]').fill('01012345678')`
     - Submit: `page.getByRole('button', { name: /Save Accompanying Doctor/i }).click()`
     - Verify text rendered: `page.getByText(/Dr\. Youssef Kamel — 01012345678/i)` is visible.
   - **4c (Dispatch Ambulance)**:
     - Dispatch button: `dispatchBtn = page.getByRole('button', { name: /Dispatch Ambulance/i })` -> `toBeEnabled()` -> `click()`
     - Verify transit text: `page.getByText(/Currently in transit/i)` is visible.
   - **4d (Arrival Confirmation)**:
     - Click: `markArrivedBtn = page.getByRole('button', { name: /Mark as Arrived/i })` -> assert `not.toBeVisible()`.

5. **Step 5: Bed Admission & Capacity Tracking (Nurse Jane)**
   - `loginAs(page, E2E_USERS.nurse)`
   - Navigate to `/bed-management`
   - Verify heading: `page.getByRole('heading', { name: /Bulk Bed Management/i })`
   - Locate arrived patient row: `arrivedRow = page.getByText('Sayed Abdel-Rahman, 58')` -> `toBeVisible()`
   - Admit button: `admitBtn = page.getByRole('button', { name: /Admit to ICU bed/i })` -> `click()`
   - Assert `arrivedRow` is `not.toBeVisible()`.
   - Verify ICU bed occupancy update: `page.locator('p', { hasText: 'free of 10' })` is visible.
   - Navigate back to `/referrals/${referralId}`
   - Verify badge/text: `page.getByText(/Patient Admitted Successfully/i)` is visible.

---

### Spec File 4: `e2e/exceptions-edge-cases.spec.ts`

#### Test 1: Rejection Modal & Mandatory Reason Enforcement
1. Clinician creates referral for patient `'Tariq Mansour'` (`hospitalId: 'ISM-REJ-01'`, `age: '61'`, `ICU`, `urgent`).
2. Navigates to `/referrals`, clicks `tbody tr` with text `'Tariq Mansour'`, extracts `referralId`.
3. HoD logs in, completes direct approval review in `#dept-review-section`.
4. Manager logs in, navigates to `/referrals/${referralId}`.
5. Clicks `page.getByRole('button', { name: /Reject Transfer|Decline/i })`.
6. Modal verification:
   - Dialog: `modal = page.locator('div[role="dialog"]', { hasText: 'Reject Transfer' })` is visible.
   - Confirmation button: `confirmBtn = modal.getByRole('button', { name: /Confirm Rejection/i })` is initially **`toBeDisabled()`**.
   - Fill reason: `modal.locator('#rejectionReasonInput').fill('ICU bed capacity fully saturated due to emergency admissions')`.
   - Assert `confirmBtn` is **`toBeEnabled()`**.
   - Click `confirmBtn`.
7. Post-rejection state:
   - Modal closes (`modal` not visible).
   - Verify badge: `page.getByText(/Referral Rejected/i)` is visible.
   - Verify reason text: `page.getByText(/ICU bed capacity fully saturated due to emergency admissions/i).first()` is visible.

#### Test 2: Cancellation Modal & Mandatory Reason Enforcement
1. Clinician creates referral for patient `'Samira Fawzy'` (`hospitalId: 'ISM-CAN-02'`, `age: '45'`, `ICU`, `routine`).
2. Opens `/referrals/${referralId}`.
3. Clicks `page.getByRole('button', { name: /Cancel Referral/i })`.
4. Cancellation section displayed:
   - Warning text: `page.getByText(/This withdraws the referral and archives it/i)` is visible.
   - Confirm button: `confirmCancelBtn = page.getByRole('button', { name: /Confirm Cancellation/i })` is initially **`toBeDisabled()`**.
   - Fill reason: `page.locator('textarea[placeholder*="Reason for cancellation"]').fill('Surgery postponed by patient request; ICU transfer no longer required')`.
   - Assert `confirmCancelBtn` is **`toBeEnabled()`**.
   - Click `confirmCancelBtn`.
5. Post-cancellation state:
   - Verify badge: `page.getByText(/Referral Cancelled/i)` is visible.
   - Verify reason text: `page.getByText(/Surgery postponed by patient request; ICU transfer no longer required/i).first()` is visible.

#### Test 3: ECG Viewer Overlay Controls & High Contrast
1. Clinician creates referral for patient `'Adel El-Sayed'` (`hospitalId: 'ISM-ECG-03'`, `age: '67'`, `ICU`, `urgent`) with attachment `'patient_12_lead_ecg.png'`.
2. Opens `/referrals/${referralId}`.
3. Clicks `page.locator('button', { hasText: 'Quick View' })` (`{ force: true }`).
4. Viewer Modal: `viewerModal = page.locator('div[role="dialog"]', { hasText: 'ECG Quick-Viewer' })` is visible.
5. High Contrast Toggle:
   - Button: `contrastBtn = viewerModal.getByRole('button', { name: /Toggle high contrast|High Contrast/i })`
   - Initial state: `expect(contrastBtn).toHaveAttribute('aria-pressed', 'false')`
   - Click -> `expect(contrastBtn).toHaveAttribute('aria-pressed', 'true')`
   - Click -> `expect(contrastBtn).toHaveAttribute('aria-pressed', 'false')`
6. Zoom Controls:
   - Buttons: `zoomInBtn = viewerModal.getByLabel('Zoom in')`, `zoomOutBtn = viewerModal.getByLabel('Zoom out')`, `resetBtn = viewerModal.getByLabel('Reset view')`.
   - Scale checks:
     - Initial: `viewerModal.getByText('100%', { exact: true })` is visible.
     - Click Zoom In -> `viewerModal.getByText('150%', { exact: true })` is visible.
     - Click Zoom In -> `viewerModal.getByText('200%', { exact: true })` is visible.
     - Click Zoom Out -> `viewerModal.getByText('150%', { exact: true })` is visible.
     - Click Reset View -> `viewerModal.getByText('100%', { exact: true })` is visible.
7. Dismissal via Keyboard & UI:
   - Press `Escape` -> `viewerModal` is `not.toBeVisible()`.
   - Re-open via `Quick View` click.
   - Click `closeBtn = viewerModal.getByLabel('Close ECG viewer')` -> `viewerModal` is `not.toBeVisible()`.

---

## 4. Master Selector & Test Contract Catalog

The following tables document **every DOM selector, element ID, role query, button label, and text regex** strictly required by the E2E test suite.

### 4.1 Authentication & Global Shell (`e2e/auth.spec.ts`, `e2e/test-helpers.ts`, `e2e/navigation.spec.ts`)

| Target Element | Selector / Query Pattern | Context / Trigger | Required Behavior |
| :--- | :--- | :--- | :--- |
| **Login Heading** | `page.getByRole('heading', { name: /sign in to your account/i })` | Unauthenticated root `/` | Displayed when no active session exists |
| **Login Email** | `#loginEmail` or `input[type="email"]` | `/login` form | Accepts email text |
| **Login Password** | `#loginPassword` or `input[type="password"]` | `/login` form | Accepts password text |
| **Login Submit** | `button[type="submit"]` | `/login` form | Submits credentials and navigates to protected shell |
| **Nav Menu Trigger** | `button[aria-label^="Open menu"]` | `AppLayout` shell | Opens off-canvas menu / logout panel |
| **Logout Button** | `button` with text `'Log out'` | Inside opened menu drawer | Triggers session termination / handover modal |
| **Handover Confirm** | `button` with regex `/Send handover/i` | End-of-shift dialog | Confirms shift handover and completes logout |
| **Referrals Heading** | `page.getByRole('heading', { name: /^Referrals$/i })` | Authenticated `/referrals` | Renders upon landing after successful login |
| **Dashboard Overview** | `page.getByRole('heading', { name: /overview/i })` | Authenticated `/dashboard` | Rendered on dashboard landing |

### 4.2 New Referral Page (`/referrals/new`)

| Target Element | Selector / Query Pattern | Input / Element Type | Required Values / Actions |
| :--- | :--- | :--- | :--- |
| **Page Heading** | `page.getByRole('heading', { name: /New Referral Request/i })` | `h1` | Must render on `/referrals/new` |
| **Target Department** | `form.getByRole('button', { name: 'ICU', exact: true })` | Button (chip selector) | Toggles 'ICU' department selection |
| **Auto-Route Checkbox**| `form.getByRole('checkbox', { name: 'Auto-Route' })` | `<input type="checkbox">` | Can be checked/unchecked |
| **Receiving Facility** | `#receivingFacility` | `<select>` | Populated with facility options; selects `'test-receiving-2'` |
| **Required Bed Type** | `#requiredBedType` | `<select>` | Options: `'Ward'`, `'ICU'`, `'CCU'`, `'PICU'`; selects `'ICU'` |
| **Clinical Priority** | `#priority` | `<select>` | Options: `'routine'`, `'urgent'`, `'emergency'`; selects `'urgent'` or `'routine'` |
| **Reason for Transfer** | `#reasonForReferral` | `<input type="text">` | Mandatory reason string |
| **Accompanying Doctor**| `#requires-accompanying-doctor` | `<input type="checkbox">` | Flag for requiring medical escort |
| **Hospital ID** | `#hospitalId` | `<input type="text">` | Patient MRN/Hospital ID (e.g. `'ISM-98231'`) |
| **Patient Name** | `#patientName` | `<input type="text">` | Patient full name (e.g. `'Sayed Abdel-Rahman'`) |
| **Patient Age** | `#patientAge` | `<input type="number">` | Patient age (e.g. `'58'`) |
| **Patient Gender** | `#patientGender` | `<select>` | Options: `'male'`, `'female'` |
| **Heart Rate** | `#vitalHr` | `<input type="number">` | e.g. `'118'` |
| **Blood Pressure** | `#vitalBp` | `<input type="text">` | e.g. `'135/85'` |
| **SpO2** | `#vitalSpo2` | `<input type="number">` | e.g. `'89'` |
| **Temperature** | `#vitalTemp` | `<input type="number">` | e.g. `'38.2'` |
| **Respiratory Rate** | `#vitalRr` | `<input type="number">` | e.g. `'26'` |
| **GCS** | `#vitalGcs` | `<input type="number">` | e.g. `'14'` |
| **Chief Complaint** | `#complaint` | `<input type="text">` | Clinical complaint |
| **Presentation** | `#presentation` | `<textarea>` | History of present illness |
| **Diagnosis** | `#diagnosis` | `<textarea>` | Provisional diagnosis |
| **Investigations** | `#investigations` | `<textarea>` | Diagnostic investigations summary |
| **File Upload** | `input[type="file"]` | `<input type="file">` | Accepts file Buffer (e.g. `mockFile`) |
| **Attachment Thumbnail**| `img[alt="<filename>"]` | `<img>` | Rendered thumbnail preview with matching `alt` |
| **Submit Referral** | `form.getByRole('button', { name: /Submit Referral/i })` | `<button type="submit">` | Submits form and routes to `/referrals` |

### 4.3 Referrals List & Table (`/referrals`)

| Target Element | Selector / Query Pattern | Context / Trigger | Required Behavior |
| :--- | :--- | :--- | :--- |
| **Patient Row** | `page.locator('tbody tr', { hasText: '<Patient Name>' })` | Referral grid / table | Row containing patient name; clickable to navigate to `/referrals/:id` |
| **URL Navigation** | `page.waitForURL(/\/referrals\/[a-zA-Z0-9_-]+/)` | Row click | Navigates to `/referrals/:id` with dynamic referral ID |

### 4.4 Referral Detail Workspace (`/referrals/:id`)

| Action / Workflow Step | Target Selector / Element | Query Type | Expected Text / Value / Status |
| :--- | :--- | :--- | :--- |
| **Patient Identity Body Text** | `page.locator('body')` | Text container | Contains `<Patient Name>` |
| **Dept Review Section** | `#dept-review-section` | Container element | Visible to target Dept Head / Admin |
| **Dept Action Select** | `#dept-review-section locator('select')` | `<select>` | Options: `'direct_approval'`, `'urgent_approval'`, `'requirements_needed'`, `'scheduled_approval'`, `'no_role'` |
| **Dept Comment Text** | `#dept-review-section locator('textarea')` | `<textarea>` / `VoiceTextarea` | Review comment input |
| **Submit Review Button** | `page.getByRole('button', { name: /Submit Review/i })` | Button | Submits HoD review |
| **Dept Approved Badge** | `page.getByText(/direct approval/i).first()` | Text / Badge | Visible after HoD direct approval |
| **Manager Accept Button** | `page.getByRole('button', { name: /Accept the Transfer/i })` | Button | Progresses status from `dept_approved` to `manager_approved` |
| **Ready for Receive Button** | `page.getByRole('button', { name: /Ready for Receive/i })` | Button | Progresses status to `accepted`; disappears after click |
| **Manager Reject Button** | `page.getByRole('button', { name: /Reject Transfer|Decline/i })` | Button | Opens Rejection Modal |
| **Patient Consent Accept** | `page.getByRole('button', { name: /Accepted Transfer/i })` | Button | Records patient consent; progresses status to `patient_consented` |
| **Escort Section** | `#escort-form-section` | Container element | Visible to ER Official when `requiresAccompanyingDoctor` is true |
| **Escort Doctor Name** | `#escort-form-section locator('input[type="text"]')` | `<input>` | Escort doctor's name |
| **Escort Doctor Phone** | `#escort-form-section locator('input[type="tel"]')` | `<input>` | Escort doctor's phone number |
| **Save Escort Button** | `page.getByRole('button', { name: /Save Accompanying Doctor/i })` | Button | Persists accompanying doctor details |
| **Escort Details Badge** | `page.getByText(/<Doctor Name> — <Phone>/i)` | Text / Element | Rendered confirmation of assigned escort |
| **Dispatch Ambulance** | `page.getByRole('button', { name: /Dispatch Ambulance/i })` | Button | Enabled only when consent + escort fulfilled; moves to `in_transit` |
| **In-Transit Status** | `page.getByText(/Currently in transit/i)` | Text | Displayed while referral is in transit |
| **Mark as Arrived** | `page.getByRole('button', { name: /Mark as Arrived/i })` | Button | Moves referral status to `arrived` |
| **Cancel Referral Button** | `page.getByRole('button', { name: /Cancel Referral/i })` | Button | Opens cancellation workflow section |
| **Cancellation Warning** | `page.getByText(/This withdraws the referral and archives it/i)` | Text | Displayed in cancellation confirmation box |
| **Cancellation Reason** | `textarea[placeholder*="Reason for cancellation"]` | `<textarea>` | Required cancellation reason |
| **Confirm Cancel Button** | `page.getByRole('button', { name: /Confirm Cancellation/i })` | Button | Disabled when reason empty; enabled when filled |
| **Cancelled Status Badge** | `page.getByText(/Referral Cancelled/i)` | Badge / Text | Displayed after cancellation |
| **Rejection Modal Dialog**| `page.locator('div[role="dialog"]', { hasText: 'Reject Transfer' })` | Dialog container | Active modal for rejecting referral |
| **Rejection Reason Input**| `#rejectionReasonInput` | `<textarea>` / `<input>` | Required rejection reason |
| **Confirm Reject Button** | `modal.getByRole('button', { name: /Confirm Rejection/i })` | Button | Disabled when reason empty; enabled when filled |
| **Rejected Status Badge** | `page.getByText(/Referral Rejected/i)` | Badge / Text | Displayed after rejection |
| **Quick View ECG Button** | `page.locator('button', { hasText: 'Quick View' })` | Button | Opens ECG Viewer Overlay |

### 4.5 ECG Quick-Viewer Overlay (`ECGViewerOverlay`)

| Target Element | Selector / Query Pattern | Attribute / State | Required Action / Validation |
| :--- | :--- | :--- | :--- |
| **Viewer Modal** | `page.locator('div[role="dialog"]', { hasText: 'ECG Quick-Viewer' })` | `role="dialog"` | Must be visible when open |
| **High Contrast Toggle**| `viewerModal.getByRole('button', { name: /Toggle high contrast|High Contrast/i })` | `aria-pressed="false" \| "true"` | Toggles filter style and updates `aria-pressed` |
| **Zoom In Button** | `viewerModal.getByLabel('Zoom in')` | `aria-label="Zoom in"` | Increases zoom scale by 50% |
| **Zoom Out Button** | `viewerModal.getByLabel('Zoom out')` | `aria-label="Zoom out"` | Decreases zoom scale by 50% |
| **Reset View Button** | `viewerModal.getByLabel('Reset view')` | `aria-label="Reset view"` | Resets zoom scale to 100% |
| **Zoom Scale Indicator**| `viewerModal.getByText('100%', { exact: true })`, `'150%'`, `'200%'` | Text | Accurately displays current zoom percentage |
| **Close Viewer Button** | `viewerModal.getByLabel('Close ECG viewer')` | `aria-label="Close ECG viewer"` | Dismisses modal |
| **Keyboard Dismissal** | `Escape` key listener | Window keydown | Closes viewer on `Escape` |

### 4.6 Bed Management Page (`/bed-management`)

| Target Element | Selector / Query Pattern | Context / Trigger | Required Behavior |
| :--- | :--- | :--- | :--- |
| **Page Heading** | `page.getByRole('heading', { name: /Bulk Bed Management/i })` | Top of `/bed-management` | Must be visible |
| **Arrived Patient Row**| `page.getByText('<Patient Name>, <Age>')` | Arrived referrals section | Displays patient awaiting admission |
| **Admit to Bed Button** | `page.getByRole('button', { name: /Admit to ICU bed/i })` | Arrived row action | Admits patient to designated bed type |
| **Bed Occupancy Count** | `page.locator('p', { hasText: 'free of 10' })` | Bed stepper tile | Reflects updated free vs total bed count |
| **Admitted Badge** | `page.getByText(/Patient Admitted Successfully/i)` | `/referrals/:id` | Renders upon completed admission |

---

## 5. URL Route Structure & Navigation Contracts

The application routes configured in `App.tsx` and tested by E2E and Unit suites:

```
/login                     -> Login (Unauthenticated)
/onboarding                -> Onboarding (Incomplete profile)
/pending-verification      -> PendingVerification (Unverified staff)
/                          -> Redirects to /referrals (Protected)
├── /referrals             -> ReferralsPage (Primary grid/queue)
├── /referrals/new         -> NewReferralPage (Intake form / wizard)
├── /referrals/:id         -> ReferralWorkspacePane -> ReferralDetailPage
├── /dashboard             -> RoleBasedDashboard (AdminDashboard / ERDashboard / Dashboard)
├── /bed-management        -> BedManagementPage (Nurse / Supervisor bulk bed stepper)
├── /archive               -> ArchivePage (Admitted & Cancelled referrals archive)
├── /notifications         -> NotificationsPage
├── /admissions/new        -> AdmitPatientPage (Direct walk-in admissions)
├── /department            -> DepartmentPage (Head of Department shift roster & metrics)
├── /directory             -> NetworkDirectoryPage (Staff & Facility phone directory)
└── /facility-settings     -> FacilitySettingsPage (Manager / Director bed configuration)
```

---

## 6. UI Redesign & Page Merging: Compatibility Invariants & Guidelines

When redesigning the UX, merging views, or creating modern clinical workspaces, adhere to the following **architectural preservation rules**:

### Rule 1: Preserve Essential Form IDs and Selectors on New Referral
- Whether rendered as a single-page layout, a modern multi-step wizard, or a clinical intake drawer, the input fields for patient identity, vitals, clinical assessment, and routing **must retain their exact HTML `id` attributes** (`#hospitalId`, `#patientName`, `#patientAge`, `#patientGender`, `#vitalHr`, `#vitalBp`, `#vitalSpo2`, `#vitalTemp`, `#vitalRr`, `#vitalGcs`, `#complaint`, `#presentation`, `#diagnosis`, `#investigations`, `#receivingFacility`, `#requiredBedType`, `#priority`, `#reasonForReferral`, `#requires-accompanying-doctor`).
- The submit button must match `/Submit Referral/i`.
- The file input `input[type="file"]` must continue accepting image attachments and render preview images with `alt="<filename>"`.

### Rule 2: Preserve Role-Gated Action Sections on Referral Details
- HoD Review section must retain the container `#dept-review-section` containing a `<select>` with approval statuses and a `<textarea>`.
- ER Doctor Escort section must retain the container `#escort-form-section` containing text/tel inputs and the `Save Accompanying Doctor` button.
- Action buttons must maintain their accessible role names:
  - `/Accept the Transfer/i`
  - `/Ready for Receive/i`
  - `/Accepted Transfer/i`
  - `/Dispatch Ambulance/i`
  - `/Mark as Arrived/i`
  - `/Admit to ICU bed/i` (or `/Admit to (.*) bed/i`)
  - `/Reject Transfer|Decline/i`
  - `/Cancel Referral/i`

### Rule 3: Maintain Modal Dialogue Interfaces
- **Rejection Modal**: `div[role="dialog"]` with heading/text `Reject Transfer`, textarea `#rejectionReasonInput`, and button `/Confirm Rejection/i` that is disabled when the reason is empty and enabled when non-empty.
- **Cancellation Flow**: Displays `/This withdraws the referral and archives it/i`, textarea with placeholder matching `Reason for cancellation`, and button `/Confirm Cancellation/i` disabled when empty.
- **ECG Viewer Overlay**: `div[role="dialog"]` with text `ECG Quick-Viewer`, button `/Toggle high contrast|High Contrast/i` with `aria-pressed`, zoom buttons with labels `Zoom in`, `Zoom out`, `Reset view`, exact zoom percentages (`100%`, `150%`, `200%`), close button `Close ECG viewer`, and `Escape` key dismissal.

### Rule 4: Preserve Table and Row Selection Patterns
- The referrals list on `/referrals` must render accessible table rows (`tbody tr`) matching patient names so that `page.locator('tbody tr', { hasText: '...' }).click()` triggers navigation to `/referrals/:id`.

### Rule 5: Preserve Bed Management Counter Patterns
- Arrived patient row must display `<Patient Name>, <Age>` and button matching `/Admit to ICU bed/i`.
- Bed counter must render the text `free of <Total>` (e.g. `free of 10`).

---

## 7. Verification Method for Subagents & Teams

To verify the test suite locally against Firebase emulators:

```bash
# 1. Typecheck
npm run lint

# 2. Firestore Security Rules
npm run test:rules

# 3. Vitest Unit & Integration
npm test -- --run

# 4. Playwright E2E Test Suite against local emulators
npm run test:e2e

# 5. Production Build
npm run build
```
