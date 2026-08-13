# eha-transfer — Combined Review

**Date:** 13 August 2026
**Commit base:** `50db5b2` (plus one uncommitted change to `src/lib/firebase.ts`)
**Scope:** build/type risk, security assessment, design & UX, refactor/dead-code
**Method:** source-available static review. **The build was not executed** — see the note below.

---

## Note on the build phase

`npm run build` could not be run. The cloud sandbox this review ran in blocks
`registry.npmjs.org` at the network egress layer, so roughly nineteen packages —
including `vite` itself — return `403 Host not in allowlist` and the dependency tree
cannot be completed. The device-side shell was not a workaround either: it runs in a
Linux VM while the checked-in `node_modules` was installed on macOS, so rolldown's
native binding (`@rolldown/binding-darwin-arm64`) will not load there.

Everything below is therefore derived from reading the source rather than from
compiler or linter output. Findings are ranked by severity, and each one names the
file and line so it can be checked directly. The build-risk section is a substitute
for, not an equivalent of, a real `tsc --noEmit` run — that check should still be run
locally before shipping any of these changes.

---

## Status — all findings addressed in a follow-up pass

Every item below has been acted on. The table records how, because two were
mitigated rather than fully closed and that distinction matters.

| # | Finding | Status |
|---|---------|--------|
| C1 | Unfiltered referrals listener | **Fixed** — three party-scoped listeners, merged and de-duplicated; composite indexes added; five rules tests added |
| C2 | Consent/cancel-lock enforced client-side only | **Fixed** — `validStatusTransition()` added to the rules; seven tests added |
| H1 | `auditTrailAppendOnly` not append-only | **Mitigated** — exact-growth check plus an immutable opening entry. The middle of the trail is still rewritable; closing it needs the subcollection migration described below |
| H2 | Rule denials invisible to users | **Fixed** — toast bus; all 23 fire-and-forget writes report failures; the referrals listener reports too |
| H3 | `directAdmissions` update unpinned | **Fixed** — facility and patient identity pinned; three tests added |
| H4 | Auth errors leak and enumerate | **Fixed** — codes mapped to friendly copy, `user-not-found` and `wrong-password` collapsed |
| M1 | Dead normalisation in `AuthContext` | **Fixed** — spread moved ahead of the defaults |
| M2 | Capacity write can fail an admission | **Fixed** — the facility write is skipped by callers the rules would reject |
| M3 | Hardcoded bootstrap owner email | **Fixed** — removed. Confirm your owner document exists before deploying (see below) |
| M4 | Any verified user could write facility config | **Fixed** — `departments` now needs a senior role; `capacity` stays open so admissions keep working |
| M5 | Unconstrained notification fan-out | **Mitigated** — shape, length and `read: false` constraints. Fan-out is still client-side; a Cloud Function would close it properly |
| M6 | Accessibility | **Partly fixed** — focus rings, `aria-label`s, landmarks and heading hierarchy done. Typography and touch-target sizing left as a design decision, see below |
| M7 | 14 `alert()` call sites | **Fixed** — all replaced with toasts |
| Build risk | Fragile `lazyLoad` | **Fixed** — replaced with named-export imports, verified against all 15 pages |
| Cleanup | Dead deps and scaffolding | **Fixed** — `express`, `@types/express`, `fast-check` removed; four packages moved to devDependencies; `vite` de-duplicated; 14 scaffolding files removed |

### Three things still need a decision from you

**The build was never run.** Nothing here has been compiled or tested — see the
note above. Run `npm install && npm run lint && npm run test && npm run build`,
then `npm run test:rules`, before deploying any of it.

**Deploy order matters.** `firestore.indexes.json` gained three composite indexes
that the new referral queries depend on. Deploy indexes first and let them finish
building, then the rules, then the app — otherwise the referrals screen will fail
on a missing index instead of a permission error.

**Removing the bootstrap owner is irreversible from the client.** Confirm your
user document in Firestore still has `role: 'owner'` before deploying the new
rules. If it does not, set it from the Firebase console first.

