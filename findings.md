# Findings: Ismailia Health Connect facts, IDs and gotchas

Durable knowledge for future sessions. Update after any discovery. Secrets never go here.

## Project and hosting

- Repo: `hassanabdelmenem/eha-transfer`. `main` is production. Local checkout: `~/antigravity/eha-transfer`.
- Firebase project `eha-transfer-1785622025` → https://eha-transfer.web.app. Shares nothing with `imc-er` or `er-app-final`.
- There is **no staging**: `npm run dev` and PR preview channels talk to production. Destructive work only with
  `VITE_USE_FIREBASE_EMULATORS=true` (Auth :9099, Firestore :8080).
- There is no real non-admin production account to smoke-test as.
- Production data: every referral and notification has `createdAtMs` since the 27 Sep backfill; the rules require it.
- Production accounts (27 Sep): 3, all owners; `hassan.200006@med.suez.edu.eg` (email/password) has an unconfirmed email.
- The global firebase CLI config maps "/" → `hospital-er-unified` (stray); pass `--project eha-transfer-1785622025`.

## CI / deploy

- Workflows: `ci.yml` (every branch; lint, vitest, rules, e2e), `firebase-deploy.yml` (push to `main` or manual:
  Firestore rules + indexes + hosting only), `firebase-preview.yml` (PR preview channel), `claude.yml`,
  `claude-code-review.yml`, `stryker-nightly.yml`. Runners use Node 24. (`functions/` was removed 3 Oct 2026: unused on the Spark plan.)
- The repo is **public** since 27 Sep (Actions minutes free). Before that, GitHub refused every job for billing:
  jobs failing in 2–3 s with zero steps mean that, not test failures. CI on `main` cancels superseded runs;
  the deploy only runs after CI succeeds on `main`.
- `gh pr edit --base` fails on a Projects (classic) deprecation error; retarget with
  `gh api -X PATCH repos/hassanabdelmenem/eha-transfer/pulls/<n> -f base=main`.
- Stacked PRs: merge with merge commits (not squash) and retarget the next PR to `main` after each merge.
- Local gate before pushing: `npm run lint && npx vitest run && npm run test:rules`; plus `npm run test:e2e`
  for UI work. `test:rules` / `test:e2e` wrap `firebase emulators:exec` and set Homebrew OpenJDK on PATH.

## Test accounts (emulator only, from `e2e/seed.ts`)

- Password for all: `e2e-password`. Facilities: `test-referring-1`, `test-receiving-2`.
- resident `e2e.resident@`, specialist `e2e.specialist@`, HoD `e2e.hod@`, medical directors `e2e.md1@` / `e2e.md2@`,
  ER official `e2e.ero@`, nurse `e2e.nurse@`, nursing supervisor `e2e.ns@`, system admin `e2e.admin@` (all `@example.com`).

## Redesign working setup

- Worktrees live under `.claude/worktrees/` and **other sessions may delete them** (the `redesign` one
  vanished between 27 and 29 Sep). Always `cd <dir> || exit 1`; never let a failed `cd` fall through to
  the main checkout, which holds another session's uncommitted graphify work. Phase 6: `.claude/worktrees/phase6`.
