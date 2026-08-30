# Graph Report - eha-transfer  (2026-08-30)

## Corpus Check
- 655 files · ~392,403 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 576 nodes · 1286 edges · 49 communities (17 shown, 32 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3b09574`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types/index.ts
- dependencies
- DataContext.tsx
- Referral
- Card.tsx
- StepDestinationPriority.tsx
- devDependencies
- Milestone5.empirical-adversarial.test.tsx
- Toaster.tsx
- seed.ts
- RoleHomeHeader.tsx
- StatusTimeline.tsx
- DashboardCockpits.adversarial.test.tsx
- dotenv
- esbuild
- fake-indexeddb
- firebase-admin
- @firebase/rules-unit-testing
- firebase-tools
- @google/genai
- jsdom
- playwright
- @playwright/test
- @stryker-mutator/core
- @stryker-mutator/vitest-runner
- tailwindcss
- @tailwindcss/vite
- @testing-library/dom
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- @types/node
- @types/react
- @types/react-dom
- vite
- @vitejs/plugin-react
- vitest
- @vitest/coverage-v8
- DepartmentPage.tsx
- DashboardCockpits.test.tsx
- tier5-ui.adversarial.test.tsx
- BedManagementPage.test.tsx
- AppLayout.adversarial.test.tsx
- dashboard/types.ts
- MockSpeechRecognition
- dashboard/EscalationAlertBanner.tsx
- RejectionModal.tsx
- MobileActionFooter.tsx

## God Nodes (most connected - your core abstractions)
1. `useData()` - 49 edges
2. `Referral` - 39 edges
3. `Facility` - 34 edges
4. `User` - 25 edges
5. `Card` - 25 edges
6. `BedType` - 23 edges
7. `CardContent` - 23 edges
8. `Button` - 21 edges
9. `CardHeader` - 20 edges
10. `CardTitle` - 20 edges

## Surprising Connections (you probably didn't know these)
- `DirectAdmissionModal()` --calls--> `useData()`  [EXTRACTED]
  src/components/beds/DirectAdmissionModal.tsx → src/contexts/DataContext.tsx
- `ClinicianCockpit()` --calls--> `useData()`  [EXTRACTED]
  src/components/dashboard/ClinicianCockpit.tsx → src/contexts/DataContext.tsx
- `ERCockpit()` --calls--> `useData()`  [EXTRACTED]
  src/components/dashboard/ERCockpit.tsx → src/contexts/DataContext.tsx
- `HodCockpit()` --calls--> `useData()`  [EXTRACTED]
  src/components/dashboard/HodCockpit.tsx → src/contexts/DataContext.tsx
- `NurseCockpit()` --calls--> `useData()`  [EXTRACTED]
  src/components/dashboard/NurseCockpit.tsx → src/contexts/DataContext.tsx

## Import Cycles
- None detected.

## Communities (49 total, 32 thin omitted)

### Community 0 - "types/index.ts"
Cohesion: 0.07
Nodes (38): AppLayout(), ALL_ROLES, mockFacility, mockReferrals, AppSidebar(), AppSidebarProps, mockFacility, mockReferrals (+30 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (47): clsx, date-fns, firebase, idb, lucide-react, motion, dependencies, clsx (+39 more)

### Community 2 - "DataContext.tsx"
Cohesion: 0.05
Nodes (45): ActiveInpatientCensus(), mockAdmissions, AdminCockpit(), ManagerCockpit(), CANCEL_LOCKED_STATUSES, DataContext, DataContextType, DataProvider() (+37 more)

### Community 3 - "Referral"
Cohesion: 0.06
Nodes (33): ArrivedTransfersQueue(), ArrivedTransfersQueueProps, mockArrivedReferrals, ESCALATION_DETAIL, ESCALATION_HEADLINE, EscalationAlertBannerProps, EscalationKey, BANNER_TINT_CLASSES (+25 more)

### Community 4 - "Card.tsx"
Cohesion: 0.07
Nodes (43): ActiveInpatientCensusProps, BED_TYPES, BedCapacityGridProps, ESCALATION_DESC, ESCALATION_LABEL, ESCALATION_PRIMARY, BED_TYPES, BedOccupancyHeatmap() (+35 more)

### Community 5 - "StepDestinationPriority.tsx"
Cohesion: 0.07
Nodes (34): DraftRestoreBanner(), DraftRestoreBannerProps, StepClinicalPresentation(), StepDestinationPriority(), StepDestinationPriorityProps, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, StepDiagnosticsReview() (+26 more)

### Community 6 - "devDependencies"
Cohesion: 0.22
Nodes (9): autoprefixer, devDependencies, autoprefixer, tsx, @types/uuid, typescript, tsx, @types/uuid (+1 more)

### Community 7 - "Milestone5.empirical-adversarial.test.tsx"
Cohesion: 0.07
Nodes (30): BedCapacityCard(), BedCapacityCardProps, BedCapacityGrid(), mockFacility, DirectAdmissionForm(), DirectAdmissionFormData, DirectAdmissionFormProps, mockFacility (+22 more)

### Community 8 - "Toaster.tsx"
Cohesion: 0.40
Nodes (3): TONE_ICON_COLORS, TONE_ICONS, TONE_STYLES

### Community 12 - "DashboardCockpits.adversarial.test.tsx"
Cohesion: 0.09
Nodes (20): ClinicianCockpit(), mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockQuickTransfer (+12 more)

### Community 40 - "DashboardCockpits.test.tsx"
Cohesion: 0.10
Nodes (20): mockAddDeptComment, mockAssignShift, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockOverrideReferralDestination, mockQuickTransfer, mockReferrals (+12 more)

### Community 41 - "tier5-ui.adversarial.test.tsx"
Cohesion: 0.12
Nodes (14): ECGViewerOverlay(), ECGViewerOverlayProps, mockAddDeptComment, mockAddReferral, mockCancelReferral, mockFacilities, mockOverrideReferralDestination, mockRecordPatientConsent (+6 more)

### Community 42 - "BedManagementPage.test.tsx"
Cohesion: 0.14
Nodes (13): BedManagementPage(), mockAddDirectAdmission, mockDirectAdmission, mockDirectAdmissions, mockDischargeDirectAdmission, mockFacilities, mockFacilitiesById, mockFacility (+5 more)

### Community 43 - "AppLayout.adversarial.test.tsx"
Cohesion: 0.15
Nodes (12): mockAddShiftLog, mockDirectAdmissions, mockFacilities, mockFacilitiesById, mockLogout, mockMarkAllNotificationsRead, mockMarkNotificationRead, mockNotifications (+4 more)

### Community 44 - "dashboard/types.ts"
Cohesion: 0.24
Nodes (8): DashboardStatGrid(), KPIGrid, ClinicianSegment, DashboardMetric, DashboardStatGridProps, FacilityAnalyticsChartsProps, ReferralCockpitCardProps, ShiftHandoverFeedProps

### Community 46 - "dashboard/EscalationAlertBanner.tsx"
Cohesion: 0.50
Nodes (3): ESCALATION_LABELS, EscalationAlertBanner(), EscalationAlertBannerProps

## Knowledge Gaps
- **263 isolated node(s):** `mockAdmissions`, `ActiveInpatientCensusProps`, `mockArrivedReferrals`, `ArrivedTransfersQueueProps`, `BedCapacityCardProps` (+258 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Referral` connect `Referral` to `types/index.ts`, `DataContext.tsx`, `Card.tsx`, `Milestone5.empirical-adversarial.test.tsx`, `DashboardCockpits.test.tsx`, `tier5-ui.adversarial.test.tsx`, `BedManagementPage.test.tsx`, `AppLayout.adversarial.test.tsx`, `DashboardCockpits.adversarial.test.tsx`, `dashboard/types.ts`, `dashboard/EscalationAlertBanner.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Facility` connect `Milestone5.empirical-adversarial.test.tsx` to `types/index.ts`, `DataContext.tsx`, `Referral`, `Card.tsx`, `StepDestinationPriority.tsx`, `DashboardCockpits.test.tsx`, `tier5-ui.adversarial.test.tsx`, `BedManagementPage.test.tsx`, `AppLayout.adversarial.test.tsx`, `DashboardCockpits.adversarial.test.tsx`, `dashboard/types.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `useData()` connect `DataContext.tsx` to `types/index.ts`, `Card.tsx`, `Milestone5.empirical-adversarial.test.tsx`, `DashboardCockpits.test.tsx`, `BedManagementPage.test.tsx`, `DashboardCockpits.adversarial.test.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `mockAdmissions`, `ActiveInpatientCensusProps`, `mockArrivedReferrals` to the rest of the system?**
  _263 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07337662337662337 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `DataContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05310734463276836 - nodes in this community are weakly interconnected._