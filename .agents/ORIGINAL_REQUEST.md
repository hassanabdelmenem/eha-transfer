# Original User Request

## 2026-08-22T18:32:29Z

Deploy a coordinated multi-agent team where each agent assumes a specific healthcare persona (Referring Clinician, Department Head, Medical Director, Receiving ER/ICU Official, Nursing Supervisor/Staff, and System Administrator) within the Ismailia Health Connect (eha-transfer) application to conduct an exhaustive end-to-end multi-role test of all referral lifecycles, permission boundaries, and clinical handoffs.

Working directory: /Users/hassanabdelmenem/antigravity/eha-transfer
Integrity mode: development

## Requirements

### R1. Role Persona Assignment & Multi-Party Lifecycle Simulation
Assign distinct simulated agents to represent each user role (resident/specialist, head_of_department, medical_director/hospital_manager, er_official/er_room, nurse/nursing_supervisor, and system_admin/owner). Execute realistic end-to-end transfer scenarios:
1. Referring doctor initiates referral with patient vitals, diagnosis, and attachments.
2. Department Head and Medical Director review and approve the transfer.
3. Receiving ER/ICU accepts the patient and allocates bed capacity.
4. Nursing staff records patient arrival, triage vitals, and admission handoff.
5. System Admin verifies audit trail, facility capacities, and user directories.

### R2. Role Boundary & Security Enforcement
Audit and verify permission enforcement across all 14 roles defined in the application:
- Non-privileged roles cannot approve transfers, bypass facility restrictions, or modify administrative settings.
- Cross-facility data isolation is strictly enforced (referring facility users cannot tamper with receiving facility internal handoffs, and vice versa).
- Firestore security rules reject any unauthorized direct read/write operations for unassigned or unverified accounts.

### R3. Edge Case & Exception Pathways
Test resilience and error handling under edge-case conditions:
- Referral cancellation and rejection workflows with mandatory reason logging.
- Emergency fast-track vs. routine referral priority paths.
- Bed capacity exhaustion handling when receiving facilities have 0 available beds.
- ECG viewer zooming/panning and media attachment validation.

### R4. Automated Test Suite Execution & Role Test Suite Expansion
Execute and validate the full automated testing pipeline:
- Run TypeScript typecheck (npm run lint).
- Run Firestore security rules emulator tests (npm run test:rules).
- Run Vitest unit & integration tests (npm test).
- Run Playwright E2E tests against local emulators (npm run test:e2e).
- Augment existing test suites with multi-role scenario tests covering newly identified edge cases.

## Acceptance Criteria

### Referral Lifecycle Execution
- [ ] End-to-end referral cycle (Intake -> Department Approval -> Manager Approval -> Bed Acceptance -> Arrival -> Admitted) completes with verified Firestore state transitions.
- [ ] Referral cancellation and rejection pathways correctly update status and preserve audit history.

### Permission & Security Boundary Enforcement
- [ ] Access control tests verify that unauthorized role actions are rejected at both UI and database rule layers.
- [ ] Unverified accounts and cross-facility unauthorized reads/writes fail with permission errors.

### Automated Test Pipeline & Verification
- [ ] npm run lint passes with zero type errors.
- [ ] npm run test:rules executes and passes all Firestore security rule tests.
- [ ] npm test executes and passes all Vitest unit tests.
- [ ] npm run test:e2e executes and passes all Playwright end-to-end tests against the local emulator environment.
- [ ] A structured summary report detailing role simulation results, test suite outputs, and identified findings is generated.

## 2026-08-28T21:45:27Z

Perform a full UX and structural redesign of the Ismailia Health Connect React application. The team should restructure layouts, merge pages, and rewrite components to create a cohesive, modern experience, while ensuring the app remains fully production-ready.

Working directory: /Users/hassanabdelmenem/antigravity/eha-transfer
Integrity mode: development

## Requirements

### R1. Comprehensive UX Overhaul
Restructure the application's layouts and navigation to optimize the user flow for clinical staff and managers. You have full creative freedom to rewrite components, merge redundant pages, and introduce new UI paradigms, provided the underlying business capabilities (referral creation, review, and hospital management) remain fully accessible.

### R2. Maintain Functional Correctness
The redesign must not break the core data model, Firebase integration, or the existing user flows that the application relies on to coordinate hospital transfers.

## Acceptance Criteria

### Automated Verification
- [ ] The full Playwright test suite (`npm run test:e2e`) passes with a 100% success rate, proving that the core workflows and business logic remain intact despite the structural UI changes.
- [ ] The production build (`npm run build`) completes successfully with zero TypeScript compilation errors or React hook violations.
