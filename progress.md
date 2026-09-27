# Progress Log

Newest first. One entry per working session: what changed, what was verified, what is left.

## 2026-09-27 (afternoon): Merged, deployed, owner decisions

- Repo made public by the owner; Actions runs again. Merged #32 → #30 → #38 → #31 → #33 → #37 with merge
  commits. #35 conflicted with #32's new App test; resolved on the branch and re-verified (945 unit, 7 e2e).
  `main` CI green; Deploy to Firebase succeeded at 8847c7b; the live site serves the redesign.
- Pre-#32 check: 3 production accounts, all owners; one email/password owner
  (hassan.200006@med.suez.edu.eg) has an unconfirmed email and now lands on the verify screen.
- Owner decisions d1–d5 answered (table in `task_plan.md`). Shipped on `fix/owner-decisions-0927`:
  createdAtMs backfill (5 + 69 docs, re-check finds none missing) and rules that require it (102 rules
  tests); four escalation scenarios in Playwright (11/11 e2e); "End of shift" as its own menu item that
  keeps you signed in, Log out signs out directly; #24/#28 closed and every stale branch deleted; old-design
  code removed (stat grid, notification popover, role-home badge, status timeline, AdminCockpit, sepia
  filter) with the admin tests ported to AdminDashboard.
- Mistake noted: a `git checkout origin/main` ran in the main checkout by accident; nothing was lost
  (uncommitted graphify changes carried over) and it was switched back to its branch.

## 2026-09-27: Redesign phases 3–5, project memory

- **Phase 3 role homes — #35.** Login lands on `/dashboard` (owner approved changing `e2e/navigation.spec.ts`).
  Each home is its queue: count headline, one line of ordering rationale, cards; the KPI "Overview" is gone.
  1a clinician You/Them/Moving; 1b HoD pinned brick-strip escalation (not repeated below), SLA clock
  ("7:40 left" / "no clock"), summary sheet with Approve / Need requirements / Decline; 1c manager follows the
  device theme; 2a ER outbound/inbound boxes with consent → escort → dispatch gates; 2b nurse 52px steppers.
  HoD delegation stays on `/department`, nurse census on `/bed-management`. "Hand to admin" shipped as
  "Call admin" (no writer exists). Follow-up commit: network free-bed grid and analytics charts restyled
  with a validator-passing palette and "View as table" on every chart.
- **Phase 4 intake wizard — #36.** Owner chose the step order (Option A): identity → vitals → complaint →
  diagnosis/ECG → "Where it goes & send" with a review list. Fixed: pre-filled vitals (fabricated
  measurements), the "AI Triage" that ranked by `Math.random()` distances (now real free beds), Enter on an
  early step filing a referral, "high" for abnormal GCS. Resume-draft card on the clinician home; toasts
  top-anchored on phones; transparent inputs over pills. e2e specs walk the new order; every PROJECT.md id kept.
- **Phase 5 secondary screens — #37.** Shared `ScreenHeader`; inbox, directory, end-of-shift, admin console,
  archive, facility settings. Fixed: CSV injection in Archive and Referrals exports (`src/lib/csv.ts`, tested),
  handover copy that promised "you will not be asked to sign in again" then signed you out, "Emergency
  Hotline" menu item that did nothing (now opens the directory), two hook-order bugs.
- Verified locally on each PR: `tsc` clean, vitest 939/939 at #37, Playwright e2e 7/7, build, impeccable
  detector 0 findings, emulator captures on phone light + dark (desktop spot checks).
- **CI blocked:** every Actions job refused for GitHub billing since 27 Sep; PR checks are red without running.
- Project memory created: `task_plan.md`, `findings.md`, `progress.md`, CLAUDE.md "Project memory" section,
  and the published pages (see CLAUDE.md). Branch `docs/project-memory`, based on #30.
- Left: phase 6 (desktop panes, DESIGN.md rewrite, finish review); decisions d1–d5 in `task_plan.md`.

## 2026-09-26: Claude Code setup, security fix, redesign phases 1–2

- **#30** Claude Code setup: CLAUDE.md, hooks (blocks `.env*`, lockfiles and `dist/` edits; reminds to run
  `test:rules` after `firestore.rules` edits; runs `npm run lint` at turn end), Firebase MCP, `/rules-change`
  skill, `rbac-rules-reviewer` agent; `.gitignore` now tracks `.claude/settings.json`, hooks, skills, agents.
- **#31** dropped the react-router ^8 override; react-router-dom pinned ^7.18.4.
- **#32** security: restored `email_verified` in `isVerifiedCaller` and the notifications read rule;
  token-claim `emailVerified`; e2e seed fix. Before it deploys, count admin-verified email/password accounts
  that never confirmed their email.
- Redesign kick-off with /impeccable: owner adopted the handoff's ink-and-paper world (replacing the
  19 Sep command-blue DESIGN.md) and phased PRs. The palette is Anthropic's brand palette (design-tool
  default); owner told. Arabic ع toggle held back until RTL is designed.
- **#33** phase 1: tokens (raw Tailwind hues remapped to status scales), Poppins, device-following dark mode,
  ink phone header, 228px desktop rail, queue card anatomy.
- **#34** phase 2: shared referral detail (2c) with role banners, stage rail = the stage being waited on,
  merged human-worded timeline, pinned action bar.

## 2026-09-23: NEXT_STEPS_PROMPT.md status

- At HEAD 8e1b533: lint, 932 unit tests, build, 94 rules tests, 7 e2e tests all green.
- Phase 1 deployed; owner doc verified (role owner, verified true).
- Phase 1.4 backfill not done: 5/10 referrals and 69/127 notifications lack `createdAtMs`.
- 2a overnight sweep unscheduled; 2c statusHistory subcollection not started; 2d idle timeout wiring
  unverified; 2e small text / h-7 buttons open.
- Two decisions left with the owner: the backfill, and emulator e2e for the four escalation scenarios.
