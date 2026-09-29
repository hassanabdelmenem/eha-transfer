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
  `claude-code-review.yml`, `stryker-nightly.yml`. Runners use Node 24; `functions/` targets Node 20.
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
