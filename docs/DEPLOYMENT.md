# Deployment & environment

How code gets from a laptop to <https://eha-transfer.web.app>.

## Source of truth

**GitHub is authoritative, and `sevensn` is the branch that matters.** What is on
`origin/sevensn` is what production runs. Nothing else is canonical — not a
local branch, not the Firebase console, not a manual deploy.

Practical consequences:

- Never edit rules, indexes, or hosting config in the Firebase console. The next
  deploy overwrites console changes without warning, because the pipeline treats
  the repo as the desired state.
- Always `git pull` before starting work. If your local `sevensn` has diverged
  from `origin/sevensn`, origin wins.
- Work on a branch, open a PR, let CI and the preview channel run, then merge.
  Direct pushes to `sevensn` work but skip the preview.

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

## Setup status — already done

Nothing is required to make the pipeline run. For reference, this is what exists:

**Deploy identity:** `github-deployer@eha-transfer-1785622025.iam.gserviceaccount.com`,
holding exactly the roles the pipeline needs and nothing more:

| Role | Why |
|---|---|
| `roles/firebasehosting.admin` | deploy the site and preview channels |
| `roles/firebaseauth.admin` | lets the deploy action auto-authorize preview domains for Google sign-in |
| `roles/firebaserules.admin` | deploy `firestore.rules` |
| `roles/datastore.indexAdmin` | deploy `firestore.indexes.json` |
| `roles/serviceusage.serviceUsageConsumer` | API enablement checks during deploy |
| `roles/firebase.viewer` | read project metadata |

Note it has **no** read or write access to Firestore *data* — it can change the
rules but cannot read a single patient record.

**Credential:** a JSON key for that account is stored as the repository secret
`FIREBASE_SERVICE_ACCOUNT`. It is the only secret the workflows read.

### Rotating the key

Treat it as a production credential — it can rewrite security rules. To rotate:

```bash
SA=github-deployer@eha-transfer-1785622025.iam.gserviceaccount.com
gcloud iam service-accounts keys create /tmp/sa.json --iam-account="$SA"
gh secret set FIREBASE_SERVICE_ACCOUNT --repo hassanabdelmenem/eha-transfer < /tmp/sa.json
rm -P /tmp/sa.json
gcloud iam service-accounts keys list --iam-account="$SA"   # delete the old key id
```

To remove long-lived key material entirely, migrate to Workload Identity
Federation — the workflows would then use `google-github-actions/auth` with an
OIDC provider instead of the secret.

### Preview domains and Google sign-in

Firebase Auth only accepts sign-in from allow-listed domains, and preview
channels are served from `eha-transfer--<channel>-<hash>.web.app`. Because the
deploy identity holds `roles/firebaseauth.admin`, the hosting action adds each
preview domain to the authorized list automatically. If Google sign-in ever
fails on a preview, check that role first, then
**Firebase Console → Authentication → Settings → Authorized domains**.

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
| Web app | `eha-transfer-web`, `1:467744756760:web:6fd2817e76a941e6e49f6d` — the only one |
| Firestore database | `(default)` — the only one; there is no `default` |
| Default git branch | `sevensn` — the source of truth |
| Node version | 24 (pinned in CI) |

The project used to contain a second, unused web app (`eha-transfer`,
`1:467744756760:web:39f39c...`). It was never referenced by any code and has
been deleted. Firebase keeps deleted apps recoverable for 30 days.

`authDomain` in `src/lib/firebase.ts` is deliberately `eha-transfer.web.app`
rather than the canonical `eha-transfer-1785622025.firebaseapp.com` — matching
the hosting domain is what fixed mobile Google sign-in. Don't "correct" it.

### Firebase Web config lives in the repo, not in CI

`src/lib/firebase.ts` carries the production Web config as committed defaults.
Those values are public client identifiers, not credentials — they ship to every
browser that loads the app, and `firestore.rules` plus the Auth authorized-domain
list are what actually enforce access. The `VITE_FIREBASE_*` variables still
override any field, for emulator runs or a different project.

> Between 04 Aug and 09 Aug the config was env-only and no workflow passed
> `VITE_FIREBASE_*` to `npm run build`. Deploys went green, but the bundle threw
> `Missing required Firebase env vars` at module scope before React could mount,
> so the live site was a blank page. If you move these back behind env vars, add
> them to **both** `firebase-deploy.yml` and `firebase-preview.yml` — a green
> deploy does not prove the bundle boots.

> The `firestore` block in `firebase.json` previously targeted a database named
> `"default"`, which does not exist — only `"(default)"` does. Rules deploys
> silently had no valid target. If you ever see rules changes "not taking
> effect", check this first.
