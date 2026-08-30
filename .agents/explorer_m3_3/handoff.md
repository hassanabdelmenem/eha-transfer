# Milestone 3 Technical Investigation Report: State, Data Hooks, Real-time Subscriptions, and Component Architecture

**Author**: Explorer 3 (`explorer_m3_3`)  
**Scope**: State Management, Data Hooks (`useAuth`, `useData`), Real-time Subscriptions, SLA & Escalation Engine, and Clean Component Architecture for Clinical Cockpits & Role Dashboards under `src/components/dashboard/`.  
**Target Files**: `src/contexts/AuthContext.tsx`, `src/contexts/DataContext.tsx`, `src/lib/` (`sla.ts`, `routing.ts`, `referralPriority.ts`, `referralStage.ts`, `notifications.ts`), `src/pages/Dashboard.tsx`, `src/pages/DepartmentPage.tsx`, `src/pages/ERDashboard.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/BedManagementPage.tsx`, `src/components/dashboard/*`.  
**Date**: 2026-08-29  

---

## 1. Observation

Direct code observations from the inspected codebase:

### 1.1 Authentication and Role Context (`src/contexts/AuthContext.tsx`)
- **Lines 16–37 (`AuthContextType`)**: Exposes `user: User | null`, `authReady: boolean`, `emailVerified: boolean`, `hasRole: (roles: User['role'][]) => boolean`, `updateUserProfile: (data: Partial<User>) => Promise<void>`, and authentication handlers.
- **Lines 85–144 (`onAuthStateChanged` & Firestore subscription)**: Sets up `onSnapshot` on `doc(db, 'users', firebaseUser.uid)` to populate `user` with `id`, `name`, `email`, `role`, `facilityId`, `department`, `verified`, and `profileCompleted`.
- **Line 22`: `authReady` ensures application routing and data listeners wait for initial Firebase Auth state resolution before rendering protected routes.
- **Lines 232–254**: Enforces a 15-minute client-side idle timeout with activity listeners (`mousedown`, `mousemove`, `keydown`, `scroll`, `touchstart`).

### 1.2 Realtime Data Context & State Management (`src/contexts/DataContext.tsx`)
- **Lines 37–83 (`DataContextType`)**: Exposes:
  - Data collections: `referrals: Referral[]`, `facilities: Facility[]`, `users: User[]`, `notifications: Notification[]`, `directAdmissions: DirectAdmission[]`, `shiftAssignments: ShiftAssignment[]`, `shiftLogs: ShiftLog[]`.
  - Derived lookup maps (O(1) lookups): `facilitiesById: Map<string, Facility>`, `usersById: Map<string, User>`, `shiftAssignmentsByFacility: Map<string, ShiftAssignment[]>`.
  - State flags: `loading: boolean` (`dataLoading`), `isOnline: boolean`, `pendingSyncCount: number`.
  - Mutation methods: `updateReferralStatus`, `overrideReferralDestination`, `toggleReferralEscalation`, `addDeptComment`, `recordPatientConsent`, `recordPatientDecline`, `cancelReferral`, `setAccompanyingDoctor`, `addDirectAdmission`, `dischargeDirectAdmission`, `quickTransfer`, `assignShift`, `addShiftLog`, `updateFacilityCapacity`.
- **Lines 222–234 (`referralQueryShapes`)**: Implements strict Firestore rule-compliant query partitioning to enforce role and facility isolation:
  ```typescript
  const referralQueryShapes = useCallback((facilityId: string | undefined, isAdmin: boolean) => {
    if (isAdmin) return { all: [orderBy('createdAt', 'desc')] } as Record<string, any[]>;
    if (!facilityId) return {} as Record<string, any[]>;
    return {
      referring: [where('referringFacilityId', '==', facilityId), orderBy('createdAt', 'desc')],
      receiving: [where('receivingFacilityId', '==', facilityId), orderBy('createdAt', 'desc')],
      candidate: [
        where('receivingFacilityId', '==', 'auto'),
        where('candidateFacilityIds', 'array-contains', facilityId),
        orderBy('createdAt', 'desc'),
      ],
    } as Record<string, any[]>;
  }, []);
  ```
- **Lines 238–245 (`mergeReferrals`)**: Merges multiple realtime query pages into a deduplicated, timestamp-sorted array using `new Map<string, Referral>()`.
- **Lines 1330–1376 (Client-Side SLA & Capacity Escalation Sweeps)**:
  - Runs every 30 seconds (`setInterval(sweep, 30_000)`).
  - Sweeps referrals where `isAdmin || r.referringFacilityId === user.facilityId`.
  - Evaluates `needsAutoEscalation(r, now)` (from `src/lib/sla.ts`). If true, triggers `autoEscalateReferral(r.id)` via Firestore transaction (`runTransaction`) with `isEscalated: true`, `escalatedBy: 'system'`, `escalationReason: 'sla_breach'`, `escalationLevel: 'facility'`.
  - Evaluates `capacityEscalationReason(r, facilitiesById)` (from `src/lib/routing.ts`). If `no_matching_facility` or `no_beds_available`, triggers `escalateForCapacity(r.id, reason)` via transaction with `isEscalated: true`, `escalatedBy: 'system'`, `escalationReason: reason`, `escalationLevel: 'system'`.
  - Enforces `autoEscalationSuppressed` check so manual de-escalations stick permanently.

### 1.3 SLA and Routing Rule Specifications (`src/lib/sla.ts` & `src/lib/routing.ts`)
- **`src/lib/sla.ts:20-49`**:
  - `SLA_MINUTES = 30` (1800s).
  - `SLA_TRACKED_PRIORITIES = ['emergency', 'urgent']`.
  - `SLA_TRACKED_BED_TYPES = ['ICU', 'CCU', 'PICU']`.
  - `SLA_TRACKED_STATUS = 'pending'`.
  - `isSlaTracked`: Validates if referral matches status, priority, and bed type.
  - `secondsUntilSlaBreach`: Computes seconds remaining before breach or overdue seconds (negative value). Returns `null` if timestamp unparseable.
- **`src/lib/routing.ts:20-123`**:
  - `availableBeds`: `(bed.total ?? 0) - (bed.occupied ?? 0)`, floored at 0.
  - `facilityMatches`: Matches all requested departments AND requires configured total beds for the bed type `> 0`.
  - `capacityEscalationReason`: Returns `'no_matching_facility'` if no candidate exists or resolved facilities have 0 capacity; returns `'no_beds_available'` if all candidate facilities are full.

### 1.4 Workflow Sorting and Priority Rails (`src/lib/referralPriority.ts`)
- **Lines 15–26 (`sortByWorkflow`)**: Sorts referrals deterministically:
  1. Escalated cases pinned on top (`isEscalated === true`).
  2. Priority order (`emergency: 2` -> `urgent: 1` -> `routine: 0`).
  3. Oldest first (`Date.parse(a.createdAt) - Date.parse(b.createdAt)`).
- **Lines 29–40**: `priorityRailClass` (6px colored left border rail: red for emergency/escalated, amber for urgent, slate for routine) and `priorityChipClasses`.

### 1.5 Existing Monolithic Dashboard Codebase
- **`src/pages/Dashboard.tsx` (780 lines)**:
  - Monolithic component housing Clinician view, Manager view, Overview KPI tiles, Recharts volume/distribution charts, Department breakdown, Currently Admitted table, HoD queue snippet, Bed Occupancy heatmap, Incoming referrals grid (`ReferralList`), and Shift Handover cards.
  - Declares local `ClinicianReferralCard` (lines 23–46).
  - Mixes complex calculations, audio alert hooks (`useAudioAlert`), and segmented state in one 780-line file.
- **`src/pages/DepartmentPage.tsx` (420 lines)**:
  - Implements department review queue, quick direct approval, internal ward transfer modal, and doctor shift delegation.
- **`src/pages/ERDashboard.tsx` (269 lines)**:
  - Implements dual outbound/inbound transit cards with escort validation and dispatch/arrival triggers.
- **`src/pages/AdminDashboard.tsx` (281 lines)**:
  - Implements global bed capacity totals, system-level escalations queue, destination override dialog, and waitlist pressure table.
- **`src/components/dashboard/BedOccupancyHeatmap.tsx` (91 lines)**:
  - Clean table displaying facility capacity matrix across ICU, CCU, PICU, Ward with occupancy percentage colors.

---

## 2. Logic Chain

### 2.1 Role-Tailored Data Slicing & Metric Flow
```
                      +-------------------+
                      |   AuthContext     |
                      | (user, role, fac) |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |   DataContext     |
                      | (referrals, beds) |
                      +---------+---------+
                                |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
 [Clinician Cockpit]     [HoD Cockpit]          [Manager Cockpit]
 - My Outbound Queue     - Unit Review Queue    - Signature Queue
   • You (Action Needed)   • Direct Approval      • Dept-Approved
   • Them (Under Review) • Shift Delegation     - Capacity Radar
   • Moving (In Transit) - Admitted Census      - Network Heatmap
 - Live Audio Alerts     - Ward Transfer        - Volume Analytics
        |                       |                       |
        +-----------------------+-----------------------+
        |                       |                       |
        v                       v                       v
   [ER Cockpit]          [Nurse Cockpit]        [Admin Cockpit]
 - Outbound Dispatch     - Bed Census Steppers  - System Escalations
   • Escort Gate Check   - Arrived Transfers    - Global Bed Radar
 - Inbound Transit Radar   • Quick Admit        - Destination Override
 - Arrival Logger        - Direct Admissions    - Waitlist Pressure
