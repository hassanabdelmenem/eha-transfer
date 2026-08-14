# Prompt for Antigravity IDE

Paste everything below the line into Antigravity with the `eha-transfer` repo open.

---

You are working in the `eha-transfer` repo: React 19 + Vite + Firebase/Firestore,
a hospital patient-transfer system for Ismailia. **This project is on the Firebase
Spark (free) plan.** That constraint drives several decisions below — do not
assume Cloud Functions are available.

Read `REVIEW.md` first for background: it is a security and design review whose
findings have already been applied.

**Critical context:** everything currently in the working tree was written in a
sandbox with no npm access. It has **never been installed, compiled, linted,
tested, or built.** Individual pure modules were verified by compiling and
executing them (`src/lib/sla.ts`, `src/lib/routing.ts` — 45 assertions passing),
but nothing else. `git status` shows roughly 15 changed or new files. Treat the
whole change set as unverified.

Work the phases in order. Do not begin a phase until the previous one is green.
Stop and report at each **STOP GATE**.

---

## What the recent work does

Two escalation triggers were added to the referral workflow. Both write the same
fields (`isEscalated`, `escalatedAt`, `escalatedBy`, `escalationReason`,
`escalationLevel`) and both are idempotent — the condition is re-checked inside a
Firestore transaction, so concurrent writers cannot double-escalate.

**1. SLA breach (30 minutes).** A pending, emergency-or-urgent referral for an
ICU/CCU/PICU bed that nobody has responded to within 30 minutes escalates
automatically. Previously the 30-minute rule existed *only* as a countdown badge
in `ReferralList.tsx`; it turned red and nothing happened, because the sole
writer of `isEscalated` was a manual button. The rule now lives in
`src/lib/sla.ts` and is shared by the badge and the escalation. Notifies senior
staff at the referring and candidate facilities, plus all admins.

**2. No route for the patient (top-level).** Either no facility in the network
provides the required departments *and* bed type, or every matching facility is
full. Escalates to `escalationLevel: 'system'` and notifies **owners and
system_admins only** — deliberately not the facilities, because the whole point
is that no facility can take the patient. Logic lives in `src/lib/routing.ts`.
Evaluated on every sweep tick rather than at creation: referrals are always
created in a single known state (`pending`, unescalated, one audit entry) so the
rules can pin that shape exactly, and the sweep escalates on the very next
snapshot — which is the write the form itself triggers.

Two behaviour changes worth knowing before you test:

- The new-referral form **no longer refuses to submit** when nothing matches. It
  previously showed a red toast and dropped the referral entirely, so the most
  urgent case in the system produced no record and notified nobody. It now
  creates the referral, escalates it, and tells the clinician that is what
  happened.
- Candidate facilities now require the **bed type to be configured**, not just
  the departments. A hospital with Cardiology but zero ICU beds was previously
  offered ICU transfers it could never accept.

---

## Phase 0 — Make it build

1. **Delete the `_to_delete/` folder at the repo root before running any tests.**
   It holds 14 scaffolding files (`sum.ts`, `multiply.ts`, `async.ts`,
   `format.ts` and their tests) that were moved rather than deleted, because the
   tool that wrote them could not delete. This matters: `vite.config.ts` does not
   exclude `_to_delete/**` from the vitest sweep, and the files were moved as
   complete units — tests *and* their sources — so their imports still resolve.
   They would run, pass, and silently restore the coverage inflation the cleanup
   removed. Also remove the empty `src/__snapshots__/` directory.

2. Run in order, fixing what breaks before moving on:
   ```
   npm install
   npm run lint      # tsc --noEmit
   npm run test      # vitest
   npm run build     # vite build
   npm run test:rules   # needs the Firestore emulator
   ```

**Where breakage is most likely:**

- `src/contexts/DataContext.tsx` has by far the largest change. Watch the
  `useCallback` ordering: `escalateForCapacity` and `autoEscalateReferral` are
  referenced in the dependency array of the sweep `useEffect` and must be
  declared *above* it, or you get a temporal-dead-zone `ReferenceError` on first
  render. This was already hit and fixed once.
- `functions/src/index.ts` is type-checked by the root `tsc` even though it is a
  separate package (the root tsconfig has no `include`). It resolves its imports
  from `functions/node_modules`.
- `src/lib/sla.test.ts` imports `../../functions/src/sla` on purpose — see
  Phase 2.
- Coverage will drop once the scaffolding tests are gone. **That is correct** —
  they asserted `sum(2, 2) === 4`. Do not restore them or add filler tests to
  hit a threshold. If a gate fails, tell me the number and which real modules
  are untested.

**STOP GATE 1 — report** what failed, what you changed, and the final result of
all five commands. Deploy nothing yet.

---

## Phase 1 — Deploy (Spark plan)

