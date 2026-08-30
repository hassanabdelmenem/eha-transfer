# Graph Report - eha-transfer  (2026-08-30)

## Corpus Check
- 655 files · ~392,403 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 240 nodes · 393 edges · 40 communities (11 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e875741`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- dependencies
- useData
- scripts
- Onboarding.tsx
- ReferralList.tsx
- devDependencies
- ReferralSummarySheet.tsx
- Toaster.tsx
- seed.ts
- RoleHomeHeader.tsx
- StatusTimeline.tsx
- VoiceTextarea.tsx
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

## God Nodes (most connected - your core abstractions)
1. `useData()` - 33 edges
2. `scripts` - 13 edges
3. `DataContextType` - 9 edges
4. `BedType` - 9 edges
5. `Button` - 8 edges
6. `Card` - 8 edges
7. `Facility` - 8 edges
8. `Referral` - 8 edges
9. `CardContent` - 6 edges
10. `User` - 6 edges

## Surprising Connections (you probably didn't know these)
- `FacilitySettingsPage()` --calls--> `useData()`  [EXTRACTED]
  src/pages/FacilitySettingsPage.tsx → src/contexts/DataContext.tsx
- `ReferralsPage()` --calls--> `useData()`  [EXTRACTED]
  src/pages/ReferralsPage.tsx → src/contexts/DataContext.tsx
- `BedOccupancyHeatmapProps` --references--> `Facility`  [EXTRACTED]
  src/components/dashboard/BedOccupancyHeatmap.tsx → src/types/index.ts
- `AppLayout()` --calls--> `useData()`  [EXTRACTED]
  src/components/layout/AppLayout.tsx → src/contexts/DataContext.tsx
- `ReferralList()` --calls--> `useData()`  [EXTRACTED]
  src/components/referrals/ReferralList.tsx → src/contexts/DataContext.tsx

## Import Cycles
- None detected.

## Communities (40 total, 29 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.09
Nodes (38): BED_TYPES, BedOccupancyHeatmapProps, ECGViewerOverlay(), ECGViewerOverlayProps, PrintableSummary, PrintableSummaryProps, vital(), CANCEL_LOCKED_STATUSES (+30 more)

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (27): clsx, date-fns, firebase, idb, lucide-react, motion, dependencies, clsx (+19 more)

### Community 2 - "useData"
Cohesion: 0.11
Nodes (19): useData(), AdminDashboard(), ESCALATION_DESC, ESCALATION_LABEL, ESCALATION_PRIMARY, AdmitPatientPage(), ArchivePage(), BedManagementPage() (+11 more)

### Community 3 - "scripts"
Cohesion: 0.10
Nodes (20): name, overrides, qs, react-router, private, scripts, build, clean (+12 more)

### Community 4 - "Onboarding.tsx"
Cohesion: 0.22
Nodes (10): Button, ButtonProps, Card, CardContent, CardFooter, CardHeader, CardTitle, Input (+2 more)

### Community 5 - "ReferralList.tsx"
Cohesion: 0.23
Nodes (8): AppLayout(), ReferralList(), ReferralListProps, Badge, BadgeProps, Dashboard(), isDoctorRole(), isNurseRole()

### Community 6 - "devDependencies"
Cohesion: 0.22
Nodes (9): autoprefixer, devDependencies, autoprefixer, tsx, @types/uuid, typescript, tsx, @types/uuid (+1 more)

### Community 7 - "ReferralSummarySheet.tsx"
Cohesion: 0.60
Nodes (3): isAbnormal(), ReferralSummarySheet(), show()

### Community 8 - "Toaster.tsx"
Cohesion: 0.40
Nodes (3): TONE_ICON_COLORS, TONE_ICONS, TONE_STYLES

## Knowledge Gaps
- **88 isolated node(s):** `E2E_USER`, `E2E_USERS`, `name`, `private`, `version` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`, `dotenv`, `esbuild`, `fake-indexeddb`, `firebase-admin`, `@firebase/rules-unit-testing`, `firebase-tools`, `@google/genai`, `jsdom`, `playwright`, `@playwright/test`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `tailwindcss`, `@tailwindcss/vite`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@types/node`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, `vitest`, `@vitest/coverage-v8`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `useData()` connect `useData` to `index.ts`, `Onboarding.tsx`, `ReferralList.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `E2E_USER`, `E2E_USERS`, `name` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08788159111933395 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `useData` be split into smaller, more focused modules?**
  _Cohesion score 0.1076923076923077 - nodes in this community are weakly interconnected._