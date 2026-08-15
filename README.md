# Ismailia Health Connect (`eha-transfer`)

Inter-facility patient referral and transfer coordination: referral intake and
triage, ECG review, bed availability across the facility network, and the
admission handoff at the receiving end.

React 19 + TypeScript + Vite, on Firebase Auth and Cloud Firestore.

## Project binding

This repository deploys to exactly one Firebase project, and that project is
deployed to by exactly one repository:

| Repository | Firebase project | Live site |
| --- | --- | --- |
| **`hassanabdelmenem/eha-transfer`** (this one) | **`eha-transfer-1785622025`** | <https://eha-transfer.web.app> |
| `hassanabdelmenem/imc-er` | `imc-er-manager` | <https://imc-er-manager.web.app> |
| `hassanabdelmenem/er-app-final` | `er-icu` | <https://er-icu.web.app> |

The other two rows are here to make the boundary unambiguous, not because
anything in this repo reaches them. This project shares no backend, database,
collection, build tooling, or credentials with either of them, and nothing in
this repository references them.

**`main` is the production branch.** (This corrects a stale reference to a
`sevensn` branch that a prior version of this doc named as canonical but that
does not exist in this repository — every CI/CD workflow has always gated on
`main`; see the security assessment's F10 for how the mismatch was found.)
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the release model, the deploy
identity and its IAM roles, and why the console is never the source of truth.

## Running locally

Prerequisites: Node.js.

```bash
npm install
cp .env.example .env      # fill in the VITE_FIREBASE_* values
npm run dev               # http://localhost:3000
```

Set `VITE_USE_FIREBASE_EMULATORS=true` to run against the local Auth and
Firestore emulators (ports 9099 and 8080, configured in `firebase.json`)
instead of the live project.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the built output |
| `npm run lint` | `tsc --noEmit` typecheck |
| `npm test` | Vitest unit tests |
| `npm run test:rules` | Firestore security-rules tests against the emulator |
| `npm run test:e2e` | Playwright E2E against Auth + Firestore emulators |
| `npm run test:coverage` | unit tests with coverage |
| `npm run mutate` | Stryker mutation testing |

CI runs typecheck, unit tests, rules tests, and E2E on every branch and pull
request; deploys are gated on it passing.
