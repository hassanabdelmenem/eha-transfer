---
name: Ismailia Health Connect
description: Inter-facility patient referral and transfer coordination for a hospital network
colors:
  command-blue: "#1e3a8a"
  command-blue-hover: "#1e40af"
  command-blue-soft: "#dbeafe"
  neutral-canvas: "#ffffff"
  neutral-canvas-dark: "#0f172a"
  neutral-surface-dark: "#1e293b"
  neutral-border: "#cbd5e1"
  neutral-border-dark: "#334155"
  neutral-text: "#1e293b"
  neutral-text-dark: "#f1f5f9"
  neutral-muted: "#64748b"
  critical-500: "#ef4444"
  critical-600: "#dc2626"
  critical-100: "#fee2e2"
  warning-500: "#f59e0b"
  warning-600: "#d97706"
  warning-100: "#fef3c7"
  success-500: "#22c55e"
  success-600: "#16a34a"
  success-100: "#dcfce7"
  info-500: "#3b82f6"
  info-600: "#2563eb"
  info-100: "#dbeafe"
typography:
  heading:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.command-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px"
  button-primary-hover:
    backgroundColor: "{colors.command-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.command-blue-soft}"
    textColor: "{colors.command-blue}"
    rounded: "{rounded.md}"
  button-destructive:
    backgroundColor: "{colors.critical-600}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  badge:
    rounded: "{rounded.full}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.neutral-canvas}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.neutral-canvas}"
    rounded: "{rounded.md}"
    height: "48px"
---

# Design System: Ismailia Health Connect

## Overview

**Creative North Star: "The Clinical Command Center"**

This is instrument-panel software, not a marketing surface: a deep institutional blue (`command-blue`, #1e3a8a) anchors every screen as the one color that means "this is the primary action" or "this is the app," while slate neutrals carry everything else. Status color — success, warning, critical, info — is never decorative; it exists only to answer "what state is this referral or this bed in" at a glance, and it must always resolve to exactly one unambiguous meaning per screen. Touch targets run 44–56px across every interactive control, because the real device on the other end is a shared hospital tablet or a phone operated one-handed, sometimes with gloves on. A dedicated night-shift filter (sepia + darkened, `.night-shift-mode`) exists as a first-class mode, not an afterthought — this system was built assuming someone will read it under ER lighting at 3am.

Depth is moving toward flat/tonal, away from drop shadows: shadows currently appear on ~114 elements across the codebase (cards, buttons), more than a clinical dashboard needs, and the direction going forward is to replace most of that shadow use with borders and tonal surface layering, reserving shadow strictly for genuinely floating elements (modals, popovers, dropdowns) rather than resting cards and buttons.

**Key Characteristics:**
- One brand color (`command-blue`), used sparingly and only for primary actions and identity, never for decoration.
- Semantic status colors (`critical` / `warning` / `success` / `info`) are a named scale mapped onto Tailwind's red/amber/green/blue — never referenced by raw hue name in code or design.
- Large, unambiguous touch targets everywhere (44px minimum, up to 56px), non-negotiable for gloved/shared-device use.
- A first-class night-shift mode (sepia/dark filter) — design for two lighting realities, not one.
- Confident, unambiguous component states: primary vs. destructive vs. disabled must read instantly, with no subtlety that could cost a beat of triage time.

## Colors

The palette is one institutional accent plus a strict four-color status scale on a slate neutral base. Every non-neutral, non-status color use should be traceable to "this is the brand" or "this is a clickable primary action."

### Primary
- **Command Blue** (`#1e3a8a` / hover `#1e40af`): the single brand/action accent. Primary buttons, active nav state, links, focus rings, app identity. Used deliberately sparingly outside those roles.
- **Command Blue Soft** (`#dbeafe`): the low-emphasis complement to Command Blue — secondary buttons, selected-but-not-primary states, info highlights.

### Neutral
- **Canvas** (`#ffffff` light / `#0f172a` dark): page and card background.
- **Surface** (`#1e293b`, dark mode only): elevated container background in dark mode (footers, headers within cards).
- **Border** (`#cbd5e1` light / `#334155` dark): all default borders, dividers, input strokes.
- **Text** (`#1e293b` light / `#f1f5f9` dark): default body text.
- **Muted** (`#64748b`): secondary/label text, placeholders.

### Status scale (Named Rule)
**The Status-Scale Rule.** Status meaning is always expressed through the named `critical` / `warning` / `success` / `info` scale — never through a raw Tailwind hue (`red-500`, `amber-600`, etc.) referenced directly in a component. `warning` and `critical` must never collapse to the same rendered color; a rejected referral and a pending one are different states and must look different at a glance.
- **Critical** (`#dc2626` / bg `#fee2e2`): rejected referrals, destructive actions, errors, critically low bed capacity.
- **Warning** (`#d97706` / bg `#fef3c7`): pending review, approaching SLA breach, low (not critical) capacity, postponed referrals.
- **Success** (`#16a34a` / bg `#dcfce7`): accepted, arrived, admitted, approved states.
- **Info** (`#2563eb` / bg `#dbeafe`): neutral informational state, in-transit, non-actionable notices.

### Named Rules
**The One Accent Rule.** Command Blue is the only non-status color allowed to carry meaning ("this is the primary action" / "this is the brand"). If a second arbitrary accent color starts appearing outside the status scale, that's drift, not a new feature.

## Typography

**Heading Font:** Manrope (with sans-serif fallback), weight 700 — used for every heading level (`h1`–`h6`) and card titles.
**Body Font:** Inter (with sans-serif fallback), weight 400 — used for all body copy, labels, and form fields.

**Character:** Manrope's geometric, slightly wider letterforms give headings authority and scanability at a glance; Inter carries the density of clinical data (vitals, IDs, timestamps) at small sizes without losing legibility. The pairing reads as "command console," not "editorial."

### Named Rules
**The Legible-at-Distance Rule.** Every clinical data point (vitals, priority, status) must be legible glanced at from arm's length on a shared tablet — no font size below the current `text-xs` (12px) floor for anything carrying clinical meaning, and no font-weight below `font-bold` (700) for anything that signals state.

## Layout

Density-forward, form-and-table heavy: the product's job is fast scanning and data entry under time pressure, not editorial pacing. Cards and split-pane layouts (e.g. `ReferralDetailPage`'s left patient-data pane / right action pane) are the dominant structural pattern. Responsive behavior collapses the sidebar into an off-canvas drawer with a bottom action bar below the `lg` breakpoint, prioritizing thumb-reach mobile triage over shrinking the desktop layout in place.