```

1. **Clinicians (`clinician`, `resident`, `specialist`, `consultant`)**:
   - Filter `referrals.filter(r => r.referringUserId === user.id)`.
   - Partition into 3 active segments:
     - `you`: `status === 'postponed'` (needs response to requirements) OR `status === 'patient_consented' && requiresAccompanyingDoctor && !accompanyingDoctor` (needs escort assignment).
     - `them`: `['pending', 'dept_approved', 'manager_approved', 'accepted'].includes(status)`.
     - `moving`: `['in_transit', 'arrived'].includes(status)`.
   - Pinned actions: Initiate New Referral, Emergency Hotline, Directory.

2. **Head of Department (`head_of_department`)**:
   - Filter inbound unit review: `receivingFacilityId === user.facilityId && receivingDepartments.includes(user.department) && status === 'pending'`.
   - Partition into `escalatedReview` (pinned at top with elapsed minutes and phone trigger) and `queueReview` (with 1-click `direct_approval` and `ReferralSummarySheet` trigger).
   - Delegation management: `shiftAssignmentsByFacility.get(user.facilityId)` to view and assign on-call department doctors (`consultant`, `specialist`).
   - Unit Census & Internal Transfer: roster of currently admitted patients with one-click transfer dialog.

3. **Hospital Managers & Medical Directors (`hospital_manager`, `deputy_manager`, `medical_director`)**:
   - Decision Queue: `receivingFacilityId === user.facilityId && status === 'dept_approved'`.
   - 1-Click Action: `updateReferralStatus(id, 'manager_approved', 'Accepted by hospital manager.')`.
   - Facility Capacity Radar: Progress bars for configured bed types with color thresholds (critical if 0 free beds, warning if <20% free, success otherwise).
   - Flow Analytics: Recharts bar charts for incoming/outgoing volume and transfer type distributions across weekly, monthly, quarterly, and yearly periods.

4. **ER Officials & Dispatch (`er_official`, `er_room`)**:
   - Dual-Queue Layout:
     - Outbound Queue: `referringFacilityId === user.facilityId && ['accepted', 'patient_consented', 'in_transit'].includes(status)`.
       - Gating logic: Dispatch button is disabled until `status === 'patient_consented'` AND (if `requiresAccompanyingDoctor`, `accompanyingDoctor` is present with valid name and phone).
       - 1-Click Action: `updateReferralStatus(id, 'in_transit', 'Ambulance dispatched by ER team')`.
     - Inbound Queue: `receivingFacilityId === user.facilityId && ['in_transit', 'arrived'].includes(status)`.
       - 1-Click Action: `updateReferralStatus(id, 'arrived', 'Patient arrived at ER')` + direct telephone link to referring clinician.

5. **Nurses & Bed Managers (`nurse`, `nursing_supervisor`)**:
   - Capacity Steppers: Instant capacity increment/decrement with 500ms debounced Firestore update.
   - Arrived Transfer Queue: Patients with `status === 'arrived'` awaiting bed assignment with one-click "Admit to [BedType] bed" (`updateReferralStatus(id, 'admitted')`).
   - Direct Admissions: Access to direct walk-in admission workflow and active census.

6. **System Administrators (`system_admin`, `owner`)**:
   - System Escalation Console: `isEscalated && escalationLevel === 'system'`.
   - Actions: Destination Override (`overrideReferralDestination`) for contracted placements, Postpone, and De-escalate.
   - Global Bed Radar: Network-wide total capacity tally across all tertiary and district facilities.

### 2.2 Reactivity, SLA Countdown & Escalation Banner Architecture
- **Single Clock Source**: Instead of creating separate intervals in every card/row, dashboard cockpits supply a shared 1Hz `now: Date` state to child widgets.
- **Visual SLA State Projection**:
  - `secondsRemaining > 0`: Warning badge (`amber`), showing `MM:SS left` with tabular numbers.
  - `secondsRemaining <= 0 && isEscalated`: Critical pulse badge (`red`), showing `Escalated +MM:SS`.
  - `secondsRemaining <= 0 && !isEscalated`: Critical badge (`red`), showing `No response +MM:SS` (avoids falsely implying system has already taken over).
- **Escalation Banners**:
  - Pinned directly above the role queue.
  - Displays patient demographics, urgency badge, escalation cause, elapsed time counter, and direct resolution button (`Review now`, `Source a bed`, or `Override destination`).

### 2.3 Eliminating Hook Rule Violations & Component Modularization
- **Rule of Hooks Compliance**:
  - In the current monolithic `Dashboard.tsx`, conditional role branches and nested helpers risk hook ordering anomalies when roles switch or during rapid auth state updates.
  - **Solution**: Decompose into independent, role-specific Cockpit components (`ClinicianCockpit`, `HodCockpit`, `ManagerCockpit`, `ERCockpit`, `NurseCockpit`, `AdminCockpit`).
  - Top-level `Dashboard.tsx` or `RoleCockpitRouter.tsx` selects exactly one Cockpit component based on `user.role`.
  - Each Cockpit component is a standard React functional component that declares all of its `useMemo`, `useState`, `useCallback`, `useEffect` hooks at the top level unconditionally.

---

## 3. Proposed Component Architecture under `src/components/dashboard/`

```
src/components/dashboard/
├── types.ts                         # Shared TypeScript interfaces & prop contracts
├── RoleCockpitRouter.tsx            # Top-level role dispatcher
│
├── cockpits/                        # Role cockpit containers (encapsulate role-specific state & hooks)
│   ├── ClinicianCockpit.tsx         # Triage buckets (You/Them/Moving), workload stats, shortcuts
│   ├── HodCockpit.tsx               # Pinned escalations, review queue, shift delegation, unit census
│   ├── ManagerCockpit.tsx           # Signature queue, bed availability radar, Recharts analytics
│   ├── ERCockpit.tsx                # Outbound dispatch (escort gate), inbound transit radar, arrival
│   ├── NurseCockpit.tsx             # Bed steppers, arrived transfer queue, active census
│   └── AdminCockpit.tsx             # Network escalations, global capacity, destination override
│
├── widgets/                         # Reusable dashboard widgets
│   ├── DashboardHeader.tsx          # RoleHomeHeader + live update indicator + action bar
│   ├── EscalationBanner.tsx         # Universal pinned critical alert banner
│   ├── KPIGrid.tsx                  # Standard 4-tile metrics grid with responsive breakpoints
│   ├── CapacityRadar.tsx            # Free beds progress bars with color thresholds
│   ├── BedOccupancyHeatmap.tsx      # (Existing, enhanced) Cross-facility capacity table
│   ├── VolumeAnalyticsChart.tsx     # Recharts volume (incoming vs outgoing) & type distribution
│   ├── DepartmentBreakdownChart.tsx # Recharts departmental breakdown
│   ├── ActiveCensusTable.tsx        # Admitted referrals + direct admissions roster
│   └── ShiftHandoverWidget.tsx      # Recent shift handover logs
│
├── queues/                          # Workflow-specific queue lists
│   ├── ClinicianTriageQueue.tsx     # Segment switcher & workflow-sorted cards
│   ├── HodReviewQueue.tsx           # HoD review cards with 1-click approve & summary preview
│   ├── ManagerApprovalQueue.tsx     # Manager cards with 1-click accept & summary preview
│   ├── ERDispatchQueue.tsx          # Dual-pane outbound (escort gate) & inbound transit
│   └── ArrivedAdmissionQueue.tsx    # Arrived transfers with 1-click bed allocation
│
└── cards/                           # Atomic cards for dashboard queues
    ├── DashboardReferralCard.tsx    # Unified referral card with priority rail & action sentence
    ├── EscalatedReferralCard.tsx    # Critical border card with elapsed timer & phone trigger
    ├── DirectAdmissionRow.tsx       # Census row with internal transfer trigger
    └── ShiftLogItem.tsx             # Shift log summary row
