---
name: FreshCart
description: A quick-commerce grocery platform — bright, efficient, grocery-fresh storefront paired with a dense operations console.
colors:
  primary: "#4CAF50"
  secondary: "#66BB6A"
  accent: "#81C784"
  success: "#34C759"
  warning: "#FFB800"
  error: "#FF3B30"
  background: "#F8FAF7"
  surface: "#FFFFFF"
  text-primary: "#1C1C1E"
  text-secondary: "#7A7A7A"
  text-tertiary: "#C7C7CC"
  divider: "#ECECEC"
  admin-ink: "#0F2A1B"
  admin-ink-soft: "#17402A"
  admin-paper: "#F5F5F0"
  admin-text: "#171B16"
  admin-text-muted: "#6E6C5F"
  admin-signal-green: "#059669"
  admin-tag-amber: "#B8860A"
  admin-signal-red: "#C0392B"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  admin-display:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontWeight: 700
  admin-body:
    fontFamily: "IBM Plex Sans, Inter, system-ui, sans-serif"
    fontWeight: 400
  admin-mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  card-product:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "6px"
---

# Design System: FreshCart

## Overview

**Creative North Star: "The Fresh Market Grid"**

FreshCart reads like a well-run neighborhood grocery digitized without losing its efficiency: bright white surfaces, produce-green accents, and a dense, honest grid of cards that never pretends to be more decorative than the job requires. The storefront is fast and legible — every screen is built to be scanned in seconds by someone who wants groceries delivered in 10 minutes, not to be admired. The admin console shares the same bones (tokens, radii, spacing) but shifts register to a deep-forest "control tower" ink and warm paper background — a ledger, not a marketing surface.

The system stays deliberately flat: depth comes from white cards against a soft off-white background and thin 1px dividers, not from shadow stacks or glassmorphism. Rounded corners are generous but restrained (12–16px on cards, full pill on buttons and badges) — soft enough to feel consumer-friendly, never soft enough to feel decorative or twee. Color is used sparingly and functionally: green means brand/action/success, amber means caution, red means stock/error — nothing is colored "for interest."

**Key Characteristics:**
- Bright, white-surface storefront on a warm off-white background (`#F8FAF7`), never true gray.
- One brand green (`#4CAF50`) carries almost all accent weight; other colors are strictly functional (success/warning/error).
- Flat elevation: shadows are near-invisible at rest (`shadow-2xs`/`shadow-xs`), reserved for floating/interactive elements only.
- Consistent 12–16px card radius, full-pill radius on buttons, badges, and nav chips.
- Two typographic registers: consumer-friendly Inter/Plus Jakarta Sans on the storefront, technical Space Grotesk/IBM Plex on the admin console — same weight/scale logic, different family.

## Colors

The palette is a single-accent system: one green does almost all of the work, with functional (not decorative) reds/ambers, and a second "admin ink" palette that only appears inside `/admin/*`.

### Primary
- **Fresh Green** (`#4CAF50`): the one brand accent — primary buttons, active nav states, links, prices, the logo wordmark. Used deliberately, not as a background wash.
- **Leaf Green** (`#66BB6A`) / **Sprout Green** (`#81C784`): secondary/accent steps for hover states and the primary gradient (`linear-gradient(135deg, primary, accent)`), used sparingly on hero/promo surfaces only.

### Neutral
- **Market White** (`#FFFFFF`): all card/surface backgrounds.
- **Produce Paper** (`#F8FAF7`): page background — warm off-white, never pure gray, so white cards read as "fresh" against it.
- **Ink Black** (`#1C1C1E`): primary text.
- **Stone Gray** (`#7A7A7A`): secondary text (meta info, timestamps, helper copy).
- **Pale Stone** (`#C7C7CC`): tertiary text / placeholder / disabled.
- **Hairline** (`#ECECEC`): all dividers and card borders — always 1px, never heavier.

### Functional (status only — never decorative)
- **Confirm Green** (`#34C759`): success states, delivered/completed badges.
- **Caution Amber** (`#FFB800`): warnings, low-stock, pending states.
- **Alert Red** (`#FF3B30`): errors, destructive actions, out-of-stock.

