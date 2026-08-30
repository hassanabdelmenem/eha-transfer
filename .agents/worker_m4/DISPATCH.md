## 2026-08-29T05:33:51Z

You are the Implementation Worker for Milestone 4 (Referral Detail, Timeline & Action Console).
Your working directory is: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m4

Files you own exclusively:
- `src/pages/ReferralDetailPage.tsx`
- `src/components/referrals/*` (all files in `src/components/referrals/`)

Authoritative references to read FIRST:
1. `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/ORIGINAL_REQUEST.md`
2. `/Users/hassanabdelmenem/antigravity/eha-transfer/PROJECT.md`
3. Explorer Reports:
   - `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m4_1/handoff.md` (UX & Timeline specs)
   - `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m4_2/handoff.md` (DOM Invariants & E2E contracts)
   - `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m4_3/handoff.md` (State, Lifecycle & Architecture)

Requirements:
1. Ensure `ReferralDetailPage.tsx` and all components in `src/components/referrals/` provide a clean, modern clinical console:
   - Visual medical timeline tracking the 12-state referral lifecycle (`Sent` -> `Dept` -> `Manager` -> `Consent` -> `Transit` -> `Arrived` -> `Admitted`, etc.) with actor attribution and SLA tracking.
   - Comprehensive patient demographics, vitals summary with abnormal physiological indicators, clinical presentation narrative, and diagnostic media attachments.
   - Enhanced ECG Quick-Viewer Overlay with high-contrast toggle (`aria-pressed`), zoom in/out/reset controls (50% to 500%), and keyboard Escape dismissal.
   - Role-gated action console with clean state management.
2. Strictly verify and preserve all Playwright DOM selector invariants:
   - `#dept-review-section` with `select` (options including `direct_approval`) and `textarea`, button `/Submit Review/i`.
   - Button `/Accept the Transfer/i`, button `/Ready for Receive/i`.
   - Button `/Accepted Transfer/i`.
   - `#escort-form-section` with `input[type="text"]`, `input[type="tel"]`, button `/Save Accompanying Doctor/i`.
   - Button `/Dispatch Ambulance/i`, button `/Mark as Arrived/i`.
   - Rejection Modal: dialog with title "Reject Transfer", `#rejectionReasonInput`, button `/Confirm Rejection/i` (disabled when empty).
   - Cancellation Modal: section with text "This withdraws the referral and archives it", `textarea[placeholder*="Reason for cancellation"]`, button `/Confirm Cancellation/i` (disabled when empty).
   - ECG Viewer: dialog with text "ECG Quick-Viewer", button `/Toggle high contrast|High Contrast/i`, labels `Zoom in`, `Zoom out`, `Reset view`, `Close ECG viewer`.
3. Ensure zero React hook rule violations, zero TypeScript compilation errors, and 100% test pass rate.
4. Run `npm run lint`, `npm test`, and `npm run build` and document exact outputs.
