# FreshCart Mobile — Final Implementation Roadmap

> Read `MEMORY.md` + `MOBILE_APP_IMPLEMENTATION.md` before using this file.
> `KNOWLEDGE_BASE.md` = authoritative "what exists". No code until the plan is approved.
> Rules: reuse existing `/api` endpoints and business logic, no mock/fake data in
> shipped builds, no static prototypes, real backend + real dynamic data only.

Date: 2026-08-31 · Status: **awaiting approval, nothing implemented**

---

## How to read this

- **P0 = essential functionality** — the app cannot ship or be tested end-to-end
  without it. Real auth, real catalog data on every screen, real order placement,
  no runtime crashes.
- **P1 = important production functionality** — required for a real public
  launch: real payments, live tracking, push, reviews, cancellation,
  settings-driven pricing, hardened error/offline behaviour.
- **P2 = polish & enhancements** — festival theming, static content, analytics,
  a11y, deep links, performance, nice-to-haves.

Each work package lists: **Screen(s) · Functionality · API required · Components
required · Backend changes · Dependencies · Testing requirements.**

"Backend changes" are surgical fixes/additions — **no controller or model
rewrites**. Existing endpoints are reused wherever they already work.

Global mobile dependency added once (all phases): none beyond what `pubspec.yaml`
already has, except where a package is named explicitly in a package below
(`flutter_secure_storage`, `razorpay_flutter`, `firebase_core`,
`firebase_messaging`, `package_info_plus`, `firebase_crashlytics` /
`sentry_flutter`).

---

# PHASE P0 — Essential Functionality

Outcome: every screen runs on live backend data, a real customer can sign in with
OTP, browse, add to cart, and place an order; no dead routes; no mock fallbacks in
release builds.

---

## P0-1 · Backend defect fixes (unblock the platform)

**Screen(s):** none directly — unblocks Product details, Orders, Tracking,
Payment, and locks down PII.

**Functionality:**
- `GET /api/products/:id` stops throwing under ESM.
- Order status updates persist a timeline instead of throwing.
- `Product.stock` keeps a consistent shape for the app to parse.
- Customer PII is no longer world-readable.
- Secrets removed from source.

**API required (existing, being repaired):**
- `GET /api/products/:id`, `PUT /api/orders/:id/status`, `POST /api/inventory/adjust`,
  `GET /api/orders`, `GET /api/reviews`, `GET/PUT/DELETE /api/customers/:id*`.

**Components required:** none (backend only).

**Backend changes:**
1. `apiController.js`: add `import mongoose from 'mongoose';`.
2. `models/Order.js`: add
   `trackingTimeline: [{ status: String, note: String, at: { type: Date, default: Date.now } }]`
   and `deliveryPartnerId` / `deliveryPartnerName` string fields.
3. `dashboardController.getStats`: use `o.totalAmount` (not `o.grandTotal`).
4. `inventoryController.adjustStock`: write `stock.quantity` / `stock.status`,
   not a bare number (keep `{status, quantity}` shape).
5. `paymentController.verifyPayment`: perform the real HMAC compare; return
   `verified:false` on mismatch; keep an explicit `TEST_MODE` env flag for dev.
6. `routes/api.js`: put `protect` on `GET /api/orders` and `GET /api/reviews`;
   add `protectCustomer` (from P0-2) to `GET/PUT/DELETE /customers/:id`,
   `/customers/:id/profile`, `/customers/:id/addresses*`; add auth to
   `special-groups` / `banners` mutations.
7. Move Mongo URI, `JWT_SECRET`, Cloudinary, Razorpay keys to `.env` only; delete
   hardcoded fallbacks; **rotate** the exposed credentials.
8. Guard the seed-on-boot wipe-and-reseed behind `NODE_ENV !== 'production'`.

**Dependencies:** none new. Requires a real MongoDB connection for verification
(offline stub mode hides these paths).

**Testing requirements:**
- Backend unit/integration (supertest): `GET /products/:id` returns 200 for a
  real id; `PUT /orders/:id/status` appends one `trackingTimeline` entry and
  returns 200; `adjustStock` leaves `stock` as `{status,quantity}`;
  `verifyPayment` returns `verified:false` for a bad signature;
  `GET /orders` and `GET /reviews` return 401 without a token.
- Regression: web storefront + admin still load (same endpoints).
- Manual: confirm no secret literals remain (`grep`).

---

## P0-2 · Real customer authentication (OTP + customer JWT)

**Screen(s):** Phone login, OTP verify, Splash (routing), plus a logout path in
Account.

**Functionality:**
- Enter phone → receive a real SMS OTP → verify → receive a **customer-scoped
  JWT** + customer object.
- Token persisted securely; attached to every authenticated request.
- Resend OTP with cooldown; invalid/expired OTP messaging; rate-limited.
- Splash routes: onboarding → login → location → home based on real state.
- Logout clears token + local caches.

