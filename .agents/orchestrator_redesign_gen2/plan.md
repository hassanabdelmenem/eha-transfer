# Project Plan — Orchestrator Gen 2

## Context & Objectives
Orchestrate execution and verification for the remaining milestones of the Ismailia Health Connect project:
- **Milestone 1**: App Shell, Navigation & Design System [DONE - Gen 1]
- **Milestone 2**: Unified Referral Intake Wizard [DONE - Gen 1]
- **Milestone 3**: Clinical Cockpits & Role Dashboards (`src/pages/Dashboard.tsx`, `src/pages/DepartmentPage.tsx`, `src/pages/ERDashboard.tsx`, `src/components/dashboard/`)
- **Milestone 4**: Referral Detail, Timeline & Action Console (`src/pages/ReferralDetailPage.tsx`, medical timeline, role action cards, modals)
- **Milestone 5**: Integrated Bed Management & Capacity Hub (`src/pages/BedManagementPage.tsx`, `src/pages/AdmitPatientPage.tsx`, quick admission)
- **Milestone 6**: Full Verification (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`)

## Iteration Procedure per Milestone
1. **Exploration**: Spawn 3 parallel Explorers (UX/Architecture, DOM/E2E Test Invariants, Component/State Logic) to inspect existing code, requirements in `ORIGINAL_REQUEST.md`, and `PROJECT.md`.
2. **Implementation**: Spawn 1 Worker to implement the components/pages cleanly according to design specs and invariants, with `npm run lint`, `npm run build`, and unit test verification.
3. **Review & Challenge**: Spawn 2 Reviewers independently + 2 Challengers for adversarial test verification.
4. **Forensic Integrity Audit**: Spawn 1 Auditor to verify zero cheating, zero facade code, and genuine logic.
5. **Gate**: Evaluate all verdicts. If all PASS and CLEAN, mark milestone DONE and proceed.
