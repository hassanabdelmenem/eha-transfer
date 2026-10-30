# Graph Report - eha-transfer  (2026-10-30)

## Corpus Check
- 297 files · ~259,216 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1135 nodes · 2838 edges · 118 communities (76 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e76945dd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types/index.ts
- BedManagementPage.tsx
- StepDestinationPriority.tsx
- Milestone5.empirical-adversarial.test.tsx
- ReferralDetailPage.tsx
- dependencies
- Button.tsx
- referral-lifecycle.spec.ts
- Ismailia Health Connect (`eha-transfer`)
- db.ts
- docs/DEPLOYMENT.md
- Referral
- mockFirestore.ts
- useSpeechRecognition
- firestore.rules
- ignorePatterns
- compilerOptions
- StepDiagnosticsReview.tsx
- useData
- PatientCard.tsx
- DashboardCockpits.test.tsx
- NEXT_STEPS_PROMPT.md
- UI_UPDATE_REPORT.md
- db.test.ts
- ReferralList.tsx
- toast.ts
- overrides
- NetworkDirectoryPage.tsx
- Unified Bed & Capacity Console (M5)
- ReferralDetailPage.adversarial.test.tsx
- clsx
- ClinicianCockpit.tsx
- REVIEW.md
- PROJECT.md
- dotenv
- DataContext.tsx
- firebase
- DataContext.listeners.test.tsx
- firebase-tools
- motion
- AuthContext.test.tsx
- react-dom
- main.tsx
- Milestone4.empirical-adversarial.test.tsx
- tier5-ui.adversarial.test.tsx
- tailwind-merge
- tailwindcss
- @testing-library/user-event
- scripts
- Card.tsx
- @types/node
- AuthContext.tsx
- useAuth
- benchmarks.ts
- firebase.ts
- @types/react-dom
- vite
- https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js
- Bool
- PBXProj
- ECGViewerOverlay.tsx
- ReferralDetailHeader.tsx
- devDependencies
- package.json
- detail/EscalationAlertBanner.tsx
- Facility
- src/contexts/DataContext.tsx
- NewReferralPage.tsx
- README.md
- DashboardCockpits.adversarial.test.tsx
- C1: Unfiltered Referrals Listener
- ThemeContext.tsx
- https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js
- verify-csp-headers.mjs
- server.cjs
- server.js
- HodCockpit.tsx
- search_transcript.cjs
- esbuild
- fake-indexeddb
- @firebase/rules-unit-testing
- lib/notificationRecipients.ts
- Stryker Mutation Nightly Workflow
- @google/genai
- jsdom
- firebase-admin
- playwright
- @playwright/test
- @stryker-mutator/core
- @stryker-mutator/vitest-runner
- @tailwindcss/vite
- @testing-library/dom
- @testing-library/jest-dom
- Wizard.test.tsx
- react-to-print
- @types/react
- NewReferralPage.empirical-challenge.test.tsx
- vitest
- @vitest/coverage-v8
- test_blank_page.sh
- TEST_READY.md
- vite.config.ts
- @testing-library/react
- @types/react-window
- @types/uuid
- NewReferralPage.empirical-stress.test.tsx
- ReferralDetailPage.test.tsx
- global-setup.ts

## God Nodes (most connected - your core abstractions)
1. `Referral` - 85 edges
2. `User` - 62 edges
3. `useAuth()` - 57 edges
4. `useData()` - 57 edges
5. `Facility` - 48 edges
6. `SimulatedHealthcareNetwork` - 36 edges
7. `BedType` - 34 edges
8. `Card` - 30 edges
9. `toastError()` - 29 edges
10. `CardContent` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Full Pipeline & Acceptance Verification (M6)` --conceptually_related_to--> `CI Workflow`  [INFERRED]
  PROJECT.md → .github/workflows/ci.yml
- `Four-Tier Automated Test Pipeline (Lint, Rules, Vitest, Playwright)` --conceptually_related_to--> `CI Workflow`  [INFERRED]
  TEST_READY.md → .github/workflows/ci.yml
- `firestore.rules list rules coupled to DataContext query shapes` --conceptually_related_to--> `C1: Unfiltered Referrals Listener`  [INFERRED]
  docs/DEPLOYMENT.md → REVIEW.md
- `PersonaDirectory` --references--> `User`  [EXTRACTED]
  tests/simulation-harness.ts → src/types/index.ts
- `ECGViewerOverlay()` --references--> `react`  [EXTRACTED]
  src/components/referrals/ECGViewerOverlay.tsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **REVIEW.md Critical Findings Addressed in Hardening Pass** — review_c1_unfiltered_referrals_listener, review_c2_client_only_status_gating, review_h1_audit_trail_not_append_only [EXTRACTED 0.85]
- **CI/CD Pipeline Workflows Participate in Release Gate** — github_workflows_ci_ci_workflow, github_workflows_firebase_deploy_deploy_workflow, github_workflows_firebase_preview_preview_workflow [EXTRACTED 1.00]
- **Redesign Milestone Roadmap (M1-M6)** — project_app_shell_milestone, project_referral_wizard_milestone, project_clinical_cockpits_milestone, project_referral_detail_console_milestone, project_bed_capacity_console_milestone, project_pipeline_verification_milestone [EXTRACTED 1.00]
- **Project Documents Form Chronological Narrative of Redesign & Hardening** — original_request_doc, review_doc, next_steps_prompt_doc, project_doc [INFERRED 0.75]
- **Design Residuals Tracked From NEXT_STEPS_PROMPT Into UI Update Report** — next_steps_prompt_d1_residual, next_steps_prompt_d3_residual, ui_update_report_semantic_colors, ui_update_report_accessibility_pass [INFERRED 0.85]
- **Idempotent Escalation Triggers Sharing DataContext Transaction Guard** — next_steps_prompt_sla_breach_escalation, next_steps_prompt_no_route_escalation, src_contexts_datacontext [INFERRED 0.85]

## Communities (118 total, 42 thin omitted)

### Community 0 - "types/index.ts"
Cohesion: 0.09
Nodes (50): AppLayout(), AppSidebar(), AppSidebarProps, mockFacility, mockReferrals, mockUser, ROLE_CONFIGS, RoleBadge() (+42 more)

### Community 1 - "BedManagementPage.tsx"
Cohesion: 0.17
Nodes (16): AdmitPatientPage, BedManagementPage, FacilitySettingsPage, ActiveInpatientCensus(), DirectAdmissionForm(), DirectAdmissionFormData, DirectAdmissionModal(), mockAddDirectAdmission (+8 more)

### Community 2 - "StepDestinationPriority.tsx"
Cohesion: 0.30
Nodes (10): StepDestinationPriority(), StepDestinationPriorityProps, AiRankedFacility, BED_TYPES, NETWORK_DEPARTMENTS, PRIORITY_OPTIONS, TRANSFER_TYPES, WizardDraft (+2 more)

### Community 3 - "Milestone5.empirical-adversarial.test.tsx"
Cohesion: 0.06
Nodes (32): ArrivedTransfersQueue(), ArrivedTransfersQueueProps, mockArrivedReferrals, BedCapacityCard(), BedCapacityCardProps, currentDirectAdmissions, currentFacilities, currentReferrals (+24 more)

### Community 4 - "ReferralDetailPage.tsx"
Cohesion: 0.16
Nodes (11): ReferralActionConsole(), RejectionModal(), RejectionModalProps, ClinicalAttachmentsCard(), ClinicalHistoryCard(), ClinicalMedicationsCard(), FooterAction, MobileActionFooter() (+3 more)

### Community 5 - "dependencies"
Cohesion: 0.14
Nodes (14): date-fns, idb, lucide-react, dependencies, date-fns, idb, lucide-react, react-router-dom (+6 more)

### Community 6 - "Button.tsx"
Cohesion: 0.23
Nodes (6): DirectAdmissionFormProps, Button, ButtonProps, Input, InputProps, cn()

### Community 7 - "referral-lifecycle.spec.ts"
Cohesion: 0.25
Nodes (8): E2E_USER, E2E_USERS, createMockImageFile(), loginAs(), UserCredentials, R1: Multi-Party Persona Lifecycle Simulation, Complete Referral Lifecycle Journey, Tier 4: Playwright End-to-End Suites

### Community 8 - "Ismailia Health Connect (`eha-transfer`)"
Cohesion: 0.15
Nodes (12): Commands, E2E DOM contracts, Firestore rules: the only server-side authorization, Housekeeping, Ismailia Health Connect (`eha-transfer`), Layout, Library docs (context7), Production data warning (+4 more)

### Community 9 - "db.ts"
Cohesion: 0.26
Nodes (7): deleteOfflineReferral(), getOfflineReferrals(), CreateNotificationFn, syncOfflineReferrals(), capturedSets, existingDocs, sampleReferral

### Community 10 - "docs/DEPLOYMENT.md"
Cohesion: 0.19
Nodes (12): CSP in firebase.json Coupled to Google Sign-In, src/lib/csp.security.test.ts, github-deployer Service Account (IAM roles), Deployment Pipeline (commit -> CI -> preview -> merge -> deploy), scripts/verify-csp-headers.mjs, CI Workflow, Firebase Deploy Workflow, Firebase PR Preview Workflow (+4 more)

### Community 11 - "Referral"
Cohesion: 0.06
Nodes (42): ActiveInpatientCensusProps, mockAdmissions, FacilityAnalyticsChartsProps, addShiftLogMock, logoutMock, markAllNotificationsReadMock, markNotificationReadMock, mockDirectAdmissions (+34 more)

### Community 12 - "mockFirestore.ts"
Cohesion: 0.36
Nodes (8): activeState, applyPatch(), createFirestoreModuleMock(), docsFor(), getPath(), notify(), setPath(), snapshotFor()

### Community 13 - "useSpeechRecognition"
Cohesion: 0.12
Nodes (16): react, react, TestComp(), MockAudio, play, TestComp(), useAudioAlert(), defaultSpeechRecognitionFactory() (+8 more)

### Community 14 - "firestore.rules"
Cohesion: 0.29
Nodes (8): firestore.rules, Audit Trail Subcollection Migration (2c), S6: /users Collection Cross-Facility Exposure, C2: Consent/Cancel-Lock Enforced Client-Side Only, H1: auditTrailAppendOnly Not Enforced, H3: directAdmissions facilityId Unpinned, M3: Hardcoded Bootstrap Owner Email, M5: Unconstrained Notification Fan-Out

### Community 15 - "ignorePatterns"
Cohesion: 0.08
Nodes (24): .agents, .claude, clear-text, coverage, .firebase, .git, .github, html (+16 more)

### Community 16 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, functions, node_modules, vite/client, compilerOptions, allowImportingTsExtensions (+16 more)

### Community 17 - "StepDiagnosticsReview.tsx"
Cohesion: 0.29
Nodes (6): ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, StepDiagnosticsReview(), StepDiagnosticsReviewProps, MAX_ATTACHMENT_SIZE_BYTES, Attachment

### Community 18 - "useData"
Cohesion: 0.17
Nodes (17): AdminDashboard, Dashboard, ERDashboard, BedCapacityGrid(), ClinicianCockpit(), ERCockpit(), ManagerCockpit(), ReferralList() (+9 more)

### Community 19 - "PatientCard.tsx"
Cohesion: 0.47
Nodes (4): isAbnormal(), PatientCard(), PatientCardProps, show()

### Community 20 - "DashboardCockpits.test.tsx"
Cohesion: 0.11
Nodes (18): mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockQuickTransfer, mockReferrals (+10 more)

### Community 21 - "NEXT_STEPS_PROMPT.md"
Cohesion: 0.20
Nodes (10): createdAtMs Backfill Migration, No-Route (No Matching Facility / No Beds) Escalation Trigger, SLA Breach Escalation Trigger, Idle Timeout on Auth (2d), No-Route-For-Patient Escalation, Overnight Escalation Gap (Requires Blaze Scheduled Function), SLA Breach Escalation (30-Minute Rule), Duplicated SLA Constant (2b) (+2 more)

### Community 22 - "UI_UPDATE_REPORT.md"
Cohesion: 0.14
Nodes (14): D1 Residual: Status Color Scale Outside Brand Ramp, D3 Residual: Muted Text Contrast Compromise, Overnight Escalation Gap (2a), Typography and Touch Targets (2e), M6: Accessibility Essentially Absent, src/index.css, WCAG 2.1 AA Accessibility Pass, Accessibility Pass (WCAG 2.1 AA) (+6 more)

### Community 23 - "db.test.ts"
Cohesion: 0.33
Nodes (5): clear, del, getAll, openDB, put

### Community 24 - "ReferralList.tsx"
Cohesion: 0.22
Nodes (12): NotificationsPage, ReferralListProps, Skeleton(), SkeletonDetailBlock(), SkeletonGroup(), SkeletonLine(), SkeletonReferralCard(), SkeletonReferralRow() (+4 more)

### Community 25 - "toast.ts"
Cohesion: 0.16
Nodes (17): Toaster(), TONE_ICON_COLORS, TONE_ICONS, TONE_STYLES, clearToasts(), DEFAULT_TTL_MS, describeError(), dismissToast() (+9 more)

### Community 26 - "overrides"
Cohesion: 0.40
Nodes (5): overrides, fast-uri, qs, react-router, stream-json

### Community 27 - "NetworkDirectoryPage.tsx"
Cohesion: 0.50
Nodes (4): NetworkDirectoryPage, BED_TYPES, capacityHint(), NetworkDirectoryPage()

### Community 28 - "Unified Bed & Capacity Console (M5)"
Cohesion: 0.67
Nodes (3): src/pages/AdmitPatientPage.tsx, Unified Bed & Capacity Console (M5), src/pages/BedManagementPage.tsx

### Community 31 - "ClinicianCockpit.tsx"
Cohesion: 0.19
Nodes (13): ReferralCockpitCard(), ShiftHandoverFeed(), ClinicianSegment, DashboardMetric, DashboardStatGridProps, ReferralCockpitCardProps, ShiftHandoverFeedProps, Badge (+5 more)

### Community 32 - "REVIEW.md"
Cohesion: 0.17
Nodes (11): Audit Trail Append-Only Subcollection Migration Plan, C2: Consent/Cancel-Lock Enforced Client-Side Only, H1: auditTrailAppendOnly Not Truly Append-Only, H2: Fire-and-Forget Mutations Hide Rule Denials, H3: directAdmissions Update Does Not Pin facilityId, H4: Auth Errors Leak and Enumerate, H4: Auth Error Handling Leaks and Enumerates Users, Fragile lazyLoad Module Resolution (+3 more)

### Community 33 - "PROJECT.md"
Cohesion: 0.22
Nodes (13): src/components/layout/AppLayout.tsx, M1: App Shell, Navigation & Design System, App Shell, Navigation & Header Modernization (M1), M5: Integrated Bed Management & Capacity Hub, M3: Clinical Cockpits & Role Dashboards, DOM Test Contracts (Playwright Invariants), src/pages/NewReferralPage.tsx, M6: Full Pipeline & Acceptance Verification (+5 more)

### Community 35 - "DataContext.tsx"
Cohesion: 0.15
Nodes (12): capturedUpdates, Consumer(), DataContext, DataContextType, DataProvider(), OFFLINE_SYNC_STALL_TIMEOUT_MS, Consumer(), writeFailed() (+4 more)

### Community 37 - "DataContext.listeners.test.tsx"
Cohesion: 0.15
Nodes (14): mockFacilities, mockReferrals, ref(), Consumer(), Consumer(), Consumer(), makeDirectAdmission(), makeFacility() (+6 more)

### Community 40 - "AuthContext.test.tsx"
Cohesion: 0.15
Nodes (10): AuthConsumer(), clearOfflineReferralsMock, createUserWithEmailAndPasswordMock, mockAuth, sendEmailVerificationMock, setDocMock, signInWithEmailAndPasswordMock, signInWithPopupMock (+2 more)

### Community 42 - "main.tsx"
Cohesion: 0.18
Nodes (7): clear-cache.js, Rendered Login Page HTML Snapshot, Vite Entry HTML (index.html), App(), ErrorBoundary, Props, State

### Community 43 - "Milestone4.empirical-adversarial.test.tsx"
Cohesion: 0.13
Nodes (13): mockAddDeptComment, mockCancelReferral, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockRecordPatientConsent, mockRecordPatientDecline, mockReferrals (+5 more)

### Community 44 - "tier5-ui.adversarial.test.tsx"
Cohesion: 0.13
Nodes (12): mockAddDeptComment, mockAddReferral, mockCancelReferral, mockFacilities, mockOverrideReferralDestination, mockRecordPatientConsent, mockRecordPatientDecline, mockReferrals (+4 more)

### Community 48 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, bench, build, clean, dev, lint, mutate, preview (+6 more)

### Community 49 - "Card.tsx"
Cohesion: 0.22
Nodes (12): BED_TYPES, ClinicalAttachmentsCardProps, ClinicalHistoryCardProps, ClinicalMedicationsCardProps, DepartmentReviewCardProps, TransferContextCardProps, StepPatientDemographicsProps, Card (+4 more)

### Community 51 - "AuthContext.tsx"
Cohesion: 0.28
Nodes (6): mockAuthState, AuthContext, AuthContextType, AuthProvider(), isMobileDevice(), clearOfflineReferrals()

### Community 53 - "useAuth"
Cohesion: 0.12
Nodes (20): AppRoutes(), ArchivePage, DepartmentPage, Login, NewReferralPage, Onboarding, PendingVerification, ProtectedRoute() (+12 more)

### Community 54 - "benchmarks.ts"
Cohesion: 0.31
Nodes (10): bench(), benchmarkPermissionChecks(), benchmarkReferralLookup(), BenchmarkResult, generateMockFacilities(), generateMockReferrals(), generateMockUsers(), printResults() (+2 more)

### Community 55 - "firebase.ts"
Cohesion: 0.17
Nodes (11): app, auth, db, devFlag, EMULATOR_FIREBASE_CONFIG, firebaseConfig, functions, getEnv() (+3 more)

### Community 63 - "ReferralDetailHeader.tsx"
Cohesion: 0.27
Nodes (7): BANNER_TINT_CLASSES, BannerTint, ReferralDetailHeader(), ReferralDetailHeaderProps, StageRail(), STAGE_LABELS, stageIndexForStatus()

### Community 73 - "devDependencies"
Cohesion: 0.22
Nodes (9): autoprefixer, devDependencies, autoprefixer, tsx, typescript, @vitejs/plugin-react, tsx, typescript (+1 more)

### Community 74 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 75 - "detail/EscalationAlertBanner.tsx"
Cohesion: 0.33
Nodes (5): ESCALATION_DETAIL, ESCALATION_HEADLINE, EscalationAlertBanner(), EscalationAlertBannerProps, EscalationKey

### Community 80 - "Facility"
Cohesion: 0.07
Nodes (23): BedCapacityGridProps, mockFacility, mockFacility, DirectAdmissionModalProps, BedOccupancyHeatmapProps, AdminDirectActionsCard(), AdminDirectActionsCardProps, CancellationDialog() (+15 more)

### Community 87 - "src/contexts/DataContext.tsx"
Cohesion: 0.18
Nodes (10): firestore.rules list rules coupled to DataContext query shapes, S6 Accepted Risk: /users Collection Network-Wide Readable, src/lib/benchmarks.ts, Memoized O(1) Lookup Maps Optimization, NetworkDirectoryPage Pagination, src/contexts/AuthContext.tsx, src/contexts/DataContext.tsx, src/pages/ReferralDetailPage.tsx (+2 more)

### Community 89 - "NewReferralPage.tsx"
Cohesion: 0.22
Nodes (9): WIZARD_STEPS, STEP_ICONS, WizardStepper(), WizardStepperProps, mockAddReferral, DEFAULT_VITALS, loadDraft(), NewReferralPage() (+1 more)

### Community 90 - "README.md"
Cohesion: 0.25
Nodes (7): Deployment Guide (docs/DEPLOYMENT.md), F10: sevensn Branch Doc/Automation Mismatch (corrected), er-app-final Repository (Unrelated Firebase Project), F10: sevensn Branch Mismatch (Security Assessment Finding), One-Repo-One-Firebase-Project Binding, imc-er Repository (Unrelated Firebase Project), Repository-to-Firebase-Project Binding (1:1, no shared backend)

### Community 91 - "DashboardCockpits.adversarial.test.tsx"
Cohesion: 0.10
Nodes (20): BED_TYPES, BedOccupancyHeatmap(), mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination (+12 more)

### Community 97 - "C1: Unfiltered Referrals Listener"
Cohesion: 0.25
Nodes (6): C1: Unfiltered Referrals Listener, referralsQuery (unfiltered, limit 200), firestore.rules referrals allow read rule, M4: Any Verified User Could Write Facility Config, Tier 2: Firestore Security Rules Tests, projectRoot

### Community 98 - "ThemeContext.tsx"
Cohesion: 0.24
Nodes (8): initialState, Consumer(), Theme, ThemeContext, ThemeProvider(), ThemeProviderProps, ThemeProviderState, useTheme()

### Community 104 - "verify-csp-headers.mjs"
Cohesion: 0.67
Nodes (3): directive(), main(), REQUIRED

### Community 105 - "server.cjs"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 106 - "server.js"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 107 - "HodCockpit.tsx"
Cohesion: 0.20
Nodes (7): ESCALATION_LABELS, EscalationAlertBanner(), HodCockpitProps, EscalationAlertBannerProps, isAbnormal(), ReferralSummarySheet(), show()

### Community 120 - "lib/notificationRecipients.ts"
Cohesion: 0.39
Nodes (5): DELEGATABLE_ON_CALL_ROLES, isNotificationRecipient(), NotificationRecipientCandidate, NotificationTargetParams, RecipientShiftAssignment

### Community 134 - "Wizard.test.tsx"
Cohesion: 0.19
Nodes (12): DraftRestoreBanner(), DraftRestoreBannerProps, StepClinicalPresentation(), StepClinicalPresentationProps, StepPatientDemographics(), evaluateVital(), VitalEvaluation, VitalsRangeBadge() (+4 more)

### Community 138 - "NewReferralPage.empirical-challenge.test.tsx"
Cohesion: 0.20
Nodes (5): DRAFT_STORAGE_KEY, mockAddReferral, mockCurrentUser, mockFacilities, MockSpeechRecognition

### Community 157 - "TEST_READY.md"
Cohesion: 0.20
Nodes (9): R4: Automated Test Suite Execution & Expansion, R3: Edge Case & Exception Pathways, Multi-Role Healthcare Persona Simulation Request, R2: Role Boundary & Security Enforcement, UX & Structural Redesign Request (2026-08-28), UX & Structural Redesign Request, npm Scripts & CI Test Pipeline, e2e/exceptions-edge-cases.spec.ts (+1 more)

### Community 211 - "NewReferralPage.empirical-stress.test.tsx"
Cohesion: 0.40
Nodes (3): mockAddReferral, mockFacilities, mockNavigate

### Community 215 - "ReferralDetailPage.test.tsx"
Cohesion: 0.40
Nodes (3): mockCancelReferral, mockReferrals, mockUpdateReferralStatus

### Community 217 - "global-setup.ts"
Cohesion: 0.83
Nodes (3): globalSetup(), waitFor(), seed()

## Knowledge Gaps
- **418 isolated node(s):** `Project memory (read first)`, `Published pages (Codex.ai Artifacts, owned by the user)`, `Production data warning`, `Commands`, `Layout` (+413 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useSpeechRecognition` to `Referral`, `dependencies`, `ECGViewerOverlay.tsx`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `firebase`, `motion`, `react-to-print`, `react-dom`, `package.json`, `useSpeechRecognition`, `tailwind-merge`, `clsx`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `ECGViewerOverlay()` connect `ECGViewerOverlay.tsx` to `types/index.ts`, `ReferralDetailPage.tsx`, `Milestone4.empirical-adversarial.test.tsx`, `tier5-ui.adversarial.test.tsx`, `useSpeechRecognition`, `StepDiagnosticsReview.tsx`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `Project memory (read first)`, `Published pages (Codex.ai Artifacts, owned by the user)`, `Production data warning` to the rest of the system?**
  _418 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08771929824561403 - nodes in this community are weakly interconnected._
- **Should `Milestone5.empirical-adversarial.test.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06258890469416785 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._