**API required:**
- **New:** `POST /api/customers/otp/send` `{ phone }` → `{ success, requestId, ttl }`.
- **New:** `POST /api/customers/otp/verify` `{ phone, code }` →
  `{ success, token, customer }`.
- **Reuse:** `POST /api/customers/auth` internally (or fold its upsert logic into
  verify) so an unknown phone still provisions a `Customer`.
- **Reuse:** `GET /api/customers/:id/profile` after login to hydrate.

**Components required (Flutter):**
- Rework `features/authentication` `AuthNotifier` → real calls (remove the
  pre-authenticated "John Doe" state).
- `OtpInput` (6-box), `ResendTimer`, `PhoneField` with `+91` mask.
- `SecureTokenStore` wrapper over `flutter_secure_storage`.
- `ApiService` Dio interceptor: inject `Authorization: Bearer <token>`, catch 401
  → clear token → redirect `/login`.
- `go_router` `redirect`: unauthenticated → `/login`; authenticated hitting auth
  routes → `/`.

**Backend changes:**
- New `otpController` (send/verify) + an `Otp` model or Redis entry
  (`{ phone, codeHash, expiresAt, attempts }`); `redis` is already a dependency.
- New `protectCustomer` middleware: verify customer JWT, load `Customer`, set
  `req.customer`. Separate secret/claim (`type: 'customer'`) from staff JWT.
- `signToken`-style helper for customer tokens (e.g. 30-day TTL + refresh, or
  long-lived + logout).
- SMS provider adapter (MSG91 or Twilio) behind an interface; `TEST_MODE` returns
  a fixed code `000000` and skips the SMS send for dev/CI.
- Apply `express-rate-limit` (already a dep) to both OTP routes (per-phone +
  per-IP).

**Dependencies:**
- Flutter: `flutter_secure_storage`.
- Backend: SMS provider SDK/HTTP (MSG91/Twilio) + account/credentials (external
  dependency — needs the business to supply keys + sender ID / DLT template for
  India).
- Redis running (already expected via `REDIS_URL`).

**Testing requirements:**
- Backend: send returns `requestId`; verify with correct code returns a JWT that
  `protectCustomer` accepts; wrong code increments attempts then locks; expired
  code rejected; rate-limit returns 429; `TEST_MODE` path works without SMS.
- Flutter widget tests: OTP screen accepts 6 digits, resend disabled during
  cooldown, error text on 400/429.
- Flutter integration: cold start unauthenticated → `/login`; after verify →
  `/` and token present in secure storage; 401 from any call bounces to `/login`.
- Manual: real SMS delivery on a staging number.

---

## P0-3 · Live catalog data on every screen (retire MockDataService at runtime)

**Screen(s):** Categories tab, Category catalog, Product details, Search, Search
results, Wishlist grid, Home (remove hardcoded fallbacks).

**Functionality:**
- All catalog screens read the live backend via Riverpod providers.
- Server-side search (`?search=`), filter (`?isOrganic=`, `?minPrice/maxPrice`),
  sort (`?sort=price-low|price-high|rating`).
- Pull-to-refresh + skeleton loading + typed empty/error states.
- `MockDataService` is used only under `kDebugMode` (or deleted); no fake data in
  release.

**API required (all existing):**
- `GET /api/categories`
- `GET /api/products` with `categoryId|category|subCategory|search|isOrganic|minPrice|maxPrice|sort`
- `GET /api/products/:id`
- `GET /api/special-groups`, `GET /api/banners`, `GET /api/promo-cards`
- `GET /api/brands` (optional)

**Components required (Flutter):**
- New/expanded providers in `catalog_providers.dart`: `categoriesProvider`
  (already live), `productsByCategoryProvider.family`, `productSearchProvider.family`,
  `productDetailsProvider.family`, `similarProductsProvider.family`.
- `ProductModel.fromJson` hardening: tolerate `stock` as `int` **or**
  `{status, quantity}`; `price/mrp/originalPrice` as string or num; missing
  `images` / `imageUrl`; `nutritionFacts` as map or absent. Port web's
  `getProductStockQuantity` normalizer to `core/utils/product_normalizer.dart`.
- `CategoryModel.fromJson` tolerance (subCategories dedup already done server-side).
- `NetworkImageWithFallback` (branded placeholder + retry) replacing bare
  `CachedNetworkImage` call sites.
- `FilterSortSheet` (organic toggle, price range, sort radio) wired to query params.
- `PullToRefresh` wrapper; reuse `LoadingSkeleton` / `EmptyState` / `ErrorState`.
- Wishlist: hydrate favourite IDs (Hive) against live product fetches.

**Backend changes:** none (endpoints already support every filter). Optional:
add a lightweight `GET /api/products/:id/similar` later (P1) — for now derive
similar from `?categoryId=` + exclude current id client-side.

**Dependencies:** none new.

**Testing requirements:**
- Flutter unit: `ProductModel.fromJson` against 6 fixture shapes (bare-number
  stock, object stock, string price, no images, no nutrition, minimal doc) — no
  throws, sane defaults.