1. **Verify the owner account first.** In the Firebase console for
   `eha-transfer-1785622025`, open Firestore → `users` and confirm the document
   for `hassan.abdelmenem@gmail.com` has `role: 'owner'` and `verified: true`.
   A previous change removed a hardcoded bootstrap escape hatch from the rules
   that let that one email self-assign a privileged role. If the owner document
   is missing or wrong, fix it in the console **before** deploying rules, or
   nobody can be promoted from the client afterwards.

2. **Deploy indexes and wait for them to finish building.**
   ```
   firebase deploy --only firestore:indexes
   ```
   `firestore.indexes.json` contains composite indexes the referral listeners
   depend on. Watch the console until every index reads **Enabled**, not
   Building. If the app ships first, the referrals screen fails on a missing
   index rather than showing data.

3. **Rules, then hosting.**
   ```
   firebase deploy --only firestore:rules
   npm run build
   firebase deploy --only hosting
   ```

4. **Do not run a bare `firebase deploy`.** `firebase.json` contains a
   `functions` block (it always has), and deploying Cloud Functions requires the
   Blaze plan. On Spark that command fails partway through. Always use `--only`
   as above. Nothing in `functions/` is deployed, and nothing in the app calls
   it — the escalation features work without it.

5. **Smoke-test as a real non-admin clinician**, not as the owner. The original
   referrals bug was invisible to admins by construction, so owner-only testing
   proves little. Confirm:
   - referrals appear on the dashboard for an ordinary clinician
   - **SLA escalation:** create a pending emergency ICU referral, leave the app
     open, and confirm that at 30 minutes the badge flips from `No response` to
     `Escalated` and an urgent notification arrives. To test faster, lower
     `SLA_MINUTES` in **both** `src/lib/sla.ts` and `functions/src/sla.ts` — and
     note the rules enforce the real window independently via `createdAtMs`, so
     a shortened client threshold will be *rejected* by `slaWindowElapsed()`
     until 30 real minutes have passed. To exercise the fast path you must lower
     the `1800000` in `firestore.rules` too. Put all three back before deploying.
   - **No-match escalation:** create a referral requiring a department or bed
     type no facility offers. It should be created (not rejected) and, within a
     moment, flagged `No hospital can take this patient`, notifying system
     admins only.
   - **No-beds escalation:** set every matching facility's bed type to
     `occupied == total` on the Bed Management screen, then create a referral for
     that bed type. Expect `Every matching hospital is full`.
   - **De-escalation sticks:** press De-escalate on an escalated referral and
     confirm it stays de-escalated rather than re-raising itself seconds later.

**STOP GATE 2 — report** deploy results and each smoke-test outcome.

---

## Phase 1.4 — Migration required before the new rules go live

The hardening below introduced `createdAtMs` (epoch milliseconds) on referrals and
notifications. Firestore rules cannot parse an ISO string, so this field is what
lets them verify a claimed 30-minute SLA breach against server time, and what
stops a notification being dated into the future to pin itself to the top of a
clinician's tray.

New documents get it automatically. **Existing ones do not**, and the rules are
written to let legacy documents through unverified rather than freeze them —
`slaWindowElapsed()` returns true when `createdAtMs` is absent. That is
deliberate, but it means every referral created before this deploy keeps the old,
unverifiable behaviour forever.

Backfill it once, from the Firebase console or a one-off admin script:

```js
// for each referrals/{id} lacking createdAtMs:
{ createdAtMs: Date.parse(doc.createdAt) }
// same for notifications/{id}
```

Then, if you want the guarantee to be universal, change `slaWindowElapsed()` and
the notification rule to require the field rather than tolerate its absence.

---

## Phase 1.5 — Findings still open after the hardening pass

Most of the review findings are now fixed in the rules and the client. What is
listed here is what genuinely could not be closed on the Spark plan, plus the one
residual that needs a data-model change. Do not treat these as done.

**S6 (medium, NOT FIXABLE ON SPARK). The whole `/users` collection is readable by
every verified account**, including `email` and `phoneNumber` — a complete staff
directory for the network, useful as a phishing target list.

This is structural, not an oversight. Notification fan-out runs in the browser and
has to resolve recipients at *other* facilities, so the client genuinely needs
cross-facility user reads. Firestore rules cannot express "you may read users at a
facility that is a party to a referral you can see". Splitting contact details into
a separate collection does not help either: the on-call hotline, the network
directory and the "call the referring doctor" action on a referral all legitimately
read phone numbers across facilities.

The fix is the same one that closes several other items: move fan-out into the
Cloud Function on Blaze, then narrow `/users` to the caller's own facility. Until
then this is an accepted risk, and it is the strongest argument for upgrading.

