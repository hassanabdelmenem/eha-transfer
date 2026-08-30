# Project: Ismailia Health Connect (eha-transfer) UX & Structural Redesign

## Architecture

### 1. App Shell, Navigation & Header Modernization
- **Modern Responsive Shell**:
  - Desktop (lg+): Persistent, collapsible sidebar with role-aware menu grouping (Clinical, Emergency, Capacity, Management, Admin) and status indicators.
  - Mobile (<lg): Fluid off-canvas drawer with bottom action bar for fast thumbs-reach mobile triage.
  - Top Bar: Universal hospital/user context banner, global referral search, real-time unread notification badge/popover, connection status indicator, and profile/logout popover.
- **Header Consolidation**:
  - Remove duplicated `<RoleHomeHeader />` across 6 distinct pages.
  - Global header handles role badge, current facility context, emergency escalation alerts, and navigation triggers cleanly without cluttering page bodies.

### 2. Streamlined Referral Intake Wizard (`NewReferralPage.tsx`)
- Unified responsive 4-step wizard replacing the 1086-line dual (mobile-wizard vs desktop-cards) implementation:
  - Step 1: Destination & Priority (Target facility, department, bed type, priority, accompanying escort requirement).
  - Step 2: Patient Demographics & Identification (Hospital ID, Name, Age, Gender, National ID, Phone).
  - Step 3: Vitals & Clinical Presentation (HR, BP, SpO2, Temp, RR, GCS, Chief Complaint, Presentation, Diagnosis, Investigations).
  - Step 4: Diagnostic Media & Review (File upload, ECG trace preview, review summary, and submission).
- Preserve all exact DOM element IDs for 100% E2E test compatibility (`#hospitalId`, `#patientName`, `#patientAge`, `#patientGender`, `#vitalHr`, `#vitalBp`, `#vitalSpo2`, `#vitalTemp`, `#vitalRr`, `#vitalGcs`, `#complaint`, `#presentation`, `#diagnosis`, `#investigations`, `#receivingFacility`, `#requiredBedType`, `#priority`, `#reasonForReferral`, `#requires-accompanying-doctor`).

### 3. Role-Adaptive Clinical Cockpits & Dashboards
- Modernized command center replacing fragmented `Dashboard.tsx`, `DepartmentPage.tsx`, and `ERDashboard.tsx` with role-tailored workspaces:
  - **Clinicians**: Triage queues ("My Referrals", "Incoming to My Unit", "Patients in Transit"), rapid filters, quick stats.
  - **Head of Department (HoD)**: Pinned escalation banner, department review queue with inline quick review and batch triaging.
  - **Hospital Managers & Medical Directors**: Transfer decision queue, facility capacity radar, bed availability heatmap.
  - **ER Officials**: Real-time ambulance radar, dispatch console, escort doctor assignment, arrival logger.
  - **Nurses & Bed Managers**: Active census, arrived transfer queue, quick-admission triggers.

### 4. Referral Detail & Clinical Timeline Console (`ReferralDetailPage.tsx`)
- Visual medical timeline tracking the 12-state referral lifecycle (`Sent` -> `Dept` -> `Manager` -> `Consent` -> `Transit` -> `Arrived` -> `Admitted`).
- Split-pane / structured card workspace:
  - Left Pane: Comprehensive patient demographics, clinical vitals summary, diagnostic attachments, and interactive ECG viewer.
  - Right Pane: Role-gated action card with clear state actions, preserving `#dept-review-section`, `#escort-form-section`, rejection modal (`#rejectionReasonInput`), and cancellation dialog.

### 5. Unified Bed & Capacity Console (`BedManagementPage.tsx` & `AdmitPatientPage.tsx`)
- Combined capacity management hub integrating:
  - Real-time bed census steppers (ICU, CCU, PICU, Ward) with debounced Firestore updates.
  - Arrived transfer quick-admission table with one-click bed assignment.
  - Embedded walk-in direct admission modal/sheet eliminating the need to jump to a detached route.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Responsive App Shell & Navigation | Sidebar, topbar, mobile drawer, notification popover | M1 | UX Survey |