- Provider tests with a mocked Dio: category list renders; search debounce hits
  `?search=`; sort param maps correctly; error → `ErrorState`; empty → `EmptyState`.
- Integration: change a product in admin → pull-to-refresh in app reflects it
  (proves no stale MockDataService path).
- Manual: low-end Android scroll perf on product grid.

---

## P0-4 · Navigation shell fix + route guard

**Screen(s):** `MainNavigationShell` and every pushed route; Splash.

**Functionality:**
- Register the missing `/profile` and `/stores` routes (or remove the
  `context.push('/profile')` calls and route Profile only via the tab) — no
  runtime nav crash.
- Migrate the 4-way `IndexedStack` to `go_router`
  `StatefulShellRoute.indexedStack` so each tab keeps its own back stack.
- Bottom nav becomes **Home · Categories · Search · Orders · Account** (5 tabs).
- Auth redirect guard (from P0-2) + Android hardware-back rules
  (pop tab stack → Home tab → "press back again to exit").
- Full-screen routes (product, cart, checkout, payment, tracking, address map,
  auth, onboarding) render above the shell without bottom nav.

**API required:** none.

**Components required (Flutter):**
- Rewrite `core/routes/app_router.dart` to `StatefulShellRoute` with 5 branches.
- `ScaffoldWithNestedNavigation` wrapper hosting `CustomBottomNavBar` +
  `FloatingCart` (move floating-cart logic out of `MainNavigationShell`).
- `PopScope` / back-handler widget for the "exit app" behaviour.
- Keep `CustomBottomNavBar`, `FloatingCart` (restyle in P0-5).

**Backend changes:** none.

**Testing requirements:**
- Flutter widget/integration: tapping a tab preserves the other tabs' scroll +
  stack; deep push (Home → product → reviews) survives a tab switch and back;
  hardware back at tab root goes to Home tab; at Home root shows the exit
  snackbar; unauthenticated deep link → `/login`.
- Static check: `flutter analyze` clean; no route-not-found at runtime for any
  `context.push`/`context.go` string in the codebase (grep + smoke run).

---

## P0-5 · Design system reconciliation (decision + execution)

**Screen(s):** global — all screens via theme + `core/widgets/`.

**Functionality:**
- One decision recorded in `MEMORY.md`: **(a)** align mobile to the web's flat
  system (recommended), or **(b)** formally keep a distinct mobile language.
- If (a): restyle `GlassCard` → flat `AppCard` (white surface, 1px hairline
  divider, minimal shadow), keep the class/API names so call sites don't churn;
  align color tokens, spacing scale, radius (12–16px cards, full-pill buttons),
  typography (Plus Jakarta Sans / Inter), keep VIP gold gradient, keep dark theme.
- Remove `BackdropFilter` blur from hot paths (perf on low-end Android).

**API required:** none.

**Components required (Flutter):**
- `AppTheme` / `AppColors` / `AppTypography` / `AppSpacing` updated to match
  `DESIGN.md` tokens.
- `core/widgets/glass_card.dart` → flat implementation (or new `app_card.dart` +
  deprecation alias).
- Audit `PrimaryButton`, `ProductCard`, `CategoryCard`, `SearchBar`,
  `SectionHeader`, `Badges`, `FloatingCart`, `CustomBottomNavBar` for blur/shadow
  usage.

**Backend changes:** none.

**Dependencies:** fonts — add Plus Jakarta Sans + Inter to `pubspec.yaml`
`fonts:`/`assets:` (currently commented out) or use `google_fonts`.

**Testing requirements:**
- Golden tests for `AppCard`, `ProductCard`, `PrimaryButton` in light + dark.
- Manual visual pass against `DESIGN.md` on 2 device sizes + dark mode.
- Frame-timing spot check on a low-end device (no jank from removed blur).

---

## P0-6 · Cart + place-order on real data & identity

**Screen(s):** Cart, Checkout (address + review step only — payment is P1),
Order success, Wishlist→Cart.

**Functionality:**
- Cart persists locally (Hive, already done) but pricing is driven by
  `GET /api/settings` (tax %, delivery-fee rule) instead of hardcoded constants.
- Coupon list from live `/api/coupons`; apply uses the new validate endpoint.
- "Place order" posts a real order tied to the authenticated customer, decrements
  stock server-side (already implemented in `createOrder`), returns a real
  `orderId`, routes to Order success → Orders tab.
- Qty cap (3/item) parity with web (`MAX_CUSTOMER_QTY_LIMIT`).

**API required:**
- `GET /api/settings` (existing)
- `GET /api/coupons` (existing)
- **New:** `POST /api/coupons/validate` `{ code, subtotal }` →
  `{ valid, discount, message }` (server-side min-order + percent/fixed + cap).
- `POST /api/orders` (existing) — now send `Authorization` header + `customerId`
  from the token; keep the existing normalisation logic.
