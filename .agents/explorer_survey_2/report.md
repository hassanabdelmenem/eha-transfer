# Comprehensive Security & Access Control Survey Report
**Project:** Ismailia Health Connect (`eha-transfer`)  
**Survey Scope:** 14 System Roles, Cross-Facility Data Isolation, and Firestore Security Rules Audit  
**Author:** Explorer 2 (Survey Phase)  
**Date:** 2026-08-22  

---

## 1. Executive Summary

This report provides a comprehensive architectural and security audit of the Ismailia Health Connect (`eha-transfer`) application. The application operates in a serverless model where client web browsers interact directly with Cloud Firestore; hence, Firestore Security Rules (`firestore.rules`) and frontend contextual constraints serve as the primary security perimeter for Protected Health Information (PHI), patient referral lifecycles, and facility bed management across Ismailia Governorate healthcare facilities.

### Key Audit Highlights:
- **14 Role Architecture:** The system models 14 distinct roles spanning global administration, facility leadership, clinical physicians, nursing staff, and emergency coordinators.
- **Cross-Facility Data Isolation:** Strictly enforced at the database level for all sensitive collections (`referrals`, `directAdmissions`, `shiftLogs`, `facilities`). Unprivileged users cannot view or manipulate records outside their assigned facility or referral involvement.
- **Security Rule Posture:** Firestore rules employ robust field pinning (`referralIdentityPinned`, `referralClinicalDataPinned`), strict status state machines (`validStatusTransition`), actor binding (`transitionActorAllowed`), and SLA/capacity verification (`slaWindowElapsed`, `escalationClaimValid`).
- **Identified Discrepancies & Bottlenecks:**
  1. *Facility Leadership User Management Mismatch:* The UI in `FacilitySettingsPage.tsx` allows local hospital managers/directors to verify accounts and modify user roles, but `firestore.rules` restricts `/users` updates strictly to `isPrivileged()` (`owner`, `system_admin`), resulting in rejected writes for local leadership.
  2. *`clinician` Role Exclusion in UI:* The `clinician` role exists in the `Role` type union and seed data, but is omitted from `isDoctor` arrays in `AppLayout.tsx` and `NewReferralPage.tsx`, blocking users with this role from accessing doctor workflows in the UI.
  3. *Authority Source (Document Reads vs. Custom Claims):* Security rules rely on `get(/databases/$(database)/documents/users/$(request.auth.uid))` (`callerDoc()`) rather than Firebase Auth custom claims, adding a document read to rule executions.

---

## 2. 14 System Roles & Permission Matrix

The application defines 14 roles in `src/types/index.ts` (type `Role`). The table below outlines each role's remit, UI access gates, client-side mutations in `DataContext.tsx`, and server-side rules in `firestore.rules`.

### Role Overview & Taxonomy

| Role Identifier | Category | Primary Focus / Remit |
| :--- | :--- | :--- |
| `owner` | Global Admin | Full system owner, root administrative and override authority. |
| `system_admin` | Global Admin | Regional/network administrator, manages facilities, escalations, force placements. |
| `medical_director` | Facility Leadership | Clinical director of a facility, final referral approvals, bed/dept config, senior cancel. |
| `hospital_manager` | Facility Leadership | Executive facility manager, final referral approvals, bed/dept config, senior cancel. |
| `deputy_manager` | Facility Leadership | Deputy facility manager, final referral approvals, bed/dept config, senior cancel. |
| `head_of_department` | Department Leadership | Department head, clinical reviews (`dept_approved`, `requirements_needed`), shift delegation. |
| `consultant` | Senior Physician | Senior doctor, creates referrals, reviews referrals if delegated on-call shift. |
| `specialist` | Senior Physician | Specialist doctor, creates referrals, reviews referrals if delegated on-call shift. |
| `resident` | Frontline Physician | Default self-signup role, creates referrals, edits/cancels own referrals. |
| `clinician` | Generic Physician | Generic clinician type (omitted in UI doctor checks, permitted in rule creation). |
| `nursing_supervisor` | Nursing Leadership | Manages bed occupancy, receives hotlines, direct walk-in admissions. |
| `nurse` | Floor Nursing | Bed management stepper (+/- occupancy), admits arrived patients, walk-in admissions. |
| `er_official` | Emergency Coordination | ER official (onboarding role), handles ambulance dispatch, records arrival, assigns doctor escort. |
| `er_room` | Emergency Coordination | Legacy ER room role alias (treated identically to `er_official`). |

---

### Detailed Permission Matrix

