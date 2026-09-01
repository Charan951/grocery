# FreshCart Mobile — UI/UX Design Review

> Reviewer perspective: senior mobile product designer + UX engineer.
> Scope: `mobileapp/` (Flutter).
> Date: 2026-08-31. Ranking: **P0** = serious usability · **P1** = noticeable design · **P2** = polish.
>
> **UPDATE 2026-08-31 — design-system consolidation applied.** All P0 items and
> most P1 items are ✅ fixed (see §6). Functionality/API untouched; `flutter
> analyze` clean, `flutter test` 100/100, debug APK builds. Remaining: a handful
> of P1/P2 polish items (per-screen photography, price/brand filters, large-text
> goldens, home rail curation).

---

## 0. Overall

The app is ~75% of the way to a coherent native product. The **rebuilt core flows**
(onboarding → login → OTP, Home, Categories, Category catalog, Product details,
Cart, Checkout, Order placed, Orders list, Order detail, Search, Wishlist,
Addresses, Wallet, Notifications, Profile edit, Stores) share the flat design
system, `AppScaffold`, `AppToast`, skeleton/empty/error components, and read as a
real app.

The **remaining prototype screens** (`location_select`, `membership`, `support`,
`profile`, `tracking`) and two **shared chrome components** (`bottom_nav`,
`floating_cart`) have not been brought onto the system and are dragging the
perceived quality down. They carry off-palette colours, a second card style,
centered web-style headers, `FontWeight.w900` micro-labels, and non-pinned CTAs.

| Dimension | Verdict |
|---|---|
| Visual hierarchy | ⚠ Good on rebuilt screens; flat/shouty on prototype screens (w900 everywhere = no hierarchy). |
| Spacing | ⚠ 16px gutter is the norm; `profile` uses 20, `location_select` mixes 10/12/14/16. |
| Typography | ⚠ Scale is defined but bypassed: raw `fontSize: 9–12`, `w900` beyond the w800 ceiling. |
| Colour usage | 🔴 4+ greens in play (`#4CAF50` system vs `#2E7D32`, `#00A86B`, `#0F3E21`) + lime `#C0FF00`. |
| Button hierarchy | ⚠ `PrimaryButton`/`SecondaryButton` are pills; prototype screens use ad-hoc `ElevatedButton`s at radius 16–20. |
| Card design | ⚠ Two systems: `GlassCard` (has a shadow) vs raw `Container`+border (no shadow). |
| Navigation | ⚠ Floating-pill bottom nav, labels only on the active tab, hides on scroll. |
| Information density | ⚠ `location_select` overloaded; Home is a very long repetitive scroll. |
| Touch targets | 🔴 Several < 48 dp (stepper, round icon buttons, inline text actions, inactive nav icons). |
| Forms | 🔴 `location_select` uses raw `TextField` + 10px uppercase labels; elsewhere `AppTextField` is good. |
| Search | ✅ Discovery (recents + trending) + debounced results + skeleton. Mic icon is decorative. |
| Filters | ✅ Bottom-sheet filter/sort with active-dot; limited options (no price/brand). |
| Empty states | ✅ `EmptyState` used consistently on rebuilt screens; absent on `location_select` / `support`. |
| Error states | ✅ `ErrorState` + retry consistent; action button isn't the app's pill style. |
| Loading states | ⚠ Skeletons on data screens ✅; product-card image placeholder is a spinner (others shimmer). |
| Images | ⚠ `CachedNetworkImage` everywhere now ✅; category tiles are icon glyphs, not photos. |
| Icons | ⚠ Mostly `_rounded` ✅; product/category icons guessed from strings → generic-basket fallback common. |
| CTA placement | ⚠ Pinned on PDP/Cart/Checkout/Onboarding ✅; buried at scroll-bottom on `tracking` & `location_select`; **`membership` has none**. |
| Bottom navigation | 🔴 See §3.1. |
| Header design | ⚠ Three header systems; Account tab missing the hairline the other tabs have. |
| Consistency between screens | ⚠ Title casing, back-icon size, card style, header style, gutter all vary. |
| Accessibility | 🔴 Contrast failures on green/amber text; `Semantics` only on the bottom nav; sub-12 sp text. |
| Mobile usability | ⚠ Solid on core flows; the 5 prototype screens feel like ported web pages. |