- `GET /api/orders/:id` (existing) for the success screen.

**Components required (Flutter):**
- `settingsProvider` (FutureProvider) + `PricingService` that computes
  subtotal/discount/delivery/tax/total from settings + cart (single source of
  truth; replace the hardcoded getters in `CartState`).
- `CouponInput` + `AppliedCouponChip` + `couponValidateProvider.family`.
- `CheckoutController` (Riverpod) orchestrating address → review → place.
- `AddressPickerSheet` reading the customer's saved addresses (from P0-2 hydrate).
- `OrderSuccess` screen (exists on web as `OrderSuccessModal` — port).

**Backend changes:**
- New `couponController.validate` (pure function over existing `Coupon` docs).
- `orderController.createOrder`: accept and trust `req.customer` when present
  (fall back to body only in `TEST_MODE`); store `customerId` from token.
- Confirm stock decrement path uses the P0-1 `stock.quantity` shape.

**Dependencies:** none new.

**Testing requirements:**
- Backend: `validate` returns correct discount for percent vs fixed, respects
  `minOrder`, caps percent at the documented ceiling; `createOrder` with a
  customer token persists `customerId` and appends nothing to a missing timeline.
- Flutter unit: `PricingService` matches a table of (subtotal → total) cases
  derived from `/api/settings` values.
- Integration: add to cart → apply coupon → place order → success screen shows
  the real `orderId` and it appears in `GET /orders/customer/:phone`.
- Regression: web checkout still works (shared endpoints).

---

## P0-7 · Order history & detail on real data

**Screen(s):** Orders tab (list), Order detail + status timeline.

**Functionality:**
- List the authenticated customer's real orders (active pinned on top).
- Order detail: items, totals breakdown, address, payment method, status
  timeline (needs P0-1 schema field).
- Remove the seeded demo order in `OrdersNotifier`.
- Pull-to-refresh; empty state for no orders.

**API required:**
- **New (preferred):** `GET /api/orders/mine` (from `protectCustomer`) →
  customer's orders, newest first.
- **Interim/fallback:** `GET /api/orders/customer/:phone` (existing) using the
  token's phone.
- `GET /api/orders/:id` (existing).

**Components required (Flutter):**
- `ordersProvider` → real fetch (replace `_loadPastOrders` demo seed).
- `OrderCard`, `OrderStatusTimeline`, `OrderTotalsBreakdown`, `ReorderButton`
  (reorder = re-add items to cart via existing catalog lookups).
- Reuse `EmptyState` / `LoadingSkeleton`.

**Backend changes:**
- New `orderController.getMyOrders` (`Order.find({ customerId }).sort(-createdAt)`),
  route `GET /api/orders/mine` behind `protectCustomer`.

**Testing requirements:**
- Backend: `/orders/mine` returns only the caller's orders; 401 without token;
  ordering correct.
- Flutter: list renders real orders; detail shows timeline entries; reorder adds
  the right items/quantities to the cart; empty state when none.
- Integration: place an order (P0-6) → it shows in the list within one refresh.

---

## P0-8 · Release-config hygiene & build wiring

**Screen(s):** none (build/config).

**Functionality:**
- Base URL configurable per environment (dev/staging/prod) instead of the
  `10.0.2.2` / `localhost` literal in `ApiService` + `SocketService` +
  `main.dart` (currently duplicated in 3 places).
- Debug-only logging; no `print` in release.
- `.gitignore` excludes `node_modules/`, `build/`, `.dart_tool/`.

**API required:** none.

**Components required (Flutter):**
- `core/config/app_config.dart` reading `--dart-define` (`API_BASE_URL`,
  `SOCKET_URL`, `ENV`); single source consumed by `ApiService`, `SocketService`,
  `main.dart`.
- Run configs / `Makefile` / README notes for `flutter run --dart-define-from-file`.

**Backend changes:** proper root `.gitignore` (Node + Flutter templates); remove
stray root `package-lock.json`.

**Dependencies:** none new.

**Testing requirements:**
- Build smoke: `flutter build apk --dart-define ENV=staging` succeeds; app points
  at the staging API.
- CI: `flutter analyze` + `flutter test` green; `git status` clean of build
  artifacts after a build.

---

### P0 exit criteria
Real OTP login works on a device; every catalog/cart/order screen shows live
backend data; a real order can be placed by an authenticated customer and viewed
in history; no runtime route crashes; no mock data or secrets in a release build;
backend defects #1–#8 fixed; `flutter analyze` + backend + Flutter test suites
green.

---

# PHASE P1 — Important Production Functionality

Outcome: real money, real-time tracking, push, reviews, cancellation, resilient
error/offline behaviour, force-update.

---

## P1-1 · Real payments (Razorpay)

**Screen(s):** Checkout (payment step), Payment sheet, Order success, Order detail
(payment status).

**Functionality:**
- Payment method selector: UPI / Card / Netbanking / Wallet (customer wallet
  balance) / COD.
