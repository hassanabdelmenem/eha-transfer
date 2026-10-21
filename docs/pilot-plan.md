# Pilot plan (draft)

Status: draft for the owner. Fill in every `TBD` before the pilot starts.

## Scope

- Referring facility: **TBD**
- Receiving facility: **TBD**
- Departments in scope: **TBD** (start with one receiving department)
- Duration: **TBD** (suggest 2 weeks)
- Language: English. Arabic stays off in production until the clinician review of
  `docs/i18n/arabic-review.csv` is done.

## Accounts (real, non-admin, one person per account)

| Facility | Role (`src/types/index.ts`) | Person | Verified |
| --- | --- | --- | --- |
| Referring | `er_official` | TBD | [ ] |
| Referring | `clinician` or `resident` | TBD | [ ] |
| Referring | `hospital_manager` | TBD | [ ] |
| Receiving | `head_of_department` | TBD | [ ] |
| Receiving | `consultant` or `specialist` | TBD | [ ] |
| Receiving | `nursing_supervisor` | TBD | [ ] |
| Receiving | `hospital_manager` or `deputy_manager` | TBD | [ ] |

Each person signs up themselves; an admin verifies them and sets role, facility and
department. No shared or test accounts in production. Set the shift delegate per
department before day one.

## Before day one

- [ ] Facilities and departments exist in production with correct bed data
- [ ] All accounts above verified; each person has signed in once on their own device
- [ ] Walk-through of the full flow on staging (`eha-transfer-staging`) with the same people
- [ ] Escalation sweep confirmed running (cron-job.org → workflow_dispatch, every 5 min)
- [ ] Named contact at each facility for problems, and a fallback (phone) referral path
- [ ] Agreement on what counts as a patient record in the app (minimum data, consent)

## During the pilot

Every referral goes Sent → Dept → Manager → Consent → Transit → Arrived → Admitted in
the app, alongside the usual phone process (the app does not replace it during the pilot).

Track per referral:

- Time at each step, and which step stalled
- Escalations fired, and whether someone acted on them
- Any step done outside the app
- Bed data that was wrong at decision time

## Success criteria (proposal)

- No dropped handoff: every referral reaches a final state in the app
- Every decision step recorded by the right role
- No data or access incident
- Staff at both facilities willing to continue

## Exit and rollback

Stop the pilot and return to phone-only if a patient-safety issue, an access incident or
repeated escalation failures occur. The owner makes the call.

## After the pilot

Review the tracked data with both facilities, list fixes, decide on expanding to more
facilities.
