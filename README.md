# Ismailia Health Connect (`eha-transfer`)

Inter-facility patient referral and transfer coordination: referral intake and triage,
ECG review, bed availability across the facility network, and the admission handoff at the
receiving end. Handles real patient PHI.

React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + React Router 7, on Firebase Auth and Cloud Firestore.

Live: https://eha-transfer.web.app · Staging: https://eha-transfer-staging.web.app · Firebase project: `eha-transfer-1785622025`

---

## Project Binding

This repository deploys to exactly one Firebase project, and that project is
deployed to by exactly one repository:

| Repository | Firebase project | Live site |
| --- | --- | --- |
| **`hassanabdelmenem/eha-transfer`** (this one) | **`eha-transfer-1785622025`** | <https://eha-transfer.web.app> |
| `hassanabdelmenem/imc-er-manager` | `imc-er-manager` | <https://imc-er-manager.web.app> |
| `hassanabdelmenem/er-app-final` | `er-icu` | <https://er-icu.web.app> |

The other two rows are here to make the boundary unambiguous: this project shares no backend,
database, collection, build tooling, or credentials with either of them, and nothing in
this repository references them.

`main` is the production branch. Deploys happen automatically in CI after all checks pass.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the release model, environment separation, and IAM roles.

---

## Technology Stack & Architecture

| Layer | Technology |
| --- | --- |
| **Frontend** | React 19.2 + TypeScript + Vite 8.2 + React Router 7.18 |
| **Styling** | Tailwind CSS 4.3 (RTL / Arabic first) |
| **Offline Sync** | IndexedDB (`idb`) client-side queue and cache for zero-data-loss referral drafts |
| **Backend & Auth** | Firebase Authentication + Cloud Firestore (`firestore.rules`) |
| **SLA Sweeper** | Scheduled TypeScript sweep script (`scripts/escalation-sweep.ts`) |
| **Validation Parity**| 14-digit Egyptian National ID parsing (century, DOB, governorate, sex) & Arabic name regex parity with IMC-ER |

---

## Running Locally

### Prerequisites
- Node.js 20+
- Java 21+ (required for Firestore security rules emulator tests)

```bash
npm install
cp .env.example .env      # fill in the VITE_FIREBASE_* values
npm run dev               # http://localhost:3000 (connected to staging project)
```

Set `VITE_USE_FIREBASE_EMULATORS=true` to run against the local Auth and
Firestore emulators (ports 9099 and 8080, configured in `firebase.json`)
instead of live staging.

---

## Verification & Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript typecheck (`tsc --noEmit`) |
| `npm test` | Run Vitest unit & integration test suites (1,075 tests) |
| `npm run test:rules` | Firestore security-rules emulator tests |
| `npm run test:e2e` | Playwright browser journeys against Auth + Firestore emulators |
| `npm run test:csp-headers` | Verify Content Security Policy against emulator |
| `npm run test:coverage` | Unit test execution with coverage reporting |
| `npm run mutate` | Stryker mutation testing |

Pre-push verification:
```bash
npm run lint && npx vitest run && npm run test:rules
```

---

## Documentation & Artifacts

- **Mission Control Hub:** https://claude.ai/artifact/KtYWpySizeSSx9V8RcnYDN
- **Launch Checklist:** https://claude.ai/artifact/77g7kAhHFpgEQcZkGfVS7M
- **Operational Playbook:** https://claude.ai/artifact/MUhShMSD6f5uzUVhADXcTW
- **Architecture & System Contracts:** `PROJECT.md`
- **Deployment & Security:** `docs/DEPLOYMENT.md`
- **Clinical Specifications:** `PRODUCT.md`
- **Design Tokens & System:** `DESIGN.md`

---

## Licence

Proprietary. Copyright (c) 2026 Hassan Abdelmenem. All Rights Reserved.
