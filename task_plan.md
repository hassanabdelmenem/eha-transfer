# Task Plan: Ismailia Health Connect to a launch-ready pilot

Living roadmap for the whole project (planning-with-files, project-root mode). Read this first every
session; update it whenever a phase or the next step changes. Facts, IDs and gotchas live in
`findings.md`; what happened each session lives in `progress.md`.

## Goal

Inter-facility referrals across the Ismailia network move Sent → Dept → Manager → Consent → Transit →
Arrived → Admitted without a dropped handoff, with every decision made against live bed data, on an
app built to an enterprise, production-ready bar (PRODUCT.md). No live patients have used it yet.

## Next Step

1. Arabic: every screen is translated. Next is a native-speaking clinician's review of
   docs/i18n/arabic-review.csv (`npm run i18n:sheet`), then enabling Arabic in production
   (VITE_ENABLE_ARABIC in the production build).
2. Arabic stays off in production until the clinician review is done (owner, 1 Oct); the owner
   says when to set VITE_ENABLE_ARABIC.

Done 1 Oct: the 5-minute escalation trigger is live (cron-job.org → workflow_dispatch; token
"eha-transfer sweep trigger" expires 30 Sep 2027, rotate before then); staging is seeded.

Owner, when convenient: confirm the email on the second owner login (hassan.200006@med.suez.edu.eg).

## Current Phase

Phase 5: Launch readiness (redesign complete; staging live; Arabic foundation merged)

## Phases

### Phase 1: Hardening and first deploy (NEXT_STEPS_PROMPT.md phases 0–1)

- [x] Build green: lint (tsc), unit tests, build, rules tests, e2e
- [x] Deploy pipeline: CI then "Deploy to Firebase" (Firestore rules/indexes + hosting) on push to `main`
- [x] Owner account verified in production (role owner, verified true)
- [x] Smoke test as non-admin roles on staging (2 Oct): one emergency STEMI referral sent → admitted through resident, HOD, director, consultant, ER, nurse. 10 findings; decisions below
  - PR A (items 1–5): [x] director's accept = accepted (no hidden "ready to receive" step); [x] alert sound bundled + per-device mute; [x] sex required, no default (national ID fills age + sex); [x] Discharge asks first (case page + census); [x] arrival confirmed by the receiving side only (UI + rules)
  - PR B (items 6–10): [x] nurse sees patients in transit; [x] Transfer journey box follows status; [x] history: one entry per action (escort ≠ consent, single approval entry); [x] buttons show Saving… and disable until the change lands; [x] unnamed-control sweep over the wizard (Auto-Route was already named: the browser tool showed its value)
  - [x] Staging deploy on merge (`firebase-deploy-staging.yml`): live site + rules + indexes from main, Arabic on; needs the two IAM roles granted by the owner
- [x] Phase 1.4 backfill (27 Sep): `scripts/backfill-created-at-ms.mjs` wrote 5 referrals + 69 notifications; rules now require the field. Was: 5/10 referrals and 69/127 notifications lack `createdAtMs` (all have a valid
      `createdAt`); decision pending (dry run first, then make the rules require the field)
- **Status:** complete except the non-admin smoke test (Phase 5)

### Phase 2: Security and repo setup (PRs, 26–27 Sep)

- [x] #32 restore `email_verified` in `isVerifiedCaller` and notifications read; token-claim `emailVerified`; e2e seed fix
- [x] #30 Claude Code setup: CLAUDE.md, hooks, Firebase MCP, `/rules-change` skill, `rbac-rules-reviewer` agent
- [x] #31 drop the react-router ^8 override, pin react-router-dom ^7.18.4
- [x] #38 project memory (this file, findings.md, progress.md) and published pages; stacked on #30
- **Status:** complete, merged 27 Sep

### Phase 3: Mobile-workflow redesign (/impeccable, handoff screens 1a–3d)

Source: `~/Documents/Projects/Mobile app redesign workflow.zip`. Direction contract:
`.impeccable/surfaces/src-app-tsx.md`. Phased PRs in the handoff's own order, each stacked on the last.

- [x] 1 World and queue card — **#33** (ink-and-paper tokens, Poppins, device-following dark mode, ink header, 228px rail)
- [x] 2 Shared referral detail (2c) — **#34** (role banners, stage rail, merged timeline, pinned action bar)
- [x] 3 Role homes (1a clinician, 1b HoD, 1c manager, 2a ER, 2b nurse) — **#35**; login lands on `/dashboard`;
      follow-up commit restyled the network free-bed grid and analytics charts (validated palette)