### Admin Ink (scoped to `/admin/*` only)
- **Control-Tower Ink** (`#0F2A1B`) / **Ink Hover** (`#17402A`): the collapsible sidebar — deep forest, distinct from the storefront's white chrome so staff always know they're in ops mode.
- **Ledger Paper** (`#F5F5F0`): admin canvas background — warmer/denser than the storefront's paper, reinforcing "operations," not "shopping."
- **Wordmark Emerald** (`#059669`): the one signal color reused from the logo, used for positive/operational status chips (`shelf-tag-green`).
- **Ledger Amber** (`#B8860A`) / **Ledger Red** (`#C0392B`): muted versions of the storefront's warning/error, softened for legibility on paper background.

### Named Rules
**The One Accent Rule.** `#4CAF50` is the only color allowed to signal "brand" or "primary action." Every other color on screen is either neutral (surface/text/divider) or strictly functional (success/warning/error) — color is never added for visual interest alone.

**The Paper, Not Gray Rule.** Backgrounds are always a warm off-white/paper tone (`#F8FAF7` storefront, `#F5F5F0` admin), never a cool or true gray — white cards must always read as "fresher" than the page behind them.

## Typography

**Display Font (storefront):** Plus Jakarta Sans, with Inter/system-ui fallback
**Body Font (storefront):** Inter, with system-ui/-apple-system fallback
**Display Font (admin):** Space Grotesk, with Inter fallback
**Body Font (admin):** IBM Plex Sans, with Inter fallback
**Mono Font (admin):** IBM Plex Mono, ui-monospace fallback

**Character:** Storefront pairing is warm and consumer-approachable — Plus Jakarta Sans headlines carry personality without being decorative, Inter body text stays maximally legible at small sizes on mobile. Admin pairing swaps to Space Grotesk/IBM Plex — slightly more geometric and technical, signaling "tool" rather than "shop."

### Hierarchy
- **Display / H1** (800, `text-2xl`–`text-4xl`, tight leading): page titles, category hero headings, section titles like "Fresh Fruits."
- **Title / H2–H3** (700–800, `text-lg`–`text-xl`): card group headers, modal titles.
- **Body** (400–600, `text-xs`–`text-sm`): product names, descriptions, form labels — the vast majority of storefront text sits at `text-xs`/`text-sm` given the dense mobile-first grid.
- **Label** (700–900, `text-[10px]`–`text-[11px]`, often uppercase with letter-spacing): badges, eyebrow labels, category tags, shelf-tag status chips.

### Named Rules
**The Small-and-Bold Rule.** Given the dense product-grid layout, body text runs small (`text-xs`/`text-sm`) but compensates with heavier weight (`font-bold`/`font-black`) rather than larger size — legibility comes from contrast and weight, not from generous sizing.

## Layout

Mobile-first, single-column-first grid that expands at breakpoints rather than a desktop-first layout that collapses. Product/category grids run `grid-cols-2` on mobile → `sm:grid-cols-3` → `lg:grid-cols-4`. Page content sits inside a `max-w-[1360px]` container with `px-4` mobile / `px-6–8` desktop gutters. The sticky app header (logo/search/category-nav) is measured at runtime and exposed as a CSS custom property (`--sticky-header-h`) so page content can offset itself precisely instead of guessing padding. Mobile carries a fixed bottom tab bar (Home / Order Again / Categories / Profile) with safe-area-aware padding; desktop has none. Spacing follows a compact rem scale (`0.25rem` → `3rem`) with `gap-2`–`gap-4` the default between grid cells.

## Elevation & Depth

Flat by default. Depth is conveyed through white surfaces against warm-paper backgrounds and 1px hairline dividers/borders, not through shadow stacks. Shadows exist but stay nearly invisible at rest (`shadow-2xs`, `shadow-xs`) and are reserved for elements that are genuinely floating above content — the floating cart pill, dropdowns/search-results panels, and modals — never applied to static in-flow cards as decoration.

### Shadow Vocabulary
- **Card at rest** (`shadow-2xs` / border only): product cards, subcategory tiles — a border does the separating work, shadow is optional and barely perceptible.
- **Floating/overlay** (`shadow-card`: `0 4px 20px -2px rgba(0,0,0,0.05)`): dropdowns, search results, sticky bars.
- **Premium/modal** (`shadow-premium`: `0 20px 40px -15px rgba(0,0,0,0.05), 0 15px 25px -10px rgba(0,0,0,0.03)`): drawers and modals only — the one place a heavier, diffuse shadow is earned.