- Non-wallet: create Razorpay order → open native Razorpay checkout → on success
  verify signature server-side → then place the FreshCart order (status `Pending`
  → `Confirmed` on verified payment).
- Wallet: gate on balance, debit via existing wallet endpoint.
- Failure/cancel handling; no order created on failed payment; retry.

**API required:**
- `POST /api/payment/create-order` (existing) — send auth header.
- `POST /api/payment/verify` (existing, **now real** after P0-1) — must return
  `verified:false` on bad signature.
- `PUT /api/customers/:id/wallet` (existing, `protect` → switch to
  `protectCustomer`) for wallet debit.
- `POST /api/orders` (existing) — include `paymentId`, `paymentStatus`,
  `paymentMethod`.

**Components required (Flutter):**
- `PaymentMethodSelector`, `WalletBalanceRow`, `PaymentProcessingOverlay`,
  `PaymentResultScreen`.
- `PaymentService` wrapping `razorpay_flutter` (event handlers:
  success/error/external-wallet).
- `CheckoutController` extended with a payment state machine.

**Backend changes:**
- `routes/api.js`: `protectCustomer` on `/payment/*` and
  `/customers/:id/wallet`.
- `orderController.createOrder`: accept `paymentId` / `paymentStatus`; set order
  `status` from verified payment (don't default `Paid`/`In Transit` blindly as it
  does today — gate on `TEST_MODE`).
- Optional: persist a `Payment` doc (model already exists, currently unused) for
  reconciliation.

**Dependencies:**
- Flutter: `razorpay_flutter`.
- **External:** real Razorpay account + live/test keys + webhook secret from the
  business. Android: min SDK / proguard notes for Razorpay.

**Testing requirements:**
- Backend: `verify` rejects a tampered signature; order not created / stays
  `Pending` when `verified:false`; wallet debit rejects when balance < amount.
- Flutter: mocked `PaymentService` — success path creates order once; error path
  creates nothing; wallet path skips Razorpay.
- Manual: Razorpay **test mode** end-to-end on a device (UPI + card test
  instruments); COD path; cancel mid-sheet.
- Security review: signature verification, no secret in the client, amount
  computed server-side not trusted from client.

---

## P1-2 · Real-time order tracking

**Screen(s):** Order tracking (map + status), Order detail (live status), Orders
tab (active-order banner).

**Functionality:**
- After placing an order, join its socket room; receive `order_status_update` and
  `rider_location_update` and reflect them live (status timeline + moving rider
  marker + ETA).
- Reconnect/backoff; fall back to periodic `GET /api/orders/:id` polling if the
  socket is down.

**API required:**
- Socket `join_order_room` (existing).
- **New server emit:** `order_status_update` to the order room whenever
  `orderController.updateStatus` changes status (and on create).
- **New (optional):** a rider/delivery app or admin action emitting
  `rider_location_update` — until that exists, the map shows status-only and a
  static store→address route.
- `GET /api/orders/:id` (existing) for polling fallback.

**Components required (Flutter):**
- `trackingProvider.family(orderId)` consuming `SocketService` streams (already
  scaffolded).
- `RiderTrackingMap` using the existing `TrackingMapPainter` +
  `mapcn_flutter`/`latlong2`; `OrderStatusStepper`; `EtaPill`.
- `SocketService`: enable reconnection, expose connection state, `leaveOrderRoom`.

**Backend changes:**
- In `index.js` / `orderController.updateStatus` + `createOrder`: after
  `order.save()`, `io.to(order.orderId).emit('order_status_update', payload)`.
  Requires passing the `io` instance into the controller (small refactor:
  `req.app.get('io')` set in `index.js`).
- No model rewrite — uses the `trackingTimeline` added in P0-1.

**Dependencies:** none new (socket client already present).

**Testing requirements:**
- Backend: changing status via `PUT /orders/:id/status` emits one
  `order_status_update` to the room; a client not in the room receives nothing.
- Flutter: mocked socket stream drives the stepper + marker; socket drop →
  polling kicks in; reconnect resumes.
- Manual: two devices / admin console — move an order through statuses, watch the
  app update within ~1s.

---

## P1-3 · Push notifications (FCM)

**Screen(s):** Notifications screen, permission prompt (post-login), Account
(notification settings), deep-link targets (Order tracking, Product).

**Functionality:**
- Register the device token after login; refresh on rotation; unregister on
  logout.
- Server sends push on order status transitions and (optionally) promos.
- Tap a notification → deep link to the relevant screen.
- In-app Notifications list (persisted server-side) with read/unread.

**API required:**
- **New:** `POST /api/customers/:id/devices` `{ token, platform }` /
  `DELETE /api/customers/:id/devices/:token`.
- **New:** `GET /api/customers/:id/notifications` + `PUT .../notifications/:id/read`
  (the `Notification` model already exists, unused).
- Server-side send hooked into `orderController.updateStatus`.