- Capture harness (local only, git-ignored via the repo's info/exclude) in the worktree's `.capture/`:
  `run.sh <worktree> <out> role:path[:click-text]…` with `VIEW=wide|laptop|narrow|phone` and `SCHEME=dark`;
  `fixture.mjs` seeds six synthetic cases after `e2e/seed.ts`. It is lost when its worktree is deleted. Run inside `firebase emulators:exec`; `SCHEME=dark` for dark mode, `FULL=1` for full-page.
  `fixture.mjs` seeds synthetic handoff cases (r-mahmoud escalated, r-sara, r-amal, r-youssef, r-hoda sent
  back, r-karim consented/no escort, r-nour dept_approved, r-laila in transit).
- Handoff bundle: `~/Documents/Projects/Mobile app redesign workflow.zip` (README, `Mobile Redesign.dc.html`,
  screenshots 1a–3d). High fidelity; its copy and geometry are final unless untrue for this app.
- Impeccable surface brief: `.impeccable/surfaces/src-app-tsx.md` (Operate mode, direction contract, seed 745e793f).

## Design system as built (DESIGN.md rewritten from the build on 29 Sep; read it first)

- Ink and paper: paper `#faf9f5`, cards `#ffffff`, hairlines `#e8e6dc`, ink `#141413`, desk `#f4f2ed` (desktop
  detail pane). Muted text `slate-500 #78766d` / `slate-700 #5f5d54`; never `slate-400` for information.
- Status: brick `critical-700 #b91c1c` (escalated/emergency), amber-brown `warning-800 #854d0e` on `#fef3c7`
  (urgent), olive `success-700 #4c573c` on `#e0e3d7` (approve), dusty blue `info-500 #6a9bcc` (transit),
  violet `purple-700 #4e3c68` (dept notes). Raw Tailwind hues are remapped onto these scales in `src/index.css`.
- Type: Poppins 600 headings at −0.02em, system UI body, 11px/700 tracked micro-labels, mono timestamps.
- Geometry: 18px gutter, 12px cards, 10–11px buttons, 48px minimum targets, 52–56px primaries, 6px
  priority rail plus a text chip (never colour alone).
- Dark mode follows the device (full inversion on `#141413`); the sepia night-shift filter is not used.
- Chart palette (validated with the dataviz checker): light `#3f6fa6 / #c2613f / #7a55a8`, dark
  `#5b8fd0 / #d8704a / #9a79d6`. The world's own muted blue/violet fail the chroma floor.
- Free-bed thresholds everywhere (`src/lib/capacityTone.ts`): critical at 0 free, warning under 20% free.
- Shared building blocks: `src/components/dashboard/RoleHome.tsx` (headline, segmented control, action bar,
  SLA clock), `src/components/layout/ScreenHeader.tsx` + `ShellContext.tsx`, `src/components/referrals/wizard/fields.tsx`.

## Domain rules worth remembering

- SLA (`src/lib/sla.ts`): 30 minutes, tracked only for `pending` referrals that are emergency/urgent **and**
  ICU/CCU/PICU. Show "no clock" otherwise; never imply one.
- Vitals are optional in `PatientData`: an unmeasured value is absent, never a default. The wizard used to
  pre-fill HR 80, BP 120/80, SpO₂ 98, GCS 15; removed in #36.
- `evaluateVital` names GCS tiers "high"/"low" by severity, not direction; any abnormal GCS reads "low" in the UI.
- Escalation writers, routing (`src/lib/routing.ts`) and SLA logic are untouchable in presentation work.
- `User.role` is the only role field the rules trust; `requestedRole` carries no authority.

## Escort doctor: who names it (owner decision, 3 Oct 2026)

- After the patient consents and before the ambulance is called, the escort doctor's name and phone are
  recorded by the **head of the department the patient leaves** (`referral.referringDepartment`) at the
  **sending** facility, or by that department's current **shift delegate** (`shiftAssignments`, roles
  consultant/specialist/resident, same as notification delegation). Admins as a fallback. Not ER-room
  staff, not the receiving facility.
- `referringDepartment` is set in the intake wizard (`#referringDepartment`, shown with the escort toggle),
  defaulting to the referring clinician's department, and pinned after creation. Referrals made before it
  existed: any head of department at the sending facility.
- A delegate's escort record carries `viaShiftAssignmentId`; the rules `get()` that assignment to verify it
  (assignment ids are random, so the rules cannot search by facility and department).
