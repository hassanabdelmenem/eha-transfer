# Data Layer, State Management & Business Logic Comprehensive Survey

**Project**: Ismailia Health Connect (`eha-transfer`)  
**Investigator**: Data Models & Business Logic Explorer Subagent  
**Date**: 2026-08-29  
**Status**: Comprehensive Analysis Completed  

---

## Executive Summary

The Ismailia Health Connect (`eha-transfer`) platform is a real-time, multi-facility emergency medical transfer coordination system built with React 19, TypeScript, Tailwind CSS, and Firebase (Firestore & Authentication). It manages time-critical patient transfers across 14 distinct clinical and administrative roles across primary, district, tertiary, and external contracted healthcare facilities.

The data layer is tightly bound between client-side Firestore listeners (`onSnapshot`), transactional multi-document mutations (`runTransaction`, `writeBatch`), and strict server-side Firestore security rules (`firestore.rules`). 

This document details the complete data schemas, state management architecture, referral state machine, authorization matrix, and invariants that must be preserved during the UI and structural redesign.

---

## 1. Firestore Database Schema & Security Architecture

### 1.1 Collections & Document Data Models

#### 1. `/users/{userId}`
Represents authenticated personnel across the network.
```typescript
export interface User {
  id: string;                    // Matches Firebase Auth UID
  email: string;
  name: string;
  phoneNumber?: string;
  role: Role;                    // Trusted role, locked by security rules
  requestedRole?: Role;          // Requested during onboarding (untrusted)
  facilityId?: string;           // Hospital ID; frozen upon admin verification
  department?: string;           // Department (e.g. 'ICU', 'Cardiology', 'Emergency')
  verified?: boolean;            // Facility leadership verification status
  profileCompleted?: boolean;    // Profile onboarding completion flag
  monthlySchedule?: string;      // On-call schedule notes
}
```
**Security Rules & Constraints:**
- **Self-signup:** Always created as unverified resident (`role: 'resident'`, `verified: false`).
- **Privilege protection:** Callers cannot alter `role`, `verified`, or post-verification `facilityId`. Only `isPrivileged()` (`owner`, `system_admin`) can modify these fields.
- **Read boundaries:** Own document is readable when signed in; network-wide user list is readable by any verified user (`isVerifiedCaller()`) to enable client-side notification fan-out across facilities.

---

#### 2. `/facilities/{facilityId}`
Represents hospitals, clinics, and tertiary care centers.
```typescript
export type FacilityType = 'primary_care' | 'district_hospital' | 'tertiary_care' | 'external_contracted';
export type BedType = 'ICU' | 'CCU' | 'PICU' | 'Ward';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  location: string;
  departments: string[];
  capacity: Record<BedType, { total: number; occupied: number }>;
  isExternal?: boolean;
  contractedServices?: string[];
}
```
**Security Rules & Constraints:**
- **Read:** Unrestricted read for any authenticated user (`signedIn()`) to support onboarding facility picker.
- **Write partitioning:**
  - `capacity.occupied` can be updated by any verified staff at that facility (`atFacility(facilityId)`), provided totals remain unchanged and counts are sane (`0 <= occupied <= total`).
  - `capacity.total` and `departments` configuration can only be modified by senior facility roles (`medical_director`, `hospital_manager`, `deputy_manager`, `head_of_department`) or privileged admins.

---

#### 3. `/referrals/{referralId}`
The core clinical transfer record.
```typescript
export type ReferralPriority = 'routine' | 'urgent' | 'emergency';
export type ReferralTransferType = 'one_way' | 'service_and_return' | 'assessment_with_return';
export type ReferralStatus =
  | 'pending'
  | 'dept_approved'
  | 'manager_approved'
  | 'accepted'
  | 'patient_consented'
  | 'rejected'
  | 'in_transit'
  | 'arrived'
  | 'admitted'
  | 'discharged'
  | 'postponed'
  | 'cancelled';

export interface Referral {
  id: string;
  transferType?: ReferralTransferType;
  patientId: string;
  patientData: PatientData;
  referringFacilityId: string;
  referringUserId: string;
  receivingFacilityId: string;           // "auto" until confirmed by department/manager approval
  candidateFacilityIds?: string[];       // Auto-routed matching hospital candidates
  receivingDepartments: string[];
  requiredBedType: BedType;
  priority: ReferralPriority;
  status: ReferralStatus;
  isEscalated?: boolean;
  escalatedAt?: string | null;
  escalatedBy?: string | null;           // 'system' or userId
  escalationReason?: 'sla_breach' | 'no_matching_facility' | 'no_beds_available' | 'manual' | 'requirements_needed' | null;
  escalationLevel?: 'system' | 'facility' | null;
  autoEscalationSuppressed?: boolean;    // Set true upon manual de-escalation
  reasonForReferral: string;
  createdAt: string;                     // ISO 8601 string
  createdAtMs?: number;                  // Epoch ms immutable SLA clock
  updatedAt: string;
  deptComments: DeptComment[];
  statusHistory: {
    status: ReferralStatus;
    timestamp: string;
    userId: string;
    notes?: string;
  }[];
  patientDeclinedFacilityIds?: string[];
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  requiresAccompanyingDoctor?: boolean;  // Set at creation if doctor escort needed
  accompanyingDoctor?: {                 // Recorded by ER official prior to dispatch
    name: string;
    phoneNumber: string;
    addedBy: string;
    addedAt: string;
  } | null;
}
```