### Deliberately not done

The **statusHistory subcollection migration** (H1) changes read paths across
`StatusTimeline` and `ReferralDetailPage` and needs a data migration, so it is too
large to fold into an unverified change set. It remains the correct fix.

**Typography and touch targets** (`text-[10px]` labels, `h-7` small buttons) are
consistent design choices rather than defects, and changing them alters the look
of every screen. Worth doing for an ER app used on phones, but it should be your
call, not a side effect of a security pass.

---

## Executive summary

The codebase is in better shape than most projects of its size. The Firestore rules
are genuinely well-designed, the comments explain intent rather than restating code,
and several sharp edges (Vite static replacement, `initializeAuth` re-entry, the
transactional bed-capacity increment) have clearly already been debugged carefully.

The most serious problems are concentrated in one place: **the boundary between what
the client assumes and what the security rules actually enforce.** Three separate
issues live there, and the first is likely breaking the application's main screen for
every non-admin user right now.

Counted findings: two critical, four high, six medium, and a set of cleanup items.

---

## Critical

### C1 — The referrals listener is unfiltered and will be rejected for all non-admin users

`src/contexts/DataContext.tsx:186`, `firestore.rules:138`

The referrals rule is `allow read: if isPrivileged() || (isVerifiedCaller() && isReferralParty(resource.data))`.
Because it reads `resource.data`, Firestore evaluates it against every document a
query would return, and rejects the entire query if any single document fails. Rules
filter nothing — they only permit or deny.

The query is:

```ts
const referralsQuery = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'), firestoreLimit(200));
```

There is no facility filter, so for a verified non-privileged user this asks for the
200 newest referrals across the whole network. The moment one of them belongs to
another facility — which in a multi-hospital network is essentially always — the
listener fails with `permission-denied`. Firestore does not retry a failed
`onSnapshot`, and the error handler here is bare `console.error`, so referrals simply
never populate and nothing surfaces to the user.

Three things make this diagnosis strong rather than speculative. First, the file's own
header comment at lines 124–127 states the rule exactly: *"a `list` rule that reads
resource.data is only satisfiable by a query filtered on the same field. Privileged
users read across facilities, so they query unfiltered."* Second, every sibling
collection already implements that branch — notifications (line 198), directAdmissions
(line 205), and shiftLogs (line 217) all switch on `isAdmin` and attach a `where`
clause. Referrals is the only collection that does not. Third, `tests/firestore.rules.test.ts`
contains no `list`/query test for referrals at all — only `getDoc` and `updateDoc` —
so nothing would have caught it.

This plausibly went unnoticed because the hardcoded bootstrap owner
(`firestore.rules:73`) is privileged and therefore *does* see everything, so testing
as that account looks healthy while ordinary staff see an empty list.

`loadOlderReferrals` at line 134 has the identical defect.

The fix mirrors the sibling collections, but referrals need two queries because
"party" spans three fields — `referringFacilityId`, `receivingFacilityId`, and
membership in `candidateFacilityIds`. A single `where` cannot express that, so it
needs either two or three parallel listeners merged client-side, or a denormalised
`participantFacilityIds` array on each referral queried with `array-contains`. The
latter is cleaner and matches how the rule already thinks about the problem.

Whichever route, add a rules test that performs an actual `getDocs` as a non-privileged
verified user — the current suite cannot catch this class of bug.

### C2 — Patient-consent gating and cancel-locking are enforced only on the client

`src/contexts/DataContext.tsx` (`updateReferralStatus`), `firestore.rules:145-149`

`updateReferralStatus` refuses to move a referral to `in_transit` unless its current
status is `patient_consented`. That check exists only in JavaScript. The rules place
**no constraints whatsoever on status transitions** — the non-cancel update path is
just `isPrivileged() || (isVerifiedCaller() && isReferralParty(resource.data))`.

Anyone who is a party to a referral can therefore call the Firestore SDK directly from
the browser console and set `status: 'in_transit'` on a patient who has not consented,
or on one who explicitly declined. In a clinical transfer system that is a patient-safety
control, not merely an authorization one.

