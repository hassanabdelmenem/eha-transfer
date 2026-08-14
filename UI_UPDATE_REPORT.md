# UI update report — skeleton loaders, semantic colors, decluttering, accessibility

Scope: `eha-transfer` (Ismailia Health Connect), React 19 + Tailwind v4. 25 files changed, 1 file added (`src/components/ui/Skeleton.tsx`). No dependencies added.

This session had no network access to npm, so `npm install` / `npm run lint` / `npm test` / `npm run build` could not be run here. Every changed file was parse-checked with the TypeScript compiler (0 syntax errors across all 49 `.ts`/`.tsx` files in `src/`), and every new Tailwind color class introduced was cross-checked against its definition in `src/index.css` (no undefined tokens). That is a syntax and reference check, not a type check — **run `npm run lint`, `npm test`, and `npm run build` before deploying**, per this repo's own gate.

Two pre-existing syntax errors were found and fixed along the way (both used a JSX-comment `{/* ... */}` in a position that isn't JSX children — inside a `condition && ( ... )` — which is invalid outside a JSX-children context): `ReferralDetailPage.tsx` (escalation banner) and one introduced by this pass in `DepartmentPage.tsx`, fixed to a plain `/* ... */` comment. Per `NEXT_STEPS_PROMPT.md`, this tree had never been compiled before, so this was latent.

## 1. Semantic colors

The brand theme (`src/index.css`) intentionally collapses `red`/`amber`/`yellow` onto one orange ramp and `blue`/`indigo`/`purple` onto one blue ramp for decoration. The file already carried a comment flagging the fallout: real status colors (`--color-critical-*`, `--color-warning-*`) had been split out for SLA badges and priority chips, but "every other red/amber usage in the app still resolves to the same orange" — and that was true of `purple` vs `blue` too.

**Confirmed bugs, not just inconsistency** — these pairs rendered as literally the same hex value before this change:
- `Badge` component: `variant="warning"` and `variant="danger"` were pixel-identical everywhere the component is used.
- `AdminDashboard`: emergency vs. urgent waitlist dots, "Full" vs. "near-full" capacity badges.
- `Dashboard` / `AdminDashboard`: bed-capacity bar's "low" (amber) and "full" (red) segments.
- `BedManagementPage`, `BedOccupancyHeatmap`: same 3-tier collision (ok/low/full or <70/70–90/90+%).
- `StatusTimeline`, `ReferralList` status dots: "pending" (amber) and "rejected/cancelled" (red) dots were identical; "postponed" (purple) was identical to "in transit" (blue).
- `purple` in general: the "External facility" badge, "Contracted" badge, and "Department Note" timeline label all silently rendered as plain blue.

**Fix:** added four purpose-built status scales in `index.css` — `critical`, `warning` (already existed, filled out to a full 50–950 scale), plus new `success` and `info` (named aliases onto the already-distinct green/blue brand ramps), and gave `purple` its own true violet (previously byte-identical to `blue`; new values contrast-checked at 4.5:1+ for every text/background pairing actually used in the app). ~35 call sites across `Badge`, `Button`, `AdminDashboard`, `Dashboard`, `BedManagementPage`, `BedOccupancyHeatmap`, `StatusTimeline`, `ReferralList`, `ReferralDetailPage`, `NotificationsPage`, `Toaster`, `PatientCard`, `Login`, `NewReferralPage`, `FacilitySettingsPage`, and `DepartmentPage` were migrated from raw `red-`/`amber-`/`green-`/`blue-` classes to the semantic ones, matched to what they actually mean (clinical severity vs. plain decoration was kept as decoration — primary buttons, headers, links stayed on brand blue).

Purely decorative, non-competing uses of raw colors (a required-field asterisk, a recording-indicator pulse, an "AI top pick" ribbon) were deliberately left alone — changing those wasn't fixing anything.

## 2. Skeleton loaders

`DataContext` exposed no loading signal at all — Firestore's `onSnapshot` starts every list empty, so a clinician opening the app mid-load saw "No referrals found," a referral detail deep-link showed "Referral not found," and Bed Management told a nurse to "select a facility" (with no selector visible, since that's admin-only) — all indistinguishable from the real empty/not-found state.

Added `loading: boolean` to `DataContext`, true until facilities and this user's referrals have both come back from Firestore at least once (or, for an unverified account, until facilities alone have — no referrals listener ever opens for that session). Built `src/components/ui/Skeleton.tsx`: `motion-safe:animate-pulse` (respects `prefers-reduced-motion` — a static gray block remains, only the animation drops), decorative placeholders marked `aria-hidden`, wrapped in a `SkeletonGroup` that carries the one `role="status"`/`aria-live="polite"` announcement a screen reader needs for the whole group instead of one per bar.

Wired into: `ReferralList` (used by `ReferralsPage`, `Dashboard`, `ERDashboard` — fixes it everywhere at once), `Dashboard` (KPI tiles, bed-capacity cards, occupancy heatmap), `ReferralDetailPage` (was showing "not found" for a still-loading, valid referral), `BedManagementPage`, `NetworkDirectoryPage`, `AdminDashboard`, `ERDashboard`, `DepartmentPage`, `NotificationsPage`.

