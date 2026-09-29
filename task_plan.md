# Task Plan: Ismailia Health Connect to a launch-ready pilot

Living roadmap for the whole project (planning-with-files, project-root mode). Read this first every
session; update it whenever a phase or the next step changes. Facts, IDs and gotchas live in
`findings.md`; what happened each session lives in `progress.md`.

## Goal

Inter-facility referrals across the Ismailia network move Sent → Dept → Manager → Consent → Transit →
Arrived → Admitted without a dropped handoff, with every decision made against live bed data, on an
app built to an enterprise, production-ready bar (PRODUCT.md). No live patients have used it yet.

## Next Step

Redesign phase 6 is built and in review (PR on `redesign/6-desktop-panes`): the desktop two-pane
workspace (3d), the finish-review fixes, and DESIGN.md rewritten from the shipped build. Owner: review
and merge it. Then the follow-ups under Phase 3 below, and Phase 5 (pilot readiness).

Owner, when convenient: confirm the email on the second owner login (hassan.200006@med.suez.edu.eg);
two moderate Dependabot alerts on `main` are unreviewed.

## Current Phase

Phase 3: Mobile-workflow redesign (phases 1–5 live; phase 6 in review)

## Phases

### Phase 1: Hardening and first deploy (NEXT_STEPS_PROMPT.md phases 0–1)

- [x] Build green: lint (tsc), unit tests, build, rules tests, e2e
- [x] Deploy pipeline: CI then "Deploy to Firebase" (Firestore rules/indexes + hosting) on push to `main`
- [x] Owner account verified in production (role owner, verified true)
- [ ] Smoke test as a real non-admin clinician (production has only 2 users, both owners)
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
- [ ] Rail count badges; manager analytics sit under the queue column on desktop (not in 1c; placement
      undecided)
- **Status:** phases 1–6 live (phase 6 merged and deployed 29 Sep, 93dbceb)

### Phase 4: Known gaps (NEXT_STEPS_PROMPT.md phase 2)

- [x] 2a Escalation when nobody is signed in: `.github/workflows/escalation-sweep.yml` every 5 min (keyless
      WIF, `escalation-sweep` SA with datastore.user) runs `scripts/escalation-sweep.ts`; rules shared with the
      in-app sweep in `src/lib/escalationSweep.ts`. Stale `overnight-sweep.ts` removed (30 Sep)
- [ ] 2c `statusHistory` as a subcollection (not started)
- [ ] 2d `useIdleTimeout` exists; wiring and duration unverified
- [ ] 2e small text / 28px buttons (largely superseded by the redesign; re-audit after phase 6)
- [x] Emulator Playwright tests for the four escalation scenarios (`e2e/escalation.spec.ts`, 27 Sep)
- **Status:** open

### Phase 5: Launch readiness

- [ ] Arabic + RTL (the ع toggle is deliberately not shipped until RTL is designed; build with logical properties)
- [ ] Pilot plan with one referring and one receiving facility; real non-admin accounts per role
- [ ] Staging project (today `npm run dev` and PR previews talk to production)
- **Status:** not started

## Decisions (owner, answered 27 Sep)

| # | Decision | Answer |
| --- | --- | --- |
| d1 | Backfill `createdAtMs`, then require it in the rules? | Yes; done |
| d2 | Emulator e2e for the four escalation scenarios? | Yes; `e2e/escalation.spec.ts` |
| d3 | End of shift tied to Log out? | No: sending the handover keeps you signed in; users sign out manually |
| d4 | Declining a pending account deletes it? | Yes, keep deleting |
| d5 | Old redesign attempts? | Keep only the current design: #24/#28 closed, stale branches deleted, old-design code removed |

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