### Named Rules
**The Earned-Shadow Rule.** A shadow only appears on something that is actually floating above the page (modal, dropdown, floating pill). Anything sitting in normal document flow is separated by a border or divider, never a shadow.

## Shapes

Rounded-but-restrained: `12px` (`rounded-md`) is the default card/input radius, stepping up to `16px` (`rounded-lg`) for larger cards and `24px` (`rounded-xl`) for hero/banner surfaces. Buttons, pills, badges, and nav chips use full pill radius (`rounded-full`) — the one place the system goes soft without reservation. Borders are always `1px` and always the hairline divider color; never a heavier or colored border except on active/selected states (which switch to the brand green at ~50% opacity).

## Components

### Buttons
- **Shape:** full pill (`rounded-full`) on primary/CTA buttons; `12px` (`rounded-xl`) on secondary/outline buttons in dense contexts (product-card "Add").
- **Primary:** `bg-primary` (`#4CAF50`) / white text, `font-extrabold`, `px-4 py-2` scale, `hover:bg-secondary`.
- **Secondary/Outline:** white background, `2px` brand-green border, green text; inverts to filled on hover.
- **Ghost:** transparent background, green text, used for "See All" / inline links.

### Chips / Status Tags
- **Style:** `shelf-tag` pattern — small pill, `10px` uppercase mono label, tinted background at ~10% opacity of its status color (green/amber/red/blue), tiny dot indicator on the left edge.
- **State:** color swaps entirely by status (green = operational, amber = caution, red = alert, blue = informational) — never mixed with brand green for non-brand meanings.

### Cards / Containers
- **Corner Style:** `12–16px` radius.
- **Background:** white on both storefront and admin (admin cards sit on the ledger-paper background).
- **Shadow Strategy:** border-first (see Elevation); shadow only on hover/interactive states.
- **Border:** `1px` hairline divider color.
- **Internal Padding:** tight (`p-1.5`–`p-3`) on grid tiles, more generous (`p-4`–`p-6`) on standalone cards/panels.

### Inputs / Fields
- **Style:** `1px` divider border, `rounded-xl`/`rounded-full` (search bars), soft `bg-background` fill at rest.
- **Focus:** border shifts to brand green plus a soft `ring-2 ring-primary/20`.
- **Error:** border/text shift to `#FF3B30` with a small inline message below.

### Navigation
- **Top app bar:** sticky, white, tints to the active category's own color at ~5–12% opacity when a category is selected — the one place per-category color is allowed to lead.
- **Bottom tab bar (mobile):** 4 items (Home / Order Again / Categories / Profile); inactive tabs show icon only, the active tab expands into a pill (`bg-primary/10`, rounded-full) with icon + label — this asymmetry is deliberate, not truncation.
- **Admin sidebar:** dark control-tower ink, collapsible, active/hover states lighten to `admin-ink-soft`.

## Do's and Don'ts

### Do:
- **Do** keep the brand green as the single accent color; every other color must be functional (status) or neutral.
- **Do** separate in-flow surfaces with a 1px hairline border/divider before reaching for a shadow.
- **Do** use full-pill radius for every button, badge, and chip; use 12–16px for cards and containers.
- **Do** keep body text small-and-bold rather than large-and-light, given the density of the product grid.
- **Do** reuse existing shared components (`ProductCard`, `Header`, `BottomNav`, `BannerCarousel`) instead of building page-specific one-offs.

### Don't:
- **Don't** add gradients, glassmorphism, or heavy multi-layer shadows to static cards — depth is earned only by floating elements (modals, dropdowns, the floating cart pill).
- **Don't** introduce a second accent color for "visual interest" — if it's not brand, success, warning, or error, it doesn't belong.
- **Don't** mix the storefront type pairing (Inter/Plus Jakarta) into admin screens or vice versa — the two registers stay separate by design.
- **Don't** redesign a page's structure to "modernize" it; refine spacing, consistency, and states within the existing Fresh Market Grid identity.
