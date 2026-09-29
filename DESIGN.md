---
name: Ismailia Health Connect
description: Inter-facility referral and transfer coordination, drawn in ink and paper; the queue is the interface.
colors:
  paper: "#faf9f5"
  desk: "#f4f2ed"
  card: "#ffffff"
  ink: "#141413"
  night-pane: "#1a1a19"
  hairline: "#e8e6dc"
  wash: "#f0eee6"
  rule-strong: "#b0aea5"
  decorative-grey: "#8a8779"
  muted-text: "#78766d"
  secondary-text: "#5f5d54"
  ink-hover: "#3a392f"
  brick: "#b91c1c"
  brick-tint: "#fee2e2"
  brick-wash: "#fef2f2"
  amber-brown: "#854d0e"
  amber-fill: "#a16207"
  amber-tint: "#fef3c7"
  olive: "#4c573c"
  olive-deep: "#353c2c"
  olive-tint: "#e0e3d7"
  dusty-blue: "#6a9bcc"
  action-blue: "#445f7a"
  dusty-blue-tint: "#dde6ed"
  violet: "#4e3c68"
  violet-tint: "#e4dcee"
  chart-blue: "#3f6fa6"
  chart-rust: "#c2613f"
  chart-violet: "#7a55a8"
  chart-blue-night: "#5b8fd0"
  chart-rust-night: "#d8704a"
  chart-violet-night: "#9a79d6"
typography:
  headline:
    fontFamily: "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Poppins, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  card-name:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  context:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.09em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "\"tnum\""
rounded:
  chip: "6px"
  control: "10px"
  banner: "11px"
  card: "12px"
  sheet: "14px"
  bar: "9999px"
spacing:
  label-gap: "6px"
  action-gap: "10px"
  card-inset: "14px"
  gutter: "18px"
  pane: "24px"
  desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    height: "52px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 12px"
  button-approve:
    backgroundColor: "{colors.olive}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 12px"
  button-approve-hover:
    backgroundColor: "{colors.olive-deep}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 12px"
  button-disabled:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.control}"
  button-square:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    size: "52px"
  chip-emergency:
    backgroundColor: "{colors.brick}"
    textColor: "{colors.card}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  chip-urgent:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-brown}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  chip-routine:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.chip}"
    typography: "{typography.label}"
    padding: "4px 8px"
  card-queue:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  card-escalation:
    backgroundColor: "{colors.brick-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  card-escalation-strip:
    backgroundColor: "{colors.brick}"
    textColor: "{colors.card}"
    padding: "8px 14px"
  segment-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "52px"
  segment-inactive:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "52px"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "54px"
    padding: "0 14px"
  choice-pill-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "52px"
  header-bar-phone:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "14px 18px 16px"
  nav-rail:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    width: "228px"
  queue-column:
    backgroundColor: "{colors.paper}"
    width: "436px"
    padding: "28px 24px"
  case-pane:
    backgroundColor: "{colors.desk}"
    padding: "28px 24px"
  role-banner-warning:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.banner}"
    padding: "13px"
  toast-info:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Design System: Ismailia Health Connect

## Overview

**Creative North Star: "The Queue Is the Interface"**

Every authenticated screen opens on the cases blocked on the person looking at it, billed in workflow order: escalated, then emergency, then urgent, then routine, oldest first within a tier. Each card carries one sentence naming what is needed and one button whose label is that action. Hierarchy is carried by billing order and type size; no tile, chart or decoration is allowed to compete with the order of the queue. This replaces the KPI-tile dashboard shown identically to every role.

The material is ink and paper. A warm off-white page, white cards resting on it with hairline edges, near-black ink for primary buttons and dark chrome, warm greys for text. Status colour is muted and clinical (brick, amber-brown, olive, dusty blue, violet) and always travels with a word. Density is phone-first and thumb-first: 18px gutters, 48px minimum targets, 52 to 56px primaries, a sticky action bar at the bottom of the phone screen. On wide desktops (1280px and up) the same queue becomes a fixed column beside the open case.