**Components required (Flutter):**
- `firebase_core` + `firebase_messaging` init in `main.dart`.
- `PushService` (token lifecycle, foreground/background handlers, tap routing).
- `NotificationPermissionPrompt`, `NotificationTile`, `notificationsProvider`.
- `go_router` deep-link parsing for notification payloads.

**Backend changes:**
- New `DeviceToken` model (`{ customerId, token, platform, updatedAt }`).
- New device + notification routes behind `protectCustomer`.
- `notificationService.sendToCustomer(customerId, {title, body, data})` using
  `firebase-admin` (already a dependency) — persist a `Notification` doc + send to
  all device tokens; prune stale tokens on `messaging/registration-token-not-registered`.
- Call it from `orderController.updateStatus` (status → templated message).

**Dependencies:**
- Flutter: `firebase_core`, `firebase_messaging`; `google-services.json` /
  `GoogleService-Info.plist`.
- **External:** Firebase project + service-account JSON for the backend; APNs key
  for iOS.

**Testing requirements:**
- Backend: device register upserts (no dup tokens); status change triggers one
  `sendToCustomer` per token; stale-token error prunes the row; notification doc
  persisted.
- Flutter: mocked `PushService` — token registered after login, cleared after
  logout; tap payload routes to the right screen; foreground message shows an
  in-app banner.
- Manual: real push to a physical Android + iOS device from a staging order
  transition; cold-start tap deep link.

---

## P1-4 · Product reviews (read + write)

**Screen(s):** Product details (rating summary + recent reviews), All reviews,
Write review (from a delivered order).

**Functionality:**
- Show aggregate rating + approved reviews on the PDP.
- A customer with a delivered order for that product can submit a rating +
  comment; it enters moderation (`status: 'Pending'`).
- Optimistic "submitted, pending approval" state.

**API required:**
- **New:** `GET /api/products/:id/reviews?status=Approved` (public).
- **New:** `POST /api/products/:id/reviews` `{ rating, comment }` behind
  `protectCustomer`; server sets `customerId`/`customerName` from token, verifies
  a delivered order exists for that product, sets `status:'Pending'`.
- Existing admin moderation routes (`PUT /api/reviews/:id/status`) unchanged.

**Components required (Flutter):**
- `RatingSummary`, `ReviewTile`, `ReviewComposer` (star input + text),
  `productReviewsProvider.family`, `submitReviewProvider`.

**Backend changes:**
- New `reviewController.getForProduct` + `reviewController.createForProduct`
  (model `Review` already exists). Add the two routes to `routes/api.js`.
- Optional: maintain `Product.rating` / `reviewsCount` on review approval.

**Dependencies:** none new.

**Testing requirements:**
- Backend: create rejected (403) when no delivered order; created as `Pending`
  otherwise; GET returns only `Approved`; can't review same product twice
  (or allowed — decide, then test).
- Flutter: composer validation (rating required); optimistic pending state;
  list paginates.
- Integration: submit → appears for admin in the web console `ReviewsModule`.

---

## P1-5 · Order cancellation & address/profile management

**Screen(s):** Order detail (cancel), Saved addresses (CRUD + set default),
Profile edit, Account (delete account).

**Functionality:**
- Cancel an order while status is within an allowed window (e.g. `Pending` /
  `Accepted`), with a reason; refund path if prepaid (wallet credit).
- Full address CRUD from the app, set default, use in checkout.
- Edit name/email; delete account (with confirmation).

**API required:**
- **New:** `POST /api/orders/:id/cancel` `{ reason }` behind `protectCustomer`
  (validates ownership + status window; sets `Cancelled`; credits wallet if
  `paymentStatus:'Paid'`).
- Existing (now `protectCustomer`-guarded from P0-1):
  `POST/DELETE /api/customers/:id/addresses*`, `PUT /api/customers/:id/profile`,
  `DELETE /api/customers/:id`, `PUT /api/customers/:id/wallet`.

**Components required (Flutter):**
- `CancelOrderSheet` (reason radio), `AddressForm`, `AddressCard`,
  `addressesProvider`, `profileProvider`, `DeleteAccountDialog`.
- Reuse `AddressPickerSheet` from P0-6.

**Backend changes:**
- New `orderController.cancelOrder` (ownership + status guard + optional wallet
  credit via `WalletTransaction`). Route added to `routes/api.js`.

**Dependencies:** none new.

**Testing requirements:**
- Backend: cancel rejected outside the status window / for another customer's
  order; wallet credited exactly once for a prepaid cancel; `WalletTransaction`
  row written.
- Flutter: cancel disabled when status not cancellable; address default toggle is
  exclusive; delete account clears token + local data and returns to `/login`.
- Regression: web `CustomerAddresses` / `CustomerProfile` still work (shared
  endpoints).

---

## P1-6 · Resilient error / offline / force-update

**Screen(s):** global (interceptors + banners), Maintenance screen, Force-update
dialog, Splash.