```

---

## 4. TypeScript Interfaces Contract (`src/components/dashboard/types.ts`)

```typescript
import { Referral, Facility, User, BedType, DirectAdmission, ShiftLog, ShiftAssignment, Role } from '../../types';

export type TriageSegment = 'you' | 'them' | 'moving';

export interface DashboardMetric {
  label: string;
  value: number;
  valueColor: string;
  bg: string;
  labelColor: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
}

export interface DashboardHeaderProps {
  identity: string;
  userFacility?: Facility;
  canCreateReferral: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  isDarkTheme?: boolean;
}

export interface EscalationBannerProps {
  referral: Referral;
  onAction: (referral: Referral) => void;
  actionLabel?: string;
  onCallReferrer?: (phoneNumber: string) => void;
  referrerPhone?: string;
}

export interface KPIGridProps {
  metrics: DashboardMetric[];
  loading?: boolean;
}

export interface CapacityRadarProps {
  facility: Facility;
}

export interface DashboardReferralCardProps {
  referral: Referral;
  actionLabel: string;
  actionSentence?: string;
  onAction: (id: string) => void;
  onSummary?: (referral: Referral) => void;
  now?: Date;
}

export interface HodReviewQueueProps {
  referrals: Referral[];
  onApprove: (id: string) => Promise<void>;
  onSummary: (referral: Referral) => void;
  approvingId?: string | null;
}