| Capability / Action | `owner` / `system_admin` | `medical_director` / `hospital_manager` / `deputy_manager` | `head_of_department` | `consultant` / `specialist` / `resident` | `nurse` / `nursing_supervisor` | `er_official` / `er_room` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Global Unfiltered Read** | ✅ All facilities | ❌ Facility only | ❌ Facility only | ❌ Facility only | ❌ Facility only | ❌ Facility only |
| **Create Referral (`/referrals`)** | ✅ | ✅ | ✅ | ✅ (`clinician` blocked in UI) | ❌ | ❌ |
| **Department Review (`dept_approved` / `requirements_needed`)** | ✅ (Admin direct action) | ❌ (Manager level only) | ✅ (Assigned dept) | ✅ (Only if delegated shift) | ❌ | ❌ |
| **Manager Final Approval (`manager_approved` / `rejected`)** | ✅ (Admin direct action) | ✅ (Receiving facility) | ❌ | ❌ | ❌ | ❌ |
| **Record Patient Consent (`patient_consented`)** | ✅ | ✅ (Referring facility) | ✅ (Referring facility) | ✅ (Referring facility) | ❌ | ✅ (Referring facility) |
| **Assign Escort Doctor (`accompanyingDoctor`)** | ✅ | ❌ (Rejected by rules) | ❌ (Rejected by rules) | ❌ (Rejected by rules) | ❌ (Rejected by rules) | ✅ (Party ER official) |
| **Dispatch Ambulance (`in_transit`)** | ✅ | ✅ (Party facility) | ✅ (Party facility) | ✅ (Party facility) | ❌ | ✅ (Party facility) |
| **Confirm Arrival (`arrived`)** | ✅ | ✅ (Party facility) | ✅ (Party facility) | ✅ (Party facility) | ❌ | ✅ (Party facility) |
| **Admit Patient (`admitted`)** | ✅ | ✅ (Receiving facility) | ✅ (Receiving facility) | ✅ (Receiving facility) | ✅ (Receiving facility) | ✅ (Receiving facility) |
| **Cancel Referral (Pre-transit)** | ✅ Any referral | ✅ Referring facility | ✅ Referring facility | ✅ Only if creator (`referringUserId`) | ❌ | ❌ |
| **Admin Force Placement / Destination Override** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Modify Bed Totals / Departments** | ✅ | ✅ (`isFacilityConfigRole`) | ✅ (`isFacilityConfigRole`) | ❌ | ❌ | ❌ |
| **Modify Bed Occupancy (+/-)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Direct Admission (Walk-in)** | ✅ | ✅ (Own facility) | ✅ (Own facility) | ✅ (Own facility) | ✅ (Own facility) | ✅ (Own facility) |
| **Delegate Shift Assignment** | ✅ | ❌ | ✅ (Own department) | ❌ | ❌ | ❌ |
| **Verify Users / Change Roles** | ✅ (`isPrivileged`) | ⚠️ (UI allows, Rules deny) | ⚠️ (UI allows, Rules deny) | ❌ | ❌ | ❌ |

---

## 3. Cross-Facility Data Isolation Mechanisms

Cross-facility isolation is enforced via a defense-in-depth model across both server-side security rules and client-side listener query shapes.

### 1. `referrals` Collection Isolation
- **Rule Definition (`firestore.rules`):**
  ```javascript
  function isReferralParty(data) {
    return ('referringFacilityId' in data && callerFacility() == data.referringFacilityId)
        || ('receivingFacilityId' in data && callerFacility() == data.receivingFacilityId)
        || ('receivingFacilityId' in data && data.receivingFacilityId == 'auto'
            && 'candidateFacilityIds' in data
            && callerFacility() in data.candidateFacilityIds);
  }

  match /referrals/{referralId} {
    allow read: if isPrivileged() || (isVerifiedCaller() && isReferralParty(resource.data));
  }
  ```
- **Client Query Shapes (`DataContext.tsx`):**
  Because Firestore rules reject queries where any potential document could fail authorization, `DataContext.tsx` uses three indexed queries merged client-side:
  1. `where('referringFacilityId', '==', user.facilityId)`
  2. `where('receivingFacilityId', '==', user.facilityId)`
  3. `where('receivingFacilityId', '==', 'auto')` + `where('candidateFacilityIds', 'array-contains', user.facilityId)`
- **Candidate Expansion Prevention:** `candidateListNotWidened()` prevents any party from appending facility IDs to `candidateFacilityIds`, ensuring an attacker cannot grant unauthorized hospitals read access to a patient record.

### 2. `directAdmissions` Collection Isolation
- **Rule Definition:**
  ```javascript
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
  }
  ```
- **Isolation Guarantee:** Walk-in patient records with identifiable health data are strictly bounded to the host hospital. Cross-facility reads or moving patient records between facilities is blocked.

### 3. `shiftLogs` Collection Isolation
- Handover summaries contain clinical summaries and patient counts.
- Read is restricted to `resource.data.facilityId == callerFacility()`.
- Create is restricted to `request.resource.data.facilityId == callerFacility() && request.resource.data.userId == request.auth.uid`.
- Updates and deletions are permanently disabled (`allow update, delete: if false;`), ensuring immutable audit logs.