- Only the head of a department, facility leadership or an admin may set that department's shift delegate
  (rules `mayAppointDelegate`); before, any verified account at the facility could, so a resident could
  appoint themselves (code-scanning finding on #65).
- `department` is now a privilege field on users once verified (rules `privilegeFieldsUnchanged`): escort
  authority depends on it.
- Client mirror: `src/lib/escortAuthority.ts`. Consent sends the `escortNeeded` notification to the sending
  department's head and delegate.

## Escalation e2e (`e2e/escalation.spec.ts`)

- Referrals are created through the wizard, then changed with emulator admin REST writes (`Bearer owner`):
  backdate `createdAt`/`createdAtMs` 31 min for the SLA case, set ICU `occupied == total` for no-beds.
- The sweep runs on page load and every 30 s, only for referrals from the viewer's facility (all for admins).
- The app navigates before its write is visible over REST; poll for the new referral.

## Desktop workspace (phase 6)

- `src/components/layout/Workspace.tsx` (context, `useOpenCase`, `useReportQueue`) and `CaseWorkspace.tsx`.
  On at `WORKSPACE_QUERY` (min-width 1280px) on `/dashboard` for non-admin roles; AppLayout drops `<main>`
  padding there. Cockpits must open cases with `useOpenCase()`, never `navigate('/referrals/…')`.
- The desktop case header shows the role's actions; the action console takes `headerActions` (lower-case
  labels) and skips those buttons, so each accessible name exists once (Playwright strict mode, E2E contract).
- Playwright's default viewport is 1280px, so e2e runs exercise the workspace.

## Accepted dependency advisories (audit S3, 3 Oct 2026)

- `@grpc/grpc-js` 1.9.x (4 "high" via `firebase` → `@firebase/firestore`): Firestore's Node transport only.
  The browser bundle contains none of it (checked: 0 references in `dist/`), so it cannot run for users.
  npm's suggested fix is a downgrade to firebase 9; there is no 12.x release with a newer pin yet. Re-check
  on each Firebase upgrade; dismiss the matching Dependabot alerts with this reason.

## Network directory and roster (audit S2, owner decisions 6 Oct 2026)

- `directory/{uid}` holds id, name, role, facilityId, department, phoneNumber for VERIFIED users only
  (`src/lib/directory.ts`). Rules accept an entry only if it equals the user's own document field for field
  (`getAfter`, so a batch may change both); any signed-in user may write a true entry (self-heal), never a false one.
- Non-admins read `users` for their own facility only, plus the directory; admins (owner/system_admin) read the full
  roster. Notification fan-out, the Network Directory page and cockpit callback phones work from the merged roster.
- Every user change in the app (verify, role, facility, remove, own profile) writes the entry in the same batch; if
  the batch is refused the user change goes through alone. AuthContext self-heals the signed-in user's own entry.
  The escalation sweep rebuilds the directory once a day (`meta/directoryReconcile`), which is also the release-day
  backfill. Until the directory has entries, clients fall back to the full roster (remove in S2b).
- Owner decisions: no email across hospitals (the referral context card no longer shows it); phones stay visible
  network-wide (callbacks) with a note under the profile phone field; backfill by the sweep + self-heal.
- S2b (pending): narrow `users` list/get to the caller's facility for non-admins and drop the fallback. Only once
  pre-S2a tabs are gone: since S2a, logout does a full page load and an open tab reloads at the next route change
  after a new release (`/version.json`, `src/lib/appVersion.ts`), but tabs opened before S2a have neither.
- Monthly schedule is not shown anywhere but the user's own profile (its hint used to say it was published to the
  Network Directory; corrected).

## Offline cache (audit C1, owner decision 6 Oct 2026)

- Firestore persistent (IndexedDB) cache stays OFF. Patient data cached on shared hospital PCs outlives the session;
  the read savings it would bring are mostly covered by C5. Revisit only as a per-device opt-in for dedicated ER
  terminals. The offline referral queue (`src/lib/db.ts`) is separate and is cleared on every logout.

## Hosting sites

- Production is the `eha-transfer` site: https://eha-transfer.web.app (also the auth domain).
- The project's default site `eha-transfer-1785622025` (.web.app / .firebaseapp.com) only 301-redirects to
  production since 6 Oct 2026 (it served a stale build against prod data). Config: `ops/legacy-site-redirect/`.

## Security audit run-1 (7 Oct 2026, Cloudflare security-audit skill)

