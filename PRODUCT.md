# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hospital staff across a network of facilities in Ismailia, coordinating inter-facility patient transfers, in six distinct roles with different jobs on the same referral:

- **Clinicians** — originate referrals for their patients, track "My Referrals" and patients in transit.
- **Heads of Department (HoD)** — review and triage incoming departmental referrals, batch-review queues.
- **Hospital Managers / Medical Directors** — make the transfer accept/reject decision, watch facility-wide bed capacity.
- **ER Officials** — run ambulance dispatch, assign escort doctors, log arrivals.
- **Nurses / Bed Managers** — manage live bed census and admit arrived transfer patients.
- **Admins** — user/role and facility directory management.

All are on-shift hospital staff, often time-pressured (emergency transfers) and using shared devices, not personal ones.

## Product Purpose

Ismailia Health Connect coordinates inter-facility patient referrals and transfers end to end: referral intake and triage, department and management review, ambulance dispatch and escort assignment, ECG/diagnostic review, real-time bed availability across the facility network, and the admission handoff at the receiving hospital. It replaces ad hoc phone/paper-based inter-hospital referral coordination. Success is a referral moving through its full lifecycle (Sent → Dept → Manager → Consent → Transit → Arrived → Admitted) without a dropped handoff, with capacity decisions made against real bed data instead of a phone call asking "do you have a bed."

## Positioning

The 12-state clinical referral lifecycle tied to real-time bed visibility across the whole facility network — not a generic ticketing form or a standalone EHR referral field. A generic hospital-management or referral tool would have to build both the state machine and the live cross-facility capacity data to actually replace this.

## Operating Context

- Referral lifecycle: `Sent → Dept → Manager → Consent → Transit → Arrived → Admitted` (12 states total per PROJECT.md's timeline).
- Emergency transfers run through ambulance dispatch, escort-doctor assignment, and SLA/escalation tracking under time pressure.
- Bed capacity is tracked per facility per unit type (ICU, CCU, PICU, Ward) with live census steppers.
- ECG traces and diagnostic media are attached to referrals and reviewed in-app (dedicated quick-viewer with zoom/high-contrast).
- Shared/older devices and gloved-hand touch input are a real usage condition, not an edge case — this is ER and ward equipment, not personal phones.
- A service worker and IndexedDB-backed offline draft/sync layer exist in the codebase for intermittent-connectivity resilience.

## Capabilities and Constraints

- Stack: React 19 + TypeScript + Vite, Firebase Auth + Cloud Firestore, deployed to a single bound Firebase project (`eha-transfer-1785622025`, https://eha-transfer.web.app). No shared backend with sibling repos (`imc-er`, `er-app-final`).
- Role-based access is enforced in Firestore security rules, not just the UI.
- E2E test suite (Playwright) asserts on specific DOM ids/selectors across the referral wizard, detail page, and bed management (see PROJECT.md's "Interface & DOM Test Contracts") — visual work must preserve these unless the user explicitly approves changing them.
- Arabic + English bilingual UI is required, including RTL layout support for Arabic — not yet implemented (`index.html` currently hardcodes `lang="en"`, no i18n library in `package.json`). This is an open, undecided implementation gap the user flagged as a requirement, not yet a shipped capability.
- Physical/environmental constraints that must inform design: gloved-hand touch targets, glare/low-light ER screens, shared low-spec/older tablets, one-handed mobile use during triage.

## Evidence on Hand

- The product is **not yet in real clinical use**. It is functionally complete per PROJECT.md's milestone tracker (M1–M3 done, M4 in progress, M5 planned) and has a passing Playwright/Vitest/Firestore-rules test suite, but no live patients have moved through it yet.
- The user is actively modifying it now specifically to be ready for launch, and wants design work held to an enterprise-grade bar for that launch — not a rough or safe pass.
- No customer testimonials, published case studies, or usage metrics exist and none should be fabricated or implied in any design work.

## Product Principles

1. A referral's state and the receiving facility's real bed capacity must always be visible together — the product's core promise is replacing "call and ask if you have a bed" with live data.
2. Design for the real device and hands: gloved touch, shared/older tablets, glare, one-handed mobile triage under time pressure — not a clean desktop demo environment.
3. Bilingual Arabic/English (with RTL for Arabic) is a first-class requirement, not a later localization pass bolted onto an English-first layout.
4. Preserve the DOM contract the E2E suite depends on; visual and structural changes must route around it or get explicit sign-off to change it.
5. This is pre-launch and the target bar is enterprise-grade, production-ready craft — treat it accordingly, not as an internal tool or a prototype.

## Accessibility & Inclusion

Bilingual Arabic/English UI with RTL support for Arabic is a stated requirement (see Capabilities and Constraints — not yet implemented). No other formal accessibility standard (e.g. WCAG level) has been specified by the user; treat clinical/emergency usability under gloved, low-light, shared-device conditions as the operative accessibility bar until a formal standard is named.