**Residual on the audit trail.** `auditTrailAppendOnly()` now allows at most one
new entry per write and pins entry `[0]`, but rules cannot iterate a list, so the
middle of the trail is still rewritable by a party in a single write. The
create-only subcollection in Phase 2c is the real fix.

**Residual on capacity escalations.** `escalationClaimValid()` verifies an
`sla_breach` claim against server time, so that one cannot be faked. It cannot
verify `no_beds_available` or `no_matching_facility`, because confirming those
needs a read of every candidate facility and rules allow at most ten `get()` calls
per request. A party can therefore still assert a capacity escalation falsely. The
scheduled function closes this too.

**D1 residual (design).** The SLA badges, priority chips and escalation banner now
use a `--color-critical-*` / `--color-warning-*` scale that sits outside the brand
ramp. Every *other* red/amber usage in the app still resolves to the same orange,
so any remaining status colour carries no information. Worth an audit pass with the
app actually running.

**D3 residual (accessibility).** `--color-slate-400` and `--color-slate-500` were
given distinct, darker values so muted text passes contrast in light mode. They are
a compromise: one token has to serve `text-slate-500` on white and
`dark:text-slate-400` on near-black, so both land around 4.3–4.6:1 rather than
comfortably above. Verify against real screens and split into explicit
light/dark pairs if any of it still reads thin.

---

## Phase 2 — Known gaps, in priority order

Do these one at a time, each as its own commit with tests. Ask me before starting
each.

**2a. The overnight escalation gap (the important one).**

On Spark, escalation runs **only in the browser**, in a 30-second sweep inside
`DataContext`. It therefore only fires for referrals a signed-in user is
currently watching. A referral raised at 3am with nobody logged in does not
escalate until someone next opens the app — which is exactly the scenario
escalation exists for.

`functions/src/index.ts` already contains a finished scheduled function
(`escalateBreachedReferrals`, every minute) that closes this. It is written,
type-checked, and **not deployed**, because scheduled functions require Blaze.
Its header comment has the exact steps. When the plan is upgraded: deploy it,
add the `(status, createdAt)` composite index it queries, and no other change is
needed — both writers guard the same transaction, so they coexist safely.

Until then, be explicit with the clinical team that overnight escalation is not
automatic. Do not describe this feature as fully working.

**2b. The duplicated SLA constant.**

`functions/src/sla.ts` is a deliberate self-contained copy of `src/lib/sla.ts`.
Sharing the real module would require pointing the functions `rootDir` at the
repo root, which moves every emitted path and changes the deploy entrypoint from
`lib/index.js`. The duplication is guarded: `src/lib/sla.test.ts` imports both
copies and fails if the threshold or tracked scope drift apart. **If you change
the SLA rule, change both files** and let that test confirm it.

**2c. Make the audit trail genuinely append-only.**

`statusHistory` is an array on the referral document. Firestore rules cannot
iterate a list, so `auditTrailAppendOnly()` can only enforce that the array grows
by at most one entry per write and that entry `[0]` is unchanged. The middle of
the trail is still rewritable by any party. For a system whose audit trail
records who authorised moving a patient, this is the weakest remaining guarantee.
Migrate to `referrals/{id}/statusHistory/{entryId}` as a create-only
subcollection. Needs a rules change, a backfill migration, and updates to every
read path (`StatusTimeline`, `ReferralDetailPage`, and the transaction bodies in
`DataContext` that spread `[...r.statusHistory, entry]`). Plan before coding.

**2d. Idle timeout on auth.**

Auth uses `browserLocalPersistence` so clinicians are not signed out mid-shift.
On a shared ER workstation the next person to open the browser is signed in as
the previous clinician. Add an inactivity timeout calling `signOut()` — 15–30
minutes is typical for clinical systems. Confirm the duration with me.

**2e. Typography and touch targets.**

`text-[10px]`/`text-[9px]` labels and `h-7` buttons are below comfortable
minimums for phone use in an ER (WCAG 2.1 AA suggests 24px minimum targets; 44px
is the practical touch standard). These are consistent design choices rather than
defects, so propose a scale, show me before/after screenshots of the dashboard
and referral detail screens, and wait for approval.

---

## Ground rules

- Never weaken a Firestore rule to make a test pass. If a rule and a test
  disagree, work out which is wrong and tell me.
- Never restore the deleted scaffolding tests or add trivial tests to lift
  coverage.
- Keep the mirrored logic in sync. `firestore.rules` mirrors
  `src/contexts/DataContext.tsx` (query shapes ↔ `isReferralParty`, status graph
  ↔ `validStatusTransition`), and `functions/src/sla.ts` mirrors
  `src/lib/sla.ts`. Each file says so in a comment. Change one, change the other,
  and update the tests.
- `SLA_MINUTES` is a clinical threshold. Do not change it as a side effect of
  anything, and never leave a lowered test value committed.
- Commit in logical units with real messages, not one sweeping "fix everything".