## 3. Decluttering

- `Button`'s `size="sm"` was `h-7` (28px) — under a comfortable touch target. The same fix had already been hand-applied as a `min-h-[40px]` override at 30 separate call sites across the app rather than fixed once at the source; centralized it in `Button.tsx` (`sm` and `icon` now both 40px), matching this codebase's own established 40px standard. Only 4 call sites use `size="sm"`, so this is low-blast-radius.
- `DepartmentPage`: `<Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200">` was overriding the exact styling `variant="success"` already provides — the className was dead weight. Removed it.
- Beyond that, this pass stayed conservative on visual decluttering: this is a clinical system where a "redundant-looking" element (a duplicate status badge, an extra confirmation field) is sometimes deliberately redundant for patient safety, and the existing UI is already dense with legitimate real-time triage information. I did not remove any information display. If there's a specific screen that feels cluttered, point me at it and I'll take a closer pass with before/after screenshots — that's also how this repo's own `NEXT_STEPS_PROMPT.md` asked prior typography changes to be handled.

## 4. Accessibility (WCAG 2.1 AA)

A prior pass (visible throughout the code as inline comments) already covered a lot of ground: focus-visible rings with offsets, most form labels, most touch targets, color-contrast fixes on the neutral/gray ramp, `aria-live` on toasts with adjustable/removable durations. What follows is what was still missing and has now been fixed, plus what's flagged rather than fixed.

**Fixed:**
- **Missing accessible names on icon-only controls** (WCAG 4.1.2): `ECGViewerOverlay`'s zoom-in/zoom-out/close buttons had no text, `aria-label`, or `title` at all — a screen reader user had no way to know what they did. Its "High Contrast" toggle's label is `hidden` below `sm`, which meant the button had *no* accessible name on a phone despite looking labelled on desktop; added `aria-label`/`aria-pressed`. `VoiceTextarea`'s mic button had a `title` but no `aria-label` (added both `aria-label` and `aria-pressed`). `InteractiveFloorPlan`'s per-bed tiles relied on `title` alone; added matching `aria-label`.
- **Two unlabelled modals** (`AppLayout`'s Emergency Hotline and Profile Settings dialogs): added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at each heading, and `aria-label` on both close buttons (previously bare `<X/>` icons with no name). Neither modal closed on <kbd>Escape</kbd> (WCAG 2.1.2) — added a shared handler. The hotline modal also closes on backdrop click; the profile modal does not, since it holds an unsaved edit and silently discarding it on a stray click would be worse than the missing convenience.
- **Skip link**: added "Skip to main content" (visually hidden until focused) — this app's persistent header + sidebar nav meant a keyboard user had to tab through both on every page before reaching content.
- **Loading vs. empty ambiguity** (WCAG 4.1.3, Status Messages): covered above — screen reader users previously heard "No referrals found" during a normal load, indistinguishable from a genuinely empty facility.
- **Touch targets**: covered under Decluttering above.
- Several of the color fixes in section 1 are also accessibility fixes, not just visual ones — WCAG 1.4.1 (Use of Color) is exactly "don't make severity distinguishable only by a color that isn't actually distinguishable."

**Verified, not changed** (already solid): both `<img>` tags in the app have real `alt` text; `<html lang="en">` is set; `NewReferralPage`'s large intake form has a label for essentially every field; focus-visible rings are already consistent on `Button`/`Input`.

**Flagged, not fixed** (judgment calls or bigger changes than this pass should make unattended):
- Neither modal in `AppLayout` traps focus (Tab can still reach the page behind it) or returns focus to the triggering element on close. Escape now closes them and both are labelled, which covers the two highest-severity gaps (WCAG 4.1.2 and 2.1.2), but full focus management is a more involved change I'd want to test interactively rather than land sight-unseen in a hospital app.
- `--color-slate-400`/`500` (muted body text) are already flagged in this repo's own `NEXT_STEPS_PROMPT.md` as a contrast compromise — one token has to serve both a light-mode and dark-mode role, landing around 4.3–4.6:1 rather than comfortably above. I didn't touch this; it's called out there as needing verification "against real screens," which I can't do without a browser on the running app.
- The `/users` collection privacy issue (S6) and the overnight-escalation gap (2a) in that same doc are backend/Firestore-rules concerns, not UI — out of scope here.

## Files changed

`src/index.css`, `src/contexts/DataContext.tsx`, `src/components/ui/{Badge,Button,Skeleton (new),Toaster,VoiceTextarea}.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/referrals/{ReferralList,StatusTimeline,PatientCard,ECGViewerOverlay}.tsx`, `src/components/dashboard/BedOccupancyHeatmap.tsx`, `src/components/bed-management/InteractiveFloorPlan.tsx`, `src/pages/{Dashboard,AdminDashboard,ERDashboard,BedManagementPage,NetworkDirectoryPage,DepartmentPage,ReferralDetailPage,NewReferralPage,NotificationsPage,FacilitySettingsPage,Login}.tsx`.
