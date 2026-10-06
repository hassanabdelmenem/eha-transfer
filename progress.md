# Progress Log

Newest first. One entry per working session: what changed, what was verified, what is left.

## 2026-10-06: network directory (audit S2a) and the C1 decision

- `directory/{uid}`: contact fields of verified users, rules-checked against the user document; non-admins now read
  their own facility's users plus the directory; all user writes mirror into it; daily reconcile in the sweep;
  self-heal at sign-in. Email no longer shown across hospitals; phone note on the profile. Logout does a full page
  load; open tabs reload at the next navigation after a release (`/version.json`). e2e helpers wait for that load.
- C1: persistent cache stays off (findings.md).
- Verified: lint, unit 1043, rules 140, e2e 11, build; sweep reconcile exercised on the emulator (adds a verified
  user's entry without email, removes an unverified one, skips until due).

## 2026-10-06: audit runtime profile (Chrome DevTools) + C5, P3, P4

- Staging cold load (/login): LCP 529 ms unthrottled, 1.26 s on Slow 4G + 4x CPU, CLS 0. The login page
  pulls a 738 KB (218 KB gzip) shared chunk: Firebase app/auth/firestore (re2js is Firestore's own),
  i18n en+ar, date-fns. Not avoidable without dropping realtime listeners.
- Signed-in profiling ran on a production build pointed at the emulators (no staging password on hand),
  e2e users + 180 referrals + 600 notifications, as the receiving ER official.
  - Memory: 2 x 10 rounds of all sidebar routes + a referral detail: JS heap 10.38 -> 10.21 MB, DOM event
    listeners 274 -> 274, no detached trees. Native growth was Chrome's accessibility cache (the DevTools
    snapshots themselves). No listener leak: all Firestore listeners live in DataContext and unsubscribe.
  - Re-renders: idle dashboard 0 commits in 65 s. One remote change to a referral or a bed count re-renders
    ~157 components in 1-2 commits, no long task even at 4x CPU. Broad but cheap at this size; structural
    sharing of snapshot objects + memoised cards is the fix if it ever shows up.
- C5: admin notifications listener read every notification in the network (consumers only show the
  caller's own); notifications now own-only, newest 100; shift logs newest 200. Existing indexes.
- P3: unused firebase/functions SDK removed. P4: Firebase in its own chunk; hash verified stable across an
  app change, so returning users keep ~165 KB gzip cached across deploys.
- Found, not fixed: staging Google sign-in fails `redirect_uri_mismatch` (OAuth client lacks
  https://eha-transfer-staging.web.app/__/auth/handler) - owner adds it in Google Cloud Console >
  Credentials. directAdmissions listener is still unbounded (census needs every non-discharged admission;
  needs an active/discharged split).
- Verified: lint, unit 1031, rules 133, e2e 11, build.

## 2026-10-03: escort doctor named by the sending department

- Bug (owner): when a transfer needs an escort doctor, nobody could record the doctor's name and phone
  unless an ER-room account handled it (only er_official/er_room could, at either facility), so dispatch
  stayed blocked. Owner decisions: the head of the department the patient leaves, or its shift delegate,
  at the sending facility only; ER room loses it; sending department pre-filled from the referrer and
  editable.
- Rules: new `isSendingDeptHead` / `isSendingDeptDelegate` (shift assignment verified by `get()`);
  `referringDepartment` pinned and bounded; user `department` pinned once verified (it now carries
  authority). Rules tests rewritten for the new behaviour (123 pass).
- App: `escortAuthority()` mirrors the rules; wizard field `#referringDepartment`; escort form, banner and
  footer action for whoever may record it, a waiting message for everyone else; `escortNeeded`
  notification on consent; EN/AR strings. Unit 1042, e2e 11 (lifecycle now has the sending HoD name the
  escort and the receiving ER mark arrival).

## 2026-10-02: Staging deploys on merge

- New workflow `firebase-deploy-staging.yml`: after CI passes on main, build for staging (Arabic on),
  deploy staging rules + indexes, then the live site https://eha-transfer-staging.web.app, then check
  it serves the app. Independent of the production deploy. Manual "deploy rules to staging" after a
  rules change is no longer needed.
- The staging service account (github-preview@eha-transfer-staging) had Hosting only; it needs
  roles/firebaserules.admin, roles/datastore.indexAdmin and roles/serviceusage.serviceUsageViewer on the
  staging project (the last because firebase-tools checks the Firestore API is enabled; the first run
  failed 403 without it). Auto mode blocks Claude from granting IAM roles: the owner granted all three.
- First successful run 2 Oct (workflow_dispatch after the third role): rules + indexes + live site;
  https://eha-transfer-staging.web.app serves the app; live staging rules byte-identical to main.
- Correction: PR previews never had Arabic on (no VITE_ENABLE_ARABIC in the preview build); the live
  staging site now does.

## 2026-10-02: Smoke-test findings 6–10 (PR B)

- Nurse home: "Incoming · on the way" lists in_transit referrals to the facility (origin, time left,
  bed requested), read-only; arrival stays with the receiving ER.
- Transfer journey card follows the status: Waiting for dispatch → In transit · left HH:MM →
  Arrived HH:MM (kept after admission); "Not dispatched" when rejected or cancelled. It read
  "Pending" before dispatch and again after arrival.
- History: entries that leave the status unchanged carry `event` ('escort_assigned',
  'destination_override') and are titled by it; older untagged ones read "Updated" instead of
  repeating the status ("Consent recorded" twice). A department head's approval comment and the
  dept_approved status entry by the same user within 2 min show as one entry.
- Case page: a status action holds its buttons as "Saving…" (disabled) until the listener delivers
  the new status; the toast fires then. Released at once on error, after 10 s otherwise.
- Item 10 was a false alarm: the Auto-Route checkbox is named (the browser tool read its value,
  "on"). Kept the requested guard: a test that fails on any nameless control on any wizard step
  (verified it fails when the label is removed).
- Verified: tsc; vitest 1029/1029; Playwright 11/11.

## 2026-10-02: Staging smoke test; fixes for the five blocking findings (PR A)

- Smoke test on staging (PR #58 preview, the bare staging URL has no site) with the seeded accounts:
  one emergency STEMI referral, resident → HOD → director → consultant → ER → nurse, sent to admitted;
  CCU free 2 → 1. Ten findings; owner chose an option for each (task_plan.md, Phase 1).
- Director's accept now writes 'accepted'. It stopped at 'manager_approved', which waited on a
  "Ready for Receive" click that only the full case page offered and no queue showed: the case sat
  still while every screen said "nothing waiting on you". Cases already in manager_approved appear in
  the director's queue. Rules unchanged (dept_approved → accepted was already a receiving-party move).
- Alert sound: the hot-linked mixkit.co file was blocked by the CSP (no media-src → default-src
  'self') and the failure logged as "browser policy". Now /sounds/alert.wav (generated two-tone
  chime) and a per-device "Alert sound" switch in the profile dialog (localStorage eha_alert_muted).
- Sex at intake: Male looked selected while unset and clicking it fired no change, so referrals were
  saved without sex. Now no default and required; the national ID still fills age and sex; the review
  row says "sex not chosen" instead of assuming male. Old drafts ask for it once.
- Discharge asks first (ConfirmDialog, Cancel focused) on the case page and in the inpatient census.
- Arrival: only the receiving side may mark arrived, in the UI and in firestore.rules (moved out of
  the either-side bucket). The sending ER sees "On the way" instead.
- Verified: tsc; vitest 1018/1018; rules 113/113 (3 new); Playwright 11/11 (escalation helper now
  chooses a sex). Rules need deploying to staging after merge.

## 2026-10-01: Idle sign-out hardened; CI housekeeping

- Idle sign-out already ran in AuthContext (a 15-minute in-memory timer); the useIdleTimeout hook was
  an unused duplicate and is gone. Three gaps closed: a session restored after the browser sat closed
  past the limit is signed out at once (the Firebase session survives a restart, so the next person
  at a shared workstation opened it as the previous clinician); activity in one tab keeps the others
  signed in; a laptop that slept past the limit signs out on wake. Last activity is a timestamp in
  localStorage (`eha_last_activity`), checked every 30 s, on focus and on visibilitychange; every
  sign-in starts it fresh and sign-out removes it.
- ErrorBoundary no longer posts crash details to http://localhost:3001 from production browsers.
- CI: no pull_request trigger (each PR commit ran twice); actions on v5 (Node 24). The escalation
  sweep's google-github-actions/auth@v2 is left for a separate change: that job is live.
- Plan: ticked 2d, Seed staging, Arabic + RTL.

## 2026-10-01: Shift-log summaries in the reader's language

- #56 merged (2d371df): every screen translated. Owner: keep Arabic off in production until the
  clinician review is done.
- Shift logs now store key 'summary' + values (shift word, transfer count, department) beside the
  English summary, like notifications. The handover feed renders them in the reader's language;
  older logs keep their English. Helpers: shiftSummaryVars / shiftLogSummary (src/i18n/notifications.ts).
- Rules: shift-log create had no shape checks at all. Now: only the known fields (hasOnly), summary
  a string of <= 2000, key letters only (<= 64), vars a map of <= 12.
- Verified: tsc, vitest 997/997 (renderer, writer stores key + vars, feed in Arabic), rules 110/110
  (4 new: keyed and plain logs allowed; bad key/vars, stray fields, over-long summary rejected),
  Playwright 11/11.

## 2026-10-01: Arabic, app shell and sign-in; escalation trigger live

- #55 merged (notifications in the reader's language); rules deployed to staging and verified
  byte-identical to main; production deployed by the pipeline.
- 5-minute escalation trigger live: cron-job.org job (owner's account) POSTs workflow_dispatch every
  5 minutes with a fine-grained token (eha-transfer only, Actions read/write, expires 30 Sep 2027),
  failure email after 3 in a row. The first ~3.5 h returned 401: the Authorization value lacked
  "Bearer ". Verified real (non-dry) sweeps at 06:00 and 06:05 UTC.
- Translated the app shell (phone header, drawer and rail identity incl. the role line, profile
  dialog, end-of-shift handover, offline banner, staging ribbon, crash screen), sign-in (now with a
  language switch before sign-in), onboarding and pending verification. ~120 new strings (review
  sheet: 1271 rows). Every screen is now translated.
- Sign-in decides which field an error belongs to by error type, not by searching English text.
- Pending verification now names the requested role and the hospital by name (it showed the raw
  facility id and only replaced the first underscore of the role).
- The end-of-shift summary stays English on the shift log (follow-up: key + values).
- Verified: tsc, vitest 993/993 (new: frame + profile + handover in Arabic, stored summary stays
  English, sign-in/onboarding/pending in Arabic), Playwright 11/11, Arabic captures.

## 2026-10-01: Notifications in the reader's language; CI install fix; staging seeded

- #53 merged. CI's intermittent 20+ minute "Install Playwright Browsers": it installed Firefox and
  WebKit as well (181 apt packages, 130 MB) and the Azure Ubuntu mirror ran at ~170 KB/s. Now
  Chromium only (10 packages, 35 MB) with a 6-minute step timeout (#54).
- Staging seeded (scripts/seed-staging.mjs --apply): 3 facilities, 7 accounts, 3 referrals; sign-in
  verified. The shared test password is with the owner.
- Owner decisions d6 (notifications in the reader's language) and d7 (printout stays English).
- Notifications: every writer (13 in DataContext, 2 in offlineSync, the sweep) passes a key + values;
  createNotification renders the stored English from the same template, so English readers and
  older app versions see the same sentences (statuses now read "in transit", not "IN_TRANSIT").
  Values can be "@catalogue.key" or "#date:<iso>". The inbox renders key + vars via
  renderNotification, falling back to the stored English.
- Rules: key must be letters only (<= 64), vars a map of <= 12 entries, and a notification may carry
  only its known fields (hasOnly), closing a gap where any extra field was accepted.
- Verified: tsc, vitest 988/988 (renderer, escalation notices, DataContext writes, inbox in Arabic),
  rules 106/106 (4 new), sweep module loads and renders under tsx.

## 2026-09-30: Arabic, facility settings, admin console, beds

- #52 (inbox and secondary screens, part 1) merged at 8d0def3; CI's Playwright install hung again on one run
  (cancelled and re-run).
- Translated facility settings (verification queue, departments, capacity, facilities form and list,
  staff table and its role picker), the admin console (system-level escalations, placement, waitlist
  letters ط/ع/ر, free-bed tiles), bed management (KPIs, capacity cards and steppers, arrivals queue,
  direct-admission census), the direct-admission page, form and dialog. ~260 new strings.
- The "cannot grant role" toast now names the role by its label ("Hospital Manager", not
  "hospital manager").
- Verified: tsc, vitest 979/979 (new: settings with the add-facility form open, admin console, bed
  management with the direct-admission dialog and its optional section open, admit page, all in
  Arabic with no English interface words), Playwright 11/11, Arabic captures.

## 2026-09-30: Arabic, inbox and secondary screens (part 1)

- #51 (intake wizard) merged at b4647be.
- Translated: inbox (kinds and actions), referrals list and its filters, directory (roles, facility
  kinds, capacity hints), archive, reports (heatmap and charts; day and month names via Intl, chart
  area pinned left-to-right), HoD department page (delegation card, inpatients, internal transfer).
  Added role and facility-type labels to the catalogue. ~200 new strings (review sheet: 912 rows).
- Gap found: notification titles and messages are written to Firestore in English (13 call sites
  in DataContext plus the sweep), so the inbox's messages stay English in Arabic. Proposed fix
  (message key + params per notification, needs a rules change) is an owner decision in task_plan.
- CSV exports keep English headers (spreadsheets, audit).
- Verified: tsc, vitest 978/978 (new: inbox, referrals, directory, archive, department page and
  reports rendered in Arabic with no English interface words), Playwright 11/11, Arabic captures.

## 2026-09-30: Arabic, intake wizard

- #50 (referral detail) merged at f0e6d77.
- Translated the five-step intake wizard: header and stepper, every field, placeholder, hint and
  error, the vitals high/low flags and their findings, attachments, destination and review list,
  toasts, the draft banner and the offline "queued" screen. ~170 new strings (review sheet: 712 rows).
- Vital findings now carry a stable `code` (evaluateVital keeps its English label for tests); the
  high/low word comes from the code, no longer from a regex over the English label.
- Fixed from #50: `dir="auto"` on an empty field lays it out left-to-right, pushing Arabic
  placeholders to the left. New `typedDir(value)` in src/i18n: page direction while empty, the
  text's own once typed; applied to every typed field (wizard and detail dialogs).
- Units beside vital labels are `<bdi>` (°C rendered as C° in Arabic).
- Department names in the picker stay as stored data (the same names appear across the app).
- Verified: tsc, vitest 977/977 (new: the whole wizard walked in Arabic, errors included, with no
  English interface words), Playwright 11/11, Arabic captures of all five steps (.capture/wizard.mjs).

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
