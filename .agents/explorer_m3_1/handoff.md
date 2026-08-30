# Milestone 3 Investigation Report: Clinical Cockpits & Role Dashboards

**Investigator**: Explorer 1 (`explorer_m3_1`)  
**Scope**: Requirements, current implementation, consolidation strategy, and component architecture for `src/pages/Dashboard.tsx`, `src/pages/DepartmentPage.tsx`, `src/pages/ERDashboard.tsx`, and `src/components/dashboard/*`.  
**Date**: 2026-08-29

---

## 1. Executive Summary

Milestone 3 focuses on transforming fragmented, monolithic, and partially redundant dashboard implementations into **unified, role-adaptive Clinical Cockpits**. Currently, clinical triage, department approvals, emergency logistics, and bed management workflows are splintered across `Dashboard.tsx` (780 lines), `DepartmentPage.tsx` (420 lines), `ERDashboard.tsx` (269 lines), `AdminDashboard.tsx` (281 lines), and `BedManagementPage.tsx` (259 lines).

This investigation delivers:
1. An exhaustive audit of existing dashboard implementations, data flows, and role boundaries.
2. A role-specific requirements matrix covering all 14 application roles grouped into 6 clinical personas: **Clinicians**, **Head of Department (HoD)**, **Hospital Managers**, **ER Officials**, **Nurses / Bed Managers**, and **System Administrators**.
3. A concrete **Consolidation Architecture** that eliminates duplicated card components, disparate queue sorters, and redundant state queries while maintaining 100% functional completeness and strict compliance with Playwright E2E test invariants.
4. A component decomposition plan for `src/components/dashboard/` featuring specialized, accessible, and responsive cockpit widgets.

---

## 2. Direct Observations & Codebase Analysis

### 2.1 `src/pages/Dashboard.tsx` (780 lines)
- **Lines 1–48**: Defines `ClinicianReferralCard` locally. It renders a priority rail (`priorityRailClass`), priority chip (`priorityChipClasses`), action sentence for postponed/unassigned escort referrals, and a navigation button.
- **Lines 49–84**: Fetches context state from `useData()` (`referrals`, `facilities`, `facilitiesById`, `usersById`, `directAdmissions`, `shiftLogs`, `loading`, `isOnline`, `pendingSyncCount`, `updateReferralStatus`). Filters `facilityReferrals` based on user facility and system admin roles.
- **Lines 85–178**: Builds Recharts data structures (`dynamicChartData`, `departmentChartData`) aggregating volume (incoming vs outgoing) and distribution by transfer type (`one_way`, `service_and_return`, `assessment_with_return`) across 4 time periods (weekly, monthly, quarterly, yearly).
- **Lines 180–205**: Calculates top-level KPI metrics (`pending`, `inTransit`, `emergencies`, `completed`). Invokes `useAudioAlert(pendingEmergencies.length > 0)`.
- **Lines 207–270**: Implements segmented triage buckets for clinicians:
  - `"you"` bucket (`youBucket`): Referrals with status `postponed` or `patient_consented` needing an accompanying doctor.
  - `"them"` bucket (`themBucket`): Referrals with status `pending`, `dept_approved`, `manager_approved`, or `accepted`.
  - `"moving"` bucket (`movingBucket`): Referrals with status `in_transit` or `arrived`.
  - Implements Manager signature queue (`managerQueue`: `dept_approved` status at user facility) and manager escalations (`managerEscalations`).
- **Lines 272–435**: Renders header with `RoleHomeHeader`, offline banner, Manager view (escalation card, bed progress bars, manager approval grid with Summary modal & Accept CTA), or Clinician view (triage segment switcher and `ClinicianReferralCard` grid), plus bottom action bar (New Referral, Search, Directory).
- **Lines 437–473**: Renders an "Overview" heading (`<h1 className="text-2xl font-bold ...">Overview</h1>`), live update indicator, audio alert banner, and 4 KPI stat tiles. *(Note: `e2e/navigation.spec.ts:27` asserts that `/overview/i` heading is visible on `/dashboard`)*.
- **Lines 474–582**: Renders "Currently Admitted" card, HoD Department Review Queue snippet (`hodQueue`), and Recent Shift Logs (`recentShiftLogs`).
- **Lines 584–676**: Renders `BedOccupancyHeatmap` and Recharts analytics (Volume, Distribution, Department breakdown) for managers/admins.
- **Lines 677–740**: Renders "Incoming Referrals Grid" using `<ReferralList limit={5} facilityId={user.facilityId} prioritySort={prioritySort} />`.
- **Lines 742–775**: Renders Shift Handover card for clinical roles.

