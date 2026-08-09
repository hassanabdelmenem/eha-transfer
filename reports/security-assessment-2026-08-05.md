# Security Assessment — Ismailia Health Connect (eha-transfer)

**Date:** 2026-08-05
**Scope:** Local repository at `.claude/worktrees/security-assessment-60ee3e`, commit `e1788f0` (branch `claude/security-assessment-60ee3e`, forked from `sevensn`). All application source, `firestore.rules`, `firebase.json`, GitHub Actions workflows, test suites, and the dependency lockfile.
**Method:** **Static / source-available review only.** No traffic was sent to `eha-transfer.web.app`, the Firebase project `eha-transfer-1785622025`, or any other live host. No authentication was attempted, no Firestore documents were read or written, and no live rules were probed. `npm audit` ran locally against the committed lockfile (no network egress to the app). Everything below is derived from reading code and from public vendor/advisory documentation, cited inline.

---

## 1. What this project actually is

This is a **live, production inter-hospital patient transfer system** for a network of hospitals in Ismailia, Egypt. Clinicians at a referring facility create a referral containing a full clinical record — patient name, national ID, hospital ID, age, gender, blood type, allergies, chronic conditions, vital signs, complaint, diagnosis, medications, and clinical notes ([src/types/index.ts:69](src/types/index.ts:69)) — and route it to a receiving facility, which accepts, admits, or rejects it. The system also holds direct-admission records with identified patient names ([src/contexts/DataContext.tsx:17](src/contexts/DataContext.tsx:17)) and shift-handover logs that quote patient names ([firestore.rules:189](firestore.rules:189)).

This is **PHI at real scale, in production**. `docs/DEPLOYMENT.md:96` states plainly: *"The dev server talks to the production Firebase project. There is no staging project, so treat local work as live: don't test destructive changes against real patient data."*

Architecturally there is **no backend**. The React SPA talks directly to Firestore from the browser. That makes `firestore.rules` the sole server-side authorization layer — a fact the repo itself calls out at [firestore.rules:3](firestore.rules:3) and [docs/DEPLOYMENT.md:113](docs/DEPLOYMENT.md:113). Every client-side role check in `src/pages/*` is UX, not security. Anyone who can complete the public sign-up form at [src/pages/Login.tsx:82](src/pages/Login.tsx:82) can then bypass the SPA entirely and speak Firestore's REST/gRPC API directly with their own token; only the rules stand in the way.

This framing raises the weight of everything in section 4: rule gaps here are not theoretical, they are direct paths to patient data in a live healthcare system.

## 2. Scope, methodology, and limitations

Six passes were run: attack-surface mapping, auth/authz tracing, secrets and data-exposure audit, dangerous-sink sweep, dependency/CVE audit, and config/CI review. Findings were then synthesized through OWASP Top 10:2025, STRIDE per trust boundary, and an attacker narrative.

Limitations to be explicit about:

- **`npm audit` succeeded** — no substitution needed. Results in section 7 come from the real lockfile.
- **Firestore rule behavior was reasoned about, not executed.** The repo has an emulator-backed rules test suite (`npm run test:rules`), which requires a JVM; I did not boot the emulator. Where I claim a rule permits something, I cite the rule text and note whether the existing suite covers it.
- **Console-only settings are invisible from source.** Whether App Check is enforced server-side, whether email-enumeration protection is on, whether the owner account has MFA, whether the repo is public — none of these are in the repo. They are in section 11 as questions, not assumptions.
- **F4's runtime symptom is inferred.** I describe Firestore's list-evaluation behavior from the vendor semantics the repo itself documents; I did not observe the failure live.

---

## 3. Findings summary

| # | Finding | Severity | Category |
|---|---|---|---|
| F1 | Hardcoded bootstrap email grants `owner` on an *unverified* email address, and open self-registration makes it claimable | **High** | Broken Access Control / Auth |
| F2 | `isPrivileged()` does not require `verified`, so a privileged role bypasses the entire verification gate | **High** | Broken Access Control |
| F3 | Referral `patientData` is unpinned on update — any party can silently rewrite the clinical record | **High** | Broken Access Control / Tampering |
| F4 | `auditTrailAppendOnly()` only checks length, so prior audit entries can be rewritten | **Medium** | Logging & Alerting Failures / Repudiation |
| F5 | No status-transition validation in rules — consent gate and cancel lock are bypassable in two writes | **Medium** | Insecure Design |
| F6 | No App Check, so the SPA's client-side logic is trivially bypassed | **Medium** | Security Misconfiguration |
| F7 | No security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) on hosting | **Medium** | Security Misconfiguration |
| F8 | Unfiltered `referrals` listener against a `resource.data` read rule — self-inflicted denial of the core workflow, with a dangerous "obvious fix" | **Medium** | Insecure Design / DoS |
| F9 | Full staff directory (names, emails, facilities, roles) readable network-wide by any verified user | **Low** | Information Disclosure |
| F10 | Patient names fan out in notification bodies to every user at a facility and to all global admins | **Low** | Information Disclosure |
| F11 | Clinical attachments are `blob:` URLs that never leave the uploader's browser, stored unvalidated and rendered into `href`/`img src` | **Low** | Insecure Design |
| F12 | CI branch guard checks `main`; the default branch is `sevensn`, so the guard never fires | **Low** | Security Misconfiguration |
| F13 | No automated dependency scanning (no Dependabot/Renovate config) | **Low** | Software Supply Chain |
| F14 | Unused `@google/genai` and `express` dependencies; stale README instruction to set `GEMINI_API_KEY` | **Low** | Software Supply Chain |
| F15 | `e2e/.auth_state.json` commits a mock auth blob keyed to a dev-only bypass | **Informational** | Auth |

---

## 4. Detailed findings

### F1 — Hardcoded bootstrap email grants `owner` on an unverified address (High)

[firestore.rules:66](firestore.rules:66) permits a self-created user document with **any role** when the caller's token email matches one literal address:

```
allow create: if signedIn() && request.auth.uid == userId
              && request.resource.data.verified == false
              && (
                request.resource.data.role == 'resident'
                || request.auth.token.email == 'hassan.abdelmenem@gmail.com'
              );
```

The inline comment asserts: *"The email comes from a verified Firebase token, so it cannot be spoofed."* That conflates two different things. The **token** is integrity-protected — nobody can forge its signature. But `request.auth.token.email` only records what email is attached to the account; it does **not** attest that the account holder controls that mailbox. Firebase exposes a separate field for that, and this rule does not use it. Per Firebase's own reference, `email` is *"The email address associated with the account, if present"* while `email_verified` is *"`true` if the user has verified they have access to the `email` address"* ([Firebase: rules and auth](https://firebase.google.com/docs/rules/rules-and-auth)).

Meanwhile registration is fully open and performs **no email verification** — [src/contexts/AuthContext.tsx:135](src/contexts/AuthContext.tsx:135) calls `createUserWithEmailAndPassword` with no follow-up `sendEmailVerification`, and the sign-up form is public at [src/pages/Login.tsx:82](src/pages/Login.tsx:82).

So: anyone who registers an email/password account bearing that address receives a token whose `email` claim satisfies the hatch, and can create themselves a user document with `role: 'owner'`. Combined with F2 (below), that is immediate full read/write across every collection — every patient record in the network.

**The precondition worth being precise about:** this only works if no Firebase Auth account already exists for that address. If the owner has already signed in with Google using it and Firebase's default one-account-per-email behavior is in force, `createUserWithEmailAndPassword` returns `auth/email-already-in-use` and the direct path closes. That likely makes this *currently* unexploitable — but it is a single console setting and one account-deletion away from being exploitable, and it means the security of the highest-privilege identity in a PHI system rests on an implicit precondition nobody has written down. It also means the address itself is now a targeted-phishing bullseye, published in a repo.

**Recommend:** remove the hatch entirely and bootstrap the owner once via the Admin SDK or a console-set custom claim. If it must stay short-term, at minimum add `&& request.auth.token.email_verified == true`, and prefer a custom claim (`request.auth.token.owner == true`) over a literal email string — claims are set server-side and cannot be claimed by registering.

### F2 — `isPrivileged()` does not require verification (High)

[firestore.rules:26](firestore.rules:26):

```
function isPrivileged() {
  return callerExists() && callerDoc().role in ['owner', 'system_admin'];
}
```

Every other sensitive path in the file routes through `isVerifiedCaller()`, which requires `verified == true` ([firestore.rules:31](firestore.rules:31)). `isPrivileged()` does not. And `isPrivileged()` appears as the *first* disjunct on nearly every rule in the file — referrals read/create/update/delete, users update/delete, facilities create/delete, notifications, directAdmissions, shiftLogs.

The create rule at [firestore.rules:66](firestore.rules:66) requires `verified == false` on the new document, which is exactly the state F1's attacker lands in. `role: 'owner', verified: false` therefore satisfies `isPrivileged()` while sitting on the wrong side of the verification gate the rest of the file depends on. The verification gate is the app's stated human-review control ([firestore.rules:29](firestore.rules:29) — *"Verification is an explicit act by facility leadership"*); a privileged role walks straight past it.

The rules test at [tests/firestore.rules.test.ts:111](tests/firestore.rules.test.ts:111) seeds `OWNER` with `verified: true`, so this gap is invisible to the suite.

**Recommend:** `return isVerifiedCaller() && callerDoc().role in ['owner', 'system_admin'];`. Add a test asserting an unverified `owner` is refused. This is a one-line change and it independently defuses most of F1's blast radius.

### F3 — Referral clinical data is unpinned on update (High)

[firestore.rules:145](firestore.rules:145) allows any verified party to a referral to update it, constrained only by:

```
function referralIdentityPinned() {
  return request.resource.data.referringFacilityId == resource.data.referringFacilityId
      && request.resource.data.referringUserId == resource.data.referringUserId
      && request.resource.data.patientId == resource.data.patientId
      && request.resource.data.createdAt == resource.data.createdAt;
}
```

`patientId` is pinned. **`patientData` is not.** Nothing in the rules prevents a verified user at the receiving facility — or at any facility listed in `candidateFacilityIds` during auto-routing ([firestore.rules:99](firestore.rules:99)) — from rewriting the entire clinical payload: allergies, blood type, diagnosis, medications, vital signs, patient name. `receivingDepartments`, `priority`, and `requiredBedType` are likewise unconstrained.

In a transfer system this is a patient-safety issue, not just a data-integrity one. A rewritten allergy list or blood type on an in-flight emergency transfer is a clinically actionable falsehood arriving at the receiving hospital under the referring hospital's name. And because `referringUserId` *is* pinned, the forged record still carries the original clinician's attribution.

Note the rules do correctly pin `referringFacilityId` and `referringUserId`, and the suite tests both ([tests/firestore.rules.test.ts:185](tests/firestore.rules.test.ts:185), [:193](tests/firestore.rules.test.ts:193)). The omission is specifically the clinical payload.

**Recommend:** pin `patientData` for every actor except the referring facility, e.g. add to the update rule a branch where `request.resource.data.patientData == resource.data.patientData` unless `callerFacility() == resource.data.referringFacilityId`. Better still, constrain updates to a whitelist of legitimately mutable fields with `changedKeys().hasOnly([...])` — the pattern already used correctly for facilities at [firestore.rules:92](firestore.rules:92) and notifications at [firestore.rules:162](firestore.rules:162).

### F4 — The append-only audit trail is not append-only (Medium)

[firestore.rules:132](firestore.rules:132):

```
function auditTrailAppendOnly() {
  return request.resource.data.statusHistory is list
      && request.resource.data.statusHistory.size() >= resource.data.statusHistory.size();
}
```

