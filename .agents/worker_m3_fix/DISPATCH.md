## 2026-08-29T05:21:36Z
You are the Implementation Worker for Milestone 3 Remediation (Fixing React Hook Ordering).
Your working directory is: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m3_fix

Files you own exclusively:
- `src/components/dashboard/ClinicianCockpit.tsx`
- `src/components/dashboard/ManagerCockpit.tsx`
- `src/components/dashboard/ERCockpit.tsx`

Authoritative Review Feedback to Address:
Read `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/reviewer_m3_1/handoff.md`.

Specific Fix Required:
In `ClinicianCockpit.tsx`, `ManagerCockpit.tsx`, and `ERCockpit.tsx`, `if (!user) return null;` is currently placed before some `useMemo` hooks.
Fix:
1. In `src/components/dashboard/ClinicianCockpit.tsx`:
   - Move `if (!user) return null;` down to right before `return (...)` (after all `useMemo` calls).
   - In the `useMemo` callbacks, guard with `if (!user) return [];` so they evaluate safely when `user` is null.
2. In `src/components/dashboard/ManagerCockpit.tsx`:
   - Move `if (!user) return null;` down to right before `return (...)` (after all `useMemo` calls).
   - In `facilityReferrals`, guard with `if (!user?.facilityId) ...` and ensure `useMemo` functions evaluate safely when `user` is null.
3. In `src/components/dashboard/ERCockpit.tsx`:
   - Move `if (!user) return null;` down to right before `return (...)` (after all `useMemo` calls).
   - In the `useMemo` callbacks, guard safely when `user` is null.

Run `npm run lint`, `npm test`, and `npm run build` to verify 100% clean execution with zero type errors and zero hook warnings.