**Pending implementation, required by product truth (see PRODUCT.md):** Arabic/English bilingual UI with RTL layout support is not yet built (`index.html` is hardcoded `lang="en"`, no i18n library present). Any new layout work should be built RTL-aware (logical CSS properties — `margin-inline-start` over `margin-left`, etc. — rather than hardcoded left/right) so the eventual RTL pass doesn't require re-architecting layouts already shipped.

## Elevation & Depth

**Direction: flattening.** The incumbent system uses `shadow-md` broadly (~114 usages: most buttons and every card), which is more shadow than a dense clinical dashboard needs and reads as visual noise at this density. Going forward, elevation should be conveyed primarily through tonal surface layering (a slightly different neutral background) and borders, with drop shadow reserved for genuinely floating UI — modals, dialogs, popovers, dropdown menus, toasts — where it signals "this is temporarily above the page," not for resting cards or buttons that never move.

### Shadow Vocabulary
- **Floating** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` — Tailwind's `shadow-lg`): modals, dialogs, popovers, the ECG quick-viewer overlay, toasts. The only elements allowed real elevation.
- **Resting surfaces** (cards, buttons, inputs): no shadow at rest going forward; a border (`neutral-border`) plus canvas/surface tonal contrast does the separation work instead.

### Named Rules
**The Floating-Only Rule.** Shadow means "this is temporarily above the page and will go away." If it's not a modal, popover, dropdown, or toast, it doesn't get a shadow.

## Shapes

Rounded, soft-edged geometry throughout — never sharp corners, never fully square. Current code usage is inconsistent (`rounded-lg`, `rounded-xl`, `rounded-2xl`, and stray directional roundings mixed on similar components); the canonical scale below is the target to converge on:
- **sm (8px):** tight inline controls — small chips, inline icon buttons.
- **md (12px):** the default — buttons, inputs, badges' container shape before pill rounding, standard cards.
- **lg (16px):** elevated/larger containers — modals, sheets, dialogs, the ECG viewer frame.
- **full (pill):** status badges, avatars, and icon-only circular buttons.

### Named Rules
**The One Radius Per Tier Rule.** A given component tier (control / card / floating surface) always uses the same radius everywhere it appears. Mixing `rounded-lg` and `rounded-xl` on sibling cards on the same screen is drift to fix, not a stylistic choice.

## Components

Every component's job is to be read correctly in under a second by someone who is not looking closely. Confident and unambiguous over refined and quiet: state must never require a second look.

### Buttons
- **Shape:** 12px radius (`rounded-md` tier), never pill except icon-only buttons.
- **Primary:** Command Blue (`#1e3a8a`) background, white text, bold weight. One per view unless the view has genuinely parallel primary actions (rare).
- **Secondary:** Command Blue Soft (`#dbeafe`) background, Command Blue text — for the second-priority action beside a primary.
- **Destructive:** Critical (`#dc2626`) background, white text — reject/cancel/delete actions only.
- **Outline / Ghost:** transparent background, slate border or none, slate text — tertiary/dismissive actions (Cancel, Close).
- **Hover / Focus:** background darkens one step on hover; focus-visible shows a 2px Command-Blue-family ring with an offset (never a 1px ring with no offset — it disappears against a similarly-colored background).
- **Sizing:** minimum 44px height (`sm`), 48px (`md`, default), 56px (`lg`) — never smaller, this is the gloved-hand/shared-device floor, not a suggestion.