```typescript
export interface PatientData {
  id: string;
  hospitalId: string;
  nationalId?: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  vitalSigns: {
    hr?: number;
    bp: string;
    spo2?: number;
    temp?: number;
    rr?: number;
    gcs?: number;                        // Glasgow Coma Scale (3-15)
    timestamp: string;
  };
  complaint: string;
  presentation: string;
  pastHistory: string;
  medications: string;
  clinicalNotes: string;
  diagnosis: string;
  investigations: string;
  attachments: Attachment[];
}
```
**Security Rules & Constraints:**
- **Creation integrity:** Must start in `status: 'pending'`, `isEscalated: false`, `statusHistory.length == 1`, with `createdAtMs` within 5 minutes of server time.
- **Identity pinning:** `referringFacilityId`, `referringUserId`, `patientId`, `createdAt`, `createdAtMs`, and `requiresAccompanyingDoctor` are completely immutable after creation.
- **Clinical data pinning:** `patientData` and `requiredBedType` cannot be modified by any receiving party (only referring doctor or admin).
- **Candidate narrowing:** `candidateFacilityIds` can only be shrunk (when a patient declines a hospital), never widened.
- **Audit trail:** `statusHistory` is append-only (maximum growth of 1 entry per write, initial entry immutable).
- **Escort gating:** If `requiresAccompanyingDoctor == true`, transitioning to `in_transit` is rejected by rules unless `accompanyingDoctor` is populated with non-empty name and phone number by an `er_official`/`er_room`.
- **Cancel lock:** Cancellation is strictly blocked in rules and client if status is in `CANCEL_LOCKED_STATUSES` (`in_transit`, `arrived`, `admitted`, `discharged`).

---

#### 4. `/notifications/{notificationId}`
Real-time role-targeted alerts.
```typescript
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'urgent' | 'info' | 'success' | 'warning' | 'purple';
  read: boolean;
  createdAt: string;
  createdAtMs?: number;
  referralId?: string;
}
```
- **Read & write:** Read and delete by recipient (`userId == auth.uid`) or admin; update restricted to toggling `read`. Created by any verified user with strict length limits (title <= 200, message <= 2000).

---

#### 5. `/directAdmissions/{admissionId}`
Facility-internal direct patient admissions bypassing transfer network.
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
- **Security:** Strictly facility-scoped. Only verified staff at `facilityId` can read or write.

---

#### 6. `/shiftAssignments/{assignmentId}` & `/shiftLogs/{logId}`
On-call delegation and end-of-shift clinical handover records.
```typescript
export interface ShiftAssignment {
  id: string;
  facilityId: string;
  department: string;
  assignedUserId: string | null;
  updatedAt: string;
}

export interface ShiftLog {
  id: string;
  userId: string;
  userName: string;
  facilityId: string;
  department?: string;
  timestamp: string;
  pendingTransfersCount: number;
  admittedPatientsCount: number;
  summary: string;
}
```
- `shiftAssignments` is readable network-wide by verified callers so that notification fan-out can resolve delegated on-call coverage at destination hospitals.
- `shiftLogs` is an immutable, append-only facility audit record (updates and deletes denied).

---

## 2. Context Architecture & State Management

### 2.1 `AuthContext` (`src/contexts/AuthContext.tsx`)
- **State:** `user: User | null`, `authReady: boolean`, `emailVerified: boolean`, `redirectError: string | null`.
- **Key Methods:**
  - `loginWithGoogle()`: Uses `signInWithRedirect` on mobile browsers (Safari/Android) and `signInWithPopup` on desktop with graceful fallback.
  - `loginWithEmail(email, password)` / `registerWithEmail(email, password)`: Automatically dispatches verification email.
  - `logout()`: Signs out and clears IndexedDB cached offline referrals (`clearOfflineReferrals()`).
  - `hasRole(roles)`: Checks current user role against allowed list.
  - `updateUserProfile(data)`: Merges profile updates into Firestore `/users/{uid}`.
