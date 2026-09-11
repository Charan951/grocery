# Project Memory — FreshCart

> Before any implementation work, read this file AND `MOBILE_APP_IMPLEMENTATION.md` first.
> `KNOWLEDGE_BASE.md` is the authoritative "what exists" reference — re-derive from
> code if it diverges. `PRODUCT.md` / `DESIGN.md` hold product + design intent.
> Verify memory against real code before relying on it. Code wins over stale memory.

## 1. Project Snapshot

- **Product**: FreshCart — Zepto/Blinkit-style quick-commerce grocery platform,
  10-minute delivery promise. India-first (₹, Indian addresses/phones). Single-tenant
  today; multi-tenant is a stated future direction (don't gold-plate for it, don't
  block it).
- **Monorepo, 3 apps**:
  - `backend/` — Node + Express (ESM) + MongoDB Atlas (Mongoose) + Socket.IO REST API, port 5000.
  - `frontend/` — React 19 + TS + Vite + Tailwind v4 SPA = public storefront **and** `/admin/*` ops console.
  - `mobileapp/` — Flutter customer app (package `freshcart`), partially built hybrid prototype.
- **Package managers**: npm (backend, frontend), pub (mobile).
- **DB**: MongoDB Atlas, one connection; server also runs DB-less via "offline mode" stub responses.
- **Auth**: JWT + RBAC for staff/admin (`User` model). Customers = phone-only lookup
  (`Customer` model), **OTP is fake on web** (`1234`); **mobile has real OTP + customer JWT since P0-2**.
- **Realtime**: Socket.IO — order rooms; server **emits `order_status_update`**

  on status change/create (P1-2); `rider_location_update` producer endpoint;

  support chat relay. Mobile has reconnect + 15s polling fallback.
- **Payments**: Razorpay **real (TEST keys)** — real gateway orders + HMAC signature

  verification + webhook. `PAYMENTS_TEST_MODE=false`. Wallet debit server-side.
- **Media**: Cloudinary URLs on models; Unsplash placeholder fallback.
- **Testing**: backend `npm test` (8 supertest/node:test integration tests); mobile
  `flutter test` (100); `.github/workflows/ci.yml`. See §12.
- **Deployment**: not configured in repo.

## 2. Architecture

- **Backend**: `/api` router `backend/src/routes/api.js` = offline-fallback
  middleware + mounts 8 domain route modules (`misc/catalog/order/commerce/
  customer/ops/payment/delivery.routes.js`). Controllers split by domain
  (2026-09-01) from the old `apiController.js` mega-file into
  `authController` (auth+dashboard), `catalogController` (product/category/brand/
  inventory/specialGroup/banner/promoCard), `orderController`, `customerController`,
  `reviewController`, `couponController`, `blogController`, `settingsController`,
  `supportController`, `employeeController`, `auditLogController`,
  `uploadController`, `paymentController`; shared helpers (`signToken`,
  `maskPhone`, `isPaymentsTestMode`, `razorpayInstance`, `logAudit`) in
  `controllers/_shared.js`. **`apiController.js` is now a re-export barrel** so
  every existing `import { xController } from './apiController.js'` still works.
  Plus `festivalCampaignController.js`, `adminDeliveryController.js`,
  `authCustomerController.js`, `deliveryController.js`. Models in `backend/src/models/`:
  `User`/`Role`, `Customer`/`Address`, `Order`, `Catalog` (Category/Brand/Product/
  SpecialGroup/Banner/PromoCard), `Inventory`, `Finance` (Coupon/Offer/Payment/
  WalletTransaction/Invoice), `Operations` (Review/Notification/CMSPage/Blog/
  Settings/AuditLog/SupportTicket), `FestivalCampaign`. Dead/unused models:
  `Role`, standalone `Address`, `Notification`, `CMSPage`, `Payment`, `Invoice`.
  `logAudit()` exists but is never called.
- **Frontend**: `App.tsx` (storefront routes) + lazy `AdminApp.tsx` (`/admin/*`).
  State = `CMSContext` (catalog/CMS, caches to `localStorage freshcart_cms_data_v2`)
  + `CartWishlistContext` (cart/wishlist in `localStorage`, qty cap 3/item).
  Customer identity = `localStorage customer_user`. `useSmartBack` hook for
  history-aware back nav. API base is `/api` (Vite proxy → `:5000`).
- **Mobile**: `core/` + `features/<name>/{data/models,presentation/{controllers,screens}}`.
  Riverpod state, `go_router` (no guards), `get_it` DI (`StorageService`,
  `ApiService`, `SocketService`), Dio REST, `socket_io_client`, Hive (schemaless).
  Bootstrap: `setupInjection()` (Hive + secure `TokenStore`). **MockDataService deleted in P0.**
  Base URL `http://10.0.2.2:5000/api` (Android emu) else `http://localhost:5000/api`.
  Nav (since P0-4): `routerProvider` GoRouter + `StatefulShellRoute`. **4 tabs
  (2026-09-08): Categories / Home / Orders / Account, Home centre (`kHomeNavIndex
  = 1`)** — Search dropped as a tab to match the web storefront; `/search`
  (`SearchScreen`) is now a root pushed route (festival cards still use it), the
  home search bar goes to `/search_detail`. `_handleBack`/back-to-home use
  `kHomeNavIndex`, not 0.

## 3. Design System

- Web (`DESIGN.md`): **flat**. White cards on warm off-white `#F8FAF7`, 1px
  hairline dividers, minimal shadow, no glass. Primary green `#4CAF50`, full-pill
  buttons, 12–16px radius. Plus Jakarta Sans (display) / Inter (body). Admin =
  deep-forest "control tower" ink theme.
  - **`--primary-strong` `#2E7D32`** (`text-primary-strong`/`bg-primary-strong`)
    — darker step of the *same* brand green for small/bold green text + active
    labels on light where `#4CAF50` is under 4.5:1. Not a second accent.
  - **`--sticky-header-h`** CSS var (default `128px`, refined at runtime by
    `Header.tsx`) drives `<main>` padding-top **and** the category strip's sticky
    offset. Read it bare — no fallback literals.
  - **Storefront shell is full-bleed** (`max-w-none`, no `1280px` cap);
    `body,#root` clip horizontal overflow, wide rows scroll in their own
    `overflow-x` containers. `useIsMobile(bp)` (`hooks/useIsMobile.ts`) is the
    one viewport source of truth (breakpoints: 640 header/app-shell, 768
    category nav / festival block).
- Mobile: **P0-5 aligned it to the flat web system**; **design-system
  consolidation 2026-08-31** finished the job — `GlassCard`/`AppCard` is fully
  flat (hairline only, **no shadow**); one full-width flat bottom nav (all 5
  labels, `primaryText` active, never hidden); one `QtyStepper`; one
  `SectionHeader` size; one `AppIconButton` (≥44 dp + semantic label);
  `EmptyState`/`ErrorState` use `PrimaryButton`. Off-palette greens
  (`#00A86B`, `#2E7D32`-literal, `#C0FF00`, `#0F3E21`) and `FontWeight.w900` are
  gone from `lib/`.
- **Colour tokens** (`AppColors`): fills — `primary` `#4CAF50`, `secondary`,
  `accent`; **text/link greens use `primaryText` `#2E7D32`** (`#4CAF50` on white
  ≈ 2.8:1, fails AA). `warningText` `#8A5A00`, `errorText` `#C62828` for small
  labels on light. `error` `#E53935`, `success` `#2E7D32`.
- Other tokens: `AppSpacing` (4–64, 16 px screen gutter is the norm) / `AppRadius`
  (xs 8 … xl 24, `pill` 100, `brSheet`) / `AppTypography` (Plus Jakarta Sans
  display w700–w800 / Inter body; **no `fontSize` below 11, no weight above
  w800**) / `AppTheme` (M3 light+dark), `flutter_screenutil` 390×844.
- **Headers**: pushed screens → `AppScaffold` (flat AppBar, `titleSpacing: 0`,
  left title, hairline, back icon 20). Tab screens → `AppBar(centerTitle: false)`
  + a 1 px `PreferredSize` hairline. Home → `HomeHeader`. `location_select` uses
  a raw AppBar styled to match (map screen).
- **Mobile UI foundation (FND, 2026-08-31)** — reusable `core/widgets/`, all flat:
  `foundation.dart` barrel re-exports the lot. `AppScaffold` (global page layout:
  themed bg, safe-area, flat AppBar + hairline, back button). `AppTextField`
  (labelled input, error/helper, obscure toggle — use instead of raw `TextField`;
  `CustomSearchBar` stays the home/search entry). `AppModal.show` / `.confirm`.
  `AppBottomSheet.show` (drag handle, keyboard + safe-area aware). `AppToast`
  (success/error/info/warning via global `scaffoldMessengerKey` — callable with no
  `BuildContext`; wired in `main.dart`) + `AppAlert` inline banner. `skeletons.dart`
  (`SkeletonBox/Line/Group`, `SkeletonProductCard`, `SkeletonList`, `SkeletonGrid`).
  `loading_overlay.dart` (`AppLoader`, `AppLoadingView`, `LoadingOverlay`).
  Pre-existing and unchanged: `buttons.dart`, `glass_card.dart`, `feedback_states.dart`
  (`LoadingSkeleton`, `EmptyState`, `ErrorState`), `bottom_nav.dart`, `badges`,
  `section_header`, product/category cards.

## 4. Engineering Decisions

- Decision: Mobile app is finished/rewired in place, not rebuilt. Reason: ~35
  screens + nav shell + design tokens already exist. Date: 2026-08-31.
- Decision: Reuse existing backend `/api` endpoints for the mobile app; only add
  new endpoints where a real customer app genuinely needs them (real OTP, customer
  JWT, push, reviews-create, coupon-validate, notifications list). Reason: user
  constraint + avoid regressions. Date: 2026-08-31.
- Decision: All three apps intentionally degrade to local mock/seed data when the
  backend is unreachable. Consequence: a rendered screen is NOT proof an
  integration works — always check network calls. (Pre-existing, from `PRODUCT.md`.)
- **Process rule (user, 2026-08-31): whole-product feature evaluation.** Any new
  feature is evaluated across the *entire* product **before** implementation —
  backend, DB, APIs, web, responsive web, mobile app, navigation, auth,
  permissions, notifications, images/media, and every state (loading / empty /
  error / success), plus performance, security, testing. **Never implement a
  feature in only one frontend unless the user explicitly asks.** Workflow:
  before coding → analyze → write a feature plan → confirm dependencies; after
  coding → test → fix → update docs (`KNOWLEDGE_BASE.md` / `CHANGELOG.md` /
  `MOBILE_FUNCTIONALITY_AUDIT.md` as relevant) → update `MEMORY.md`.
- **Reaffirmed (user, 2026-09-05):** every UI fix/change from here on must be
  applied to **both** the web frontend's mobile-responsive layout (`frontend/`,
  Tailwind breakpoints / `isMobile` checks) **and** the Flutter `mobileapp/` —
  not just one. Applies to bug fixes too, not only new features. If a change is
  genuinely web-only (e.g. an admin-only desktop screen) or mobile-only (native
  permission flow), say so explicitly instead of silently skipping the other
  side.
- **Reaffirmed again (user, 2026-09-09):** the parity rule covers the
  **delivery-partner surface** too — a change to the responsive web partner app
  (`frontend/src/partner/`) must also land in the Flutter **`deliveryapp/`**
  (its "mobile" counterpart), and vice-versa. Every such change: **check
  `MEMORY.md` first**, then implement across surfaces, then **verify** — backend
  `cd backend && node --test test/*.test.js`; web `cd frontend && npx tsc -b &&
  npm run build`; Flutter `cd deliveryapp && flutter analyze && flutter test`
  (APK build only on request) — then **update `MEMORY.md`**. Known-noisy: see §7
  for pre-existing test failures that are not regressions.

## 5. Completed Major Work

- **2026-09-11 (follow-up 5) — Order-lookup bug fix, delivery-code visibility, FCM
  Android permission fix, tracking-map zoom tightened (web+mobile), deliveryapp
  in-app route map, deliveryapp order history/profile/login fixes, orders-list
  filter parity (position + smart default) web+mobile.**
  - **Backend bug: `getCustomerOrders` (`orderController.js`) did an exact-string
    match** on `customerPhone`, but orders are stored as `"+91 6305804155"` while
    clients send the bare 10-digit number — "Your Orders" silently returned
    empty for a customer with real orders. Fixed to match on last-10-digits via
    regex, same pattern already used by `getMyOrders`/`getOrder` in the same file.
  - **Delivery OTP now rendered directly from the order object** on both
    `TrackOrder.tsx` (attaches `customer_token` so the owner-gated `deliveryOtp`
    field comes through) and mobile `tracking_screen.dart`/`order_detail_screen.dart`
    — no longer solely dependent on FCM push working.
  - **`deliveryapp` Android push was silently broken on Android 13+**:
    `AndroidManifest.xml` was missing `POST_NOTIFICATIONS` (mobile `mobileapp`
    already had it) — without it `FirebaseMessaging.requestPermission()` can't
    get the OS to grant notification display rights. Added the permission line.
    Web storefront still has **no FCM registration at all** (needs a Web App +
    VAPID key from the Firebase console — user deferred, in-app OTP card covers
    the gap for now).
  - **Tracking-map zoom was auto-fitting too far out** (`minZoom` had no floor,
    so a store↔drop pair a few km apart zoomed out to neighborhood level with a
    barely-visible route). Mobile `core/widgets/freshcart_map.dart` gained
    configurable `fitMinZoom`/`fitMaxZoom` (now `14.5`/`17.5`, was hardcoded
    `13.5`/`16.5`); `tracking_screen.dart` passes the tighter bounds + wired
    `onMapReady` to re-fit. Web `TrackOrder.tsx` Leaflet map now sets
    `minZoom: 14` on the map instance (so `fitBounds` can never zoom out past
    it) and raised `fitBounds` `maxZoom` `16→17`.
  - **`deliveryapp` gained its first in-app map** — previously "Navigate" only
    deep-linked to the external Google Maps app. New `core/widgets/
    delivery_map.dart` (`flutter_map`/OSM, same tightened zoom convention) shows
    a store→drop route preview inside `order_detail_screen.dart`'s destination
    card, above the external-navigate button. Added `flutter_map`/`latlong2` to
    `deliveryapp/pubspec.yaml` (same versions as `mobileapp`).
  - **`deliveryapp` history numbering**: `orders_screen.dart` now shows
    `"Delivery #N"` (partner's own lifetime sequence, `#1` = their first-ever
    delivery, computed from the unfiltered list so it's stable across the
    Delivered/Failed/Returned filter) instead of the raw DB `orderId`.
  - **`deliveryapp` profile**: `profile_screen.dart` — merged the standalone
    "Details" card (Phone/Email/Vehicle) into the top identity/name card
    (below the rating row) instead of a separate section further down.
  - **`deliveryapp` login overflow bug**: `login_screen.dart` — `heroHeight`
    was clamped to a minimum of 240px regardless of actual viewport height, so
    on a short window the login `Form` (no scroll fallback) hard-overflowed.
    Wrapped the `Form` in a `SingleChildScrollView`.
  - **Orders-list "Arriving in X minutes" removed** (premature — showed before
    the order was actually out for delivery) on both `mobileapp`
    `orders_list_screen.dart` and web `CustomerOrders.tsx` list badge; now shows
    the real status text. Order-detail page's ETA (gated on `isOutForDelivery`)
    was left as-is — already accurate.
  - **Orders-list filter — moved to the right + smart default, web+mobile
    parity**: web `CustomerOrders.tsx` filter pill `flex justify-end` (dropdown
    anchors `right-0`); mobile `orders_list_screen.dart` `_TabBar` `Align`
    `centerLeft→centerRight`. Both now default the filter once orders load:
    prefer **"In Progress"** (something to track), else **"Delivered"**, else
    leave **"All"** — a one-time guard so it never overrides a manual filter
    change afterward.
  - Verified: `flutter analyze` clean on every touched `deliveryapp`/`mobileapp`
    file; `tsc --noEmit` clean on `frontend` after each web change; backend
    endpoint spot-checked with `curl` (phone-match fix confirmed returning the
    real order). No full `flutter test`/`npm run build`/backend suite re-run
    this session — worth doing before the next release cut.

- **2026-09-11 (follow-up 4) — Renamed "In Transit" to "In Progress" across stack & updated mobile app to mirror frontend mobile-responsive order cards.**
  - **"In Transit" -> "In Progress" Status Terminology:**
    - **Mobile App** (`orders_list_screen.dart`, `order_model.dart`): `_OrdersTab` enum renamed `inTransit` to `inProgress`, label displays `"In Progress"`, filter predicate matches `o.isActive`, empty state displays `"No in progress orders"`. `orderStatusFrom` supports `'in progress'`.
    - **Web Storefront** (`CustomerOrders.tsx`): `StatusBucket` changed from `'In Transit'` to `'In Progress'`, filter popover dropdown options updated to `['In Progress', 'Delivered', 'Cancelled']`, card badges and arrival banners now check `bucketOf(order.status) === 'In Progress'`.
    - **Admin Console & Checkout** (`Orders.tsx`, `CheckoutModal.tsx`): Active/cancellable filter checks and order caching fallback include `'In Progress'`.
    - **Backend** (`Order.js`, `orderController.js`): `status` enum includes `'In Progress'` with default `'In Progress'`; `orderController.js` includes `'In Progress'` in `CANCELLABLE` list and status fallback.
  - **Customer Mobile Responsive Parity Updates in Flutter `mobileapp`:**
    - **Order Card Invoice Download** (`orders_list_screen.dart`): Added `_OrderInvoiceButton` directly on every `_OrderCard` in the orders list view, enabling instant PDF tax invoice download/print via `downloadInvoice(order)` without needing to open the details screen first.
    - **Active Order Pulse Header Pill** (`orders_list_screen.dart`): Active orders in the list display a green arrival pill (`Icons.bolt_rounded` + "Arriving in <eta>" / status) matching web `CustomerOrders.tsx`.
    - **Thumbnail Quantity Badges** (`orders_list_screen.dart`): Item thumbnails in `_Thumbs` now display an `x{qty}` badge overlay for multi-pack items (`quantity > 1`).
    - **Active Order Header Banner** (`order_detail_screen.dart`): Active orders now show a prominent top status card with bolt icon and arrival time (`Arriving in ...` / `In Progress`) matching web.
    - **Delivery Code (OTP) Card in Live Tracking** (`tracking_controller.dart`, `tracking_screen.dart`): Added `deliveryOtp` to `TrackingState` and rendered `_DeliveryOtpCard` with large tabular OTP digits on the live tracking screen matching `TrackOrder.tsx`.
  - **Verification:**
    - Mobile App: `flutter analyze lib/` clean (0 issues), `flutter test` passed 123/123.
    - Web: `npx tsc -b` clean (0 issues), `npm run build` production bundle generated cleanly.
    - Backend: `node --test test/api.test.js` passing (24 pass / 3 baseline pre-existing failures).

- **2026-09-11 (follow-up 3) — Tax Invoice PDF download parity (web + mobile), switch COD to prepaid via Razorpay, customer delivery OTP card, filter menus, and auto-dispatch broadcast dispatch.**
  - **Tax Invoice / Credit Note PDF Generation & Download (Web + Mobile parity):**
    - **Web** (`frontend/src/utils/invoice.ts` + `CustomerOrders.tsx` / `TrackOrder.tsx`): integrated `jspdf` (`downloadInvoice`) to generate and download client-side tax invoices without extra server roundtrips. Features brand header (`FreshCart`, South Hub / GSTIN, green branding), order metadata (Order ID, date, payment method, delivery address), itemized table with weight specifications, quantity, unit price, and line amount, plus breakdown of Item Total, Delivery Fee, Handling Fee, Discount, and Total Bill. Connected to "Download Invoice / Credit Note" button on `CustomerOrders` and `TrackOrder`.
    - **Mobile** (`mobileapp/lib/core/utils/invoice.dart` + `order_detail_screen.dart`): added `pdf` and `printing` packages (`Printing.layoutPdf` opens browser print/save-as-PDF dialog on web and native share/print sheet on mobile). 1:1 parity with the web PDF layout and styling. Added `_DownloadInvoiceButton` to `order_detail_screen.dart`.
    - **Admin Print Invoice** (`frontend/src/pages/admin/Orders.tsx` + `index.css`): Added print-only tax invoice layout (`.print-invoice` media query styles in `index.css`) designed exclusively for `window.print()` (clean print table, buyer/seller blocks, tax details, itemized totals).
  - **Switch COD to Prepaid (UPI / Card via Razorpay) for active orders:**
    - **Web** (`CustomerOrders.tsx`): Active/in-transit COD orders display a "Switch to UPI / Card" action. It initializes Razorpay checkout, verifies HMAC signature with `/api/payment/verify`, updates payment status to paid, and hides the switch button.
    - **Mobile** (`order_detail_screen.dart`): Added `_SwitchToPrepaidButton` for active COD orders, invoking Razorpay and syncing verified payment status.
  - **Delivery OTP Card & Live Tracking Order Breakdown (Mobile):**
    - Customer app `order_detail_screen.dart` and live `tracking_screen.dart`: When delivery OTP is present, renders a prominent `_DeliveryOtpCard` ("DELIVERY CODE - Share this with your delivery partner at the door") with tabular bold OTP digits.
    - Live tracking screen (`tracking_screen.dart`) also gained an embedded Order Details breakdown (items list with weight specs, quantities, prices, and order total) and floating live ETA chip.
  - **Orders List Filter Modernization (Web + Mobile):**
    - Web `CustomerOrders.tsx`: Replaced horizontal category tabs with a compact dropdown popover (`SlidersHorizontal` + `AnimatePresence` menu with In Transit, Delivered, Cancelled, All Orders).
    - Mobile `orders_list_screen.dart`: Replaced horizontal chip row with a compact `PopupMenuButton` (`Icons.tune_rounded`, In Transit, Delivered, Cancelled, All Orders) matching web filter aesthetics.
  - **Backend Auto-Dispatch Broadcast Dispatch & Fleet Assignment:**
    - `backend/src/services/assignmentService.js`: Reworked `tryAssign` from sequential 1-by-1 offers to **broadcast dispatch** across all eligible candidates in the radius ring (`maxFanout`), expanding outward by base radius on subsequent retry batches.
    - Atomic acceptance: First partner to accept claims the order; losing active offers for that order are cancelled immediately and revoked over WebSocket (`delivery_offer_revoked`).
    - Early live tracking: Rider identity and live location coordinates are emitted starting from `Assigned` status so customer tracking initiates as soon as the rider accepts the order.
    - `completeForOrder(orderId, status)`: Ensures admin force-completing or failing an order frees the assigned partner from `activeOrderIds` and updates assignment & fleet stats.
    - One-off reconciliation script `backend/scripts/fix-stuck-active-orders.js` provided for existing DB partner records.
    - Added test coverage in `backend/test/delivery.test.js` for broadcast dispatch, multi-candidate decline, and concurrent acceptance.
  - **Delivery App (`deliveryapp`) Dashboard & Order Details Refresh:**
    - `dashboard_screen.dart`: Streamlined dashboard layout, removing redundant duplicate stats and empty states.
    - `order_detail_screen.dart`: Modernized with status badge card, items list with weight specs, delivery address, interactive timeline, and fail/problem report flow.
    - `filter_sheet.dart`: Reusable filter bottom sheet for Orders/Earnings screens.
  - **Verification:**
    - Backend: `npm test` passing (55 pass / 6 baseline pre-existing failures in delivery test).
    - Frontend: `tsc -b && vite build` built clean (production bundle generated).
    - Delivery app: `flutter analyze` clean (0 issues), `flutter test` 6/6 pass.
    - Mobile app: `flutter analyze lib/` clean (0 issues), `flutter test` 123/123 pass.

- **2026-09-11 (follow-up 2) — Customer `mobileapp/` tab-root screens gained a
  visible back-to-Home button, matching `deliveryapp/`'s pattern.**
  `deliveryapp` already had `core/widgets/tab_back_button.dart`
  (`TabBackButton`: `leading` icon on Orders/Earnings/Profile AppBars,
  `context.go('/')`) alongside `MainShell`'s `PopScope` (hardware back → Home
  first, exits only from Home). The customer app's `MainScaffold`
  (`features/home/presentation/screens/main_shell.dart`) already had the
  equivalent — and better — hardware-back handling (`_handleBack`: non-Home
  tab → Home; Home → double-tap-to-exit snackbar) but its 3 non-Home tab
  roots (Categories `/categories`, Orders `/orders`, Account `/account`) had
  **no visible back arrow** — `AppBar.leading` only auto-shows when
  `Navigator.canPop` is true, which it never is for a `StatefulShellBranch`
  root. Ported `TabBackButton` into `mobileapp/lib/core/widgets/
  tab_back_button.dart` (same `context.go('/')`) and added `leading: const
  TabBackButton()` to `categories_screen.dart`, `orders_list_screen.dart`,
  `profile_screen.dart` — Home (index `kHomeNavIndex = 1`) doesn't get one,
  since it's the destination, not a tab that needs escaping. Also removed a
  now-stale `checkout_flow_test.dart` test ("Clear asks for confirmation")
  covering the cart-screen Clear button that was intentionally removed in an
  earlier pass this session. Verified: `flutter analyze` clean, `flutter
  test` **123/123**. Web `frontend/` has no tab-root/back-arrow concept to
  mirror (its bottom nav lives inside one SPA route tree with normal browser
  back) — mobile-only by design, not a skipped side.

