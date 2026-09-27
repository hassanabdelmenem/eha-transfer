# Task Plan: Ismailia Health Connect to a launch-ready pilot

Living roadmap for the whole project (planning-with-files, project-root mode). Read this first every
session; update it whenever a phase or the next step changes. Facts, IDs and gotchas live in
`findings.md`; what happened each session lives in `progress.md`.

## Goal

Inter-facility referrals across the Ismailia network move Sent → Dept → Manager → Consent → Transit →
Arrived → Admitted without a dropped handoff, with every decision made against live bed data, on an
app built to an enterprise, production-ready bar (PRODUCT.md). No live patients have used it yet.

## Next Step

**Owner first: fix GitHub billing.** Since 27 Sep every Actions job is refused ("recent account payments
have failed or your spending limit needs to be increased"): CI, preview deploys, claude-review and the
production deploy on `main` do not run. Until then nothing merged to `main` reaches
https://eha-transfer.web.app, and PR checks show red without having run.

Then, in order:
1. Review and merge the security fix **#32** (email_verified); before it deploys, check how many
   admin-verified email/password accounts never confirmed their email (they will hit the verify screen).
2. Merge **#30** (Claude Code setup, carries this file) and **#31** (react-router pin).
3. Review the redesign stack **#33 → #37** in order (each is based on the one before).
4. Answer the open decisions below.
5. Phase 6 of the redesign.

## Current Phase

Phase 3: Mobile-workflow redesign (5 of 6 sub-phases done, in review)

## Phases

### Phase 1: Hardening and first deploy (NEXT_STEPS_PROMPT.md phases 0–1)

- [x] Build green: lint (tsc), unit tests, build, rules tests, e2e
- [x] Deploy pipeline: CI then "Deploy to Firebase" (Firestore rules/indexes + hosting) on push to `main`
- [x] Owner account verified in production (role owner, verified true)
- [ ] Smoke test as a real non-admin clinician (production has only 2 users, both owners)
- [ ] Phase 1.4 backfill: 5/10 referrals and 69/127 notifications lack `createdAtMs` (all have a valid
      `createdAt`); decision pending (dry run first, then make the rules require the field)
- **Status:** mostly complete; two items open

### Phase 2: Security and repo setup (PRs, 26–27 Sep)

- [ ] #32 restore `email_verified` in `isVerifiedCaller` and notifications read; token-claim `emailVerified`; e2e seed fix
- [ ] #30 Claude Code setup: CLAUDE.md, hooks, Firebase MCP, `/rules-change` skill, `rbac-rules-reviewer` agent
- [ ] #31 drop the react-router ^8 override, pin react-router-dom ^7.18.4
- **Status:** all open, CI was green before the billing block (except #32's latest run)

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
- [ ] 6 Unified desktop panes (3d): 228px rail + 436px queue + detail pane on #f4f2ed, the role's actions
      top-right; merge desktop header actions with the action console; rewrite DESIGN.md with the
      impeccable documenter (the committed DESIGN.md still describes the old command-blue world);
      finish review against the direction contract
- **Status:** in review; phase 6 not started

### Phase 4: Known gaps (NEXT_STEPS_PROMPT.md phase 2)

- [ ] 2a `scripts/overnight-sweep.ts` exists but nothing schedules it
- [ ] 2c `statusHistory` as a subcollection (not started)
- [ ] 2d `useIdleTimeout` exists; wiring and duration unverified
- [ ] 2e small text / 28px buttons (largely superseded by the redesign; re-audit after phase 6)
- [ ] Emulator Playwright tests for the four escalation scenarios instead of manual production smoke tests (decision pending)
- **Status:** open

### Phase 5: Launch readiness

- [ ] Arabic + RTL (the ع toggle is deliberately not shipped until RTL is designed; build with logical properties)
- [ ] Pilot plan with one referring and one receiving facility; real non-admin accounts per role
- [ ] Staging project (today `npm run dev` and PR previews talk to production)
- **Status:** not started

## Open decisions (owner)

| # | Decision | Where it came from |
| --- | --- | --- |
| d1 | Backfill `createdAtMs` in production (dry run first), then require it in the rules? | Phase 1.4, 23 Sep |
| d2 | Emulator e2e for the four escalation scenarios instead of manual prod smoke tests? | 23 Sep |
| d3 | End of shift: keep it tied to Log out (today's behaviour, copy now says so) or a separate "Send handover" that keeps you signed in (the handoff's intent)? | #37 |
| d4 | Declining a pending account deletes it. Keep, or reject the request only? | #37 |
| d5 | Close the earlier redesign attempts **#24** and **#28**, now superseded by #33–#37? | 27 Sep |

## Rules that always apply

- `main` is production; never push to it or run `firebase deploy` unless the owner asks.
- `npm run dev` and PR previews hit the production Firebase project; use `VITE_USE_FIREBASE_EMULATORS=true` for anything destructive.
- Keep the E2E DOM contract in PROJECT.md; changing it needs the owner's sign-off.
- Firestore rules are the only server-side authorization; change rules and the matching queries together, run `npm run test:rules`.
- No fabricated data or claims in the UI (no invented distances, scores, defaults presented as measurements).