- [x] 4 Five-step intake wizard (1d) — **#36**; order chosen by the owner: identity → vitals → complaint →
      diagnosis/ECG → "Where it goes & send"; removed pre-filled vitals and the random-distance "AI Triage"
- [x] 5 Inbox, directory, handover, admin console, archive, settings (2d–2f, 3a–3c) — **#37**; safe CSV export
- [x] 6 Unified desktop panes (3d) at >=1280px: 436px queue + case pane on the desk, selection in
      `?case=`, the role's actions top-right (console skips duplicates), DESIGN.md rewritten by the
      impeccable documenter, finish review run and its 9 material findings fixed (29 Sep)
- [x] Finish review of the remaining screens (1d, 2d–2f, 3a–3c): 15 fixes, in #40
- [x] Stage-rail labels 11px on phones; shadows only on floating surfaces (dialogs, drawer, toasts);
      no zoom animations; `src/index.css` header comment corrected (29 Sep, follow-ups PR)
- [x] Rail count: one count, on "Waiting on you", equal to the role home's headline
      (`src/lib/waitingOnYou.ts`); Referrals and Inbox plain. Manager charts moved to /reports
      (rail item "Reports", manager roles). Owner decisions 29 Sep.
- **Status:** phases 1–6 live (phase 6 merged and deployed 29 Sep, 93dbceb)

### Arabic and right-to-left (owner decisions 30 Sep)

Language follows the device, overridable in the profile (saved on the user doc); clinical numbers
always 0–9; IBM Plex Sans Arabic; Claude drafts, a native-speaking clinician reviews
(`npm run i18n:sheet` → `docs/i18n/arabic-review.csv`). Arabic stays off in production builds
(`VITE_ENABLE_ARABIC`) until the screens are translated.

- [x] Foundation: typed `src/i18n` (en source of truth, ar typed to match, Intl plurals), provider sets
      `lang`/`dir`, profile language choice, logical start/end classes app-wide (96), mirrored icons and
      drawer, Arabic font and zero tracking, explicit-locale clock/date helpers (fixes ٠-٩ digits on
      Arabic phones in production today), rail translated
- [x] Role homes and queue cards (clinician, HoD, manager, ER, nurse): headlines, segments, cards,
      escalation banner, draft card, handover feed, their toasts, priority chips (30 Sep)
- [x] Referral detail and actions, phone and desktop case pane: header, stage rail, role banners,
      footer/header actions, escalation card, timeline, patient card, clinical cards, department review,
      action console, consent, escort, cancel, reject, admin actions, ECG viewer, summary sheet (30 Sep)
- [x] Intake wizard: all five steps, errors, toasts, draft banner, offline screen, review list;
      vital findings translated from stable codes (30 Sep)
- [x] Inbox, referrals list, directory, archive, reports (charts stay left-to-right), HoD department
      page (delegation, internal transfer); role and facility-type labels (30 Sep)
- [x] Facility settings, admin console, beds (capacity grid, steppers, arrivals, census), direct
      admission page and dialog (30 Sep)
- [x] App shell (header, drawer and rail identity, profile, end-of-shift handover, offline banner,
      staging ribbon, crash screen), sign-in (with a language switch), onboarding, pending
      verification (1 Oct)
- [x] Notifications carry a catalogue key + values (src/i18n/notifications.ts); the inbox renders
      them in the reader's language, older ones keep their stored English. Rules bound key/vars and
      now allow only the known notification fields (owner decision d6, 1 Oct)
- [x] The printable clinical summary stays English (owner decision d7, 1 Oct)
- [ ] Dates in Arabic (date-fns `ar` locale with Western digits); charts stay left-to-right
- [ ] Clinician review of the sheet; then enable Arabic in production

### Phase 4: Known gaps (NEXT_STEPS_PROMPT.md phase 2)

- [x] 2a Escalation when nobody is signed in: `.github/workflows/escalation-sweep.yml` every 5 min (keyless
      WIF, `escalation-sweep` SA with datastore.user) runs `scripts/escalation-sweep.ts`; rules shared with the
      in-app sweep in `src/lib/escalationSweep.ts`. Stale `overnight-sweep.ts` removed (30 Sep)
