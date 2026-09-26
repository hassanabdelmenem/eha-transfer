---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components/layout/AppLayout.tsx","src/pages/ReferralDetailPage.tsx"]
---

# Surface brief: authenticated app shell (all role homes, referral detail, wizard, inbox, directory, handover, admin, archive, settings)

Mode: Operate. On-shift hospital staff on phones (one-handed, sometimes gloved), shared tablets and ward desktops. Job: act on the referral blocked on *you*, in workflow order, without opening a 52KB page.

Source of truth: design handoff `design_handoff_mobile_workflow_redesign` (Mobile Redesign.dc.html, README.md, screenshots 1a–3d). High fidelity: its tokens, type, geometry and copy are final. Confirmed with the user 2026-09-27: adopt the handoff world (replacing the 19 Sep command-blue DESIGN.md), ship as phased PRs in the handoff's own order.

Untouchable: Firestore schema, rules, SLA/routing/escalation logic; the E2E DOM contract in PROJECT.md; the email-verification gates.

Unresolved: Arabic RTL layout is specified but not drawn (handoff: next design pass; build with logical properties now). The palette is the Anthropic brand palette the design tool applied; the user has been told.

## Direction contract

THESIS: The queue is the interface. Every screen opens on the cases blocked on this person, billed escalated → emergency → urgent → routine, each card carrying one sentence naming what is needed and one button whose label is that action. Refuses the category default: a KPI-tile dashboard with filters above a newest-first grid shown identically to 14 roles.

OWN-WORLD: Ink and paper. #faf9f5 paper, #ffffff cards, #e8e6dc hairlines, #141413 ink for primary buttons and dark chrome; warm greys #78766d/#5f5d54 for text (never slate-400 for information). Muted clinical status: brick #b91c1c escalation, amber-brown #854d0e on #fef3c7 urgent, olive #4c573c on #e0e3d7 approve, dusty blue #6a9bcc transit, violet #4e3c68 dept notes. Poppins 600 titles at −0.02em, system UI sans body, 11px/700 tracked micro-labels, mono timestamps. 12px cards, 10–11px buttons, pill chips, 5–6px priority rail plus text chip, never colour alone. Dark shell = full inversion on #141413, following the device.

STORY: The clinician, HoD, manager, ER official or nurse sees "N need you", understands why each case is waiting on them, and clears it from the list or a summary sheet; the shared detail screen tells each role what is theirs.

FIRST VIEWPORT: Dark ink header (role · facility, 48px ع and bell squares) → 26px/600 count headline ("3 need you") with one line of ordering rationale → segmented control where the role has one → cards at 18px gutters, escalated card pinned with a solid brick header strip → sticky action bar (52px primary + 52px squares). Desktop ≥lg: 228px ink rail, 436px queue column on paper, detail pane on #f4f2ed with the role's actions top-right.

FORM: Brief-pinned (the handoff); position 1 of 1 on the user's instruction. Concept roll seed 745e793f ran for the record; the pinned direction beats the roll. Raise from the declined festival-lineup challenger: hierarchy is carried by billing order and type size alone. The queue's order is the ranking, and no decoration may compete with it.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