- **2026-09-11 (follow-up) — Critical bug: paid/placed orders could silently
  never reach the DB (admin console showed nothing).** Root cause was two
  layers of "fake success" masking real order-creation failures:
  1. `orderController.createOrder` (`backend/src/controllers/
     orderController.js`) wrapped `Order.create()` in a try/catch that, on
     *any* DB error, fabricated an **unsaved** mock order object and still
     returned `201 {success:true, order}` — the customer saw a normal success
     screen for an order that was never written. The specific trigger:
     `validatedItems` mapping ran `Product.findOne({$or:[{id:prodId},
     {_id:prodId}]})` unconditionally — Mongoose casts `_id` against its
     ObjectId schema type even inside `$or`, so any placeholder id (`'p_1'`,
     the client's own fallback for a cart item with no real product id, or
     test ids like `'p1'`) threw a CastError that hit this swallow-and-fake
     path. Fixed: only include `{_id: prodId}` in the `$or` when
     `mongoose.Types.ObjectId.isValid(prodId)`; the outer catch now returns a
     real `500 {success:false, message}` instead of a fake order.
  2. The DB-down offline-fallback middleware (`backend/src/routes/api.js`)
     treated `POST/PUT/PATCH /orders` the same as CMS/catalog writes — faking
     `{success:true, offlineMode:true, message:'Saved successfully'}` with no
     `order` object. Orders are money-and-inventory critical, unlike catalog
     data; fixed to return a real `503` for order writes while the DB is
     unreachable instead of pretending to save.
  3. **Web client never checked the response at all** —
     `frontend/src/components/CheckoutModal.tsx` `placeOrder()` did a bare
     `await fetch(...)` and ignored the result entirely, so `finish()` (the
     order-success screen) always ran regardless of what the backend actually
     did. Fixed to parse the JSON and throw when `!res.ok || !data.success ||
     !data.order?.orderId`, so `runCod`/`runRazorpay`'s existing catch blocks
     now correctly show an error and never call `finish()` for a
     non-persisted order. **Mobile (`api_service.dart createOrder`) already
     validated `data['order'] is Map`** — it was safe once the backend
     stopped shipping a fake `order` field, no mobile client change needed.
  - Payment routing itself (COD → order-placed; UPI/Card → Razorpay →
    verify → order-placed; failure/cancel → stays on Checkout with an inline
    error) was already correct on both surfaces — see the follow-up bullet
    below; this bug was purely "the write silently failed while everything
    downstream assumed it succeeded."
  - Verified: `node --test test/api.test.js` went from **18 pass / 9 fail
    (before this fix) → 24 pass / 3 fail (after)** — several previously
    "unrelated-looking" failures (order-dependent setup in cart/wallet-refund
    tests) were actually this same bug; the remaining 3 (`catalog is public,
    orders/reviews are staff-only`, `customer can cancel...wallet` amount
    mismatch, `legacy DELETE /customers/:id`) are pre-existing on baseline
    too — unrelated RBAC/shared-state flakiness, not caused by this change.
    `delivery.test.js` 55/61 pass (same 3 pre-existing zone/analytics/settings
    failures documented below). `frontend` `tsc --noEmit` + `npm run build`
    clean.

- **2026-09-11 — Customer cart/checkout decluttered (mobile + web parity) +
  delivery-partner assign-modal/profile/orders fixes.**
  - **Customer cart & checkout, `mobileapp/` + `frontend/`:** removed
    Delivery Instructions / Tip Your Delivery Partner / Gift Packaging
    sections from the cart screen (`mobileapp/lib/features/cart/presentation/
    screens/cart_screen.dart` `_DeliveryInstructionsSection`/
    `_DeliveryPartnerTipSection`/`_GiftPackagingSection` deleted; web mirror
    `frontend/src/components/CartDrawer.tsx` sections 6–8 + their
    `tipAmount`/`hasGiftPackaging`/`selectedInstructions` state removed, bill
    total simplified to `subtotal − discount`); removed the Search icon +
    Clear button from both cart headers; Cancellation Policy redesigned as an
    icon-led card (was plain text) on both surfaces. Checkout/payment screen
    (`mobileapp/lib/features/checkout/presentation/screens/checkout_screen.dart`)
    lost its standalone "Delivery" (Instant 10–15 min) tile — web
    `CheckoutModal.tsx` never had an equivalent standalone section (delivery
    ETA is inline in its order-summary header), so nothing to remove there.
    Payment routing already matched the requested UX and needed no change:
    COD → `submit()` → order placed → `/order-placed/:id`; UPI/Card →
    Razorpay → verify → same success screen; failure/cancel → inline error,
    stays on Checkout (`checkout_controller.dart` `_fail()` +
    `checkout_screen.dart` `ref.listen`).
  - **⚠ Tooling incident + fix:** a PowerShell `Get-Content`/`Set-Content`
    line-range deletion on `cart_screen.dart` (no `-Encoding utf8` on the
    *read* side) corrupted every `₹` in the file to `â‚¹` — not just the
    edited region. Caught from a garbled product price on screen, fixed with
    an `Edit` `replace_all`. **Lesson saved to global memory**
    (`feedback-powershell-file-encoding.md`): never bulk-edit a file with
    non-ASCII chars via PowerShell `Get-Content`/`Set-Content` without
    `-Encoding utf8` on both ends — prefer the `Edit`/`Write` tool for
    anything with ₹/emoji/curly-quotes.
  - **Delivery-partner admin/app fixes, same session:**
    - Admin "Assign Delivery Partner" modal (`frontend/src/pages/admin/
      Orders.tsx`) hardened against width-collapse with explicit inline
      `width`/`maxWidth`/`minWidth`/`flexShrink` (defensive — root cause
      unconfirmed, Tailwind class application suspected).
    - **Real bug found & fixed:** admin marking an order `Delivered`/`Failed`
      directly (bypassing the partner app's own completion flow) never freed
      the partner from `activeOrderIds` — they'd stay stuck unable to go
      offline forever even though the order showed finished. Fixed in
      `orderController.updateStatus` via new `assignmentService.
      completeForOrder(orderId, status)` (mirrors `cancelForOrder`: marks the
      `accepted` Assignment completed/failed, frees `activeOrderIds`, bumps
      completed/failedCount). One-off reconciliation script
      `backend/scripts/fix-stuck-active-orders.js` run once to un-stick
      already-affected partners in the live DB.
    - `deliveryapp/` Orders/Earnings screens: replaced permanent segmented
      tab rows with a single "three lines" filter icon
      (`Icons.filter_list_rounded`) opening a bottom sheet — new reusable
      `deliveryapp/lib/core/widgets/filter_sheet.dart`
      (`FilterAction`/`showFilterSheet`), web mirror `FilterMenu` added to
      `frontend/src/partner/ui.tsx`, wired into `History.tsx`/`Earnings.tsx`.
      Orders screen refresh icon removed from the AppBar (pull-to-refresh via
      swipe still works).
    - Partner Profile (both surfaces): iterated per user feedback — first
      trimmed to identity-only, then reverted to show avatar-free identity +
      full Details list (Phone/Email/Vehicle) per explicit "show all details,
      no avatar" ask; Edit action moved out of the AppBar/PageHead into an
      inline pencil icon next to the name (user: "edit should not be in app
      bar"); Log out given a red/danger style on mobile
      (`OutlinedButton.styleFrom(foregroundColor: kRed, backgroundColor:
      kRedSoft, side: BorderSide(color: kRed))`) — web already had this via
      `Btn variant="danger"`.
  - Verified: `flutter analyze` + `flutter test` clean on both `deliveryapp/`
    and `mobileapp/`; `tsc --noEmit` + `npm run build` clean on `frontend/`;
    backend `node --test test/delivery.test.js` — same 29 pass / 3
    pre-existing unrelated failures as baseline (§7), one new test added and
    passing (admin-Delivered frees the partner).

- **2026-09-09 — Delivery-partner self-service profile edit + redesigned Profile
  screen (all surfaces).**
  - **Backend**: new `PUT /api/delivery/me` (`protectDelivery`,
    `deliveryController.updateMe`) — partner edits own `name` (→ `User.name`,
    2–60 chars), `phone` (digits, `^[6-9]\d{9}$`; written to BOTH `User.phone`
    and `DeliveryPartner.phone`) and `vehicleType` (enum
    bike/scooter/bicycle/car/on_foot). Returns the same partner shape as
    `getMe` incl. recomputed `todayEarnings`. Test: `delivery.test.js` +1
    (edit round-trips + persists to `DeliveryPartner`; bad phone/vehicle/name
    → 400). Backend suite: 29 pass / **3 pre-existing unrelated failures**
    (analytics, PUT /settings, zones — §7 known-noisy, not regressions).
  - **Web** (`frontend/src/partner/`): `partnerApi.updateMe()`,
    `PartnerContext.updateMe()` (merges response into `partner`).
    `screens/Profile.tsx` fully redesigned — identity card (bigger avatar +
    availability pill + last-seen), 4-up stat row (Delivered/Failed/Rating/
    Today ₹), a **Details** card that swaps to an inline edit form (name +
    phone `Field`s, vehicle = chip selector, email shown read-only "managed by
    ops"), Save/Cancel with loading + inline error + "Profile updated" banner,
    then Shortcuts + Account sections. `tsc -b` + `vite build` clean.
  - **deliveryapp** (`deliveryapp/lib/`): `ApiClient.updateMe()`,
    `AuthController.updateProfile()`. `features/profile/profile_screen.dart`
    redesigned to match web (initial-avatar identity card + status chip,
    3-up stat cards, Details rows, Shortcuts, Support, Log out) + an **Edit
    profile bottom sheet** (`_EditProfileSheet`: name/phone `TextField`s with
    digit formatters, vehicle `ChoiceChip`s, same validation, `updateProfile`).
    `flutter analyze` clean, `flutter test` 6/6.

- **2026-09-08 — Web storefront: full-bleed responsive shell + shared viewport
  hook + festival-theme depth + Home render perf.** (⚠ uncommitted working tree.)
  Overwhelmingly `frontend/`-side; most of it is **web catching up to the
  Flutter app**, not new product behaviour. See "Flutter parity" note at the end.
  - **`frontend/src/hooks/useIsMobile.ts` (new)** — one `matchMedia` listener per
    breakpoint value, `useIsMobile(bp = 768)`. Replaces the per-component
    `useState + window resize` pattern in `App.tsx` (640), `Header.tsx` (640),
    `SuperCategoryNav.tsx` (768), `FestivalCampaignWrapper.tsx` (768) so the
    header / category strip / festival block flip at the same instant.
  - **Full-bleed layout** — every `max-w-[1280px]` page/shell container →
    `max-w-none` (`App` `<main>`, `Header`, `SuperCategoryNav`, `Home`,
    `ProductDetails`, `About`, `Blog`, `Brands`, `Categories`, `Offers`,
    `Stores`). `index.css`: `body, #root { overflow-x: hidden; max-width: 100vw }`
    (scoped so `position: sticky` still works); wide rows must scroll inside
    their own `overflow-x` containers.
  - **`--sticky-header-h` is now a real CSS var** (default `128px` in
    `index.css`). `Header.tsx` measures the expanded header once via a single
    `ResizeObserver` (was scroll+resize listeners + rAF); still only two discrete
    values — measured expanded height while open, `0px` the instant it collapses.
    **Every consumer reads bare `var(--sticky-header-h)`** — no per-component
    `140px`/`64px` fallback literals anymore.
  - **`--primary-strong` `#2E7D32`** token added (`index.css` + `@theme` →
    `text-primary-strong` / `bg-primary-strong`). Darker step of the one brand
    green for small/bold green text + active labels on light where `#4CAF50`
    fails AA. `SuperCategoryNav` active pill/label/underline now use it (was
    hardcoded `#0C831F`). **Mobile Flutter already had this as `primaryText`
    `#2E7D32`** — no change needed there.
  - `index.css` also: imports the 5 festival display fonts (Great Vibes,
    Rozha One, Cinzel Decorative, Satisfy, Pacifico); themed `::selection` +
    global `:focus-visible` ring; `@keyframes fade-in` / `.animate-fadeIn`
    (+ `prefers-reduced-motion` guard).
  - **`festivalThemeResolver.ts`** — `ResolvedFestivalTheme` gained `fontFamily`
    (real CSS stack from `FONT_STACKS` keyed by preset) and `cardText` (readable
    colour for content on `cardBg`); new exported `isDarkColor(hex)` luminance
    test; `cardBg` now honours `styling.cardBackground` / solid bg.
    **Mirrored into Flutter** (`festival_theme_resolver.dart`): added top-level
    `isDarkColor(Color)` + `ResolvedFestivalTheme.cardText` (white on a dark card
    bg, else the admin text colour if dark, else `#1C1C1E`). Font side was
    already covered by `AppTypography.festivalCalligraphy(..., fontPreset:)`.
  - **`FestivalCampaignWrapper.tsx`** — stopped synthesising placeholder groups /
    stock photos: renders nothing when a campaign has no configured groups
    (**Flutter already did this** — `activeGroups.isEmpty → SizedBox.shrink()`).
    New `festivalGroupHref(grp)`: 1 curated product → `/product/:id`, many →
    `/products?ids=a,b,c&title=`, none → `/products?search=<groupName>`. style2
    layout reworked to taller fixed-height image-cover cards. Heading uses
    `theme.fontFamily`.
    **`festival_campaign_section.dart` was then rewritten as a 1:1 port of the
    web component** (the old Flutter layout — title-on-solid-colour cards, hero
    height 215, per-count Row special-cases — looked nothing like web). Now:
    section `pt-5`/`px-4` (20/16) + `mb-5` cards block; title = "— CELEBRATE —"
    eyebrow (`theme.textColor` @ 0.72 opacity, `letterSpacing 3`) + festival name
    at 30 / `w400` via `festivalCalligraphy(fontPreset:)`. **style2** = left hero
    rotator (38%, 4.5 s cross-fade through every group×product pair, progress
    pills, discount badge, eyebrow/name/₹offer+strike-through MRP overlay) + right
    **2×2 full-bleed image grid** (62%, `gap-3`, bottom scrim, black-corner
    discount badge `theme.buttonColor`, white 13/`w900` title), fixed `h-320`.
    **style1** = uniform full-bleed image cards `h-150` (scrim + name + white
    chevron-circle + discount badge): 1–3 → single row, 4–6 → 3-col wrap, >6 →
    `PageView` of 3×2 grids. Group tap = `_openGroup()` (1 curated product →
    `/product/:id`, else matched category → `onOpenCategory`, else `/search`;
    Flutter has no `/products?ids=` route so multi-product groups fall back to
    category). Bottom `_ScallopPainter` (24 arches) kept as-is. Shared
    `_Scrim` / `_DiscountBadge` / `_cardImage` helpers.
    Follow-ups: the left hero now falls back to the group's resolved image
    (own → curated product → themed stock) via `imageFor`, so it's never a blank
    pink panel; and the no-single-product tap goes to `/search?q=<groupName>`
    (was empty `/search`) — `SearchScreen` gained an `initialQuery` param seeded
    from that query (`app_router` `/search` reads `?q=`).
  - **`SuperCategoryNav.tsx`** — removed the desktop left/right scroll-arrow
    buttons; removed the scroll-past-festival white-swap (**the bar keeps
    `festivalTheme.gStart` the whole time a campaign is active** so it's one
    continuous colour with the festival section below it); new
    `festivalCampaignOverride` prop (Home passes `activeCampaignForTab ||
    activeFestivalCampaign` — the *exact* campaign it renders — so the bar can't
    show a different theme than the section). Desktop active-tab underline
    animates via `transform: translateX + scaleX` (was `left`/`width`).
    `aria-current` / `aria-label` added.
  - **`Header.tsx`** — dropped the announcement bar + the mobile
    notifications/profile button cluster; location row is a real `<button>`
    (a11y) with "Add delivery address" fallback copy; palette tokens instead of
    hardcoded grays / `#0C831F`; **rotating search placeholder now mutates the
    `<input>.placeholder` via a ref on the 2s interval** instead of `setState`,
    so the whole Header no longer re-renders every 2s; search inputs got
    `aria-label`; header also hidden on the mobile profile route.
  - **`BottomNav.tsx` — 5 tabs → 4.** Removed the **Search** tab (search lives in
    the always-visible header bar). Now Categories / Home / Orders / Account,
    icons `House / Grid3x3 / Package / CircleUser`, `grid-cols-4`, active state
    neutral bold `text-gray-900` (green fill removed). **Mirrored into Flutter
    same day** — `bottom_nav.dart` (`kBottomNavDestinations` → 4, `kHomeNavIndex
    = 1`), `app_router.dart` (branches reordered Categories/Home/Orders/Account,
    `/search` moved to a root pushed `GoRoute`), `main_shell.dart` (`_handleBack`
    → `kHomeNavIndex`). Flutter keeps its Material icons + green active label
    (the documented mobile design system), not the web's neutral treatment.
  - **`Home.tsx` + `LazyRender.tsx` (new)** — `LazyRender` defers mounting a
    block until it scrolls within `rootMargin` of the viewport (Intersection
    Observer + height placeholder). Every additional super-category shelf and
    every `subCategorySections` entry past the first two is wrapped in it, so a
    super-category tab switch mounts ~1–2 shelves instead of ~15 (killed the
    ~588 ms click-handler jank). Also: `useTransition`'s pending flag drives a
    200 ms opacity dip on the content area during the swap; re-tapping the active
    tab early-returns; removed the "Fresh stock arriving shortly" empty-shelf
    filler; new "How to Order" 5-step section. **Flutter lists are already lazy
    (`ListView`/slivers build on scroll)** — no direct port.
  - **`App.tsx` `ScrollToTop`** — no longer hard-scrolls to top when only the
    `?superCategory=` query changed on `/` (keeps scroll position → tab switch
    feels in-place, not a reload). Web-router-specific; no Flutter analog.
  - **`Legal.tsx`** — back button (`useSmartBack`) in the standalone header.
  - **Mobile Flutter `location_select_screen.dart`** (the one genuinely-mobile
    change) — use `Geolocator.getLastKnownPosition()` for an instant map move,
    then refine with a fresh `getCurrentPosition` capped at 7 s so it can't hang;
    reverse-geocode Dio now has 5 s connect / 6 s receive timeouts; nominatim
    `zoom` 18 → 16.
  - **Also touched (same token/full-bleed/`useIsMobile` pass, not separately
    detailed here):** `Products.tsx`, `CustomerProfile.tsx`,
    `CustomerAddresses.tsx`, `CustomerAuthModal.tsx`.
  - **Flutter parity note:** the one real cross-platform UX change — **BottomNav
    5→4 (drop Search tab)** — was mirrored into `mobileapp/` the same day (see
    the BottomNav bullet above). Everything else above is either web-only
    plumbing (CSS containers, DOM scroll behaviour, matchMedia hook, re-render
    avoidance, IO lazy-mount) or something the Flutter app already does.
  - Verified on the Flutter side (incl. the festival-section rewrite):
    `flutter analyze lib/` clean (1 pre-existing unrelated `api_service.dart`
    warning), `flutter test` **124/124**. Not yet visually re-checked on a device
    — worth a look at both `style1` and `style2` festival campaigns. Web side
    (`tsc --noEmit` / `vite build`) not re-run after this batch — do before
    committing.

- **2026-09-08 — follow-up (session 2, same day): festival group parity, `?ids=`
  product view, image-fit fixes, Flutter Home render perf, misc storefront
  polish.** (⚠ still uncommitted working tree; `frontend` `tsc --noEmit` clean,
  `flutter analyze` on the touched files clean.)
  - **Festival group filtering aligned web ↔ Flutter** — both surfaces now apply
    the *same* rule: keep groups with `isActive !== false`, then prefer those
    that carry content (own `image`/`imageUrl` **or** ≥1 product), and fall back
    to all active groups only if none have content. Before, web dropped
    name-only groups but kept inactive ones; Flutter did the opposite → the two
    apps showed different group counts for the same campaign.
    `FestivalCampaignWrapper.tsx` `allGroups`/`realGroups`;
    `festival_campaign_section.dart` `activeGroups`/`realGroups`.
  - **style2 is a fixed 4-slot layout (hero + 2×2).** Both apps now render style2
    **only for 3–4 groups**; `<3` (empty cells) or `>4` (silently dropped) fall
    back to the style1 grid/carousel, which shows every group. Web
    `cardStyle === 'style2' && displayGroups.length >= 3 && <= 4`; Flutter
    `campaign.cardStyle == 'style2' && groups.length >= 3 && <= 4`.
  - **`festivalGroupHref(grp)` + new `?ids=` product view (web).** Multi-product
    festival groups now deep-link to `/products?ids=id1,id2,…&title=<groupName>`
    (1 product → `/product/:id`, 0 → `/products?search=<name>`).
    `Products.tsx` gained `urlIds`/`idList`/`urlTitle`: when `ids` is present it
    filters the catalog to exactly those ids **in the given order**, bypasses all
    category/search/subcategory filters, drives the list view (the URL-sync
    effect now treats `urlSearch || urlIds` as "show the list"), and the heading
    shows `title`. New `showSubRail = idList.length === 0 && !urlSearch &&
    Boolean(urlCategory)` — the left subcategory `<aside>` is now hidden (and the
    grid goes full-width, `grid-cols-1`) on any `?ids=` **or** plain `?search=`
    view, since neither has subcategories. Flutter has **no `/products?ids=`
    route** → multi-product group taps there fall back to the matched category
    (documented divergence).
  - **`Products.tsx` other**: removed the per-subcategory background tint on the
    product `<main>` (deleted `activeSubCatColor`/`activeSubCatObj`); the "No
    products available" empty-state `<p>` gets `w-full`/`self-stretch` (it was
    collapsing to its widest word inside the `items-center` flex box); promo /
    category cards on Home link with `subCategory=All` so the landing view shows
    the whole category, not an empty subcategory.
  - **Image-fit fixes (Flutter)**:
    - `categories_screen.dart` subcategory tiles — `BoxFit.contain` + 6px padding
      → **`BoxFit.cover` full-bleed** inside `ClipRRect(AppRadius.brMd)`; the
      tinted container is now just the loading backdrop; fallback icon centred.
    - `festival_campaign_section.dart` `_imageFor` now resolves a group's image
      from **`group.products.first`** (group order, matches web) instead of the
      first catalog-order product that happened to be in the group.
  - **`festival_campaign_section.dart` `_Style1Layout` `>6`-group paged grid** —
    was wrapping to 2 columns (card width computed from `screenW − 32` but the
    real page was narrower: `PageView` had `viewportFraction: 0.98` + a 12px
    right pad). Now a **`LayoutBuilder`** sizes cards from the real page width →
    exactly 3 columns; `PageController()` default (no peek, no per-page pad);
    `_cardH` 150 → 130 so both rows fit; new `_PageDots` page indicator below the
    grid (active pill widens, uses `theme.textColor`). ≤6-group static grid uses
    the same `LayoutBuilder` sizing.
  - **`home_header.dart`** — removed the **Account** (person) circle icon from
    the top `LocationHeader` row; the Notifications bell stays; the bottom-nav
    Account tab is untouched. `onProfileTap` is still threaded through the widget
    params (now unused) so no `home_screen.dart` call sites had to change.
  - **`home_screen.dart` — Home render perf (fixes slow super-category tab
    switch + "blank until you scroll").** `_HomeContent` was a single non-lazy
    `SliverToBoxAdapter(child: Column(...))` holding the banner, category rail,
    special groups, 3 curated shelves **and one `ProductRail` per category**
    (~100+ `CachedNetworkImage`) — every `build()` (tab switch, scroll-threshold
    `setState`, provider tick) constructed and laid out that whole tree in one
    frame. Now `_HomeContent.build` returns a lazy **`SliverList`**
    (`SliverChildBuilderDelegate`, `addAutomaticKeepAlives: false`,
    `addRepaintBoundaries: true`) over a `_sections()` `List<Widget>`; sections
    below the fold don't build / lay out / decode images until scrolled into
    view. `bodyContent` is now a sliver in **every** branch (skeleton/error/empty
    wrapped in `SliverToBoxAdapter`) and sits directly in the `CustomScrollView`
    instead of nested in one adapter. `flutter analyze` on the file: clean.
  - **Web festival hero rotator** (`Style2HeroRotator`) — further redesign
    passes: image fills the top of the card (`object-cover`), the **group label
    ("GIFTS") sits *below* the image** with the product name + `₹offer`/strike
    MRP, discount pill overlays the image; the whole Style-2 row is a **fixed
    `h-[216px]`** with `min-h-0` on every flex descendant so the card never
    changes height as it rotates; rotation slowed **2 s → 4.5 s**, pauses on
    `pointerEnter`/`focus`, respects `prefers-reduced-motion`, progress dots.
    `.animate-fadeIn` keyframe changed from scale-pop to opacity + 4 px rise.
  - **`festivalThemeResolver.ts` `cardBg`** now honours `styling.cardBackground`
    (and a solid `backgroundType`) — it was hard-wired to `gStart`, so the
    admin's Card Styling colour never rendered. (The `cardText` auto-contrast
    token + exported `isDarkColor` from earlier in the day already mirrored into
    Flutter `festival_theme_resolver.dart`.)
  - **`CustomerAuthModal.tsx`** — removed the `fresh/cart` logo badge and the
    bottom "Continue as guest" link; added a **top-right pill "Guest" button**
    (hidden on OTP/success steps); bottom panel `overflow-y-auto` →
    `overflow-hidden` (the login card now fits without scrolling).
  - **`CustomerAddresses.tsx`** — removed the "Popular:" location chip row +
    `defaultPopularLocations`; removed every input `placeholder`
    (name/phone/house/landmark/search); location search is now **live
    OpenStreetMap Nominatim only** (debounced 300 ms, min 2 chars,
    `addressdetails=1&limit=8`, "Searching…" / "No locations found" states) —
    dropped the local `citiesData` prefix list
    (`searchCitiesByPrefix`/`CityLocation` removed). **"Add a new address" now
    auto-detects the visitor's live location on open** (`getCurrentPosition`
    `enableHighAccuracy:false, timeout:7000, maximumAge:120000`); the
    reverse-geocode `fetch` has a 6 s `AbortController` timeout and keeps the
    current pin text on abort instead of overwriting it with the KPHB fallback;
    `handleLocateMe` got the same fast options + a non-blocking toast.
  - **`SuperCategoryNav.tsx` / `Header.tsx` — sticky-strip seam / transparency.**
    The non-festival nav is now `bg-surface border-divider` (it was only tinted
    while a campaign was active, so it read as see-through once sticky);
    `top: calc(var(--sticky-header-h) - 1px)` + `margin-top: -1px` closes the
    hairline gap under the fixed header, and the fixed header wrapper lost its
    on-scroll `shadow-sm` (that downward shadow looked like a line above the
    strip) and gained `max-w-[100vw] overflow-x-clip`. Also removed the desktop
    left/right scroll-arrow buttons, orphan `dark:` variants → tokens, mobile
    strip `text-[10.5px]` → `text-[11px]`, resize→`syncIndicator` rAF-throttled,
    `aria-label` on the `<nav>`.