- [x] 2a' External 5-minute trigger: cron-job.org job calls workflow_dispatch (live 1 Oct 06:00 UTC)
- [ ] 2c `statusHistory` as a subcollection (not started)
- [x] 2d idle sign-out: 15 min on the wall clock, shared across tabs, and enforced on a restored session (src/lib/idleSession.ts; the unused useIdleTimeout hook removed)
- [ ] 2e small text / 28px buttons (largely superseded by the redesign; re-audit after phase 6)
- [x] Emulator Playwright tests for the four escalation scenarios (`e2e/escalation.spec.ts`, 27 Sep)
- **Status:** open

### Phase 5: Launch readiness

- [x] Arabic + RTL: foundation (#47) and every screen (#49–#57); production stays off until the clinician review (section above)
- [ ] Pilot plan with one referring and one receiving facility; real non-admin accounts per role
- [x] Staging project `eha-transfer-staging` (#44): dev server and PR previews use it; Auth enabled
      (Email/Password + Google) 29 Sep
- [x] Seed staging with test accounts and synthetic referrals (`scripts/seed-staging.mjs`)
- **Status:** in progress

## Decisions (owner, answered 27 Sep)

| # | Decision | Answer |
| --- | --- | --- |
| d1 | Backfill `createdAtMs`, then require it in the rules? | Yes; done |
| d2 | Emulator e2e for the four escalation scenarios? | Yes; `e2e/escalation.spec.ts` |
| d3 | End of shift tied to Log out? | No: sending the handover keeps you signed in; users sign out manually |
| d4 | Declining a pending account deletes it? | Yes, keep deleting |
| d5 | Old redesign attempts? | Keep only the current design: #24/#28 closed, stale branches deleted, old-design code removed |
| d6 | Notifications in the reader's language? (1 Oct) | Yes: key + values per notification, rules change; old ones stay English |
| d7 | Printable clinical summary language? (1 Oct) | Always English: it travels with the patient to other hospitals |

## Rules that always apply

- `main` is production; never push to it or run `firebase deploy` unless the owner asks.
- `npm run dev` and PR previews hit the production Firebase project; use `VITE_USE_FIREBASE_EMULATORS=true` for anything destructive.
- Keep the E2E DOM contract in PROJECT.md; changing it needs the owner's sign-off.
- Firestore rules are the only server-side authorization; change rules and the matching queries together, run `npm run test:rules`.
- No fabricated data or claims in the UI (no invented distances, scores, defaults presented as measurements).

## Finish review of the remaining screens (29 Sep, all fixed on PR #40)

Verdict "ship with fixes" for 1d, 2d, 2e, 2f, 3a, 3b, 3c. Material, in order:
1. `src/index.css:249` global `h1…h6` font/tracking rule is unlayered and beats utilities: wrap in `@layer base` (MicroLabel h2s render in Poppins at −0.02em instead of 11px sans at 0.09em).
2. 2f: "Send handover to the day shift" + toast are hardcoded; use the computed next shift (`buildHandover` knows Day/Night).
3. 2f: `manager_approved` lands in "Watch · accepted or on the move" (false); move it to carry-over; relabel Watch "On the move", neutral tone, no triangle.
4. 3c: facilities list nested in a card under the wrong label ("Staff roles and transfers"); flatten, label "Network and contracted facilities".
5. 3a: kicker label above "Free beds across the network"; order tiles → escalations → waitlist → heatmap; heatmap WARD column clips at 390px.
6. 1d: wizard footer floats mid-screen on short steps; make the page a full-height flex column with the footer `mt-auto`.
7. 1d: the "Fill in the required fields" toast covers the wizard header; drop it from `goNext` (inline errors + focus already say it), dismiss toasts on step change.
8. 1d: "Why this transfer" is a single-line input; make it a textarea (keep `#reasonForReferral`); add a Reason row to "Ready to send".
Minor: Auto-Route row 44→48px; 3c controls 44→48px; 3b "admitted " trailing text with no history entry; 2d visible "New" marker + mark-read for link-less notices; 2f title "End of shift" + shift window, drop "{n} Done" pill and the icon on "Close"; 2e title "Directory" for everyone; 3c capacity order ICU, CCU, PICU, Ward.