**Functionality:**
- Consistent handling of network-down, 401, 5xx, timeout with retry.
- Offline banner + queued read retries; cart survives offline (already Hive).
- `GET /api/app/config` on launch → force-update (block with store link) /
  soft-update / maintenance mode / feature flags.

**API required:**
- **New:** `GET /api/app/config` →
  `{ minSupportedVersion, latestVersion, maintenance: {on, message}, flags: {...} }`
  (public).

**Components required (Flutter):**
- `ApiService` Dio interceptors: retry-with-backoff for idempotent GETs,
  central error → typed `AppException`.
- `ConnectivityBanner`, `ForceUpdateDialog`, `MaintenanceScreen`,
  `appConfigProvider`, version check via `package_info_plus`.

**Backend changes:**
- New tiny `appConfigController.get` + route (can read from `Settings` or a new
  small `AppConfig` doc — no rewrite of `Settings`).

**Dependencies:** Flutter: `package_info_plus`, `connectivity_plus`.

**Testing requirements:**
- Backend: config returns expected shape; maintenance flag toggles.
- Flutter: version below `minSupportedVersion` → blocking dialog; maintenance on
  → `MaintenanceScreen`; airplane mode → banner + retry succeeds on reconnect;
  401 interceptor logs out once (no loop).

---

### P1 exit criteria
Real Razorpay test-mode payments; live tracking reflects admin status changes;
push delivered on status transitions with working deep links; reviews submit →
moderate; orders cancellable within window; force-update + maintenance gate live;
error/offline handling consistent. All new endpoints covered by backend tests;
key flows covered by Flutter integration tests.

---

# PHASE P2 — Polish & Enhancements

---

## P2-1 · Festival campaign theming on Home

**Screen(s):** Home, Category catalog (campaign sections).

**Functionality:** port the web `FestivalCampaignWrapper` behaviour — themed
background (solid/gradient/image), pattern layer, decorative animated elements,
optional campaign video, featured items, themed cards — driven by the active
campaign.

**API required:** `GET /api/festival-campaigns/active`, `GET /api/festival-campaigns`
(existing).

**Components required:** `FestivalThemeLayer`, `FestivalPatternPainter`,
`DecorativeElementLayer` (animation types: sway/float/glow/pulse via
`flutter_animate`), `CampaignFeaturedRail`, `festivalCampaignProvider`.

**Backend changes:** none. (`targetPlatform` on `Banner` can be honoured:
filter `MOBILE`/`ALL`.)

**Dependencies:** optionally `video_player` if campaign video is in scope.

**Testing requirements:** provider returns null → plain Home (no regression);
active campaign → themed Home; golden test for one campaign fixture; perf check
that animations respect reduced-motion / low-end.

---

## P2-2 · Static & informational content

**Screen(s):** About, Help Center, Legal (Terms/Privacy), Stores/Locations,
Careers (optional), Blog list + detail.

**Functionality:** render informational pages; Stores screen gets a real route +
Account entry (currently orphaned).