The same gap defeats the cancel lock. `CANCEL_LOCKED_STATUSES` blocks cancellation once
a referral reaches `in_transit`, `arrived`, `admitted`, or `discharged`, and
`canCancelReferral` enforces that server-side via `isCancelLocked(resource.data)`. But
`isCancelAttempt` only inspects whether the *new* status is `cancelled`, and no rule
restricts other transitions. So the lock is bypassed in two writes: first set the status
back to `accepted` (permitted — it is not a cancel attempt), then set it to `cancelled`
(permitted — `accepted` is not cancel-locked). A patient already in an ambulance can be
cancelled out of the system by any party.

Fix by encoding the legal transition graph in the rules. A helper along the lines of

```
function validTransition(from, to) {
  return (from == 'pending'           && to in ['dept_approved','rejected','cancelled'])
      || (from == 'accepted'          && to in ['patient_consented','patient_declined','cancelled'])
      || (from == 'patient_consented' && to in ['in_transit','cancelled'])
      || (from == 'in_transit'        && to == 'arrived')
      // ...
      || to == resource.data.status;  // non-status edits
}
```

added to the `allow update` conjunction closes both holes at once, and makes the
client-side check a UX affordance rather than the only line of defence.

---

## High

### H1 — `auditTrailAppendOnly` does not actually enforce append-only

`firestore.rules:132-135`

```
function auditTrailAppendOnly() {
  return request.resource.data.statusHistory is list
      && request.resource.data.statusHistory.size() >= resource.data.statusHistory.size();
}
```

This checks only that the list does not *shrink*. It does not check that existing
entries are preserved. A party can submit a `statusHistory` of equal or greater length
whose earlier entries have been rewritten — changing recorded timestamps, attributing
decisions to a different `userId`, or altering the notes on a clinical decision. For an
audit trail in a medical system, that is the specific attack the control exists to stop.

The existing test at `tests/firestore.rules.test.ts:189` only asserts that
`statusHistory: []` is rejected, which the size check catches, so the suite reports
green.

Firestore rules cannot iterate a list to compare element-wise, so the durable fix is
structural: move status history into an immutable subcollection
(`referrals/{id}/statusHistory/{entryId}`) with `allow create: if <party>` and
`allow update, delete: if false`. That makes append-only a property of the data model
rather than something a predicate has to prove. As an interim mitigation, pinning the
first entry (`request.resource.data.statusHistory[0] == resource.data.statusHistory[0]`)
raises the bar slightly but does not close it.

### H2 — Every mutation is fire-and-forget, so rule denials are invisible to users

`src/contexts/DataContext.tsx` — `updateUserVerified:266`, `updateUserRole:273`,
`updateFacility:634`, `removeFacility:638`, `updateFacilityCapacity:309`,
`removeFacilityDepartment`, and others

The pattern throughout is `updateDoc(...).catch(console.error)`, and the context type
declares most of these as returning `void` rather than `Promise<void>`, so callers
cannot await them even if they wanted to.

Since Firestore rules are the *only* authorization layer in this app, a denied write is
the normal, expected outcome of an unauthorized action — and it produces no user-visible
signal at all. A clinician clicks "verify user" or edits bed capacity, the UI does not
complain, and the change silently never happened. In a bed-management context, staff
acting on a capacity number they believe they just corrected is a real operational risk.

This compounds C1: the same `console.error` habit is why the broken referrals listener
fails silently rather than loudly.

Change these signatures to return their promises, and surface failures through a toast
or inline error. `addShiftLog` already does exactly this and documents why
(lines 276–279) — that pattern should be the norm rather than the exception.

### H3 — `directAdmissions` update does not pin `facilityId`

`firestore.rules:171`

```
allow update: if isPrivileged() || (isVerifiedCaller() && resource.data.facilityId == callerFacility());
```

