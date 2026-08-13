# Prompt for Antigravity IDE

Paste everything below the line into Antigravity, with the `eha-transfer` repo open.

---

You are working in the `eha-transfer` repo (React 19 + Vite + Firebase/Firestore,
a hospital patient-transfer system for Ismailia). Read `REVIEW.md` first — it is a
security and design review with a status table at the top listing 15 findings and
how each was addressed.

**Critical context:** a previous agent applied all of those fixes in a sandbox
that had no network access to npm. **Nothing in the current working tree has ever
been installed, compiled, linted, tested, or built.** It was verified with a
syntax-only `tsc` parse and nothing more. Treat the entire change set as
unverified. `git status` will show ~34 changed files.

Work through the phases below **in order**. Do not start a phase until the
previous one is green. Stop and report at each **STOP GATE** rather than pushing
through.

---

## Phase 0 — Make the existing change set actually build

The `package.json` dependency block changed: `express`, `@types/express` and
`fast-check` were removed; `@google/genai`, `dotenv`, `@tailwindcss/vite` and
`@vitejs/plugin-react` moved to `devDependencies`; a duplicated `vite` entry was
removed from `dependencies`. So the lockfile is stale.

1. **Delete the `_to_delete/` folder at the repo root, first, before running any
   tests.** It holds 14 scaffolding files (`sum.ts`, `multiply.ts`, `async.ts`,
   `format.ts` and their tests) that were moved rather than deleted, because the
   tool that wrote them could not delete. This matters more than it looks:
   `vite.config.ts` does not exclude `_to_delete/**` from the vitest sweep, so
   those tests will still be collected and run — silently undoing the cleanup and
   re-inflating the coverage number with tests that assert `sum(2,2) === 4`.
   Also remove the now-empty `src/__snapshots__/` directory.

2. Run, in order, fixing what breaks before moving on:
   ```
   npm install
   npm run lint      # tsc --noEmit
   npm run test      # vitest
   npm run build     # vite build
   ```

3. Then the rules tests, which need the Firestore emulator:
   ```
   npm run test:rules
   ```

**Likely breakage, so you know where to look:**

- `src/contexts/DataContext.tsx` has the largest change (~200 lines). The
  referrals listener was replaced with three party-scoped listeners built from a
  `referralQueryShapes()` helper returning `Record<string, any[]>` of Firestore
  constraints, spread into `query(...)`. If TypeScript objects to the spread,
  type the arrays as `QueryConstraint[]` rather than loosening to `any`.
- `src/App.tsx` replaced a reflective `lazyLoad()` helper with 15 explicit named
  imports (`import('./pages/X').then(m => ({ default: m.X }))`). All 15 were
  checked to have a matching named export and no default export, but this is the
  most likely place for a typo to surface.
- `src/App.test.tsx` may assert against the old lazy-loading behaviour.
- Coverage will drop once the scaffolding tests are gone. **This is correct** —
  they were measuring `sum(a, b)`, not the application. Do not restore them or
  add filler tests to hit a threshold. If a coverage gate fails, tell me the
  number and which real modules are actually untested; do not paper over it.
- 7 new rules tests cover the status-transition graph, and 2 of them depend on
  Firestore rules list-index syntax (`request.resource.data.statusHistory[0] ==
  resource.data.statusHistory[0]`). If the emulator rejects that expression,
  report it — do not silently weaken `auditTrailAppendOnly()` to make it pass.

**STOP GATE 1 — report:** what failed, what you changed to fix it, and the final
pass/fail of all five commands. Do not deploy anything yet.

---

## Phase 1 — Deploy, in a specific order

Do not deploy until Phase 0 is fully green.

1. **Before anything else, verify the owner account still exists.** In the
   Firebase console for project `eha-transfer-1785622025`, open Firestore →
   `users` and confirm the document for `hassan.abdelmenem@gmail.com` has
   `role: 'owner'` and `verified: true`.

   The new rules removed a hardcoded bootstrap escape hatch that let that one
   email address self-assign a privileged role. If the owner document is missing
   or wrong, **fix it in the console before deploying rules**, or the deploy
   leaves the project with no way to promote anyone from the client.