Dark mode follows the device and is a full inversion onto ink, not a filter. The earlier command-blue "Clinical Command Center" world (Manrope/Inter, #1e3a8a) and the sepia night-shift filter are retired.

**Key Characteristics:**
- Paper page, white cards, hairline borders; depth by tone, not shadow.
- Ink is the single action colour; olive is the one alternative, reserved for approval.
- Priority is a 6px rail plus a text chip, never colour alone.
- Poppins 600 at -0.02em for headings; the system UI sans for everything else; tabular numerals for clinical numbers.
- 48px floor on every target; 52 to 56px on the action that ends a screen.
- One queue column on phones; queue plus case pane at 1280px and up, with the selection in the URL.

## Colors

A warm neutral scale from paper to ink, with five muted status hues that each own one meaning. Tailwind's own hue names are remapped in `src/index.css` onto these scales (slate and gray onto the warm neutrals; red and rose onto critical; amber and yellow onto warning; green and emerald onto success; blue and indigo onto info), so legacy utilities land in the palette. New code uses the semantic names (`critical`, `warning`, `success`, `info`, `purple`), never a raw hue.

### Primary
- **Ink** (ink): primary buttons, the active segment, selected choice pills, the phone header bar, the desktop navigation rail, and all body text on light surfaces. Hover deepens toward **Ink Hover** (ink-hover). In dark mode ink becomes the page and paper becomes the button.

### Secondary
- **Olive** (olive): the approve action (HoD "Approve", success-toned footer primaries) and every "done" state: consent recorded, dispatched, arrived, admitted, bed capacity comfortable. Its tint (olive-tint) backs confirmation rows. Olive, not traffic-light green.

### Status
- **Brick** (brick): escalation and emergency. The escalated card's 2px border and solid header strip, the emergency chip, the emergency rail, SLA clocks that have passed, field errors, zero free beds. Tinted surfaces use brick-tint and brick-wash.
- **Amber-Brown** (amber-brown on amber-tint): urgent, pending review, low beds, "send back with requirements". Text is always amber-brown on the tint; a filled warning control uses **Amber Fill** (amber-fill), because white on the bright amber fails contrast.
- **Dusty Blue** (dusty-blue): in transit and informational. **Action Blue** (action-blue) is the darker step used for links, focus rings and field focus borders.
- **Violet** (violet on violet-tint): department notes, postponed cases, external facilities. It is independent of blue because the two appear side by side.

### Neutral
- **Paper** (paper): the page, the phone action bar, the desktop queue column.
- **Desk** (desk): the desktop case pane, one step darker than the queue so the two panes read as separate surfaces without a shadow.
- **Card White** (card): cards, fields, outline buttons, toasts.
- **Night Pane** (night-pane): the case pane in dark mode, one step off the ink page.
- **Hairline** (hairline): card borders, dividers, the action bar's top rule, the routine chip, disabled buttons.
- **Wash** (wash): the selected-row fill in flush ER lists and hover fills.
- **Rule Strong** (rule-strong): field and outline-button borders, the routine priority rail, dashed empty-queue borders.
- **Decorative Grey** (decorative-grey): icons and borders only (about 3.4:1 on white). Never information.
- **Muted Text** (muted-text): the lightest grey allowed to carry information: micro-labels, segment counts, "no clock", placeholders.
- **Secondary Text** (secondary-text): context lines, rationale lines, field labels, hints, disabled-reason lines.

### Charts
Facility analytics use a fixed three-series palette validated for contrast on each surface: chart-blue, chart-rust, chart-violet in light mode; chart-blue-night, chart-rust-night, chart-violet-night in dark. Gridlines are hairline in light and paper at 10% in dark; ticks are muted text.

### Named Rules
**The Never Colour Alone Rule.** Every status tint carries a word. Priority is the rail plus the chip's text; bed capacity is the bar plus the stated count; an abnormal vital is a brick tint plus a warning icon plus a spoken "(abnormal)"; a role banner is a tint plus its uppercase label.

**The Muted Floor Rule.** Informational text is Muted Text (#78766d) or darker. The 400 step of the neutral scale is for icons and borders; it never carries a word someone needs to read.

**The One Meaning per Hue Rule.** Brick and amber never collapse: a rejected referral and a pending one never share a colour. Capacity has one threshold everywhere (`src/lib/capacityTone.ts`): brick at zero free beds, amber-brown under 20% free, olive above.

## Typography

**Display Font:** Poppins (with the system UI stack as fallback)
**Body Font:** System UI sans (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial)
**Label/Mono Font:** ui-monospace stack for phone numbers and IDs; tabular numerals for vitals, bed counts, timers and every `time` element

**Character:** Poppins at 600 with tight tracking gives each screen one confident, geometric count or question; the device's own sans keeps everything else fast, familiar and legible on older shared tablets.

### Hierarchy
- **Headline** (600, 26px, 1.15, -0.02em, Poppins): the role home count ("3 need you"), the desktop screen title, wizard step questions (24px on phones, 26px from 640px). Every h1 to h6 takes Poppins and -0.02em from the global stylesheet.
- **Title** (600, 21px, Poppins): the patient name in the desktop case header. On the phone's ink header the name drops to 15px/600 system sans so the stage rail fits under it.
- **Card Name** (600, 17px, 1.25, system sans): the patient name and age on every queue card and the escalation card; also the phone ScreenHeader title.
- **Body** (400, 15px, 1.45): the default. The action sentence on a card (15px/600, tinted to priority), role banner sentences (15px/500), choice pills (15px/600) and card buttons (15px/600) sit at this size. Rationale lines and empty states use 14.5px.
- **Context** (400, 13.5px, 1.4): the one context line under a card name (bed type, facility, department). Secondary metadata, not the clinical ask.
- **Label** (700, 11px, 0.06 to 0.09em, uppercase): micro-labels heading a group of cards, priority chips, role banner labels, the escalation strip (11.5px). Field labels are 12.5px/600 sentence case.
- **Numerals**: vitals values 16px/600 tabular; SLA clocks 13px/700 tabular ("8:12 left", "+2:05 over").

### Named Rules
**The Clinical Fifteen Rule.** The clinical ask is never below 15px: patient identity (17px), the sentence naming what is needed, banner sentences, vitals values (16px) and every action label. Only secondary context and labels go smaller, and labels are always 11px/700 or heavier.

**The Label Names a Group Rule.** An uppercase micro-label names the group of cards or the state beneath it ("Escalated", "Your action"). It is never a decorative kicker above a headline.

## Layout

Phone-first single column. The main area has 18px side gutters on phones and 32px on desktop; cards stack with 10 to 18px between them and 14px inside. A role home runs in a fixed order: headline count, one line of ordering rationale, an optional segmented control, the card column (escalated card pinned first), then an action bar. On phones the action bar is sticky at the bottom, bleeds to the screen edges and respects the safe-area inset; from 1024px it sits inline under the queue.

Breakpoints as built: 640px (toasts move from the top of the screen to bottom-right; wizard headings step up), 1024px (the 228px ink navigation rail appears, the phone ink header gives way to a plain title row, detail actions move from the pinned footer to the case header), 1280px (the two-pane workspace), 1440px (the case pane widens its padding to 32px).

**The workspace (1280px and up).** A role home becomes a 436px queue column on paper, with a hairline on its inline end, beside the selected case on the desk. The selection lives in the URL (`/dashboard?case=<id>`) so refresh, back and shared links keep it; with nothing chosen, the first case in the queue opens, so the pane is never empty while there is work. Below 1280px the queue is capped at 640px and opening a case goes to its own page.

**The Thumb Floor Rule.** Every interactive target is at least 48px in both dimensions; the action that finishes a screen is 52 to 56px (sticky footer primary 54px, action bar primary and squares 52px). Choice pills stretch a transparent native input over the whole pill so the full 48px is the real target.

**The Logical Direction Rule.** New layout uses logical properties (inline start/end, not left/right) so the Arabic RTL pass does not re-architect shipped screens. The Arabic toggle stays hidden until the RTL layout is designed; do not ship a toggle that flips to an undrawn layout.

## Elevation & Depth

Flat by default, layered by tone. Cards rest on paper with a hairline border and no shadow; the desktop panes separate by paper against desk; selection is an ink border plus a 1px ink ring (an ink ring with offset on the escalation card). Shadows appear only on surfaces that float above the page and must detach from it.

### Shadow Vocabulary
- **Toast lift** (`0 8px 24px rgba(20,20,19,0.14)`): toasts over any screen.
- **Sheet rise** (`0 -8px 30px rgba(20,20,19,0.18)`): the bottom summary sheet, cast upward.
- **Tooltip** (`0 4px 16px rgba(20,20,19,0.12)`): chart tooltips.

### Named Rules
**The Resting Card Rule.** A card in the queue never carries a shadow. If it needs to stand out, it moves up the billing order or takes the 2px brick border; it does not lift.

## Shapes

Soft rectangles at three radii: 6px for priority chips, 10px for controls (card buttons, fields, segments, choice pills, header squares), 12px for cards, the action bar primary and toasts. Role banners use 11px; the summary sheet rounds only its top corners at 14px. Fully rounded ends appear only on the 5px stage-rail bars. Borders are 1px hairlines; the escalation card alone takes a 2px brick border. Empty queues are a dashed Rule Strong outline around one quiet sentence.

## Components

### Buttons
Solid, square-shouldered and labelled with the action itself.
- **Shape:** 10px on in-card and footer-secondary buttons, 12px on the action bar and sticky footer primary.
- **Primary:** Ink fill, paper text, 15 to 16px/600. In dark mode it inverts to paper fill and ink text.
- **Approve:** Olive fill with white text, used only for the HoD approve decision and success-toned footer actions.
- **Warning fill:** Amber Fill with white text, for "send back with requirements".
- **Outline:** White fill, Rule Strong border, ink text ("Summary", secondary actions). A critical outline (brick border and text) exists for reject-type secondaries.
- **Square:** 48 or 52px icon squares (call the referring doctor, menu, notifications) with a Rule Strong border and an accessible name.
- **Disabled:** Hairline fill with Muted Text, and a one-line reason beneath ("Blocked: record patient consent first").
- **Hover / Focus:** Colour transitions only; ink deepens to Ink Hover, outlines take a paper wash. Focus is a 2px Action Blue ring offset 2px from the surface (a lighter dusty blue in dark mode).

### Chips
- **Priority chip:** 6px radius, 11px/700 uppercase text at 0.06em. Emergency is brick with white text; urgent is amber-brown on amber tint; routine is secondary text on hairline.
- **Always paired:** the chip sits top-right of the card name, beside the rail that repeats its tone.

### Cards / Containers
- **Queue card (ReferralCockpitCard):** white, hairline border, 12px radius, no shadow. A 6px priority rail as its own element on the inline-start edge (brick for escalated or emergency, amber-brown for urgent, Rule Strong for routine), then 14px of inset holding the 17px/600 name and age, one 13.5px context line, the priority chip, optionally one 15px/600 sentence tinted to priority naming what is needed, and the card's actions at 48 to 52px. The whole identity block is a real button that opens the case.
- **Compact and selected (workspace):** in the desktop queue the HoD, manager and clinician cards drop their inline decision buttons (the decision lives in the case header) and the open case takes an ink border and ring. Flush ER rows take the Wash fill instead.
- **Escalation card (EscalationAlertBanner):** pinned above the queue. 2px brick border on brick tint, with a solid brick header strip in 11.5px/700 uppercase white stating the reason and wait ("Escalated · no response 34 min"). Actions: an ink primary, an optional outline secondary, and a brick-outlined call square, all 52px. In dark mode the strip drops its fill and becomes brick-coloured text.
- **Role banner (detail):** one uppercase label and one 15px sentence on a status tint with a matching border, 11px radius, 13px inset. It tells each role what the case means to them.
- **Empty queue:** a dashed outline and one plain sentence; in the workspace pane an icon, a 19px Poppins line ("Nothing waiting on you") and one line of explanation.

### Inputs / Fields
- **Style:** 54px tall, white, Rule Strong border, 10px radius, 16px text (prevents iOS zoom on focus), placeholder in Muted Text. Textareas start at 112px. A 12.5px/600 label sits 6px above.
- **Focus:** the border turns Action Blue with a 2px Action Blue ring at 30%.
- **Error:** brick border and ring, with a 13px/600 brick message under the field wired through `aria-describedby`.
- **Choice pill:** a real radio or checkbox made transparent and stretched over a 52px pill. Unselected is white with a Rule Strong border; selected is ink (brick for a critical choice, amber tint with an amber-brown border for a warning choice).

### Navigation
- **Phone:** the role home opens with an ink identity header (role and facility, 48px squares). Other screens use ScreenHeader: a full-bleed ink bar with a 17px/600 title, a 13px subtitle at 65% paper, one optional screen action and the 48px menu square that opens the drawer.
- **Desktop (1024px and up):** a 228px ink navigation rail; ScreenHeader becomes a plain title row with a 26px Poppins title and actions in white outline buttons.
- **Segmented control:** equal-width 52px segments with a 10px radius, each showing its label (14.5px/600) and its case count (11.5px). The active segment is ink; inactive is white with a hairline border.

### Referral detail
- **Stage rail:** the six lifecycle stages (Sent, Dept, Manager, Consent, Transit, Admitted) as 5px rounded bars with labels beneath: done in olive, current in paper on the ink header (ink on light surfaces), upcoming faint. An exception status turns every bar brick. The whole rail is one image with a spoken stage name.
- **Actions:** on phones a pinned footer holds a remit label, one 54px primary, then a 48px secondary and call square. On desktop the same actions sit inline top-right of the case header at 48px.
- **Vitals:** tabular 16px values under 11px labels. Abnormal cells are brick-tinted, carry a warning icon, and say "(abnormal)" to screen readers.

### Capacity read-outs
Bars, steppers and the network grid all take their tone from one threshold: brick at 0 free, amber-brown under 20% free, olive above. The free count is always printed beside or inside the mark.

### Toasts
Top-anchored on phones (inside the safe area), because the bottom of every phone screen is an action bar; bottom-right at 384px wide from 640px. 12px radius, Toast lift shadow, 14.5px/500 message, a tone icon, and an explicit dismiss button. Error toasts are brick-wash, success olive-wash, info white. The live region is always mounted and polite.

### Motion
State changes are instant apart from colour transitions. The summary sheet slides up over 220ms on `cubic-bezier(0.16, 1, 0.3, 1)`. Transitions are dropped under reduced motion.

## Do's and Don'ts

### Do:
- **Do** bill every queue escalated, then emergency, urgent, routine, oldest first within a tier, and let that order carry the hierarchy.
- **Do** pair every status colour with a word: rail plus chip, bar plus count, tint plus label, abnormal tint plus icon and spoken word.
- **Do** make every target at least 48px, and the action that finishes a screen 52 to 56px.
- **Do** use Muted Text (#78766d) or darker for anything a person must read.
- **Do** keep the clinical ask (name, needed action, vitals, banner sentence, button labels) at 15px or larger.
- **Do** follow the device for dark mode with a full inversion onto ink (#141413).
- **Do** use the semantic scales (`critical`, `warning`, `success`, `info`, `purple`) in new code.
- **Do** build with logical properties so the Arabic RTL pass is a layout change, not a rewrite.
- **Do** preserve the E2E DOM contract: the ids, selectors and accessible names listed under "Interface & DOM Test Contracts" in PROJECT.md stay intact unless the user explicitly signs off on changing them.

### Don't:
- **Don't** signal priority, status or capacity with colour alone.
- **Don't** use the 400 neutral (#8a8779) or lighter for informational text.
- **Don't** put a shadow on a resting card; shadows are for toasts, sheets and tooltips.
- **Don't** reintroduce the sepia night-shift filter or any colour filter over the UI; dark mode is the inversion.
- **Don't** show the Arabic toggle until the RTL layout is designed.
- **Don't** fabricate data in the UI: no default vitals, no invented scores, distances or counts. When a value is unknown, say so ("no clock", "Department approved").
- **Don't** reference raw Tailwind hues (`red-600`, `amber-500`, `blue-700`) in new code.
- **Don't** bring back KPI tiles or a newest-first grid as a role home.
