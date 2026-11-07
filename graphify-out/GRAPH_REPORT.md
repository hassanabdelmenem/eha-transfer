# Graph Report - eha-transfer  (2026-11-07)

## Corpus Check
- 297 files · ~260,707 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1711 nodes · 4439 edges · 144 communities (95 shown, 49 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `451e1312`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types/index.ts
- useI18n
- Progress Log
- Milestone5.empirical-adversarial.test.tsx
- ReferralDetailPage.tsx
- dependencies
- Card.tsx
- escalation.spec.ts
- Ismailia Health Connect (`eha-transfer`)
- notifications.ts
- README.md
- User
- Components
- useSpeechRecognition
- ReferralActionConsole.receiving.test.tsx
- ignorePatterns
- compilerOptions
- REVIEW.md
- AdminDashboard.tsx
- PatientCard.tsx
- DashboardCockpits.test.tsx
- ArchivePage.tsx
- NEXT_STEPS_PROMPT.md
- db.test.ts
- cn
- wizard/types.ts
- Facility
- AppLayout.tsx
- attachments.ts
- C1: Unfiltered Referrals Listener
- NewReferralPage.tsx
- HodCockpit.tsx
- Findings: Ismailia Health Connect facts, IDs and gotchas
- PROJECT.md
- dotenv
- offlineSync.ts
- firebase
- DataContext.listeners.test.tsx
- firebase-tools
- motion
- AuthContext.test.tsx
- react-dom
- ErrorBoundary.tsx
- ReferralSummarySheet.tsx
- ArrivedTransfersQueue.tsx
- tailwind-merge
- tailwindcss
- @testing-library/user-event
- scripts
- ConsultationsPage.test.tsx
- @types/node
- AuthContext.tsx
- App.tsx
- benchmarks.ts
- firebase.ts
- @types/react-dom
- vite
- https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js
- BedCapacityGrid.tsx
- StepDestinationPriority.tsx
- Task Plan: Ismailia Health Connect to a launch-ready pilot
- FacilityAnalyticsCharts.tsx
- Referral
- m5-dom-integration.adversarial.test.tsx
- Ismailia Health Connect (`eha-transfer`)
- seed-staging.mjs
- validators.ts
- BedManagementPage.test.tsx
- AdmitPatientPage.test.tsx
- ActiveInpatientCensus.tsx
- Product
- i18n-sheet.ts
- devDependencies
- package.json
- ECGViewerOverlay.tsx
- i18n.test.tsx
- App.test.tsx
- appVersion.ts
- Pilot plan (draft)
- ReferralActionConsole.tsx
- ReferralDetailPage.test.tsx
- Changing Firestore rules in eha-transfer
- TransferJourneyCard.tsx
- PERFORMANCE.md
- useData
- detail/EscalationAlertBanner.tsx
- backfill-created-at-ms.mjs
- migrate-status-history.mjs
- useStatusHistory.ts
- rbac-rules-reviewer.md
- https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js
- /i18n-check: Clinical Bilingual & RTL Validation
- Surface brief: authenticated app shell (all role homes, referral detail, wizard, inbox, directory, handover, admin, archive, settings)
- verify-csp-headers.mjs
- server.cjs
- server.js
- firebase
- offline-sync-verifier.md
- firestore-emulator-only.sh
- search_transcript.cjs
- guard-edits.sh
- rules-reminder.sh
- stop-typecheck.sh
- lucide-react
- esbuild
- fake-indexeddb
- @firebase/rules-unit-testing
- Stryker Mutation Nightly Workflow
- @google/genai
- jsdom
- firebase-admin
- playwright
- @playwright/test
- @stryker-mutator/core
- @stryker-mutator/vitest-runner
- legacy-site-redirect/README.md
- @tailwindcss/vite
- @testing-library/dom
- @testing-library/jest-dom
- @vitejs/plugin-react
- StepDiagnosticsReview.tsx
- react-to-print
- @types/react
- MockSpeechRecognition
- vitest
- @vitest/coverage-v8
- test_blank_page.sh
- TEST_READY.md
- vite.config.ts
- @testing-library/react
- setup.ts
- StepVitals.tsx
- index.tsx

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 149 edges
2. `Referral` - 91 edges
3. `cn()` - 83 edges
4. `User` - 78 edges
5. `useAuth()` - 62 edges
6. `useData()` - 61 edges
7. `Facility` - 55 edges
8. `SimulatedHealthcareNetwork` - 36 edges
9. `Progress Log` - 36 edges
10. `BedType` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Full Pipeline & Acceptance Verification (M6)` --conceptually_related_to--> `CI Workflow`  [INFERRED]
  PROJECT.md → .github/workflows/ci.yml
- `Four-Tier Automated Test Pipeline (Lint, Rules, Vitest, Playwright)` --conceptually_related_to--> `CI Workflow`  [INFERRED]
  TEST_READY.md → .github/workflows/ci.yml
- `PersonaDirectory` --references--> `User`  [EXTRACTED]
  tests/simulation-harness.ts → src/types/index.ts
- `CI Workflow` --calls--> `scripts/verify-csp-headers.mjs`  [EXTRACTED]
  .github/workflows/ci.yml → docs/DEPLOYMENT.md
- `CI Workflow` --references--> `tests/firestore.rules.test.ts`  [EXTRACTED]
  .github/workflows/ci.yml → TEST_READY.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **REVIEW.md Critical Findings Addressed in Hardening Pass** — review_c1_unfiltered_referrals_listener, review_c2_client_only_status_gating, review_h1_audit_trail_not_append_only [EXTRACTED 0.85]
- **CI/CD Pipeline Workflows Participate in Release Gate** — github_workflows_ci_ci_workflow, github_workflows_firebase_deploy_deploy_workflow, github_workflows_firebase_preview_preview_workflow [EXTRACTED 1.00]
- **Redesign Milestone Roadmap (M1-M6)** — project_app_shell_milestone, project_referral_wizard_milestone, project_clinical_cockpits_milestone, project_referral_detail_console_milestone, project_bed_capacity_console_milestone, project_pipeline_verification_milestone [EXTRACTED 1.00]
- **Project Documents Form Chronological Narrative of Redesign & Hardening** — original_request_doc, review_doc, next_steps_prompt_doc, project_doc [INFERRED 0.75]
- **Design Residuals Tracked From NEXT_STEPS_PROMPT Into UI Update Report** — next_steps_prompt_d1_residual, next_steps_prompt_d3_residual, ui_update_report_semantic_colors, ui_update_report_accessibility_pass [INFERRED 0.85]
- **Idempotent Escalation Triggers Sharing DataContext Transaction Guard** — next_steps_prompt_sla_breach_escalation, next_steps_prompt_no_route_escalation, src_contexts_datacontext [INFERRED 0.85]

## Communities (144 total, 49 thin omitted)

### Community 0 - "types/index.ts"
Cohesion: 0.05
Nodes (83): db, DRY_RUN, main(), reconcileDirectoryIfDue(), UrgencyTimer(), CANCEL_LOCKED_STATUSES, capturedUpdates, Consumer() (+75 more)

### Community 1 - "useI18n"
Cohesion: 0.10
Nodes (38): ActiveInpatientCensus(), ArrivedTransfersQueue(), BedCapacityGrid(), DirectAdmissionForm(), DirectAdmissionFormData, DirectAdmissionModal(), AppLayout(), ReferralList() (+30 more)

### Community 2 - "Progress Log"
Cohesion: 0.05
Nodes (36): 09 Oct 2026, 2026-09-23: NEXT_STEPS_PROMPT.md status, 2026-09-26: Claude Code setup, security fix, redesign phases 1–2, 2026-09-27 (afternoon): Merged, deployed, owner decisions, 2026-09-27: Redesign phases 3–5, project memory, 2026-09-29 (evening): Finish-review fixes for the remaining screens (PR #40), 2026-09-29 (night): Design follow-ups, 2026-09-29: Owner decisions live; redesign phase 6 (+28 more)

### Community 3 - "Milestone5.empirical-adversarial.test.tsx"
Cohesion: 0.13
Nodes (14): currentDirectAdmissions, currentFacilities, currentReferrals, mockAddDirectAdmission, mockAdminUser, mockDischargeDirectAdmission, mockManagerUser, mockNurseUser (+6 more)

### Community 4 - "ReferralDetailPage.tsx"
Cohesion: 0.13
Nodes (14): ClinicalHistoryCard(), ClinicalMedicationsCard(), DepartmentReviewCard(), FooterAction, InlineDetailActions(), MobileActionFooter(), MobileActionFooterProps, BannerTint (+6 more)

### Community 5 - "dependencies"
Cohesion: 0.13
Nodes (15): clsx, date-fns, idb, dependencies, clsx, date-fns, idb, react (+7 more)

### Community 6 - "Card.tsx"
Cohesion: 0.21
Nodes (15): M7: Fourteen alert() Call Sites, Login, cache, ClinicalAttachmentsCard(), ClinicalAttachmentsCardProps, useStoredAttachmentData(), Card, CardContent (+7 more)

### Community 7 - "escalation.spec.ts"
Cohesion: 0.12
Nodes (23): ADMIN, adminPatch(), Fields, findReferralByPatient(), getReferral(), setIcu(), val(), waitForReferral() (+15 more)

### Community 8 - "Ismailia Health Connect (`eha-transfer`)"
Cohesion: 0.15
Nodes (12): Commands, E2E DOM contracts, Firestore rules: the only server-side authorization, Housekeeping, Ismailia Health Connect (`eha-transfer`), Layout, Library docs (context7), Production data warning (+4 more)

### Community 9 - "notifications.ts"
Cohesion: 0.32
Nodes (9): formatNumber(), isolate(), lookup(), translate(), isKnownKey(), notificationText(), renderNotification(), shiftLogSummary() (+1 more)

### Community 10 - "README.md"
Cohesion: 0.11
Nodes (19): Deployment Guide (docs/DEPLOYMENT.md), CSP in firebase.json Coupled to Google Sign-In, src/lib/csp.security.test.ts, github-deployer Service Account (IAM roles), Deployment Pipeline (commit -> CI -> preview -> merge -> deploy), F10: sevensn Branch Doc/Automation Mismatch (corrected), scripts/verify-csp-headers.mjs, CI Workflow (+11 more)

### Community 11 - "User"
Cohesion: 0.06
Nodes (36): addShiftLogMock, logoutMock, markAllNotificationsReadMock, markNotificationReadMock, mockDirectAdmissions, mockFacilities, mockNotifications, mockReferrals (+28 more)

### Community 12 - "Components"
Cohesion: 0.06
Nodes (32): Buttons, Capacity read-outs, Cards / Containers, Charts, Chips, Colors, Components, Design System: Ward (Ismailia Health Connect) (+24 more)

### Community 13 - "useSpeechRecognition"
Cohesion: 0.20
Nodes (9): defaultSpeechRecognitionFactory(), TestComp(), TestComp(), TestComp(), SpeechRecognitionFactory, MockRecognition, TestComp(), Window (+1 more)

### Community 14 - "ReferralActionConsole.receiving.test.tsx"
Cohesion: 0.40
Nodes (5): noop(), props(), referral, user, ReferralActionConsoleProps

### Community 15 - "ignorePatterns"
Cohesion: 0.08
Nodes (24): .agents, .claude, clear-text, coverage, .firebase, .git, .github, html (+16 more)

### Community 16 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, functions, node_modules, vite/client, compilerOptions, allowImportingTsExtensions (+16 more)

### Community 17 - "REVIEW.md"
Cohesion: 0.14
Nodes (17): firestore.rules, Audit Trail Subcollection Migration (2c), S6: /users Collection Cross-Facility Exposure, C2: Consent/Cancel-Lock Enforced Client-Side Only, C2: Consent/Cancel-Lock Enforced Client-Side Only, H1: auditTrailAppendOnly Not Enforced, H2: Fire-and-Forget Mutations Hide Rule Denials, H3: directAdmissions Update Does Not Pin facilityId (+9 more)

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.22
Nodes (11): AdminDashboard, BED_TYPES, BedOccupancyHeatmap(), LEGEND, BedStepperWidget(), capacityTone(), AdminDashboard(), isReason() (+3 more)

### Community 19 - "PatientCard.tsx"
Cohesion: 0.31
Nodes (7): isAbnormal(), PatientCard(), PatientCardProps, recordedAt(), show(), VitalStat(), Language

### Community 20 - "DashboardCockpits.test.tsx"
Cohesion: 0.09
Nodes (24): ReportsPage, mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockNotifications, mockOverrideReferralDestination (+16 more)

### Community 21 - "ArchivePage.tsx"
Cohesion: 0.30
Nodes (9): RFC-4180, Input, InputProps, csvCell(), downloadCsv(), isoOrEmpty(), toCsv(), ArchivePage() (+1 more)

### Community 22 - "NEXT_STEPS_PROMPT.md"
Cohesion: 0.09
Nodes (25): Audit Trail Append-Only Subcollection Migration Plan, createdAtMs Backfill Migration, D1 Residual: Status Color Scale Outside Brand Ramp, D3 Residual: Muted Text Contrast Compromise, No-Route (No Matching Facility / No Beds) Escalation Trigger, SLA Breach Escalation Trigger, Idle Timeout on Auth (2d), No-Route-For-Patient Escalation (+17 more)

### Community 23 - "db.test.ts"
Cohesion: 0.33
Nodes (5): clear, del, getAll, openDB, put

### Community 24 - "cn"
Cohesion: 0.10
Nodes (29): FacilitySettingsPage, NetworkDirectoryPage, NotificationsPage, ErSection(), headerActionClass, ScreenHeader(), ScreenHeaderProps, ShellContext (+21 more)

### Community 25 - "wizard/types.ts"
Cohesion: 0.24
Nodes (9): DraftReferralCard(), stillMissing(), DRAFT_STORAGE_KEY, WIZARD_STEPS, WizardDraft, WizardStepperProps, mockAddReferral, mockCurrentUser (+1 more)

### Community 26 - "Facility"
Cohesion: 0.16
Nodes (11): DirectAdmissionFormProps, mockFacility, DirectAdmissionModalProps, mockAddDirectAdmission, mockFacility, BedOccupancyHeatmapProps, TransferJourneyCardProps, PrintableSummary (+3 more)

### Community 27 - "AppLayout.tsx"
Cohesion: 0.06
Nodes (30): SHIFT_HOURS, ShiftType, AppSidebar(), AppSidebarProps, FACILITY_TYPES, isFacilityType(), mockFacility, mockReferrals (+22 more)

### Community 28 - "attachments.ts"
Cohesion: 0.15
Nodes (12): AttachmentError, AttachmentErrorCode, AttachmentFile, ENCODINGS, extOf(), IMAGE_EXTENSIONS, IMAGE_TYPES, MAX_ATTACHMENTS (+4 more)

### Community 29 - "C1: Unfiltered Referrals Listener"
Cohesion: 0.15
Nodes (11): firestore.rules list rules coupled to DataContext query shapes, S6 Accepted Risk: /users Collection Network-Wide Readable, src/contexts/AuthContext.tsx, src/contexts/DataContext.tsx, C1: Unfiltered Referrals Listener, referralsQuery (unfiltered, limit 200), firestore.rules referrals allow read rule, M4: Any Verified User Could Write Facility Config (+3 more)

### Community 30 - "NewReferralPage.tsx"
Cohesion: 0.18
Nodes (12): DraftRestoreBanner(), DraftRestoreBannerProps, NETWORK_DEPARTMENTS, mockAddReferral, mockFacilities, WizardStepper(), mockAddReferral, emptyPatient() (+4 more)

### Community 31 - "HodCockpit.tsx"
Cohesion: 0.09
Nodes (40): readReferralDraft(), EscalationAlertBanner(), isKnownReason(), minutesSince(), ReasonKey, HodCockpitProps, BED_TYPES, hhmm() (+32 more)

### Community 32 - "Findings: Ismailia Health Connect facts, IDs and gotchas"
Cohesion: 0.12
Nodes (16): Accepted dependency advisories (audit S3, 3 Oct 2026), CI / deploy, Design system as built: Ward (shared with imc-er-manager since 1 Nov 2026; DESIGN.md, read it first), Desktop workspace (phase 6), Domain rules worth remembering, Escalation e2e (`e2e/escalation.spec.ts`), Escort doctor: who names it (owner decision, 3 Oct 2026), Findings: Ismailia Health Connect facts, IDs and gotchas (+8 more)

### Community 33 - "PROJECT.md"
Cohesion: 0.17
Nodes (16): src/pages/AdmitPatientPage.tsx, src/components/layout/AppLayout.tsx, M1: App Shell, Navigation & Design System, App Shell, Navigation & Header Modernization (M1), Unified Bed & Capacity Console (M5), M5: Integrated Bed Management & Capacity Hub, src/pages/BedManagementPage.tsx, M3: Clinical Cockpits & Role Dashboards (+8 more)

### Community 35 - "offlineSync.ts"
Cohesion: 0.22
Nodes (9): splitAttachments(), deleteOfflineReferral(), getOfflineReferrals(), ReferralDB, CreateNotificationFn, syncOfflineReferrals(), capturedSets, existingDocs (+1 more)

### Community 37 - "DataContext.listeners.test.tsx"
Cohesion: 0.07
Nodes (31): clearAttachmentCache(), mockFacilities, mockReferrals, ref(), Consumer(), capturedUpdates, Consumer(), mockFacilitiesList (+23 more)

### Community 40 - "AuthContext.test.tsx"
Cohesion: 0.14
Nodes (10): AuthConsumer(), clearOfflineReferralsMock, createUserWithEmailAndPasswordMock, mockAuth, sendEmailVerificationMock, setDocMock, signInWithEmailAndPasswordMock, signInWithPopupMock (+2 more)

### Community 42 - "ErrorBoundary.tsx"
Cohesion: 0.18
Nodes (8): clear-cache.js, Rendered Login Page HTML Snapshot, Vite Entry HTML (index.html), App(), ErrorBoundary, pageLang(), Props, State

### Community 43 - "ReferralSummarySheet.tsx"
Cohesion: 0.22
Nodes (6): FOOTER_TONE_CLASSES, FooterTone, isAbnormal(), SheetAction, show(), VitalCell()

### Community 44 - "ArrivedTransfersQueue.tsx"
Cohesion: 0.28
Nodes (4): ArrivedTransfersQueueProps, mockArrivedReferrals, Badge, BadgeProps

### Community 48 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, bench, build, clean, dev, i18n:sheet, lint, mutate (+7 more)

### Community 49 - "ConsultationsPage.test.tsx"
Cohesion: 0.33
Nodes (5): mockAddConsultation, mockAnswerConsultation, mockConsultations, mockFacilities, mockUser

### Community 51 - "AuthContext.tsx"
Cohesion: 0.29
Nodes (11): AuthContext, AuthContextType, AuthProvider(), isMobileDevice(), resolveEmailVerified(), clearOfflineReferrals(), clearActivity(), hasActivity() (+3 more)

### Community 53 - "App.tsx"
Cohesion: 0.09
Nodes (19): AdmitPatientPage, ArchivePage, BedManagementPage, Dashboard, DepartmentPage, LanguageFromProfile(), NewReferralPage, Onboarding (+11 more)

### Community 54 - "benchmarks.ts"
Cohesion: 0.35
Nodes (9): bench(), benchmarkPermissionChecks(), benchmarkReferralLookup(), BenchmarkResult, generateMockFacilities(), generateMockReferrals(), generateMockUsers(), printResults() (+1 more)

### Community 55 - "firebase.ts"
Cohesion: 0.12
Nodes (14): StagingRibbon(), app, auth, devFlag, EMULATOR_FIREBASE_CONFIG, firebaseConfig, firebaseTarget, getEnv() (+6 more)

### Community 59 - "BedCapacityGrid.tsx"
Cohesion: 0.28
Nodes (5): BedCapacityCard(), BedCapacityCardProps, BED_TYPES, BedCapacityGridProps, mockFacility

### Community 60 - "StepDestinationPriority.tsx"
Cohesion: 0.28
Nodes (8): freeBeds(), PRIORITIES, StepDestinationPriority(), StepDestinationPriorityProps, ToggleRow(), TRANSFER, BED_TYPES, ReferralTransferType

### Community 61 - "Task Plan: Ismailia Health Connect to a launch-ready pilot"
Cohesion: 0.13
Nodes (14): Arabic and right-to-left (owner decisions 30 Sep), Current Phase, Decisions (owner, answered 27 Sep), Finish review of the remaining screens (29 Sep, all fixed on PR #40), Goal, Next Step, Phase 1: Hardening and first deploy (NEXT_STEPS_PROMPT.md phases 0–1), Phase 2: Security and repo setup (PRs, 26–27 Sep) (+6 more)

### Community 62 - "FacilityAnalyticsCharts.tsx"
Cohesion: 0.10
Nodes (20): ChartBlock(), FLOW_KEYS, PALETTE, Period, PERIODS, Row, Series, SeriesKey (+12 more)

### Community 63 - "Referral"
Cohesion: 0.19
Nodes (13): ClinicalHistoryCardProps, ClinicalMedicationsCardProps, DepartmentReviewCardProps, ReferralDetailHeader(), ReferralDetailHeaderProps, ReferralUtilityBar(), ReferralUtilityBarProps, STAGE_KEYS (+5 more)

### Community 64 - "m5-dom-integration.adversarial.test.tsx"
Cohesion: 0.14
Nodes (13): mockAddDirectAdmission, mockAdminFacility, mockAdminUser, mockDirectAdmission, mockDischargeDirectAdmission, mockFacility, mockNurseUser, mockReferralCCU (+5 more)

### Community 65 - "Ismailia Health Connect (`eha-transfer`)"
Cohesion: 0.15
Nodes (12): Commands, E2E DOM contracts, Firestore rules: the only server-side authorization, Housekeeping, Ismailia Health Connect (`eha-transfer`), Layout, Library docs (context7), Production data warning (+4 more)

### Community 66 - "seed-staging.mjs"
Cohesion: 0.19
Nodes (11): APPLY, call(), enc(), ensureAccount(), FACILITIES, headers, report, token (+3 more)

### Community 67 - "validators.ts"
Cohesion: 0.36
Nodes (9): ARABIC_NAME_REGEX, DecodedNationalId, HOSPITAL_ID_REGEX, isValidArabicName(), isValidHospitalId(), isValidNationalId(), NATIONAL_ID_REGEX, normalizeArabicName() (+1 more)

### Community 68 - "BedManagementPage.test.tsx"
Cohesion: 0.15
Nodes (12): mockAddDirectAdmission, mockDirectAdmission, mockDirectAdmissions, mockDischargeDirectAdmission, mockFacilities, mockFacilitiesById, mockFacility, mockReferral (+4 more)

### Community 69 - "AdmitPatientPage.test.tsx"
Cohesion: 0.33
Nodes (5): mockAddDirectAdmission, mockDirectAdmission, mockDischargeDirectAdmission, mockFacility, mockUser

### Community 70 - "ActiveInpatientCensus.tsx"
Cohesion: 0.60
Nodes (3): ActiveInpatientCensusProps, mockAdmissions, DirectAdmission

### Community 71 - "Product"
Cohesion: 0.18
Nodes (10): Accessibility & Inclusion, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 72 - "i18n-sheet.ts"
Cohesion: 0.19
Nodes (10): arabic, ARABIC_FORMS, isPlural(), Plural, rows, Tree, walk(), ar (+2 more)

### Community 73 - "devDependencies"
Cohesion: 0.22
Nodes (9): autoprefixer, devDependencies, autoprefixer, tsx, @types/uuid, typescript, tsx, @types/uuid (+1 more)

### Community 74 - "package.json"
Cohesion: 0.25
Nodes (7): name, overrides, fast-uri, qs, private, type, version

### Community 75 - "ECGViewerOverlay.tsx"
Cohesion: 0.20
Nodes (8): RejectionModal(), RejectionModalProps, ECGViewerOverlay(), ECGViewerOverlayProps, loadMotionFeatures(), ConfirmDialog(), ConfirmDialogProps, useDialogA11y()

### Community 76 - "i18n.test.tsx"
Cohesion: 0.23
Nodes (9): formatClock(), formatDayMonth(), Lang, locale(), isPlural(), leaves(), Node, Probe() (+1 more)

### Community 78 - "appVersion.ts"
Cohesion: 0.31
Nodes (6): AppRoutes(), CHECK_INTERVAL_MS, checkForNewRelease(), isStale(), __resetForTests(), watchForNewRelease()

### Community 79 - "Pilot plan (draft)"
Cohesion: 0.22
Nodes (8): Accounts (real, non-admin, one person per account), After the pilot, Before day one, During the pilot, Exit and rollback, Pilot plan (draft), Scope, Success criteria (proposal)

### Community 80 - "ReferralActionConsole.tsx"
Cohesion: 0.09
Nodes (27): AdminDirectActionsCard(), AdminDirectActionsCardProps, CancellationDialog(), CancellationDialogProps, EscortAssignmentForm(), EscortAssignmentFormProps, PatientConsentCard(), PatientConsentCardProps (+19 more)

### Community 82 - "ReferralDetailPage.test.tsx"
Cohesion: 0.40
Nodes (3): mockCancelReferral, mockReferrals, mockUpdateReferralStatus

### Community 85 - "Changing Firestore rules in eha-transfer"
Cohesion: 0.25
Nodes (7): 1. Map the blast radius before editing, 2. Write the tests first, 3. Change the rules, 4. Audit, 5. Plan the deploy order, 6. Don't, Changing Firestore rules in eha-transfer

### Community 86 - "TransferJourneyCard.tsx"
Cohesion: 0.36
Nodes (4): enteredAt(), hhmm(), base, TransferJourneyCard()

### Community 87 - "PERFORMANCE.md"
Cohesion: 0.33
Nodes (5): src/lib/benchmarks.ts, Memoized O(1) Lookup Maps Optimization, NetworkDirectoryPage Pagination, src/pages/ReferralDetailPage.tsx, Referral Detail & Clinical Timeline Console (M4)

### Community 91 - "useData"
Cohesion: 0.10
Nodes (29): ERDashboard, ClinicianCockpit(), mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination (+21 more)

### Community 92 - "detail/EscalationAlertBanner.tsx"
Cohesion: 0.39
Nodes (7): ageOf(), EscalationAlertBanner(), EscalationAlertBannerProps, EscalationKey, formatDayMonthClock(), resolve(), formatDateTime()

### Community 93 - "backfill-created-at-ms.mjs"
Cohesion: 0.33
Nodes (6): APPLY, backfill(), headers, listAll(), results, token

### Community 94 - "migrate-status-history.mjs"
Cohesion: 0.29
Nodes (4): args, db, isDryRun, projectId

### Community 95 - "useStatusHistory.ts"
Cohesion: 0.33
Nodes (4): ParentPartyFields, mockUser, unsubscribeMock, db

### Community 97 - "rbac-rules-reviewer.md"
Cohesion: 0.40
Nodes (4): Access model, Checklist, How to review, Output

### Community 104 - "verify-csp-headers.mjs"
Cohesion: 0.67
Nodes (3): directive(), main(), REQUIRED

### Community 105 - "server.cjs"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 106 - "server.js"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 134 - "StepDiagnosticsReview.tsx"
Cohesion: 0.19
Nodes (20): ChoicePill(), fieldBad, FieldError(), FieldHint(), FieldLabel(), fieldOk, inputClass(), textareaClass() (+12 more)

### Community 157 - "TEST_READY.md"
Cohesion: 0.20
Nodes (9): R4: Automated Test Suite Execution & Expansion, R3: Edge Case & Exception Pathways, Multi-Role Healthcare Persona Simulation Request, R2: Role Boundary & Security Enforcement, UX & Structural Redesign Request (2026-08-28), UX & Structural Redesign Request, npm Scripts & CI Test Pipeline, e2e/exceptions-edge-cases.spec.ts (+1 more)

### Community 211 - "StepVitals.tsx"
Cohesion: 0.13
Nodes (14): fieldBase, StepHeading(), parseVital(), StepVitals(), VitalKey, VITALS, evaluateVital(), LOW_VITAL_CODES (+6 more)

### Community 215 - "index.tsx"
Cohesion: 0.15
Nodes (16): ARABIC_AVAILABLE, CATALOGUE, deviceLanguages(), FALLBACK, I18nContext, I18nProvider(), I18nValue, isLanguage() (+8 more)

## Knowledge Gaps
- **631 isolated node(s):** `firestore-emulator-only.sh script`, `guard-edits.sh script`, `rules-reminder.sh script`, `stop-typecheck.sh script`, `npx` (+626 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useI18n()` connect `useI18n` to `types/index.ts`, `ReferralDetailPage.tsx`, `Card.tsx`, `StepDiagnosticsReview.tsx`, `User`, `AdminDashboard.tsx`, `PatientCard.tsx`, `DashboardCockpits.test.tsx`, `ArchivePage.tsx`, `cn`, `wizard/types.ts`, `AppLayout.tsx`, `NewReferralPage.tsx`, `HodCockpit.tsx`, `ReferralSummarySheet.tsx`, `ArrivedTransfersQueue.tsx`, `firebase.ts`, `BedCapacityGrid.tsx`, `StepDestinationPriority.tsx`, `FacilityAnalyticsCharts.tsx`, `Referral`, `ActiveInpatientCensus.tsx`, `ECGViewerOverlay.tsx`, `i18n.test.tsx`, `ReferralActionConsole.tsx`, `StepVitals.tsx`, `TransferJourneyCard.tsx`, `index.tsx`, `useData`, `detail/EscalationAlertBanner.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Referral` connect `Referral` to `types/index.ts`, `useI18n`, `Milestone5.empirical-adversarial.test.tsx`, `ReferralDetailPage.tsx`, `Card.tsx`, `User`, `ReferralActionConsole.receiving.test.tsx`, `AdminDashboard.tsx`, `DashboardCockpits.test.tsx`, `Facility`, `AppLayout.tsx`, `attachments.ts`, `HodCockpit.tsx`, `offlineSync.ts`, `DataContext.listeners.test.tsx`, `ReferralSummarySheet.tsx`, `ArrivedTransfersQueue.tsx`, `benchmarks.ts`, `FacilityAnalyticsCharts.tsx`, `m5-dom-integration.adversarial.test.tsx`, `BedManagementPage.test.tsx`, `ReferralActionConsole.tsx`, `ReferralDetailPage.test.tsx`, `TransferJourneyCard.tsx`, `useData`, `detail/EscalationAlertBanner.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `User` connect `User` to `types/index.ts`, `useI18n`, `Milestone5.empirical-adversarial.test.tsx`, `Card.tsx`, `ReferralActionConsole.receiving.test.tsx`, `DashboardCockpits.test.tsx`, `cn`, `Facility`, `AppLayout.tsx`, `HodCockpit.tsx`, `DataContext.listeners.test.tsx`, `ConsultationsPage.test.tsx`, `AuthContext.tsx`, `benchmarks.ts`, `Referral`, `m5-dom-integration.adversarial.test.tsx`, `BedManagementPage.test.tsx`, `AdmitPatientPage.test.tsx`, `App.test.tsx`, `ReferralActionConsole.tsx`, `TransferJourneyCard.tsx`, `useData`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `firestore-emulator-only.sh script`, `guard-edits.sh script`, `rules-reminder.sh script` to the rest of the system?**
  _631 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050412698412698416 - nodes in this community are weakly interconnected._
- **Should `useI18n` be split into smaller, more focused modules?**
  _Cohesion score 0.10431372549019607 - nodes in this community are weakly interconnected._
- **Should `Progress Log` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._