---

## 1. Screens that read as a website, not a mobile app

Ranked worst-first.

### 1.1 `location_select_screen.dart` — **P0**
The clearest "web form on a phone". On the critical sign-up path.
- `Scaffold` + `AppBar(elevation: 0.5)` with a two-line title inside a `Row`
  (icon-chip + "Select Delivery Location" / "Pin exact location on OpenStreetMap").
- Off-token surface `Color(0xFFF9FAFB)` and off-palette accent `Color(0xFF00A86B)`
  used **9 times** (chips, buttons, borders, icons, map accent).
- A search `TextField` + a green "Locate Me" `ElevatedButton` side-by-side (desktop pattern).
- A horizontal `ActionChip` row labelled "POPULAR:" in 10 px `w900`.
- A tinted `Color(0xFFE8F5E9)` panel containing two raw `TextField`s with
  `labelText` in 10 px uppercase, plus `ChoiceChip`s.
- A "SAVED ADDRESSES" list.
- The **primary CTA ("Confirm & Deliver Here") sits at the bottom of a long
  scroll** — not pinned. On a small phone the user scrolls past the map + two
  forms + the saved list before reaching it.
- `FontWeight.w900` × 6, font sizes 10/11/12 throughout, radii 12/16/20 mixed.

### 1.2 `membership_screen.dart` — **P1**
A marketing landing section.
- Hero "VIP CLUB" card (`GlassCard`, `borderColor: primary`, `borderWidth: 1.5`),
  then a perk list with `SizedBox(height: 32/48)` breathing room.
- **Hardcoded `Member ID #FC-VIP-99321`** and `const Divider(color: Colors.white12)`
  — the divider is invisible / wrong on the light theme, so the card looks broken.
- **No CTA** — you can't join, upgrade, or do anything. Dead-end page reached from
  the Profile VIP card and the avatar badge.
- Centered `AppBar` title "VIP Membership" + custom back `IconButton(size: 18)`.

### 1.3 `support_screen.dart` — **P1**
- `AppBar` title **"Live Socket Support Chat"** — engineer-speak, centered.
- Chat itself is acceptable (green user bubbles, grey agent bubbles) but uses
  `GlassCard` for bubbles, a `GlassCard` input row at radius 24, and a circular
  send button. No empty state; seeded with one hardcoded agent line.
- Message timestamp: hour not zero-padded (`9:5`).

### 1.4 `profile_screen.dart` — **P1**
Reads like a web "Account settings" page.
- `Scaffold` + `AppBar("My Profile", centerTitle: false)` — **no hairline** (other
  tabs have one), title casing inconsistent ("My Profile" vs the "Cart"/"Wishlist"
  pattern).
- Body is `SingleChildScrollView` at a **20 px gutter** (rest of app uses 16).
- Menu = `GlassCard`s wrapping `ListTile`s with 14 px trailing chevrons — a
  desktop settings list.
- Logout is an `ElevatedButton` at radius 20 with an 8 %-opacity red fill — not
  `SecondaryButton`, not a pill, doesn't match any other destructive action
  (which use `AppModal.confirm` + pill buttons).
- `SizedBox(height: 120)` bottom spacer (magic number).

### 1.5 `tracking_screen.dart` — **P1**
- Fixed `Expanded(flex: 4)` map / `Expanded(flex: 5)` sheet split — on a short
  device the status list is cramped; on a tall device the fake map is huge.
- The "map" is a `CustomPaint` (`TrackingMapPainter`) abstract illustration, not a
  real map — even though `mapcn_flutter` renders a real map on the location
  screens. Feels like a placeholder.
- Custom `_buildTimelineItem` with `IntrinsicHeight` + hand-drawn connectors
  (a third timeline implementation — Order detail and Notifications each have their own).
- The only screen CTA, "Back to home", is a `PrimaryButton` at the **bottom of the
  scroll** — invisible until you scroll the status list.
- Centered `AppBar` title "Track · <id>" + a "Live/Reconnecting" pill in `actions`.

### 1.6 `bottom_nav.dart` + `floating_cart.dart` (shared chrome) — **P0/P1**
Two stacked floating elements with heavy shadows and off-palette colour read as a
concept mockup rather than shipped chrome. Details in §3.