Report: ~/security-audit-skill/eha-transfer/run-1 (REPORT.md, NEEDS-VALIDATION.md). There were 12 leads. Each fix
below has a regression test (rules, Vitest or e2e) that failed before the change:
- **Lead 1:** `receivingFacilityId` changes only by candidate claim of an 'auto' referral, decline reset
  (accepted -> pending, 'auto'), or privileged override (`receivingFacilityChangeAllowed`).
- **Lead 2:** a self-chosen `users.facilityId` must name an existing facility (`facilityIsReal`), so the 'auto'
  sentinel can no longer make a user a party to every auto-routed referral.
- **Lead 3:** `users.email` must equal the token email at create and is pinned on self-update.
- **Lead 7:** notifications need a catalogue `key` (no free text) and a recipient at the referral's facilities, or a
  privileged recipient. The rule reads each recipient's user doc, so client fan-out is chunked into batches of
  `NOTIFICATION_BATCH_SIZE` = 15 (the rules allow at most 20 reads per batch; a rules test proves 15 fits).
- **Lead 10:** referral create must not carry `accompanyingDoctor`.
- **Lead 6:** i18n `lookup` uses own properties only; `translate` returns the key for any non-message node.
  Previously '@__proto__' or '@notif' crashed the app.
- **Lead 8:** logout removes the `newReferralDraft` localStorage entry.
- **Lead 11:** attachment links open only for `data:(image/jpeg|png|webp|gif|application/pdf);base64` URLs.
- **Lead 4:** deploy jobs accept a manual run from `main` only and use environments `production` / `staging`.
  Owner steps: restrict both environments to `main`, move the deploy keys into them, delete the repo-level secrets.
- **Lead 5 (confirmed by a read-only gcloud check):** the WIF provider condition is
  `assertion.repository=='hassanabdelmenem/eha-transfer' && assertion.ref=='refs/heads/main'`, and the SA binding is
  repository-wide. Any main-ref job in the repo, including claude.yml issue/comment runs, matches it. The sweep job
  now checks the ref; the condition still needs `assertion.job_workflow_ref == '.../escalation-sweep.yml@refs/heads/main'`
  (IAM change, owner approval).
- **Lead 5 completed:** the provider admits only escalation-sweep.yml and firebase-deploy.yml on main, each SA is
  bound to its own workflow, and the production deploy is keyless. The old key and secret are deleted.
- **Lead 12:** Auth is one account per email (password + Google). Profile self-edits need a confirmed email, and
  email confirmation comes before onboarding.
- **Deferred unit (fixed):** see referralContentGuarded / deptCommentsAppendOnly in firestore.rules.
- **Lead 9 / S2b:** `users` get/list narrowed to the caller's own facility (privileged keep the full roster) and the
  client's roster fallback removed: PR feat/s2b-narrow-users, to merge on or after 13 Oct.
- **Open:** The staging deploy and PR previews still use a staging
  key (staging data only).

## Gotchas

- Hooks after an early `if (!user) return null` break React's hook order once the user loads (found and fixed
  in the directory and archive pages; check any page you touch).
- Visually hidden (`sr-only`) inputs inside pill labels let Playwright's forced clicks miss React's change
  handler; use a transparent input stretched over the whole target instead (`fields.tsx`, `ToggleRow`).
- `position: sticky; bottom: 0` inside `<main class="pb-10">` sits 40px above the viewport bottom; the action
  bars use `-bottom-10 -mb-10` to cancel the padding.
- Bottom-anchored toasts covered every phone action bar; toasts are top-anchored on phones since #36.
- `VoiceTextarea` rebuilds its speech engine when `onValueChange` changes identity; pass a stable callback.
- CSV export: always go through `src/lib/csv.ts` (quotes, doubled quotes, formula-prefix neutralising, BOM).
- Test files that reassign module-level mocks (e.g. `mockFacilities`) leak into later tests in the same file;
  give order-sensitive tests their own fixture.
- Screenshots taken right after typing can catch a 150ms border transition mid-way; it is not an error state.