- **Session Protection:** Embedded idle timer logs out after 15 minutes of inactivity across user interaction events (`mousedown`, `mousemove`, `keydown`, `scroll`, `touchstart`).

### 2.2 `DataContext` (`src/contexts/DataContext.tsx`)
- **State Store:**
  - `referrals: Referral[]`, `referralsById: Map<string, Referral>`
  - `facilities: Facility[]`, `facilitiesById: Map<string, Facility>`
  - `users: User[]`, `usersById: Map<string, User>`
  - `notifications: Notification[]`
  - `directAdmissions: DirectAdmission[]`
  - `shiftAssignments: ShiftAssignment[]`, `shiftAssignmentsByFacility: Map<string, ShiftAssignment[]>`
  - `shiftLogs: ShiftLog[]`
  - `loading: boolean` (True until facilities and referrals have resolved initial snapshot)
  - `isOnline: boolean`, `pendingSyncCount: number`
- **Real-Time Subscription Architecture:**
  - Because Firestore rules enforce `resource.data` permissions per party, non-privileged queries cannot read `/referrals` unfiltered.
  - Non-admin users subscribe to 3 disjoint compound queries:
    1. `where('referringFacilityId', '==', user.facilityId)`
    2. `where('receivingFacilityId', '==', user.facilityId)`
    3. `where('receivingFacilityId', '==', 'auto')` + `where('candidateFacilityIds', 'array-contains', user.facilityId)`
  - Results are merged and de-duplicated by document ID in `mergeReferrals()`.
- **Automated Escalation Sweeps:**
  - **SLA Sweep (30s interval):** Evaluates `needsAutoEscalation(referral, Date.now())` for pending emergency/urgent referrals requiring ICU/CCU/PICU beds. If >30 min without response, executes `autoEscalateReferral()`.
  - **Capacity Depletion Sweep:** Evaluates `capacityEscalationReason(referral, facilitiesById)`. If no facilities match or all matching beds are 100% full, immediately executes `escalateForCapacity()`.

---

## 3. The Complete Referral Lifecycle State Machine

The referral lifecycle consists of 7 primary stages and 4 branch/exception pathways:

```
[1. Intake / Creation] (Doctor creates referral)
        │
        ▼
   ┌─────────┐
   │ pending │ ◄───────────────────────────────────────────────────────┐
   └────┬────┘                                                         │
        │                                                              │
        ├──────────────────────┬──────────────────────┐                │ (Patient
        ▼                      ▼                      ▼                │  Decline)
[2. Dept Review]       [Requirements Needed]   [Rejected / Cancelled]   │
   status: dept_approved   status: postponed     status: rejected/cancelled │
        │              (auto-escalated)                                │
        ▼                                                              │
[3. Manager Review]                                                    │
   status: manager_approved                                            │
        │                                                              │
        ▼                                                              │
[4. Destination Confirmed]                                             │
   status: accepted                                                    │
        │                                                              │
        ├──────────────────────────────────────────────────────────────┘
        ▼
[5. Patient Consent]
   status: patient_consented
        │
        ├─ [Escort Check]: if requiresAccompanyingDoctor == true,
        │                  must record accompanyingDoctor
        ▼
[6. Ambulance Transport]  <-- CANCEL LOCK ACTIVATES (One-way progression)
   status: in_transit
        │
        ▼
[7. Hospital Arrival]
   status: arrived
        │
        ▼
[8. Bed Admission & Handover]
   status: admitted (occupancy +1)
        │
        ▼
[9. Discharge / Completion]
   status: discharged (occupancy -1)
```

### Detailed Transition Rules & Invariants

