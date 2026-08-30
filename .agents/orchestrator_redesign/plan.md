# Plan: Full UX and Structural Redesign (Ismailia Health Connect)

## Goals
1. Comprehensive UX Overhaul: Restructure layouts, navigation, merge redundant pages, rewrite components for a modern, cohesive clinical & administrative experience.
2. Functional Preservation: Preserve core data model, Firebase integration, hospital transfer flows, role permissions, and clinical handoffs.
3. Acceptance Criteria:
   - Full Playwright test suite (`npm run test:e2e`) passes 100%.
   - Production build (`npm run build`) completes with zero TypeScript errors or hook violations.

## Phase 0: Survey & Discovery
- Dispatch 3 parallel Explorers:
  - Explorer 1 (UX/UI & Component Architecture): App routing, pages, navigation, design tokens, component hierarchy, redundancy identification.
  - Explorer 2 (Playwright E2E Test Suite Analysis): Test suites, specs, selectors, assertions, user journeys, data-testid requirements, mock/emulator dependencies.
  - Explorer 3 (Data Layer, State & Business Logic): Firebase integration, context providers, custom hooks, role-based access, referral state transitions.
- Aggregate reports into `PROJECT.md` Feature Inventory & Architecture.

## Phase 1: Architecture & Milestone Decomposition
- Define target UI architecture, design system, route hierarchy, merged pages, component breakdown, and interface contracts.
- Formulate 3-5 execution milestones.

## Phase 2: Milestone Execution & Iteration Loop
- For each milestone:
  - Dispatch Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor.
  - Gate evaluation (`GATE_STATUS.md`).

## Phase 3: Final Verification & Test Hardening
- Run full Playwright test suite (`npm run test:e2e`).
- Run production build (`npm run build`).
- Verify all edge cases and role flows.

## Phase 4: Final Reporting & Handoff
- Generate final synthesis report and handoff.
