# Graph Report - eha-transfer  (2026-09-04)

## Corpus Check
- Large corpus: 670 files · ~392,035 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1959 nodes · 4185 edges · 207 communities (144 shown, 63 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 184 edges (avg confidence: 0.81)
- Token cost: 21,000 input · 9,000 output

## Community Hubs (Navigation)
- Agent Audit & Challenge Reports
- Data & E2E Test Exploration
- App Page Routes & Dashboards
- Bed Management Adversarial Testing
- Clinical Cockpits Hook Violations
- NPM Package Dependencies
- Firestore Enterprise Indexing
- Milestone 3-5 Challenger Reports
- Data Connect SQL & Cloud Functions
- Cloud Functions Package Dependencies
- Dashboard Cockpit Test Mocks
- Data Context Auth Types
- Sign-In Page & Screenshots
- Audio Alert & Speech Hooks
- Bed Admission Form Tests
- Git & Build Ignore Patterns
- TypeScript Compiler Config
- Milestone 4-5 Reviewer Reports
- Dashboard Adversarial Test Mocks
- Milestone 3-4 Reviewer Verification
- Deployment Pipeline & CSP Security
- SLA Escalation Notifications
- Audit Trail Migration & UX Fixes
- Victory Audits & Worker M1-M2
- Dashboard Stat Grid & Skeletons
- Toast Notification System
- Firebase Local Environment Setup Guides
- Referral Timeline & Transfer Cards
- IndexedDB Offline Referral Storage
- Milestone 3-4 Explorer Handoffs
- Milestone 5 Explorer & Bed Hub
- Referral Detail Console Reviews
- Firestore Rules Security Findings
- Project Milestones Overview
- Cockpit Consolidation Architecture
- Firestore Rules & Data Context
- Minified Bundle Functions
- Milestone 1-2 Review & ECG Viewer
- Referral Wizard Vitals & Draft
- Forensic Audit Binary Veto Policy
- Referral Wizard Draft Persistence
- Firestore iOS/Python SDK Guides
- App Error Boundary & Login Snapshot
- Milestone 4 Adversarial Test Mocks
- Tier 5 UI Adversarial Tests
- Milestone 1-3 Media & RBAC Review
- React Hook Ordering Fix
- Functions TypeScript Config
- Bed Management Page Test Mocks
- Auditor Briefings & Original Request
- ECG Viewer Rejection Hardening
- RBAC Matrix & Referral Lifecycle
- Rejection Modal & Mobile Footer
- Cancellation Dialog & Consent Card
- Performance Benchmark Suite
- Firebase Config Initialization
- Worker M2/M5 Handoffs
- Bed Concurrency & Dashboard Decomposition
- Firebase Auth iOS/Flutter Setup
- Xcode SPM Setup Script
- Clinician Role Check Duplication
- Original Request & Persona Simulation
- Referral Detail Header & Stage Rail
- Wizard Destination Priority Step
- Wizard Stepper & RBAC Challenge
- Cancellation Reason Validation
- Referral Draft Speech Recognition Tests
- Bed Capacity & Persona Audits
- App Shell Challenger Verdicts
- Crashlytics Setup Guides
- Firestore Flutter SDK Guides
- Firestore Web SDK Realtime Queries
- Remote Config Setup Guides
- Dev Dependencies (Testing/Types)
- Escort Assignment & Button Component
- Wizard Diagnostics & Attachment Limits
- Worker M4 Referral Console
- Worker M3 Cockpit Handoffs
- Redesign Orchestration Context
- Firebase AI Logic Setup Guides
- Patient Demographics & National ID
- Referrals Page Screenshot Elements
- App Hosting Config Guides
- Firebase Auth SDK Guides
- Firebase CLI & iOS Config Setup
- Worker M4_2 Test Suite Augmentation
- Functions V1 to V2 Migration
- Performance Optimization Notes
- Patient Vitals Card Component
- Notification Compilation Logic
- LocalStorage Debounced Persistence
- Admit Patient Page Test Mocks
- Rejection Reason Hardening Explorer
- Clinician Role Alignment Explorer
- Firestore Data Model Concepts
- Cloud Function Notification Sender
- Babel Test Script
- DataContext Cancel Test
- Referral Detail Page Tests
- Firestore Android Kotlin CRUD
- Real Login Playwright Script
- Source Map Lookup Script
- Source Map Parser (CJS)
- Source Map Parser (JS)
- CSP Header Verification Script
- Static File Server (CJS)
- Static File Server (JS)
- Role Home Header Component
- Referral Wizard Dual Reviewers
- Status History Backfill Script
- Layout Verification Script
- Transcript Search Script
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 148
- Community 149
- Community 152
- Community 153
- Community 154
- Community 156
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173

## God Nodes (most connected - your core abstractions)
1. `Referral` - 84 edges
2. `useAuth()` - 61 edges
3. `User` - 59 edges
4. `useData()` - 51 edges
5. `Facility` - 51 edges
6. `BedType` - 39 edges
7. `SimulatedHealthcareNetwork` - 36 edges
8. `toastError()` - 30 edges
9. `cn()` - 29 edges
10. `Card` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Referral` --shares_data_with--> `DataContext.tsx updateReferralStatus()`  [INFERRED]
  src/types/index.ts → .agents/explorer_m1_1/handoff.md
- `RoleBasedDashboard()` --calls--> `AdminDashboard.tsx page (281 lines, system escalation console)`  [EXTRACTED]
  src/App.tsx → .agents/explorer_m3_1/handoff.md
- `RoleBasedDashboard()` --calls--> `ERDashboard.tsx page (269 lines, ER logistics workspace)`  [EXTRACTED]
  src/App.tsx → .agents/explorer_m3_1/handoff.md
- `Reviewer M3-1 Handoff Report` --references--> `ClinicianCockpit()`  [EXTRACTED]
  .agents/reviewer_m3_1/handoff.md → src/components/dashboard/ClinicianCockpit.tsx
- `Reviewer M3 Re-verification Handoff Report` --references--> `ClinicianCockpit()`  [EXTRACTED]
  .agents/reviewer_m3_verif/handoff.md → src/components/dashboard/ClinicianCockpit.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Idempotent Escalation Triggers Sharing DataContext Transaction Guard** — next_steps_prompt_sla_breach_escalation, next_steps_prompt_no_route_escalation, src_contexts_datacontext [INFERRED 0.85]
- **Redesign Milestone Roadmap (M1-M6)** — project_app_shell_milestone, project_referral_wizard_milestone, project_clinical_cockpits_milestone, project_referral_detail_console_milestone, project_bed_capacity_console_milestone, project_pipeline_verification_milestone [EXTRACTED 1.00]
- **Design Residuals Tracked From NEXT_STEPS_PROMPT Into UI Update Report** — next_steps_prompt_d1_residual, next_steps_prompt_d3_residual, ui_update_report_semantic_colors, ui_update_report_accessibility_pass [INFERRED 0.85]
- **Milestone 5 TypeScript Remediation & Re-Audit Cycle** — _agents_auditor_m5_report, _agents_auditor_m5_2_dispatch, _agents_auditor_m5_2_report, _agents_auditor_m5_2_handoff, typescript_remediation_tier5_adversarial_tests [INFERRED 0.85]
- **Milestone 1 App Shell Dual-Challenger Verification** — _agents_challenger_m1_1_handoff, _agents_challenger_m1_2_handoff, milestone1_app_shell_navigation [EXTRACTED 1.00]
- **Referral State Machine & RBAC Cross-Milestone Verification Group** — _agents_challenger_m1_1_report, _agents_challenger_m2_handoff, referral_lifecycle_state_machine, rbac_role_boundary_enforcement [INFERRED 0.75]
- **Milestone 2 Referral Wizard Dual-Angle Empirical Verification** — agents_challenger_m2_1_handoff, agents_challenger_m2_2_handoff, src_pages_newreferralpage [INFERRED 0.85]
- **Milestone 3 SLA/Routing/Escort/Override Exception Pathway Verification** — agents_challenger_m3_handoff, src_lib_sla, src_lib_routing, src_contexts_datacontext [EXTRACTED 1.00]
- **Role-Based Clinical Cockpit Dashboard Ecosystem** — src_components_dashboard_cliniciancockpit, src_components_dashboard_hodcockpit, src_components_dashboard_managercockpit, src_components_dashboard_ercockpit, src_components_dashboard_nursecockpit, src_components_dashboard_admincockpit, src_pages_dashboard [EXTRACTED 1.00]
- **Three Milestone 4 Challenger Agents Verifying the Same Milestone** — agents_challenger_m4_briefing, agents_challenger_m4_1_briefing, agents_challenger_m4_2_briefing [INFERRED 0.85]
- **Two Milestone 5 Challenger Agents (Instance 1 of 2 and 2 of 2)** — agents_challenger_m5_1_briefing, agents_challenger_m5_2_briefing, milestone_5 [EXTRACTED 0.90]
- **Multi-Tier Clinical & Security Safety Invariants** — escort_doctor_gate, pre_transit_cancellation_lock, candidate_list_not_widened [INFERRED 0.75]
- **Milestone 1 Explorer Team Investigation (Rejection/Cancellation, Clinician Role, Media/ECG)** — agents_explorer_m1_1_report_doc, agents_explorer_m1_2_report_doc, agents_explorer_m1_3_report_doc [INFERRED 0.85]
- **Milestone 3 Explorer Team Investigation (Cockpit Architecture & E2E Invariants)** — agents_explorer_m3_1_handoff_doc, agents_explorer_m3_2_briefing_doc, milestone3_clinical_cockpits_role_dashboards [INFERRED 0.85]
- **Rejection & Cancellation Reason Hardening Fix Package (type model + context validation + UI modal)** — rejection_reason_validation, cancellation_reason_validation, src_contexts_datacontext_updatereferralstatus [INFERRED 0.75]
- **Milestone 4 Referral Detail Explorer Team (3 parallel investigations)** — agents_explorer_m4_1_handoff, agents_explorer_m4_2_handoff, agents_explorer_m4_3_handoff [EXTRACTED 1.00]
- **Bed Management Concurrency Bugs & Proposed Fix Cluster** — agents_explorer_m5_1_handoff, concept_bedmanagement_concurrency_bugs, concept_bed_capacity_debounce_architecture [INFERRED 0.85]
- **Cross-Milestone Playwright Selector Stability Effort** — agents_explorer_m3_2_handoff, agents_explorer_m4_2_handoff, concept_playwright_e2e_dom_contracts [INFERRED 0.75]
- **Milestone 5 Explorer Pair Investigating Bed Capacity Hub** — agents_explorer_m5_2_handoff, agents_explorer_m5_3_handoff, concept_milestone5_bed_capacity_hub [INFERRED 0.85]
- **Survey Phase Explorer Trio (Architecture, Security, Edge Cases)** — agents_explorer_survey_1_report, agents_explorer_survey_2_report, agents_explorer_survey_3_handoff [EXTRACTED 1.00]
- **Direct Admission & Capacity Update Workflow** — src_pages_admitpatientpage_admitpatientpage, src_pages_bedmanagementpage_bedmanagementpage, src_contexts_datacontext_adddirectadmission [INFERRED 0.85]
- **Data Explorer Survey Deliverable Set** — agents_explorer_survey_data_briefing, agents_explorer_survey_data_analysis, agents_explorer_survey_data_handoff [INFERRED 0.85]
- **Phase 0 Parallel Explorer Surveys** — agents_explorer_survey_ux_analysis_doc, agents_explorer_survey_e2e_analysis, agents_explorer_survey_data_analysis [EXTRACTED 1.00]
- **Milestone Gate Tracking Group** — agents_orchestrator_redesign_gate_status_doc, concept_milestone_m1, concept_milestone_m2 [INFERRED 0.75]
- **Multi-Generation Redesign Orchestration Initiative** — agents_orchestrator_redesign_plan_doc, agents_orchestrator_redesign_handoff_doc, agents_orchestrator_redesign_gen2_plan_doc, agents_orchestrator_redesign_gen2_briefing_doc, agents_orchestrator_redesign_gen3_plan_doc, agents_orchestrator_redesign_gen3_handoff_doc [EXTRACTED 1.00]
- **Worker-Reviewer-Challenger-Auditor Gate Pipeline Applied Across Generations** — agents_orchestrator_redesign_briefing_gate_protocol, agents_orchestrator_redesign_gate_status_doc, agents_orchestrator_redesign_gen2_gate_status_doc, agents_orchestrator_redesign_gen3_gate_status_doc [INFERRED 0.85]
- **Navigation & Header Pain-Points Mapped to Unified Shell Proposal** — agents_explorer_survey_ux_analysis_nav_paradigm_friction, agents_explorer_survey_ux_analysis_header_redundancy, agents_explorer_survey_ux_analysis_unified_shell_proposal [EXTRACTED 1.00]
- **Dual Independent Review of Unified Referral Intake Wizard (M2)** — reviewer_m2_1_agent, reviewer_m2_2_agent, milestone2_unified_referral_wizard [EXTRACTED 0.90]
- **Shared React Hook Rule Violation Pattern Across M3 Dashboard Cockpits** — src_components_dashboard_cliniciancockpit, src_components_dashboard_managercockpit, src_components_dashboard_ercockpit [EXTRACTED 1.00]
- **Sequential Milestone Review Lineage (Parent 1b68a5f2)** — reviewer_m2_agent, reviewer_m3_agent, milestone2_persona_simulations_rbac_audit [INFERRED 0.65]
- **Milestone 3 Dual-Reviewer + Re-verification Review Cycle** — agents_reviewer_m3_1_handoff, agents_reviewer_m3_2_handoff, agents_reviewer_m3_verif_handoff [INFERRED 0.85]
- **Milestone 4 Test Suite Review & Verification** — agents_reviewer_m4_handoff, agents_reviewer_m4_report, concept_milestone4_e2e_test_suite [INFERRED 0.75]
- **Milestone 4 Referral Detail Console Dual Review** — agents_reviewer_m4_1_handoff, agents_reviewer_m4_2_handoff, concept_milestone4_referral_detail_console [INFERRED 0.85]
- **Milestone 5 Bed Management Review Cycle** — agents_reviewer_m5_1_handoff, agents_reviewer_m5_2_report, concept_milestone5_bed_management_capacity_hub [INFERRED 0.75]
- **Functions V2 Trigger Migration Reference Set** — agents_skills_extension_to_functions_codebase_skill, agents_skills_extension_to_functions_codebase_references_destructuring_shim, agents_skills_extension_to_functions_codebase_references_signature_mapping [EXTRACTED 1.00]
- **Milestone 5 Adversarial Hardening Review-Fix-Reevaluation Cycle** — agents_reviewer_m5_handoff, agents_reviewer_m5_2_handoff, concept_milestone5_adversarial_coverage_hardening [INFERRED 0.85]
- **Flutter Firebase Setup Guides Across Skills** — agents_skills_firebase_ai_logic_basics_references_flutter_setup_firebase_ai_flutter, agents_skills_firebase_auth_basics_references_flutter_setup_google_sign_in, agents_skills_firebase_basics_references_flutter_setup_flutterfire_cli [INFERRED 0.75]
- **iOS FirebaseApp.configure() Initialization-Order Pattern** — agents_skills_firebase_basics_references_ios_setup_firebaseapp_configure, agents_skills_firebase_auth_basics_references_ios_setup_firebaseauth_swift, agents_skills_firebase_ai_logic_basics_references_ios_setup_firebaseailogic_sdk [INFERRED 0.85]
- **Firebase CLI as Common Backend Provisioning Tool** — agents_skills_firebase_basics_skill_firebase_cli, agents_skills_firebase_ai_logic_basics_skill_firebase_ai_logic, agents_skills_firebase_auth_basics_skill_firebase_auth [INFERRED 0.65]
- **Agent-Specific Setup Docs for firebase-basics** — agents_skills_firebase_basics_references_setup_android_studio_doc, agents_skills_firebase_basics_references_setup_antigravity_doc, agents_skills_firebase_basics_references_setup_claude_code_doc, agents_skills_firebase_basics_references_setup_cursor_doc, agents_skills_firebase_basics_references_setup_gemini_cli_doc, agents_skills_firebase_basics_references_setup_github_copilot_doc, agents_skills_firebase_basics_references_setup_other_agents_doc [INFERRED 0.85]
- **Agent-Specific Refresh Docs for firebase-basics** — agents_skills_firebase_basics_references_refresh_android_studio_doc, agents_skills_firebase_basics_references_refresh_antigravity_doc, agents_skills_firebase_basics_references_refresh_claude_doc, agents_skills_firebase_basics_references_refresh_gemini_cli_doc, agents_skills_firebase_basics_references_refresh_other_agents_doc [INFERRED 0.80]
- **Cross-Platform Data Connect Client SDKs** — agents_skills_firebase_data_connect_reference_sdk_admin_node_doc, agents_skills_firebase_data_connect_reference_sdk_android_doc, agents_skills_firebase_data_connect_reference_sdk_flutter_doc, agents_skills_firebase_data_connect_reference_sdk_ios_doc, agents_skills_firebase_data_connect_reference_sdk_web_doc [INFERRED 0.85]
- **Data Connect Transactional Authorization Pattern** — agents_skills_firebase_data_connect_reference_security_auth_directive, agents_skills_firebase_data_connect_reference_security_check_directive, agents_skills_firebase_data_connect_reference_security_redact_directive, agents_skills_firebase_data_connect_reference_operations_transaction_directive [INFERRED 0.80]
- **Force-Crash Verification Workflow Across Platforms** — agents_skills_firebase_crashlytics_references_android_setup_doc, agents_skills_firebase_crashlytics_references_ios_setup_doc, agents_skills_firebase_crashlytics_skill_get_report_tool [INFERRED 0.75]
- **Security Rules Generation & Audit Workflow** — agents_skills_firebase_firestore_references_enterprise_security_rules_doc, agents_skills_firebase_firestore_references_standard_security_rules_doc, agents_skills_firebase_security_rules_auditor_skill_doc [INFERRED 0.85]
- **firebase.json Multi-Product Configuration Pattern** — agents_skills_firebase_firestore_references_enterprise_provisioning_firebase_json, agents_skills_firebase_firestore_references_standard_provisioning_firebase_json, agents_skills_firebase_hosting_basics_references_configuration_doc [INFERRED 0.75]
- **Remote Config Fetch-and-Activate Lifecycle** — agents_skills_firebase_remote_config_basics_references_android_setup_fetchandactivate, agents_skills_firebase_remote_config_basics_references_ios_setup_fetchandactivate, agents_skills_firebase_remote_config_basics_skill_fetching_strategies [INFERRED 0.75]
- **Milestone Workers M1-M3 Participate in Ismailia Health Connect Redesign** — agents_worker_m1_handoff_report, agents_worker_m2_handoff_report, agents_worker_m3_handoff_report [INFERRED 0.75]
- **Independent Victory Audits Form Final Delivery Verdict** — agents_victory_auditor_1_handoff_report, agents_victory_auditor_redesign_handoff_report, agents_victory_auditor_redesign_progress_log [INFERRED 0.75]
- **Milestone 3 Review-Remediation Cycle** — agents_worker_m3_handoff_report, agents_reviewer_m3_1_handoff_report, agents_worker_m3_fix_handoff_report [INFERRED 0.75]
- **Worker M3 Task Lifecycle: Dispatch → Briefing → Handoff → Progress** — agents_worker_m3_dispatch_doc, agents_worker_m3_briefing_doc, agents_worker_m3_handoff, agents_worker_m3_progress, agents_worker_m3_task [EXTRACTED 1.00]
- **Worker M3-Fix Task Lifecycle: Dispatch → Briefing → Handoff → Progress** — agents_worker_m3_fix_dispatch_doc, agents_worker_m3_fix_briefing_doc, agents_worker_m3_fix_handoff, agents_worker_m3_fix_progress, agents_worker_m3_fix_task [EXTRACTED 1.00]
- **Worker M5 Task Lifecycle: Dispatch → Briefing → Handoff → Progress** — agents_worker_m5_dispatch, agents_worker_m5_briefing, agents_worker_m5_handoff, agents_worker_m5_progress, agents_worker_m5_task [EXTRACTED 1.00]
- **CI/CD Pipeline Workflows Participate in Release Gate** — github_workflows_ci_ci_workflow, github_workflows_firebase_deploy_deploy_workflow, github_workflows_firebase_preview_preview_workflow [EXTRACTED 1.00]
- **REVIEW.md Critical Findings Addressed in Hardening Pass** — review_c1_unfiltered_referrals_listener, review_c2_client_only_status_gating, review_h1_audit_trail_not_append_only [EXTRACTED 0.85]
- **Project Documents Form Chronological Narrative of Redesign & Hardening** — original_request_doc, review_doc, next_steps_prompt_doc, project_doc [INFERRED 0.75]

## Communities (207 total, 63 thin omitted)

### Community 0 - "Agent Audit & Challenge Reports"
Cohesion: 0.05
Nodes (80): Auditor M1 Forensic Audit Report (App Shell), Challenger M2 Progress Tracker, Challenger M2 Adversarial Challenge Report (RBAC & Persona Simulations), Challenger M3 Briefing (Edge Case & Exception Pathways), Challenger M3 Dispatch Instructions, Challenger M3 Handoff Report (Edge Case Verification), Challenger M3 Progress Log, Challenger M3 Adversarial Challenge Report (Edge Cases) (+72 more)

### Community 1 - "Data & E2E Test Exploration"
Cohesion: 0.05
Nodes (73): Survey Report 3: Edge Cases & Test Infrastructure, Data Layer & Business Logic Survey Analysis, Data Explorer BRIEFING, Data Explorer Handoff Report, Data Explorer Progress Log, E2E Test Suite & Contract Analysis, E2E Explorer BRIEFING, E2E Explorer DISPATCH (+65 more)

### Community 2 - "App Page Routes & Dashboards"
Cohesion: 0.08
Nodes (51): Auditor M3 Dispatch, Reviewer M3_1 Briefing (Clinical Cockpits & Role Dashboards), AdminDashboard, AppRoutes(), ArchivePage, BedManagementPage, Dashboard, DepartmentPage (+43 more)

### Community 3 - "Bed Management Adversarial Testing"
Cohesion: 0.06
Nodes (53): Challenger M5-1 Briefing, Challenger M5-1 Handoff Report (Bed Management), Challenger M5-1 Progress Log, Challenger M5-2 Briefing, Challenger M5-2 Handoff Report (E2E/DOM Integration), Challenger M5-2 Progress Log, Bed Capacity Stepper Debounced Writes, Milestone 5: Integrated Bed Management & Capacity Hub (+45 more)

### Community 4 - "Clinical Cockpits Hook Violations"
Cohesion: 0.11
Nodes (33): Challenger M3_1 Briefing (Clinical Cockpits & Dashboards), Challenger M3_1 Dispatch Instructions, Milestone 3: Clinical Cockpits & Role Dashboards, Milestone 3 Cockpits Verdict: REQUEST_CHANGES (React Hook Rule Violations), H4: Auth Errors Leak and Enumerate, M7: Fourteen alert() Call Sites, Reviewer Agent M3_1 (Clinical Cockpits & Role Dashboards), Login (+25 more)

### Community 5 - "NPM Package Dependencies"
Cohesion: 0.04
Nodes (48): clsx, date-fns, firebase, idb, lucide-react, motion, dependencies, clsx (+40 more)

### Community 6 - "Firestore Enterprise Indexing"
Cohesion: 0.06
Nodes (47): Composite Index (Enterprise), Firestore Indexes Reference (Enterprise), firestore.indexes.json (Enterprise), Index Density (Dense/Sparse), Unique Index Option, firestore:databases:create --edition=enterprise Command, Provisioning Firestore Enterprise Native Mode, firebase.json (Enterprise Firestore Config) (+39 more)

### Community 7 - "Milestone 3-5 Challenger Reports"
Cohesion: 0.08
Nodes (36): Challenger M3_2 Briefing (E2E Verification), Challenger M3_2 Dispatch Instructions, Challenger M3-2 Progress Log, Challenger M4-1 Briefing, Challenger M4-1 Handoff Report, Challenger M4-1 Progress Log, Challenger M4-2 Briefing, Challenger M4 Briefing (+28 more)

### Community 8 - "Data Connect SQL & Cloud Functions"
Cohesion: 0.07
Nodes (45): SQL Connect Examples, Cloud Functions Integration Reference, onMutationExecuted Cloud Function Trigger, connector.yaml Config, dataconnect.yaml Config, Configuration Reference, Data Seeding & Bulk Operations Reference, seed_data.gql Workflow (+37 more)

### Community 9 - "Cloud Functions Package Dependencies"
Cohesion: 0.05
Nodes (37): eslint, eslint-config-google, eslint-plugin-import, firebase-functions, firebase-functions-test, dependencies, firebase-admin, firebase-functions (+29 more)

### Community 10 - "Dashboard Cockpit Test Mocks"
Cohesion: 0.08
Nodes (31): Milestone 2 Quality & Adversarial Review Report (Persona Simulations), mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockQuickTransfer (+23 more)

### Community 11 - "Data Context Auth Types"
Cohesion: 0.24
Nodes (4): AuthContextType, Notification, User, SimulatedHealthcareNetwork

### Community 12 - "Sign-In Page & Screenshots"
Cohesion: 0.12
Nodes (27): Email/Password Sign-In Form, Google OAuth Sign-In Option, Continue With Google Sign-In Option, hospital.gov Email Placeholder (Government Hospital Context), Hotline Quick-Access Button, Invalid Credentials Error State ("Email or password is incorrect."), Ismailia Health Connect Application, Sign In / Login Page UI (+19 more)

### Community 13 - "Audio Alert & Speech Hooks"
Cohesion: 0.12
Nodes (16): react, react, TestComp(), MockAudio, play, TestComp(), useAudioAlert(), defaultSpeechRecognitionFactory() (+8 more)

### Community 14 - "Bed Admission Form Tests"
Cohesion: 0.09
Nodes (19): mockFacility, DirectAdmissionFormProps, mockFacility, DirectAdmissionModalProps, mockAddDirectAdmission, mockFacility, BedOccupancyHeatmapProps, AppSidebarProps (+11 more)

### Community 15 - "Git & Build Ignore Patterns"
Cohesion: 0.08
Nodes (24): .agents, .claude, clear-text, coverage, .firebase, .git, .github, html (+16 more)

### Community 16 - "TypeScript Compiler Config"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, functions, node_modules, vite/client, compilerOptions, allowImportingTsExtensions (+16 more)

### Community 17 - "Milestone 4-5 Reviewer Reports"
Cohesion: 0.14
Nodes (23): Reviewer M4.2 Progress Log, Reviewer M5.1 Briefing, Reviewer M5.1 Dispatch, Reviewer M5.1 Handoff Report, Reviewer M5.1 Progress Log, Reviewer M5.2 Briefing, Reviewer M5.2 Dispatch, Reviewer M5.2 Handoff (Re-Evaluation) (+15 more)

### Community 18 - "Dashboard Adversarial Test Mocks"
Cohesion: 0.09
Nodes (20): Challenger M3_1 Handoff Report (Dashboard Adversarial Tests), Challenger M3_1 Progress Log, Challenger M3_2 Handoff Report (Playwright E2E Verification), mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById (+12 more)

### Community 19 - "Milestone 3-4 Reviewer Verification"
Cohesion: 0.11
Nodes (22): Reviewer M3-1 Handoff Report, Reviewer M3-1 Progress Log, Reviewer M3-2 Briefing, Reviewer M3-2 Dispatch, Reviewer M3-2 Handoff Report, Reviewer M3-2 Progress Log, Reviewer M3 Re-verification Briefing, Reviewer M3 Re-verification Dispatch (+14 more)

### Community 20 - "Deployment Pipeline & CSP Security"
Cohesion: 0.11
Nodes (20): Deployment Guide (docs/DEPLOYMENT.md), CSP in firebase.json Coupled to Google Sign-In, src/lib/csp.security.test.ts, github-deployer Service Account (IAM roles), Deployment Pipeline (commit -> CI -> preview -> merge -> deploy), F10: sevensn Branch Doc/Automation Mismatch (corrected), scripts/verify-csp-headers.mjs, CI Workflow (+12 more)

### Community 21 - "SLA Escalation Notifications"
Cohesion: 0.14
Nodes (20): db, escalateBreachedReferrals, escalateOne(), ESCALATION_TARGET_ROLES, NotificationParams, notifyEscalation(), sendNotification, hasBreachedSla() (+12 more)

### Community 22 - "Audit Trail Migration & UX Fixes"
Cohesion: 0.12
Nodes (18): Audit Trail Append-Only Subcollection Migration Plan, createdAtMs Backfill Migration, D1 Residual: Status Color Scale Outside Brand Ramp, D3 Residual: Muted Text Contrast Compromise, No-Route (No Matching Facility / No Beds) Escalation Trigger, SLA Breach Escalation Trigger, Idle Timeout on Auth (2d), No-Route-For-Patient Escalation (+10 more)

### Community 23 - "Victory Audits & Worker M1-M2"
Cohesion: 0.12
Nodes (19): Final Victory Forensic Audit Report (victory_auditor_1), Victory Auditor 1 Progress Log, Victory Auditor Redesign Briefing, Independent Victory Audit Handoff Report (redesign), Victory Auditor Redesign Progress Log, Worker M1 Briefing (App Shell Modernization), Milestone 1 Handoff Report (App Shell, Navigation & Design System), Worker M1 Progress Tracker (+11 more)

### Community 24 - "Dashboard Stat Grid & Skeletons"
Cohesion: 0.12
Nodes (14): NetworkDirectoryPage, DashboardStatGrid(), KPIGrid, DashboardMetric, DashboardStatGridProps, Skeleton(), SkeletonDetailBlock(), SkeletonLine() (+6 more)

### Community 25 - "Toast Notification System"
Cohesion: 0.15
Nodes (17): Toaster(), TONE_ICON_COLORS, TONE_ICONS, TONE_STYLES, clearToasts(), DEFAULT_TTL_MS, describeError(), dismissToast() (+9 more)

### Community 26 - "Firebase Local Environment Setup Guides"
Cohesion: 0.16
Nodes (18): Firebase Android Setup Guide, Firebase CLI Exploring Commands Guide, Firebase Service Initialization Guide, Firebase Local Environment Setup Guide, Refresh Android Studio Local Environment Guide, Refresh Antigravity Local Environment Guide, Refresh Claude Code Local Environment Guide, Refresh Gemini CLI Local Environment Guide (+10 more)

### Community 27 - "Referral Timeline & Transfer Cards"
Cohesion: 0.18
Nodes (11): ArrivedTransfersQueueProps, AdminDirectActionsCardProps, ClinicalSummaryCardProps, TransferJourneyCardProps, ReferralTimeline(), ReferralTimelineProps, TimelineEvent, StatusTimelineProps (+3 more)

### Community 28 - "IndexedDB Offline Referral Storage"
Cohesion: 0.15
Nodes (11): deleteOfflineReferral(), getOfflineReferrals(), ReferralDB, clear, del, getAll, openDB, put (+3 more)

### Community 29 - "Milestone 3-4 Explorer Handoffs"
Cohesion: 0.15
Nodes (17): M3 Explorer 2 Handoff: E2E Test Contracts & Selector Invariants, M3 Explorer 2 Progress Log, M4 Explorer 1 Briefing, M4 Explorer 1 Dispatch, M4 Explorer 1 Handoff: Referral Detail UX & Layout Decomposition, M4 Explorer 1 Progress Log, M4 Explorer 2 Briefing, M4 Explorer 2 Dispatch (+9 more)

### Community 30 - "Milestone 5 Explorer & Bed Hub"
Cohesion: 0.18
Nodes (17): Explorer M5-2 Briefing, Explorer M5-2 Dispatch, Explorer M5-2 Handoff: Direct Admission & Capacity Integration, Explorer M5-2 Progress Log, Explorer M5-3 Briefing, Explorer M5-3 Dispatch, Explorer M5-3 Handoff: Test Suite & DOM Contracts, Explorer M5-3 Progress Log (+9 more)

### Community 31 - "Referral Detail Console Reviews"
Cohesion: 0.13
Nodes (12): Reviewer M4-1 Briefing, Reviewer M4-1 Dispatch, Reviewer M4-1 Handoff Report, Reviewer M4-1 Progress Log, Reviewer M4-2 Briefing, Reviewer M4-2 Dispatch, Reviewer M4-2 Handoff Report, Milestone 4: Referral Detail, Timeline & Action Console (+4 more)

### Community 32 - "Firestore Rules Security Findings"
Cohesion: 0.15
Nodes (16): firestore.rules, Audit Trail Subcollection Migration (2c), S6: /users Collection Cross-Facility Exposure, C2: Consent/Cancel-Lock Enforced Client-Side Only, C2: Consent/Cancel-Lock Enforced Client-Side Only, H1: auditTrailAppendOnly Not Enforced, H2: Fire-and-Forget Mutations Hide Rule Denials, H3: directAdmissions Update Does Not Pin facilityId (+8 more)

### Community 33 - "Project Milestones Overview"
Cohesion: 0.18
Nodes (15): src/pages/AdmitPatientPage.tsx, src/components/layout/AppLayout.tsx, M1: App Shell, Navigation & Design System, App Shell, Navigation & Header Modernization (M1), Unified Bed & Capacity Console (M5), M5: Integrated Bed Management & Capacity Hub, src/pages/BedManagementPage.tsx, M3: Clinical Cockpits & Role Dashboards (+7 more)

### Community 34 - "Cockpit Consolidation Architecture"
Cohesion: 0.20
Nodes (16): Explorer M3.1 Briefing: Clinical Cockpits & Role Dashboards, Explorer M3.1 Dispatch Instructions, Milestone 3 Investigation Report: Clinical Cockpits & Role Dashboards, Explorer M3.1 Progress Log, Explorer M3.2 Briefing: E2E Test Contracts & Selector Invariants, Explorer M3.2 Dispatch Instructions, Unified Clinical Cockpit Consolidation Architecture (rationale: eliminate ~600 lines of duplicated card/status logic across Dashboard, DepartmentPage, ERDashboard, AdminDashboard), Playwright/Vitest DOM Selector Invariants for Dashboard Refactor (headings, table rows, modal contracts that must be preserved) (+8 more)

### Community 35 - "Firestore Rules & Data Context"
Cohesion: 0.14
Nodes (13): firestore.rules list rules coupled to DataContext query shapes, S6 Accepted Risk: /users Collection Network-Wide Readable, src/contexts/AuthContext.tsx, src/contexts/DataContext.tsx, C1: Unfiltered Referrals Listener, referralsQuery (unfiltered, limit 200), firestore.rules referrals allow read rule, M4: Any Verified User Could Write Facility Config (+5 more)

### Community 36 - "Minified Bundle Functions"
Cohesion: 0.30
Nodes (15): A(), be(), g(), _e(), v(), F(), he(), I() (+7 more)

### Community 37 - "Milestone 1-2 Review & ECG Viewer"
Cohesion: 0.18
Nodes (12): Auditor M1 Progress Log, Auditor M1 Report (Core Exception & Alignment Hardening), Challenger M2_1 Briefing (Referral Intake Wizard), Challenger M2_1 Dispatch Instructions, Challenger M2_1 Handoff Report (Wizard Stress Test), Challenger M2_1 Progress Log, Reviewer 2 (Milestone 1) Progress Log, Milestone 1 Review Report — Core Exception & Alignment Hardening (+4 more)

### Community 38 - "Referral Wizard Vitals & Draft"
Cohesion: 0.23
Nodes (11): Auditor M2 Forensic Audit Report (Referral Wizard), DraftRestoreBanner(), DraftRestoreBannerProps, StepClinicalPresentation(), evaluateVital(), VitalEvaluation, VitalsRangeBadge(), VitalsRangeBadgeProps (+3 more)

### Community 39 - "Forensic Audit Binary Veto Policy"
Cohesion: 0.28
Nodes (15): Auditor M5_2 Briefing (Re-evaluation Audit Memory), Auditor M5_2 Dispatch (Forensic Re-evaluation Assignment), Auditor M5_2 Handoff (Re-evaluation CLEAN Verdict), Auditor M5_2 Progress Log, Auditor M5_2 Report (Re-evaluation Forensic Audit — CLEAN), Auditor M5 Report (Project Acceptance Audit — INTEGRITY VIOLATION), Challenger M1_1 Report (Rejection/Cancellation/Role/ECG Adversarial Stress Test — APPROVE), Challenger M1_2 Report (Media Attachment & ECG Viewer Hardening — APPROVE) (+7 more)

### Community 40 - "Referral Wizard Draft Persistence"
Cohesion: 0.17
Nodes (10): Handoff Report — Reviewer 2: Unified Referral Intake Wizard, StepDestinationPriority(), mockAddReferral, DEFAULT_VITALS, mockAddReferral, mockFacilities, mockNavigate, loadDraft() (+2 more)

### Community 41 - "Firestore iOS/Python SDK Guides"
Cohesion: 0.14
Nodes (15): Codable User Struct (Enterprise iOS), Firestore Enterprise Native Mode on iOS Guide, SwiftUI Listener Lifecycle Pattern (.task/deinit), No FirebaseFirestoreSwift Rule, No Inline Firestore Initialization Rule, Pipeline Queries (Enterprise iOS), Python SDK Usage (Enterprise), FieldFilter Compound Queries (Python) (+7 more)

### Community 42 - "App Error Boundary & Login Snapshot"
Cohesion: 0.14
Nodes (7): clear-cache.js, Rendered Login Page HTML Snapshot, Vite Entry HTML (index.html), App(), ErrorBoundary, Props, State

### Community 43 - "Milestone 4 Adversarial Test Mocks"
Cohesion: 0.13
Nodes (13): mockAddDeptComment, mockCancelReferral, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockRecordPatientConsent, mockRecordPatientDecline, mockReferrals (+5 more)

### Community 44 - "Tier 5 UI Adversarial Tests"
Cohesion: 0.13
Nodes (12): mockAddDeptComment, mockAddReferral, mockCancelReferral, mockFacilities, mockOverrideReferralDestination, mockRecordPatientConsent, mockRecordPatientDecline, mockReferrals (+4 more)

### Community 45 - "Milestone 1-3 Media & RBAC Review"
Cohesion: 0.19
Nodes (12): Explorer M1.3 Briefing: Media Attachment Validation & ECG Viewer, Explorer M1.3 Dispatch Instructions, Explorer M1.3 Handoff: Media Attachment & ECG Viewer Hardening, Explorer M1.3 Progress Log, Investigation Report: Media Attachment Validation, File Size Limits & ECG Viewer Hardening, Client-Side File Size & MIME Type Validation for Attachments (rationale: 15MB cap prevents memory spikes/crashes; MIME whitelist blocks unvetted binaries), Milestone 1: Core Exception & Alignment Hardening, Milestone 2: Multi-Party Healthcare Persona Simulations & Permission Boundary Audit (+4 more)

### Community 46 - "React Hook Ordering Fix"
Cohesion: 0.24
Nodes (13): Reviewer M3_1 Handoff (Milestone 3 Review Findings), Worker M3 Fix Briefing (React Hook Ordering Remediation), Worker M3 Fix Dispatch, Worker M3-Fix Handoff Report — React Hook Ordering Fix, Milestone 3 Remediation Handoff Report (React Hook Ordering Fix), Worker M3-Fix Progress Log, Milestone 3 Remediation: React Hook Ordering Fix, Milestone 3 Handoff Report (Clinical Cockpits & Role Dashboards) (+5 more)

### Community 47 - "Functions TypeScript Config"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+4 more)

### Community 48 - "Bed Management Page Test Mocks"
Cohesion: 0.15
Nodes (12): mockAddDirectAdmission, mockDirectAdmission, mockDirectAdmissions, mockDischargeDirectAdmission, mockFacilities, mockFacilitiesById, mockFacility, mockReferral (+4 more)

### Community 49 - "Auditor Briefings & Original Request"
Cohesion: 0.23
Nodes (12): Auditor M1 Briefing, Auditor M1 Dispatch, Auditor M2 Briefing, Auditor M2 Dispatch, Auditor M2 Progress Log, Auditor M2 Forensic Audit Summary, Auditor M3 Briefing, Original User Request (Agent Copy) (+4 more)

### Community 50 - "ECG Viewer Rejection Hardening"
Cohesion: 0.24
Nodes (12): Tier 5 White-Box UI Adversarial Hardening Report, ECG Viewer Overlay Accessibility & Error Handling Hardening (rationale: WCAG 2.1 modal dialog compliance, no error fallback for broken images), ECGViewerOverlay never mounted in ReferralDetailPage JSX tree (Quick View button non-functional), Milestone 5: Tier 5 White-Box Adversarial Hardening, Mandatory Rejection Reason Validation & Audit Trail (rationale: rejection is a clinical decision affecting patient destination, must be captured at point of action), ECGViewerOverlay.tsx component, VoiceTextarea.tsx component, DataContext.tsx updateReferralStatus() (+4 more)

### Community 51 - "RBAC Matrix & Referral Lifecycle"
Cohesion: 0.21
Nodes (11): Explorer Survey-1 Briefing, Explorer Survey-1 Dispatch, Explorer Survey-1 Handoff, Explorer Survey-1 Progress Log, Survey 1 Report: Codebase Architecture & Persona Lifecycle, Explorer Survey-2 Progress Log, Survey 2 Report: Security & Access Control Audit, 14-Role RBAC Permission Matrix (+3 more)

### Community 52 - "Rejection Modal & Mobile Footer"
Cohesion: 0.23
Nodes (8): DOM Test Contracts (Playwright Invariants), RejectionModal(), RejectionModalProps, ClinicalSummaryCard(), FooterAction, MobileActionFooter(), MobileActionFooterProps, TransferJourneyCard()

### Community 53 - "Cancellation Dialog & Consent Card"
Cohesion: 0.29
Nodes (7): AdminDirectActionsCard(), CancellationDialog(), CancellationDialogProps, PatientConsentCard(), PatientConsentCardProps, VoiceTextarea(), VoiceTextareaProps

### Community 54 - "Performance Benchmark Suite"
Cohesion: 0.35
Nodes (9): bench(), benchmarkPermissionChecks(), benchmarkReferralLookup(), BenchmarkResult, generateMockFacilities(), generateMockReferrals(), generateMockUsers(), printResults() (+1 more)

### Community 55 - "Firebase Config Initialization"
Cohesion: 0.18
Nodes (10): app, auth, devFlag, EMULATOR_FIREBASE_CONFIG, firebaseConfig, functions, getEnv(), getEnvString() (+2 more)

### Community 56 - "Worker M2/M5 Handoffs"
Cohesion: 0.27
Nodes (11): Challenger M5-1 Dispatch, Challenger M5-2 Dispatch, Worker M2 Handoff Report — Unified Referral Intake Wizard, Worker M2 Progress Log, Milestone 2: Unified Referral Intake Wizard, Worker M5 Briefing — Integrated Bed Management & Capacity Hub, Worker M5 Dispatch — Bed Management Hub Implementation, Worker M5 Handoff Report — Integrated Bed Management & Capacity Hub (+3 more)

### Community 57 - "Bed Concurrency & Dashboard Decomposition"
Cohesion: 0.24
Nodes (11): M3 Explorer 3 Briefing, M3 Explorer 3 Dispatch, M3 Explorer 3 Handoff: State, Data Hooks & Component Architecture, M3 Explorer 3 Progress Log, M5 Explorer 1 Briefing, M5 Explorer 1 Dispatch, M5 Explorer 1 Handoff: Bed Management Concurrency & Decomposition, M5 Explorer 1 Progress Log (+3 more)

### Community 58 - "Firebase Auth iOS/Flutter Setup"
Cohesion: 0.20
Nodes (11): Firebase Auth iOS Setup Guide, No Inline Auth Initialization Rule, Authentication in Security Rules Guide, firebase-firestore-basics Skill (referenced), firebase-storage-basics Skill (referenced), request.auth Security Rules, Flutter & Firebase Setup Guide, WidgetsFlutterBinding.ensureInitialized() Rationale (+3 more)

### Community 59 - "Xcode SPM Setup Script"
Cohesion: 0.33
Nodes (10): addCrashlyticsRunScriptBuildPhase(), hasCrashlyticsRunScriptBuildPhase(), isUserScriptSandboxingEnabled(), main(), setDwarfWithDsymDebugInformationFormat(), Bool, Foundation, PathKit (+2 more)

### Community 60 - "Clinician Role Check Duplication"
Cohesion: 0.24
Nodes (11): Clinician Role Alignment Across Doctor Role Checks (rationale: clinician omitted from copy-pasted inline isDoctor array literals across UI files), Proposed DOCTOR_ROLES / CLINICAL_PRACTITIONER_ROLES canonical constants and isDoctorRole() helper, AppLayout.tsx isDoctor role-check constant, DataContext.tsx notification targetRoles broadcast arrays, lib/mock-data.ts clinician seed user (u2, Fayed Primary Care Unit), lib/notifications.ts targetRoles delegated-check, Dashboard.tsx canCreateReferral role-check constant, FacilitySettingsPage.tsx user-role assignment dropdown (+3 more)

### Community 61 - "Original Request & Persona Simulation"
Cohesion: 0.20
Nodes (9): R4: Automated Test Suite Execution & Expansion, R1: Multi-Party Persona Lifecycle Simulation, Multi-Role Healthcare Persona Simulation Request, R2: Role Boundary & Security Enforcement, UX & Structural Redesign Request (2026-08-28), UX & Structural Redesign Request, e2e/exceptions-edge-cases.spec.ts, Complete Referral Lifecycle Journey (+1 more)

### Community 62 - "Referral Detail Header & Stage Rail"
Cohesion: 0.27
Nodes (7): BANNER_TINT_CLASSES, BannerTint, ReferralDetailHeader(), ReferralDetailHeaderProps, StageRail(), STAGE_LABELS, stageIndexForStatus()

### Community 63 - "Wizard Destination Priority Step"
Cohesion: 0.40
Nodes (9): StepDestinationPriorityProps, AiRankedFacility, BED_TYPES, NETWORK_DEPARTMENTS, PRIORITY_OPTIONS, TRANSFER_TYPES, WizardDraft, ReferralPriority (+1 more)

### Community 64 - "Wizard Stepper & RBAC Challenge"
Cohesion: 0.22
Nodes (9): Challenger M2_2 Briefing (RBAC & Data Context), Challenger M2_2 Dispatch Instructions, Challenger M2_2 Handoff Report (Empirical Challenge), Challenger M2_2 Progress Log, WIZARD_STEPS, VoiceTextarea.tsx, STEP_ICONS, WizardStepper() (+1 more)

### Community 65 - "Cancellation Reason Validation"
Cohesion: 0.24
Nodes (10): Explorer Survey-3 Briefing, Explorer Survey-3 Dispatch, Explorer Survey-3 Handoff: Edge Cases & Test Infrastructure, Explorer Survey-3 Progress Log, Mandatory Cancellation Reason Validation (rationale: current UI marks reason optional, allowing empty 'Not specified' entries in audit trail), DataContext.tsx cancelReferral(), routing.ts, sla.ts (+2 more)

### Community 66 - "Referral Draft Speech Recognition Tests"
Cohesion: 0.20
Nodes (5): DRAFT_STORAGE_KEY, mockAddReferral, mockCurrentUser, mockFacilities, MockSpeechRecognition

### Community 67 - "Bed Capacity & Persona Audits"
Cohesion: 0.39
Nodes (9): Auditor M5 Dispatch (Bed Management Forensic Audit Assignment), Auditor M5 Handoff (Milestone 5 CLEAN Verdict), Auditor M5 Progress Tracker, Challenger M2 Briefing (Persona Simulation & RBAC Challenge Memory), Challenger M2 Dispatch (Persona/RBAC Adversarial Assignment), Challenger M2 Handoff (Milestone 2 APPROVE Verdict), Bed Capacity Mutation & Bounds Validation, Milestone 2: Multi-Party Healthcare Persona Simulations & Permission Boundary Audit (+1 more)

### Community 68 - "App Shell Challenger Verdicts"
Cohesion: 0.50
Nodes (9): Challenger M1_1 Briefing (App Shell & Navigation Challenge Memory), Challenger M1_1 Dispatch (Layout/Navigation Stress-Test Assignment), Challenger M1_1 Handoff (Milestone 1 APPROVE Verdict), Challenger M1_1 Progress Tracker, Challenger M1_2 Briefing (Role Matrix & Notification Challenge Memory), Challenger M1_2 Dispatch (14-Role Navigation & Notification Assignment), Challenger M1_2 Handoff (Milestone 1 APPROVE Verdict), Challenger M1_2 Progress Tracker (+1 more)

### Community 69 - "Crashlytics Setup Guides"
Cohesion: 0.36
Nodes (9): Crashlytics Android Setup Guide, Crashlytics Gradle Plugin, Crashlytics NDK Native Crash Reporting, Crashlytics iOS Setup Guide, dSYM Upload Run Script Phase, Firebase Crashlytics Skill, Firebase MCP get_report Tool, firebase-basics Skill (+1 more)

### Community 70 - "Firestore Flutter SDK Guides"
Cohesion: 0.31
Nodes (9): Cloud Firestore in Flutter (Enterprise), FirebaseFirestore.instanceFor(databaseId:) Pattern, Item Type-Safe Model (Enterprise Flutter), ItemService Class (Enterprise Flutter), StreamBuilder Realtime UI Pattern, Cloud Firestore in Flutter (Standard), Item Type-Safe Model (Standard Flutter), ItemService Class (Standard Flutter) (+1 more)

### Community 71 - "Firestore Web SDK Realtime Queries"
Cohesion: 0.33
Nodes (9): Web SDK Usage Guide (Enterprise Native Mode), Full-Text Search Pipeline Stage (.search()), Decision Framework: Pipelines vs Standard Queries, Real-Time onSnapshot Listener (Enterprise), Relational Joins Pattern (Pipeline .addFields), Firestore Web SDK Usage Guide (Standard), onSnapshot Realtime Listener (Standard Web), setDoc/addDoc/updateDoc Operations (+1 more)

### Community 72 - "Remote Config Setup Guides"
Cohesion: 0.28
Nodes (9): Firebase Remote Config Android Setup Guide, fetchAndActivate() (Android/Kotlin), Remote Config Gradle Dependencies (BoM), Firebase Remote Config iOS Setup Guide, fetchAndActivate() (iOS/Swift), RemoteConfigDefaults.plist, firebase-remote-config-basics SKILL, Remote Config Fetching Strategies (+1 more)

### Community 73 - "Dev Dependencies (Testing/Types)"
Cohesion: 0.22
Nodes (9): autoprefixer, devDependencies, autoprefixer, @testing-library/react, @types/react-window, @types/uuid, @testing-library/react, @types/react-window (+1 more)

### Community 74 - "Escort Assignment & Button Component"
Cohesion: 0.28
Nodes (5): M6: Accessibility Essentially Absent, EscortAssignmentForm(), EscortAssignmentFormProps, ButtonProps, Button Touch Target Centralization

### Community 75 - "Wizard Diagnostics & Attachment Limits"
Cohesion: 0.31
Nodes (8): StepClinicalPresentationProps, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, StepDiagnosticsReview(), StepDiagnosticsReviewProps, StepPatientDemographicsProps, MAX_ATTACHMENT_SIZE_BYTES, PatientData

### Community 76 - "Worker M4 Referral Console"
Cohesion: 0.36
Nodes (8): Challenger M4-1 Dispatch, Challenger M4-2 Dispatch, Worker M4 Briefing — Referral Detail, Timeline & Action Console, Worker M4 Dispatch — Referral Detail Console Implementation, Worker M4 Handoff Report — Referral Detail, Timeline & Action Console, Worker M4 Progress Log, Milestone 4: Referral Detail, Timeline & Action Console, React Rules of Hooks Compliance

### Community 77 - "Worker M3 Cockpit Handoffs"
Cohesion: 0.36
Nodes (8): Explorer M3_1 Handoff (UX & Role Cockpit Specs), Explorer M3_2 Handoff (E2E Test Selectors & DOM Invariants), Explorer M3_3 Handoff (State, Architecture & TypeScript Contracts), Worker M3 Briefing (Clinical Cockpits & Role Dashboards), Worker M3 Dispatch, Worker M3 Handoff (Clinical Cockpits), Worker M3 Progress Log, Milestone 3: Clinical Cockpits & Role Dashboards

### Community 78 - "Redesign Orchestration Context"
Cohesion: 0.32
Nodes (8): Explorer Survey Data Analysis, Explorer Survey E2E Analysis, Orchestrator Redesign Gen3 Handoff, ORIGINAL_REQUEST.md (Authoritative User Request), Victory Auditor Redesign Context, Victory Auditor Redesign Dispatch, Worker M1 Dispatch, PROJECT.md (Project Plan & Architecture)

### Community 79 - "Firebase AI Logic Setup Guides"
Cohesion: 0.32
Nodes (8): firebase_ai Flutter Package Setup, FirebaseAILogic iOS SDK Setup, Firebase AI Logic Android (Kotlin) Usage, Firebase AI Logic Web (JS) Usage, Agent Platform Gemini API (Vertex AI), App Check, Firebase AI Logic Basics Skill, Gemini Developer API

### Community 80 - "Patient Demographics & National ID"
Cohesion: 0.38
Nodes (4): Egyptian 14-Digit National ID Decoder, StepPatientDemographics(), Input, InputProps

### Community 81 - "Referrals Page Screenshot Elements"
Cohesion: 0.38
Nodes (7): AES-256 Security Status Indicator, Permission Denied Toast Notification, Playwright Screenshot: No Card / Permission Denied Referrals Grid, RBAC Filter (Role-Based Access Control), Referral Summary Stat Cards (Active/Pending/Completed), All Referrals Grid Empty/Skeleton Loading State, Referrals Page UI (Ismailia Health Connect)

### Community 82 - "App Hosting Config Guides"
Cohesion: 0.38
Nodes (7): App Hosting CLI Commands, apphosting.yaml File Structure, App Hosting Local Emulator, apphosting.yaml Configuration, Blaze Pricing Plan Requirement, Firebase App Hosting Basics Skill, firebase init Service Initialization

### Community 83 - "Firebase Auth SDK Guides"
Cohesion: 0.33
Nodes (7): FirebaseAuth Android (Kotlin) SDK, Firebase Auth Web SDK, Flutter Google Sign-In Integration, Firebase Auth Basics Skill, Firebase Auth ID Token, Firebase Auth Identity Providers, FlutterFire CLI Setup

### Community 84 - "Firebase CLI & iOS Config Setup"
Cohesion: 0.33
Nodes (7): Android google-services.json Setup, Firebase CLI Help Command Discovery, FirebaseApp.configure() iOS Setup, xcode-project-setup Skill (referenced), Firebase Local Environment Node.js Prerequisite, Firebase Basics Skill / Firebase CLI, Firebase MCP Server

### Community 85 - "Worker M4_2 Test Suite Augmentation"
Cohesion: 0.53
Nodes (6): Challenger M4 Dispatch, Worker M4_2 Briefing — Full Automated Test Suite Execution (R4), Worker M4_2 Dispatch — E2E Test Suite Augmentation, Worker M4_2 Handoff Report — Full Automated Test Suite Execution (R4), Worker M4_2 Progress Log, Milestone 4: Full Automated Test Suite Execution & Augmentation (R4)

### Community 86 - "Functions V1 to V2 Migration"
Cohesion: 0.53
Nodes (6): Configuration Migration Reference, Destructuring Compatibility Shim Reference, V1 vs V2 Signature Mapping Reference, Extension to Functions Codebase Skill, Destructuring Compatibility Shim Pattern, Firebase Functions V1 to V2 Migration

### Community 87 - "Performance Optimization Notes"
Cohesion: 0.33
Nodes (5): src/lib/benchmarks.ts, Memoized O(1) Lookup Maps Optimization, NetworkDirectoryPage Pagination, src/pages/ReferralDetailPage.tsx, Referral Detail & Clinical Timeline Console (M4)

### Community 88 - "Patient Vitals Card Component"
Cohesion: 0.47
Nodes (4): isAbnormal(), PatientCard(), PatientCardProps, show()

### Community 89 - "Notification Compilation Logic"
Cohesion: 0.40
Nodes (4): compileNotifications(), NotificationParams, ASSIGNMENTS, USERS

### Community 90 - "LocalStorage Debounced Persistence"
Cohesion: 0.53
Nodes (4): debouncedSetItem(), safeGetItem(), safeSetItem(), timers

### Community 91 - "Admit Patient Page Test Mocks"
Cohesion: 0.33
Nodes (5): mockAddDirectAdmission, mockDirectAdmission, mockDischargeDirectAdmission, mockFacility, mockUser

### Community 92 - "Rejection Reason Hardening Explorer"
Cohesion: 0.70
Nodes (5): Explorer M1.1 Briefing: Rejection & Cancellation Reason Hardening, Explorer M1.1 Dispatch Instructions, Explorer M1.1 Handoff: Rejection & Cancellation Reason Hardening, Explorer M1.1 Progress Log, Milestone 1 Rejection & Cancellation Reason Hardening Analysis Report

### Community 93 - "Clinician Role Alignment Explorer"
Cohesion: 0.60
Nodes (5): Explorer M1.2 Briefing: Clinician Role Alignment, Explorer M1.2 Dispatch Instructions, Explorer M1.2 Handoff: Clinician Role Alignment, Explorer M1.2 Progress Log, Analysis Report: Role Alignment & Inclusion for clinician

### Community 94 - "Firestore Data Model Concepts"
Cohesion: 0.70
Nodes (5): Collection (Firestore concept), Collection Group Query, Firestore Data Model Reference (Enterprise), Document (Firestore concept), Subcollection (Firestore concept)

### Community 95 - "Cloud Function Notification Sender"
Cohesion: 0.40
Nodes (3): admin, db, functions

### Community 96 - "Babel Test Script"
Cohesion: 0.40
Nodes (4): babel, code, fs, result

### Community 98 - "Referral Detail Page Tests"
Cohesion: 0.40
Nodes (3): mockCancelReferral, mockReferrals, mockUpdateReferralStatus

### Community 99 - "Firestore Android Kotlin CRUD"
Cohesion: 0.83
Nodes (4): Add/Set/Get/Update/Delete CRUD Operations (Kotlin), Cloud Firestore on Android (Kotlin) Guide, Firebase.firestore Initialization (Kotlin), Jetpack Compose ComponentActivity Init Pattern

### Community 101 - "Source Map Lookup Script"
Cohesion: 0.50
Nodes (3): fs, map, { SourceMapConsumer }

### Community 104 - "CSP Header Verification Script"
Cohesion: 0.67
Nodes (3): directive(), main(), REQUIRED

### Community 105 - "Static File Server (CJS)"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 106 - "Static File Server (JS)"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 108 - "Referral Wizard Dual Reviewers"
Cohesion: 1.00
Nodes (3): Milestone 2: Unified Referral Intake Wizard, Reviewer Agent M2_1 (Unified Referral Wizard, Instance 1), Reviewer Agent M2_2 (Unified Referral Wizard, Instance 2)

## Ambiguous Edges - Review These
- `ECGViewerOverlay.tsx` → `ECGViewer.tsx`  [AMBIGUOUS]
  .agents/challenger_m4_2/BRIEFING.md · relation: semantically_similar_to
- `ReferralTimeline.tsx` → `Timeline.tsx`  [AMBIGUOUS]
  .agents/challenger_m4_2/BRIEFING.md · relation: semantically_similar_to
- `ReferralActionConsole.tsx` → `ActionConsole.tsx`  [AMBIGUOUS]
  .agents/challenger_m4_2/BRIEFING.md · relation: semantically_similar_to
- `ReferralDetailPage.tsx` → `ReferralDetail.tsx`  [AMBIGUOUS]
  .agents/challenger_m4_2/BRIEFING.md · relation: semantically_similar_to
- `Auditor M1 Briefing` → `Auditor M3 Briefing`  [AMBIGUOUS]
  .agents/auditor_m3/BRIEFING.md · relation: conceptually_related_to
- `Auditor M1 Forensic Audit Report (App Shell)` → `Auditor M1 Report (Core Exception & Alignment Hardening)`  [AMBIGUOUS]
  .agents/auditor_m1/report.md · relation: semantically_similar_to
- `Auditor M1 Progress Log` → `Auditor M1 Report (Core Exception & Alignment Hardening)`  [AMBIGUOUS]
  .agents/auditor_m1/progress.md · relation: references
- `Auditor M5 Dispatch (Bed Management Forensic Audit Assignment)` → `Auditor M5 Report (Project Acceptance Audit — INTEGRITY VIOLATION)`  [AMBIGUOUS]
  .agents/auditor_m5/report.md · relation: references
- `Challenger M5-1 Handoff Report (Bed Management)` → `Challenger M5-1 Tier 5 White-Box Adversarial Hardening Report`  [AMBIGUOUS]
  .agents/challenger_m5_1/report.md · relation: conceptually_related_to
- `M5 Explorer 1 Handoff: Bed Management Concurrency & Decomposition` → `Dashboard.tsx Role-Cockpit Component Decomposition`  [AMBIGUOUS]
  .agents/explorer_m5_1/handoff.md · relation: conceptually_related_to
- `Reviewer 2 (Milestone 1) Progress Log` → `Milestone 1 Review Report — Core Exception & Alignment Hardening`  [AMBIGUOUS]
  .agents/reviewer_m1_2/progress.md · relation: conceptually_related_to
- `Reviewer M4.2 Progress Log` → `Ismailia Health Connect UX & Structural Redesign`  [AMBIGUOUS]
  .agents/reviewer_m4_2/progress.md · relation: conceptually_related_to
- `Reviewer M5.2 Briefing` → `Reviewer M5.2 Adversarial Review Report`  [AMBIGUOUS]
  .agents/reviewer_m5_2/BRIEFING.md · relation: references
- `Reviewer M5.2 Handoff (Re-Evaluation)` → `Reviewer M5.2 Adversarial Review Report`  [AMBIGUOUS]
  .agents/reviewer_m5_2/report.md · relation: conceptually_related_to
- `Android Studio Setup Guide` → `Antigravity Setup Guide`  [AMBIGUOUS]
  .agents/skills/firebase-basics/references/setup/android_studio.md · relation: conceptually_related_to
- `Data Connect Android SDK Reference` → `subscribe() Client Pattern`  [AMBIGUOUS]
  .agents/skills/firebase-data-connect/reference/sdk_android.md · relation: conceptually_related_to
- `RBAC Filter (Role-Based Access Control)` → `All Referrals Grid Empty/Skeleton Loading State`  [AMBIGUOUS]
  playwright_no_card.png · relation: conceptually_related_to
- `Permission Denied Toast Notification` → `System Admin Role Badge`  [AMBIGUOUS]
  test_referral_detail.png · relation: conceptually_related_to

## Knowledge Gaps
- **613 isolated node(s):** `PackageDescription`, `Foundation`, `PathKit`, `fs`, `UserCredentials` (+608 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ECGViewerOverlay.tsx` and `ECGViewer.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `ReferralTimeline.tsx` and `Timeline.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `ReferralActionConsole.tsx` and `ActionConsole.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `ReferralDetailPage.tsx` and `ReferralDetail.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Auditor M1 Briefing` and `Auditor M3 Briefing`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Auditor M1 Forensic Audit Report (App Shell)` and `Auditor M1 Report (Core Exception & Alignment Hardening)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Auditor M1 Progress Log` and `Auditor M1 Report (Core Exception & Alignment Hardening)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._