The condition reads `resource.data` — the document *before* the write — but nothing
constrains `request.resource.data`. A verified user at facility A can therefore update
an admission record at facility A and set its `facilityId` to facility B, moving an
identified patient record (name, hospital ID, department) out of their own facility's
scope and into another's, or into a nonexistent facility where it becomes unreachable.

The referrals rules solve precisely this with `referralIdentityPinned()`; that pattern
should be applied here:

```
allow update: if isPrivileged()
              || (isVerifiedCaller()
                  && resource.data.facilityId == callerFacility()
                  && request.resource.data.facilityId == resource.data.facilityId
                  && request.resource.data.patientName == resource.data.patientName
                  && request.resource.data.hospitalId == resource.data.hospitalId);
```

### H4 — Auth error handling both leaks and enumerates

`src/pages/Login.tsx:25,33`

```ts
alert(`${isRegistering ? 'Registration' : 'Login'} failed: ` + err.message);
```

Raw Firebase error messages go straight to the user, which distinguishes
`auth/user-not-found` from `auth/wrong-password`. That is a **user-enumeration
oracle**: an attacker can determine which hospital staff emails hold accounts, which is
useful reconnaissance for phishing a system that manages patient transfers.

It is also poor UX on its own terms — `alert()` blocks the page, cannot be styled, and
"Firebase: Error (auth/invalid-credential)" means nothing to a clinician.

Map Firebase error codes to friendly copy, collapse `user-not-found` and
`wrong-password` into a single "Email or password is incorrect", and render it inline
in the form rather than through `alert()`.

---

## Medium

### M1 — Defensive field normalisation in `AuthContext` is dead code

`src/contexts/AuthContext.tsx:79-86`

```ts
setUser({
  id: docSnap.id,
  name: data?.name || 'Unknown',
  role: (data?.role as User['role']) || 'resident',
  verified: typeof data?.verified === 'boolean' ? data!.verified! : false,
  ...data,          // <-- spread comes last
} as User);
```

Because `...data` is spread *after* the defaults, any key present in the Firestore
document overrides the sanitised value. The `typeof data?.verified === 'boolean'`
guard — clearly written to defend against a malformed `verified` field — has no effect:
a document containing `verified: "false"` (the string) passes straight through, and
`"false"` is truthy, so the client treats an unverified user as verified.

The rules still block the actual reads and writes, so this is a client-side display and
routing bug rather than a privilege escalation. But it routes an unverified user into
the authenticated shell where every listener then fails, which is a confusing failure
mode. Move the spread to the top:

```ts
setUser({ ...data, id: docSnap.id, name: ..., role: ..., verified: ... } as User);
```

### M2 — Bed-capacity increments can fail the whole admission transaction

`src/contexts/DataContext.tsx` (`updateReferralStatus`)

Marking a referral `admitted` also writes `capacity.{bedType}.occupied` on the
*receiving* facility inside the same transaction. The facilities rule
(`firestore.rules:90-92`) permits that only for `isPrivileged()` or
`atFacility(facilityId)`. If a user at the *referring* facility marks the referral
admitted, the facility write is denied and the entire transaction rolls back — the
status change is lost too, silently (see H2).

Either restrict the admit action to receiving-facility staff in the UI, or move the
capacity adjustment out of the referral transaction.

### M3 — Bootstrap owner backdoor is hardcoded in the rules

`firestore.rules:73`

```
|| request.auth.token.email == 'hassan.abdelmenem@gmail.com'
```

The comment correctly notes the email comes from a verified Firebase token and cannot
be spoofed, and flags it for removal once ownership is stable. Worth acting on: it ties
production authorization to one personal Gmail account, so compromise of that single
consumer account is full ownership of the patient-data system, and it cannot be revoked
without a rules deploy. Replace with a custom claim set by admin tooling.

### M4 — Any verified user can write bed capacity and department lists

`firestore.rules:90-92`

`atFacility(facilityId)` resolves to *any* verified user at that facility, including a
`resident`. So bed capacity and the department list are writable by the most junior
role. `BedManagementPage.tsx:15` computes an `isAdmin` flag, so the UI clearly intends
narrower access than the rules grant.