| 2 | Header Unification & Token System | Retire redundant RoleHomeHeader, clean modern styling | M1 | UX Survey |
| 3 | Unified Referral Intake Wizard | 4-step responsive wizard, vitals validation, dropzone | M2 | UX & E2E Survey |
| 4 | Offline Draft & Submission Queue | LocalStorage draft caching, offline IndexedDB sync | M2 | Data Survey |
| 5 | Role-Adaptive Dashboard Cockpits | Tailored views for Clinician, HoD, Manager, ER, Nurse | M3 | UX & Data Survey |
| 6 | Queue Filtering & SLA Tracking | SLA countdown badges, escalation highlights, search | M3 | Data Survey |
| 7 | Medical Timeline & Detail Console | Split-view clinical summary, vitals badges, attachments | M4 | UX & E2E Survey |
| 8 | Role Action Panels & Modals | HoD review, Manager approval, Escort assign, Reject/Cancel | M4 | E2E & Data Survey |
| 9 | ECG Quick-Viewer Overlay | Zoom in/out/reset, high contrast mode, keyboard dismiss | M4 | E2E Survey |
| 10 | Integrated Capacity & Bed Console | Stepper census, arrived patient queue, quick-admit | M5 | UX & E2E Survey |
| 11 | Direct Admission Integration | Integrated walk-in admission workflow | M5 | UX Survey |
| 12 | End-to-End Test Suite Verification | 100% pass rate on Playwright test suite (`npm run test:e2e`) | M6 | Acceptance Criteria |
| 13 | Production Build Verification | Zero TypeScript errors, zero hook violations (`npm run build`) | M6 | Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | App Shell, Navigation & Design System | `AppLayout.tsx`, `Sidebar.tsx`, `TopBar.tsx`, header consolidation | none | DONE |
| M2 | Unified Referral Intake Wizard | `NewReferralPage.tsx` refactor, 4-step wizard, selector retention | M1 | DONE |
| M3 | Clinical Cockpits & Role Dashboards | `Dashboard.tsx`, `DepartmentPage.tsx`, `ERDashboard.tsx`, role views | M1 | DONE |
| M4 | Referral Detail, Timeline & Action Console | `ReferralDetailPage.tsx`, action sections, modals, ECG viewer | M1 | IN_PROGRESS |
| M5 | Integrated Bed Management & Capacity Hub | `BedManagementPage.tsx`, `AdmitPatientPage.tsx`, quick admissions | M1 | PLANNED |
| M6 | Full Pipeline & Acceptance Verification | `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build` | M1-M5 | PLANNED |

---

## Interface & DOM Test Contracts

### Form & Modal DOM Selectors (Playwright Invariants)
- **Referral Form (`/referrals/new`)**:
  - Destination: `#receivingFacility`, `#requiredBedType`, `#priority`, `#reasonForReferral`, `#requires-accompanying-doctor`
  - Patient Identity: `#hospitalId`, `#patientName`, `#patientAge`, `#patientGender`
  - Vitals: `#vitalHr`, `#vitalBp`, `#vitalSpo2`, `#vitalTemp`, `#vitalRr`, `#vitalGcs`
  - Clinical: `#complaint`, `#presentation`, `#diagnosis`, `#investigations`
  - File Upload: `input[type="file"]`, `img[alt="..."]`
  - Submit Button: accessible name `/Submit Referral/i`
- **Referral Detail (`/referrals/:id`)**:
  - HoD Review Section: `#dept-review-section` with `select` and `textarea`, button `/Submit Review/i`
  - Manager Action: button `/Accept the Transfer/i`, button `/Ready for Receive/i`
  - Consent Action: button `/Accepted Transfer/i`
  - Escort Form Section: `#escort-form-section` with `input[type="text"]`, `input[type="tel"]`, button `/Save Accompanying Doctor/i`
  - Dispatch Actions: button `/Dispatch Ambulance/i`, button `/Mark as Arrived/i`
  - Rejection Modal: dialog with title "Reject Transfer", `#rejectionReasonInput`, button `/Confirm Rejection/i`
  - Cancellation Modal: dialog with title "Cancel Referral", `textarea[placeholder*="Reason for cancellation"]`, button `/Confirm Cancellation/i`
  - ECG Viewer: dialog with text "ECG Quick-Viewer", button `/Toggle high contrast|High Contrast/i` with `aria-pressed`, labels `Zoom in`, `Zoom out`, `Reset view`, `Close ECG viewer`
- **Bed Management (`/bed-management`)**:
  - Heading: `/Bulk Bed Management/i`
  - Arrived Patient row with name and age, admit button `/Admit to (ICU|CCU|PICU|Ward) bed/i`

---

## Code Layout

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # Master application shell
│   │   ├── AppSidebar.tsx         # Responsive collapsible navigation sidebar
│   │   ├── AppTopBar.tsx          # Global top navigation, search, and user bar
│   │   ├── NotificationMenu.tsx   # Real-time alert notifications popover
│   │   └── RoleBadge.tsx          # Visual role taxonomy badge
│   ├── common/                    # UI primitives (Button, Modal, Input, Badge, Card, etc.)
│   ├── referrals/
│   │   ├── ReferralWizard/        # Responsive 4-step referral creation components
│   │   ├── ReferralTimeline.tsx   # Visual 12-state clinical lifecycle stepper
│   │   ├── ReferralActions/       # Role-specific review, approval, escort, and admission cards
│   │   └── ECGViewerModal.tsx     # Enhanced ECG quick viewer with zoom/contrast
│   ├── dashboard/                 # Role-adaptive cockpit widgets
│   └── beds/                      # Bed occupancy steppers and direct admission modal
├── pages/
│   ├── Dashboard.tsx              # Adaptive role dashboard
│   ├── NewReferralPage.tsx        # Streamlined referral wizard page
│   ├── ReferralDetailPage.tsx     # Comprehensive clinical referral console
│   ├── BedManagementPage.tsx      # Centralized capacity and admission hub
│   ├── ReferralsPage.tsx          # Clinical queues, filters, and search
│   └── ...                        # Auth, Settings, Analytics, Directory
├── contexts/
│   ├── AuthContext.tsx            # User authentication, idle timeout, role model
│   └── DataContext.tsx            # Realtime Firestore subscriptions, 25+ mutation methods
└── lib/                           # Routing algorithms, SLA rules, priority sorting, IndexedDB
```
