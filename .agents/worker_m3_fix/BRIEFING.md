# BRIEFING — 2026-08-29T05:25:30Z

## Mission
Remediate React hook ordering in ClinicianCockpit.tsx, ManagerCockpit.tsx, and ERCockpit.tsx to comply with React hook rules.

## 🔒 My Identity
- Archetype: Implementer / QA / Specialist
- Roles: implementer, qa, specialist
- Working directory: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m3_fix
- Original parent: 43d43570-62b7-4c9b-9fed-2dd6cc5b59d6
- Milestone: Milestone 3 Remediation

## 🔒 Key Constraints
- Files owned exclusively:
  - `src/components/dashboard/ClinicianCockpit.tsx`
  - `src/components/dashboard/ManagerCockpit.tsx`
  - `src/components/dashboard/ERCockpit.tsx`
- Ensure all hooks are declared unconditionally before any conditional early returns.
- Safeguard `useMemo` computation functions against `user` being null or undefined.
- Verify with `npm run lint`, `npm test`, and `npm run build`.

## Current Parent
- Conversation ID: 43d43570-62b7-4c9b-9fed-2dd6cc5b59d6
- Updated: 2026-08-29T05:25:30Z

## Task Summary
- **What to build**: Relocate `if (!user) return null;` to immediately before JSX rendering (after all hooks) in ClinicianCockpit.tsx, ManagerCockpit.tsx, and ERCockpit.tsx. Safeguard hook callbacks for null `user`.
- **Success criteria**: Zero lint/type errors, 100% tests passing, clean Vite build, hooks called unconditionally at top level.

## Change Tracker
- **Files modified**:
  - `src/components/dashboard/ClinicianCockpit.tsx` — Moved `if (!user) return null;` to after all 5 `useMemo` hooks, safeguarded `myReferrals`, `inboundBucket`, `canCreateReferral`, `activeReferralsAdmitted`, `activeDirectAdmissions` for null user.
  - `src/components/dashboard/ManagerCockpit.tsx` — Moved `if (!user) return null;` to after all 3 `useMemo` hooks, safeguarded `facilityReferrals`, `managerQueue`, and `facilityAdmissions` for null user/facilityId.
  - `src/components/dashboard/ERCockpit.tsx` — Moved `if (!user) return null;` to after all hooks, wrapped queues in safe `useMemo` hooks with null guards.
  - `src/components/dashboard/DashboardCockpits.test.tsx` — Added test cases verifying null-to-authenticated render transitions for all 3 cockpit components without hook count mismatches.
- **Build status**: PASS (Vite production build succeeded in 460ms)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 53 test files passed, 542 unit/integration tests passed.
- **Lint status**: Clean (tsc --noEmit exited with 0).
- **Tests added/modified**: Added 3 null-to-authenticated transition tests in `DashboardCockpits.test.tsx`.

## Loaded Skills
- React Hooks Rules & Best Practices.

## Key Decisions Made
- Relocated early conditional return statements to after all hook definitions across all cockpit components.
- Added null/undefined safeguards inside `useMemo` computation functions so calculations return empty arrays `[]` rather than crashing when `user` or `user.facilityId` is undefined during initial/unauthenticated renders.

## Artifact Index
- `.agents/worker_m3_fix/DISPATCH.md` — Assignment instructions
- `.agents/worker_m3_fix/BRIEFING.md` — Agent briefing & state
- `.agents/worker_m3_fix/progress.md` — Progress tracker
- `.agents/worker_m3_fix/handoff.md` — Final handoff report