**API required:** `GET /api/blogs` (existing); Legal/About can be bundled assets
or a CMS endpoint if one is added later. Stores: static list or a new
`GET /api/stores` (only if the business needs it — model doesn't exist today).

**Components required:** `MarkdownPage`/`RichContentPage`, `BlogCard`,
`blogProvider`, `StoreCard`.

**Backend changes:** none required (bundle content) unless a Stores directory is
wanted (new model + route — defer until requested).

**Testing requirements:** pages render; blog list/detail from live API; Stores
route reachable from Account.

---

## P2-3 · Wallet & membership from real data

**Screen(s):** Wallet (balance + transaction history + add money), Membership.

**Functionality:** real balance from `Customer.walletBalance`; real transaction
list; "Add money" via Razorpay top-up (reuses P1-1); membership perks from
`Customer.membershipType`.

**API required:** `PUT /api/customers/:id/wallet` (existing); **new**
`GET /api/customers/:id/wallet/transactions` (the `WalletTransaction` model exists
but has no read route).

**Components required:** `WalletTransactionTile`, `AddMoneySheet`,
`walletProvider`, `membershipProvider`.

**Backend changes:** new `customerController.getWalletTransactions` +
route (`protectCustomer`).

**Testing requirements:** backend: transactions scoped to caller, newest first;
top-up credits once after verified payment. Flutter: balance refresh after a
top-up; empty state.

---

## P2-4 · Search experience upgrades

**Screen(s):** Search.

**Functionality:** recent searches (Hive), trending/suggested terms, debounced
server search, per-category quick filters, "no results" recovery.

**API required:** `GET /api/products?search=` (existing). Optional new
`GET /api/products/suggestions?q=` (defer unless wanted).

**Components required:** `RecentSearches`, `SearchSuggestions`, `SearchResultsGrid`.

**Backend changes:** none for the core; optional suggestions endpoint later.

**Testing requirements:** debounce fires one request per pause; recent searches
persist across launches; empty query shows recents not a spinner.

---

## P2-5 · Analytics, crash reporting, observability

**Screen(s):** global.

**Functionality:** screen-view + funnel events (view product, add to cart,
checkout start, order placed, payment result), crash + non-fatal reporting.

**API required:** none (third-party SDKs).

**Components required:** `AnalyticsService` (thin wrapper, no PII), route
observer for screen views, error-zone hook into crash reporter.

**Backend changes:** none.

**Dependencies:** `firebase_analytics` + `firebase_crashlytics` **or**
`sentry_flutter` (pick one; Firebase already in the project after P1-3).

**Testing requirements:** events fire once per action (mocked sink); a forced
non-fatal appears in the dashboard from a staging build; no PII in payloads
(review).

---

## P2-6 · Accessibility, i18n-readiness, performance pass

**Screen(s):** global.

**Functionality:** semantic labels, min tap targets, contrast (esp. on the green),
dynamic text scaling, `Semantics` on icon-only buttons; extract user-facing
strings to a single place (India-English only for now, but structured for later);
image sizing / `cacheWidth`, list `const` constructors, remove remaining blur
hot-paths, startup-time budget.

**API required:** none.

**Components required:** `l10n`/strings file, audit pass on existing widgets.

**Backend changes:** none.

**Testing requirements:** `flutter test` with a11y guidelines
(`meetsGuideline(textContrastGuideline / tapTargetGuideline / labeledTapTargetGuideline)`)
on core screens; startup trace under budget on a low-end device; golden diffs at
1.3× text scale.

---

## P2-7 · Deep links / app links & share

**Screen(s):** Product details, Order tracking.

**Functionality:** `https://freshcart/...` + custom-scheme links open product /
order tracking with a synthesized back stack; share-product action.

**API required:** none (existing GETs).

**Components required:** `go_router` deep-link config, Android
`intent-filter` / iOS associated domains, `share_plus` for share.

**Backend changes:** host an `assetlinks.json` / `apple-app-site-association`
(static file on the API host or web).

**Dependencies:** Flutter: `share_plus`.

**Testing requirements:** cold + warm start from a link lands on the right screen
with a working back stack; malformed link → Home, no crash.

---

## P2-8 · Optional: server-synced cart & wishlist, biometric unlock

**Screen(s):** Cart, Wishlist, App lock.

**Functionality (only if product wants cross-device):** persist cart/wishlist
server-side keyed by customer; biometric gate on app open.

**API required:** **new** `GET/PUT /api/customers/:id/cart`,
`GET/PUT /api/customers/:id/wishlist` (no models today — new small collections).

**Components required:** sync layer in `CartNotifier` / `WishlistNotifier`
(local-first, background push/pull); `local_auth` gate.

**Backend changes:** new `Cart` / `Wishlist` models + routes (`protectCustomer`).

**Dependencies:** Flutter: `local_auth`.

**Testing requirements:** offline edits reconcile on reconnect (last-write-wins or
merge — decide); biometric optional and skippable.

---

### P2 exit criteria
Festival theming, static content, real wallet/membership, upgraded search,
analytics + crash reporting, a11y/perf pass, and deep links shipped. Nothing in
P2 blocks a launch; each item is independently releasable.

---

## Cross-phase testing summary

| Layer | Tooling | Scope |
|---|---|---|
| Backend unit/integration | `supertest` + `mongodb-memory-server` (add) | every new/changed endpoint: auth, validation, ownership, error codes |
| Backend contract | Postman/Newman or a checked-in `.http` set | the mobile-consumed endpoint list in `MOBILE_APP_IMPLEMENTATION.md` §5/§6 |
| Flutter unit | `flutter_test` | model `fromJson` tolerance, `PricingService`, controllers with mocked services |
| Flutter widget/golden | `flutter_test` + golden files | core widgets light/dark, key screens |
| Flutter integration | `integration_test` | auth flow, browse→cart→order, payment (mocked), tracking (mocked socket), push (mocked) |
| Manual / device | staging backend + real Razorpay test keys + real Firebase | SMS OTP, payments, push, tracking across 2 devices, low-end Android perf |
| CI | GitHub Actions (add) | `flutter analyze`, `flutter test`, backend `npm test` on every PR |

No automated tests exist today — P0 includes standing up the backend test harness
(`mongodb-memory-server`) and the Flutter `integration_test` scaffold as part of
the first packages that touch those areas.

---

## Dependency acquisition checklist (external — needs the business)

- SMS provider (MSG91/Twilio) account + India DLT sender ID / template (P0-2).
- Razorpay account + API keys + webhook secret (P1-1).
- Firebase project + backend service-account JSON + APNs key (P1-3).
- Rotated MongoDB Atlas credentials, JWT secret, Cloudinary keys (P0-1).
- Play Store / App Store listings for force-update links (P1-6).
- Domain for deep-link association files (P2-7).
