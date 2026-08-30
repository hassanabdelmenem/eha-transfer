## 2026-08-28T21:54:00Z
You are a Worker subagent assigned to Milestone 1: App Shell, Navigation & Design System Modernization.
Your working directory is: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m1
Project root: /Users/hassanabdelmenem/antigravity/eha-transfer
Authoritative request: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/ORIGINAL_REQUEST.md
Project plan & architecture: /Users/hassanabdelmenem/antigravity/eha-transfer/PROJECT.md
Survey analyses:
- /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_survey_ux/analysis.md
- /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_survey_e2e/analysis.md
- /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_survey_data/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of Work for Milestone 1:
1. Modernize the entire application shell and navigation in `src/components/layout/`:
   - `AppLayout.tsx`: Upgrade the layout to support a modern responsive design with a persistent, collapsible desktop sidebar (lg+) and a clean mobile off-canvas drawer / bottom bar.
   - Create or upgrade `AppSidebar.tsx`: Role-categorized navigation items (Clinical Workflow, Emergency & Triage, Hospital Capacity, Administration, Account), visual active states, collapse toggle, facility info, and role badge.
   - Create or upgrade `AppTopBar.tsx`: Modern top bar with facility switcher/context, quick global search trigger, emergency status alert chip, notification bell with unread count popover, user profile menu, and sign-out button.
   - Consolidate and modernize `RoleHomeHeader.tsx`: Make it lightweight or integrate its vital info into the top bar so pages don't suffer from duplicated header clutter.
2. CRITICAL Test Invariants & Compatibility Requirements (must NOT break Playwright tests):
   - Menu drawer toggle button MUST have `aria-label="Open menu"` (or `aria-label="Open menu / navigation"` so `button[aria-label^="Open menu"]` matches).
   - Sign-out button MUST have accessible text 'Log out' or matching `/Log out/i`.
   - End-of-shift handover button MUST have accessible text matching `/Send handover/i`.
   - Navigation links must lead to the correct routes: `/referrals`, `/dashboard`, `/bed-management`, etc.
   - Active user info, role badges, and facility name must be displayed properly.
3. Verification Requirements:
   - Run `npm run lint` (`tsc --noEmit`) and verify zero TypeScript errors.
   - Run `npm test` and verify all existing unit tests pass (update any layout unit tests if element structure changed, keeping all assertions green).
4. Output:
   - Write your detailed implementation report and test results to `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/worker_m1/handoff.md`.
   - Send a message back to parent when complete.