| Transition | From Status | To Status | Allowed Actor Roles | Business Logic & Side Effects |
|---|---|---|---|---|
| **Initiate Referral** | `null` | `pending` | Doctors (`resident`, `specialist`, `consultant`, `clinician`, `head_of_department`, `medical_director`, `owner`) | Calculates matching candidates. Sets `createdAtMs`. Notifies candidates. |
| **Department Review** | `pending` | `dept_approved` | `head_of_department`, `owner`, or assigned on-call `consultant`/`specialist` | Claims receiving hospital if auto-routed. Appends `deptComments`. Notifies Hospital Manager. |
| **Requirements Needed** | `pending` | `postponed` | `head_of_department`, `owner`, or assigned on-call `consultant`/`specialist` | Bypasses manager approval; sets `isEscalated: true`, `escalationReason: 'requirements_needed'`, notifies referring doctor & leadership. |
| **Manager Approval** | `dept_approved` | `manager_approved` | `hospital_manager`, `medical_director`, `deputy_manager`, `owner` | Confirms executive administrative authorization. Notifies receiving team. |
| **Accept Transfer** | `manager_approved` | `accepted` | Receiving facility staff (non-nurse) or admin | Confirms bed readiness. Unlocks patient consent review. |
| **Patient Consented** | `accepted` | `patient_consented` | Referring doctor / referring facility staff / Admin | Confirms patient agrees to destination hospital. Required before dispatch. |
| **Patient Declined** | `accepted` | `pending` | Referring doctor / referring facility staff / Admin | Adds facility to `patientDeclinedFacilityIds`, removes from `candidateFacilityIds`, resets `receivingFacilityId: 'auto'`, re-routes to remaining candidates. |
| **Assign Escort** | `patient_consented` | `patient_consented` | `er_official`, `er_room`, `owner`, `system_admin` | Sets `accompanyingDoctor` { name, phoneNumber, addedBy, addedAt }. |
| **Dispatch Ambulance** | `patient_consented` | `in_transit` | Referring or Receiving `er_official`, `er_room`, referring doctor, Admin | Blocks if `requiresAccompanyingDoctor` is true and escort is missing. **Locks cancellation.** |
| **Patient Arrival** | `in_transit` | `arrived` | Receiving `er_official`, `er_room`, Receiving Nurse, Admin | Confirms physical arrival at receiving ER bay. |
| **Admit to Bed** | `arrived` | `admitted` | Receiving `nurse`, `nursing_supervisor`, `owner`, `system_admin` | Atomically executes `increment(1)` on `capacity[bedType].occupied`. |
| **Discharge Patient** | `admitted` | `discharged` | Receiving `nurse`, `nursing_supervisor`, `owner`, `system_admin` | Atomically executes `increment(-1)` on `capacity[bedType].occupied`. |
| **Cancel Referral** | Any unlocked status | `cancelled` | Creator (`referringUserId`), Senior referring staff (`SENIOR_CANCEL_ROLES`), or Admin | Soft-deletes with `cancelReason`. Blocked if status is in `CANCEL_LOCKED_STATUSES`. |
| **Reject Referral** | `dept_approved` / `pending` | `rejected` | `hospital_manager`, `medical_director`, `deputy_manager`, `owner` | Requires mandatory rejection reason. Notifies referring facility. |
| **Admin Direct Override** | Any active status | `manager_approved` / `rejected` / `postponed` / destination override | `system_admin`, `owner` | Bypasses department review and bed availability checks. |

---

## 4. Role Permissions & Authorization Matrix (14 Roles)

The platform defines 14 specific canonical roles categorized into Doctors, Nurses, and Administrative personnel:

```
DOCTOR_ROLES (7)               NURSE_ROLES (3)            ADMINISTRATIVE / OPS (4)
├── owner                      ├── nursing_supervisor     ├── system_admin
├── medical_director           ├── nurse                  ├── hospital_manager
├── head_of_department         └── er_room                ├── deputy_manager
├── consultant                                            └── er_official
├── specialist
├── resident
└── clinician
```

### Complete Permissions Grid

| Role | Create Referral | Dept Approval | Manager Approval | Record Consent | Assign Escort | Dispatch Ambulance | Admit / Discharge | Adjust Bed Total | Cancel Referral | Admin Override |
|---|---|---|---|---|---|---|---|---|---|---|
| **owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **system_admin** | ❌ | ❌ | ✅ (Direct) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **medical_director** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ (Own fac) | ❌ |
| **hospital_manager** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (Own fac) | ❌ |
| **deputy_manager** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (Own fac) | ❌ |
| **head_of_department**| ✅ | ✅ (Own dept) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (Own fac) | ❌ |
| **consultant** | ✅ | ✅ (Delegated)| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Unless creator)| ❌ |
| **specialist** | ✅ | ✅ (Delegated)| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Unless creator)| ❌ |
| **resident** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Unless creator)| ❌ |
| **clinician** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (Unless creator)| ❌ |
| **nursing_supervisor**| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Own fac) | ❌ (Occupied only)| ❌ | ❌ |
| **nurse** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (Own fac) | ❌ (Occupied only)| ❌ | ❌ |
| **er_official** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ (Occupied only)| ❌ | ❌ |
| **er_room** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ (Occupied only)| ❌ | ❌ |