If capacity edits are meant for senior staff, add a role predicate to the rule rather
than relying on the screen not offering the control.

### M5 — Notification fan-out is unconstrained

`firestore.rules:160`

`allow create: if isVerifiedCaller()` lets any verified user create a notification
addressed to any other user, with arbitrary title and body, and no rate limit. Combined
with the network-wide user roster (`allow list: if isVerifiedCaller()`, line 64), that
is a ready-made internal phishing channel — a convincing "CRITICAL: transfer rejected"
notification can be sent to every clinician in the network.

The comment acknowledges client-side fan-out as the reason. Moving fan-out to a Cloud
Function would fix this, M5's sibling roster exposure, and the comment's own note at
lines 61–63 in one change. Short of that, constraining `type` to a fixed enum and
requiring `referralId` to reference a referral the caller is party to would help.

### M6 — Accessibility is essentially absent

Across `src/` there are exactly **two** `aria-` attributes in the entire application
(one each in `AdminDashboard.tsx` and `FacilitySettingsPage.tsx`). Specific issues:

The icon-only back button at `ReferralDetailPage.tsx:176` has no accessible name — a
screen reader announces "button". Any icon-only control needs an `aria-label`.

`Button.tsx:16` uses `focus-visible:ring-1` — a 1px focus indicator with no ring offset.
WCAG 2.2 Focus Appearance (2.4.13) expects substantially more contrast area; `ring-2
ring-offset-2` is the usual minimum.

`Button.tsx:23` sets `size="sm"` to `h-7` (28px). WCAG 2.5.8 sets a 24px floor, so this
technically passes, but 28px is a poor target for an emergency-department app used on
phones, possibly gloved. 44px is the practical standard for a primary action.

`text-[10px]` is used pervasively for labels (`Login.tsx:48,84,100`, `App.tsx:49`,
`Button.tsx:23`), almost always combined with `uppercase tracking-widest`. Uppercase
removes word-shape cues and 10px is below comfortable reading size; 12px minimum for
uppercase microcopy would be a meaningful improvement.

Pages each declare their own `<h1>` (`ReferralsPage.tsx:78`, `Dashboard.tsx:175`,
`ERDashboard.tsx:53`, and others) while `AppLayout.tsx:128` also renders an `<h1>` for
the app name. That yields two `<h1>` elements per page. The layout's should become a
`<p>` or `<div>`, leaving one `<h1>` per view.

`Login.tsx` has no `<main>` landmark and starts its heading hierarchy at `<h2>`.

None of these are individually severe, but the near-total absence of ARIA suggests
accessibility has not yet had a pass. For a government health system it is likely a
procurement requirement.

### M7 — Fourteen `alert()` call sites

`AppLayout.tsx:32`, `ERDashboard.tsx:38,46`, `Login.tsx:25,33`,
`FacilitySettingsPage.tsx:85`, `Onboarding.tsx:34`,
`ReferralDetailPage.tsx:105,122,130,139,152,532`, `NewReferralPage.tsx:117`

Most pass raw exception text (`e?.message`) to the user. Beyond the enumeration issue
in H4, `alert()` is modal and blocking — bad in an ER where a clinician may be
mid-workflow — and several messages are internal Firebase strings. A toast or inline
error component used consistently would fix the whole set. The message at
`FacilitySettingsPage.tsx:85` is a good model for the tone the others should adopt.

---

## Build and type risk (static substitute)