This enforces that the history never *shrinks*. It does not enforce that existing entries are unchanged. A caller can submit a `statusHistory` of equal or greater length whose earlier entries are entirely fabricated — different actors, different timestamps, different notes — and it passes.

The test at [tests/firestore.rules.test.ts:188](tests/firestore.rules.test.ts:188) covers truncation (`{ statusHistory: [] }`) and correctly fails it. Same-length rewriting is untested.

Impact is repudiation: `statusHistory` is the record of who approved what and when, and the app's soft-delete design deliberately preserves it as the audit trail ([src/contexts/DataContext.tsx:717](src/contexts/DataContext.tsx:717)). If it can be rewritten by any party to the referral, it cannot support an incident investigation or a clinical-governance review — which is most of the reason it exists.

**Recommend:** require the existing prefix to be identical. Firestore rules cannot slice lists, so the practical patterns are (a) require exactly one appended entry and validate its shape, comparing the rest via a maintained `statusHistoryHash`, or (b) move history into an immutable subcollection `referrals/{id}/statusHistory/{entryId}` with `allow update, delete: if false` — the same treatment `shiftLogs` already gets at [firestore.rules:195](firestore.rules:195), which is the right model.

### F5 — No status-transition validation in rules (Medium)

Two client-side guards have no server-side counterpart:

1. **Consent before dispatch.** [src/contexts/DataContext.tsx:456](src/contexts/DataContext.tsx:456) throws if `status === 'in_transit'` and the prior status isn't `patient_consented`. No rule enforces this. A direct Firestore write sets `in_transit` on a referral the patient never consented to.
2. **Cancel lock.** `canCancelReferral()` correctly refuses cancellation once a referral is `in_transit`/`arrived`/`admitted`/`discharged` ([firestore.rules:111](firestore.rules:111)) — but only inspects the *pre-write* status of the write that sets `cancelled`. Since ordinary status updates carry no transition constraints, a party writes `status: 'accepted'` first (not a cancel attempt, so `canCancelReferral` is never consulted), then writes `status: 'cancelled'` against the now-unlocked state. Two writes, lock bypassed.

The cancel-role logic itself is otherwise well built and well tested — this is a gap in the surrounding transition model, not in the cancel check.

**Recommend:** add a transition whitelist to the update rule mapping each `resource.data.status` to its permitted successors, and gate `in_transit` on `resource.data.status == 'patient_consented'`.

### F6 — No App Check (Medium)

