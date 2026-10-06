---
name: rules-change
description: Use when changing firestore.rules, or when a change to a Firestore query, collection or role in DataContext.tsx needs a rules change. Walks the coupled rules and query change test-first, validates, audits, and plans a safe deploy order.
argument-hint: "[what access should change]"
---

# Changing Firestore rules in eha-transfer

`firestore.rules` is the **only** server-side authorization. The browser talks to Firestore
directly, so anything the rules allow is reachable by anyone who completes the public sign-up
form. Treat every change as a security change.

Requested change: `$ARGUMENTS`

## 1. Map the blast radius before editing

- Name the collection(s), operation(s) (`get`, `list`, `create`, `update`, `delete`) and
  roles involved. Roles are the `Role` union in `src/types/index.ts`. `User.role` is the only
  field the rules trust; `requestedRole` carries no authority.
- Find every query on those collections in `src/contexts/DataContext.tsx`
  (`grep -n "collection(db, '<name>'" src/contexts/DataContext.tsx`), including `where` /
  `orderBy` / `limit`.
- Find the existing cases in `tests/firestore.rules.test.ts` for that collection, and any role
  checks in `tests/rbac-boundaries.test.ts`.

**The coupling:** Firestore checks `list` against the query, not the returned documents. A
`list` rule that reads `resource.data.X` only accepts queries filtered on `X`. An unfiltered
`onSnapshot` against it is rejected, and a rejected listener dies **permanently, with no
retry**, so the UI silently stops updating for the rest of the session. Every query from the
step above must still satisfy the new rule. If one won't, change the query in the same change.

## 2. Write the tests first

In `tests/firestore.rules.test.ts`, following the file's `authed(UID)` fixtures and
`assertSucceeds` / `assertFails` style:

- one **allowed** case for each role that should get access
- one **denied** case for each role, facility or state that should not: another facility,
  unverified (`NEWCOMER`), wrong role, self-escalation of `role` / `verified` / `facilityId`
- the **exact query shape** DataContext uses, as a `list` test, so a broken listener fails here
- for writes, a field-tampering case (`hasOnly` / `affectedKeys()`) so a permitted update
  can't also rewrite fields it shouldn't

Run `npm run test:rules` and confirm the new cases **fail** against the current rules. The
script starts the emulator itself and sets its own Java `PATH`.

## 3. Change the rules

- Make the smallest change that turns the new tests green. Reuse the helper functions at the
  top of `firestore.rules` instead of inlining role checks.
- Validate syntax with the Firebase MCP tool `firebase_validate_security_rules`
  (`source_file: "firestore.rules"`), if connected.
- Run `npm run test:rules` again. All tests pass, old and new.
- Run `npx vitest run tests/rbac-boundaries.test.ts` and `npm run lint`.

## 4. Audit

Run the `firebase-security-rules-auditor` skill on the diff (`git diff -- firestore.rules`).
Fix anything it rates medium or higher, or explain to the user why it doesn't apply. Pay
particular attention to create vs update inconsistencies, `hasOnly` ownership checks, and
cross-facility reads of PHI collections.

## 5. Plan the deploy order

The `Deploy to Firebase` workflow runs after CI passes on `main`. It deploys **rules first,
then hosting, in the same job**, and returning users can keep an old bundle cached by
`public/sw.js`.

- **Looser rules, or no query changes:** one PR is fine.
- **Stricter rules that old clients' queries won't satisfy:** split the change. First merge
  the `DataContext.tsx` query change, which must work under both the old and new rules, and
  let it reach users. Then merge the tightened rules. Otherwise old clients' listeners are
  rejected and die silently.

Say which case applies in the PR description, along with the list of queries checked in
step 1.

## 6. Don't

- Don't run `firebase deploy`. Deploys come from CI on `main` (see `docs/DEPLOYMENT.md`).
- Don't test against production data. `npm run dev` talks to the live project unless
  `VITE_USE_FIREBASE_EMULATORS=true`.
- Don't narrow `/users` listing to a single facility. Client-side notification fan-out
  depends on network-wide listing (see `docs/DEPLOYMENT.md` → "Known limitation").
