# Progress Log

Newest first. One entry per working session: what changed, what was verified, what is left.

## 2026-09-30: Arabic, referral detail and actions

- #49 (role homes) merged at b3d6497.
- Translated the referral detail screen on phones and the desktop case pane: header facts, stage rail
  and its label, every role banner, the role's actions (footer and desktop header; the console still
  skips duplicates because both sides use the same catalogue strings), escalation card, timeline,
  patient card, clinical cards, department review, action console, consent, escort, cancellation,
  rejection, admin direct actions, ECG viewer, summary sheet. ~290 new strings.
- Bidi: facts in the header are one `<bdi>` each; doctor-typed text (notes, diagnosis, reason,
  history, rejection reason, department comments in the banner) and its input fields use
  `dir="auto"`, so an English sentence keeps its punctuation on the right side in an Arabic page.
- Monospace only for a real National ID: Arabic "غير متاح" fell apart in the mono face.
- Catalogue gotcha: an object with an `other` key is a plural, so gender "other" is `gender.unspecified`.
- Removed dead `ROLE_VARIANT_LABEL` and the exported ESCALATION_HEADLINE/DETAIL maps (now catalogue).
- Left English on purpose: the printable clinical summary (owner decision pending).
- Verified: tsc, vitest 975/975 (new: detail page in Arabic for manager, referring clinician, ER,
  nurse, admin with no English interface words; checked that the same test fails in English),
  Playwright 11/11, Arabic captures (phone and desktop).

## 2026-09-30: Arabic, role homes and queue cards

- #48 merged (sweep trigger docs; memory refresh). CI's Playwright browser install hung ~20 min on
  both runs; cancelled and re-run, then green.
- Translated the five role homes and everything on them: headlines with Arabic plurals (zero, one,
  two, few, many, other), segments, empty states, every card variant, escalation banner, draft card,
  handover feed, their toasts; priority chips (طارئ / عاجل / روتيني). `standingPhrase` takes the
  screen's `t` (English by default). New `timeAgo` replaces date-fns' English-only relative time.
- Bidi: Latin data inside Arabic sentences (facility, department, reason typed in English) came out
  scrambled. `translate()` now wraps Latin values in FSI/PDI isolates in Arabic, and data joined in
  JSX is wrapped in `<bdi>`.
- Fixed a foundation bug: date helpers read `<html lang>`, which the provider sets after children
  render, so the first render after a language switch used the old language. They now take `lang`.
- Counts in catalogue strings get thousands separators ("99,999"); two adversarial tests updated.
- Review sheet and key-parity test now understand plurals (one row per Arabic form).
- Verified: tsc, vitest 970/970 (new: Arabic role homes render with no English interface words;
  placeholder safety; capacity sentences match what the sweep stores), Playwright 11/11, Arabic
  captures (phone + desktop, five roles).

## 2026-09-30: Merges, staging Auth, sweep cadence

- 29 Sep ~23:25 UTC, on the owner's request: #44, #45, #46, #47 merged; production deployed at c2c2d01.
- Staging Auth enabled in the console (Email/Password + Google). Staging not seeded yet: the owner
  runs `scripts/seed-staging.mjs --apply` with their own `STAGING_SEED_PASSWORD`.
- Escalation sweep: the manual dry run from main passed with keyless WIF. Scheduled runs succeed, but
  GitHub starts the `*/5` timer only every few hours (30 Sep: 02:02, 08:23, 15:02 UTC). The 15:02 run
  reported "1 pending, 0 to escalate". Documented an external 5-minute trigger (`workflow_dispatch`
  from cron-job.org with a fine-grained token) in docs/DEPLOYMENT.md; production has no billing, so
  Cloud Scheduler is not an option.

## 2026-09-30: Arabic and right-to-left, foundation

- Owner decisions: profile setting with device default; Western digits; IBM Plex Sans Arabic; Claude
  drafts and a clinician reviews.
- `src/i18n`: typed catalogue (en/ar), `translate`, plurals via Intl.PluralRules, `formatNumber` with
  `ar-EG-u-nu-latn`; `I18nProvider` in App (saved on the user doc, `language` field; no rules change).
- Codemod: 96 physical classes → logical (ms/me/ps/pe/start/end/border-s/rounded-s/text-start);
  drawer slides from the right in Arabic; 9 directional icons mirrored.
- Found and fixed a live bug: clocks formatted with the browser locale showed ٠-٩ digits on Arabic
  phones; now `src/i18n/format.ts` with explicit locales everywhere.
- Arabic is gated (`VITE_ENABLE_ARABIC`, on in dev): English text in a right-to-left page reads broken,
  so production stays English until the translation PRs land.
- Verified: tsc, vitest 935/935, Playwright 11/11, Arabic captures (desktop workspace, phone detail).
## 2026-09-30: Escalation sweep on a GitHub Actions timer