- **2026-09-07 — Festival card styles (style1/style2) + mobile subcategories page.**
  **Backend** (`FestivalCampaign.js`, `festivalCampaignController.js`): added
  `cardStyle: enum ['style1','style2'] default 'style1'` to the model. **Removed
  all campaign date/scope overlap validation** (`checkCampaignOverlap` deleted;
  create/update/toggle no longer 400 on overlap) — multiple campaigns can now be
  active at once. `GET /festival-campaigns/active` reworked: accepts
  `?superCategory=<slug>`, filters out date-expired campaigns, returns both the
  best-matched `campaign` AND the full `activeCampaigns[]` array (was a single
  `campaign`). Web (`FestivalCampaignWrapper.tsx`, `festivalThemeResolver.ts`) and
  Flutter (`festival_campaign_section.dart` +483, `festival_theme_resolver.dart`,
  `festival_campaign_model.dart` gained `cardStyle`, `catalog_providers.dart` new
  `activeFestivalCampaignsProvider` + per-super-category matching,
  `api_service.dart` `fetchActiveFestivalCampaigns()` list) both render two
  layouts: **style1** = 4-across full-bleed image cards (Ganesh-Chaturthi style,
  existing), **style2** = left vertical hero rotator (2s group-wise) + right 2×2
  group grid. Theme resolver now supports `bgGradient`.
  **Mobile subcategories page**: `category_model.dart` gained `SubCategoryModel`
  ({id,name,imageUrl,icon}) + `subCategoryItems`; `category_catalog_screen.dart`
  rebuilt with a subcategory tile grid using `_resolveSubCategoryImage()`
  (custom img → keyword→Unsplash fallback map) and `cached_network_image`.

- **2026-09-06 — 1:1 web-storefront ↔ Flutter replication pass.**
  Web `frontend/` components reshaped to match the Flutter `mobileapp/` layouts
  pixel-for-pixel on mobile breakpoints: `Header.tsx`, `SuperCategoryNav.tsx`
  (+214), `BottomNav.tsx`, `FloatingCartBar.tsx`, `Home.tsx`, a new full
  `Search.tsx` page (+291), and a large `CustomerProfile.tsx` rework (+393). New
  shared web util `frontend/src/utils/categoryIconResolver.ts` (`SEMANTIC_ICON_MAP`
  keyword→lucide icon, mirrors the mobile category-icon logic) and
  `frontend/src/utils/festivalThemeResolver.ts`. No backend change.

