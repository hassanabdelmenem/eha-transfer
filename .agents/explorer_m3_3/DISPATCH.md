## 2026-08-29T04:39:19Z
You are Explorer 3 for Milestone 3 (Clinical Cockpits & Role Dashboards).
Your working directory is: /Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m3_3
Target Scope: Investigate State, Data Hooks, Real-time Subscriptions, and Component Architecture for Milestone 3.

Authoritative references to read:
1. `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/ORIGINAL_REQUEST.md`
2. `/Users/hassanabdelmenem/antigravity/eha-transfer/PROJECT.md`
3. Contexts: `src/contexts/AuthContext.tsx`, `src/contexts/DataContext.tsx`
4. Utilities: `src/lib/` (referral filters, priority sorting, SLA calculations, mock data, stats)

Analyze:
- How data flows from `useAuth` (current user, active role, current facility) and `useData` (referrals, beds, facilities, notifications) into dashboard metrics and queues.
- Real-time updates, reactive filtering, SLA breach calculation, escalation banner triggers, and rapid triage actions.
- Proposed clean component architecture under `src/components/dashboard/` with clear TypeScript interfaces and zero hook rule violations.

Write your technical recommendations to `/Users/hassanabdelmenem/antigravity/eha-transfer/.agents/explorer_m3_3/handoff.md` and send a message when complete.