No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` anywhere in `src/`
or `public/` — the XSS surface is clean.

The one construct I would expect to cause trouble is `lazyLoad` at `App.tsx:15-24`:

```ts
const entry = Object.keys(m).find(k => typeof m[k] === 'function' || typeof m[k] === 'object');
if (entry) return { default: m[entry] };
```

For a module with no default export, this picks whichever export happens to come first
in `Object.keys()` of the ES module namespace — which is *alphabetically sorted*, not
declaration order. A page file that also exports a helper, a type guard, or a constant
object can therefore have the wrong value selected as its component, and the
`typeof === 'object'` branch will happily select a plain object. It also types the whole
thing as `any`, so TypeScript cannot catch the mistake.

Every page currently used here appears to export a named component, so this may work
today by coincidence of naming. It is fragile: adding an export named earlier in the
alphabet than the component to any lazily-loaded page breaks that route at runtime with
a confusing error. Give each page a `export default` and drop the helper.

Also worth noting: `tsconfig.json` should be checked for `strict` — several patterns in
`DataContext.tsx` (`const updates: any = { role }`, `useRef<any>(null)`) suggest strict
mode may not be catching much. And `typescript: "~7.0.2"` in devDependencies is an
unusual pin worth confirming against what `npm run lint` (`tsc --noEmit`) actually does.

**None of this substitutes for running the build.** Please run `npm run build` and
`npm run lint` locally before acting on the refactor section.

---

## Refactor and cleanup

### Dead dependencies

`express` and `@types/express` are not imported anywhere in `src/`, `e2e/`, `tests/`, or
`scripts/`. The `clean` script references `server.js`, which does not exist — likely
leftovers from an abandoned server-rendering approach. Both can be removed.

`@google/genai` and `dotenv` are in **`dependencies`** but are used only by
`scripts/generate-commit-msg.ts`, a developer tool that never ships. They belong in
`devDependencies`.

`vite` is likewise in `dependencies` rather than `devDependencies`.

### Test-scaffolding files committed to `src/`

These are tracked in git and appear to be mutation-testing and coverage scaffolding
rather than application code:

`src/sum.ts`, `src/multiply.ts`, `src/async.ts` (toy functions — `a + b`, `a * b`, a
`setTimeout` promise), together with `src/sum.test.ts`, `src/multiply.test.ts`,
`src/async.test.ts`, `src/more.test.ts`, `src/property.test.ts`, `src/invalid.test.ts`,
`src/edge.test.ts`, and `src/targeted_survivors.test.ts` — 217 lines of tests over
roughly 10 lines of trivial source.

The filename `targeted_survivors.test.ts` gives the game away: these exist to kill
surviving Stryker mutants and lift the coverage number. They inflate the reported
coverage of a codebase whose actual clinical logic — `DataContext.tsx` at 929 lines —
is the part that needs testing. Deleting them will lower the coverage percentage and
make it honest.

If they are genuinely wanted as a scratchpad, move them out of `src/` so they are
excluded from coverage and from the production type-check.

### Documentation drift

`src/lib/firebase.ts:139` says "Initialize Firestore without persistent cache to avoid
IndexedDB locking errors", but the uncommitted change switched Auth from
`browserSessionPersistence` to `browserLocalPersistence` and removed the corresponding
comment. Worth confirming the IndexedDB locking problem that motivated session
persistence has actually been resolved rather than reintroduced — and if it has,
updating the Firestore comment to match.

Note also that `browserLocalPersistence` keeps sessions alive across browser restarts.
On a shared ER workstation that is a meaningful change: the next person to open the
browser is signed in as the previous clinician. Given the patient data involved, an
idle-timeout should probably accompany it.

---

## Suggested order of work

1. **C1** — fix the referrals query. If non-admin users currently see no referrals, this is production-down for them.
2. **C2** — add status-transition constraints to the rules; this closes the consent bypass and the cancel-lock bypass together.
3. **H2** — make mutations return promises and surface errors. Do this early: it makes everything after it observable.
4. **H1**, **H3** — the audit-trail subcollection and the `directAdmissions` pin.
5. **H4**, **M7** — replace `alert()` with a toast/inline error, and stop leaking raw auth errors.
6. **M1**, **M2** — the spread-ordering fix and the capacity-transaction scoping.
7. **M3**–**M5** — rules hardening; consider the Cloud Function for notification fan-out, which resolves several at once.
8. **M6** — an accessibility pass.
9. Cleanup — dead deps and the `src/` test scaffolding.

Before any of this lands, add a rules test that issues a real `getDocs` as a
non-privileged verified user against each collection. The current suite tests
single-document reads only, which is why C1 is invisible to it.