---

## 5. UI Redesign Contract & Invariant Requirements

When restructuring layouts, merging pages, and updating components during the UX redesign, the following data attributes, component interfaces, and functional invariants **must remain intact**:

### 5.1 Critical DOM Selectors & Accessibility Contracts (for E2E & Unit Test Stability)
1. **Action Buttons & Modals:**
   - Department Review actions: `#dept-review-section`, dropdown selecting `requirements_needed`, `direct_approval`, `urgent_approval`.
   - Accompanying Doctor form: `#escort-form-section`, input fields with placeholders `"Doctor's name"` and `"Doctor's phone number"`, button `"Save Accompanying Doctor"`.
   - Rejection Modal: text input `#rejectionReasonInput`, submit button `"Confirm Rejection"`.
   - Cancellation confirmation: button with text `"Cancel Referral"`, textarea with placeholder matching `"Reason for cancellation"`, submit button `"Confirm Cancellation"`.
   - Status actions: `"Accept the Transfer"`, `"Ready for Receive (Accepted)"`, `"Dispatch Ambulance"`, `"Mark as Arrived"`, `"Admit Patient"`, `"Discharge Patient"`.
2. **ECG Viewer Component (`ECGViewerOverlay`):**
   - Modal with `role="dialog"`, title `"ECG Quick-Viewer"`.
   - Controls with `aria-label`: `"Zoom in"`, `"Zoom out"`, `"Reset view"`, `"Toggle high contrast"` (with `aria-pressed`), `"Close ECG viewer"`.
   - Zoom indicator displaying `"100% zoom"` (`role="status"`).
3. **Form Inputs on Intake (`NewReferralPage`):**
   - Inputs for patient name, age, national ID, hospital ID, chief complaint, presentation, clinical notes, diagnosis.
   - Bed type selection (`ICU`, `CCU`, `PICU`, `Ward`).
   - Priority selection (`routine`, `urgent`, `emergency`).
   - Accompanying doctor checkbox (`requiresAccompanyingDoctor`).
   - Offline draft auto-saving with `localStorage` key `'newReferralDraft'`.

### 5.2 Context Hooks & API Signatures
All components relying on data must consume `useData()` and `useAuth()` with unchanged return contracts:
- `useData().updateReferralStatus(id, status, notes)`
- `useData().addDeptComment(id, status, comment)`
- `useData().recordPatientConsent(id)`
- `useData().recordPatientDecline(id, reason)`
- `useData().cancelReferral(id, reason)`
- `useData().setAccompanyingDoctor(id, name, phoneNumber)`
- `useData().overrideReferralDestination(id, newFacilityId)`
- `useData().toggleReferralEscalation(id, isEscalated)`
- `useData().addReferral(data, sendCriticalAlert)`
- `useData().addDirectAdmission(admissionData)`
- `useData().dischargeDirectAdmission(id)`
- `useData().assignShift(facilityId, department, userId)`
- `useData().updateFacilityCapacity(facilityId, capacityMap)`

### 5.3 Priority & Workflow Ordering Rule (`lib/referralPriority.ts`)
All lists showing active referrals (e.g. `ReferralsPage`, `Dashboard`, `ReferralWorkspacePane`) must order items using `sortByWorkflow()`:
1. `isEscalated == true` pinned to the very top.
2. Tier 1: `emergency` priority.
3. Tier 2: `urgent` priority.
4. Tier 3: `routine` priority.
5. Within each tier: **Oldest first** (`Date.parse(a.createdAt) - Date.parse(b.createdAt)`), ensuring longest-waiting patients receive immediate clinical focus.

---

## 6. Synthesis & Recommendations for Redesign Phase

1. **Keep State Operations inside `DataContext`:** The transactional logic in `DataContext.tsx` handles complex race conditions, audit log synchronization, capacity increments, and offline resilience. The UI overhaul should focus on presentation, component hierarchy, layouts, and user experience while directly invoking the proven `DataContext` actions.
2. **Preserve Role-Driven Adaptive Views:** Different personas (e.g., Nurse vs ER Official vs Head of Department) require distinct primary calls-to-action on the referral detail view. The unified stage rail and role-specific action prompts should be prominently highlighted in modern cards.
3. **Consolidate Redundant Multi-Page Steps into Unified Workspaces:** The desktop two-pane layout (`ReferralWorkspacePane`) and mobile responsive bottom sheets can merge the fragmented views (such as reviewing attachments, timeline, and department notes) into a cohesive clinical workflow.
