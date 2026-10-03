# Ismailia Health Connect (`eha-transfer`)

Inter-facility patient referral and transfer coordination: referral intake and triage,
ECG review, bed capacity across the facility network, and the admission handoff at the
receiving end. Handles real patient PHI.

React 19 + TypeScript 7 + Vite 8 + Tailwind 4 + React Router 7, on Firebase Auth and
Cloud Firestore, with IndexedDB (`idb`) for offline drafts and sync. Cloud Functions live in
`functions/` (separate package, Node 20).

Firebase project: **`eha-transfer-1785622025`** → https://eha-transfer.web.app (production);
staging: `eha-transfer-staging` → https://eha-transfer-staging.web.app.
This repo shares nothing with `imc-er` or `er-app-final`. `main` is production.

## Project memory (read first)

Read `task_plan.md` (roadmap, next step, open owner decisions), `findings.md` (IDs, accounts, design
tokens, gotchas) and `progress.md` (session log, newest first) before starting work. After any
significant change, update them and the published pages below if the change affects them.

## Published pages (claude.ai Artifacts, owned by the user)

- Mission Control: https://claude.ai/artifact/KtYWpySizeSSx9V8RcnYDN (blockers, next steps, PR stack, health, decisions; republish from the repo files)
- Launch Checklist: https://claude.ai/artifact/77g7kAhHFpgEQcZkGfVS7M (tasks in the HTML; ticks in its database, collection `ticks`, doc id = task id; update with ArtifactData)
- Playbook: https://claude.ai/artifact/MUhShMSD6f5uzUVhADXcTW (purpose, people, lifecycle, design direction, how we work and ship)

## Production data warning

`npm run dev` and PR previews talk to the **staging** project `eha-transfer-staging` (test data,
"STAGING" label on every screen); `npm run build` and the deploy pipeline use **production**. See
`docs/DEPLOYMENT.md`. `VITE_FIREBASE_TARGET=production npm run dev` reaches real patient data: never
test destructive actions that way. Emulators (`VITE_USE_FIREBASE_EMULATORS=true`, Auth :9099,
Firestore :8080) remain the place for destructive tests. After a rules change, also deploy the
rules to staging. Never commit `.env*` (except `.env.example`) or Auth/Firestore exports.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Vite on :3000 |
| `npm run lint` | `tsc --noEmit` (this is the lint step) |
| `npm test` | Vitest (watch mode; use `npx vitest run` for a single pass) |
| `npm run test:rules` | Firestore rules tests in the emulator (needs Java) |
| `npm run test:e2e` | Playwright against Auth + Firestore emulators |
| `npm run test:csp-headers` | Build, serve through the Hosting emulator, check the served CSP |
| `npm run build` | Production build to `dist/` (gitignored) |
| `npm run mutate` | Stryker mutation testing (slow; nightly in CI) |

The `test:rules` / `test:e2e` scripts set their own `PATH` to Homebrew OpenJDK and wrap
`firebase emulators:exec`. Don't start emulators separately.

Before pushing: `npm run lint && npx vitest run && npm run test:rules`. Deploys happen in CI on
`main` after all checks pass; don't run `firebase deploy` unless explicitly asked.

A hook in `.claude/settings.json` blocks edits to `.env*`, lockfiles and `dist/`, reminds you
to run `test:rules` after editing `firestore.rules`, and runs `npm run lint` at the end of each turn.

## Layout

- `src/pages/`: routed pages (`NewReferralPage`, `ReferralDetailPage`, `BedManagementPage`,
  `AdmitPatientPage`, role dashboards `Dashboard` / `DepartmentPage` / `ERDashboard`, admin)
- `src/components/{layout,referrals,dashboard,beds,ui}`
- `src/contexts/DataContext.tsx`: every Firestore listener and mutation; `AuthContext.tsx`
- `src/lib/`: `permissions.ts`, `referralStage.ts` (lifecycle), `sla.ts`, `offlineSync.ts`,
  `db.ts` (IndexedDB), `routing.ts`, `firebase.ts`
- `src/types/index.ts`: `Role`, `Facility`, `User`, referral types
- `functions/src/`: SLA and notification-recipient functions
- `firestore.rules` + `tests/firestore.rules.test.ts`
- Tests sit next to their source (`*.test.tsx`); cross-cutting suites are in `tests/`, Playwright in `e2e/`

## Roles

`Role` in `src/types/index.ts`: `owner`, `system_admin` (both admins; see `isAdmin`),
`medical_director`, `hospital_manager`, `deputy_manager`, `head_of_department`,
`consultant`, `specialist`, `resident`, `clinician`, `nursing_supervisor`, `nurse`,
`er_official`, `er_room`.

`User.role` is the only field the rules trust, and only an admin can change it.
`requestedRole` (from onboarding) carries no authority.

## Firestore rules: the only server-side authorization

The browser talks to Firestore directly, so anything the rules allow is reachable by anyone who
completes the public sign-up. The `list` rules in `firestore.rules` and the query shapes in
`DataContext.tsx` are coupled: a rule that reads `resource.data.X` only accepts queries filtered
on `X`. An unfiltered `onSnapshot` against it is rejected, and a rejected listener dies
**permanently with no retry**, so the UI silently stops updating. Change both sides together
and run `npm run test:rules`.

`/users` is intentionally listable network-wide because notification fan-out runs client-side
(see `docs/DEPLOYMENT.md`).

## E2E DOM contracts

Playwright relies on fixed element IDs and accessible names; keep them when refactoring UI.
The full list is in `PROJECT.md` → "Interface & DOM Test Contracts". Examples: `#hospitalId`,
`#patientName`, `#vital*`, `#receivingFacility`, `#dept-review-section`, `#escort-form-section`,
`#rejectionReasonInput`, button `/Submit Referral/i`.

## Library docs (context7)

Most of the stack is on majors newer than most training data. Before writing code against
an API you're not certain of, look it up with the context7 tools (`query-docs`) instead of
relying on memory. Library IDs, already resolved:

| Library (installed) | context7 ID |
| --- | --- |
| React 19.2 | `/reactjs/react.dev` (versioned: `/react/react/v19.2.7`) |
| React Router 7.18 (`react-router-dom`) | `/remix-run/react-router` or `/websites/reactrouter` |
| Vite 8.2 | `/vitejs/vite/v8.0.10` |
| Tailwind 4.3 | `/websites/tailwindcss` (v4 docs; `/websites/v3_tailwindcss` is the old one) |
| Firebase JS SDK 12 | `/firebase/firebase-js-sdk` |

## Reference docs

`docs/DEPLOYMENT.md` (pipeline, rules, CSP and Google sign-in), `PROJECT.md` (architecture,
milestones, DOM contracts), `PRODUCT.md`, `DESIGN.md` (design system; follow it for UI work),
`PERFORMANCE.md`, `NEXT_STEPS_PROMPT.md` (open work).

## Housekeeping

- Don't touch the Vite `server.hmr` / `watch` settings driven by `DISABLE_HMR`.
- `graphify-out/` is committed on purpose; for architecture questions query it first.
- `.agents/` is historical agent output. Don't treat it as source. One-off scratch work
  (`scratch/`, root-level `test_*.cjs` / `run_*.cjs` / `*.png`) is gitignored; keep it out of the repo.
- `functions/lib/` is build output, gitignored and compiled by the `predeploy` hook in
  `firebase.json`. Edit `functions/src/`.