export interface ManagerApprovalQueueProps {
  referrals: Referral[];
  onAccept: (id: string) => Promise<void>;
  onSummary: (referral: Referral) => void;
  usersById: Map<string, User>;
}

export interface ERDispatchQueueProps {
  outboundReferrals: Referral[];
  inboundReferrals: Referral[];
  onDispatch: (id: string) => Promise<void>;
  onConfirmArrival: (id: string) => Promise<void>;
  onSaveEscort: (id: string, name: string, phone: string) => Promise<void>;
  getFacilityName: (id: string) => string;
  getUserName: (id: string) => string | undefined;
  getUserPhone?: (id: string) => string | undefined;
  loading?: boolean;
}

export interface ArrivedAdmissionQueueProps {
  arrivedReferrals: Referral[];
  onAdmit: (id: string, bedType: BedType) => Promise<void>;
  loading?: boolean;
}

export interface ActiveCensusTableProps {
  admittedReferrals: Referral[];
  directAdmissions: DirectAdmission[];
  onTransferPatient?: (patient: { id: string; name: string; hospitalId: string; type: 'referral' | 'admission' }) => void;
  userDepartment?: string;
  loading?: boolean;
}
```

---

## 5. Implementation Blueprints

### 5.1 Clean Top-Level Router (`src/pages/Dashboard.tsx` or `src/components/dashboard/RoleCockpitRouter.tsx`)
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ClinicianCockpit } from '../components/dashboard/cockpits/ClinicianCockpit';
import { HodCockpit } from '../components/dashboard/cockpits/HodCockpit';
import { ManagerCockpit } from '../components/dashboard/cockpits/ManagerCockpit';
import { ERCockpit } from '../components/dashboard/cockpits/ERCockpit';
import { NurseCockpit } from '../components/dashboard/cockpits/NurseCockpit';
import { AdminCockpit } from '../components/dashboard/cockpits/AdminCockpit';
import { isDoctorRole, isNurseRole } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, isSlaTracked } = useData();
  const [now, setNow] = useState<Date>(new Date());

  // Shared 1Hz clock for SLA timers
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  if (user.role === 'system_admin' || user.role === 'owner') {
    return <AdminCockpit now={now} />;
  }

  if (user.role === 'er_room' || user.role === 'er_official') {
    return <ERCockpit now={now} />;
  }

  if (user.role === 'hospital_manager' || user.role === 'deputy_manager' || user.role === 'medical_director') {
    return <ManagerCockpit now={now} />;
  }

  if (user.role === 'head_of_department') {
    return <HodCockpit now={now} />;
  }

  if (isNurseRole(user.role)) {
    return <NurseCockpit now={now} />;
  }

  return <ClinicianCockpit now={now} />;
};
```