2. **Deploy indexes first and wait for them to finish building.**
   ```
   firebase deploy --only firestore:indexes
   ```
   `firestore.indexes.json` gained three composite indexes that the new referral
   queries require (`referringFacilityId+createdAt`,
   `receivingFacilityId+createdAt`, and
   `receivingFacilityId+candidateFacilityIds+createdAt`). Watch the console until
   all three report **Enabled**, not Building. If the app ships first, the
   referrals screen fails on a missing index.

3. Then rules:
   ```
   firebase deploy --only firestore:rules
   ```

4. Then the app (`npm run build` then `firebase deploy --only hosting`, or let CI
   do it).

5. **Smoke-test with a real non-admin account before calling it done.** The
   headline bug was that the referrals listener queried the whole collection
   unfiltered, which Firestore rejects wholesale for non-privileged users — so
   every non-admin clinician saw an empty referrals list, and it only ever worked
   when tested as an owner. Sign in as an ordinary clinician account and confirm:
   - referrals appear on the dashboard
   - a referral where the facility is the *referring* party appears
   - a referral where it is the *receiving* party appears
   - an auto-routing referral where it is a *candidate* appears
   - "load older referrals" pages correctly across all three

**STOP GATE 2 — report** deploy results and smoke-test findings before moving on.

---

## Phase 2 — The work that was deliberately left undone

These were judged too large to fold into an unverified change set. Do them one at
a time, each as its own commit, with tests. Ask me before starting each one.

**2a. Make the audit trail genuinely append-only (finding H1 — highest value).**

`statusHistory` is an array on the referral document. Firestore rules cannot
iterate a list, so the current rule can only enforce that the array grows by
exactly one entry per status change and that entry `[0]` is unchanged. The middle
of the trail is still rewritable by any party to the referral. In a system whose
audit trail is the record of who authorised moving a patient, that is the weakest
remaining guarantee.

Migrate to `referrals/{id}/statusHistory/{entryId}` as a subcollection with
`allow create` only — no update, no delete — so append-only becomes a property of
the data model rather than a predicate that has to be expressible in the rules
language. This needs: a rules change, a backfill migration for existing
referrals, and updates to every read path (`StatusTimeline`,
`ReferralDetailPage`, and the transaction bodies in `DataContext` that currently
spread `[...r.statusHistory, newEntry]`). Plan the migration before writing code.

**2b. Move notification fan-out server-side (finding M5).**

Fan-out currently runs in the browser: the client resolves recipients and writes
notification documents directly, which is why `/notifications` allows create by
any verified user and why `/users` must expose the entire staff roster across
every facility. Replace it with a Cloud Function triggered on referral writes.
Then tighten both rules: `/notifications` create becomes deny-from-client, and
`/users` list narrows to the caller's own facility.

**2c. Add an idle timeout to auth (see the comment in `src/lib/firebase.ts`).**

Auth persistence was changed from `browserSessionPersistence` to
`browserLocalPersistence` so clinicians are not signed out mid-shift. The
trade-off on a shared ER workstation is that the next person to open the browser
is signed in as the previous clinician. Add an inactivity timeout that calls
`signOut()` — 15–30 minutes is typical for clinical systems. Confirm the duration
with me.

**2d. Typography and touch targets (finding M6).**

Deliberately not changed, because these are consistent design choices rather than
defects and altering them shifts every screen. For an ER app used on phones,
`text-[10px]` and `text-[9px]` label text and `h-7` small buttons are below
comfortable minimums (WCAG 2.1 AA suggests a 24px minimum target; 44px is the
practical touch standard). Propose a typography scale and a button-size change,
show me before/after screenshots of the dashboard and referral detail screens,
and wait for approval before applying.

---

## Ground rules

- Do not weaken a Firestore rule to make a test pass. If a rule and a test
  disagree, work out which one is wrong and tell me.
- Do not restore the deleted scaffolding tests or add trivial tests to lift
  coverage.
- `firestore.rules` and `src/contexts/DataContext.tsx` must stay in sync — the
  query shapes in `referralQueryShapes()` mirror `isReferralParty()` in the
  rules, and the status graph in `validStatusTransition()` mirrors
  `updateReferralStatus` / `recordPatientConsent` / `recordPatientDecline`.
  Both files carry comments saying so. If you change one, change the other and
  the tests.
- Commit in logical units with real messages, not one giant "fix everything".