### 2.2 `src/pages/DepartmentPage.tsx` (420 lines)
- **Lines 18–44**: Access control restricted to `head_of_department` and `owner`/`system_admin`. Allows admins to select facility and department.
- **Lines 45–82**: Filters `deptAdmissions`, `deptReferrals`, `patientsInDept`, and `pendingReview` (`status === 'pending'` for user's department). Segregates into `escalatedReview` (pinned at top with elapsed minutes and call referrer button) and `queueReview` (with Summary sheet trigger and `handleQuickApprove` direct approval CTA).
- **Lines 89–98**: `handleQuickApprove` calls `addDeptComment(id, 'direct_approval', '')`.
- **Lines 100–113 & 356–414**: Implements modal for internal patient transfer between departments (`quickTransfer`).
- **Lines 282–355**: Implements shift delegation to available department doctors (`shiftAssignments`, `assignShift`).

### 2.3 `src/pages/ERDashboard.tsx` (269 lines)
- **Lines 16–126**: Defines `OutboundMobileCard`:
  - Checks if patient consent has been recorded (`status === 'patient_consented'`).
  - If `requiresAccompanyingDoctor` is true, displays escort input fields (`#escort-form-section` equivalent) with name and phone inputs, validating prior to allowing ambulance dispatch.
  - "Dispatch ambulance" button triggers `updateReferralStatus(id, 'in_transit', 'Ambulance dispatched by ER team')`.
- **Lines 128–164**: Defines `InboundMobileCard`:
  - Displays incoming patient details, "In transit" or "Arrived" badge, "Confirm arrival" button calling `updateReferralStatus(id, 'arrived', 'Patient arrived at ER')`, and direct telephone link to referrer.
- **Lines 166–268**: Main `ERDashboard` component rendering `outboundQueue` (`['accepted', 'patient_consented', 'in_transit']`) and `inboundQueue` (`['in_transit', 'arrived']`).

### 2.4 `src/pages/AdminDashboard.tsx` (281 lines)
- **Lines 28–63**: Global bed capacity tally across all facilities (ICU, CCU, PICU, Ward).
- **Lines 64–106**: System-level escalations (`systemEscalations`: `isEscalated && escalationLevel === 'system'`). Provides actions: Postpone, De-escalate, and Destination Override (`overrideReferralDestination`) for contracted placement.
- **Lines 107–128**: Waitlist pressure calculation by facility (tallies emergency, urgent, routine waiting transfers).

### 2.5 `src/pages/BedManagementPage.tsx` (259 lines)
- **Lines 13–63**: Defines `BedStepper` with debounced Firestore updates (500ms) for ICU, CCU, PICU, and Ward capacity adjustments.
- **Lines 69–83**: Defines `ArrivedReferralRow` for patients with status `'arrived'` waiting to be admitted, with one-click "Admit to [BedType] bed" calling `updateReferralStatus(id, 'admitted')`.

### 2.6 `src/components/dashboard/BedOccupancyHeatmap.tsx` (91 lines)
- Displays facility capacity matrix by bed type (ICU, CCU, PICU, Ward) with color-coded occupancy percentage tiers (>=90% critical, >=70% warning, <70% success).

### 2.7 Routing & Navigation Architecture in `App.tsx` and `AppSidebar.tsx`
- In `App.tsx:69-78`: `RoleBasedDashboard` branches dynamically:
  ```tsx
  const RoleBasedDashboard = () => {
    const { user } = useAuth();
    if (user?.role === 'system_admin' || user?.role === 'owner') return <AdminDashboard />;
    if (user?.role === 'er_room' || user?.role === 'er_official') return <ERDashboard />;
    return <Dashboard />;
  };
  ```
- In `AppSidebar.tsx`:
  - `/dashboard` is the universal top link for all users.
  - `/department` is rendered for `head_of_department` and leadership.
  - `/bed-management` is rendered for nurses and leadership.
  - `/admissions/new` is rendered for nurses.

---

## 3. Role-Specific Cockpit Requirements Matrix

| Clinical Persona | Associated Roles | Primary Cockpit Needs & Workflow Highlights | Key Actions & Automation |
|---|---|---|---|
| **Clinicians** | `clinician`, `resident`, `specialist`, `consultant` | - **Triage Queues**: Segmented into "Action Needed" (postponed / missing escort), "Under Review" (pending / dept / manager), "In Transit / Arrived".<br>- **Inbound to My Unit**: Incoming patients to user's specialty.<br>- **Workload Stats**: Active referrals initiated, emergency count, SLA timers.<br>- **Quick Actions**: "+ New Referral", Hotline, Directory. | - Quick edit / answer requirements<br>- Name accompanying doctor<br>- View live timeline & ECG trace |
| **Head of Department (HoD)** | `head_of_department` | - **Pinned Escalations**: High-priority alert banner with timer and direct call trigger.<br>- **Unit Review Queue**: Inbound pending transfers filtered to HoD's department with quick Summary sheet.<br>- **Shift Delegation**: View and delegate on-call doctor from available department specialists.<br>- **Unit Census & Internal Transfers**: Real-time roster of admitted patients with quick transfer dialog. | - 1-Click Direct Approval (`direct_approval`)<br>- Request requirements / Postpone<br>- Reassign / revoke shift delegation<br>- Internal ward transfer |
| **Hospital Managers & Medical Directors** | `hospital_manager`, `deputy_manager`, `medical_director` | - **Decision Queue**: Referrals in `dept_approved` state awaiting manager sign-off.<br>- **Facility Escalations**: Facility-level SLA breaches / capacity alerts.<br>- **Capacity Radar**: Bed availability steppers & occupancy ratios.<br>- **Network Bed Heatmap**: Cross-facility capacity matrix.<br>- **Flow Analytics**: Real-time charts for volume, transfer types, and departmental demand. | - 1-Click Accept (`manager_approved`)<br>- Rejection modal with required reason logging<br>- Ready for receive trigger (`accepted`) |
| **Emergency Logistics (ER Officials)** | `er_official`, `er_room` | - **Ambulance Radar**: Dual-pane outbound vs inbound live transit queues.<br>- **Escort Doctor Guard**: Mandatory validation of doctor name + phone before dispatch.<br>- **Dispatch Console**: 1-Click "Dispatch Ambulance" (`in_transit`).<br>- **Arrival Logger**: 1-Click "Confirm Arrival" (`arrived`) with timestamp preservation. | - Add/update accompanying doctor<br>- Ambulance dispatch with audio alert<br>- Arrival confirmation<br>- Direct referrer telephone link |
| **Nurses & Bed Managers** | `nurse`, `nursing_supervisor` | - **Capacity Steppers**: Fast local UI steppers with debounced Firestore sync.<br>- **Arrived Transfer Queue**: List of physically arrived patients awaiting bed allocation.<br>- **Active Ward Census**: Current admitted patient roster with department filters.<br>- **Direct Walk-in Admissions**: Shortcut to direct admit form. | - 1-Click Bed Admission (`admitted`)<br>- Quick capacity adjustment<br>- Direct patient admission |
| **System Administrators** | `system_admin`, `owner` | - **System Escalation Console**: Network-wide unplaced referrals (no beds, no matching facility, SLA breach).<br>- **Global Capacity Gauges**: Network totals per bed type.<br>- **Destination Override**: Direct placement into contracted / partner facilities.<br>- **Waitlist Pressure Radar**: Breakdown of queued referrals per facility. | - Override destination<br>- Postpone / De-escalate<br>- System-wide audit inspection |

---

## 4. Consolidation & Redundancy Elimination Strategy

### 4.1 Identified Redundancies
1. **Duplicate Card Components**:
   - `ClinicianReferralCard` in `Dashboard.tsx` (lines 23–47)
   - Inline Manager cards in `Dashboard.tsx` (lines 339–356)
   - `escalatedReview` / `queueReview` cards in `DepartmentPage.tsx` (lines 177–238)
   - `OutboundMobileCard` / `InboundMobileCard` in `ERDashboard.tsx` (lines 16–164)
   - `ArrivedReferralRow` in `BedManagementPage.tsx` (lines 69–83)
   - `PatientCard.tsx` / `ReferralList.tsx`
2. **Duplicated Approval & Status Logic**:
   - Manager approval buttons exist in both `Dashboard.tsx:351` and `ReferralDetailPage.tsx`.
   - HoD review buttons exist in both `DepartmentPage.tsx:228` and `Dashboard.tsx:542` and `ReferralDetailPage.tsx`.
   - Ambulance dispatch and arrival buttons exist in both `ERDashboard.tsx:109,146` and `ReferralDetailPage.tsx`.
3. **Fragmented Page Boundaries**:
   - `ERDashboard.tsx` and `AdminDashboard.tsx` were decoupled from `Dashboard.tsx` via `RoleBasedDashboard` in `App.tsx`, creating three separate monolithic entry points with duplicated context fetching, audio alerts, and shell styling.
   - `DepartmentPage.tsx` duplicated the HoD approval workflow while `Dashboard.tsx` rendered a tiny secondary HoD queue.

### 4.2 Unified Cockpit Architecture
Rather than having fragmented dashboard pages, we consolidate the presentation into a single cohesive, role-adaptive cockpit system:

```
src/
├── pages/
│   ├── Dashboard.tsx                   # Master Adaptive Cockpit Controller (resolves role -> renders specialized cockpit)
│   ├── DepartmentPage.tsx             # Specialized HoD workspace (re-uses HoD cockpit components, maintains /department URL)
│   ├── ERDashboard.tsx                # Specialized ER workspace (re-uses ER cockpit components, maintains /dashboard ER routing)
│   ├── AdminDashboard.tsx             # Specialized Admin workspace (re-uses Admin cockpit components)
│   └── BedManagementPage.tsx          # Capacity Hub (re-uses BedStepper & ArrivedTransferQueue)
└── components/
    └── dashboard/
        ├── ClinicianCockpit.tsx       # Triage queues, "You/Them/Moving/Inbound", Clinician KPIs
        ├── HodCockpit.tsx             # Pinned Escalations, Unit Review Queue, Shift Delegation, Census
        ├── ManagerCockpit.tsx         # Decision Queue, Bed Radar, Heatmap, Volume & Flow Analytics
        ├── ERCockpit.tsx              # Outbound Transit (Escort Guard), Inbound Transit (Arrival Logger)
        ├── NurseCockpit.tsx           # Capacity Stepper Widget, Arrived Admissions, Active Census
        ├── AdminCockpit.tsx           # System Escalations, Global Totals, Destination Override
        ├── DashboardStatGrid.tsx      # Standardized 4-tile KPI stat grid (Pending, In-Transit, Emergency, Completed)
        ├── EscalationAlertBanner.tsx  # Pinned Escalation Banner with live timer, caller link, and severity styling
        ├── ReferralCockpitCard.tsx    # Unified, polymorphic card for triage queues with role-specific actions
        ├── BedOccupancyHeatmap.tsx    # Bed occupancy heatmap table (contrast-safe)
        ├── FacilityAnalyticsCharts.tsx# Recharts bar charts for Volume, Type Distribution, Department flow
        └── ShiftHandoverFeed.tsx      # Recent shift logs / handover feed
```

---

## 5. UI/UX Layout Recommendations & Component Breakdown

### 5.1 `src/components/dashboard/ReferralCockpitCard.tsx`
A unified, accessible card component replacing the 5 disjoint card implementations:
- **Header**: Patient name, age, gender, required bed type, referring facility name, and priority chip (`priorityChipClasses`).
- **Urgency Rail**: Left-border color coding based on priority and escalation status (`priorityRailClass`).
- **SLA Countdown & Escalation Badge**: Embedded `UrgencyTimer` badge showing elapsed / remaining SLA window.
- **Contextual Action Slot**:
  - *Clinician*: View detail, or "Answer requirements" / "Name escort" if in "You" bucket.
  - *HoD*: Quick Summary Sheet button + 1-Click "Approve" (`direct_approval`) CTA.
  - *Manager*: Quick Summary Sheet button + 1-Click "Accept" (`manager_approved`) CTA.
  - *ER Outbound*: Escort doctor input fields + "Dispatch Ambulance" CTA.
  - *ER Inbound*: "Confirm Arrival" CTA + Referrer Phone link.
  - *Nurse*: "Admit to [BedType] bed" CTA.
- **Accessibility**: Minimum 48px/52px touch targets, full keyboard navigability, high contrast text.

### 5.2 `src/components/dashboard/EscalationAlertBanner.tsx`
A prominent, pinned critical alert container:
- Renders at the top of HoD, Manager, and Admin dashboards when active escalations exist.
- Displays escalation reason, elapsed minutes without response, patient demographics, and required bed type.
- Integrated quick actions: "Review now", "Source a bed", "Override destination", and a direct telephone call trigger (`tel:...`).
- Accessible color scheme using `bg-critical-700` and `text-white` with `aria-live="polite"`.

### 5.3 `src/components/dashboard/DashboardStatGrid.tsx`
Standardized 4-column KPI statistics block:
- **Pending Referrals**: Yellow/Amber badge (`bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300`), label "Needs Action".
- **In Transit**: Info/Cyan badge (`bg-info-100 text-info-700`), label "Real-time".
- **Emergencies**: Critical/Red badge (`bg-critical-100 text-critical-700`), label "Priority".
- **Completed**: Blue badge (`bg-blue-600 dark:bg-blue-900 text-white`), label "Optimal".
- Includes animated Skeleton loading state.

### 5.4 `src/components/dashboard/FacilityAnalyticsCharts.tsx`
Extracts and isolates the 250-line Recharts charting logic from `Dashboard.tsx`:
- Period selector (`weekly`, `monthly`, `quarterly`, `yearly`).
- Volume chart: Incoming vs Outgoing side-by-side bars.
- Transfer type chart: Stacked bar for `One Way`, `Service/Return`, and `Assessment`.
- Department breakdown chart: Horizontal bar chart showing volume and types per specialty.
- Fully theme-aware (light/dark mode axis lines, grid, and tooltips).

### 5.5 `src/components/dashboard/ShiftHandoverFeed.tsx`
Standardized feed of recent shift handover logs for the user's facility and department, displaying:
- Submitting staff name, timestamp (`format(date, "MMM d, h:mm a")`), department badge.
- Summary notes and transfer counts (Pending, Admitted).

---

## 6. Playwright Invariants & DOM Contracts

To ensure 100% pass rate in the automated test pipeline (`e2e/*.spec.ts`), the following DOM contracts and invariants must be preserved:

| Test Suite / Contract | Target File / Route | Invariant DOM Element / Text | Purpose |
|---|---|---|---|
| `e2e/navigation.spec.ts:27` | `/dashboard` | `page.getByRole('heading', { name: /overview/i })` | Verifies the dashboard overview heading renders for authenticated users. |
| `e2e/referral-lifecycle.spec.ts:84` | `/referrals/:id` | `#dept-review-section` with `select`, `textarea`, `/Submit Review/i` | Head of Department review form. |
| `e2e/referral-lifecycle.spec.ts:100` | `/referrals/:id` | Button `/Accept the Transfer/i`, `/Ready for Receive/i` | Manager transfer acceptance. |
| `e2e/referral-lifecycle.spec.ts:117` | `/referrals/:id` | Button `/Accepted Transfer/i` | Clinician patient consent recording. |
| `e2e/referral-lifecycle.spec.ts:126` | `/referrals/:id` | `#escort-form-section` with `input[type="text"]`, `input[type="tel"]`, `/Save Accompanying Doctor/i` | ER escort doctor assignment. |
| `e2e/referral-lifecycle.spec.ts:137` | `/referrals/:id` | Button `/Dispatch Ambulance/i`, `/Mark as Arrived/i` | Ambulance transit triggers. |
| `e2e/referral-lifecycle.spec.ts:155` | `/bed-management` | Heading `/Bulk Bed Management/i`, Button `/Admit to (ICU\|CCU\|PICU\|Ward) bed/i` | Bed census and patient admission. |
| `e2e/exceptions-edge-cases.spec.ts:58` | Modal Dialog | Dialog "Reject Transfer", `#rejectionReasonInput`, `/Confirm Rejection/i` | Manager referral rejection modal. |
| `e2e/exceptions-edge-cases.spec.ts:112` | Modal Dialog | Dialog "Cancel Referral", `textarea[placeholder*="Reason for cancellation"]`, `/Confirm Cancellation/i` | Clinician referral cancellation. |
| `e2e/exceptions-edge-cases.spec.ts:169` | Modal Dialog | Dialog "ECG Quick-Viewer", Button `/Toggle high contrast/i`, labels `Zoom in`, `Zoom out`, `Reset view` | ECG viewer modal. |

---

## 7. Logic Chain: From Observations to Architecture

```
[Observation 1: Dashboard.tsx is 780 lines mixing 5 role views with Recharts]
       ↓
[Observation 2: ERDashboard, DepartmentPage, AdminDashboard duplicate card UI and status transitions]
       ↓
[Logic Step 1: Separate monolithic pages into modular role-based cockpits in src/components/dashboard/]
       ↓
[Logic Step 2: Unify duplicate card implementations into ReferralCockpitCard with action slots]
       ↓
[Logic Step 3: Extract Recharts analytics into FacilityAnalyticsCharts to keep pages lightweight]
       ↓
[Logic Step 4: Make Dashboard.tsx the master adaptive coordinator rendering role-specific cockpit]
       ↓
[Logic Step 5: Preserve /dashboard, /department, /bed-management URLs and DOM heading 'Overview']
       ↓
[Conclusion: Eliminates ~600 lines of duplicated code, improves UI responsiveness, maintains 100% E2E test passes]
```

---

## 8. Caveats & Non-Investigated Scope

1. **Detailed Mutation Functions in DataContext**:
   - Mutation methods (`addDeptComment`, `updateReferralStatus`, `quickTransfer`, `assignShift`, `setAccompanyingDoctor`, `overrideReferralDestination`, `updateFacilityCapacity`) are well-established in `DataContext.tsx`. The cockpit components must consume them directly without modifying their signature.
2. **Firestore Security Rules**:
   - Firestore security rules strictly validate role permissions (e.g. only `er_room`/`er_official` can set `accompanyingDoctor`, only `head_of_department` can add department comments). UI actions must adhere strictly to these role boundaries.
3. **No Direct Code Modifications in Investigation**:
   - As an explorer agent, no code changes have been committed to the repository. The proposed architecture is fully documented for the Planner and Implementer agents.

---

## 9. Conclusion & Recommendations for Milestone 3

### Recommended Implementation Steps:
1. **Create Reusable Dashboard Widgets in `src/components/dashboard/`**:
   - `ReferralCockpitCard.tsx`: Unified adaptive card for triage queues.
   - `EscalationAlertBanner.tsx`: Pinned escalation banner with timer and quick actions.
   - `DashboardStatGrid.tsx`: Standard 4-tile KPI stats block.
   - `FacilityAnalyticsCharts.tsx`: Clean, modular Recharts container.
   - `ShiftHandoverFeed.tsx`: Handover logs feed.
2. **Create Specialized Cockpits in `src/components/dashboard/`**:
   - `ClinicianCockpit.tsx`: Triage segments ("You / Them / Moving / Inbound"), action triggers, clinician KPIs.
   - `HodCockpit.tsx`: Escalation banner, unit review queue with quick approve, shift delegation, department census.
   - `ManagerCockpit.tsx`: Manager decision queue, capacity radar, bed heatmap, flow analytics.
   - `ERCockpit.tsx`: Outbound transit (escort validator), inbound transit (arrival logger), hotline.
   - `NurseCockpit.tsx`: Bed capacity steppers, arrived admissions queue, active ward census.
   - `AdminCockpit.tsx`: System escalations, global capacity gauges, destination override.
3. **Refactor `src/pages/Dashboard.tsx`**:
   - Coordinate role detection (`useAuth()`) and render the appropriate cockpit while preserving the global `<h1 ...>Overview</h1>` heading and stat grid.
4. **Refactor `src/pages/DepartmentPage.tsx` and `src/pages/ERDashboard.tsx`**:
   - Refactor to reuse the specialized cockpits (`HodCockpit` and `ERCockpit`), eliminating redundant inline cards.

---

## 10. Verification Method

To independently verify this milestone once implemented:

```bash
# 1. Typecheck and linting
npm run lint

# 2. Security rules test suite
npm run test:rules

# 3. Unit and component tests
npm test

# 4. Playwright End-to-End Test Suite
npm run test:e2e

# 5. Production build verification
npm run build
```

Specific test files to check during implementation:
- `e2e/navigation.spec.ts` (verifies `/dashboard` navigation and `Overview` heading)
- `e2e/referral-lifecycle.spec.ts` (verifies all 8 stages of multi-role transfer)
- `e2e/exceptions-edge-cases.spec.ts` (verifies rejection, cancellation, and ECG viewer modals)