There is no `initializeAppCheck` call anywhere in the codebase, and no App Check dependency in `package.json`. Firebase's guidance is explicit that API keys don't control access and that **"that can only be done with Firebase Security Rules (to control which end users can access resources) and Firebase App Check (to control which apps can access resources)"** ([Firebase: API keys](https://firebase.google.com/docs/projects/api-keys)).

Half of that pair is missing. With rules alone, any holder of a valid token can call the Firestore API directly from `curl` — no browser, no SPA, no rate limiting, no client-side validation. Every finding above is reachable this way, and so is bulk enumeration: an attacker with one verified account can page the entire `users` collection and every referral they are party to at machine speed.

App Check is not a substitute for fixing F1–F5, but it raises the cost of automated abuse considerably and is a prerequisite for any meaningful rate limiting on a backendless architecture.

**Recommend:** enable App Check with reCAPTCHA Enterprise for web, run it in monitoring mode until traffic looks clean, then enforce.

### F7 — No security headers (Medium)

[firebase.json:16](firebase.json:16) sets only `Cache-Control`. Missing entirely: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Firebase Hosting sets none of these by default.

Concretely for this app: no `frame-ancestors` means the site can be framed for clickjacking against a session that has standing authority to cancel transfers and approve admissions. No `Referrer-Policy` means outbound navigations — including the attachment links at [src/pages/ReferralDetailPage.tsx:310](src/pages/ReferralDetailPage.tsx:310) — leak the referring URL, which for this SPA contains referral IDs. No CSP means the injection sweep in section 6 coming back clean is the *only* thing standing between a future `innerHTML` regression and script execution.

**Recommend:** add a headers block. A workable starting CSP given the app loads Google Fonts and talks to Firebase:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:;
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

plus `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. Deploy CSP in `Content-Security-Policy-Report-Only` first.

### F8 — Unfiltered `referrals` listener against a `resource.data` read rule (Medium)

The read rule at [firestore.rules:138](firestore.rules:138) depends on `resource.data` via `isReferralParty()`. The client listener at [src/contexts/DataContext.tsx:170](src/contexts/DataContext.tsx:170) is unfiltered:

```js
const referralsQuery = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'), firestoreLimit(200));
```

`loadOlderReferrals` has the same shape at [src/contexts/DataContext.tsx:118](src/contexts/DataContext.tsx:118). This is precisely the coupling the repo warns about in two places — [firestore.rules:7](firestore.rules:7) and [docs/DEPLOYMENT.md:122](docs/DEPLOYMENT.md:122): *"An unfiltered `onSnapshot(collection(...))` against such a rule is rejected outright — and a rejected listener is killed permanently with no retry, so the UI silently stops updating for the rest of the session."*

**This does not leak data.** Firestore fails the whole query rather than filtering, so the failure mode is closed. But for any non-privileged user, as soon as the latest-200 window contains one referral they are not party to — which in a multi-hospital network is essentially always — the listener dies and `referrals` stays empty for the rest of the session. That is a denial of the app's primary clinical function.

Two things make this a security finding rather than just a bug. First, `console.error` is the only error handler ([src/contexts/DataContext.tsx:177](src/contexts/DataContext.tsx:177)), so it fails silently — a clinician sees an empty transfer list, not an error, and cannot distinguish "no pending transfers" from "the query was denied." Second, the intuitive fix for "staff can't see referrals" is to relax the read rule to `isVerifiedCaller()`, which would hand every verified user in the network every patient record. This finding is a standing invitation to make that change under time pressure.

Notably, the sibling collections get this right — `directAdmissions`, `notifications`, and `shiftLogs` all use `where(...)` filters matching their rules ([src/contexts/DataContext.tsx:189](src/contexts/DataContext.tsx:189), [:182](src/contexts/DataContext.tsx:182), [:201](src/contexts/DataContext.tsx:201)) and all three are tested. `referrals` is the one that was missed, and it is also the only collection in the suite with **no `list` test at all** — every referral test uses `getDoc`/`updateDoc`/`setDoc`.

**Recommend:** split into two filtered listeners mirroring the rule's disjuncts — `where('referringFacilityId', '==', facilityId)` and `where('receivingFacilityId', '==', facilityId)`, plus `where('candidateFacilityIds', 'array-contains', facilityId)` for auto-routing — and merge client-side. Add `assertSucceeds`/`assertFails` list tests for referrals. Surface listener errors in the UI instead of only the console.

### F9 — Network-wide staff directory (Low)

[firestore.rules:64](firestore.rules:64) allows any verified user to list the entire `users` collection: names, emails, roles, facilities, departments, phone numbers, across every hospital in the network.

This is a **knowingly accepted trade-off**, documented at [firestore.rules:61](firestore.rules:61) and [docs/DEPLOYMENT.md:129](docs/DEPLOYMENT.md:129): client-side notification fan-out has to resolve recipients at the *receiving* facility, so it needs the whole roster. The repo already names the fix (move fan-out to a Cloud Function, requires Blaze billing) and calls it the recommended next hardening step. I agree with that assessment and with the severity — this is staff PII, not patient data.

It is worth noting the second-order effect: it gives any single compromised or malicious verified account a complete, structured targeting list for the network — every hospital manager and medical director with their email and role — which materially improves a phishing campaign aimed at the accounts that *can* reach patient data.

### F10 — Patient names in notification fan-out (Low)

`createNotification` embeds patient names directly in notification bodies — `Referral for ${patientName} is now ${status}` ([src/contexts/DataContext.tsx:518](src/contexts/DataContext.tsx:518)), and similarly at [:654](src/contexts/DataContext.tsx:654), [:698](src/contexts/DataContext.tsx:698), [:761](src/contexts/DataContext.tsx:761). Two call sites pass **no `targetRoles`** at all ([:516](src/contexts/DataContext.tsx:516), [:768](src/contexts/DataContext.tsx:768)), so the name goes to every user at the facility regardless of role. And [src/contexts/DataContext.tsx:211](src/contexts/DataContext.tsx:211) unconditionally includes every `owner`/`system_admin` network-wide as a recipient of every notification.

Read access to notifications is properly locked to the recipient ([firestore.rules:159](firestore.rules:159)), so this is not a breach — it is an unnecessarily wide distribution of identified patient names, including to facility staff with no clinical relationship to that patient.

**Recommend:** reference patients by referral ID or initials in notification bodies and resolve the name in the UI from the referral document, which is already access-controlled. Pass explicit `targetRoles` at the two sites that omit it.

### F11 — Attachments are dead `blob:` URLs, stored unvalidated (Low)

[src/pages/NewReferralPage.tsx:151](src/pages/NewReferralPage.tsx:151):

```js
url: URL.createObjectURL(file) // Mock URL for preview
```

A `blob:` URL is scoped to the creating document and dies with the tab. It is then persisted to Firestore as part of `patientData.attachments` and rendered at the receiving facility as an `<img src>` and a download `href` ([src/pages/ReferralDetailPage.tsx:310](src/pages/ReferralDetailPage.tsx:310)). **Clinical attachments never actually transfer.** No Firebase Storage upload exists anywhere in the codebase. The referring clinician sees a working preview and reasonably believes the ECG was sent; the receiving clinician gets a broken link. In an emergency-transfer workflow, that silent gap is the clinically significant part of this finding.

The security dimension is smaller but real: `attachments[].url` is an unvalidated, attacker-controllable string (any verified user can write arbitrary values directly to Firestore — see F3) that lands in `href` and `img src`. React 19 blocks `javascript:` URLs, so this is not XSS ([React: jsx-no-script-url background](https://github.com/facebook/react/issues/16382)). But `http(s):` and `data:` URLs are not blocked, so a malicious party can plant a phishing destination that a clinician clicks in a trusted context, or an `<img src>` beacon that pings an attacker-controlled server whenever the referral is viewed — leaking access patterns and, absent a `Referrer-Policy` (F7), the referral URL.

**Recommend:** implement real uploads to Firebase Storage with matching Storage rules, and validate `url` against an allowlisted origin prefix in the Firestore rules. Until then, the attachment UI should not present as working.

### F12 — CI branch guard never fires (Low)

[.github/workflows/ci.yml:26](.github/workflows/ci.yml:26) guards against shipping the emulator flag:

```yaml
if: github.ref == 'refs/heads/main'
```

The default branch is `sevensn` (confirmed by `origin/HEAD -> origin/sevensn` and by [docs/DEPLOYMENT.md:164](docs/DEPLOYMENT.md:164)). There is no `main`. The guard has never executed.

Its impact is limited — `VITE_USE_FIREBASE_EMULATORS` isn't set in the workflow environment, so the check would be vacuous anyway, and a production build with that flag would fail to reach live Firestore rather than expose data. But a control that silently never runs is worse than no control, because it reads as coverage.

**Recommend:** change to `refs/heads/sevensn`, or delete it and enforce the invariant in the build instead.

### F13 — No automated dependency scanning (Low)

`.github/` contains only `workflows/` — no `dependabot.yml`, no Renovate config. With 1,156 total dependencies, manual `npm audit` is the only line of defense, and nothing runs it in CI. Given F14's unused packages, dependency drift is already happening.

**Recommend:** add `.github/dependabot.yml` for the npm ecosystem (weekly), and add `npm audit --audit-level=high` as a CI step.

### F14 — Unused dependencies and a stale README (Low)

`@google/genai` and `express` are both listed as production dependencies in [package.json:20](package.json:20) and [package.json:26](package.json:26), and neither is imported anywhere in `src/`, `e2e/`, or `tests/`. They inflate the supply-chain surface for no benefit.

Related and more concerning: [README.md:18](README.md:18) instructs *"Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key."* Nothing reads that variable. But this is a Vite app — a developer following the README who names it `VITE_GEMINI_API_KEY` to make it "work" would embed a real, billable Gemini key into the production JS bundle, where it is world-readable. Unlike the Firebase web key (section 5), a Gemini key **is** a secret. The README is leftover AI Studio scaffolding and actively misleads.

**Recommend:** `npm uninstall @google/genai express`, and rewrite the README to describe the actual app.

### F15 — Committed mock auth state (Informational)

`e2e/.auth_state.json` commits a Playwright storage-state blob containing `auth_user` with `role: 'consultant', verified: true`. The corresponding bypass at [src/contexts/AuthContext.tsx:42](src/contexts/AuthContext.tsx:42) is gated on `isDevAuthAllowed`, which is statically `false` in production builds, and line 53 actively removes the key otherwise.

Even if the gate were defeated, impact is UI-only: the mock user exists solely in React state and carries no Firebase token, so every Firestore read and write it attempts is rejected by the rules. The bypass reveals empty screens, not data.

I'm listing it because a client-side `localStorage`-driven auth bypass is exactly the kind of thing that survives a refactor after the flag protecting it is removed. The gating is currently correct and the intent is well-commented.

---

## 5. What's done well

This codebase is meaningfully above average on security engineering, and several things deserve saying with the same evidence bar as the findings.

**The security rules are treated as real code.** `tests/firestore.rules.test.ts` is 227 lines of emulator-backed tests organized by prior security review, covering privilege escalation, cross-facility PHI reads, notification tampering, referral identity laundering, and capacity edits. It runs in CI on every branch with a JVM provisioned for the emulator ([.github/workflows/ci.yml:48](.github/workflows/ci.yml:48)). Tests like *"blocks laundering referringUserId to steal the cancel right"* ([tests/firestore.rules.test.ts:192](tests/firestore.rules.test.ts:192)) are the product of genuine adversarial thinking, not coverage padding.

**Self-privilege-escalation is properly closed.** `privilegeFieldsUnchanged()` ([firestore.rules:49](firestore.rules:49)) blocks self-promotion and self-verification, and freezes `facilityId` at verification — a subtle and correct design, since it is exactly what makes `facilityId` trustworthy as an authorization input afterwards. All three properties are tested.

**Deploy credentials are least-privilege and cleaned up.** The service account holds six narrowly-scoped roles and, per [docs/DEPLOYMENT.md:58](docs/DEPLOYMENT.md:58), **no read or write access to Firestore data** — it can rewrite rules but cannot read a patient record. The key is written to `RUNNER_TEMP`, exported via `GOOGLE_APPLICATION_CREDENTIALS`, and removed in an `if: always()` step ([.github/workflows/firebase-deploy.yml:59](.github/workflows/firebase-deploy.yml:59)). The docs even pre-describe the Workload Identity Federation migration to eliminate the long-lived key.

**CI/CD avoids the classic fork-secret trap.** The preview workflow triggers on `pull_request`, not `pull_request_target`, and additionally gates on `github.event.pull_request.head.repo.full_name == github.repository` ([.github/workflows/firebase-preview.yml:27](.github/workflows/firebase-preview.yml:27)). Deploy is chained via `workflow_run` and checks out `workflow_run.head_sha` — the exact commit CI validated, not whatever the branch points at by deploy time ([.github/workflows/firebase-deploy.yml:38](.github/workflows/firebase-deploy.yml:38)). That's a real TOCTOU defense that most pipelines miss.

**`shiftLogs` is the right model for audit data.** `allow update, delete: if false` ([firestore.rules:195](firestore.rules:195)), author-pinned creates, facility-scoped reads. F4 would be resolved by applying this same pattern to `statusHistory`.

**The rules file is genuinely well-commented,** and the comments explain *why* — including honest documentation of accepted trade-offs (F9) and of the rules↔query coupling. That the codebase documents a limitation I then found violated in one collection (F8) is a sign the documentation is real, not decorative.

**Deliberate removal of a prior `eval` usage** — [src/lib/firebase.ts:18](src/lib/firebase.ts:18) explicitly notes *"This avoids using eval which is dangerous,"* matching commit `896d795`. Security fixes here are being made and recorded.

**Secrets hygiene is clean.** `.gitignore` excludes `.env*`, `auth.json`, and Firestore/Auth exports with a comment explaining these contain real PII ([.gitignore:16](.gitignore:16)). Git history shows no `.env` file was ever committed.

## 6. Areas checked with no findings

- **Injection sinks — clean.** Grepped all of `src/`, `public/`, `index.html`, and `e2e/` for `eval(`, `new Function`, `dangerouslySetInnerHTML`, `.innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`, `srcdoc`, and `javascript:`. **Zero hits.** All rendering goes through React's escaping JSX.
- **SQL / NoSQL injection — not applicable.** No SQL anywhere. Firestore access is entirely through the typed SDK with parameterized `doc()`/`where()` calls; no query is built by string concatenation.
- **Command injection — not applicable.** No `exec`, `spawn`, or shell invocation in application code.
- **`target="_blank"` reverse tabnabbing — clean.** One occurrence in app code ([src/pages/ReferralDetailPage.tsx:310](src/pages/ReferralDetailPage.tsx:310)) and it correctly carries `rel="noreferrer"`.
- **`postMessage` handlers — none.** No cross-window messaging, so no missing-origin-check class of bug.
- **Secrets in source — none found.** Grepped for `AIza[...]` key patterns, hardcoded API keys, passwords, `BEGIN PRIVATE KEY`, and service-account JSON across the whole tree. The only literals are `'fake-api-key-for-emulator'` / `'fake-api-key-for-dev'` ([src/lib/firebase.ts:46](src/lib/firebase.ts:46), [:63](src/lib/firebase.ts:63)) and `'e2e-password-not-a-secret'` in the emulator seed — all genuinely non-secret.
- **Git history — clean.** `git log --all --diff-filter=A` over all branches surfaces no `.env`, `auth.json`, `.pem`, or `.key` file ever added.
- **Firebase web API key exposure — not a finding.** The config in [src/lib/firebase.ts:26](src/lib/firebase.ts:26) reads from `VITE_*` vars that Vite inlines into the bundle. This is correct and expected: per Firebase, *"API keys restricted to Firebase services do not need to be treated as secrets, and it's safe to include them in your code or configuration files"* ([Firebase: API keys](https://firebase.google.com/docs/projects/api-keys)). Access is controlled by Security Rules and App Check — which is why F6 matters and this doesn't.
- **Client-side PHI persistence — does not materialize.** `src/lib/db.ts` defines an IndexedDB store for offline referrals, which would persist full patient records past logout. But `saveOfflineReferral` and `syncOfflineReferrals` are **never called from application code** — only from tests. No PHI is written to IndexedDB today. Firestore is initialized without persistent cache ([src/lib/firebase.ts:107](src/lib/firebase.ts:107)) and Auth uses `browserSessionPersistence` ([src/lib/firebase.ts:89](src/lib/firebase.ts:89)), so tokens die with the tab. `localStorage` holds only the theme and the dev-gated mock user. **This becomes a finding the moment the offline feature is wired up** — plan for a `clearOfflineReferrals()` call in `logout()` before then.
- **Service worker — safe.** `public/sw.js` is a deliberate kill-switch that deletes all caches and unregisters itself. No cache-poisoning surface, and the comment explains the stale-shell bug it fixes.
- **SSRF — not applicable.** No server-side fetch of user-supplied URLs; there is no server.

## 7. Dependency / CVE audit

`npm audit` ran successfully: **5 moderate, 0 high, 0 critical** across 1,156 dependencies.

| Package | Installed | Status |
|---|---|---|
| `@opentelemetry/core` | `<2.8.0` (transitive) | **Confirmed in range.** Unbounded memory allocation in W3C Baggage propagation — [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf), CVSS 5.3. Reached only via `firebase-tools` → `@google-cloud/pubsub`. **devDependency; not in the browser bundle.** |
| `uuid` (nested) | `<11.1.1` under `gaxios` | **Confirmed in range.** Missing buffer bounds check in v3/v5/v6 when `buf` is provided — [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), CVSS 7.5. Only reachable through `gaxios` → `firebase-tools`. **devDependency.** |
| `uuid` (direct) | `^14.0.1` | **Not affected.** The advisory range is `<11.1.1`; the app's direct dependency is v14. The vulnerable copy is a separate nested install under `gaxios`. |
| `gaxios` | `6.4.0 – 6.7.1` | In range, but only as a carrier for the `uuid` issue above. devDependency. |
| `@google-cloud/pubsub` | `>=5.1.0` | In range, carrier for `@opentelemetry/core`. devDependency. |
| `firebase-tools` | `^15.25.1` | Root of all five. `npm audit` proposes v14.23.0 as the fix, which is a **downgrade** from the installed v15 — likely stale advisory metadata. Verify against the v15 changelog before acting. |
| `firebase` (client SDK) | `^12.17.0` | **No advisories.** This is the one that ships to browsers. |
| `react` / `react-dom` | `^19.2.8` | **No advisories.** |
| `react-router-dom` | `^7.18.2`, `react-router` pinned to `^8.3.0` via `overrides` | **No advisories.** The override suggests a prior CVE was already remediated deliberately. |
| `vite` | `^8.2.0` | **No advisories.** |

**Bottom line: every finding is in the dev toolchain, none reach the production bundle, and none is exploitable by an app user.** This is genuinely a clean dependency posture. Real risk is low; F13 (no automated scanning) is the more consequential item here, since nothing will catch the next one.

## 8. STRIDE threat model

Trust boundaries in this system: **browser ↔ Firestore** (the only one that matters — no backend), **browser ↔ local storage**, **GitHub Actions ↔ Firebase project**, and **facility ↔ facility** (an internal boundary within a single trusted-ish user population, which is what makes this app unusual).

| Category | Relevant finding(s) | Assessment |
|---|---|---|
| **Spoofing** | F1, F6 | Firebase Auth handles identity correctly at the token layer. The weakness is *what identity means*: F1 accepts an email claim as proof of mailbox ownership. F6's absence of App Check means any client can pose as the app. Authenticated-user identity within the app is sound. |
| **Tampering** | **F3**, F5, F11 | **The weakest quadrant.** A legitimate, authenticated, verified user can tamper with the *content* of records they're authorized to touch: rewrite clinical data (F3), force illegal state transitions (F5). This is the failure mode neither a vuln-scan nor a naive "can an outsider get in?" review catches — the attacker is inside the trust boundary by design, and the rules only check *whether* they may write, never *what*. |
| **Repudiation** | **F4**, F10 | `statusHistory` is presented as an audit trail and pinned in the identity check, but is rewritable at equal length (F4), so it cannot establish who approved a transfer. No server-side logging exists outside Firestore itself. Firebase audit logs cover admin actions, not per-document writes by end users. |
| **Information Disclosure** | F9, F10, F7, F11 | Patient data is properly compartmentalized by facility across `referrals`, `directAdmissions`, and `shiftLogs`, and the rules tests prove it. Leakage is at the margins: full staff directory (F9), patient names in notification bodies (F10), referrer leakage absent headers (F7). No path found for an *unauthenticated* party to reach patient data. |
| **Denial of Service** | **F8**, F6 | F8 is a self-inflicted DoS on the core clinical workflow, already latent in shipped code, and it fails silently. F6's absence of App Check leaves no rate limiting between an attacker and Firestore — both a cost-amplification vector (Firestore bills per read) and an enumeration one. |
| **Elevation of Privilege** | **F1 + F2**, F5 | Self-service escalation is properly blocked and tested (`privilegeFieldsUnchanged`). The residual path is the bootstrap hatch: F1 provides the entry and F2 removes the verification gate that would otherwise contain it. Fixing F2 alone — one line — breaks the chain. |

## 9. Attacker-mindset walkthrough

Starting from nothing but read access to this repository:

1. **Read the docs.** `docs/DEPLOYMENT.md` hands me the whole target map: project ID `eha-transfer-1785622025`, hosting site `eha-transfer.web.app`, web app ID, default branch, and the explicit statement that there is no staging environment and that dev and PR-preview builds hit **production patient data**. It also tells me `firestore.rules` is the only authorization layer. I now know exactly one file decides everything.

2. **Get a token.** Sign-up is public and unmoderated ([src/pages/Login.tsx:82](src/pages/Login.tsx:82)), and there is no email verification. I register with email/password and hold a valid Firebase token in under a minute. My user document is created as `role: 'resident', verified: false` ([src/contexts/AuthContext.tsx:94](src/contexts/AuthContext.tsx:94)) — which gets me almost nothing. The verification gate is doing its job.

3. **Skip the browser.** Because there's no App Check (F6), I discard the SPA and talk to the Firestore REST API directly with my token. Every client-side role check in `src/pages/*` is now irrelevant. From here I'm only fighting `firestore.rules`.

4. **Look for the escalation.** The rules read cleanly — `privilegeFieldsUnchanged()` stops me promoting or verifying myself, and it's tested. Then I hit line 73: a literal email address that unlocks arbitrary role assignment at create time, with a comment claiming it "cannot be spoofed." It checks `token.email`, not `token.email_verified` (F1). **Chain step:** the app never verifies email addresses, so that check proves nothing about mailbox control.

5. **Claim it — if it's unclaimed.** If no Firebase Auth account exists for `hassan.abdelmenem@gmail.com`, I register it and create myself `{role: 'owner', verified: false}`. `isPrivileged()` checks role but not `verified` (F2), so I'm privileged the instant the document lands — and `isPrivileged()` is the first disjunct on every rule in the file. **Full read/write across every patient record in the network.** Game over at step 5.

   If the address *is* already taken, this path closes and I fall back to social engineering: the address is published in a public repo, tied to the highest-privilege account in a healthcare system, with no evidence of MFA enforcement. One successful phish reaches the same place. This is why F1's severity doesn't drop to Low just because the direct path may currently be blocked — the chain has two entrances.

6. **If step 5 fails entirely, get verified the boring way.** Register as a plausible clinician, self-select a facility during onboarding (permitted pre-verification by design, [firestore.rules:52](firestore.rules:52)), and wait for a facility admin to approve me. This is a human control, and human controls approving accounts in a busy hospital are not a high bar. Once verified, I read the *entire staff directory* network-wide (F9) — every manager and medical director, with email, role, and facility. That's both a targeting list and everything I need to write a convincing internal phish.

7. **Tamper from the inside.** As a verified user I create a referral naming any facility as a candidate, which makes me a "party" to it. Now `patientData` is unpinned on update (F3): I can rewrite allergies, blood type, and diagnosis on referrals I touch — clinically actionable falsehoods delivered under another hospital's attribution. I bypass the patient-consent gate by writing `in_transit` directly, since that check lives only in client code (F5). I defeat the cancel lock on an in-flight transfer with two writes instead of one (F5). And I rewrite `statusHistory` at equal length to erase my own actions and attribute them elsewhere (F4) — so the post-incident investigation reads a trail that says someone else did it.

8. **Persist and stay quiet.** Nothing rate-limits me (F6). Nothing outside Firestore logs my writes (F4). If anyone notices staff can't see referrals — which they can't, because of F8 — the most natural fix under pressure is to relax the referrals read rule to `isVerifiedCaller()`, which would hand my low-privilege account every patient record in the network without my doing anything further.

**The chain that matters:** open registration + no email verification + a hardcoded email hatch + `isPrivileged()` skipping the verification gate. Four individually-defensible decisions that compose into full compromise. **Breaking any one link breaks the chain, and F2 is a one-line fix.**

## 10. OWASP Top 10 mapping

Mapped against **OWASP Top 10:2025**, confirmed as the current edition — announced November 2025, finalized January 2026 ([OWASP Top 10:2025 Introduction](https://owasp.org/Top10/2025/0x00_2025-Introduction/)).

| Category | Findings | Assessment |
|---|---|---|
| **A01 — Broken Access Control** | F1, F2, F3, F9 | **Most affected.** Authorization exists and is largely well built, but has specific holes with direct paths to PHI. Still #1 in the 2025 list, and it's #1 here too. |
| **A02 — Security Misconfiguration** | F6, F7, F12 | No App Check, no security headers, a dead CI guard. All cheap to fix; F7 is a config-file edit. |
| **A03 — Software Supply Chain Failures** | F13, F14 | New category in 2025. Dependency posture is currently clean (section 7) but unmonitored, with unused packages inflating surface. |
| **A04 — Cryptographic Failures** | — | **No findings.** TLS throughout via Firebase Hosting; no custom crypto; no password handling (delegated to Firebase Auth). App-level encryption of PHI at rest is absent, but Firestore encrypts at rest by default and that's a reasonable posture at this scale. |
| **A05 — Injection** | — | **No findings.** Verified by exhaustive sink sweep (section 6). Genuinely clean. |
| **A06 — Insecure Design** | F5, F8, F11 | State machine enforced only in the client; query/rule coupling violated in the one collection that matters most; attachments architecturally non-functional. These are design gaps, not coding errors. |
| **A07 — Authentication Failures** | F1, F15 | No email verification on registration; identity decisions made on an unverified email claim. Firebase Auth itself is used correctly. |
| **A08 — Software and Data Integrity Failures** | F3, F4 | Clinical data and audit trail both mutable by parties who shouldn't be able to alter them. CI/CD integrity is a **strength** here — `workflow_run.head_sha` pinning is a genuine defense (section 5). |
| **A09 — Security Logging and Alerting Failures** | F4, F8 | No logging outside Firestore documents; the one audit structure is forgeable; failures surface only to `console.error` where no user or operator sees them. |
| **A10 — Mishandling of Exceptional Conditions** | F8 | New in 2025 (replaces SSRF). F8 is a textbook instance: a permission-denied listener error is swallowed to `console.error`, leaving clinicians with an empty screen indistinguishable from "no pending transfers." |

## 11. Open questions

These depend on facts outside the repository. I'd rather ask than guess.

1. **Is `hassan.abdelmenem@gmail.com` already registered in Firebase Auth for this project, and via which provider?** This is the single most important question in this report — it determines whether F1's direct path is live right now. Check Firebase Console → Authentication → Users.
2. **Is "Email enumeration protection" / one-account-per-email enabled?** (Console → Authentication → Settings.) If multiple accounts per email are permitted, F1 is exploitable even if the address is already registered via Google.
3. **Does the owner account have MFA enforced?** F1's fallback path is phishing an address published in the repo.
4. **Is this repository public?** If so, the bootstrap email, project ID, full rules file, and the deployment doc's map of the system are all public — which is the premise of the entire section 9 walkthrough.
5. **Is App Check enabled and enforced in the console** even though no client-side `initializeAppCheck` call exists? (It wouldn't work without the client call, but confirming rules out a half-configuration.)
6. **Who performs account verification, against what criteria?** F9 and step 6 of the walkthrough both hinge on how hard it actually is for a stranger to get verified.
7. **Are Firestore/GCP audit logs enabled and retained?** F4 says the in-app trail can't be trusted; whether anything else would catch a tamper depends on this.
8. **What is the regulatory regime for this data?** Egyptian health data protection and/or any HIPAA-equivalent obligations would change the compliance weight of F3, F4, F9, and F10 considerably.
9. **Are PR preview channels access-restricted?** They serve a build against **production** patient data ([.github/workflows/firebase-preview.yml:8](.github/workflows/firebase-preview.yml:8)) on a guessable-ish `*.web.app` URL for 7 days.
10. **Has the `firebase-tools` v15 → v14.23.0 "fix" been verified?** `npm audit` proposes a downgrade, which suggests stale advisory data rather than a real remediation.

## 12. Prioritized remediation roadmap

**Same day — one-line fixes, disproportionate impact**

1. **F2:** add `isVerifiedCaller() &&` to `isPrivileged()` ([firestore.rules:26](firestore.rules:26)). *One line. Breaks the primary escalation chain.* Add a test for an unverified `owner`.
2. **F1:** delete the hardcoded email hatch ([firestore.rules:73](firestore.rules:73)); bootstrap the owner via a custom claim or the Admin SDK. If it must survive a day longer, add `&& request.auth.token.email_verified == true`.
3. **F12:** `refs/heads/main` → `refs/heads/sevensn`, or delete the guard.
4. Answer open questions 1, 2, and 4 — they may reclassify F1 as actively exploitable.

**This week — cheap, high value**

5. **F7:** add the headers block to `firebase.json`. Ship CSP as report-only first. Pure config, no code.
6. **F3:** pin `patientData` for non-referring parties, or move referral updates to a `changedKeys().hasOnly([...])` whitelist. *Highest patient-safety impact of any fix here.*
7. **F13:** add `.github/dependabot.yml` and an `npm audit` CI step.
8. **F14:** `npm uninstall @google/genai express`; rewrite the README so nobody ships a Gemini key in the bundle.
9. **F8:** split the referrals listener into rule-shaped filtered queries; add referral `list` tests; surface listener errors in the UI. *Fix this before someone "fixes" it by loosening the read rule.*

**This month**

10. **F5:** add a status-transition whitelist to the referrals update rule; gate `in_transit` on `patient_consented` server-side.
11. **F4:** move `statusHistory` to an immutable subcollection with `allow update, delete: if false` — reuse the `shiftLogs` pattern that's already right.
12. **F6:** enable App Check (reCAPTCHA Enterprise), monitor-mode first, then enforce.
13. **F10:** drop patient names from notification bodies; add explicit `targetRoles` at the two sites lacking them.

**Next quarter — structural**

14. **F9:** move notification fan-out into a Cloud Function (needs Blaze) and narrow `/users` to facility scope. The repo already identifies this as the right next step and I agree.
15. **F11:** implement real Firebase Storage uploads with matching Storage rules, and validate attachment URLs against an origin allowlist.
16. Migrate CI to Workload Identity Federation to remove the long-lived service-account key — already scoped in [docs/DEPLOYMENT.md:76](docs/DEPLOYMENT.md:76).
17. Stand up a staging Firebase project so dev and PR previews stop pointing at production patient data.
18. Before wiring up offline mode, add `clearOfflineReferrals()` to `logout()` (section 6).

---

## Sources

- [OWASP Top 10:2025 — Introduction](https://owasp.org/Top10/2025/0x00_2025-Introduction/) — confirmation of the current edition and category list
- [Firebase — Learn about API keys for Firebase projects](https://firebase.google.com/docs/projects/api-keys) — web API keys are not secrets; access is controlled by Security Rules and App Check
- [Firebase — Security Rules and Firebase Authentication](https://firebase.google.com/docs/rules/rules-and-auth) — `request.auth.token` fields, including the `email` vs `email_verified` distinction
- [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) — `@opentelemetry/core` unbounded memory allocation in W3C Baggage propagation (CVSS 5.3, affects `<2.8.0`)
- [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — `uuid` missing buffer bounds check in v3/v5/v6 (CVSS 7.5, affects `<11.1.1`)
- [facebook/react#16382](https://github.com/facebook/react/issues/16382) — React's handling of `javascript:` URLs in `href`

All in-repository claims are cited inline as `file:line` against commit `e1788f0`.
