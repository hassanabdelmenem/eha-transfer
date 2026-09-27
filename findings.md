# Findings: Ismailia Health Connect facts, IDs and gotchas

Durable knowledge for future sessions. Update after any discovery. Secrets never go here.

## Project and hosting

- Repo: `hassanabdelmenem/eha-transfer`. `main` is production. Local checkout: `~/antigravity/eha-transfer`.
- Firebase project `eha-transfer-1785622025` → https://eha-transfer.web.app. Shares nothing with `imc-er` or `er-app-final`.
- There is **no staging**: `npm run dev` and PR preview channels talk to production. Destructive work only with
  `VITE_USE_FIREBASE_EMULATORS=true` (Auth :9099, Firestore :8080).
- Production users (23 Sep): 2, both owners. There is no real non-admin account to smoke-test as.
- Production data (23 Sep): 10 referrals (5 lack `createdAtMs`), 127 notifications (69 lack it); all have a valid `createdAt`.
- The global firebase CLI config maps "/" → `hospital-er-unified` (stray); pass `--project eha-transfer-1785622025`.

## CI / deploy

- Workflows: `ci.yml` (every branch; lint, vitest, rules, e2e), `firebase-deploy.yml` (push to `main` or manual:
  Firestore rules + indexes + hosting only), `firebase-preview.yml` (PR preview channel), `claude.yml`,
  `claude-code-review.yml`, `stryker-nightly.yml`. Runners use Node 24; `functions/` targets Node 20.
- **Since 27 Sep GitHub refuses every Actions job** (billing: "recent account payments have failed or your
  spending limit needs to be increased"). Jobs fail in 2–3 s with zero steps; red checks on PRs #33–#37 are
  this, not test failures. Nothing merged to `main` deploys until the owner fixes billing. ClinicGuard hit
  the same block on 26 Sep (same GitHub account).
- Local gate before pushing: `npm run lint && npx vitest run && npm run test:rules`; plus `npm run test:e2e`
  for UI work. `test:rules` / `test:e2e` wrap `firebase emulators:exec` and set Homebrew OpenJDK on PATH.

## Test accounts (emulator only, from `e2e/seed.ts`)

- Password for all: `e2e-password`. Facilities: `test-referring-1`, `test-receiving-2`.
- resident `e2e.resident@`, specialist `e2e.specialist@`, HoD `e2e.hod@`, medical directors `e2e.md1@` / `e2e.md2@`,
  ER official `e2e.ero@`, nurse `e2e.nurse@`, nursing supervisor `e2e.ns@`, system admin `e2e.admin@` (all `@example.com`).

## Redesign working setup

- Worktree `~/antigravity/eha-transfer/.claude/worktrees/redesign` (node_modules symlinked), branches
  `redesign/1-world-and-queue` … `redesign/5-secondary-screens`, each PR based on the previous one.
- Capture harness (local only, git-ignored) in the worktree's `.capture/`: `run.sh` (per-role routes),
  `run-wizard.sh` (walks the five wizard steps), `run-phase5.sh` (inbox, directory, archive, settings, admin,
  handover). Run inside `firebase emulators:exec`; `SCHEME=dark` for dark mode, `FULL=1` for full-page.
  `fixture.mjs` seeds synthetic handoff cases (r-mahmoud escalated, r-sara, r-amal, r-youssef, r-hoda sent
  back, r-karim consented/no escort, r-nour dept_approved, r-laila in transit).
- Handoff bundle: `~/Documents/Projects/Mobile app redesign workflow.zip` (README, `Mobile Redesign.dc.html`,
  screenshots 1a–3d). High fidelity; its copy and geometry are final unless untrue for this app.
- Impeccable surface brief: `.impeccable/surfaces/src-app-tsx.md` (Operate mode, direction contract, seed 745e793f).

## Design system as built (DESIGN.md is stale until phase 6)

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
