# Graph Report - eha-transfer  (2026-10-30)

## Corpus Check
- 297 files · ~259,368 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1699 nodes · 4399 edges · 157 communities (107 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c821f8c9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- edge-cases-exceptions.test.ts
- useI18n
- Progress Log
- Milestone5.empirical-adversarial.test.tsx
- ReferralDetailPage.tsx
- dependencies
- Login.tsx
- test-helpers.ts
- Ismailia Health Connect (`eha-transfer`)
- notifications.ts
- docs/DEPLOYMENT.md
- User
- Components
- useSpeechRecognition
- Referral
- ignorePatterns
- compilerOptions
- types/index.ts
- AdminDashboard.tsx
- PatientCard.tsx
- DashboardCockpits.test.tsx
- escalationSweep.ts
- NEXT_STEPS_PROMPT.md
- db.test.ts
- cn
- toast.ts
- Facility
- NetworkDirectoryPage.tsx
- attachments.ts
- ReferralDetailPage.adversarial.test.tsx
- AppSidebar.tsx
- HodCockpit.tsx
- Findings: Ismailia Health Connect facts, IDs and gotchas
- PROJECT.md
- dotenv
- DataContext.tsx
- firebase
- DataContext.listeners.test.tsx
- firebase-tools
- motion
- AuthContext.test.tsx
- react-dom
- ErrorBoundary.tsx
- Milestone4.empirical-adversarial.test.tsx
- tier5-ui.adversarial.test.tsx
- tailwind-merge
- tailwindcss
- @testing-library/user-event
- scripts
- Card.tsx
- @types/node
- AuthContext.tsx
- App.tsx
- benchmarks.ts
- firebase.ts
- @types/react-dom
- vite
- https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js
- AppLayout.test.tsx
- Workspace.tsx
- Task Plan: Ismailia Health Connect to a launch-ready pilot
- FacilityAnalyticsCharts.tsx
- ReferralDetailHeader.tsx
- m5-dom-integration.adversarial.test.tsx
- Ismailia Health Connect (`eha-transfer`)
- seed-staging.mjs
- validators.ts
- BedManagementPage.test.tsx
- DataContext.escalation.test.tsx
- useAudioAlert
- Product
- i18n-sheet.ts
- devDependencies
- package.json
- detail/EscalationAlertBanner.tsx
- i18n.test.tsx
- escalation.spec.ts
- appVersion.ts
- Pilot plan (draft)
- ReferralActionConsole.tsx
- ArrivedTransfersQueue.tsx
- BedCapacityGrid.tsx
- AppLayout.tsx
- directory.ts
- Changing Firestore rules in eha-transfer
- TransferJourneyCard.tsx
- PERFORMANCE.md
- ReferralTimeline.tsx
- NewReferralPage.tsx
- README.md
- DashboardCockpits.adversarial.test.tsx
- format.ts
- backfill-created-at-ms.mjs
- migrate-status-history.mjs
- useStatusHistory.ts
- AdmitPatientPage.test.tsx
- rbac-rules-reviewer.md
- ThemeContext.tsx
- ActiveInpatientCensus.tsx
- https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js
- DataContext.cancel.test.tsx
- /i18n-check: Clinical Bilingual & RTL Validation
- Surface brief: authenticated app shell (all role homes, referral detail, wizard, inbox, directory, handover, admin, archive, settings)
- verify-csp-headers.mjs
- server.cjs
- server.js
- ReferralSummarySheet.tsx
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
- escortAuthority.ts
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
- StepDestinationPriority.tsx
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
- seed.ts

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 147 edges
2. `Referral` - 91 edges
3. `cn()` - 81 edges
4. `User` - 77 edges
5. `useAuth()` - 60 edges
6. `useData()` - 59 edges
7. `Facility` - 54 edges
8. `SimulatedHealthcareNetwork` - 36 edges
9. `BedType` - 35 edges
10. `Progress Log` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Full Pipeline & Acceptance Verification (M6)` --conceptually_related_to--> `CI Workflow`  [INFERRED]
  PROJECT.md → .github/workflows/ci.yml
- `Four-Tier Automated Test Pipeline (Lint, Rules, Vitest, Playwright)` --conceptually_related_to--> `CI Workflow`  [INFERRED]
  TEST_READY.md → .github/workflows/ci.yml
- `reconcileDirectoryIfDue()` --calls--> `planDirectoryChanges()`  [EXTRACTED]
  scripts/escalation-sweep.ts → src/lib/directory.ts
- `main()` --calls--> `isNotificationRecipient()`  [EXTRACTED]
  scripts/escalation-sweep.ts → src/lib/notificationRecipients.ts
- `PersonaDirectory` --references--> `User`  [EXTRACTED]
  tests/simulation-harness.ts → src/types/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **REVIEW.md Critical Findings Addressed in Hardening Pass** — review_c1_unfiltered_referrals_listener, review_c2_client_only_status_gating, review_h1_audit_trail_not_append_only [EXTRACTED 0.85]
- **CI/CD Pipeline Workflows Participate in Release Gate** — github_workflows_ci_ci_workflow, github_workflows_firebase_deploy_deploy_workflow, github_workflows_firebase_preview_preview_workflow [EXTRACTED 1.00]
- **Redesign Milestone Roadmap (M1-M6)** — project_app_shell_milestone, project_referral_wizard_milestone, project_clinical_cockpits_milestone, project_referral_detail_console_milestone, project_bed_capacity_console_milestone, project_pipeline_verification_milestone [EXTRACTED 1.00]
- **Project Documents Form Chronological Narrative of Redesign & Hardening** — original_request_doc, review_doc, next_steps_prompt_doc, project_doc [INFERRED 0.75]
- **Design Residuals Tracked From NEXT_STEPS_PROMPT Into UI Update Report** — next_steps_prompt_d1_residual, next_steps_prompt_d3_residual, ui_update_report_semantic_colors, ui_update_report_accessibility_pass [INFERRED 0.85]
- **Idempotent Escalation Triggers Sharing DataContext Transaction Guard** — next_steps_prompt_sla_breach_escalation, next_steps_prompt_no_route_escalation, src_contexts_datacontext [INFERRED 0.85]

## Communities (157 total, 50 thin omitted)

### Community 0 - "edge-cases-exceptions.test.ts"
Cohesion: 0.20
Nodes (20): UrgencyTimer(), availableBeds(), CandidateQuery, CapacityCandidate, capacityEscalationReason, describeCapacityEscalation(), facilityMatches(), findCandidateFacilities() (+12 more)

### Community 1 - "useI18n"
Cohesion: 0.20
Nodes (27): LanguageFromProfile(), ActiveInpatientCensus(), ArrivedTransfersQueue(), BedCapacityGrid(), DirectAdmissionForm(), DirectAdmissionFormData, DirectAdmissionModal(), ERCockpit() (+19 more)

### Community 2 - "Progress Log"
Cohesion: 0.06
Nodes (35): 09 Oct 2026, 2026-09-23: NEXT_STEPS_PROMPT.md status, 2026-09-26: Claude Code setup, security fix, redesign phases 1–2, 2026-09-27 (afternoon): Merged, deployed, owner decisions, 2026-09-27: Redesign phases 3–5, project memory, 2026-09-29 (evening): Finish-review fixes for the remaining screens (PR #40), 2026-09-29 (night): Design follow-ups, 2026-09-29: Owner decisions live; redesign phase 6 (+27 more)

### Community 3 - "Milestone5.empirical-adversarial.test.tsx"
Cohesion: 0.13
Nodes (14): currentDirectAdmissions, currentFacilities, currentReferrals, mockAddDirectAdmission, mockAdminUser, mockDischargeDirectAdmission, mockManagerUser, mockNurseUser (+6 more)

### Community 4 - "ReferralDetailPage.tsx"
Cohesion: 0.15
Nodes (14): cache, clearAttachmentCache(), ClinicalAttachmentsCard(), useStoredAttachmentData(), ClinicalHistoryCard(), ClinicalMedicationsCard(), DepartmentReviewCard(), FooterAction (+6 more)

### Community 5 - "dependencies"
Cohesion: 0.13
Nodes (15): clsx, date-fns, idb, dependencies, clsx, date-fns, idb, react (+7 more)

### Community 6 - "Login.tsx"
Cohesion: 0.12
Nodes (14): clear-cache.js, Rendered Login Page HTML Snapshot, Vite Entry HTML (index.html), H4: Auth Errors Leak and Enumerate, Login, CardFooter, Input, InputProps (+6 more)

### Community 7 - "test-helpers.ts"
Cohesion: 0.32
Nodes (8): E2E_USERS, clickAndAwaitReload(), clickVisibleLogout(), createMockImageFile(), gotoLogin(), loginAs(), UserCredentials, Tier 4: Playwright End-to-End Suites

### Community 8 - "Ismailia Health Connect (`eha-transfer`)"
Cohesion: 0.15
Nodes (12): Commands, E2E DOM contracts, Firestore rules: the only server-side authorization, Housekeeping, Ismailia Health Connect (`eha-transfer`), Layout, Library docs (context7), Production data warning (+4 more)

### Community 9 - "notifications.ts"
Cohesion: 0.30
Nodes (10): translate(), isKnownKey(), notificationText(), renderNotification(), resolve(), shiftLogSummary(), capturedSets, existingDocs (+2 more)

### Community 10 - "docs/DEPLOYMENT.md"
Cohesion: 0.19
Nodes (12): CSP in firebase.json Coupled to Google Sign-In, src/lib/csp.security.test.ts, github-deployer Service Account (IAM roles), Deployment Pipeline (commit -> CI -> preview -> merge -> deploy), scripts/verify-csp-headers.mjs, CI Workflow, Firebase Deploy Workflow, Firebase PR Preview Workflow (+4 more)

### Community 11 - "User"
Cohesion: 0.23
Nodes (3): Notification, User, SimulatedHealthcareNetwork

### Community 12 - "Components"
Cohesion: 0.06
Nodes (30): Buttons, Capacity read-outs, Cards / Containers, Charts, Chips, Colors, Components, Design System: Ismailia Health Connect (+22 more)

### Community 13 - "useSpeechRecognition"
Cohesion: 0.20
Nodes (9): defaultSpeechRecognitionFactory(), TestComp(), TestComp(), TestComp(), SpeechRecognitionFactory, MockRecognition, TestComp(), Window (+1 more)

### Community 14 - "Referral"
Cohesion: 0.09
Nodes (20): ClinicianSegment, EscalationAlertBannerProps, FacilityAnalyticsChartsProps, ReferralCockpitCardProps, ShiftHandoverFeedProps, noop(), props(), referral (+12 more)

### Community 15 - "ignorePatterns"
Cohesion: 0.08
Nodes (24): .agents, .claude, clear-text, coverage, .firebase, .git, .github, html (+16 more)

### Community 16 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, functions, node_modules, vite/client, compilerOptions, allowImportingTsExtensions (+16 more)

### Community 17 - "types/index.ts"
Cohesion: 0.18
Nodes (19): CANCEL_LOCKED_STATUSES, SENIOR_CANCEL_ROLES, ALL_ROLES, capturedUpdates, Attachment, CLINICAL_BROADCAST_ROLES, CLINICAL_PRACTITIONER_ROLES, DeptApprovalStatus (+11 more)

### Community 18 - "AdminDashboard.tsx"
Cohesion: 0.20
Nodes (12): AdminDashboard, BED_TYPES, BedOccupancyHeatmap(), LEGEND, BED_TYPES, BedStepperWidget(), capacityTone(), AdminDashboard() (+4 more)

### Community 19 - "PatientCard.tsx"
Cohesion: 0.36
Nodes (6): isAbnormal(), PatientCard(), PatientCardProps, recordedAt(), show(), VitalStat()

### Community 20 - "DashboardCockpits.test.tsx"
Cohesion: 0.09
Nodes (24): ReportsPage, mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockNotifications, mockOverrideReferralDestination (+16 more)

### Community 21 - "escalationSweep.ts"
Cohesion: 0.17
Nodes (16): db, DRY_RUN, main(), reconcileDirectoryIfDue(), NotificationKey, NotificationVars, DirectoryEntry, EscalationAction (+8 more)

### Community 22 - "NEXT_STEPS_PROMPT.md"
Cohesion: 0.05
Nodes (53): firestore.rules list rules coupled to DataContext query shapes, firestore.rules, Audit Trail Subcollection Migration (2c), Audit Trail Append-Only Subcollection Migration Plan, createdAtMs Backfill Migration, D1 Residual: Status Color Scale Outside Brand Ramp, D3 Residual: Muted Text Contrast Compromise, No-Route (No Matching Facility / No Beds) Escalation Trigger (+45 more)

### Community 23 - "db.test.ts"
Cohesion: 0.33
Nodes (5): clear, del, getAll, openDB, put

### Community 24 - "cn"
Cohesion: 0.14
Nodes (22): NotificationsPage, ErSection(), EscalationAlertBanner(), isKnownReason(), minutesSince(), ReasonKey, ReferralListProps, ToggleRow() (+14 more)

### Community 25 - "toast.ts"
Cohesion: 0.16
Nodes (17): Toaster(), TONE_ICON_COLORS, TONE_ICONS, TONE_STYLES, clearToasts(), DEFAULT_TTL_MS, describeError(), dismissToast() (+9 more)

### Community 26 - "Facility"
Cohesion: 0.11
Nodes (16): DirectAdmissionFormProps, mockFacility, DirectAdmissionModalProps, mockAddDirectAdmission, mockFacility, BedOccupancyHeatmapProps, AdminDirectActionsCardProps, PatientConsentCardProps (+8 more)

### Community 27 - "NetworkDirectoryPage.tsx"
Cohesion: 0.13
Nodes (16): FacilitySettingsPage, NetworkDirectoryPage, ROLE_CONFIGS, RoleBadge(), RoleBadgeProps, headerActionClass, ScreenHeader(), ScreenHeaderProps (+8 more)

### Community 28 - "attachments.ts"
Cohesion: 0.15
Nodes (12): AttachmentError, AttachmentErrorCode, AttachmentFile, ENCODINGS, extOf(), IMAGE_EXTENSIONS, IMAGE_TYPES, MAX_ATTACHMENTS (+4 more)

### Community 30 - "AppSidebar.tsx"
Cohesion: 0.16
Nodes (11): AppSidebar(), AppSidebarProps, FACILITY_TYPES, isFacilityType(), mockFacility, mockReferrals, mockUser, isAdmin() (+3 more)

### Community 31 - "HodCockpit.tsx"
Cohesion: 0.13
Nodes (31): Dashboard, ClinicianCockpit(), readReferralDraft(), HodCockpitProps, ManagerCockpit(), hhmm(), PriorityChip(), Rail() (+23 more)

### Community 32 - "Findings: Ismailia Health Connect facts, IDs and gotchas"
Cohesion: 0.12
Nodes (16): Accepted dependency advisories (audit S3, 3 Oct 2026), CI / deploy, Design system as built (DESIGN.md rewritten from the build on 29 Sep; read it first), Desktop workspace (phase 6), Domain rules worth remembering, Escalation e2e (`e2e/escalation.spec.ts`), Escort doctor: who names it (owner decision, 3 Oct 2026), Findings: Ismailia Health Connect facts, IDs and gotchas (+8 more)

### Community 33 - "PROJECT.md"
Cohesion: 0.17
Nodes (16): src/pages/AdmitPatientPage.tsx, src/components/layout/AppLayout.tsx, M1: App Shell, Navigation & Design System, App Shell, Navigation & Header Modernization (M1), Unified Bed & Capacity Console (M5), M5: Integrated Bed Management & Capacity Hub, src/pages/BedManagementPage.tsx, M3: Clinical Cockpits & Role Dashboards (+8 more)

### Community 35 - "DataContext.tsx"
Cohesion: 0.19
Nodes (13): DataContext, DataProvider(), OFFLINE_SYNC_STALL_TIMEOUT_MS, writeFailed(), splitAttachments(), deleteOfflineReferral(), getOfflineReferrals(), saveOfflineReferral() (+5 more)

### Community 37 - "DataContext.listeners.test.tsx"
Cohesion: 0.11
Nodes (23): mockFacilities, mockReferrals, ref(), Consumer(), NOTIFICATION_BATCH_SIZE, NOTIFICATIONS_LIMIT, SHIFT_LOGS_LIMIT, makeDirectAdmission() (+15 more)

### Community 40 - "AuthContext.test.tsx"
Cohesion: 0.14
Nodes (10): AuthConsumer(), clearOfflineReferralsMock, createUserWithEmailAndPasswordMock, mockAuth, sendEmailVerificationMock, setDocMock, signInWithEmailAndPasswordMock, signInWithPopupMock (+2 more)

### Community 42 - "ErrorBoundary.tsx"
Cohesion: 0.29
Nodes (4): ErrorBoundary, pageLang(), Props, State

### Community 43 - "Milestone4.empirical-adversarial.test.tsx"
Cohesion: 0.12
Nodes (14): LegacyReferral, mockAddDeptComment, mockCancelReferral, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockRecordPatientConsent, mockRecordPatientDecline (+6 more)

### Community 44 - "tier5-ui.adversarial.test.tsx"
Cohesion: 0.09
Nodes (20): RejectionModal(), RejectionModalProps, ECGViewerOverlay(), ECGViewerOverlayProps, loadMotionFeatures(), ConfirmDialog(), ConfirmDialogProps, useDialogA11y() (+12 more)

### Community 48 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, bench, build, clean, dev, i18n:sheet, lint, mutate (+7 more)

### Community 49 - "Card.tsx"
Cohesion: 0.56
Nodes (4): Card, CardContent, CardHeader, CardTitle

### Community 51 - "AuthContext.tsx"
Cohesion: 0.20
Nodes (13): mockAuthState, AuthContext, AuthContextType, AuthProvider(), isMobileDevice(), resolveEmailVerified(), clearOfflineReferrals(), DIRECTORY_COLLECTION (+5 more)

### Community 53 - "App.tsx"
Cohesion: 0.13
Nodes (19): RFC-4180, AdmitPatientPage, App(), ArchivePage, BedManagementPage, DepartmentPage, NewReferralPage, Onboarding (+11 more)

### Community 54 - "benchmarks.ts"
Cohesion: 0.35
Nodes (9): bench(), benchmarkPermissionChecks(), benchmarkReferralLookup(), BenchmarkResult, generateMockFacilities(), generateMockReferrals(), generateMockUsers(), printResults() (+1 more)

### Community 55 - "firebase.ts"
Cohesion: 0.12
Nodes (14): StagingRibbon(), app, auth, devFlag, EMULATOR_FIREBASE_CONFIG, firebaseConfig, firebaseTarget, getEnv() (+6 more)

### Community 59 - "AppLayout.test.tsx"
Cohesion: 0.13
Nodes (10): addShiftLogMock, logoutMock, markAllNotificationsReadMock, markNotificationReadMock, mockDirectAdmissions, mockFacilities, mockNotifications, mockReferrals (+2 more)

### Community 60 - "Workspace.tsx"
Cohesion: 0.20
Nodes (8): CasePane(), CaseWorkspace(), useWorkspace(), WORKSPACE_QUERY, WorkspaceContext, WorkspaceProvider(), WorkspaceValue, useMediaQuery()

### Community 61 - "Task Plan: Ismailia Health Connect to a launch-ready pilot"
Cohesion: 0.13
Nodes (14): Arabic and right-to-left (owner decisions 30 Sep), Current Phase, Decisions (owner, answered 27 Sep), Finish review of the remaining screens (29 Sep, all fixed on PR #40), Goal, Next Step, Phase 1: Hardening and first deploy (NEXT_STEPS_PROMPT.md phases 0–1), Phase 2: Security and repo setup (PRs, 26–27 Sep) (+6 more)

### Community 62 - "FacilityAnalyticsCharts.tsx"
Cohesion: 0.15
Nodes (11): ChartBlock(), FLOW_KEYS, PALETTE, Period, PERIODS, Row, Series, SeriesKey (+3 more)

### Community 63 - "ReferralDetailHeader.tsx"
Cohesion: 0.13
Nodes (16): BannerTint, ReferralDetailHeader(), ReferralDetailHeaderProps, ReferralUtilityBar(), ReferralUtilityBarProps, STAGE_KEYS, StageRail(), RoleBanner() (+8 more)

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
Cohesion: 0.32
Nodes (11): ARABIC_NAME_REGEX, DecodedNationalId, decodeNationalId(), decodeNationalIdToPatient(), HOSPITAL_ID_REGEX, isValidArabicName(), isValidHospitalId(), isValidNationalId() (+3 more)

### Community 68 - "BedManagementPage.test.tsx"
Cohesion: 0.15
Nodes (12): mockAddDirectAdmission, mockDirectAdmission, mockDirectAdmissions, mockDischargeDirectAdmission, mockFacilities, mockFacilitiesById, mockFacility, mockReferral (+4 more)

### Community 69 - "DataContext.escalation.test.tsx"
Cohesion: 0.18
Nodes (5): capturedUpdates, Consumer(), mockFacilitiesList, mockUsersList, referralsStore

### Community 70 - "useAudioAlert"
Cohesion: 0.25
Nodes (6): TestComp(), MockAudio, play, TestComp(), useAudioAlert(), ALERT_SOUND_URL

### Community 71 - "Product"
Cohesion: 0.18
Nodes (10): Accessibility & Inclusion, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product, Product Principles (+2 more)

### Community 72 - "i18n-sheet.ts"
Cohesion: 0.24
Nodes (8): arabic, ARABIC_FORMS, isPlural(), Plural, rows, Tree, walk(), en

### Community 73 - "devDependencies"
Cohesion: 0.22
Nodes (9): autoprefixer, devDependencies, autoprefixer, tsx, @types/uuid, typescript, tsx, @types/uuid (+1 more)

### Community 74 - "package.json"
Cohesion: 0.25
Nodes (7): name, overrides, fast-uri, qs, private, type, version

### Community 75 - "detail/EscalationAlertBanner.tsx"
Cohesion: 0.47
Nodes (5): ageOf(), EscalationAlertBanner(), EscalationAlertBannerProps, EscalationKey, formatDayMonthClock()

### Community 76 - "i18n.test.tsx"
Cohesion: 0.22
Nodes (7): ar, isPlural(), leaves(), Node, Probe(), formatNumber(), Messages

### Community 77 - "escalation.spec.ts"
Cohesion: 0.29
Nodes (8): ADMIN, adminPatch(), Fields, findReferralByPatient(), getReferral(), setIcu(), val(), waitForReferral()

### Community 78 - "appVersion.ts"
Cohesion: 0.31
Nodes (6): AppRoutes(), CHECK_INTERVAL_MS, checkForNewRelease(), isStale(), __resetForTests(), watchForNewRelease()

### Community 79 - "Pilot plan (draft)"
Cohesion: 0.22
Nodes (8): Accounts (real, non-admin, one person per account), After the pilot, Before day one, During the pilot, Exit and rollback, Pilot plan (draft), Scope, Success criteria (proposal)

### Community 80 - "ReferralActionConsole.tsx"
Cohesion: 0.20
Nodes (13): AdminDirectActionsCard(), CancellationDialog(), CancellationDialogProps, EscortAssignmentForm(), EscortAssignmentFormProps, PatientConsentCard(), ReferralActionConsole(), Button (+5 more)

### Community 81 - "ArrivedTransfersQueue.tsx"
Cohesion: 0.28
Nodes (4): ArrivedTransfersQueueProps, mockArrivedReferrals, Badge, BadgeProps

### Community 82 - "BedCapacityGrid.tsx"
Cohesion: 0.28
Nodes (5): BedCapacityCard(), BedCapacityCardProps, BED_TYPES, BedCapacityGridProps, mockFacility

### Community 83 - "AppLayout.tsx"
Cohesion: 0.42
Nodes (6): AppLayout(), SHIFT_HOURS, ShiftType, shiftSummaryVars(), isAlertMuted(), setAlertMuted()

### Community 84 - "directory.ts"
Cohesion: 0.44
Nodes (6): DIRECTORY_FIELDS, directoryEntryFor(), mergeRoster(), planDirectoryChanges(), sameEntry(), userFromEntry()

### Community 85 - "Changing Firestore rules in eha-transfer"
Cohesion: 0.25
Nodes (7): 1. Map the blast radius before editing, 2. Write the tests first, 3. Change the rules, 4. Audit, 5. Plan the deploy order, 6. Don't, Changing Firestore rules in eha-transfer

### Community 86 - "TransferJourneyCard.tsx"
Cohesion: 0.36
Nodes (4): enteredAt(), hhmm(), base, TransferJourneyCard()

### Community 87 - "PERFORMANCE.md"
Cohesion: 0.33
Nodes (5): src/lib/benchmarks.ts, Memoized O(1) Lookup Maps Optimization, NetworkDirectoryPage Pagination, src/pages/ReferralDetailPage.tsx, Referral Detail & Clinical Timeline Console (M4)

### Community 88 - "ReferralTimeline.tsx"
Cohesion: 0.32
Nodes (7): DEPT_EVENTS, isDeptEvent(), ReferralTimeline(), STATUS_DOT, TimelineEvent, whenShort(), Language

### Community 89 - "NewReferralPage.tsx"
Cohesion: 0.13
Nodes (22): DraftReferralCard(), stillMissing(), StepDestinationPriorityProps, BED_TYPES, DRAFT_STORAGE_KEY, MAX_ATTACHMENT_SIZE_BYTES, WIZARD_STEPS, WizardDraft (+14 more)

### Community 90 - "README.md"
Cohesion: 0.22
Nodes (8): Deployment Guide (docs/DEPLOYMENT.md), F10: sevensn Branch Doc/Automation Mismatch (corrected), er-app-final Repository (Unrelated Firebase Project), F10: sevensn Branch Mismatch (Security Assessment Finding), One-Repo-One-Firebase-Project Binding, imc-er Repository (Unrelated Firebase Project), Repository-to-Firebase-Project Binding (1:1, no shared backend), npm Scripts & CI Test Pipeline

### Community 91 - "DashboardCockpits.adversarial.test.tsx"
Cohesion: 0.09
Nodes (22): ERDashboard, mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockQuickTransfer (+14 more)

### Community 92 - "format.ts"
Cohesion: 0.39
Nodes (6): DraftRestoreBanner(), DraftRestoreBannerProps, formatClock(), formatDayMonth(), Lang, locale()

### Community 93 - "backfill-created-at-ms.mjs"
Cohesion: 0.33
Nodes (6): APPLY, backfill(), headers, listAll(), results, token

### Community 94 - "migrate-status-history.mjs"
Cohesion: 0.29
Nodes (4): args, db, isDryRun, projectId

### Community 95 - "useStatusHistory.ts"
Cohesion: 0.33
Nodes (5): ParentPartyFields, mockUser, unsubscribeMock, useStatusHistory(), db

### Community 96 - "AdmitPatientPage.test.tsx"
Cohesion: 0.33
Nodes (5): mockAddDirectAdmission, mockDirectAdmission, mockDischargeDirectAdmission, mockFacility, mockUser

### Community 97 - "rbac-rules-reviewer.md"
Cohesion: 0.40
Nodes (4): Access model, Checklist, How to review, Output

### Community 98 - "ThemeContext.tsx"
Cohesion: 0.24
Nodes (8): initialState, Consumer(), Theme, ThemeContext, ThemeProvider(), ThemeProviderProps, ThemeProviderState, useTheme()

### Community 99 - "ActiveInpatientCensus.tsx"
Cohesion: 0.60
Nodes (3): ActiveInpatientCensusProps, mockAdmissions, DirectAdmission

### Community 104 - "verify-csp-headers.mjs"
Cohesion: 0.67
Nodes (3): directive(), main(), REQUIRED

### Community 105 - "server.cjs"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 106 - "server.js"
Cohesion: 0.50
Nodes (3): fs, http, server

### Community 107 - "ReferralSummarySheet.tsx"
Cohesion: 0.36
Nodes (7): FOOTER_TONE_CLASSES, FooterTone, isAbnormal(), ReferralSummarySheet(), SheetAction, show(), VitalCell()

### Community 120 - "escortAuthority.ts"
Cohesion: 0.31
Nodes (6): escortAuthority, DELEGATABLE_ON_CALL_ROLES, isNotificationRecipient(), NotificationRecipientCandidate, NotificationTargetParams, RecipientShiftAssignment

### Community 134 - "StepDestinationPriority.tsx"
Cohesion: 0.17
Nodes (25): ChoicePill(), fieldBad, FieldError(), FieldHint(), FieldLabel(), fieldOk, inputClass(), StepHeading() (+17 more)

### Community 157 - "TEST_READY.md"
Cohesion: 0.18
Nodes (10): R4: Automated Test Suite Execution & Expansion, R3: Edge Case & Exception Pathways, R1: Multi-Party Persona Lifecycle Simulation, Multi-Role Healthcare Persona Simulation Request, R2: Role Boundary & Security Enforcement, UX & Structural Redesign Request (2026-08-28), UX & Structural Redesign Request, e2e/exceptions-edge-cases.spec.ts (+2 more)

### Community 211 - "StepVitals.tsx"
Cohesion: 0.14
Nodes (13): fieldBase, parseVital(), StepVitals(), VitalKey, VITALS, evaluateVital(), LOW_VITAL_CODES, VitalCode (+5 more)

### Community 215 - "index.tsx"
Cohesion: 0.12
Nodes (18): ARABIC_AVAILABLE, CATALOGUE, deviceLanguages(), FALLBACK, I18nContext, I18nProvider(), I18nValue, isLanguage() (+10 more)

### Community 217 - "seed.ts"
Cohesion: 0.50
Nodes (5): globalSetup(), waitFor(), E2E_USER, markEmailVerified(), seed()

## Knowledge Gaps
- **622 isolated node(s):** `firestore-emulator-only.sh script`, `guard-edits.sh script`, `rules-reminder.sh script`, `stop-typecheck.sh script`, `npx` (+617 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useI18n()` connect `useI18n` to `edge-cases-exceptions.test.ts`, `ReferralDetailPage.tsx`, `StepDestinationPriority.tsx`, `Login.tsx`, `AdminDashboard.tsx`, `PatientCard.tsx`, `DashboardCockpits.test.tsx`, `cn`, `NetworkDirectoryPage.tsx`, `AppSidebar.tsx`, `HodCockpit.tsx`, `tier5-ui.adversarial.test.tsx`, `Card.tsx`, `App.tsx`, `firebase.ts`, `FacilityAnalyticsCharts.tsx`, `ReferralDetailHeader.tsx`, `detail/EscalationAlertBanner.tsx`, `i18n.test.tsx`, `ReferralActionConsole.tsx`, `ArrivedTransfersQueue.tsx`, `BedCapacityGrid.tsx`, `AppLayout.tsx`, `StepVitals.tsx`, `TransferJourneyCard.tsx`, `index.tsx`, `ReferralTimeline.tsx`, `NewReferralPage.tsx`, `DashboardCockpits.adversarial.test.tsx`, `format.ts`, `ActiveInpatientCensus.tsx`, `ReferralSummarySheet.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `Referral` connect `Referral` to `edge-cases-exceptions.test.ts`, `Milestone5.empirical-adversarial.test.tsx`, `ReferralDetailPage.tsx`, `types/index.ts`, `AdminDashboard.tsx`, `DashboardCockpits.test.tsx`, `escalationSweep.ts`, `cn`, `Facility`, `attachments.ts`, `ReferralDetailPage.adversarial.test.tsx`, `AppSidebar.tsx`, `HodCockpit.tsx`, `DataContext.tsx`, `DataContext.listeners.test.tsx`, `Milestone4.empirical-adversarial.test.tsx`, `tier5-ui.adversarial.test.tsx`, `Card.tsx`, `benchmarks.ts`, `AppLayout.test.tsx`, `ReferralDetailHeader.tsx`, `m5-dom-integration.adversarial.test.tsx`, `BedManagementPage.test.tsx`, `DataContext.escalation.test.tsx`, `detail/EscalationAlertBanner.tsx`, `ReferralActionConsole.tsx`, `ArrivedTransfersQueue.tsx`, `TransferJourneyCard.tsx`, `index.tsx`, `ReferralTimeline.tsx`, `DashboardCockpits.adversarial.test.tsx`, `DataContext.cancel.test.tsx`, `ReferralSummarySheet.tsx`, `escortAuthority.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `C1: Unfiltered Referrals Listener` connect `NEXT_STEPS_PROMPT.md` to `DataContext.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `firestore-emulator-only.sh script`, `guard-edits.sh script`, `rules-reminder.sh script` to the rest of the system?**
  _622 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Progress Log` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Milestone5.empirical-adversarial.test.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._