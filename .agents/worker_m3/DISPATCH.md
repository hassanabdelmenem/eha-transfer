## 2026-08-29T04:46:34Z
You are the Implementation Worker for Milestone 3 (Clinical Cockpits & Role Dashboards).
Your working directory is: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m3

Files you own exclusively:
- `src/pages/Dashboard.tsx`
- `src/pages/DepartmentPage.tsx`
- `src/pages/ERDashboard.tsx`
- `src/components/dashboard/*` (all files in `src/components/dashboard/`)

Authoritative references to read FIRST:
1. `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/ORIGINAL_REQUEST.md`
2. `/Users/hassanabdelmenem/antigravity/eha-transfer/PROJECT.md`
3. Explorer Reports:
   - `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m3_1/handoff.md` (UX & Role Cockpit specs)
   - `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m3_2/handoff.md` (E2E Test Selectors & DOM Invariants)
   - `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m3_3/handoff.md` (State, Architecture & TypeScript contracts)

Implementation Requirements:
1. Deconstruct monolithic dashboard pages into clean, modular, role-tailored Clinical Cockpits under `src/components/dashboard/`:
   - `ClinicianCockpit.tsx`: Triage segments ("You / Them / Moving / Inbound"), action triggers, clinician KPIs.
   - `HodCockpit.tsx`: Pinned escalation banner, unit review queue with quick approve (`direct_approval`), shift delegation, department census.
   - `ManagerCockpit.tsx`: Manager decision queue, capacity radar, bed heatmap, flow analytics.
   - `ERCockpit.tsx`: Outbound transit (escort doctor validation gate before dispatch), inbound transit (arrival logger), hotline.
   - `NurseCockpit.tsx`: Bed capacity steppers, arrived admissions queue, active ward census.
   - `AdminCockpit.tsx`: System escalations, global capacity gauges, destination override.
   - Reusable widgets: `DashboardStatGrid.tsx` / `KPIGrid.tsx`, `EscalationAlertBanner.tsx`, `ReferralCockpitCard.tsx`, `FacilityAnalyticsCharts.tsx`, `ShiftHandoverFeed.tsx`.
2. Refactor `src/pages/Dashboard.tsx` as the master role-adaptive coordinator rendering the proper cockpit based on `user.role` while preserving the `<h1 ...>Overview</h1>` heading matching `page.getByRole('heading', { name: /overview/i })`.
3. Refactor `src/pages/DepartmentPage.tsx` and `src/pages/ERDashboard.tsx` to reuse the specialized cockpits seamlessly.
4. Strictly preserve all DOM test selector contracts (e.g. `/overview/i` heading, table row `tbody tr` conventions, button names `/Accept/i`, `/Dispatch ambulance/i`, `/Confirm arrival/i`, `/Admit to/i`, escort form fields).
5. Zero React hook rule violations, zero TypeScript errors, 100% test pass (`npm run lint`, `npm test`, `npm run build`).
