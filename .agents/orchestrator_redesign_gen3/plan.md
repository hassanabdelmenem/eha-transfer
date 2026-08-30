# Milestone 5 & 6 Execution Plan

## Objective
Deliver Milestone 5 (Integrated Bed Management & Capacity Hub) and Milestone 6 (Full Pipeline Verification & Final Report) with 100% test pass rate and zero build errors.

## Phase 1: Milestone 5 Exploration
- Dispatch 3 parallel Explorers:
  - `explorer_m5_1`: Deep inspection of `src/pages/BedManagementPage.tsx`, `src/components/beds/`, capacity steppers, debounced updates, and arrived patient admission table.
  - `explorer_m5_2`: Deep inspection of `src/pages/AdmitPatientPage.tsx`, direct admission workflows, modals/sheets, route compatibility, and navigation links.
  - `explorer_m5_3`: E2E test contract analysis (`tests/bed-management.spec.ts`, `tests/` E2E flows, selector invariants: `/Bulk Bed Management/i`, `/Admit to (ICU|CCU|PICU|Ward) bed/i`, etc.).

## Phase 2: Milestone 5 Implementation
- Synthesize explorer findings into concrete implementation instructions.
- Dispatch 1 Worker (`worker_m5`):
  - Refactor/modernize `BedManagementPage.tsx` and `AdmitPatientPage.tsx`.
  - Provide real-time bed capacity steppers for ICU, CCU, PICU, Ward with debounced Firestore updates.
  - Provide arrived transfer intake list with direct bed assignment action buttons matching Playwright invariants.
  - Provide direct admission modal/sheet and ensure standalone `/admit` route remains compatible or redirects cleanly.
  - Run typecheck, unit tests, and build.

## Phase 3: Milestone 5 Review, Challenge & Forensic Audit
- Dispatch 2 independent Reviewers (`reviewer_m5_1`, `reviewer_m5_2`).
- Dispatch 2 empirical Challengers (`challenger_m5_1`, `challenger_m5_2`) for stress-testing and E2E verification.
- Dispatch 1 Forensic Auditor (`auditor_m5`) for integrity validation (binary veto).
- Gate check: All pass -> advance to Milestone 6.

## Phase 4: Milestone 6 Full Pipeline Verification & Final Report
- Dispatch Worker to run complete validation suite (`npm run lint`, `npm test`, `npm run test:rules`, `npm run test:e2e`, `npm run build`).
- Dispatch Final Reviewer & Victory Auditor to verify end-to-end criteria.
- Produce comprehensive final report and notify caller.
