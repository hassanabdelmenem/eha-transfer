# Deployment & environment

How code gets from a laptop to <https://eha-transfer.web.app>.

## The pipeline

```
local commit  →  push branch  →  CI (every branch)  →  PR  →  preview channel
                                                       ↓
                                              merge to sevensn
                                                       ↓
                                       CI passes → Deploy to Firebase
                                       (rules + indexes, then hosting)
```

| Workflow | File | Trigger | Does |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | every branch push, every PR | typecheck, unit tests, **security-rules tests**, Playwright E2E, coverage |
| PR Preview | `.github/workflows/firebase-preview.yml` | PR opened/updated | builds and publishes a 7-day preview channel, comments the URL on the PR |
| Deploy | `.github/workflows/firebase-deploy.yml` | CI succeeding on `sevensn` | deploys Firestore rules + indexes, then Hosting |

Deploy is chained to CI via `workflow_run`, so a red test suite cannot reach
production. It checks out `workflow_run.head_sha` — the exact commit CI
validated, not whatever `sevensn` points at by the time it runs.

## One-time setup

### 1. Create the deploy service account

In the [Google Cloud console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=eha-transfer-1785622025):

1. Create a service account, e.g. `github-deployer`.
2. Grant these roles:
   - **Firebase Hosting Admin** — deploy the site and preview channels
   - **Cloud Datastore Owner** — deploy Firestore rules and indexes
   - **Firebase Authentication Viewer** — required by the hosting deploy action
   - **Service Account User**
3. Create a **JSON key** and download it.

### 2. Add it to GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

- **Name:** `FIREBASE_SERVICE_ACCOUNT`
- **Value:** the entire contents of the JSON key file

Nothing else is needed — the workflows read only this one secret. Treat the key
as a production credential: it can rewrite security rules. Rotate it if it is
ever pasted anywhere else, and prefer Workload Identity Federation if you later
want to remove the long-lived key entirely.

### 3. Authorize preview domains for Google sign-in

Firebase Auth only accepts sign-in from allow-listed domains. Preview channels
are served from `eha-transfer--<channel>-<hash>.web.app`, so Google login will
fail on a preview until that domain is added under
**Firebase Console → Authentication → Settings → Authorized domains**.
Adding `eha-transfer.web.app` does *not* cover preview subdomains.

Email/password sign-in works on previews without this.

## Local development

```bash
npm install
npm run dev
```

The dev server talks to the **production** Firebase project. There is no staging
project, so treat local work as live: don't test destructive changes against
real patient data. The same applies to PR preview builds.

### Before pushing

```bash
npm run lint        # tsc --noEmit
npm run test        # unit + component
npm run test:rules  # security rules, against the Firestore emulator (needs Java)
```

`npm run test:rules` boots `firebase emulators:exec` automatically; you do not
need to start anything yourself.

## Firestore rules

`firestore.rules` is the **only** server-side authorization layer — the browser
talks directly to Firestore, so anything the rules allow is reachable by anyone
who can complete the public sign-up form.

Two things are coupled and must change together:

1. the `list` rules in `firestore.rules`, and
2. the query shapes in `src/contexts/DataContext.tsx`.

Firestore evaluates a list operation against the **query**, not the returned
documents, so a rule that reads `resource.data` can only be satisfied by a query
filtered on that same field. An unfiltered `onSnapshot(collection(...))` against
such a rule is rejected outright — and a rejected listener is killed permanently
with no retry, so the UI silently stops updating for the rest of the session.
`tests/firestore.rules.test.ts` covers both directions.

### Known limitation: client-side notification fan-out

`createNotification` runs in the browser and needs to find recipients at *other*
facilities, so `/users` must stay listable network-wide by verified staff. That
is why the roster is not facility-scoped. Moving fan-out into a Cloud Function
(requires Blaze billing) would let `/users` be narrowed to one facility and is
the recommended next hardening step.

## Manual deploy (escape hatch)

Prefer the pipeline. If you must deploy by hand:

```bash
npm run build
firebase deploy --only firestore --project eha-transfer-1785622025
firebase deploy --only hosting --project eha-transfer-1785622025
```

Order matters, and which order depends on the change:

- **Rules grant something the new bundle needs** (the common case): deploy rules
  first, or the new bundle hits permission-denied until they land. This is what
  the automated workflow does.
- **Rules take something away** (tightening): deploy hosting first. The new
  bundle is written to satisfy the stricter rules and still works under the old
  permissive ones, so there is no window where live clients are broken.

## Project facts

| | |
|---|---|
| Firebase project | `eha-transfer-1785622025` |
| Hosting site | `eha-transfer` → <https://eha-transfer.web.app> |
| Firestore database | `(default)` — the only one; there is no `default` |
| Default git branch | `sevensn` |
| Node version | 24 (pinned in CI) |

> The `firestore` block in `firebase.json` previously targeted a database named
> `"default"`, which does not exist — only `"(default)"` does. Rules deploys
> silently had no valid target. If you ever see rules changes "not taking
> effect", check this first.