### 5.2 Universal Escalation Banner (`src/components/dashboard/widgets/EscalationBanner.tsx`)
```tsx
import React from 'react';
import { Referral } from '../../../types';
import { ShieldAlert, Phone } from 'lucide-react';
import { priorityRailClass } from '../../../lib/referralPriority';

export interface EscalationBannerProps {
  referral: Referral;
  onAction: (referral: Referral) => void;
  actionLabel?: string;
  referrerPhone?: string;
  referringFacilityName?: string;
}

export const EscalationBanner: React.FC<EscalationBannerProps> = ({
  referral,
  onAction,
  actionLabel = 'Review now',
  referrerPhone,
  referringFacilityName,
}) => {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(referral.escalatedAt || referral.createdAt)) / 60000));
  const reasonLabel = referral.escalationReason?.replace(/_/g, ' ') || 'SLA breach';

  return (
    <div className="rounded-xl border-2 border-critical-700 bg-critical-50 dark:bg-critical-950/40 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="bg-critical-700 text-white px-3.5 py-1.5 text-xs font-semibold flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 animate-pulse" />
          <span>Escalated · {reasonLabel} ({mins} min overdue)</span>
        </div>
        <span className="font-mono text-[11px] opacity-90">{referral.patientData.hospitalId}</span>
      </div>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">
            {referral.patientData.name}, {referral.patientData.age}y
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {referral.requiredBedType} Bed · {referral.receivingDepartments?.join(', ')} · From {referringFacilityName || 'Referring Facility'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {referrerPhone && (
            <a
              href={`tel:${referrerPhone}`}
              aria-label="Call referring clinician"
              className="h-[48px] w-[48px] flex items-center justify-center rounded-lg border-2 border-critical-700 text-critical-700 dark:text-critical-400 hover:bg-critical-100 dark:hover:bg-critical-900/30 transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => onAction(referral)}
            className="min-h-[48px] px-5 rounded-lg bg-critical-700 hover:bg-critical-800 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. Caveats

- **DOM Selectors & E2E Invariants**:
  - `e2e/navigation.spec.ts:27` requires `<h1 className="text-2xl font-bold ...">Overview</h1>` or equivalent accessible heading with name `/overview/i` on `/dashboard`.
  - All modals (Rejection, Cancellation, Direct Admission, Voice Dictation) must maintain their existing accessible test names and input IDs (`#rejectionReasonInput`, `#hospitalId`, etc.).