### 4. `facilities` Collection Isolation
- Bed occupancy updates and department modifications are gated on `atFacility(facilityId)`: staff at Hospital A cannot manipulate bed counts, department lists, or capacities of Hospital B.

---

## 4. Security Rules Red Team Audit & Vulnerability Assessment

### Audit Score: 4.5 / 5.0 (Highly Secure with Minor Architectural Gaps)

```json
{
  "score": 4,
  "summary": "Robust server-side Firestore security rules with comprehensive field pinning, state graph validation, and cross-facility isolation. Minor inconsistencies between UI expectations and server-side rules regarding facility leadership user management.",
  "findings": [
    {
      "check": "The Update Bypass",
      "severity": "minor",
      "issue": "Audit trail history array can theoretically have intermediate entries modified by an authorized party (elements 1..N-1), though index 0 and length growth are constrained.",
      "recommendation": "Migrate statusHistory to an immutable create-only subcollection: /referrals/{id}/statusHistory/{entryId}."
    },
    {
      "check": "Authority Source",
      "severity": "minor",
      "issue": "Rules rely on callerDoc() Firestore lookups rather than Firebase Auth Custom Claims, incurring document read overhead during rule execution.",
      "recommendation": "Deploy a Cloud Function trigger on /users/{uid} to sync role, facilityId, and verified into custom claims."
    },
    {
      "check": "Business Logic vs. Rules",
      "severity": "moderate",
      "issue": "FacilitySettingsPage allows hospital_manager and medical_director to verify users and change roles in UI, but firestore.rules restricts user updates exclusively to isPrivileged() (owner, system_admin).",
      "recommendation": "Either expand firestore.rules for /users/{uid} to permit facility leadership verification of staff within their own facility, or update the UI to indicate verification requires system admin escalation."
    },
    {
      "check": "Type Safety & Validation",
      "severity": "secure",
      "issue": "Extensive type checking, timestamp boundedness (createdAtMs <= request.time.toMillis() + 300000), string size limits on notifications, and sane bed counts (0 <= occupied <= total).",
      "recommendation": "Maintain existing assertion patterns."
    }
  ]
}
```

---

## 5. Specific Feature Audits

### 5.1 Referral Lifecycle State Graph (`validStatusTransition`)
The status progression is strictly validated:
```
pending ──► dept_approved ──► manager_approved ──► accepted ──► patient_consented ──► in_transit ──► arrived ──► admitted ──► discharged
   │               │                  │                │               │
   ├──► postponed ─┴──────────────────┴────────────────┤               └──► (Cancel-locked)
   ├──► rejected ──────────────────────────────────────┘
   └──► cancelled (Pre-transit only)
```
- **Cancellation Protection (`isCancelLocked`):** Once a referral reaches `in_transit`, `arrived`, `admitted`, or `discharged`, cancellation is rejected at both UI and rules layers.
- **Patient Consent Gate:** Moving to `in_transit` strictly requires the referral to be in `patient_consented` status; moving directly from `accepted` to `in_transit` is rejected.
- **Accompanying Doctor Gate:** If `requiresAccompanyingDoctor == true`, transitioning to `in_transit` requires an accompanying doctor map containing a valid `name` and `phoneNumber`.

### 5.2 Capacity & SLA Escalation Safeguards
- **SLA Timing Veracity:** Rules evaluate `request.time.toMillis() >= resource.data.createdAtMs + 1800000` (`slaWindowElapsed()`). A client cannot forge an early `sla_breach` escalation before the 30 minutes have genuinely elapsed.
- **Attribution Veracity:** Automatic escalations must specify `escalatedBy == 'system'`, whereas manual human escalations must specify `escalatedBy == request.auth.uid`.

---

## 6. Recommendations for Multi-Role E2E & Lifecycle Testing

1. **Role Persona Lifecycle Test Matrix:**
   - Execute test scenarios for each actor role (Referring Resident -> Dept Head -> Medical Director -> Receiving ER Official -> Ward Nurse -> System Admin).
2. **Edge Case Verification:**
   - Patient decline and re-route workflow (`recordPatientDecline` -> status reset to `pending` -> candidate pruning).
   - Requirements needed postponement (`addDeptComment('requirements_needed')` -> direct postponement -> auto-escalation).
   - Accompanying doctor requirement enforcement (dispatch blocked until ER official assigns escort).
   - Bed capacity saturation (0 available beds triggering capacity escalation).
3. **UI vs Rule Alignment Fixes:**
   - Address the `clinician` role check in `AppLayout.tsx` and `NewReferralPage.tsx`.
   - Reconcile local facility manager user verification in `FacilitySettingsPage.tsx` vs `firestore.rules`.