### Badges
- **Style:** pill-shaped (full radius), tinted background + matching-hue text from the status scale, bold weight, small (`text-xs`).
- **State:** variant maps 1:1 to the status scale (`success` / `warning` / `danger` / `info`) plus a neutral `default`/`secondary`. Never a raw color outside that mapping.

### Cards / Containers
- **Corner:** 12px radius, consistently.
- **Background:** canvas (white / `#0f172a` dark).
- **Border:** 1px `neutral-border`, always present — this is what separates cards from the page now that shadow is being phased out.
- **Depth:** flat at rest (see Elevation & Depth); no shadow unless the card is genuinely floating (a popover-card, not a page card).
- **Internal Padding:** 24px (header/content/footer sections), with header and footer visually separated by a 1px border and a subtly different (slate-50/slate-950) tonal background on the footer.

### Inputs / Fields
- **Style:** 1px `neutral-border` stroke, white/dark canvas background, 12px radius, 48px minimum height.
- **Focus:** border/ring shifts to Command Blue at 1px ring.
- **Error:** border and ring shift to Critical (`#dc2626`/`#ef4444`); paired with adjacent error text, never color alone.

### Navigation
- **Desktop (≥lg):** persistent collapsible sidebar, role-aware section grouping (Clinical / Emergency / Capacity / Management / Admin), Command Blue for the active item.
- **Mobile (<lg):** off-canvas drawer plus a bottom action bar — optimized for thumb reach during triage, not a shrunk desktop nav.
- **Top bar:** facility/user context, global search, notification badge/popover, connection-status indicator — present on every authenticated screen, never re-implemented per page.

### Night Shift Mode (signature)
A global `.night-shift-mode` filter (sepia(0.4) + hue-rotate + increased contrast + reduced brightness, forced dark canvas) that any screen can be viewed through. Treat it as a first-class rendering mode to test against, not an edge case — color and contrast choices should survive being seen through this filter, since it exists specifically for 3am ER use.

## Do's and Don'ts

### Do:
- **Do** keep Command Blue as the only non-status accent color; resist adding a second arbitrary brand color.
- **Do** use the named status scale (`critical`/`warning`/`success`/`info`) for every state signal — never a raw Tailwind hue.
- **Do** keep every interactive control at 44px minimum height, 48px default.
- **Do** use logical CSS properties (`margin-inline-*`, `padding-inline-*`, `text-align: start/end`) in new layout work so the pending RTL/Arabic pass doesn't require rework.
- **Do** converge shape usage onto the four-tier radius scale (8/12/16/full) rather than mixing `lg`/`xl`/`2xl` on sibling elements.
- **Do** reserve shadow for modals, popovers, dropdowns, and toasts only.

### Don't:
- **Don't** let `warning` and `critical` render as visually indistinguishable states — a pending referral and a rejected one must never look the same at a glance.
- **Don't** add drop shadow to resting cards or buttons; use a border and tonal background instead.
- **Don't** shrink any interactive control below 44px height to fit more on screen — the device and hand constraints are real, not a nice-to-have.
- **Don't** hardcode left/right-specific CSS (`margin-left`, `text-align: left`) in new work; the bilingual RTL requirement makes this a real future break, not a hypothetical.
- **Don't** introduce a second brand accent color outside Command Blue and the status scale.