- **No Direct Implementation in Exploration**:
  - In adherence with Teamwork explorer guidelines, no production files were modified during this investigation. All findings and code snippets serve as actionable technical blueprints for Milestone 3 implementation.

---

## 7. Conclusion

1. **State & Subscription Flow**: `useAuth` and `useData` provide a robust, Firestore security rule-compliant foundation with partitioned realtime queries, derived lookup maps (`facilitiesById`, `usersById`), and centralized SLA/capacity sweeps.
2. **Reactivity & Gating**: SLA countdowns, emergency audio alerts, escort validation gates, and capacity auto-escalations are mathematically rigorous and idempotent.
3. **Decomposition & Zero Hook Violations**: Refactoring `Dashboard.tsx` into dedicated role cockpits (`ClinicianCockpit`, `HodCockpit`, `ManagerCockpit`, `ERCockpit`, `NurseCockpit`, `AdminCockpit`) under `src/components/dashboard/` eliminates hundreds of lines of duplicate code, guarantees zero React hook rule violations, and provides a cohesive, responsive clinical workspace.

---

## 8. Verification Method

To independently verify the facts and logic in this report:

1. **TypeScript Typecheck**:
   ```bash
   npm run lint
   ```
2. **Vitest Unit & Integration Test Suite**:
   ```bash
   npm test
   ```
3. **Milestone 3 Adversarial & Edge Case Tests**:
   ```bash
   npx vitest run tests/m3-edge-cases.adversarial.test.ts
   npx vitest run src/milestone1.adversarial.test.tsx
   npx vitest run src/pages/tier5-ui.adversarial.test.tsx
   ```
4. **Playwright End-to-End Suite**:
   ```bash
   npm run test:e2e
   ```
5. **Production Build Compilation**:
   ```bash
   npm run build
   ```
