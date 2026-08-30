# Plan: Ismailia Health Connect (eha-transfer) Multi-Role Simulation, Permission Boundary Audit, and Test Suite Execution

## Objective
Fulfill all user requirements (R1-R4) with rigorous multi-agent verification, high test coverage, robust permission enforcement, and forensic integrity audit.

## Phases
1. **Phase 0: Architecture & Codebase Survey**
   - Dispatch 3 parallel Explorers to inspect the codebase structure, Firestore security rules, role definitions, simulation harnesses, existing tests, and edge case support.
   - Aggregate findings and compile `PROJECT.md` with Feature Inventory, Architecture, Interface Contracts, and Milestones.

2. **Phase 1: Multi-party Healthcare Persona Lifecycle Simulations (R1)**
   - Referring Doctor, Head of Department, Medical Director, Receiving ER/ICU Official, Nursing Supervisor/Staff, System Administrator workflows.
   - Ensure comprehensive end-to-end lifecycle simulation.

3. **Phase 2: Permission & Security Boundary Enforcement (R2)**
   - Audit and enforce rules across all 14 roles, cross-facility isolation, and Firestore security rules.
   - Validate negative permissions (unauthorized access rejection).

4. **Phase 3: Edge Case & Exception Pathways (R3)**
   - Cancellations/rejections with mandatory reason logging.
   - Fast-track vs routine prioritization.
   - 0-bed capacity exhaustion & fallback routing.
   - ECG viewer / media attachment validation.

5. **Phase 4: Full Automated Test Suite Execution & Augmentation (R4)**
   - Run and fix all suites: `npm run lint`, `npm run test:rules`, `npm test`, `npm run test:e2e`.
   - Augment unit, integration, and E2E tests to cover all persona paths and edge cases.
   - Adversarial testing & Forensic Audit veto gate.

6. **Phase 5: Synthesis, Reporting & Final Handoff**
   - Final audit verification.
   - Detailed user-facing report and soft/hard handoff.