### 1.7 `home_screen.dart` — **P2 (feel, not broken)**
Not website-like structurally, but it's a **very long scroll**: category strip →
banner carousel → N special-group grids → "Fresh today" / "Organic" / "Best
sellers" rails → **one rail per category** → trust row. The curated rails and the
per-category rails look identical, so the page feels like an endless catalogue
rather than a focused 10-minute-delivery home.

---

## 2. Cross-cutting system issues

### 2.1 Colour drift — **P0**
Design system primary is `AppColors.primary = #4CAF50` (+ `#66BB6A`, `#81C784`).
In the wild:

| Colour | Where | Problem |
|---|---|---|
| `#2E7D32` (dark green) | `bottom_nav` active tab, `floating_cart` icon/text | Not a token; darker than primary → active nav doesn't match brand. |
| `#00A86B` (teal-green) | `location_select` (×9) | A completely different green. |
| `#0F3E21` (forest) + `#C0FF00` (lime) | `floating_cart` pill + accent | Lime is nowhere else in the product. |
| `#F9FAFB` | `location_select` scaffold bg | Should be `AppColors.background` `#F8FAF7`. |
| `Colors.green.shade50`, `Colors.amber`, `Colors.orange` | `location_select`, older wallet (now fixed) | Framework colours, not tokens. |