- **2026-09-05 — Product images not filling their frame (mobile + web + web-responsive).**
  Grid/list product cards and the Product Details hero image used
  `object-contain`/`BoxFit.contain` with extra container padding, so a photo
  whose aspect ratio didn't exactly match its square/rect frame showed visible
  empty space around it. Since `frontend/` serves both desktop and mobile
  breakpoints from the same components, this only needed two codebases:
  **Web** (`frontend/src/components/ProductCard.tsx` grid tile,
  `frontend/src/pages/ProductDetails.tsx` — both the mobile `block md:hidden`
  viewport and the desktop `hidden md:block` zoom-lens viewport) — removed the
  inner `p-1`/`p-2`/`p-4`/`p-6` padding and switched `object-contain` →
  `object-cover`. The desktop zoom-lens preview uses a separate
  `backgroundSize`-based magnify panel, unrelated to the base image's
  `object-fit`, so this didn't risk breaking that feature.
  **Mobile** (`mobileapp/lib/core/widgets/product_card.dart`, the shared grid
  card) — removed the `EdgeInsets.all(8)` padding, wrapped the image in a
  `ClipRRect` (needed once the image reaches the container's rounded corners),
  `BoxFit.contain` → `BoxFit.cover` with explicit `width/height:
  double.infinity`. The PDP gallery (`product_details_screen.dart`) had this
  same fix applied earlier in this session.
  Verified: frontend `tsc --noEmit` clean; mobile `flutter analyze` clean,
  `flutter test` 124/124. **Not yet visually re-confirmed on a device** (none
  connected when this landed) — worth a quick look next time a device's
  available, though the fix mirrors the already-verified PDP gallery pattern.

- **2026-09-02 — Mobile: real-time location-permission prompt after every login.**
  Previously only a first-time customer (no saved `selectedAddress`) got the
  actual OS permission dialog, via `location_select_screen`'s own
  `ensureWithUi` call on `initState`; a returning customer whose permission had
  lapsed (revoked in Settings, fresh reinstall restoring a cached address from
  the backend) skipped straight to Home and was never re-asked — only a silent
  `check()` synced state, no system prompt.
  Fix: `HomeScreen` (`lib/features/home/presentation/screens/home_screen.dart`)
  now runs `_maybeAskLocation()` from a `WidgetsBinding.addPostFrameCallback` in
  `initState` — if `authProvider.locationPermissionGranted` is false, it calls
  `LocationPermissionService.ensureWithUi(context)` (rationale sheet → system
  dialog → GPS-off / blocked-settings escape hatches) then
  `refreshLocationPermission()` to sync the result into `AuthState`. Since
  `HomeScreen` is an `IndexedStack` branch of the tab shell, `initState` fires
  once per app session (fresh OTP login **or** a resumed/hydrated session) —
  not on every tab switch — and is fire-and-forget + try/catch-guarded so a
  slow or unavailable location plugin (e.g. a test host) can never block first
  paint or hang a widget test.
  **Rejected approach:** doing this synchronously inside `otp_screen.dart`'s
  `_verify()` before navigating — `await`ing `Geolocator` there hung
  `pumpAndSettle` in `auth_flow_widget_test.dart` (same class of issue as the
  earlier documented `.timeout()` incident) since there's no platform-channel
  mock in the test host; moved to Home's post-frame callback instead, which no
  test awaits directly.
  Verified: `flutter analyze` clean; `flutter test` **120/120** (including the
  OTP-success test that broke and was fixed by this move); `flutter build apk
  --debug` OK.

- **2026-09-02 — Admin: Delivery & dispatch settings UI.**
  `SettingsModule` (`frontend/src/pages/admin/Modules.tsx`) gained a second form
  ("Delivery & dispatch") over the existing `GET/PUT /api/settings` — previously
  these fields were only editable via a raw API call. Exposes: `autoAssignEnabled`
  toggle, `assignRadiusKm`, `batchRadiusKm`, `offerTimeoutSec`, `maxOfferAttempts`,
  `deliveryBaseFee`, `deliveryPerKmFee`, and `storeOrigin {name,lat,lng}`. Test:
  backend `npm test` **53** (+1: PUT persists the fields, GET round-trips,
  non-admin 401/403); frontend `vite build` clean. `PUT /api/settings` is
  `protect + authorize('Admin')` and does a top-level merge, so partial bodies
  are safe.

- **2026-09-02 — Delivery P2 batching guard (partial P2-D3-batching).**
  `Settings.batchRadiusKm` (default 1.5). `assignmentService.findCandidates`
  gained `drop` + `batchRadiusKm`: a partner already carrying a delivery is only
  a candidate for a 2nd order when the new drop is within `batchRadiusKm` of one
  of their active drops (partners with a free slot are unaffected). `tryAssign`
  passes `order.deliveryLocation` + the setting. This makes the existing
  `maxConcurrent > 1` path safe (no cross-city multi-drops). Test: backend
  `npm test` **52** (+1: far drop → busy partner excluded → stalled; near drop →
  same partner gets it). **Not built** (needs device QA + partner-stack UX
  decision): drop-sequencing hint, a dedicated multi-order "stack" screen — the
  dashboard already lists multiple active-order cards.

- **2026-09-02 — Delivery P2-D5 DONE (delivery zones + zone-aware assignment).**
  Model `DeliveryZone {name, polygon:GeoJSON Polygon, slaMinutes(15), active}`
  + `2dsphere` on polygon. Admin CRUD (`authorize('Admin','Manager')`, delete =
  Admin): `GET/POST/PUT/DELETE /api/admin/delivery/zones` — POST/PUT take a flat
  ring (`[[lng,lat],…]` or `[{lat,lng},…]`), `normaliseRing()` validates ≥3 pts
  + coord ranges + auto-closes; delete `$pull`s the id from every partner's
  `zones`. New `PUT /api/admin/delivery/partners/:userId {vehicleType?,
  maxConcurrent?(1–5), zones?}` (validates zone ids). `partnerRow` +
  `partnerPerformance` now return `zones`. **Assignment scoping**
  (`assignmentService.tryAssign`): if the pickup `$geoIntersects` an active zone
  and partners are tagged for it → **pass 1** offers only those (across the ×1/2/3
  radius expansion), **pass 2** falls back to the unrestricted radius search so an
  order is never stranded by zone config; `findCandidates` gained
  `restrictUserIds`. Admin web: new `ZonesManager.tsx` (click-to-draw polygon on
  a Leaflet/OSM map, list + active toggle + delete) mounted in `DeliveryModule`
  under the fleet map; `PartnerDetail` gained a "Zones & capacity" card
  (zone chips + max-concurrent, `PUT /partners/:userId`). Tests: backend
  `npm test` **51** (+1: zone CRUD, bad-ring 400, partner tag, zone-tagged
  partner beats the nearer one, delete untags, RBAC); frontend `vite build` clean.

- **2026-09-02 — Delivery P2-D7 DONE (return-to-store + re-attempt).**
  `Order` additive: `needsReturn` (bool), `returnedAt`. `deliveryController.failDelivery`
  — when `pickedUpAt` is set the parcel is with the rider, so it sets
  `needsReturn:true`, keeps the order in `activeOrderIds` (partner **not** freed,
  can't go offline), and the timeline/emit say "returning to store"; a pre-pickup
  fail is unchanged (clean release). New `POST /api/delivery/orders/:id/returned`
  (`protectDelivery`, idempotent) → `status:'Returned'` + `returnedAt`, clears
  `needsReturn`, frees the partner, `order_returned`→`admin_fleet`, admin
  Notification. Admin: `GET /api/admin/delivery/returns` (awaiting + last-7d
  returned), `POST /api/admin/orders/:id/requeue` (`Admin`/`Manager`; only a
  `Failed`(pre-pickup) or `Returned` order, **409 while `needsReturn`**) → resets
  to `Ready`, clears partner/failure fields, `logAudit`, fires `tryAssign`.
  Delivery app: `DeliveryOrder.needsReturn`, `ApiClient.markReturned` /
  `OrderController.markReturned`; order-detail primary action becomes "Returned
  to store" for a `Failed`+`needsReturn` order + a "bring it back" note. Admin web
  `DeliveryModule`: "Returns & re-attempts" card (awaiting-return badge + table +
  per-row Requeue, disabled while `needsReturn`). Customer: `failDelivery` now
  calls `notifyCustomer()` (persistent `Notification` + FCM "There was a problem
  with your delivery"); admin `requeueOrder` writes a "being re-attempted"
  `Notification`; tracking views pick up the new timeline notes; `Returned` is
  already terminal. Tests: backend `npm test` **49** (+1: fail
  after pickup → needsReturn, requeue-blocked, /returned frees + idempotent,
  admin returns list, requeue → Ready); deliveryapp analyze clean + 6 + APK;
  frontend `vite build` clean.

- **2026-09-01 — Delivery P2-D1 DONE (delivery-partner earnings).**
  Model: `DeliveryEarning {partnerUserId, orderId(unique), baseFee, distanceKm,
  distanceFee, tips, total, status:'pending'|'settled', earnedAt, settledAt}`
  + indexes `{partnerUserId, earnedAt}` / `{partnerUserId, status}`. Payout model
  = **base fee + per-km distance fee (+ tips, no input surface yet → always 0)**,
  both rates read live from `Settings.deliveryBaseFee`/`deliveryPerKmFee` (₹20/₹6
  defaults). `deliveryController.completeDelivery` → `recordEarning()` (haversine
  pickup→drop, upsert by `orderId` → idempotent, the repeat-`complete` path never
  double-pays). New `GET /api/delivery/earnings?range=today|week|month|all` (IST
  "today") → `{summary{count,total,pending,settled,base,distance,tips},earnings[]}`;
  `GET /api/delivery/me` also returns `partner.todayEarnings`. Admin:
  `GET /api/admin/delivery/partners/:userId/earnings`, `POST .../earnings/settle
  {ids?}` (Admin only; omit ids = all pending; `logAudit`). Delivery app: new
  `EarningsScreen` `/earnings` (Today/Week/Month segmented, total + breakdown +
  per-order list), dashboard wallet AppBar icon + "Today ₹" stat;
  `PartnerProfile.todayEarnings`, `ApiClient.earnings()`. Admin web
  `PartnerDetail`: "Earnings" card (total tiles + "Settle pending" + per-order
  table). No customer surface. Tests: backend `npm test` **48** (+1: written once,
  idempotent, partner feed, admin view + settle, RBAC); deliveryapp analyze clean
  + 6 tests + debug APK; frontend `vite build` clean.
  **⚠ Uncommitted:** built on top of the backend-refactor working tree below;
  the earnings routes are wired in the still-untracked `routes/delivery.routes.js`.

- **2026-09-01 — Backend refactor: split the mega `apiController.js` + `routes/api.js`.**
  `apiController.js` (2352 lines, 20 controllers) → one file per domain
  (`authController`, `catalogController`, `orderController`, `customerController`,
  `reviewController`, `couponController`, `blogController`, `settingsController`,
  `supportController`, `employeeController`, `auditLogController`,
  `uploadController`, `paymentController`) + `controllers/_shared.js`
  (`signToken`, `maskPhone`, `isPaymentsTestMode`, `razorpayInstance`,
  `RAZORPAY_KEY_*`, `logAudit`). `apiController.js` kept as a **barrel**
  re-exporting all of them — zero changes in importers. `routes/api.js` → the
  offline-fallback middleware + `router.use()` of 8 domain route modules under
  `routes/` (`misc, catalog, order, commerce, customer, ops, payment,
  delivery`). Route order preserved. Behaviour byte-identical (files built by
  `sed` line-range extraction, not retyped). Verified: `npm test` 47/47,
  `app.js` loads clean.

- **2026-09-01 — Delivery P2-D3 DONE (fleet performance analytics UI).**
  Backend: `DeliveryPartner.distanceTravelledM` odometer — `updateLocation`
  adds each heartbeat leg via haversine, ignoring <15 m jitter and >2 km
  jumps. New `GET /api/admin/delivery/analytics?days=7` (`authorize('Admin',
  'Manager')`, days clamped 1–90) → `{ rangeDays, fleet{totalPartners,
  onlineNow, busyNow, delivered, acceptanceRate, avgDeliveryMins, avgRating,
  ratedDeliveries}, leaderboard[] }` from `Assignment` + delivered `Order`
  (with `deliveryRating`) + `DeliveryPartner` rollups; leaderboard sorted by
  deliveries desc. `partnerPerformance` now also returns `partner.distanceKm`.
  Web admin `DeliveryModule`: a "Fleet performance" card above the partner
  table — 7-stat strip + top-8 leaderboard table (name→`/admin/delivery/:id`,
  online dot, delivered, acceptance, avg time, ★rating + reused **Low** badge,
  distance km), 15 s refresh alongside the partner poll. `PartnerDetail` stat
  grid gains a "Distance" tile + rating count. Tests: backend `npm test` **47**
  (+1: analytics shape + customer-token 401/403); frontend `vite build` clean.

- **2026-09-01 — Delivery P2-D6 DONE (customer → partner ratings, whole-product).**
  Backend: `Order.deliveryRating {stars 1-5, comment, at}` (additive). New
  `POST /api/orders/:id/rate-partner` (`attachCustomerOptional` — app token OR
  body `{phone}`; owner-only; **409 unless status is `Delivered`**; re-submit
  edits the same rating). Recomputes `DeliveryPartner.rating` (2-dp avg) +
  `ratingCount` from an aggregate over every rated order for that partner;
  `stars <= 2` writes a "Low delivery rating" `Notification` to all
  Admin/Manager. `orderController.getOrder` now returns top-level
  `deliveryRating`; `adminDeliveryController.partnerRow` + `deliveryController.getMe`
  expose `ratingCount`. Web `TrackOrder.tsx`: a star-rating card on `Delivered`
  orders (5 tap-stars + optional note + "Change rating"), posts `{stars, comment,
  phone}` with `phone` from `localStorage.customer_user`. Admin `DeliveryModule`
  (table + mobile cards): `★ x.x (n)` + a red **Low** badge when
  `ratingCount >= 3 && rating < 4`. Mobile customer app: `OrderModel` gained
  `deliveryPartnerName` + `deliveryRatingStars` (from `fromServerJson` +
  `copyWith`); `ApiService.ratePartner`; `_RatePartnerCard` on the delivered
  order-detail screen (star row + note + submit/Change, `AppToast`,
  invalidates `orderDetailProvider`). deliveryapp: dashboard "Rating" stat now
  shows `(n)` count. Tests: backend `npm test` **46** (+1: out-of-range → 400,
  happy path recomputes, re-submit edits, not-delivered → 409); mobile
  `flutter test` **119** (+2: rating card renders/submits, already-rated shows
  "Change rating"); deliveryapp 6; `flutter analyze` clean both; debug APK
  builds; frontend `vite build` clean.
  **Still open in P2** (blocked on user input): earnings (commission model),
  background location (dependency choice), zones, batching, return-to-store,
  call-masking.

- **2026-09-01 — Live delivery tracking = real map + Zepto-style route (web + mobile).**
  Backend unchanged (`getOrder` already returns `delivery.location` masked→revealed
  + `deliveryLocation` + `pickup`). **Mobile** `tracking_screen`: deleted the
  schematic `TrackingMapPainter`; new `_LiveMap` uses **`mapcn_flutter`**
  (`flutter_map` under it) with OSM tiles, a pulsing rider marker + drop marker,
  and a **rider→drop route polyline**. `TrackingNotifier` gained `destination`
  /`storeLocation`/`routePoints`; `_maybeRefreshRoute()` calls **OSRM**
  (`router.project-osrm.org`, free) for a road-following path (debounced: rider
  moved >45 m + 8 s cool-off), **straight-line `[rider,drop]` fallback** on any
  failure; recenters via `MapcnController.flyTo(midpoint, zoomByDistance)`.
  "Waiting for the partner to head out…" overlay until `hasRider`. **Web**
  `TrackOrder.tsx`: added the OSRM route polyline (same fallback), a **gliding
  rider marker** (rAF tween ~1.2 s between polls), a store (pickup) marker, and
  follow-cam (first-fit, then recenters only if the rider drifts out of view and
  the user hasn't panned). Orders entry points already in place both sides
  (list "Track", detail "Track this order", Home active-order banner). Verified:
  mobile `flutter analyze` clean + `flutter test` 117 + debug APK; web `vite
  build` clean.

- **2026-09-01 — Mobile bug fixes + location-permission-after-login.**
  - **🐛 INTERNET permission** was only in `mobileapp/android/app/src/debug/
    AndroidManifest.xml` → **release/profile builds had no network at all**
    (API + remote product images both failed). Added `INTERNET` +
    `ACCESS_NETWORK_STATE` + `POST_NOTIFICATIONS` to `.../src/main/
    AndroidManifest.xml`. (Debug builds were unaffected, which is why it went
    unnoticed.)
  - New `lib/core/services/location_permission.dart` — `LocationPermissionService`
    wraps `geolocator`: `check()`, `request()`, `ensureWithUi(context)` (rationale
    bottom sheet → request → GPS-off → `openLocationSettings()`; deniedForever →
    `openAppSettings()`). `LocationPermState { granted, serviceDisabled, denied,
    deniedForever }`.
  - `AuthNotifier.refreshLocationPermission()` syncs the real OS permission into
    `AuthState.locationPermissionGranted` (fire-and-forget after `verifyOtp` +
    `_hydrate`; no `.timeout()` — that hung widget tests). `otp_screen` routes to
    `/location_select` unless `selectedAddress != null && locationPermissionGranted`.
    `location_select_screen` auto-runs `ensureWithUi` on open + shows a persistent
    permission banner (GPS-off / blocked / denied) with a retry/settings CTA;
    `_locateUser()` now goes through the service too.
  - Verified: `flutter analyze` clean, `flutter test` 117, `flutter build apk
    --debug` OK. Network-offline state already covered by `ConnectivityBanner` +
    `connectivityProvider` (FW-1).

- **2026-09-01 — FUTURE_WORK backlog batch** (see `FUTURE_WORK.md` for the
  per-item detail; all shipped web + mobile + backend where the item spans them):
  - **FW-3 push** — done end to end. Besides the delivery-offer push,
    `sendToOwner` now fires on customer order milestones:
    `orderController.updateStatus` (Out For Delivery / Arrived / Delivered /
    Cancelled) and `deliveryController.notifyCustomer`. Creds resolve from
    `FIREBASE_SERVICE_ACCOUNT` (**now a path** — `src/config/service_account.json`,
    git-ignored — or raw JSON / base64), else `GOOGLE_APPLICATION_CREDENTIALS`,
    else the local key file; silent no-op when unset. iOS APNs key still owed.
  - **FW-6** — mobile orders list gets All / In Transit / Delivered / Cancelled
    `ChoiceChip` tabs (`_OrdersTab` → `OrderStatus` buckets). Active-order
    banner on Home: mobile `_ActiveOrderBanner` (gated on
    `authProvider.isAuthenticated`), web `components/ActiveOrderBanner.tsx`
    (phone-keyed, 30s poll) → `/track/:id`. Real invoice still a stub.
  - **FW-5** — `GET /products` gained `brand` (comma `$in` regex),
    `inStock=true`, `onSale=true` (`$expr` price<mrp), and **opt-in pagination**
    (`page`/`limit` → `{total,page,limit,totalPages}`; omit both → unchanged
    full list). Mobile catalog sheet + In-stock/On-offer toggles
    (`CatalogQuery`). Web `Products.tsx` filter pills. Brand multi-select UI +
    mobile infinite scroll still open.
  - **BE-3** — `createOrder` sets `paymentStatus` from method: `Pending` for
    COD/cash, `Paid` for prepaid (explicit value still wins). COD → Paid on
    Delivered unchanged.
  - **FW-11** — `activeFestivalCampaignProvider` +
    `api.fetchActiveFestivalCampaign()` → `_FestivalHero` atop mobile Home
    (title/subtitle over solid/gradient/image bg). Full web theme-engine
    parity deferred.
  - **FW-4** — wallet top-up: `POST /api/customers/me/wallet/topup` +
    `/topup/verify` (HMAC, test-mode aware) → credit `walletBalance` +
    `WalletTransaction` Credit. Mobile wallet screen "Add money" →
    `_AmountSheet` → Razorpay/Simulated gateway → verify →
    `auth.setWalletBalance`. **Web wallet still blocked on WEB-1** (no
    customer JWT).
  - **BE-2** — `PUT /api/reviews/bulk-status {ids,status}`; admin
    `ReviewsModule` rebuilt with Pending/Approved/Rejected/All tabs (defaults
    Pending), select-all + bulk approve/reject.
  - **FW-16** — `CustomSearchBar` mic renders only when `onVoicePressed` is
    wired; deleted dead `core/widgets/quantity_selector.dart`.
  - **FW-13** — `location_select` "Locate me" / reverse-geocode failures now
    toast instead of `catch (_) {}`. Full token/AppTextField pass still open.
  Test totals after the batch: backend **`npm test` 45**, mobile
  **`flutter test` 117**, deliveryapp **6**; frontend `vite build` clean.

- **2026-09-01 — Delivery P1-D4 CLIENT DONE** (FCM offer push end-to-end).
  Firebase project **`grocery-76b84`** (sender `1014188060345`). Backend:
  `FIREBASE_SERVICE_ACCOUNT` (base64) now set in `backend/.env` (git-ignored) →
  `isPushConfigured()` true; unset elsewhere = silent no-op. Both Flutter apps:
  `firebase_core ^3.6` + `firebase_messaging ^15.1`;
  `android/app/google-services.json` + `ios/Runner/GoogleService-Info.plist`
  (committed — client config, not secret); `com.google.gms.google-services`
  `4.4.2` plugin in `android/settings.gradle.kts` + `android/app/build.gradle.kts`;
  hand-written `lib/firebase_options.dart` (android/ios). New `PushService`
  (deliveryapp `core/services/`, mobileapp `core/services/` + registered in
  `injection.dart` as a getIt lazy singleton; auth_controller calls it via a
  null-safe `_push` getter so tests without getIt still pass): `init()` asks
  permission, gets token, listens `onTokenRefresh`/`onMessageOpenedApp`/
  `getInitialMessage`; token POSTed to `/delivery/devices` or
  `/customers/me/devices` after login + hydrate, DELETEd on logout. `main()`
  inits Firebase + `onBackgroundMessage` handler, all wrapped so a broken
  Firebase build still runs. deliveryapp app IDs: android
  `1:1014188060345:android:a7e46dfa99818274b77568`, ios `...:ios:f2791f6df9a239efb77568`,
  bundle `com.freshcart.freshcartDelivery`; mobileapp: android
  `...:android:4c2931cf4ce40dc9b77568`, ios `...:ios:5673da4a42a58639b77568`,
  pkg `com.freshcart.app.freshcart`. Verified: backend `npm test` 41;
  deliveryapp analyze clean + 6 tests + debug APK; mobileapp analyze clean +
  117 tests + debug APK. Note: a broken/empty `firebase_core-3.15.2` pub-cache
  dir had to be deleted + re-fetched once.
  Next: **P2** (earnings / ratings / zones / batching / analytics / bg location).


- **2026-09-01 — Email: delivery-partner credentials via SMTP.**
  `nodemailer` (Gmail SMTP, App Password). New `src/services/mailService.js` —
  lazy transport, silent no-op when `EMAIL_USER`/`EMAIL_APP_PASSWORD` unset,
  `MAIL_TEST_MODE=true` captures to an in-memory `outbox` (tests). Exports
  `sendMail`, `sendDeliveryCredentials({to,name,email,password,mode:'created'|'reset'})`,
  `isMailConfigured`. Hooks: `apiController.createEmployee` — when `role==='Delivery'`
  and an email is set, emails the login credentials after `User.create`
  (non-blocking; also now persists `phone`); `adminDeliveryController.resetPartnerPassword`
  — emails the new password (`mode:'reset'`). Admin `Modules.tsx` add-partner
  shows "credentials were emailed to …". Env in `backend/.env` (gitignored):
  `EMAIL_USER`, `EMAIL_APP_PASSWORD` (spaces stripped), `EMAIL_FROM`,
  `DELIVERY_APP_LOGIN_URL`, `MAIL_TEST_MODE`; keys documented in `.env.example`.
  Verified: `transporter.verify()` OK, a real `sendDeliveryCredentials` send
  returned a messageId, `npm test` 41/41 (mail test-mode outbox asserts).

- **2026-09-01 — FUTURE_WORK FW-1 (mostly) DONE** (offline resilience + app config).
  Backend: `Settings.appConfig` sub-doc + public `GET /api/app/config` →
  `{minSupportedVersion, latestVersion, maintenance, maintenanceMessage, updateUrl,
  supportEmail, supportPhone}`; DB-down middleware returns a permissive default.
  Mobile: added `connectivity_plus` ^5.0.2 + `package_info_plus` ^9.0.1.
  `core/services/connectivity.dart` (`connectivityProvider` bool stream),
  `core/services/app_config.dart` (`appConfigProvider` tolerant→permissive on
  error, `isVersionBelow` semver cmp, `appVersionProvider`, `appGateProvider` →
  ok/maintenance/forceUpdate). `core/widgets/connectivity_banner.dart` mounted via
  `MaterialApp.router` `builder` — offline strip + "Back online" flash.
  `features/app_gate/.../app_gate_screens.dart` (`MaintenanceScreen`,
  `ForceUpdateScreen`, both retry-able) + routes `/maintenance` `/force_update`
  (in `_publicRoutes`). Splash `_navigateToNext` resolves `appGateProvider` in
  parallel with hydration and redirects. Remaining: per-request
  retry-with-backoff. Tests: `app_config_test` (7). `npm test` 39/39,
  `flutter test` 117/117, APK built.

- **2026-09-01 — FUTURE_WORK FW-2 DONE** (self-service account deletion).
  Backend: new `DELETE /api/customers/me` (`attachCustomerOptional` — app token
  OR `?phone=` for the token-less web). `customerController.deleteMe` cascades:
  `Customer.deleteOne` + `Review.deleteMany` + `WalletTransaction.deleteMany` by
  `customerId`, and `Order.updateMany` sets `customerName:'Deleted user'` (orders
  kept as records). Legacy `DELETE /api/customers/:id` changed from an OPEN route
  to `protect, authorize('Admin','Manager')`. Mobile: `ApiService.deleteAccount`
  → `DELETE /customers/me`; `AuthNotifier.deleteAccount()` (API then `logout()`;
  keeps the session if the call throws); "Delete account" TextButton under Log
  out on `profile_screen.dart` (confirm modal → `/login`). Web:
  `CustomerProfile.tsx` `handleDeleteAccount` → `DELETE /api/customers/me?phone=`.
  Tests: backend cascade + `me` 401-after-delete + legacy-route-now-401
  (`npm test` 38/38); mobile `deleteAccount` success + keep-session-on-failure
  (`flutter test` 110/110). Frontend build clean, debug APK built.

- **2026-09-01 — Delivery P1-D5 DONE** (partner notifications inbox + audit).
  Backend: `GET /api/delivery/notifications?unreadOnly=1&limit=` → `{unread,
  notifications}`, `POST /api/delivery/notifications/read {ids?}` (omit = all);
  `GET /api/delivery/me` +`unreadNotifications`. `assignmentService.createOffer`
  writes a `type:'Offer'` Notification; `cancelForOrder` writes a "Delivery
  cancelled" Notification per affected partner. Audit: `logAudit()` already
  fires for every admin delivery override (Order Offered / Force-Assigned /
  Reassign / Unassigned, Partner Password Reset, Activated / Deactivated —
  wired in P0-D5); viewable via existing `/admin/audit-logs`. deliveryapp:
  `AppNotification` model, `api.notifications()`/`markNotificationsRead()`,
  `NotificationsScreen` at `/notifications`, dashboard AppBar bell + unread
  `Badge`. Verified: backend `npm test` **36**, deliveryapp `flutter analyze`
  clean + `flutter test` **6** + debug APK builds.
  Next: **P1-D4 client** (needs the user's Firebase project) or **P2**
  (earnings / zones / batching / analytics / background location / ratings).

- **2026-09-01 — Delivery P1-D4 BACKEND DONE** (FCM push for offers; client blocked
  on the user's Firebase project). `backend/src/services/pushService.js` — lazy
  `firebase-admin` (dep already present) from `FIREBASE_SERVICE_ACCOUNT` (raw
  JSON or base64) or `GOOGLE_APPLICATION_CREDENTIALS`; `isPushConfigured()`,
  `registerDeviceToken` (upsert by token on the existing `DeviceToken` model),
  `removeDeviceToken`, `sendToOwner(ownerId,{title,body,data})`
  (`sendEachForMulticast`, `android.priority:'high'`, prunes dead tokens).
  **Unconfigured ⇒ every send is a silent no-op** — dispatch unaffected.
  Routes: `POST`/`DELETE /api/delivery/devices[/:token]` (protectDelivery),
  `POST`/`DELETE /api/customers/me/devices[/:token]` (protectCustomer).
  `assignmentService.createOffer` now also `sendToOwner(partner,{type:
  'delivery_offer',assignmentId,orderId})`, non-blocking. `.env.example` +
  `FIREBASE_SERVICE_ACCOUNT`. Backend `npm test` **35** (token register
  idempotent/unregister; `isPushConfigured()===false` in CI). **Client TODO
  (needs Firebase config from the user):** `firebase_core`+`firebase_messaging`
  in `deliveryapp/` (& `mobileapp/` for P1-3), `google-services.json` /
  `GoogleService-Info.plist`, token register after login, handle the
  `delivery_offer` data message → `/order/:id` / offer sheet, killed-state
  reconcile via `/delivery/orders/active`.

- **2026-09-01 — Delivery P1-D3 DONE** (customer live rider tracking, web + mobile).
  Backend `orderController.getOrder`: owner-flag refactor + a computed `delivery`
  block on non-terminal assigned orders — `partnerName` (first name only),
  `phoneMasked` always, real `phone`/`canContact`/`location`/`locationUpdatedAt`
  **only in the reveal window** (status ∈ {Out For Delivery, Arrived});
  `deliveryOtp` returned only to the authenticated owner in that window;
  `customerPhone` masked for non-owners. New module-scope `maskPhone(raw)`
  (`98••••10`). Web: `frontend/src/pages/TrackOrder.tsx` at `/track/:orderId`
  (React.lazy → leaflet is its own build chunk, not in the storefront bundle),
  imperative Leaflet rider+destination markers, progress stepper, haversine ETA
  (~18 km/h), Call/WhatsApp only when `canContact`, **polls `GET /api/orders/:id`
  every 10s** (no socket.io-client in web). "Track live" button on in-transit
  cards in `CustomerOrders.tsx`. Mobile: `TrackingState` +`riderPhoneMasked`
  /`canContact`; `_refreshFromApi` now reads the `delivery` block (name, masked
  vs real phone, seed rider location); `tracking_screen` gates Call on
  `canContact`, adds a WhatsApp button, shows masked + "contact opens when out
  for delivery" otherwise, tidied dev copy; **schematic map painter kept** (real
  tile-map swap deferred — `mapcn` risk). Verified: backend `npm test` **31
  tests**, frontend `vite build` clean, mobile `flutter analyze` clean +
  `flutter test` **103**.
  Next: **P1-D4** — FCM push for delivery offers (shared with mobile P1-3).

- **2026-09-01 — Mobile audit fix Group 2 (Missing core) — CLOSED (order cancel + wallet history + product reviews).**
  **Product reviews:** `GET /api/products/:id/reviews` (public — Approved reviews
  + `summary{average,count,distribution}`) and `POST /api/products/:id/reviews`
  (`attachCustomerOptional` — app token OR `{ phone }`). Write gate: the customer
  must have a `Delivered` order containing the product; one review per
  customer+product (a repeat POST edits it); new/edited reviews are `Pending`
  (existing staff moderation via `PUT /reviews/:id/status`). `updateReviewStatus`
  + `deleteReview` now call `recomputeProductRating(productId)` →
  `Product.rating`/`reviewsCount` from Approved reviews. Mobile:
  `ApiService.fetchProductReviews`/`submitProductReview`,
  `reviews_controller.dart` (`productReviewsProvider` + models),
  `product_reviews_section.dart` (`ProductReviewsSection` on the PDP: summary +
  list + `AppBottomSheet` star/comment form; 403 → "after receiving it" inline).
  Web: `components/ProductReviews.tsx` mounted in **both** PDP layouts
  (`block md:hidden` + `hidden md:block`) in `ProductDetails.tsx`; posts
  `{ phone, rating, comment }`, write form gated on `localStorage.customer_user`.
  Verified: backend `npm test` 36/36, `flutter test` 108/108 (+`product_reviews_test`),
  `flutter analyze` clean, frontend `tsc -b && vite build` clean, debug APK built.

- **2026-09-01 — Mobile audit fix Group 2 (Missing core) — order cancel + wallet history DONE.**
  Backend (`apiController` + `routes/api.js`): `POST /api/orders/:id/cancel`
  (`attachCustomerOptional` — app customer token OR `{ phone }` in the body for
  the token-less web storefront). Cancellable only at `Pending / In Transit /
  Accepted / Packed / Ready`; sets `Cancelled` + `failureReason`, pushes
  `trackingTimeline`, calls `cancelForOrder()` to release any offered/assigned
  rider, and for a prepaid non-COD order credits `totalAmount` to
  `Customer.walletBalance` + `WalletTransaction{type:'Credit'}` +
  `paymentStatus:'Refunded'`; emits `order_status_update`. Returns
  `{ order, refunded, walletBalance }`. 409 past-window/already-cancelled,
  403 non-owner. Also `GET /api/customers/me/wallet/transactions`
  (`protectCustomer`, `?limit` ≤200, newest first) → `{ walletBalance, transactions }`.
  Mobile: `ApiService.cancelOrder` / `fetchWalletTransactions`;
  `OrdersNotifier.cancelOrder` (optimistic list patch, returns `refunded`);
  `OrderModel.copyWith` extended (`statusRaw`, `paymentStatus`);
  `order_detail_screen` `_CancelOrderButton` (pre-dispatch only → `AppModal.confirm`
  → toast); `wallet_screen` `walletTransactionsProvider` + history list
  (credit/debit rows, pull-to-refresh, skeleton/empty/error).
  Web: `CustomerOrders.tsx` `handleCancelOrder` + "Cancel Order" button in the
  order-detail view (posts `{ phone, reason }`), `CANCELLABLE_STATUSES` guard,
  local + `localStorage` patch.
  Verified: backend `npm test` 33/33, `flutter test` 105/105, `flutter analyze`
  clean, frontend `tsc -b && vite build` clean, debug APK built.
  Group 2 still open: **product reviews** (needs `GET/POST /products/:id/reviews`).

- **2026-09-01 — Mobile audit fix Group 1 (Broken functionality) DONE.**
  (a) Legal: login "Terms of Service" / "Privacy Policy" are now tappable
  `Text.rich` spans (`_TermsLine` in `login_screen.dart`, `TapGestureRecognizer`)
  → `/legal?tab=terms|privacy`. New `LegalScreen`
  (`lib/features/legal/presentation/screens/legal_screen.dart`, `SegmentedButton`
  tabs) + bundled copy `lib/features/legal/legal_content.dart` (`kTermsDoc`,
  `kPrivacyDoc`, `kLegalPreamble` — mirrors web `frontend/src/pages/Legal.tsx`).
  Route `/legal` added to `app_router.dart` + `_publicRoutes`.
  (b) Share: added `share_plus: ^7.2.2`; PDP `_share()` now opens the native
  share sheet (name + ₹price + `https://www.freshcart.com/product/:id`) instead
  of clipboard copy. Real app-link domain still pending (audit P2 #12).
  Tests: `flutter test` 103/103 (new `test/legal_screen_test.dart` + a
  consent-line test in `auth_flow_widget_test.dart`); `flutter analyze` clean.

- **2026-09-01 — Delivery P1-D2 DONE** (admin live fleet map + partner detail).
  Backend `adminDeliveryController`: `GET /api/admin/delivery/partners/:userId/
  deliveries?status=&limit=` (partner's orders, safe projection) and
  `.../performance` (Assignment tallies → offered/accepted/rejected/expired +
  `acceptanceRate`; Order-derived `deliveredCount`/`failedCount` +
  `avgPickupMins` [createdAt→pickedUpAt] / `avgDeliveryMins` [pickedUpAt→
  deliveredAt]; lifetime `completedCount`/`failedCount` + `rating`); 404 for
  unknown/non-Delivery userId. Both `protect, authorize('Admin','Manager')`.
  Frontend: `frontend/src/pages/admin/DeliveryFleetMap.tsx` — **imperative
  Leaflet** (`leaflet` was already a dep; no `react-leaflet`, no
  `socket.io-client` in the web bundle), OSM tiles, `L.divIcon` colour pins,
  **polls `GET /api/admin/delivery/fleet` every 10s**, marker reconcile +
  first-fit bounds; mounted at the top of `DeliveryModule`.
  `frontend/src/pages/admin/PartnerDetail.tsx` at `/admin/delivery/:userId`
  (route added in `AdminApp.tsx`) — stat grid + delivery-history table; partner
  names in `DeliveryModule` `navigate()` to it. All responsive.
  Verified: backend `npm test` **30 tests** (+1), frontend `tsc -b && vite
  build` clean.
  Next: **P1-D3** — customer live rider tracking (web `CustomerOrders.tsx` /
  `/track/:orderId` Leaflet + reveal-window rider marker + ETA; polish mobile
  `tracking_screen`).

- **2026-09-01 — Delivery P1-D1 DONE** (automatic assignment on `Order → Ready`).
  `assignmentService.js` +`findCandidates({pickup, excludeUserIds, radiusKm})`
  (2dsphere `$near` on `DeliveryPartner.currentLocation` when pickup has coords,
  else plain scan; filters `isOnline` + under-capacity + `User.role Delivery
  status Active`; ranks distance → fewest activeOrders → rating) and
  +`tryAssign(orderOrId)` (idempotent: bails on `already_assigned` /
  `not_ready` / `offer_pending`; counts prior `Assignment` attempts for the
  order, excludes those partners, `attempt = maxPrior+1`; radius auto-expands
  ×1/×2/×3 of `Settings.assignRadiusKm`; offers the single best candidate via
  `createOffer({source:'auto'})`; `attempt > Settings.maxOfferAttempts` →
  `markStalled`; emits `auto_offer` to `admin_fleet`). `onOfferDeclined` (was
  `onOfferDeclined`, renamed stall body to `markStalled`) now takes
  `{source}` and, when `source==='auto'`, calls `tryAssign` again to roll to
  the next candidate before falling back to `markStalled`; `rejectOffer` and
  `expireStaleOffers` pass `a.source`. Trigger: `apiController.updateStatus`
  fires `tryAssign(order.orderId)` (non-blocking, after save) when
  `status==='Ready' && !deliveryPartnerUserId`, gated by new
  `Settings.autoAssignEnabled` (default true, editable via existing
  `PUT /api/settings`). No new deps/infra; the 15s `expireStaleOffers` sweeper
  already drives re-offers on timeout. Backend `npm test` → **29 tests** (+2:
  auto-offer nearest + offer_pending no-op; decline→re-offer→exhaust→stalled).
  Next: **P1-D2** — admin live fleet map (Leaflet + `fleet_update`) + partner
  detail/performance pages.

- **2026-09-01 — Delivery P0-D5 DONE** (admin web delivery management + responsive).
  Backend (2 new endpoints, `adminDeliveryController`):
  `POST /api/admin/delivery/partners/:userId/reset-password {password}` (Admin
  only; goes through `user.save()` so the pre-save bcrypt hook runs — `PUT
  /employees/:id` does **not** and would store plaintext; min 6 chars; `logAudit`),
  `POST /api/admin/delivery/partners/:userId/account {active}` (Admin only;
  `active:false` → `User.status='Suspended'` [enum is `Active|Suspended`, not
  Inactive] + forces `DeliveryPartner.isOnline=false, availability='offline'` +
  emits `fleet_update`; **409 if the partner still has `activeOrderIds`**;
  `logAudit`). Suspended blocks both `/api/auth/login` (403) and `protectDelivery`.
  Frontend: **`DeliveryModule`** in `Modules.tsx` fully rebuilt — consumes
  `GET /api/admin/delivery/partners` (real online/availability/activeOrders/
  completed/failed/rating/last-seen), 15s auto-refresh, Add partner (`POST
  /employees` role Delivery), per-row Reset-password (prompt) + Activate/
  Deactivate; responsive (`hidden md:block` table + `md:hidden` card list).
  **`Orders.tsx`** assign flow rewired off the fake hardcoded-name `PUT
  /status` call → real `POST /api/admin/orders/:id/{assign,reassign,unassign}`
  with a real `partnerUserId` from a partner `<select>` (online-first sorted),
  a **Force-assign** checkbox (`force:true` skips the offer), offered-vs-forced
  result message, `assignmentStalled` "offer declined" badge in the Rider column
  + drawer. No mock fallbacks in the new code paths.
  Verified: backend `npm test` → **27 tests** (+2: password-reset-through-hash
  + deactivate-blocks-login/reactivate), `tsc --noEmit` clean, `npm run build`
  (vite) OK.
  Next: **P1-D1** — automatic assignment on `Order.status → Ready`
  (`assignmentService.tryAssign`, `$near` candidate query, ranking, radius
  expand, stall alert).

- **2026-09-01 — Delivery P0-D4 DONE** (new `deliveryapp/` Flutter package, MVP).
  `flutter create --org com.freshcart --project-name freshcart_delivery
  --platforms android,ios`. Same architecture as `mobileapp/`: Riverpod
  `StateNotifierProvider`/`FutureProvider`, `go_router` with `redirect` auth
  guard + `refreshListenable`, Dio Bearer interceptor (401/403 → `onUnauthorized`
  → force-logout), `flutter_secure_storage` `TokenStore` (key `partner_jwt`),
  `AppConfig` (`--dart-define` API_BASE_URL/SOCKET_URL/ENV, 10.0.2.2 for Android
  emu), `google_fonts` Inter, flat theme `kBrand = Color(0xFF2E7D32)`.
  Screens: **splash** (awaits hydrate), **login** (email+password, checks
  `user.role === 'Delivery'`), **forgot** (two-step send-code → reset, shows
  `devCode` in test mode), **dashboard** (online `Switch` → geolocator permission
  → `PUT /delivery/status` + starts 12s throttled location heartbeat
  `POST /delivery/location`; completed/failed/rating stat cards; active-order
  cards), **order detail** (status header, Call/WhatsApp — respects backend phone
  mask, google-maps navigation link, items, timeline; bottom action bar drives
  the lifecycle: Arrived-at-store → Picked-up → I-have-arrived → Complete
  [OTP + optional camera POD photo → base64] / Fail [reason sheet]), **history**
  (`api.history()` w/ fallback to active), **profile/settings** (logout, location
  permission deep-link, help `tel:`). Real-time: `socket_io_client` with
  `setAuth({token})` → joins `partner:<userId>`; `OfferController` listens
  `delivery_offer` / `delivery_offer_revoked`; a `ShellRoute` stacks a
  full-screen `OfferSheet` (countdown ring, Accept/Reject) over every
  authed page when `offerProvider != null`; Accept → `POST
  /delivery/assignments/:id/accept` → push `/order/:id`. Android manifest:
  INTERNET, ACCESS_FINE/COARSE_LOCATION, CAMERA + `<queries>` for tel/https/geo.
  No backend changes — consumes P0-D1/D2/D3 endpoints only. `flutter analyze`
  clean, `flutter test` → 5 tests green (delivery_models `fromJson`,
  `DeliveryOffer.secondsLeft`), `flutter build apk --debug` OK.
  Next: **P0-D5** — admin web delivery management + responsive (partner table,
  add/edit/activate/deactivate/reset-pw, live fleet, wire Orders assign modal to
  `/api/admin/orders/:id/assign|reassign|unassign`).

- **2026-09-01 — Delivery P0-D3 DONE** (backend; +1 line mobile). Partner
  delivery lifecycle + proof. `Order.status` enum gained `Arrived At Store`,
  `Arrived`, `Failed` (additive); `Order` +`otpAttempts`. New `deliveryController`
  endpoints (all `protectDelivery`, scoped to an order whose
  `deliveryPartnerUserId === req.user._id`, **idempotent** — repeating a step
  returns the order with `idempotent:true`):
  `GET  /api/delivery/orders/:id` (403 if not yours; **customer phone masked**
    until status ∈ {Out For Delivery, Arrived}; `deliveryOtp` stripped from the
    response — the rider verifies against the customer's copy),
  `POST /api/delivery/orders/:id/pickup-arrived` → `Arrived At Store`,
  `POST …/picked-up` → `Out For Delivery` + `pickedUpAt` + **generates a 4-digit
    `deliveryOtp`** (sent to the customer via `Notification`),
  `POST …/arrived` → `Arrived`,
  `POST …/complete {otp?, podPhoto?(base64)}` → verifies OTP (**3 wrong →
    `otp_locked`**), uploads POD photo to Cloudinary (`freshcart/delivery-proof`,
    optional — failure doesn't block), `Delivered` + `deliveredAt`, COD →
    `paymentStatus:'Paid'`, `Assignment→completed`, partner `completedCount++` +
    freed from `activeOrderIds`, `assignment_completed`→`admin_fleet`, customer
    Notification,
  `POST …/fail {reason}` (reason required) → `Failed` + `failureReason`,
    `Assignment→failed`, `failedCount++`, partner freed, admins notified +
    `assignment_failed`→`admin_fleet`.
  A `step()` factory enforces the valid from→to transitions + idempotency + the
  socket `order_status_update` emit. Mobile `orderStatusFrom` maps the 3 new
  statuses (`Failed`→cancelled bucket). Backend suite → **25 tests** (13
  delivery: +full lifecycle w/ OTP, 3-wrong-OTP lock then fail path, phone-mask
  reveal window + not-mine 403).
  Next: **P0-D4** — new `deliveryapp/` Flutter package MVP (login, dashboard +
  online toggle, offer screen, order details, pickup/deliver flow, proof,
  history, profile).


- **2026-09-01 — Delivery P0-D2 DONE** (backend only): assignment engine +
  manual offer/accept/reject + admin assign/reassign/unassign + `Order` fields.
  New `Assignment` model (`offered/accepted/rejected/expired/cancelled/completed/
  failed`, `attempt`, `distanceMeters`, `expiresAt` + housekeeping TTL 1h;
  live-uniqueness enforced atomically in code, not by index). `Order` additive
  fields: `deliveryPartnerUserId` (real FK), `assignmentId`, `deliveryLocation
  {lat,lng}`, `pickup {name,lat,lng}`, `assignmentStalled`, `deliveryOtp`,
  `podPhotoUrl`, `failureReason`, `pickedUpAt`, `deliveredAt`. `Settings` +
  `storeOrigin`, `offerTimeoutSec`(25), `maxOfferAttempts`(5), `assignRadiusKm`(6),
  `deliveryBaseFee`/`deliveryPerKmFee`.
  New `services/assignmentService.js` (io injected via `setIo` from `app.js`):
  `geoDistanceMeters` (haversine), `createOffer` (Assignment + emit
  `delivery_offer`→`partner:<id>` + Notification), `acceptOffer` (atomic
  `Assignment offered→accepted` then guarded `Order …deliveryPartnerUserId:null`
  update → prevents double-assign; adds to partner `activeOrderIds` + recomputes
  `availability`; **revokes other live offers** via `delivery_offer_revoked`;
  emits `assignment_confirmed`+`order_status_update`+`fleet_update`),
  `rejectOffer` → `onOfferDeclined` (P0 = flag `Order.assignmentStalled` + notify
  `admin_fleet`/admins; P1 turns this into re-offer), `expireStaleOffers`
  (sweeper body — `setInterval(15s)` in `index.js`, `unref`), `cancelForOrder`
  (revoke + free partner + `order_cancelled`).
  New `deliveryController.acceptAssignment/rejectAssignment`
  (`POST /api/delivery/assignments/:id/{accept,reject}`).
  New `adminDeliveryController` (`authorize('Admin','Manager')`):
  `GET /api/admin/delivery/{partners,fleet}`,
  `POST /api/admin/orders/:id/{assign,reassign,unassign}` — `assign` supports
  `force:true` (skip offer, direct accepted `Assignment`, `source:'manual_force'`);
  `reassign` = unassign-prev + assign; all call `logAudit()` (**activates the
  dead function**). `apiController.createOrder` now persists `deliveryLocation`
  (from `address.lat/lng`) + `pickup` (from `Settings.storeOrigin`);
  `updateStatus` on Cancelled/Returned/Refunded calls `cancelForOrder` + clears
  the FK; on Delivered sets `deliveredAt`. Backend suite → **22 tests** (10
  delivery: +partners list, offer→accept→queue+409-on-2nd-accept, offer→reject→
  stalled, force-assign→unassign→partner freed). Atlas-smoked end to end
  (online→location→order Ready→admin offer→rider accept→`Assigned`+FK+active list).
  Next: **P0-D3** — partner lifecycle endpoints (pickup-arrived / picked-up /
  arrived / complete[OTP+photo] / fail[reason]) + `Notification` writes.


- **2026-09-01 — Delivery P0-D1 DONE** (backend only): delivery domain + partner
  auth. New models `DeliveryPartner` (keyed by `User._id`; `isOnline`,
  `availability` offline/available/busy, GeoJSON `currentLocation` + **sparse**
  2dsphere index — no partial-Point default or the index insert throws,
  `activeOrderIds`, `maxConcurrent`, counters, `deviceTokens`) and `DeviceToken`
  (shared customer/partner FCM). `User` gained `resetCodeHash`/`resetCodeExpires`.
  New `protectDelivery` middleware (staff JWT + `role==='Delivery'` + `status
  ==='Active'`; **auto-creates the `DeliveryPartner` row on first access**;
  customer token → 403, admin → 403, none → 401). New `deliveryController`:
  `GET /api/delivery/me`, `PUT /api/delivery/status {isOnline}` (flips
  availability; **409 if trying to go offline with an active order**),
  `POST /api/delivery/location {lat,lng}` (validates, persists GeoJSON, emits
  `fleet_update`→`admin_fleet` + `rider_location_update`→active order rooms),
  `GET /api/delivery/orders/active`, `POST /api/delivery/auth/forgot|reset`
  (6-digit code, hashed, 15-min TTL, surfaced as `devCode` in test mode — no
  mailer yet). Routes rate-limited (`express-rate-limit`, first real use).
  `app.js` socket connection now JWT-verifies `handshake.auth.token` and joins
  `partner:<userId>` (Delivery) or `admin_fleet` (Admin/Manager) — room names
  never taken from the client. `seed.js` idempotently creates a `DeliveryPartner`
  for every `role:'Delivery'` user. Offline-stub middleware bypasses
  `/delivery/*` + `/admin/delivery`. Backend suite → **18 tests** (new
  `test/delivery.test.js`, 6: auto-create, RBAC matrix, online/offline + 409,
  location validation, forgot→reset→login, socket partner-room join). Smoke-
  tested against Atlas (seeded `delivery@freshcart.com` end to end).
  Next: **P0-D2** — `Assignment` model + manual offer/accept/reject +
  `/api/admin/orders/:id/{assign,reassign,unassign}` + `Order` additive fields.

- **2026-09-01 — Delivery Partner System AUDIT + PLAN (no code)**. Produced
  `DELIVERY_SYSTEM_IMPLEMENTATION.md` (23 sections). Key findings & decisions:
  - Delivery is ~15% present: `User.role='Delivery'` (seeded `delivery@freshcart.com`,
    can already log in via `POST /api/auth/login` → staff JWT), `Order`
    `deliveryPartnerId/Name` (a **synthetic string**, not a FK) + `Assigned`/`Out
    For Delivery` statuses + `trackingTimeline`, a **manual** assign modal in admin
    `Orders.tsx`, a **static** `DeliveryModule` fleet list, staff-only
    `POST /api/orders/:id/rider-location` + `rider_location_update` socket event,
    per-order Socket.IO rooms + `order_status_update`.
  - Plan = additive: new `DeliveryPartner` (keyed by `User._id`, like `Customer`),
    `Assignment`, later `DeliveryEarning`/`DeliveryZone`/`DeviceToken` collections;
    `Order` additive fields (real FK `deliveryPartnerUserId`, `deliveryLocation
    {lat,lng}`, `pickup`, `deliveryOtp`, `podPhotoUrl`, `failureReason`,
    `pickedUpAt`/`deliveredAt`). New route groups `/api/delivery/*`
    (`protectDelivery` = staff JWT + role Delivery + Active) and
    `/api/admin/delivery/*` + `/api/admin/orders/:id/{assign,reassign,unassign}`.
  - Real-time: **reuse the existing Socket.IO server** — new JWT-gated
    `partner:<userId>` + `admin_fleet` rooms; events `delivery_offer` /
    `_revoked` / `assignment_confirmed` / `fleet_update` / `order_cancelled`;
    keep per-order rooms. Offer expiry = `setInterval(15s)` sweeper + `Assignment`
    TTL index. **No new infra** (no queue/broker).
  - Auto-assignment: trigger on `Order.status → Ready`; MongoDB `2dsphere`
    `$near` candidate query (online + fresh location + in radius + workload <
    maxConcurrent), rank by distance→workload→fairness→rating, offer top with
    `offerTimeoutSec` TTL, re-offer on reject/expire (exclusion set), atomic
    `findOneAndUpdate` accept to prevent double-assign, `maxOfferAttempts` then
    admin fallback. Config in `Settings` (`storeOrigin`, radius, timeouts, fees).
  - Delivery mobile app = **new `deliveryapp/` Flutter package** (recommended over
    a flavor of `mobileapp/`) — email+password login (not OTP), background
    location, always-on socket. Reuse `mobileapp/core` patterns.
  - Reuse: `Notification` model (currently dead — activate it), `logAudit()`
    (dead — activate), Leaflet (web, already a dep), `geolocator`/`url_launcher`/
    `mapcn_flutter`/`latlong2`/`TrackingMapPainter` (mobile), Cloudinary upload
    (POD photos), `dashboardController` aggregation style (performance),
    `backend/test` harness (+`socket.io-client`).
  - Security: partner sees customer first-name + **masked phone** + one address;
    full number only in a time-boxed reveal window (Assigned/Out For Delivery) +
    audit, OR a call-masking provider (decision pending). Customer sees partner
    first-name + masked phone + vehicle + rating; location only during active
    delivery. `protectDelivery` scopes every query to the caller; admin
    endpoints `authorize('Admin','Manager')`, destructive = Admin only.
  - Roadmap: **P0** = domain models + partner auth + `Assignment` + manual
    offer/accept/reject + partner lifecycle (pickup→deliver→proof/fail) + new
    delivery app MVP + real admin partner mgmt & manual assign. **P1** = auto-assign
    on Ready + admin live fleet map + customer live rider tracking (web+mobile) +
    FCM offers (shares customer P1-3) + activate Notification/audit. **P2** =
    earnings, zones, batching, analytics, background location service, ratings.
  - **6 decisions still needed from the user** (see doc §23): app structure,
    earnings in P0?, proof type (OTP/photo/both?), phone-privacy approach,
    auto-assign trigger status, force-assign vs offer.
  - **NOTHING IMPLEMENTED.** Awaiting approval + the 6 decisions.

- **2026-08-31 — Design-system consolidation (UI/UX audit pass)** (Flutter,
  no functional change). One system, applied everywhere. `flutter analyze`
  clean; `flutter test` **100/100**; debug APK builds.
  **Tokens** (`app_colors.dart`): new `primaryText` `#2E7D32` (green for
  text/links — `#4CAF50` fails AA on white), `warningText` `#8A5A00`,
  `errorText` `#C62828`; `error` → `#E53935`, `success` → `#2E7D32`.
  **Card**: `GlassCard` is now fully flat (shadow removed — hairline only);
  `AppCard` typedef alias added; converges with the raw-`Container` cards on the
  newer screens. **Bottom nav** (`bottom_nav.dart`): rebuilt — full-width flat
  bar, hairline top (no floating pill / shadow), **all 5 labels always visible**,
  `primaryText` active, outline→filled active icons, ≥56 dp targets;
  `main_shell.dart` **no longer hides the nav on scroll**. **Cart bar**
  (`floating_cart.dart`): rebuilt flat + tokenised; free-delivery hint now reads
  the **real** `PricingConfig.freeDeliveryThreshold` (was a hardcoded ₹400);
  rendered above the nav as a plain bar. New shared widgets: `AppIconButton`
  (≥44 dp, required semantic label), `QtyStepper` (one stepper — cart rows +
  PDP sticky bar), `SectionHeader` (locked to one size + optional subtitle).
  `EmptyState`/`ErrorState` now use `PrimaryButton` (was ad-hoc `ElevatedButton`);
  "Try Again" → "Try again". **Prototype screens onto the system:**
  `profile_screen` (→ list on flat cards, "Account" title + hairline, 16 gutter,
  `SecondaryButton` + `AppModal.confirm` logout), `membership_screen` (→
  `AppScaffold`, tokens, hardcoded `Colors.white12` divider gone, fake Member ID
  gone), `support_screen` (→ `AppScaffold`, "Help & support", flat bubbles,
  `AppIconButton` send), `tracking_screen` (→ `AppScaffold`, "Back to home" CTA
  moved to `bottomNavigationBar`, `primaryText`/`warningText`),
  `location_select_screen` (→ flat hairline AppBar + `AppColors.background`,
  `#00A86B`→tokens, `w900`→`w700`, **Confirm CTA pinned** to
  `bottomNavigationBar`). Global sweep: `AppTypography.*(AppColors.primary)` used
  as text → `primaryText` (11 files); `product_card` image placeholder spinner →
  grey box; `DiscountBadge` red-gradient+shadow → flat `primaryText` chip.
  Test updates: `design_flat_test` asserts no shadow; `'Try again'` casing in 5
  suites.
- **2026-08-31 — Web parity: order status timeline (mobile→web port)**
  (`frontend/` only). Mobile order-detail shows the real `trackingTimeline`; web
  `CustomerOrders.tsx` order-detail did not. Added an **"Order progress"** section
  rendering `selectedOrder.trackingTimeline` (status + note + localised
  timestamp, responsive `sm:`/`md:` sizing) — data already arrives on
  `GET /api/orders/customer/:phone` (full `Order` docs), no new fetch. Also fixed
  a latent bug: the All/In Transit/Delivered/Cancelled **filter tabs** compared
  `o.status` against 3 literals, so real backend statuses (`Pending`, `Packed`,
  `Out For Delivery`, `Assigned`, `Ready`, …) only showed under "All". New
  `bucketOf(rawStatus)` collapses the 11-value enum onto the 3 UI buckets, used
  by the tabs + both badge sites + the detail banner. Removed the unused
  ~135-line `initialCustomerOrders` mock array. `tsc -b && vite build` passes.
- **2026-08-31 — Audit fixes, Group 1: Broken functionality DONE** (Flutter,
  no backend change — used existing real endpoints). Per
  `MOBILE_FUNCTIONALITY_AUDIT.md` §29 P0.
  **Address CRUD is real now**: `ApiService.addAddress` (`POST
  /customers/me/addresses`) + `deleteAddress` (`DELETE …/:addressId`);
  `AuthNotifier.addAddressRemote` / `removeAddress` / `updateProfile` each call
  the API then re-hydrate from `/customers/me`. `AddressesScreen` rebuilt
  (`AppScaffold`, real list, `AppBottomSheet` add form with validation, delete →
  `AppModal.confirm`, `EmptyState`, `LoadingOverlay`, `AppToast`) — the hardcoded
  `Flat 801, Emerald Towers` mock insert is **gone**. `location_select` now
  `POST`s the address for real (local fallback only on network error).
  **Profile edit**: new `ProfileEditScreen` (`/account/edit`, name/email →
  `PUT /customers/me/profile` via `updateProfile`), reached from an "Edit"
  button on the Account avatar card; phone shown read-only.
  **Wallet**: removed the 3-row fake transaction list and the no-op "Add Money"
  button (no customer-facing history/top-up endpoint exists); shows real balance
  + "how it's credited" + `referralCode` (new `UserProfile.referralCode` field,
  copy-to-clipboard).
  **Notifications**: `NotificationsScreen` is a real activity feed derived from
  `ordersProvider` order timelines (newest first, tap → `/order/:id`), with
  loading/error/empty; reachable via a **bell in the Home header** and a Profile
  menu row. **Wishlist** now has a Profile menu row (was orphaned).
  **Orphaned routes removed**: `location_screen.dart` (fake OS permission dialog)
  and `map_selection_screen.dart` (1010 lines, `_mockSuggestions`) deleted along
  with `/location` + `/map_selection` routes.
  **Dial actions**: added `url_launcher: ^6.2.5` + `core/utils/launch.dart`
  (`dialPhone` / `openMaps` / `openUrl` with failure toasts) + manifest
  `<queries>` for `tel:` / `https`. `StoresScreen` rebuilt (`AppScaffold`, flat,
  real **Call** + **Directions** buttons); tracking "call rider" button wired to
  `dialPhone(riderPhone)`.
  **Banner tap targets**: `core/utils/web_link.dart` `resolveAppRoute()` maps CMS
  `linkUrl`/`link` (`/products?category=…`) onto real app routes; unmappable
  targets (`/offers`, `/brands`) render non-tappable instead of dead-ending.
  **Logout** now also clears cart / wishlist / recent-search caches (best-effort).
  Tests: `test/account_screens_test.dart` (8 — `resolveAppRoute` unit, profile
  edit → `updateProfile`, wallet balance+referral / no fake data, addresses
  empty / add → real `POST` / delete → real `DELETE`). `flutter analyze` clean;
  `flutter test` **100/100**; debug APK builds.
- **2026-08-31 — Screens pass, Flow 4 COMPLETE: Orders list · Order detail ·
  Tracking DONE** (Flutter, no backend change — P0-7/P1-2 logic untouched).
  `orders_list_screen.dart` rebuilt: `SkeletonList` loading, **Active / Past
  split with headers**, flat card (status icon+text, date, **stacked item
  thumbnails**, N items·₹total, address), actions = Track (active) / **Reorder**
  (past → re-adds every line to cart via `cartProvider`, `AppToast`, → `/cart`) +
  Details. Shared `statusColor`/`statusIcon`/`reorder(ref,order)` helpers exported
  from this file. `order_detail_screen.dart` rebuilt on `AppScaffold`:
  `_DetailSkeleton`, status header, timeline (uses `trackingTimeline`), item rows
  **with thumbnails**, bill card (+tax row when >0), delivery/payment card,
  Track (active) / **Reorder these items** (past). `tracking_screen.dart` flat
  polish only: map container → hairline border (was blur-30 shadow), overlay card
  → flat `GlassCard` (was `0xE0` translucent), copy tidied ("Estimated arrival",
  "Order progress", "Back to home"); the `TrackingMapPainter` rider mock + live
  socket bucket + `trackingProvider` untouched. Tests:
  `test/orders_flow_test.dart` (8 — list empty/split/reorder→cart/error/→detail;
  detail status+timeline+bill / active Track / error retry). `flutter analyze`
  clean; `flutter test` **92/92**. **Screens pass Flows 1-4 done** (auth ·
  browse · cart/checkout · orders). Remaining screens: Account + sub-pages
  (wallet/membership/support/addresses/notifications/stores), Location select
  redesign, festival theming (P2).
- **2026-08-31 — Screens pass, Flow 3 COMPLETE: Cart · Checkout · Order placed
  DONE** (Flutter, no backend change — P0-6/P1-1 logic untouched). New shared
  `features/cart/.../widgets/`: `BillingSummary` (single bill-of-sale card read
  from `CartState`, tax label uses `pricing.taxPercent`, "You save ₹X" footer) +
  `CheckoutBar` (flat sticky action bar) — used by **both** Cart and Checkout so
  they can't drift. `cart_screen.dart` rebuilt on `AppScaffold`: `CachedNetworkImage`
  row thumbnails, flat stepper, swipe-to-delete, delivery-speed radio,
  **`_CouponSection`** = manual `AppTextField` code entry + Apply + live
  `couponsProvider` list (server `validateCoupon`, `AppToast`), applied-coupon
  chip w/ Remove; **Clear** now `AppModal.confirm`; `BillingSummary` + `CheckoutBar`.
  `checkout_screen.dart` rebuilt on `AppScaffold` + **`LoadingOverlay`** (was a
  hand-rolled `Stack` scrim; the buggy `Positioned`-in-`Column` bars are gone):
  address card (→ `/addresses`), delivery tile, 4 flat payment tiles (wallet
  shows balance + "Low balance" when short), `BillingSummary`, `CheckoutBar`;
  errors + missing-address → `AppToast` (was `SnackBar`); unchanged
  `checkoutControllerProvider` state machine + `ref.listen` nav to
  `/order-placed/:id`. `order_placed_screen.dart`: gradient tick with
  `easeOutBack` scale-in, "Arriving in ~8 minutes" pill, `PopScope` now routes
  hardware-back to `/` (no dead-end). Tests: `test/checkout_flow_test.dart` (7 —
  cart empty / rows+bill+bar / stepper / Clear-confirm; checkout no-address toast
  / COD → `submit(cod)`; order-placed content + back→home). `flutter analyze`
  clean; `flutter test` **84/84**.
- **2026-08-31 — Screens pass, Flow 2 COMPLETE: Search + Wishlist DONE**
  (Flutter). `search_screen.dart` rebuilt: `_Discovery` (empty query) shows a
  **persisted "Recent"** chip row + "Trending" chips derived from live
  `categoriesProvider` (was a hardcoded list); `_Results` = `SkeletonGrid`
  loading / `ErrorState` / `EmptyState` / sliver grid with count line;
  350 ms debounce; clear (×) button; `AppToast` on add. New
  `StorageService.getRecentSearches/addRecentSearch/clearRecentSearches` (on the
  settings box, cap 8) + `search_controller.dart` `recentSearchesProvider`
  (`StateNotifier<List<String>>`). `CustomSearchBar` gained `autofocus` +
  `trailing` + `textInputAction: search`. `SearchDetailScreen` now
  `SearchScreen(autofocus: true)`; Home search pill → `/search_detail` (push,
  autofocus) while the Search **tab** stays browse-mode.
  `wishlist_screen.dart` rebuilt on `AppScaffold`: `SkeletonGrid` loading,
  `ErrorState`, `EmptyState` (→ `/`), count line, sliver grid, **per-card remove
  (×) overlay** + **"Add all" app-bar action**, `CatalogCartBar`,
  pull-to-refresh, `AppToast` throughout. Tests:
  `test/search_wishlist_test.dart` (7 — trending from catalog, term→search +
  recent recorded + back-to-discovery, no-results empty; wishlist empty / list +
  remove / add-all / error). `flutter analyze` clean; `flutter test` **77/77**.
  **Flow 2 (browse) done: Home · Categories · Category catalog · Product details ·
  Search · Wishlist.**
- **2026-08-31 — Screens pass, Flow 2 (WIP): Product details DONE** (Flutter
  only). `product_details_screen.dart` rebuilt: `SliverAppBar` gallery
  (`_Gallery` `PageView` over `ProductModel.gallery` — **new field**, parsed from
  `images[]` + main image, `CachedNetworkImage`, dots, Hero on first image) with
  circular translucent back/wishlist/share buttons; info block = organic pill +
  "Delivery in 8 mins" badge + **low-stock "Only N left"** (uses
  `stockQuantity`); brand/title/rating; price row (₹price, strike MRP, % OFF);
  size chips (only when >1 option); About (hidden if description empty); a "key
  info" `GlassCard` (unit/type/organic/in-stock + nutrition rows); "Why shop
  from FreshCart" trust block; `ProductRail` "You might also like" from
  `similarProductsProvider`. Sticky `bottomSheet` `_StickyBar` — flat surface +
  hairline top, total price ×qty, **Add to cart → qty stepper**, disabled **"Out
  of stock"** when `!inStock`. Share = copy summary to clipboard + toast.
  Wishlist toggle + add-to-cart → `AppToast` (was raw `SnackBar`); loading →
  `_PdpSkeleton`; error → `ErrorState` retry. Tests:
  `test/product_details_test.dart` (6 — name/price/discount/size render, add →
  stepper + toast, out-of-stock disables CTA, low-stock warning, wishlist toggle
  + toast, error retry). `flutter analyze` clean; `flutter test` **70/70**.
  Remaining in Flow 2: Search, Wishlist.
- **2026-08-31 — Screens pass, Flow 2 (WIP): Categories + Category catalog DONE**
  (Flutter only). `categories_screen.dart` rebuilt off the 2-col icon grid into a
  native directory: per-category section (icon + name + See-all → `/category/:id`)
  with a 4-col subcategory tile grid (tinted square + category icon + label →
  `/category/:id?sub=<name>`), plus a live "Trending searches" chip cloud
  (category + subcategory terms). States: `_CategoriesSkeleton`, `ErrorState` +
  retry, `EmptyState`, pull-to-refresh (categories + allProducts).
  `category_catalog_screen.dart` rebuilt on `AppScaffold`: subcategory
  `ChoiceChip` strip, filter/sort moved into an `AppBottomSheet` (organic switch +
  sort radio) behind a `tune` action with an active-dot; product-count line;
  `SkeletonGrid` loading; `ErrorState`; `EmptyState` with a **Clear filters**
  action; `AppToast` on add (was raw `SnackBar`); new `CatalogCartBar`
  (`features/cart/.../widgets/`) as `bottomNavigationBar` — "N items · ₹total ·
  View cart" (full-screen catalog routes don't get the shell's `FloatingCart`).
  **Router:** `/category/:id` now reads `?sub=` → `CategoryCatalogScreen.initialSubCategory`.
  Tests: `test/category_screens_test.dart` (8 — sections/tiles/trending render,
  subcategory tile → filtered catalog, error/empty, catalog count line, initial
  sub selected, empty→clear-filters, add→toast). `flutter analyze` clean;
  `flutter test` **64/64**. Remaining in Flow 2: Product details, Search, Wishlist.
- **2026-08-31 — Screens pass, Flow 2 (WIP): Home DONE** (Flutter only, no
  backend change). Rebuilt `home_screen.dart` off the old navy-gradient/lime
  prototype onto the flat system — now a `ConsumerWidget`. New
  `features/home/.../widgets/home_header.dart` (`HomeHeader` — flat surface bar:
  8-min promise, tappable address → `/location_select`, profile → `/account`,
  read-only search pill → `/search` tab, cart icon + live count badge →
  `/cart`) and `.../widgets/product_rail.dart` (`ProductRail` titled horizontal
  `ProductCard` shelf with optional See-all; `ProductRailSkeleton`). Home
  sections: category strip (`CategoryCard` → `/category/:id`), real
  `bannersProvider` carousel (`CachedNetworkImage` + dots), `specialGroupsProvider`
  image grids (real CMS images), curated rails (Fresh today / Organic / Best
  sellers, filtered from `allProductsProvider` flags), per-category rails, a
  trust row. **States:** both catalog calls loading → `_HomeSkeleton` (3
  `ProductRailSkeleton`); both error → `ErrorState` + retry (invalidate all 4
  providers); categories+products both empty → `EmptyState`; banners/special
  errors are non-critical (silently omitted). Pull-to-refresh invalidates.
  Add-to-cart → `AppToast.success` / `.info` at the `kMaxQtyPerItem` cap (was a
  raw green `SnackBar`). **Shared upgrade:** `ProductCard` image →
  `CachedNetworkImage` (shimmer placeholder + branded icon fallback), lifts
  every catalog screen. Tests: `test/home_screen_test.dart` (5 — rails+category
  render w/ scroll, product tap → PDP route, add → toast, dual-error →
  `ErrorState`, empty → `EmptyState`). `flutter analyze` clean; `flutter test`
  **56/56**. Remaining in Flow 2: Categories, Category catalog, Product details,
  Search, Wishlist.
- **2026-08-31 — Screens pass, Flow 1: Authentication DONE** (Flutter only, no
  backend change). Native redesign of the sign-in flow against the flat design
  system + FND widgets. New `core/widgets/otp_field.dart` (`OtpField` — segmented
  code input: auto-advance, backspace-to-prev, clipboard/OTP-autofill paste
  distributes across boxes, `onCompleted`, error border + shake, `reset()` via
  `GlobalKey<OtpFieldState>`) and `core/widgets/phone_field.dart` (`PhoneField` +
  `PhoneFieldController` — fixed `+91`, grouped `98765 43210` display, 10-digit
  cap, `.digits`/`.isValid`); both exported from `foundation.dart`. New
  `features/authentication/.../widgets/auth_scaffold.dart` (`AuthScaffold` —
  circular back, brand badge, title/subtitle, scrolling body, keyboard-aware
  bottom CTA) shared by login + OTP. **Rewrites:** `onboarding_screen` — real
  catalog product-image collage from `allProductsProvider` (3 offset columns,
  skeleton while loading, branded gradient fallback on error/empty), 3 info
  slides, dots, Skip; `login_screen` — `AuthScaffold` + `PhoneField`, inline
  error + `AppToast`, `context.push('/otp?phone=')`, back = pop-or-`/onboarding`;
  `otp_screen` — `AuthScaffold` + `OtpField`, 45s resend countdown, test-mode
  `AppAlert` banner, auto-verify on 6th digit, error → shake + clear, success →
  `/` if the customer already has a saved address else `/location_select`.
  `location_select_screen` — added `_leave()` (pop-or-`/`) so the screen
  terminates correctly whether reached via `go` (sign-in) or `push` (in-app);
  new address now also carries `name`/`label` (checkout reads those). Tests:
  `test/auth_flow_widget_test.dart` (9 — PhoneField grouping/cap, OtpField
  type/paste/error, login validation + OTP request + route, OTP wrong-code
  clear, OTP success → token stored + onward route). `flutter analyze` clean;
  `flutter test` **51/51**; debug APK builds.
- **2026-08-31 — Mobile UI foundation (FND) DONE** (Flutter only, no backend
  change). Filled the gaps left after P0-4/P0-5: added `AppRadius` tokens,
  `AppTextField`, `AppModal`, `AppBottomSheet`, `AppToast`+`AppAlert`,
  `skeletons.dart`, `loading_overlay.dart`, `AppScaffold`, `foundation.dart`
  barrel. Wired `AppToast.messengerKey` into `MaterialApp.router`. App entry,
  GoRouter architecture, auth redirect flow, bottom-nav shell, per-tab stacks,
  safe-area handling, theme/typography/spacing were already production-wired
  (P0-4/P0-5) — verified, not rebuilt. No business screens touched. Tests:
  `test/foundation_widgets_test.dart` (7 — text field, modal confirm, bottom
  sheet, toast, loading overlay, skeletons, AppScaffold back) +
  `test/navigation_test.dart` (5 — tab-stack isolation, re-tap-to-root, nested
  push/pop, Android back non-home→home). `flutter analyze` clean;
  `flutter test` **39/39**.
- Backend, web storefront, web `/admin/*` console: built (per `CHANGELOG.md` /
  `KNOWLEDGE_BASE.md`). Latest git: "Campegin theme implemented".
- Mobile prototype: onboarding/auth screens (mocked), home (live API), categories/
  products/search/wishlist (MockDataService), cart+checkout (simulated), orders +
  socket tracking map, profile/wallet/membership/support, dark mode.
- **2026-08-31**: Full pre-implementation audit completed. Produced
  `MOBILE_APP_IMPLEMENTATION.md` (feature inventory, API inventory, screen list,
  navigation proposal, missing backend work) and `MOBILE_APP_ROADMAP.md`
  (P0/P1/P2 work packages, each with Screen / Functionality / API / Components /
  Backend changes / Dependencies / Testing).
- **2026-08-31 — P1-2 live order tracking DONE** (backend + Flutter). Backend: `updateStatus` + `createOrder` now emit `order_status_update` to the order's socket room via `req.app.get('io')` (payload: orderId, status, note, eta, timeline, at). New `POST /api/orders/:id/rider-location` (staff/delivery) emits `rider_location_update`. `app.js` handles `leave_order_room`. `SocketService` rewritten — `connectionStream`, auto-rejoin rooms on reconnect, `enableReconnection()` (20 attempts, 1–8s backoff), `leaveOrderRoom`. `TrackingNotifier` rewritten — seeds from a real `GET /orders/:id`, listens to both socket streams + `connectionStream`, **15s polling fallback while the socket is down**, `dispose()` cancels subs/timer + leaves the room; `TrackingState` gained `statusBucket`/`timeline`/`connected`/`hasRider`. `tracking_screen` drives entirely off `TrackingState` (dropped the fragile `ordersProvider.firstWhere` fallback), adds a Live/Reconnecting pill. New backend test `test/socket.test.js` (real socket.io-client: join room → `PUT /orders/:id/status` → assert `order_status_update` received). Backend suite → **12 tests** (+socket.io-client devDep).
- **2026-08-31 — P1-1 real Razorpay payments DONE** (backend + Flutter), test keys.
  `backend/.env` now has real **Razorpay TEST** keys + `RAZORPAY_WEBHOOK_SECRET`, `PAYMENTS_TEST_MODE=false` → real gateway orders + real HMAC signature verification (verified end-to-end against api.razorpay.com: `create-order` returns a genuine `order_…`, good sig → `verified:true`, bad/missing → 400). `PAYMENTS_TEST_MODE` is now a per-call `isPaymentsTestMode()` (env-toggleable for tests). New `POST /api/payment/webhook` (raw-body parsed in `app.js`, `X-Razorpay-Signature` HMAC check, marks the order Paid on `payment.captured`/`order.paid`). New `POST /api/customers/me/wallet/debit` (`protectCustomer`, balance-checked, writes `WalletTransaction`). `createOrder` stores `paymentId`/`paymentRef` (new `Order` fields) + writes a `Payment` reconciliation doc. `/payment/*` got `attachCustomerOptional`. Backend suite → **11 tests** (added create-order, bad-sig-live-mode, wallet-debit).
  Flutter: added `razorpay_flutter: ^1.3.7` (resolved 1.4.5) + `android/app/proguard-rules.pro` (keep rules, only needed if minify is enabled). New `core/services/payment_service.dart` — `PaymentGateway` interface + `RazorpayGateway` (native sheet, Completer-wrapped events) + `SimulatedGateway` (test-mode fallback). New `features/checkout/.../checkout_controller.dart` — `CheckoutController` state machine (idle→processing→success/failed, `stage` text): razorpay = create-order → gateway.pay → verify → `placeOrder(paid:true, paymentId, paymentRef)`; wallet = `walletDebit` → `setWalletBalance` → placeOrder; cod = placeOrder(paid:false); nothing is placed if payment fails/cancels. `paymentGatewayProvider` is override-able for tests. `ApiService` gained `createRazorpayOrder`, `verifyPayment`, `walletDebit`. `OrdersNotifier.placeOrder` gained `paymentId`/`paymentRef`. `AuthNotifier` gained `setWalletBalance`. `checkout_screen` rewired to the controller — `ref.listen` for nav/errors + a processing overlay showing the current stage. New tests `test/checkout_controller_test.dart` (gateway results + state machine).
- **2026-08-31 — P0-8 release-config hygiene DONE**. Backend split into
  `app.js` (`createApp()` builds app + httpServer + io, no `listen`, sets
  `app.set('io', io)`) and `index.js` (dotenv + `createApp` + `connectDB` +
  `listen`). New **backend test suite** `backend/test/api.test.js` (`node:test` +
  `supertest`, `npm test` → `node --test "test/*.test.js"`), 8 tests: health,
  catalog-public/orders-401, OTP→JWT + wrong-code, `protectCustomer` +
  staff-token-reject, coupon validate (fixed/below-min/bogus), order tied to
  token + `/orders/mine` + ownership 403, status-update timeline append, payment
  test-mode. Runs against `MONGO_URI` (Atlas), self-cleaning fixtures;
  `mongodb-memory-server` not added (binary download risk here) — CI passes a
  throwaway `TEST_MONGO_URI`. Added `supertest` devDep.
  Repo hygiene: proper root `.gitignore` (node_modules, dist, build, .dart_tool,
  GeneratedPluginRegistrant, env/prod.json); **`git rm -r --cached
  backend/node_modules`** (11,584 files untracked — shows as deletions until
  committed); stray root `package-lock.json` deleted; `backend/.gitignore` added.
  `AppConfig` gained `env` / `isProduction` (`--dart-define ENV=`); added
  `mobileapp/env/staging.json` + `env/README.md` (`--dart-define-from-file`
  workflow). New `.github/workflows/ci.yml` (backend `npm test` + Flutter
  analyze/test). Verified: refactored `index.js` boots; `flutter build apk
  --debug --dart-define-from-file=env/staging.json` succeeds.
- **2026-08-31 — P0-7 order history + detail on real data DONE** (backend + Flutter).
  Backend: new `GET /api/orders/mine` (`protectCustomer`) → orders where
  `customerId` = token's id OR `customerPhone` ends with the token's phone,
  newest first; `GET /api/orders/:id` now runs `attachCustomerOptional` + an
  ownership check (own → 200, other customer → 403, no token → 200 for web).
  Route order: `/orders/mine` registered before `/orders/:id`.
  Flutter: `OrderModel` gained `fromServerJson` (maps the backend's 9-value
  status enum → 5 app buckets via `orderStatusFrom`, parses `trackingTimeline`,
  builds light `ProductModel`s from order lines), plus `statusRaw`, `timeline`,
  `paymentMethod`, `paymentStatus`, `isActive`. `ordersProvider` is now
  `StateNotifierProvider<OrdersNotifier, AsyncValue<List<OrderModel>>>` — fetches
  `GET /orders/mine` on init, `refresh()`, keeps `placeOrder` (optimistic prepend
  + throws on failure). **Demo-seeded past order removed.** New
  `orderDetailProvider.family` → `GET /orders/:id`. New screens:
  `OrderDetailScreen` (`/order/:id` — status header, timeline, items, bill
  breakdown, delivery+payment, Track button) and the P0-6 `OrderPlacedScreen`.
  `orders_list_screen` rewritten — `.when` loading/error/empty + pull-to-refresh,
  `_OrderCard` → View Details / Track. `tracking_screen` updated for the
  `AsyncValue` shape. `ApiService`: new `fetchMyOrders`, `fetchOrder(id)`; the
  last `kDebugMode` fallback removed (`fetchCustomerOrders` deleted).
- **2026-08-31 — P0-6 cart + place-order on real data DONE** (backend + Flutter).
  Backend: new `POST /api/coupons/validate {code, subtotal}` → server-computed
  `{valid, discount, message}` (min-order check, percent capped at ₹100, clamped
  to subtotal); new `attachCustomerOptional` middleware on `POST /api/orders` —
  when a customer Bearer token is present, `customerId`/`name`/`phone` come from
  it, not the body (web's tokenless calls still work). `createOrder` respects
  client `paymentStatus`/`status`.
  Flutter: new `core/services/pricing.dart` (`PricingConfig.fromSettings`,
  `PricingService.compute` → subtotal/savings/delivery/tax/total; free delivery
  ≥ ₹499, tax on post-coupon base). New
  `features/cart/.../commerce_providers.dart` (`settingsProvider`,
  `pricingConfigProvider`, `couponsProvider`). `CartState`/`CartNotifier`
  rewritten — pricing from `PricingConfig` (synced from `GET /api/settings` via
  `ref.listen` in the notifier), `kMaxQtyPerItem = 3` enforced in `addToCart`,
  `appliedCoupon` is now `{code, discount}` set only via `applyValidatedCoupon`
  after a server `validateCoupon` call. `ApiService`: new `fetchSettings`,
  `fetchCoupons`, `validateCoupon(code, subtotal)`; **`createOrder` now throws
  `ApiException` on failure** (no offline fake order). `cart_screen` coupon list
  is live (`couponsProvider`) with a `_CouponTile` + `_applyCoupon` helper.
  `orders_controller.placeOrder` builds a full item payload, POSTs for real,
  returns the **server** `orderId`, joins the socket room; throws on failure.
  `checkout_screen` `_onPlaceOrder` rewritten — no fake 2s delay, real try/catch,
  wallet deducted only after server confirms, routes to new `/order-placed/:id`
  (`OrderPlacedScreen` — checkmark + Track / Continue / View orders).
  Fixed a latent crash: checkout read `selectedAddress['tag']` (never set) →
  now `['name']`/`['label']`. **`lib/core/services/mock_data_service.dart`
  DELETED** — no runtime mock data anywhere in the app now.
- **2026-08-31 — P0-5 design-system reconciliation DONE** (Flutter only).
  **Decision (user-approved): align the mobile app to the web's flat system**
  (not glassmorphism). `GlassCard` reimplemented flat — solid `surface` bg, 1px
  hairline `divider` border, one barely-visible shadow (blur 8, y-offset 2),
  default radius 28→16; **`blur` param kept but ignored** so ~30 call sites are
  untouched. `BackdropFilter` no longer used anywhere in `core/widgets`.
  `AppColors.card`/`cardDark`/`glass`/`glassDark` are now solid (were 72–96%
  translucent). `AppTheme` cardTheme radius 28→16, translucent border → hairline.
  Buttons (`PrimaryButton`/`SecondaryButton`/`GlassButton`) default radius 20→100
  (full pill); primary CTA shadow toned down. **Typography now uses
  `google_fonts`** (added `google_fonts: ^6.2.1`): headings → Plus Jakarta Sans
  (w700/w800), body/labels → Inter — matches `DESIGN.md`. `app_typography.dart`
  method names/signatures unchanged. Note: google_fonts fetches faces at runtime
  (cached; graceful fallback offline). New `test/design_flat_test.dart` locks the
  no-glass / pill-button / warm-bg invariants.
- **2026-08-31 — P0-4 navigation shell DONE** (Flutter only): `app_router.dart`
  now uses `StatefulShellRoute.indexedStack` with **5 branches** —
  `/` Home · `/categories` · `/search` · `/orders` · `/account` (ProfileScreen) —
  each keeping its own nav stack. Full-screen routes (auth, `/category/:id`,
  `/product/:id`, `/cart`, `/checkout`, `/tracking/:id`, `/wallet`, `/membership`,
  `/support`, `/addresses`, `/notifications`, `/search_detail`, **new `/stores`**)
  sit above the shell (no bottom nav). **`/profile` now redirects to `/account`**
  (fixes the runtime nav crash from `home_screen`). `MainNavigationShell` (old
  `IndexedStack`) replaced by `MainScaffold(navigationShell)` in `main_shell.dart`
  — keeps the floating cart + scroll-hide bottom bar, adds `PopScope`:
  hardware back on a non-Home tab → jump to Home tab; on Home root → "press back
  again to exit". `CustomBottomNavBar` rebuilt for 5 items
  (Home/Categories/Search/Orders/Account), dropped the "Brand of the Day" badge,
  added `Semantics`. `home_screen` avatar → `/account`; profile menu "Order
  History" → `context.go('/orders')`, new "Store Locator" → `/stores`.
- **2026-08-31 — P0-3 live catalog data DONE** (Flutter only, no backend change):
  Retired `MockDataService` at runtime. New `core/utils/parse.dart` (lenient
  `asDouble/asInt/asBool/asString/asColor/stockQuantityOf` — handles hex-string
  colors, string numbers, `stock` as number OR `{status,quantity}`).
  `CategoryModel` now parses `displayName`, `subCategories[]`, hex color;
  `ProductModel` fully tolerant + new `stockQuantity`/`inStock` (parsed from any
  stock shape), image fallback from `images[]`, `mrp` clamped ≥ `price`.
  `ApiService` catalog methods (`fetchBanners/fetchCategories/fetchSpecialGroups/
  fetchProducts/fetchProduct`) now **throw `ApiException`** on failure — no demo
  fallback; `fetchProducts` gained `search`/`isOrganic`/`sort` params (server
  applies them); new `fetchProduct(id)`. `catalog_providers.dart` rewritten:
  `allProductsProvider`, `categoryProductsProvider.family(CatalogQuery)`,
  `productDetailProvider.family`, `similarProductsProvider.family`,
  `searchProductsProvider.family`. Screens converted to watch these with
  loading (skeletons/spinner) / empty (`EmptyState`) / error (`ErrorState` +
  `ref.invalidate` retry) / pull-to-refresh: `categories_screen`,
  `category_catalog_screen` (dropped the hardcoded `_categorySubMap` + fuzzy
  category matching — subcategory chips now come from the live category's
  `subCategories`; sort/organic go server-side), `product_details_screen`
  (now a `ConsumerWidget` wrapper + `_ProductDetailsView`), `search_screen`
  (350ms debounce → server `?search=`), `wishlist_screen` (favourite ids
  resolved against `allProductsProvider`). `main.dart` no longer calls
  `MockDataService.syncWithServer`. `mock_data_service.dart` kept only for
  `cart_screen`'s `mockCoupons` (P0-6 will remove).
- **2026-08-31 — P0-2 real customer authentication DONE** (backend + Flutter):
  Backend — new `Otp` model (hashed code, TTL index, 5-attempt lockout), new
  `smsService` (test mode = no send + fixed code `000000`; `SMS_PROVIDER` env for
  msg91/twilio), new `authCustomerController` with `POST /api/customers/otp/send`
  + `/otp/verify` (issues a 30-day customer JWT `{id:customerId, type:'customer'}`
  + returns the `Customer`), new `protectCustomer` middleware, new
  `GET /api/customers/me` + `PUT /api/customers/me/profile` +
  `POST|DELETE /api/customers/me/addresses[/:addressId]` (reuse existing
  controller handlers via an `asMe` shim). Offline-stub middleware bypasses
  `/customers/otp*` and `/customers/me`. `findOrCreateCustomer` sets a
  `referralCode` (legacy unique index). Legacy phone-keyed `/customers/:id*`
  routes left open — web still uses them (documented debt).
  Flutter — added `flutter_secure_storage`; new `core/config/app_config.dart`
  (env-overridable base URLs, used by `ApiService` + `SocketService`),
  `core/services/token_store.dart` (secure JWT store, in-memory cache),
  `core/error/api_exception.dart`. `ApiService` gained a Dio auth interceptor
  (Bearer + 401 -> `onUnauthorized`) and real `sendOtp`/`verifyOtp`/`fetchMe`/
  `updateMyProfile`. `AuthNotifier` rewritten — **no more hardcoded "John Doe"**;
  boots from stored token, `_hydrate()` -> `/customers/me`, real
  `sendOtp`/`resendOtp`/`verifyOtp`/`logout`, `UserProfile.fromCustomerJson`
  (tolerant, maps `fullAddress/lat/lng` -> `addressLine/latitude/longitude`).
  `app_router.dart` is now `routerProvider` (Provider<GoRouter>) with a
  `redirect` guard (unauthenticated -> `/login` except splash/onboarding/login/
  otp) + auth-driven `refreshListenable`; `main.dart` consumes it. `login_screen`
  is phone-only now (Email/demo tab removed). `otp_screen` has a working resend
  countdown, real error surfacing, test-mode code hint. `splash_screen` awaits
  `ensureHydrated()`.
- **2026-08-31 — P0-1 backend defect fixes DONE** (backend + 1 admin-frontend line):
  `Order` schema gained `trackingTimeline[]` + `deliveryPartnerId/Name` (fixes
  `PUT /api/orders/:id/status` which always threw); dashboard revenue uses
  `totalAmount` not non-existent `grandTotal` (no more NaN); `Product.stock` is
  written as nested `stock.quantity`/`stock.status` everywhere (createOrder
  decrement, inventory adjustStock, low-stock query) instead of clobbering the
  object with a bare number; `payment/verify` does a real constant-time HMAC
  check and returns `verified:false` (400) on mismatch, with an explicit
  `PAYMENTS_TEST_MODE` flag + `testMode:true` in the response for dev;
  `GET /api/orders` and `GET /api/reviews` now require `protect` +
  `authorize('Admin','Manager')` (admin `fetchReviews` got the auth header);
  hardcoded secret fallbacks removed from source (Mongo URI, JWT secret,
  Cloudinary, Razorpay) — env-only now, `backend/.env.example` added, missing-env
  warning in `index.js`; destructive catalog re-seed on boot gated behind
  `NODE_ENV !== 'production'`. `KB §5 item #1 (mongoose not imported) was already
  fixed — stale.` Verified against Atlas on port 5055 (see §12).

## 6. Current Work

- **Session status as of 2026-09-05 (latest, supersedes the stale P0/P1 entries
  below which are from 2026-08-31):**
  - **P0.1 (category-tap-shows-no-products) — ✅ DONE, fully closed and
    live-device verified.** See §5/§7 for detail.
  - **P0.2 (live-device visual/alignment QA) — paused at a partial spot-check
    by user request**, not because of a defect. Home, Categories, and Search
    (+ results) were confirmed clean on a real device. Product details, Cart,
    Checkout, Orders, and Profile were **not** visually checked this session.
    User said no further manual testing is needed for now — don't re-open this
    unprompted, only if a specific screen issue is reported.
  - **P1 not started** — all 4 P1 items are either blocked on an external
    dependency the user hasn't provided (Apple APNs key; telephony/call-masking
    provider choice) or are a larger cross-app auth item (locking legacy
    customer routes needs real web customer auth shipped first, see §7).
  - **P2 — about to start, essentially nothing landed yet.** Was mid-investigation
    of P2.4 (repo hygiene: confirmed **259 build-cache files are actually
    tracked in git** under a root `.dart_tool/` despite `.gitignore` already
    listing that pattern — needs `git rm -r --cached` to untrack; not yet done)
    when the user said to stop. **No repo/file changes were made for P2** —
    investigation only.
  - **⚠ Concurrent editing observed this session**: another process (a
    different Claude Code session, or the user directly) was actively editing
    `mobileapp/` files at the same time as this session — `auth_scaffold.dart`
    (full redesign), `category_catalog_screen.dart` (chip row → left icon
    rail), `category_screens_test.dart`, `auth_controller.dart`, and
    `core/widgets/product_card.dart` all changed on disk mid-session without
    this session doing it. One of those changes (`product_card.dart` reading
    `StorageService` from `GetIt` directly) briefly broke 8 tests; it was
    since fixed by whoever made it — `flutter test` is back to 124/124 as of
    the last check. **If picking this up in a new session: re-verify current
    file contents before assuming anything below in this doc about specific
    file states is still accurate for `mobileapp/lib/features/authentication/`
    and `mobileapp/lib/features/categories/` — they were a moving target.**
  - **Next when resumed**: user said to proceed into P2 without further manual
    testing gating. Reasonable P2 entry point is still §19's P2.1 (festival
    theme parity) or finishing P2.4 (the `git rm -r --cached` cleanup) —
    neither was started.

- **✅ Phase P0 COMPLETE** — P0-1…P0-8 done (see §5). The mobile app runs entirely
  on real backend APIs with real customer auth: OTP login, live catalog,
  5-tab nav, flat design system, settings-driven cart pricing + server-validated
  coupons, real order placement tied to the customer identity, real order
  history + detail. No mock data anywhere. Backend defects that blocked the order
  lifecycle are fixed. Backend integration test suite (`npm test`, 8 tests) +
  Flutter suite (27 tests) + CI workflow in place.
- **Not yet done in P0** (explicitly deferred): real payment gateway (P1-1),
  server-side `order_status_update` socket emitter / live tracking feed (P1-2),
  push notifications (P1-3), product reviews (P1-4), order cancel + address/
  profile screen wiring (P1-5), force-update/offline resilience (P1-6). Also: no
  device/emulator run of any flow yet; `mongodb-memory-server` not wired (suite
  runs against `MONGO_URI`); credentials in `backend/.env` still need rotation.
- **Phase P1 in progress.** Done: **P1-1** (real Razorpay payments, test keys), **P1-2** (live order tracking — real socket pipeline). Next: P1-3 push, P1-4 reviews, P1-5 cancel + address/profile wiring, P1-6 offline/force-update.
- **Parallel work stream** (not mine): someone is adding a design-system widget layer under `mobileapp/lib/core/widgets/` — `app_toast.dart` (`AppToast.messengerKey`, wired in `main.dart`), `app_modal.dart`, `app_bottom_sheet.dart`, `app_scaffold.dart`, `app_text_field.dart`, `loading_overlay.dart`, `skeletons.dart`, `foundation.dart`, plus `test/navigation_test.dart`. Coexists cleanly so far; watch for overlap when touching `bottom_nav.dart` / `buttons.dart` / `glass_card.dart`.
- **Action for the user**: restart the backend server running on port 5000 — it
  is still on pre-P0-1/P0-2 code. Set `SMS_PROVIDER` + credentials in `.env` to
  enable real OTP SMS (currently test mode: code is always `000000`).

## 7. Known Issues

Backend — FIXED in P0-1 (2026-08-31): `Order.trackingTimeline` added → status
updates work; dashboard uses `totalAmount` → no NaN; `Product.stock` nested-field
writes everywhere; `payment/verify` real HMAC + `PAYMENTS_TEST_MODE`;
`GET /api/orders` + `/api/reviews` now `protect`+`authorize`; hardcoded secrets
removed (env-only + `.env.example`); destructive re-seed gated to non-production.
`mongoose`-not-imported (KB §5 #1) was already fixed before this session — stale.

Backend — still open:
- **P0-2 added `protectCustomer` + `/customers/me/*`** as the secured path.
  Legacy `PUT /customers/:id/profile`, `/customers/:id/addresses*`,
  `DELETE /customers/:id`, `PUT /customers/:id/wallet` are still open — the web
  storefront uses them tokenless. Lock them down once web moves to the OTP flow.
- Missing auth on `special-groups` / `banners` **mutations** — deferred: web CMS
  sends no token on those calls, so locking them needs frontend token plumbing;
  not a mobile blocker. Follow-up ticket.
- `.env` still contains real (now-to-be-rotated) credentials — **user must rotate**
  the exposed Mongo password / Cloudinary / JWT secret.
- `firebase-admin` / `bullmq` / `redis` / `express-rate-limit` deps still unwired
  (used in P0-2 / P1-1 / P1-3).

Mobile:
- ~~`/profile` and `/stores` routes missing~~ **FIXED in P0-4** — `/profile`→`/account`
  redirect; `/stores` registered + linked from the Account menu.
- ~~Two data paths (live Home vs stale MockDataService)~~ **FIXED (P0-3 + P0-6)** —
  `mock_data_service.dart` deleted; zero runtime mock data in the app.
- ~~Auth fully mocked~~ **FIXED in P0-2** — real OTP + customer JWT, no demo user.
- ~~Cart/order data not tied to server identity~~ **FIXED (P0-6/P0-7)** — orders
  POST with the customer token; history via `GET /orders/mine`; detail ownership-checked.
- ~~Socket listens for `order_status_update`/`rider_location_update` but nothing
  emits them~~ **FIXED (P1-2)** — server emits both.
- ~~**Category-tap-shows-no-products**~~ **FIXED (P0.1, 2026-09-05).** Root cause
  confirmed via a live-DB diagnostic (temporary read-only scripts, deleted after
  use): the category-level path was always healthy — every real `Category.id`
  had ≥1 matching `Product` (2–35 products each; hypotheses (a) orphaned
  categoryId and (b) stale cached id were both ruled out for the current data).
  The actual bug was one level down: several **subcategories** that the UI
  advertised as tappable chips/tiles (`Category.subCategories[].name`, e.g.
  "Powdered Spices", "Raisins & Walnuts", "Eggs & Poultry", "Biscuits &
  Cookies", "Popcorn & Snacks", "Fruit Juices & Soft Drinks", "Spreads &
  Peanut Butter") had **zero** real products tagged with a matching
  `Product.subCategory` — tapping one was a guaranteed dead-end empty grid,
  which read as "the category has no products" since these tiles sit directly
  under each category on the Categories tab.
  **Fix**: `categories_screen.dart` — new public `availableSubCategoriesFor(category,
  products)` cross-references the live `allProductsProvider` catalog and only
  returns subcategories with ≥1 real matching product (mirrors the backend's
  case-insensitive substring match closely enough to hide only genuinely-empty
  ones; returns the full unfiltered list while `products` hasn't loaded yet, to
  avoid a flicker). Used to filter: the subcategory tile grid + "See all"
  fallback tile, the trending-searches chip cloud, and (in
  `category_catalog_screen.dart`) the in-catalog subcategory filter-chip row.
  A category whose *every* subcategory turns out empty now falls back to one
  tile linking to the full category listing (`/category/:id`, no `?sub=`),
  which is always populated per the diagnostic above.
  **Not changed**: no backend/data change made — this is a client-side
  presentation fix (never advertise a filter that resolves to nothing), not a
  data backfill. The underlying sparse subcategory-level catalog data is a
  separate, lower-priority content/seeding gap, not a code defect.
  Verified: `flutter analyze` clean; `flutter test` **124/124** (updated
  `category_screens_test.dart`'s fake catalog to tag products with real
  `subCategory` values, since the old fixture had none — that gap is exactly
  what let this bug ship unnoticed). **Live-device pass DONE** (physical
  Android device via USB + `adb reverse tcp:5000 tcp:5000`, hitting the real
  local backend): confirmed on-device that `Beverages` shows only `Tea`/
  `Coffee` (the empty `Fruit Juices & Soft Drinks` is hidden), `Packaged Food`
  shows only `Chips & Namkeen`/`Noodles & Pasta`, trending-search chips
  exclude every empty subcategory, and tapping a populated subcategory
  (`Fresh Vegetables`) correctly opens the catalog with real live products
  (prices/ratings/images from the real DB) and the correct chip pre-selected.
  **P0.1 fully closed.**

Repo hygiene:
- `.gitignore` doesn't exclude `node_modules/`, `build/`, `.dart_tool/` (already
  committed). Stray root `package-lock.json` with no root `package.json`.

## 8. Important Constraints

- Do not rewrite working backend modules; reuse APIs + business logic.
- No mock/fake data and no static prototypes in the shipped mobile app.
- Don't bake single-tenant-only assumptions into new mobile API contracts.
- India-first: ₹, Indian address/phone formats.
- "Speed is the product" — every customer-facing choice reinforces the 10-min promise.

## 9. Important APIs / Integrations

- **Reusable as-is for mobile**: `GET /api/products` (+ `categoryId/category/
  subCategory/search/isOrganic/minPrice/maxPrice/sort`), `GET /api/products/:id`,
  `/categories`, `/special-groups`, `/banners`, `/promo-cards`, `/brands`,
  `/festival-campaigns(/active)`, `/coupons`, `/settings`, `/customers/auth`,
  `/customers/:id(/profile)` + address CRUD, `DELETE /customers/:id`,
  `POST /orders`, `GET /orders/customer/:phone`, `GET /orders/:id`,
  `POST /support/tickets`, `POST /payment/create-order`. Socket:
  `join_order_room`, `support_message_send`/`_received`.
- **Must NOT use from mobile**: `GET /api/orders` (all-PII), `GET /api/reviews`
  (public), `POST /api/upload` (open base64).
- **Order natural key** = `orderId` (e.g. `PNNHJHTYP######`), not `_id`.
  Status enum: Pending, In Transit, Accepted, Packed, Ready, Assigned,
  Out For Delivery, Delivered, Cancelled, Returned, Refunded.
- **Customer key** = `customerId` = `cust_<10-digit-phone>`; phone stored server-
  side as `+91 XXXXXXXXXX`, lookups are regex-tolerant.
- **Settings** drives pricing: `taxPercent` 5, `deliveryFeeRule` 40. **P0-6**:
  mobile `PricingConfig` now reads these — 5% GST, ₹40 delivery below ₹499 free,
  ₹5 platform (client constant — no backend field), coupon discount server-computed
  (percent capped ₹100). `Settings` has no `freeDeliveryThreshold`/`platformFee`
  field — mobile defaults them (499 / 5); add to `Settings` if the business wants
  them configurable.
- Third-party: Cloudinary (images), OSM Nominatim (geocoding, used directly by
  both clients), **Razorpay (payments — real server-side flow, see below)**,
  Firebase (dep only, no code).
- **Razorpay — server-side only** (`backend/.env`, git-ignored:
  `RAZORPAY_KEY_ID` `rzp_test_*` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
  / `PAYMENTS_TEST_MODE=false`). Secret **never** leaves the server — the browser
  only receives `key_id` via `POST /api/payment/create-order`'s `key` field.
  `_shared.js` `isPaymentsTestMode()` = true only when `PAYMENTS_TEST_MODE==='true'`
  OR no secret OR key starts `mock` (then verification is skipped / `SimulatedGateway`).
  Flow (both web + mobile): `POST /payment/create-order {amount,receipt}` →
  `{key,orderId(rzp),amount,currency,testMode}`; client opens the Razorpay sheet
  (web `checkout.js`, mobile `razorpay_flutter`) with `key`+`order_id`; on success
  `POST /payment/verify {razorpay_order_id,razorpay_payment_id,razorpay_signature
  [,orderId]}` → real HMAC-SHA256 constant-time check; then (or before, for web)
  `POST /api/orders`. `verifyPayment` now also persists our `Order`
  (`orderId` in body → `paymentStatus` Paid/Failed + `paymentId`/`paymentRef`).
  `POST /payment/webhook` (raw body in `app.js`, `x-razorpay-signature` verified
  with `RAZORPAY_WEBHOOK_SECRET`) reconciles by `paymentRef` on
  `payment.captured`/`order.paid`. `orderController.createOrder` derives
  COD/Wallet→Pending, prepaid→Paid unless the body says otherwise, and writes a
  `Payment` row.
- **Email** — `nodemailer` via Gmail SMTP (`src/services/mailService.js`).
  Credentials in `backend/.env` (`EMAIL_USER`/`EMAIL_APP_PASSWORD` App Password /
  `EMAIL_FROM`). Silent no-op if unset; `MAIL_TEST_MODE=true` → in-memory
  `outbox`. Only sender so far: delivery-partner login credentials on
  create-employee (`role:'Delivery'`) and partner password reset.
- **`GET /api/app/config`** (public) — customer-app version gate + maintenance,
  from `Settings.appConfig` (`minSupportedVersion`, `latestVersion`,
  `maintenance`, `maintenanceMessage`, `updateUrl`, `supportEmail/Phone`).

## 10. API Changes (mobile initiative)

Done (P0-1): `PUT /api/orders/:id/status` now returns an order whose
`trackingTimeline[]` has the appended entry (was a 500). `POST /api/payment/verify`
response shape changed: `{ success, verified, testMode, message }` and returns
**400 `verified:false`** on a bad/missing signature when not in test mode (was
always `200 verified:true`). `GET /api/orders` and `GET /api/reviews` now need a
staff `Bearer` token (401 otherwise).

Done (P0-2): `POST /api/customers/otp/send` `{phone}` → `{success, requestId,
ttl, testMode, devCode?}`. `POST /api/customers/otp/verify` `{phone, code}` →
`{success, token, customer}` (400 wrong code, 429 after 5 attempts).
`GET /api/customers/me` (customer Bearer) → `{success, customer}`.
`PUT /api/customers/me/profile`, `POST /api/customers/me/addresses`,
`DELETE /api/customers/me/addresses/:addressId` (customer Bearer).

Done (P0-6): `POST /api/coupons/validate` `{code, subtotal}` → `{success, valid,
code?, discount, description?, message}`. `POST /api/orders` now runs
`attachCustomerOptional` — a valid customer Bearer overrides body identity.
`ApiService.createOrder` (mobile) throws on non-order responses instead of
returning a fake.
Done (P0-7): `GET /api/orders/mine` (`protectCustomer`) → `{success, orders[]}`,
newest first. `GET /api/orders/:id` now ownership-checked when a customer token
is supplied (403 for someone else's order; still open for tokenless web calls).

Done (2026-09-09): `GET /api/products?ids=a,b,c` returns exactly those products,
ordered by the caller (matches string `id` or Mongo `_id`) — powers `/products?ids=`.
`POST /api/payment/verify` now also returns `verified:true` when
`razorpay_signature === 'simulated'` (mobile SimulatedGateway fallback), in
addition to `isPaymentsTestMode()`.

Done (2026-09-09, partner web): `GET /api/delivery/orders/history?status=delivered|failed|returned&limit=`
(`protectDelivery`) — the partner's terminal orders (`Order.deliveryPartnerUserId`
+ status in `Delivered|Failed|Returned`), newest first; also unblocks the Flutter
`api_client.history()` call, which already hit this (previously missing) path.
`GET /api/delivery/assignments/pending` (`protectDelivery`) — the partner's live
`Assignment{status:'offered'}` as the same payload the `delivery_offer` socket
event carries, or `{offer:null}`; refresh-resilience for the web app.

Planned new endpoints (see `MOBILE_APP_IMPLEMENTATION.md` §8):
`POST /api/customers/otp/send` + `/otp/verify` (+ customer JWT), `protectCustomer`
middleware, `GET /api/orders/mine`, `POST /api/customers/:id/devices` (FCM tokens),
`POST /api/products/:id/reviews`, `POST /api/coupons/validate`,
`GET /api/customers/:id/notifications`, `POST /api/orders/:id/cancel`,
`GET /api/app/config`, server emit of `order_status_update` on status change.

## 11. Do Not Repeat

- Don't trust a rendered screen as proof of a working integration — the offline/
  mock fallback masks failures. Check the actual network call.
- Don't add another parallel data path in mobile — consolidate on Riverpod
  providers hitting the live API; retire `MockDataService` for runtime use.

## 12. Testing Status

- **2026-09-09 baseline (delivery-partner work):**
  - `backend/test/delivery.test.js` → **28 / 31 pass**. The 3 failures
    (`admin/delivery/analytics`, `PUT /api/settings` delivery tuning,
    `delivery zones CRUD`) are **pre-existing shared-Mongo flakiness**, present on
    a clean tree — not regressions. `delivery.test.js` runs against a real
    shared Atlas cluster (see its own header comment) and is order/timing-fragile.
  - `backend/test/api.test.js` → **17 / 26 pass** on a clean tree too (verified by
    stashing all uncommitted changes). Pre-existing; do **not** attribute these to
    partner-web / delivery work.
  - `frontend` → `npx tsc -b --force` + `npm run build` clean. (Note: a stale
    `.tsbuildinfo` after a `git stash` dance can throw a phantom `')' expected`
    in `Modules.tsx` — `tsc -b --force` clears it.)
  - `deliveryapp` → `flutter analyze` clean, `flutter test` **6 / 6**, debug APK builds.
  - A concurrent session ("Implement Delivery Assignment") is also editing
    `backend/src/controllers/orderController.js`, `models/Operations.js`,
    `frontend/src/components/CheckoutModal.tsx`,
    `frontend/src/pages/admin/DeliveryFleetMap.tsx`, and `Modules.tsx`
    (`DeliveryModule` tab refactor). Those are not this session's work.

- **Backend: `npm test` → 45 tests, all green**
  (`node:test` + `supertest` against `MONGO_URI`). Covers auth/OTP, protectCustomer,
  coupon validate, order placement + `/orders/mine` + ownership, status timeline,
  **order cancel (owner check, wallet refund, past-window 409) + wallet ledger**,
  **product reviews (verified-purchase gate, moderation, summary, aggregate recompute)**,
  **account deletion (cascade + orders scrubbed; legacy `:id` route staff-gated)**,
  **`GET /app/config` shape**, **delivery-partner credential emails (create + reset, MAIL_TEST_MODE outbox)**,
  payment test-mode, delivery partner lifecycle + admin assign/reassign/unassign +
  partner password-reset/activate-deactivate.
- **Mobile: `flutter test` → 117 tests, all green** — `auth_flow_test`,
  `catalog_models_test`, `pricing_test`, `design_flat_test`, `order_model_test`,
  `foundation_widgets_test` (7), `navigation_test` (5 — nested/back nav),
  `auth_flow_widget_test` (10 — PhoneField/OtpField + login→OTP→success flow +
  Terms/Privacy consent line), `legal_screen_test` (2 — tab default + `?tab=`),
  `orders_flow_test` (12 — incl. cancel pre-dispatch + no-cancel once dispatched),
  `product_reviews_test` (3 — summary/list, empty state, 403 verified-purchase),
  `auth_flow_test` deleteAccount (success + keep-session-on-failure),
  `app_config_test` (7 — semver `isVersionBelow`, `AppConfig.fromJson`, `appGateProvider`).
  `flutter analyze` clean. `flutter build apk --debug` succeeds (incl. with
  `--dart-define-from-file=env/staging.json`).
- **Delivery app: `deliveryapp/` — `flutter analyze` clean, `flutter test` → 5
  tests green, `flutter build apk --debug` OK (Gradle assembleDebug, 2026-09-01).**
  No emulator run performed.
- **P0-1 manual verification (2026-08-31)**: patched backend booted on port 5055
  against live Atlas. Verified: `GET /` 200; `GET /api/orders` & `/api/reviews`
  → 401 without token, 200 with admin token; `GET /api/dashboard/stats` returns
  real numbers (`yearlyRevenue 2521`, `averageOrderValue 420`, `lowStockCount 1`)
  — no NaN, `stock.quantity` query works; created an order then
  `PUT /api/orders/:id/status` → 200 with `trackingTimeline` entry persisted
  (previously a guaranteed 500); `POST /api/payment/verify` → `testMode:true`.
  `node --check` passes on all 8 changed backend files. Test server stopped after.
- **P0-2 verification (2026-08-31)**: backend on port 5055 against Atlas —
  `otp/send` → `{testMode:true, devCode:"000000"}`; `otp/verify` wrong code 400,
  correct code returns a customer JWT + customer; 6th wrong attempt → 429;
  invalid phone → 400; `GET /customers/me` 401 without token, 200 with customer
  token, **401 with a staff token**; `PUT /customers/me/profile` and
  `POST /customers/me/addresses` update via token. Flutter: `flutter analyze`
  → **No issues**; `flutter test` → **8/8 pass** (new `test/auth_flow_test.dart`
  covers `UserProfile.fromCustomerJson` + `AuthNotifier` send/verify/logout/
  hydrate). Full device run not performed (no emulator in this environment).
- **P0-3 verification (2026-08-31)**: backend on 5055 — confirmed live shapes:
  `/categories` (11, hex-string `color`, `displayName`, `subCategories[]`),
  `/products` (79, `stock:{status,quantity}`), `/products/:id`,
  `/products?search=milk` (9), `/products?categoryId=&sort=price-low&isOrganic=true`
  (filtered + ordered). Flutter: `flutter analyze` **No issues**; `flutter test`
  **14/14 pass** — new `test/catalog_models_test.dart` (10 cases) caught 2 real
  bugs during the run (CategoryModel name fallback used raw `id`; `stockQuantity`
  not read back by `toJson`↔`fromJson`) — both fixed.
- **P0-4 verification (2026-08-31)**: `flutter analyze` **No issues**;
  `flutter test` **14/14**; **`flutter build apk --debug` succeeded** (full app
  graph compiled — first real end-to-end compile since P0 started). Interactive
  tab-switch / hardware-back behaviour not yet exercised on a device/emulator.
- **P0-5/P0-6/P0-7 verification (2026-08-31)**: `flutter analyze` **No issues**;
  `flutter test` **27/27** (added `test/pricing_test.dart`, `design_flat_test.dart`,
  `order_model_test.dart` — status mapping, timeline, tolerant parse, round-trip).
  Backend on 5055: coupon validate (fixed/below-min/percent-cap/bad); `POST /orders`
  with customer token stamps `customerId` from the token; `GET /orders/mine`
  returns only the caller's orders (401 without token); `GET /orders/:id` → 200
  own / **403 other customer** / 200 tokenless. **`flutter build apk --debug`
  succeeded** after each step. No device/emulator run of checkout or order
  screens yet.
- Frontend: no automated tests; admin `fetchReviews` change not yet run in a browser.

- **2026-09-01 — `/impeccable audit` findings implemented ("all at once") on Home (web+mobile)**:
  Web `Home.tsx`: added a visually-hidden `<h1>` (page had no top-level heading — first was `h3`);
  fixed broken Tailwind class `text-text-[#111827]` → `text-text-primary`; replaced off-brand hex
  fallbacks (`#10B981`, `#0284c7`/`#06b6d4` gradient) with brand tokens (`#4CAF50`/`#81C784`).
  `npm run build` clean.
  Mobile `home_header.dart`: address row, search bar, and all 3 `_CircleIcon` instances
  (notifications/profile/cart) now wrapped in `Semantics(button:true, label:...)` for TalkBack;
  `_CircleIcon` touch target bumped from 42×42dp to 48×48dp (Android minimum) via a `SizedBox`;
  hardcoded "Delivery in 8 mins" copy replaced with "Express delivery" in both `home_header.dart`
  and PDP's `DeliveryBadge` (`product_details_screen.dart`). Also swapped the iOS-style
  `Icons.arrow_back_ios_new_rounded` → Material's `Icons.arrow_back_rounded` in the 4 files that
  had it: `app_scaffold.dart`, `product_details_screen.dart`, `auth_scaffold.dart`,
  `location_select_screen.dart` (Android conformance — Material back icon, not iOS chevron).
  `test/foundation_widgets_test.dart` updated to match. `flutter analyze` clean, `flutter test`
  117/117, `flutter build apk --debug` succeeded.

## 13. Last Updated

2026-09-11 (follow-up 5) — see §5 top entry: order-lookup phone-match bug fix,
delivery-code visibility (web+mobile), deliveryapp Android FCM permission fix,
tracking-map zoom tightened (web+mobile), deliveryapp in-app route map, deliveryapp
history numbering/profile/login fixes, orders-list filter parity (right-aligned +
smart default) web+mobile.

2026-09-09 (session 2) — **Delivery-partner web app** (`frontend/src/partner/` + `frontend/src/PartnerApp.tsx`). The rider experience, previously Flutter-only (`deliveryapp/`), now also runs on the web, role-gated behind the shared staff login. **Routing** (`App.tsx`): console branch is now `/admin/*` **or** `/partner/*`; after login a `role:'Delivery'` user is sent to `/partner/dashboard` and any `/admin/*` hit redirects there; non-Delivery staff hitting `/partner/*` redirect to `/admin`. `PartnerApp` is a lazy chunk (~74 KB). **Module**: `partnerApi.ts` (fetch wrapper over `/api/delivery/*`, bearer = `admin_token`), `PartnerContext` (polls `/delivery/me` 60 s, online toggle), `usePartnerSocket` (one `socket.io-client` conn, `auth:{token}` → server auto-joins `partner:<id>`; listens `delivery_offer` / `_revoked` / `assignment_confirmed` / `order_status_update`), `useLocationHeartbeat` (`watchPosition` → `POST /delivery/location`, 25 s throttle, only while online), `PartnerShell` (mobile-first `max-w-480`, top bar online/bell, 4-tab bottom nav), `OfferModal` (countdown accept/reject), screens Dashboard / OrderDetail (lifecycle `pickup-arrived→picked-up→arrived→complete` + OTP&photo dialog, `fail`, `returned`; tel/WhatsApp) / Earnings / History / Notifications / Profile / ForgotPassword. **New dep**: `socket.io-client@^4.8.3` (first socket use in `frontend/`). Backend: only the 2 additive `/api/delivery/*` routes above. Verified: backend `node --test test/delivery.test.js` 27/30 (3 pre-existing shared-Mongo flakes, unrelated), 2 new tests green; `frontend` `tsc -b` + `vite build` clean; API smoke test of all new + `me`/`earnings` endpoints against a seeded Delivery user. Not yet browser-walked on a device. **`deliveryapp/` splash fix (same session)**: `SplashScreen` was a dumb `StatelessWidget` and the router `redirect` keeps `/splash` in `_public`, so a tokenless partner sat on the spinner forever (it only left `/splash` once *authenticated*). Rewrote it as a `ConsumerStatefulWidget` that — like `mobileapp`'s splash — awaits `authProvider.ensureHydrated()` + a 1.4 s branding hold (6 s hard cap) then `context.go('/')` or `/login`. `flutter analyze` clean, 6/6 tests pass. **Delete partner (same session)**: `DELETE /api/admin/delivery/partners/:userId` (`authorize('Admin')`, `adminDeliveryController.deletePartner`) — 409 if `activeOrderIds` non-empty, else cancels live offers + removes `DeliveryPartner`/`User`/`DeviceToken`/`Notification` (Orders + `DeliveryEarning` kept), emits `fleet_partner_removed`, `logAudit`; admin `DeliveryModule` got a trash action (desktop + mobile, disabled while active orders > 0). ⚠ `protect` middleware falls back to a default Admin on a bad/customer token, so admin-only routes are not truly RBAC-safe against a forged token — pre-existing. **Partner console redesign via `/impeccable` (same session)**: migrated the whole `frontend/src/partner/` surface off raw Tailwind grays onto the **admin design system** — `--admin-*` tokens + `font-admin-display/body/mono`. New shared primitives in `frontend/src/partner/ui.tsx` (`PageHead`, `Card`, `Pill`, `Stat`, `Btn`, `Field`, `CenterState`, `SectionLabel`, `money`). PartnerShell (collapsible sidebar + mobile drawer) was already reworked by a concurrent session; no behaviour/API changes. `tsc -b` + `vite build` clean, impeccable detector `[]`. **Slide-to-online (same session)**: Vite proxy now forwards `/socket.io` → `:5000` with `ws:true` (the partner socket never connected in dev before — `usePartnerSocket` hits `window.location.origin`). Phone-only slide-to-confirm status control replaces the header toggle on mobile: web `frontend/src/partner/SwipeOnline.tsx` (floats above the bottom edge via `bottom-[max(1rem,safe-area+.75rem)]`, `md:hidden`, hidden on `/partner/orders/:id`, transform-based knob/trail; header pill is now `hidden sm:flex`); Flutter `_SlideToOnline` in `dashboard_screen.dart` (in `bottomNavigationBar`, SafeArea, replaces the `Switch`). Drag knob L→R to go online / R→L to go offline, ~80% travel threshold. **Flutter offer parity (same session)**: `deliveryapp` now also uses `GET /delivery/assignments/pending` for refresh-resilience — `api_client.pendingAssignment()` → `OfferController.checkPending()` (runs on construct + on `AppLifecycleState.resumed` via a `WidgetsBindingObserver` on `DashboardScreen`), so a `delivery_offer` the socket missed while backgrounded still surfaces. Matches the web partner app's dashboard-mount fetch. `flutter analyze` clean, 6/6 tests. **`deliveryapp` nav + online-control rework (same session, user-directed)**: bottom bar is now a real 3-tab `NavigationBar` — **Home · Orders · Profile & settings** — via `StatefulShellRoute.indexedStack` + new `lib/features/main/main_shell.dart` (also hosts the offer overlay, moved off `_OfferShell`); `/order/:id`, `/earnings`, `/notifications` are full-screen root routes. New `lib/features/orders/orders_screen.dart` = active deliveries + history with filter chips (folds in the old `history_screen.dart`, now unrouted). Dashboard: bell + **online/offline `Switch` in the AppBar** (both directions); **slide-to-go-online is now one-way (offline→online only)**, an in-body card shown only while offline (`_SlideToGoOnline`, smoother drag); `_toggle` no longer `await`s `loc.start()` (root cause of the stuck "GOING ONLINE…" — `Geolocator.getCurrentPosition` hangs on web) and `location_service.start()` timeboxes it to 8 s. `profile_screen` gained Earnings + Notifications rows. **Web parity**: `SwipeOnline.tsx` also made one-way (hidden when online); `PartnerShell` header toggle shows on mobile only while online (to stop). `tsc -b` + `vite build` clean; `flutter analyze` clean, 6/6. **Web bottom tab bar (follow-up, user-directed)**: `PartnerShell` now also renders a phone-only (`md:hidden`) 3-tab bottom bar — **Home · Orders · Profile & settings** — matching the Flutter app; desktop keeps the `bg-admin-ink` sidebar. New `frontend/src/partner/screens/Orders.tsx` (active deliveries + history with filter chips) at `/partner/orders`, added to `PartnerApp.tsx` + the sidebar `navItems`. `Profile.tsx` got an Earnings + Notifications "Shortcuts" card (they're not in the 3 tabs). Bottom bar + `SwipeOnline` are both hidden on `/partner/orders/:orderId`; `SwipeOnline` now floats `3.5rem` above the tab bar; `<main>` bottom pad `pb-32` on phones. `tsc -b` + `vite build` clean, detector `[]`.

2026-09-09 (session 3) — **Real Razorpay checkout on the web storefront.** `.env` got real `rzp_test_*` keys + `PAYMENTS_TEST_MODE=false` (git-ignored; see §9 for the full flow). **Backend**: `paymentController.verifyPayment` now persists our `Order` when the body carries `orderId` — valid signature → `paymentStatus:'Paid'` + `paymentId`/`paymentRef`; invalid → `'Failed'`; test-mode/`'simulated'` bypass still marks Paid. New `api.test.js` case (crafted HMAC) covers it — payment tests 4/4 green (`api.test.js` still has its 9 pre-existing shared-Mongo failures, unchanged). **Web `frontend/src/components/CheckoutModal.tsx`** fully rewritten: was faking a bogus signature + hard-coded `paymentStatus:'Paid'` and never opening Razorpay (broke once test mode went off). Now: payment-method selector (**Pay online** / **Cash on delivery**); online path = `create-order` → place Order **Pending** → real `checkout.js` sheet (`theme:{color:'#2E7D32'}`) → `verify` (flips to Paid) → success; `modal.ondismiss` / `payment.failed` → inline "Payment cancelled", order stays Pending, cart intact; COD → Order Pending, no sheet; `testMode && !key` → simulated. Redesigned on storefront tokens (`--primary`/`--primary-strong`, `bg-surface`/`bg-background`, `border-divider`) — dropped the ad-hoc grays + pink `#E91E63` + fake coupon/savings cards. `tsc -b` + `vite build` clean, detector `[]`. **Mobile `mobileapp/`**: checkout was already a correct server-side flow (`payment_service.dart` `RazorpayGateway` + `checkout_controller.dart` create-order→sheet→verify→`placeOrder`) — no change; `flutter test` 124/124, `flutter analyze` has 3 pre-existing `info` lints in `api_service.dart` (concurrent session, not payment).

2026-09-09 — Customer-web modifications (commit `eab8f1d`). **Backend**: `GET /api/products` now accepts `?ids=a,b,c` — returns exactly those products (matches both string `id` and Mongo `_id`), used by the festival curated `/products?ids=` view (previously filtered client-side). `POST /api/payment/verify` also treats `razorpay_signature === 'simulated'` as verified (was `isPaymentsTestMode()` only), for the mobile SimulatedGateway fallback. **CartDrawer** rebuilt Blinkit-style: header now "Checkout" with search + Clear, `backdrop-blur`, wider (430px), gray-50 shell; added delivery-partner tip (`tipAmount`), gift packaging (`giftPackagingFee` ₹30), delivery instruction chips (`selectedInstructions`), and a "You might also like" recommendations shelf from `useCMS().products`; removed the `FREE_DELIVERY_THRESHOLD` (499) progress bar; `total` now adds tip + gift fee. **Home** "Shop by category": mobile (`useIsMobile(640)`) shows a 2-row horizontal-scroll grid with column-major reordering (`mobileOrderedCategoryGridItems`), desktop unchanged. **Products/Search grids** widened to `lg:grid-cols-6 xl:grid-cols-8`. **AdminLayout** sidebar `sticky`→`fixed` with matching `ml-` offset on main; **AdminCMS** left nav `sticky top-24`. **Admin SubCategoriesModule**: removed the "Subcategory Background Color & Accent Tint" colour picker (add + edit forms) — subcategory `color` tint no longer editable. **Global focus style** (`index.css`): inputs/select/textarea no longer get the focus ring/outline (`outline:none!important`); ring removed from many field wrappers across CustomerAuthModal, Header, ProductReviews, CustomerProfile, TrackOrder, Search — fields now indicate focus with a border-colour change only.

2026-09-08 (session 3) — Mobile location select null checks, permission pop assertion fix, auto-locate & Razorpay web payment fallback. Fixed `LocationPermState? perm` nullability errors in `location_select_screen.dart`. Updated `location_permission.dart` modal sheets/dialogs to pop via `sheetContext`/`dialogContext` instead of outer page context (prevents popping GoRouter root stack). Reworked `_locateUser` to auto-locate immediately after permission grant without re-prompting, with multi-stage position fallback (`getLastKnownPosition` → `getCurrentPosition(medium, 8s)` → `getCurrentPosition(lowest, 5s)` → map center). Fixed Razorpay web/missing native plugin channel crash on checkout (`checkout_controller.dart` & `payment_service.dart` fallback to `SimulatedGateway`, backend `/api/payment/verify` handles simulated signature). `flutter test` **124/124** passed.

2026-09-08 (session 2) — Festival group parity + `?ids=` product view + image-fit + Flutter Home perf. Web ↔ Flutter now filter festival groups identically (active + has content, fallback to all active); style2 renders only for 3–4 groups, else style1 grid/carousel. `festivalGroupHref` multi-product → `/products?ids=…&title=`; `Products.tsx` `?ids=` shows an ordered curated list, hides the subcategory rail on `?ids=`/`?search=`, full-width grid; removed per-subcategory `<main>` tint. `festivalThemeResolver.cardBg` now honours `styling.cardBackground`. Flutter: `categories_screen` subcategory tiles `BoxFit.cover` full-bleed; `_Style1Layout` `>6` grid now `LayoutBuilder`-sized 3 columns + `_PageDots`; `_imageFor` uses `group.products.first`; removed the Account icon from the top header (`home_header.dart`); **`home_screen.dart` `_HomeContent` → lazy `SliverList`** (was one non-lazy `SliverToBoxAdapter(Column)` with ~100+ images → slow tab switch + blank-until-scroll). Web polish: `CustomerAuthModal` (no logo/guest-link, top-right Guest button, no scroll); `CustomerAddresses` (no "Popular" chips / placeholders, live Nominatim-only search, auto-locate on open, geocode `AbortController` timeout); `SuperCategoryNav`/`Header` sticky-seam + on-scroll transparency fix; festival hero rotator (label below image, fixed height / no rotation jump, 4.5s, pause-on-hover, reduced-motion). `frontend` tsc clean; `flutter analyze` on touched files clean. ⚠ uncommitted.

2026-09-07 — Festival card styles + mobile subcategories page. Backend: `FestivalCampaign.cardStyle` enum style1/style2; removed campaign overlap validation (multiple campaigns can be active); `GET /festival-campaigns/active` now takes `?superCategory=`, drops expired, returns `activeCampaigns[]`. Web + Flutter render style1 (4-across image cards) vs style2 (hero rotator + 2×2 grid). Mobile: `SubCategoryModel` + rebuilt `category_catalog_screen` with subcategory tile grid + keyword→Unsplash image resolver.

2026-09-06 — 1:1 web↔Flutter replication: Header/SuperCategoryNav/BottomNav/FloatingCartBar/Home + new Search page + CustomerProfile rework in `frontend/` remade to match `mobileapp/` layouts; new web utils `categoryIconResolver.ts`, `festivalThemeResolver.ts`. No backend change.

2026-09-05 — Audit-only pass (no app code changed): re-verified MEMORY.md/MOBILE_APP_IMPLEMENTATION.md against real backend (app.js + 8 domain route modules), mobileapp (go_router/StatefulShellRoute, ~35+ screens), frontend, deliveryapp. Confirmed prior P0-P2 completions still hold in code. Diagnosed the "tap category -> no products" report as most likely a data-consistency issue (category with zero tagged products / stale categoriesProvider cache / subcategory-string drift), NOT a code-path bug -- the route -> query-param -> backend $or/regex chain is wired correctly end to end. See Known Issues (Mobile) for detail. MOBILE_APP_IMPLEMENTATION.md rewritten to current-state (was still describing the pre-P0 "hybrid prototype").

2026-09-01 — Live delivery tracking: real map + OSRM rider→drop route on BOTH clients. Mobile tracking_screen swapped the schematic painter for mapcn_flutter (OSM tiles, rider+drop markers, route polyline); TrackingNotifier fetches an OSRM road path (straight-line fallback) + recenters. Web TrackOrder gained the route polyline, a gliding rider marker (rAF tween), a store marker, follow-cam. flutter test 117 + APK; vite build clean.
2026-09-01 — `/impeccable audit` findings on Home (web+mobile) implemented: a11y h1 + Semantics labels, broken CSS class, off-brand hex→tokens, Android back-icon conformance (4 files), hardcoded delivery-time copy. See §6 above.

2026-09-01 — Mobile fixes: (1) INTERNET permission was debug-manifest-only → added to main AndroidManifest (release builds had no network → API + product images failed). (2) New LocationPermissionService + post-login location-permission flow (rationale sheet, open-settings for deniedForever, GPS-off dialog, in-screen banner); AuthNotifier.refreshLocationPermission wired after verifyOtp/hydrate; otp_screen + splash route to /location_select until granted. mobile analyze/117 tests/debug APK all green.

2026-09-01 — FUTURE_WORK backlog batch: FW-3 (customer order-status push), FW-6 (mobile order tabs + active-order banner web+mobile), FW-5 (product brand/inStock/onSale filters + opt-in pagination), BE-3 (COD orders created Pending), FW-11 (festival hero on mobile Home), FW-4 (wallet top-up backend + mobile; web blocked on WEB-1), BE-2 (admin review bulk-moderation + Pending queue), FW-16 (search bar mic gated / dead file removed), FW-13 (location_select geocode errors toast). FIREBASE_SERVICE_ACCOUNT is now a path to src/config/service_account.json. Backend 45 tests, mobile 117, deliveryapp 6; frontend build clean.

2026-09-01 — Delivery P1-D4 client: FCM offer push wired end-to-end. Firebase project grocery-76b84; FIREBASE_SERVICE_ACCOUNT (base64) in backend/.env. Both Flutter apps get firebase_core/firebase_messaging + google-services.json/GoogleService-Info.plist + google-services gradle plugin + firebase_options.dart + a PushService (init/permission/token, register after login, unregister on logout, tap→route). Backend 41 tests; deliveryapp 6 tests + APK; mobileapp 117 tests + APK; all analyze clean.

2026-09-01 — Email/SMTP: `nodemailer` + `src/services/mailService.js`. Admin creating a delivery partner (`POST /api/employees` role Delivery) now emails login credentials to the rider; partner password reset emails the new one. Gmail SMTP creds in `backend/.env` (gitignored), `.env.example` documents the keys, `MAIL_TEST_MODE` outbox for tests. SMTP auth verified + a real send succeeded. npm test 41/41, frontend build clean.

2026-09-01 — FUTURE_WORK FW-1 (mostly) DONE: offline resilience + app config. Public `GET /api/app/config` (Settings.appConfig) with permissive DB-down default; mobile `connectivity_plus` offline banner (MaterialApp builder), `package_info_plus`, `appGateProvider` (ok/maintenance/forceUpdate) checked on splash → `/maintenance` `/force_update` screens. Remaining: per-request retry-with-backoff. npm test 39/39, flutter test 117/117, APK built.

2026-09-01 — FUTURE_WORK FW-2 DONE: self-service account deletion. `DELETE /api/customers/me` (attachCustomerOptional — token or ?phone=), cascade delete Customer+Review+WalletTransaction, orders scrubbed to "Deleted user"; legacy `DELETE /api/customers/:id` now Admin/Manager only. Mobile profile "Delete account" + `AuthNotifier.deleteAccount()`; web `CustomerProfile` points at `/customers/me?phone=`. npm test 38/38, flutter test 110/110, frontend build clean, APK built. Next in FUTURE_WORK: FW-1 (offline resilience + `GET /api/app/config`).

2026-09-01 — Added `FUTURE_WORK.md` at repo root: consolidated backlog (P0/P1/P2 feature tasks, web-specific, backend/infra, delivery track, UI/UX open items) with per-item surfaces + dependencies. This is the go-to list for "what's next".

2026-09-01 — Mobile audit fix Group 2 CLOSED: added product reviews (`GET /products/:id/reviews` public + `POST` verified-purchase/moderated; PDP "Ratings & reviews" section + write flow on mobile `ProductReviewsSection` and web `components/ProductReviews.tsx` in both PDP layouts; staff approve/delete recompute `Product.rating`/`reviewsCount`). Group 2 also has order cancel + wallet history from earlier today. Backend npm test 36/36, flutter test 108/108, frontend build clean, debug APK built. Next: MOBILE_FUNCTIONALITY_AUDIT §28 Group 3+ (offline resilience, push/FCM, filters, status-filter tabs, account deletion, membership, content pages).

2026-09-01 — Delivery P1-D5: partner notifications inbox (GET/POST /api/delivery/notifications[/read], unread count in /delivery/me) + createOffer/cancelForOrder write partner Notifications; logAudit already covers all admin delivery overrides. deliveryapp NotificationsScreen + dashboard bell badge. Backend 36 tests, deliveryapp analyze/test/APK green.

2026-09-01 — Delivery P1-D4 (backend): FCM push for delivery offers. New pushService.js (lazy firebase-admin, no-op when FIREBASE_SERVICE_ACCOUNT unset), POST/DELETE /api/delivery/devices + /api/customers/me/devices, createOffer sends a delivery_offer data message. Backend 35 tests. Flutter FCM client still needs the user's Firebase project.

2026-09-01 — Mobile audit fix Group 2 (partial): order cancel + wallet history. New `POST /api/orders/:id/cancel` (dual-auth token-or-{phone}; pre-dispatch only; prepaid → wallet Credit + Refunded; releases rider) wired to mobile order-detail + web CustomerOrders; new `GET /api/customers/me/wallet/transactions` wired to the mobile wallet screen history list. Backend npm test 33/33, flutter test 105/105, frontend build clean, debug APK built. Next in Group 2: product reviews (`GET/POST /products/:id/reviews`).

2026-09-01 — Delivery P1-D3: customer live rider tracking. Backend getOrder adds a masked `delivery` block (real phone/location only in the Out For Delivery/Arrived reveal window; OTP owner-only). Web /track/:orderId (lazy Leaflet, 10s poll, Call/WhatsApp) + "Track live" on in-transit orders. Mobile tracking_screen consumes the block, gates Call on canContact, adds WhatsApp. Backend 31 tests, mobile 103 tests, builds clean. Next: P1-D4 FCM offer push.

2026-09-01 — Mobile audit fix Group 1 (Broken functionality): login Terms/Privacy now real links → new bundled LegalScreen (/legal?tab=terms|privacy) + legal_content.dart mirroring web Legal.tsx; PDP share uses share_plus native sheet (added dep) instead of clipboard. flutter test 103/103, analyze clean. Next: Group 2 (reviews, order cancel, wallet transactions — need surgical backend routes on existing Review/Order/WalletTransaction models, wired to web + mobile).

2026-09-01 — Delivery P1-D2: admin live fleet map (imperative Leaflet, polls GET /admin/delivery/fleet every 10s) + PartnerDetail page at /admin/delivery/:userId; backend GET /admin/delivery/partners/:userId/deliveries|performance. Backend 30 tests green, frontend build clean. Next: P1-D3 customer live tracking.

2026-09-01 — Delivery P1-D1: automatic assignment on Order → Ready. assignmentService +findCandidates (2dsphere $near, capacity + online + active filter, distance/load/rating rank) +tryAssign (idempotent, attempt tracking, radius auto-expand ×1/2/3, re-offer on decline/expire for source=auto, stall when exhausted). Trigger in updateStatus, gated by Settings.autoAssignEnabled. Backend 29 tests green. Next: P1-D2 admin fleet map.

2026-09-01 — Delivery P0-D5: admin web delivery management — DeliveryModule rebuilt on GET /admin/delivery/partners (live status, add, reset-pw, activate/deactivate, responsive table+cards); Orders.tsx assign flow rewired to real POST /admin/orders/:id/assign|reassign|unassign with partner select + force option. 2 new backend endpoints (reset-password through hash, account suspend/activate). Backend 27 tests green, frontend build clean. Next: P1-D1 auto-assign on Ready.

2026-09-01 — Delivery P0-D4: new `deliveryapp/` Flutter package (MVP) — splash/login/forgot/dashboard(online toggle + location heartbeat)/order-detail(lifecycle + OTP/photo proof)/history/profile, socket `partner:<id>` offer overlay with countdown Accept/Reject. No backend changes. `flutter analyze` clean, 5 tests green, debug APK builds. Next: P0-D5 admin web delivery management + responsive.

2026-09-11 — Centralized Frontend API URL & Robust Backend CORS:
- **Frontend API centralization**: Created `frontend/src/config/api.ts` exporting `API_BASE_URL`, `API_URL`, `SOCKET_URL`, and `apiUrl(path)` helper (normalizes paths, handles relative or absolute base URLs, preserves external URLs).
- **Environment config**: Created `frontend/.env` and `frontend/.env.example` with a single configurable variable `VITE_API_URL=http://localhost:5000`. Socket.IO host URL is automatically derived from `VITE_API_URL`, and REST endpoints automatically append `/api`.
- **All frontend pages & components migrated**: Eliminated hardcoded `/api` and hardcoded localhost/origin URLs across storefront (`TrackOrder`, `CustomerProfile`, `CustomerOrders`, `CustomerAddresses`, `CheckoutModal`, `CustomerAuthModal`, `ProductReviews`, `ActiveOrderBanner`, `CMSContext`), partner web (`partnerApi`, `usePartnerSocket`), and admin modules (`Modules`, `Orders`, `Products`, `PartnerDetail`, `ZonesManager`, `Dashboard`, `Login`, `DeliveryFleetMap`, `OrderRiderMap`).
- **Backend CORS enhancement**: Updated `backend/app.js` with `buildCorsOptions()` reading `CORS_ORIGINS`, `CORS_ORIGIN`, `CLIENT_URL`, and `FRONTEND_URL`. Trims trailing slashes, supports wildcard subdomains (`*.vercel.app`), allows LAN IPs and localhost automatically, returns clean `callback(null, false)` without 500 error crashes, and handles preflight OPTIONS with HTTP 204. Updated `backend/.env` and `backend/.env.example`. Tested and verified.

2026-09-11 — FreshCart Premium Typography & Visual Language System:
- **Typeface architecture**: Configured primary brand & display font **Manrope** (weights 300, 400, 500, 600, 700, 800) and secondary content/UI font **Inter** (weights 400, 500, 600, 700). Primary weights: 500, 600, 700; 800 reserved strictly for major display hero titles.
- **Master scale [11..40]**: Strict 15-step scale `[11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 40]`. Line heights: Headings (1.15–1.30), Body (1.40–1.60), Labels (1.25–1.40), Numbers/Prices (1.10–1.25). Letter-spacing: 0 default, -0.5px to -1.0px on large headings, -1.0px to -1.2px on display heroes.
- **Flutter AppTypography (`mobileapp`)**: Nested namespaced style classes (`DisplayStyles`, `HeadingStyles`, `SectionStyles`, `BodyStyles`, `LabelStyles`, `CaptionStyles`, `PriceStyles`, `LargePriceStyles`, `ButtonStyles`, `NavigationStyles`, `SearchStyles`, `OfferStyles`, `DeliveryStyles`, `FormStyles`, `ProfileStyles`, `ProductStyles`), embedded tabular numbers (`FontFeature.tabularFigures()`) across all prices and counters, plus full backward-compatible static methods (`display`, `h1`, `h2`, `h3`, `h4`, `bodyLarge`, `bodyMedium`, `bodySmall`, `labelLarge`, `labelMedium`, `labelSmall`, `title`, `festivalCalligraphy`).
- **Flutter Widgets & Theme**: Aligned `AppTheme` light and dark `TextTheme`, `ProductCard` (16px SemiBold title max 2 lines with ellipsis, 18px Bold tabular price, 13px Regular MRP strikethrough, 12px SemiBold discount, 12px Medium brand, 13px SemiBold rating, 13px SemiBold ADD CTA), `RatingWidget` (13px SemiBold), `PrimaryButton`/`SecondaryButton` (15px SemiBold, 0 letter-spacing), and `BottomNav` (12px Medium / 12px SemiBold).
- **Web Storefront (`frontend`)**: Preconnected and imported Manrope & Inter in `index.html` and `index.css`, configured `--font-display: 'Manrope'` and `--font-sans: 'Inter'`, implemented `.fc-*` scale and component classes, and aligned `ProductCard.tsx` typography.
- **Design System Documentation**: Updated `DESIGN.md` with complete typography system rules, scale matrix, tabular figure guidelines, intelligent truncation (2-line title, 3-4 line description), button architecture, and dynamic type accessibility.
- **Verification**: `flutter analyze lib/` 0 issues, all 123 `flutter test` pass, `npx tsc -b` 0 errors, `npm run build` production bundle built cleanly.