- Owner chose a GitHub Actions timer over Blaze. `scripts/overnight-sweep.ts` was stale (history in a
  subcollection, every escalation "system", notifications without createdAtMs) and is removed.
- `src/lib/escalationSweep.ts`: the rules and the exact update/notification, now used by both the
  in-app sweep (DataContext) and `scripts/escalation-sweep.ts`.
- Credentials: production forbids service-account keys (org policy), so the workflow is keyless:
  Workload Identity Federation pool `github`, provider `eha-transfer` (repo + refs/heads/main only),
  service account `escalation-sweep@` with roles/datastore.user.
- Verified: vitest (8 new rule tests), emulator run: dry run writes nothing; the run escalates at
  facility level with one history entry and notifications carrying createdAtMs; a second run is a no-op.
- The timer only runs from main: first real run after merge; check the Actions tab, or run it by hand
  with "dry run".
## 2026-09-30: Rail count and Reports page

- Owner chose: count on the queue item only; manager charts on their own Reports page.
- `src/lib/waitingOnYou.ts` mirrors each role home's headline (ER, manager, HoD, admin, clinician;
  none for nurses, whose item is "Beds"); the rail shows it on "Waiting on you" (announced
  "Waiting on you, N"). Referrals and Inbox counts removed.
- `/reports` (ReportsPage): network free beds + facility activity charts, manager roles only;
  removed from ManagerCockpit.
- Verified: tsc, vitest 935/935, Playwright 11/11, desktop captures (HoD 4 = headline 4; manager
  2 = 1 escalation + 1 to sign; Reports page).
- Staging (#44) is open: the owner merges it and enables staging Auth in the console.

## 2026-09-29 (night): Design follow-ups

- Phone stage labels 9px uppercase -> 11px sentence case (uppercase kept from lg).
- Shadows brought into the vocabulary: dialogs use Toast lift, the phone drawer a sideways Sheet rise;
  resting cards (stat tiles, consent and escort callouts, role badge, skeleton, auth cards) lost theirs.
- `src/index.css` header now lists the hue remaps that actually exist.

## 2026-09-29 (evening): Finish-review fixes for the remaining screens (PR #40)

- Dependabot: #41 merged (firebase-tools ^15.32.0, stream-json override removed); alerts #11/#12 cleared.
- All 8 material + 7 minor findings for 1d, 2d, 2e, 2f, 3a, 3b, 3c fixed on `redesign/6-desktop-panes`:
  heading rule moved into `@layer base`; handover names the computed next shift, carries
  `manager_approved` over, "On the move" is neutral, title "End of shift" + shift window, no Done pill;
  settings facilities flattened under "Network and contracted facilities" with a full-width add button,
  48px controls, capacity in ICU/CCU/PICU/Ward order; admin order tiles → escalations → waitlist →
  heatmap (heatmap no longer forces 340px); wizard is a full-height column with the footer at the
  bottom, no validation toast, toasts cleared on step change, reason is a textarea with a Reason row
  in "Ready to send"; inbox shows a visible "New" chip and "Mark as read" for link-less notices;
  Directory title for everyone; archive line has no trailing "admitted ".
- Verified: tsc clean, vitest 927/927, Playwright 11/11, phone captures of wizard, settings, admin.
- Owner said "merge #40": merged d9f9c39, then #42 (undici 6.29/8.11.2, ip-address 10.7.2, dev-only;
  clears Dependabot 23/24/27-37). Main CI green; Deploy to Firebase succeeded at 93dbceb (20:43 UTC).
  The redesign (phases 1-6) is live.
- Left: owner confirms the email on the second owner login.


## 2026-09-29: Owner decisions live; redesign phase 6

- #39 merged and deployed (a156de1): createdAtMs required, escalation e2e, handover without sign-out,
  old design removed. Checklist ticks b4, d1, d2, w4, w5, w6.
- Owner chose the two-pane desktop (a code comment recorded that an earlier two-pane attempt had been
  reverted as confusing on laptops; asked first). Built at >=1280px only, a case always open, selection
  in the URL, "Open full page" link, one h1 per page.
- Found and fixed: the manager's "Decline" rejected without the mandatory reason (phones since phase 2).
- Finish review (impeccable-finish-reviewer): "ship with fixes"; 9 material + 3 minor findings, all
  addressed except the rail count badge and moving the manager's analytics (both recorded above).
  DESIGN.md + `.impeccable/design.json` rewritten by impeccable-documenter from the shipped build.
- Verified: vitest 926/926, Playwright 11/11, workspace unit tests (6), detector 0 findings, captures at
  1440/1280/1120/390 in light and dark.
- Incident: the old redesign worktree was deleted by another session between 27 and 29 Sep, so a
  `cd` into it failed and a branch checkout ran in the main checkout (second time). No work lost;
  restored. All commands now use `cd <dir> || exit 1`. Phase 6 lives in `.claude/worktrees/phase6`;
  the capture harness was rebuilt there (`.capture/`, git-ignored).

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