### 2.2 Contrast failures (WCAG AA) — **P0 (accessibility)**
- **`AppColors.primary` (#4CAF50) as text on white ≈ 2.8:1.** Used for every
  inline action: "See all", "Apply", "Remove", "Edit", "Change", "Clear",
  "Reorder", trending chips, `SectionHeader` action, `AppToast` action label. AA
  needs 4.5:1 for text < 18 px.
- **`AppColors.warning` (#FFB800) as text ≈ 1.9:1.** Used for "Only N left"
  (PDP), the OTP test-mode banner, tracking "Reconnecting".
- `AppColors.textSecondary` (#7A7A7A) on `#F8FAF7` ≈ 4.6:1 — passes AA for body
  but fails for the 10–11 px labels it's often used on (large-text rule doesn't apply).

### 2.3 Two card systems — **P1**
`GlassCard` (radius 16, 1 px hairline, `blur 8 / y 2` shadow) is used by
`product_card`, `category_card`, `search_bar`, `buttons`, `order_detail` (×4),
`profile` (×3), `membership`, `support` (×2), `tracking` (×2).
Newer screens (`cart`, `checkout`, `addresses`, `wallet`, `stores`,
`notifications`, `categories`, `orders_list`) use a raw
`Container(decoration: BoxDecoration(color: surface, borderRadius: AppRadius.brMd/brLg, border: divider))`
with **no shadow**. Side by side (e.g. Home rails' `GlassCard` product cards
above a shadow-less `_TrustRow`) the mismatch is visible.

### 2.4 Three header systems — **P1**
1. `HomeHeader` — custom flat bar (delivery time, address, bell, profile, search pill, cart).
2. **Tab AppBars** — `AppBar(centerTitle: false)` + a manual `PreferredSize`
   1 px hairline. Used by Categories / Search / Orders. **Account tab omits the hairline.**
3. `AppScaffold` — flat `AppBar`, `titleSpacing: 0`, left title, hairline,
   `arrow_back_ios_new` size **20**.
4. Prototype screens — raw `AppBar(centerTitle: true)` + `IconButton(arrow_back_ios_new, size: 18)`.

So: title alignment (left vs centre), back-icon size (18 vs 20), hairline
present/absent, and whether it's a component all vary by screen.

### 2.5 Typography scale bypassed — **P1**
- `AppTypography` tops out at `w800` (`display`/`h1`). `FontWeight.w900` appears
  8× in `location_select` and 2× in `floating_cart`, usually on 10–13 px text →
  dense and shouty, no hierarchy.
- Raw `fontSize:` values below the scale: `9, 10, 10.5, 11, 12.5` scattered
  (`bottom_nav` label 11, `floating_cart` 10–12, `location_select` 10–12,
  `product_card` weight label 10, order card badges). `labelSmall` is 11 and
  `bodySmall` is 12.5 — anything smaller should not exist.

### 2.6 Section-title rendered three ways — **P2**
`SectionHeader` widget (h3 at fontSize 22) · inline `AppTypography.h3` (18) ·
inline `AppTypography.title` (16). Home, Categories, Cart, Checkout, PDP, Orders
each pick differently, so "section heading" has no single size.

### 2.7 Title / label casing — **P2**
"Cart" · "Checkout" · "Wishlist" · "Orders" · "Categories" (good, terse) vs
"My Profile" · "FreshCart Wallet" · "Saved addresses" · "Store locations" ·
"VIP Membership" · "Live Socket Support Chat" · "Track · <id>". No rule.

### 2.8 Divider rendering — **P2**
`theme.dividerTheme` (1 px, `AppColors.divider`) exists, but code uses
`Divider(height: 24, color: AppColors.divider)`, `Container(height: 1, color: …)`,
and hardcoded `Divider(color: Colors.white12)` (breaks on light) interchangeably.

---

## 3. Bottom navigation & floating cart

### 3.1 Bottom nav (`bottom_nav.dart`) — **P0**
- **Labels only on the selected tab.** The four inactive tabs show an icon and
  nothing else (`grid_view`, `search`, `receipt_long`, `person`). New users can't
  identify tabs; returning users rely on position memory. This is the single
  biggest nav usability issue.
- **Inactive hit area ≈ 36 dp** (icon 20 + `padding: symmetric(h: 8, v: 8)`),
  below the 48 dp minimum.
- Active colour `#2E7D32` (see §2.1) — active state doesn't read as the brand green.
- **Floating pill**: `height 70`, `borderRadius 35`, `margin 16`, `boxShadow blur 20`.
  A capsule nav is a stylistic choice, but combined with the shadow and the
  scroll-hide behaviour it reads as a concept, not platform chrome. Native
  quick-commerce apps (Blinkit, Zepto, Instamart) use a full-width bar with all
  five labels always visible.
- **Scroll-to-hide** (`main_shell.dart` `AnimatedSlide`): the *primary* navigation
  slides away on downward scroll. Users lose their anchor and can't switch tabs
  without scrolling back up.
- ✅ `Semantics(button, selected, label)` is present — good, keep.

### 3.2 Floating cart (`floating_cart.dart`) — **P0 (wrong data) / P1 (style)**
- **Hardcoded `threshold = 400.0`** for free delivery. The real value is
  `PricingConfig.freeDeliveryThreshold = 499`. The bar tells the user
  "Shop for ₹X more" using the **wrong number**.
- Off-palette: lime `#C0FF00` accent, forest `#0F3E21` pill, `#E8F6EE` / `#1B2E24`
  bg, `#2E7D32` icon. None are tokens.
- `borderRadius: 30`, `boxShadow blur 15`. Stacked *above* the floating pill nav
  (`bottom: 84` when nav visible) → two floating rounded bars with shadows,
  one on top of the other.
- Copy "Unlock FREE Delivery" / "Free delivery unlocked!" competes with the item
  count + total, which is what the user actually wants from a cart bar.

---

## 4. Findings by dimension

### Visual hierarchy
- **P1** `location_select`, `floating_cart`, old order/store code lean on
  `w900` + tiny type, so everything shouts equally → no hierarchy.
- **P1** `membership` hero card and perk list have near-equal visual weight; the
  (missing) primary action would normally anchor the page.
- **P2** Home: three curated rails + one rail per category are visually identical;
  nothing signals "this shelf matters more".

### Spacing
- **P1** Gutter drift: 16 (most) · 20 (`profile`) · 10/12/14/16 (`location_select`).
- **P2** Magic-number spacers (`SizedBox(height: 120)` in `profile`, `cart` old
  bottom padding) instead of a consistent bottom inset for the sticky bar.
- **P2** `AppSpacing` tokens exist but raw `EdgeInsets.all(14/18/24)` are common.

### Typography
- **P1** `w900` beyond the `w800` ceiling (§2.5).
- **P1** Sub-12 sp text (§2.5) — fails the recommended minimum for legibility.
- **P2** `letterSpacing` applied ad-hoc (`0.5`, `1.0`, `1.2`) on uppercase micro-labels.
- **P2** Fixed `SizedBox(height: 34)` for the product-card title will clip at
  large system font scale (Dynamic Type).

### Colour usage
- **P0** §2.1 drift.
- **P0** §2.2 contrast.
- **P2** `AppToast` background is always `#1C1C1E` regardless of theme (works, but
  not tokenised).

### Button hierarchy
- **P1** Prototype screens use bare `ElevatedButton` / `ElevatedButton.icon` at
  radius 12–20 (`location_select`, `profile` logout, old `addresses`), so the
  "primary button" is inconsistent in shape and colour.
- **P1** `EmptyState` / `ErrorState` actions are `ElevatedButton` (radius 16), not
  the app's `PrimaryButton` pill.
- **P2** `SectionHeader` "See all" and the many inline text actions have no
  pressed/disabled affordance and fail contrast (§2.2).

### Card design
- **P1** §2.3 two systems.
- **P2** `GlassCard` still named for glassmorphism that was removed (`blur` param
  ignored) — confusing for the next engineer.

### Navigation
- **P0** §3.1 bottom nav.
- **P1** Back affordance differs: `AppScaffold` back (20) vs prototype back (18)
  vs `HomeHeader` has no back (correct) vs `location_select` uses a `close_rounded`.
- **P2** No post-login "return to intended screen"; deep-linked users always land on Home (functional note, not visual).

### Information density
- **P0** `location_select`: map + 2 forms + chip rows + saved list on one scroll.
- **P1** Home length / rail repetition (§ Visual hierarchy).
- **P2** Order detail stacks 5 full-width cards (status, timeline, items, bill,
  delivery) — long but acceptable.

### Touch targets ( < 48 dp )
- **P0** Cart quantity stepper `_btn` = `InkWell` + `Padding(8)` + icon 16 ≈ **32 dp**.
- **P0** Bottom-nav inactive item ≈ 36 dp (§3.1).
- **P1** PDP `_RoundBtn` (back / wishlist / share) = `Padding(8)` + icon 20 ≈ 36 dp.
- **P1** Tracking `_buildRoundButton` (call / chat) = `Padding(10)` + icon 20 ≈ 40 dp.
- **P1** Inline text actions ("Apply", "Remove", "Change", "Clear", "See all",
  "Edit") are ~20 dp tall tap zones.
- **P2** PDP gallery dots, `categories` "See all" chevron.

### Forms
- **P0** `location_select` raw `TextField` + 10 px uppercase `labelText`; no
  `AppTextField`, no inline validation styling, no keyboard-aware pinning.
- **P1** `support` chat input is a `GlassCard` + bare `TextField` (no `AppTextField`).
- ✅ `login`, `otp`, `profile_edit`, `addresses` add-form, `cart` coupon use
  `AppTextField` / `PhoneField` / `OtpField` with labels, errors, and validation — good.

### Search
- ✅ Discovery view (persisted recents + live trending), 350 ms debounce,
  `SkeletonGrid`, count line, `EmptyState`.
- **P2** The mic icon in `CustomSearchBar` is decorative (no voice search) — remove
  or wire.
- **P2** Home's read-only search "pill" and the real search bar look different
  (pill has no mic, greyer).

### Filters
- ✅ `AppBottomSheet` filter/sort with an active-filter dot on the `tune` icon;
  organic switch + sort radio.
- **P1** Only organic + 4 sorts. No price range, brand, or in-stock (web has more).
- **P2** Sub-category chips + filter sheet are two separate filtering models on
  the same screen — a first-time user may not realise both exist.

### Empty states
- ✅ `EmptyState` (icon-in-circle, h3, bodyMedium, optional action) on Cart,
  Wishlist, Orders, Search, Category catalog, Categories, Home, Addresses,
  Notifications.
- **P1** `location_select` (no saved addresses → plain grey sentence) and
  `support` (no empty state) are exceptions.
- **P2** `EmptyState` action button style (§ Button hierarchy).

### Error states
- ✅ `ErrorState` (wifi-off icon, retry) consistent across data screens; retry
  re-invokes the provider.
- **P2** Retry button is `ElevatedButton` at `AppColors.error` radius 16 — visually
  a different button from everything else.
- **P2** A couple of older call sites still pass `e.toString()` as the description
  (leaks stack-ish text) — check `tracking` / any missed screen.

### Loading states
- ✅ `SkeletonList` / `SkeletonGrid` / `ProductRailSkeleton` / `_HomeSkeleton` /
  `_PdpSkeleton` / `_DetailSkeleton` / `_CategoriesSkeleton` / `LoadingOverlay`.
- **P1** `product_card` image placeholder is a `CircularProgressIndicator`; every
  other image uses a calm shimmer/grey box. Spinners inside a scrolling grid draw the eye.
- **P2** `splash_screen` waits a hardcoded 2200 ms even when hydration finished sooner.

### Images
- ✅ `CachedNetworkImage` on product cards, PDP gallery, cart rows, order thumbs,
  banners, special groups, onboarding collage, with `errorWidget` fallbacks.
- **P1** Category tiles (`categories` screen + Home strip + `CategoryCard`) are
  **icon glyphs**, not photography. Web shows deterministic category photos. The
  grocery categories feel generic without imagery.
- **P2** `product_card` / `product_details` fallback icon is chosen by
  `_getProductIcon(imageUrl)` — a heuristic on the *URL string* — so a missing
  image usually shows a generic shopping-bag.
- **P2** Onboarding collage: 3 columns at `Transform.translate` offsets `[18, 0, 30]`
  can look misaligned at some heights.

### Icons
- **P1** `CategoriesScreen.iconFor()` / `CategoryCard._getCategoryIcon()` /
  `product_card._getProductIcon()` all string-match to guess an icon; the common
  outcome is `Icons.shopping_basket_rounded` / `shopping_bag_rounded`.
- **P2** A few sharp icons among the `_rounded` set (e.g. `Icons.circle` in the
  tracking connection pill).
- **P2** Bottom-nav icons: `grid_view_rounded` for "Categories" and
  `receipt_long_rounded` for "Orders" are not self-evident without labels (§3.1).

### CTA placement
- ✅ Pinned bottom CTA on PDP (`bottomSheet`), Cart / Checkout (`CheckoutBar` as
  `bottomNavigationBar`), Onboarding, Auth (`AuthScaffold`).
- **P0** `location_select` "Confirm & Deliver Here" not pinned — bottom of a long scroll.
- **P1** `tracking` "Back to home" buried at scroll bottom.
- **P1** `membership` — no CTA at all.
- **P2** `order_placed` stacks Track / Continue / "View my orders" — three CTAs of
  descending weight is fine, but "View my orders" is a `TextButton` with the
  low-contrast green (§2.2).

### Bottom navigation
- **P0** §3.1.

### Header design
- **P1** §2.4 three (four) systems; Account tab missing the hairline.
- **P2** `HomeHeader` right side: bell + profile circles 8 px apart, each ~40 dp —
  slightly cramped; and that's 4 tap targets (address, bell, profile, search, cart
  = 5) in a compact header.
- **P2** Tab AppBar titles ("Categories", "Search", "Orders") duplicate the
  bottom-nav label directly below them — redundant on a small screen.

### Consistency between screens
- **P1** §2.3 cards, §2.4 headers, §2.7 casing, back-icon size, gutter.
- **P1** Three separate status-timeline implementations (`order_detail` `_Timeline`,
  `tracking` `_buildTimelineItem`, `notifications` inline) with different dot sizes
  and connector styles.
- **P1** Three "trust row" treatments: Home `_TrustRow`, PDP `_TrustBlock`,
  membership perk list — overlapping copy, different layout.
- **P2** Stepper control differs: Cart `_Stepper` (green rounded rect, white
  glyphs) vs PDP sticky-bar stepper (green pill, `IconButton`s) vs old
  `quantity_selector.dart` widget (unused?).

### Accessibility
- **P0** Contrast (§2.2).
- **P0** Touch targets (§ Touch targets).
- **P1** `Semantics` only on `bottom_nav`. Icon-only controls with no label:
  PDP share / wishlist, catalog `tune` filter, Home bell, cart stepper, tracking
  call / chat, wallet referral copy, wishlist remove-×.
- **P1** Colour-only signalling: order status badges, "Selected" address, organic
  dot rely on colour; most have text too, but the address "Selected" is a green
  dot-word that's low contrast.
- **P2** Fixed-height containers (`SizedBox(height: 34)` card title, OTP boxes
  48×56, steppers) will clip / overflow at `textScaleFactor` ≥ 1.3.
- **P2** No `MediaQuery.textScaler` clamping or golden tests at large text.

### Mobile usability
- ✅ Core browse→buy→track flows feel native and are testable.
- **P1** Scroll-hiding the primary nav (§3.1).
- **P1** `location_select` completion friction on the critical path (§1.1).
- **P2** `membership` / `tracking` dead-ends and buried CTAs.

---

## 5. Per-screen quick reference

| Screen | State | Notes |
|---|---|---|
| Splash | ✅ | Fine. Hardcoded 2.2 s delay (P2). |
| Onboarding | ✅ | Real image collage; column offsets can misalign (P2). |
| Login / OTP | ✅ | `AuthScaffold`, `PhoneField` / `OtpField`. Clean. Green link contrast (P0-global). |
| **Location select** | 🔴 | §1.1 — web form, off-palette, non-pinned CTA, raw `TextField`s. |
| Home | ⚠ | Native structure; long repetitive scroll (P2); header a touch busy (P2). |
| Categories | ✅ | Good. Icon tiles instead of photos (P1). |
| Category catalog | ✅ | `AppScaffold`, filter sheet, `SkeletonGrid`. Two filter models (P2). |
| Product details | ✅ | Gallery + sticky bar. Round buttons < 48 dp (P1). |
| Search | ✅ | Discovery + results. Decorative mic (P2). |
| Wishlist | ✅ | `AppScaffold`, remove-× overlay < 48 dp (P1). |
| Cart | ✅ | `AppScaffold`, `BillingSummary`. Stepper < 48 dp (P0). Inline coupon actions contrast (P0-global). |
| Checkout | ✅ | `AppScaffold`, `LoadingOverlay`, payment tiles. |
| Order placed | ✅ | Animated tick + ETA pill. "View my orders" low-contrast link (P2). |
| Orders list | ✅ | Active/Past split, thumbnails, reorder. |
| Order detail | ✅ | Timeline + thumbnails. `GlassCard` × 4 vs neighbours' plain cards (P1). |
| **Tracking** | ⚠ | §1.5 — fixed flex split, fake map, buried CTA, third timeline impl. |
| **Membership** | ⚠ | §1.2 — no CTA, hardcoded ID, broken divider on light. |
| **Support** | ⚠ | §1.3 — "Live Socket Support Chat" title, no empty state. |
| **Profile** | ⚠ | §1.4 — settings-list look, 20 px gutter, no hairline, odd logout button. |
| Profile edit | ✅ | `AppScaffold` + `AppTextField`. Clean. |
| Wallet | ✅ | Rebuilt flat. Clean. |
| Notifications | ✅ | Activity feed + `EmptyState`. Third timeline-ish layout (P1). |
| Stores | ✅ | Rebuilt flat, Call / Directions. |
| **Bottom nav** | 🔴 | §3.1 — labels only on active, < 48 dp, floating pill, hides on scroll. |
| **Floating cart** | 🔴 | §3.2 — wrong ₹400 threshold, lime/forest off-palette, stacked floating bar. |

---

## 6. Consolidated issue list

### P0 — serious usability problems — ✅ ALL FIXED
1. ✅ **Bottom nav** rebuilt: full-width flat bar, all 5 labels always visible, `primaryText` active, ≥56 dp targets; `main_shell` no longer hides it on scroll.
2. ✅ **Cart bar** reads the real `PricingConfig.freeDeliveryThreshold` (no more hardcoded ₹400).
3. ✅ New `AppColors.primaryText` (#2E7D32, ~4.6:1) / `warningText` (#8A5A00) tokens; swept every inline action + "Only N left" + test-mode banner (11 files).
4. ✅ Off-palette greens (`#00A86B`, `#2E7D32`-literal, `#C0FF00`, `#0F3E21`) and off-token backgrounds removed from `lib/`.
5. ✅ `location_select_screen`: flat hairline AppBar + `AppColors.background`, `#00A86B`→tokens, `w900`→`w700`, **primary CTA pinned** to `bottomNavigationBar`.
6. ✅ New `QtyStepper` (≥40/48 dp) on cart + PDP; bottom-nav items ≥56 dp; `AppIconButton` (≥44 dp) for icon-only controls; `SectionHeader` action is a 28 dp `InkResponse`.

### P1 — noticeable design problems
7. ✅ Headers: pushed → `AppScaffold`; tabs (incl. Account) → `AppBar(centerTitle:false)` + hairline; `location_select` matched.
8. ✅ One card: `GlassCard`/`AppCard` is fully flat (shadow removed) → converges with the raw-`Container` cards.
9. ✅ `w900` gone from `lib/`; `DiscountBadge` / `product_card` weight label bumped to ≥ 11 sp. (Remaining sub-11 in a few dense badges — P2.)
10. ✅ `membership_screen` → `AppScaffold`, hardcoded `Colors.white12` divider + fake Member ID removed. (Still no join CTA — deliberate: that's a feature, not a design fix.)
11. ⚠ `tracking_screen` → `AppScaffold`, "Back to home" CTA moved to `bottomNavigationBar`, tokens. The fixed `flex 4/5` split + `CustomPaint` map are unchanged (map is functional; a real map needs a rider-GPS feed).
12. ✅ PDP round buttons → `AppIconButton` (44 dp + labels); wishlist remove-× and tracking call/chat still to migrate — **P2**.
13. ✗ Category tiles are still icon glyphs (no subcategory image field from the API) — **P1 open**.
14. ✗ Icon-by-string heuristic unchanged — **P1 open**.
15. ✅ `EmptyState` / `ErrorState` use `PrimaryButton`; prototype-screen `ElevatedButton`s replaced with `PrimaryButton`/`SecondaryButton`.
16. ⚠ One `QtyStepper` now. Timelines: Order-detail + Notifications share a look; `tracking`'s is a deliberately different *progress stepper* — left as-is. Trust rows (Home vs PDP) not yet merged — **P2**.
17. ✅ `support_screen` → `AppScaffold`, title "Help & support", flat bubbles, zero-padded timestamps, `AppIconButton` send. (No empty state — the thread is always seeded with an agent greeting.)
18. ✅ `profile_screen` → "Account" + hairline, 16 gutter, flat cards, `SecondaryButton` + `AppModal.confirm` logout.
19. ✅ `product_card` placeholder → calm grey box.
20. ✗ Filters still organic + 4 sorts; the chip-strip + sheet duality unchanged — **P1 open** (needs `minPrice/maxPrice` + brand UI).
21. ⚠ `AppIconButton` (mandatory label) added and used on PDP + support + stores; bell / catalog filter / copy / wishlist-× still to migrate — **P2**.
22. ✅ Primary nav is now persistent.

### P2 — polish
23. ✅ `SectionHeader` locked to one size (h3 = 18) + optional subtitle.
24. ✅ Titles retitled ("Account", "VIP membership", "Help & support", "Order #<id>", "Select delivery location"). Casing rule: sentence case, terse.
25. ✅ `Colors.white12` divider removed. (Divider *rendering* still varies — `Divider` vs `Container(height:1)` — cosmetic.)
26. ⚠ `AppRadius` adoption improved in the rebuilt widgets; raw `circular()` still in older screens — open.
27. ✅ `GlassCard` doc updated + `AppCard` typedef; `blur` still accepted (dead) for call-site compat.
28. ⚠ `splash` 2.2 s and home rail curation — open. Onboarding offsets unchanged.
29. ⚠ `HomeHeader` spacing — open. Tab-title/nav-label duplication — accepted (standard pattern).
30. Open — `AppToast` dark bg (readable in both themes).
31. ✅ `support` timestamps zero-padded.
32. Open — no `textScaler` clamp / large-text goldens; fixed-height card title.
33. Open — mic icon still decorative; `quantity_selector.dart` now genuinely dead (replaced by `QtyStepper`) — safe to delete.
34. ✅ `order_placed` "View my orders" + all tertiary green links → `primaryText`.

---

## 7. What's genuinely good (keep as-is)

- The flat design tokens (`AppColors` / `AppTypography` / `AppSpacing` / `AppRadius`) and the intent to match the web system.
- `AppScaffold`, `AppToast`, `AppModal`, `AppBottomSheet`, `LoadingOverlay`, the skeleton family, `EmptyState` / `ErrorState` — a real component layer.
- Auth flow visual quality (`AuthScaffold`, `OtpField`, `PhoneField`).
- Cart / Checkout / PDP sticky-CTA pattern.
- `CachedNetworkImage` adoption with error fallbacks.
- Pull-to-refresh + typed loading/empty/error on every data screen.
- `bottom_nav` `Semantics` (the labelling approach is right even if the visual isn't).
