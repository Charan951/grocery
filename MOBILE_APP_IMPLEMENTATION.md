# FreshCart — Mobile App Implementation Plan

> **Read this file and `MEMORY.md` before doing any mobile implementation work.**
> Do not assume anything — verify against the actual code. Do not replace working
> backend functionality. Reuse existing APIs and business logic. No mock/fake data
> in the shipped app. No static UI prototypes. Real backend, real dynamic data.

Audit date: 2026-08-31
Authoritative source of truth for "what exists": `KNOWLEDGE_BASE.md` (re-derive from code if it diverges).

---

## 0. Executive Summary

The mobile app is **not greenfield**. A Flutter app already exists at `mobileapp/`
(package name `freshcart`) with ~13 feature modules and ~35 screens built. It is a
**hybrid prototype**:

- **Home tab** pulls live data from the Express backend via `ApiService` (Dio).
- **Every other screen** reads `MockDataService` static lists that are hydrated
  from the backend **once at app boot** and never refreshed.
- **Auth is 100% mocked** — the app boots pre-authenticated as demo user
  "John Doe" (₹250 wallet, VIP). No login call is ever made.
- Two routes referenced in code (`/profile`, `/stores`) are **not registered** and
  throw at runtime.

The work is therefore: **finish and correctly wire the existing Flutter app to
real backend APIs**, repair a set of backend defects that block the order
lifecycle, and add the backend capabilities a real customer app needs (real OTP,
customer sessions, push, reviews, notifications). Rebuilding from scratch is not
recommended — the screen inventory, design system, and navigation shell are
already substantially done.

---

## 1. Existing Architecture

### 1.1 Monorepo layout
```
grocery/
├── backend/     Node + Express (ESM) + MongoDB (Mongoose) + Socket.IO REST API   :5000
├── frontend/    React 19 + TS + Vite + Tailwind v4 SPA (storefront + /admin/* console)
└── mobileapp/   Flutter customer app ("freshcart") — partially built hybrid prototype
```

### 1.2 Backend architecture
- **Entry**: `backend/index.js` — Express + `http.createServer` + Socket.IO (`origin: *`).
  Helmet (CSP off), CORS (open), morgan, `express.json({limit:'50mb'})`,
  `express-mongo-sanitize`. Global error handler at the end.
- **DB**: `src/config/db.js` — MongoDB Atlas via `mongoose.connect` (5s timeout,
  IPv4). On failure returns `null` and the server runs **without a DB**.
- **Offline fallback middleware** (`src/routes/api.js` top): when
  `mongoose.connection.readyState !== 1`, many GET/POST routes short-circuit to
  canned `offlineMode` responses. Deliberate demo resilience — **not** a
  production trust boundary.
- **Seeding**: `src/config/seed.js` runs on every boot; wipe-and-reseed of
  categories/products if counts drop below a threshold (footgun).
- **Single router**: everything is mounted under `/api` from one `api.js` file;
  controllers in `src/controllers/apiController.js` (1525 lines) +
  `festivalCampaignController.js`.
- **Auth**: `src/middleware/auth.js` — `protect` (JWT `Bearer`, verifies against
  `User` collection) + `authorize(...roles)` RBAC. JWT secret has a hardcoded
  fallback. Token TTL 24h. **Only staff/admin use this.**
- **Realtime**: Socket.IO events — `join_order_room`, `support_message_send` →
  broadcast `support_message_received`. **No server-side emitter for
  `order_status_update` / `rider_location_update`** (the mobile app listens for
  these but nothing sends them).
- **Integrations**: Cloudinary (`POST /api/upload`, base64 → URL, falls back to
  echoing the data URI), Razorpay (`razorpay` SDK; **verification is a no-op that
  always returns `verified:true`**), `firebase-admin` is a dependency but
  **unused** (no FCM code, no device-token storage), `bullmq`/`redis` are
  dependencies but no queue code is wired in.

### 1.3 Frontend architecture (reference for feature parity)
- **Routing**: `src/App.tsx` (storefront) + lazy `src/AdminApp.tsx` (`/admin/*`).
  `react-router-dom` v7. `useSmartBack` hook for history-aware back navigation.
- **State**: two React contexts —
  - `CMSContext` (2240 lines): catalog + CMS. On mount, parallel-fetches
    `/api/products`, `/categories`, `/special-groups`, `/banners`, `/promo-cards`,
    `/coupons`, `/blogs`, `/festival-campaigns/active`, `/festival-campaigns`.
    Caches to `localStorage` key `freshcart_cms_data_v2`. Exposes admin CRUD
    mutators.
  - `CartWishlistContext` (208 lines): cart + wishlist, `localStorage`
    (`freshcart_cart`, `freshcart_wishlist`). Per-customer qty cap of 3
    (`MAX_CUSTOMER_QTY_LIMIT`). Confetti on add-to-cart.
- **Customer identity**: `localStorage` key `customer_user` (object from
  `POST /api/customers/auth`). OTP modal accepts default `1234` — **no real
  verification**. Orders are also cached under `customer_orders_<phone>` and
  `saved_addresses_<phone>`.
- **Payments**: `CheckoutModal` calls `/api/payment/verify` then `/api/orders` —
  fully simulated end to end.

### 1.4 Mobile architecture (current state)
- **Stack**: `flutter_riverpod` (StateNotifier/FutureProvider), `go_router`
  (single router, **no guards**), `get_it` DI (`StorageService`, `ApiService`,
  `SocketService`), `dio` REST, `socket_io_client`, `hive`/`hive_flutter`
  (schemaless boxes, no TypeAdapters), `flutter_screenutil` (390×844),
  `cached_network_image`, `flutter_svg`, `lottie`, `flutter_animate`, `shimmer`,
  `mapcn_flutter` + `latlong2` + `geolocator`.
- **Layout**: `core/` (constants, theme, widgets, services, di, routes) +
  `features/<name>/{data/models, presentation/{controllers,screens}}`. No
  domain/repository layer; controllers call services directly.
- **Bootstrap** (`main.dart`): `setupInjection()` → non-blocking
  `MockDataService.syncWithServer(hostUrl)` → `runApp`. Host URL is
  `http://10.0.2.2:5000/api` on Android emulator, else `http://localhost:5000/api`.
- **Data reality** — see table in §3.
- **Persistence**: Hive boxes `freshcart_settings` (onboarding flag, dark mode),
  `freshcart_cart`, `freshcart_favorites`.
- **Design system**: `AppColors`/`AppSpacing`/`AppTypography`/`AppTheme` —
  primary green `#4CAF50`, gold VIP gradient, Material 3 light/dark.
  **Glassmorphism** widget library (`GlassCard` is the base primitive) — this
  **diverges from the web design system**, which is deliberately flat (see
  `DESIGN.md`). Direction needs a decision (§10).

---

## 2. Technology Stack

| Layer | Web / Backend | Mobile (existing) |
|---|---|---|
| Language | TypeScript / JS (ESM) | Dart |
| UI framework | React 19 + Vite | Flutter (SDK ^3.10.4) |
| Styling | Tailwind v4, flat design | Material 3, flat (P0-5) — Plus Jakarta/Inter |
| State | React Context ×2 | Riverpod (StateNotifier + FutureProvider) |
| Routing | react-router-dom v7 | go_router (no guards) |
| HTTP | `fetch` (proxy `/api` → :5000) | Dio (`ApiService`) |
| Realtime | — (web doesn't use sockets yet) | socket_io_client (`SocketService`) |
| Local storage | `localStorage` | Hive (schemaless) + `StorageService` |
| DI | — | get_it |
| Backend | Node + Express + Mongoose + Socket.IO | same backend |
| DB | MongoDB Atlas | same |
| Media | Cloudinary + Unsplash placeholders | `cached_network_image` |
| Payments | Razorpay (simulated) | not yet wired |
| Auth | JWT (staff) / phone-only (customer, fake OTP) | fully mocked |
| Maps/geo | Leaflet + OSM Nominatim | mapcn_flutter + Nominatim + geolocator |
| Push | firebase-admin present, unused | none |

---

## 3. Mobile Data Source Reality (current)

| Screen / feature | Current data source | Target |
|---|---|---|
| Home (banners, categories, special groups, product rails) | ✅ P0-3 — live `ApiService`, fallbacks removed | done |
| Categories tab, Category catalog, Product details, Search, Wishlist grid | ✅ **P0-3** — live Riverpod providers (`categoriesProvider`, `categoryProductsProvider`, `productDetailProvider`, `searchProductsProvider`, `allProductsProvider`); server-side search/filter/sort; loading/empty/error/refresh states | done |
| Cart pricing math | ✅ P0-6 — `PricingConfig` from `GET /api/settings` + `PricingService` | done |
| Cart coupons | ✅ P0-6 — live `/api/coupons` + new `POST /api/coupons/validate` (server-computed discount) | done |
| Order placement | `ApiService.createOrder()` real POST `/api/orders` (+ offline fallback) | Keep; add real payment + auth headers |
| Order history | ✅ P0-7 — `GET /api/orders/mine` (new), demo seed removed, `.when` states + pull-to-refresh | done |
| Order tracking | `SocketService` streams (nothing emits them server-side) | Needs backend emitter pipeline |
| Support chat | Socket + 1s local auto-reply fallback | Real `/api/support/tickets` + socket |
| **Auth (login / OTP)** | ✅ **P0-2 — real OTP + customer JWT** (`/customers/otp/*`, `/customers/me`); profile/wallet/membership screens still read the hydrated `Customer` and get full wiring in P0-6/P2-3 |
| Address geocoding | OSM Nominatim (third party) | Keep |

---

## 4. Complete Feature Inventory

### 4.1 Customer features that exist on web (parity target for mobile)
1. Home browsing — banners/carousel, category chips, special subcategory groups,
   promo cards, festival campaign theming, product rails.
2. Category landing + subcategory navigation.
3. Product listing with **search, filter (organic, price range), sort
   (price-low/high, rating)** — `GET /api/products` query params.
4. Product details — images, weight options, nutrition facts, highlights,
   delivery info, seller info, similar products.
5. Cart — add/remove/update qty (cap 3/item), weight selection, subtotal/savings.
6. Wishlist.
7. Location / address selection — OSM Nominatim geocoding, map pin, saved
   addresses, default address, delivery-location persistence.
8. Checkout — address + payment method (incl. wallet), coupon apply, Razorpay
   (simulated), order success.
9. Order history + per-order detail + status timeline.
10. Order tracking (mobile only today — custom-painted map + socket rider updates).
11. Wallet — balance, transaction history (mobile: static), `PUT /api/customers/:id/wallet`.
12. Membership / VIP tier (`Customer.membershipType`).
13. Support tickets — create, message thread, status; socket chat.
14. Profile — name/email edit (`PUT /api/customers/:id/profile`), delete account.
15. Blog / articles (`/api/blogs`).
16. Static/legal content — About, Careers, Help Center, Legal (terms/privacy),
     Stores/Locations.
17. Coupons/offers listing.

### 4.2 Admin / ops features (NOT in mobile scope)
Dashboard KPIs, product/category/subcategory/inventory CRUD, order lifecycle
management, delivery/rider assignment, employees, coupons CRUD, CMS (banners,
promo cards, special groups, festival campaigns, blogs, SEO, settings), customer
management, reviews moderation, support inbox, audit logs. All under `/admin/*`
and JWT+RBAC gated. **Do not port to the customer mobile app.**

### 4.3 Mobile-only features already built
Onboarding carousel (3 slides), splash routing, live order-tracking map
(custom painter), socket support chat with auto-reply fallback, dark-mode toggle,
notifications screen (no backend), stores screen (orphaned).

---

## 5. API Inventory (backend `/api/*`)

Legend: **[P]** = `protect` (JWT), **[R]** = `authorize(roles)`, **[open]** = no auth.

### Auth (staff)
| Method | Path | Auth | Mobile use |
|---|---|---|---|
| POST | `/auth/register` | open | no (staff) |
| POST | `/auth/login` | open | no (staff) |
| GET | `/auth/me` | [P] | no |

### Customer identity
| Method | Path | Auth | Mobile use |
|---|---|---|---|
| POST | `/customers/auth` | open | **yes** — phone → customer object (no real OTP) |
| GET | `/customers/:id` | open | yes |
| GET | `/customers/:id/profile` | open (⚠ missing auth) | yes |
| PUT | `/customers/:id/profile` | open (⚠) | yes |
| POST | `/customers/:id/addresses` | open (⚠) | yes |
| DELETE | `/customers/:id/addresses/:addressId` | open (⚠) | yes |
| DELETE | `/customers/:id` | open (⚠) | yes (delete account) |
| PUT | `/customers/:id/wallet` | [P] | yes (blocked — needs customer token) |
| GET | `/customers` | [P] | no (admin list) |

### Catalog
| Method | Path | Auth | Mobile use |
|---|---|---|---|
| GET | `/products` (`?categoryId,category,subCategory,search,isOrganic,minPrice,maxPrice,sort`) | open | **yes** |
| GET | `/products/:id` | open | **yes** |
| POST/PUT/DELETE | `/products*`, `/products/bulk` | open (⚠) | no |
| GET | `/categories` | open | **yes** |
| POST/PUT/DELETE | `/categories*`, `/categories/:id/subcategories*` | open (⚠) | no |
| GET | `/special-groups` | open | **yes** |
| GET | `/banners` | open | **yes** |
| GET | `/promo-cards` | open | **yes** |
| GET | `/brands` | open | optional |
| GET | `/festival-campaigns`, `/festival-campaigns/active`, `/:id` | open | **yes** (home theming) |

### Orders
| Method | Path | Auth | Mobile use |
|---|---|---|---|
| GET | `/orders` | **open (⚠ PII leak)** | no — must not use |
| GET | `/orders/customer/:phone` | open | **yes** (order history) |
| GET | `/orders/:id` | open | **yes** (order detail — by `orderId`) |
| POST | `/orders` | open (by design for client apps) | **yes** (place order) |
| PUT | `/orders/:id/status` | [P] [R: Admin/Manager/Delivery] | no — **currently throws** (bug §7) |

### Commerce extras
| Method | Path | Auth | Mobile use |
|---|---|---|---|
| GET | `/coupons` | open | **yes** |
| GET | `/blogs` | open | optional |
| GET | `/settings` | open | **yes** (tax %, delivery fee rule, support contact) |
| GET | `/reviews` | **open (⚠)** | read-only maybe; **no create-review endpoint** |
| POST | `/support/tickets` | open | **yes** |
| GET | `/support/tickets` | [P] | no (admin) |
| POST | `/support/tickets/:id/message` | [P] | ⚠ needs token |
| POST | `/payment/create-order` | open | **yes** |
| POST | `/payment/verify` | open | **yes** — but **no-op verification** (bug) |
| POST | `/upload` | open | avoid from client |

### Socket.IO events
| Event | Direction | Notes |
|---|---|---|
| `join_order_room` | client → server | works |
| `support_message_send` / `support_message_received` | round-trip broadcast | works |
| `order_status_update` | server → client | ✅ P1-2 — emitted on status change/create |
| `rider_location_update` | server → client | ✅ P1-2 — `POST /orders/:id/rider-location` producer (no rider app yet) |

---

## 6. APIs Reusable As-Is for Mobile

- `GET /api/products` (+ all query filters) — search/filter/sort already server-side.
- `GET /api/products/:id`
- `GET /api/categories`, `/special-groups`, `/banners`, `/promo-cards`, `/brands`
- `GET /api/festival-campaigns/active` + `/festival-campaigns`
- `GET /api/coupons`
- `GET /api/settings`
- `POST /api/customers/auth`, `GET /api/customers/:id(/profile)`,
  `PUT /api/customers/:id/profile`, address CRUD, `DELETE /api/customers/:id`
- `POST /api/orders`, `GET /api/orders/customer/:phone`, `GET /api/orders/:id`
- `POST /api/support/tickets`
- `POST /api/payment/create-order`
- Socket `join_order_room`, support chat events

## 7. Backend Defects That Block Mobile (must fix — do not rewrite modules)

**Status after P0-1 (2026-08-31): #2, #3, #4, #5, #6, #8, #10 DONE. #1 was already
fixed (stale). #7 split — customer-route auth moves to P0-2; banner/special-group
mutation auth deferred (see note). #9 is P1-3.**

| # | Defect | Impact on mobile | Fix scope | Status |
|---|---|---|---|---|
| 1 | `mongoose` not imported in `apiController.js` | `GET /api/products/:id` `ReferenceError` | add import | **N/A — already imported** |
| 2 | `Order.trackingTimeline` not in schema but `.push()`ed in `updateStatus` | status updates always throw | add `trackingTimeline:[{status,note,at}]` | **DONE** |
| 3 | `dashboardController` sums `o.grandTotal` (field is `totalAmount`) → `NaN` | — | use `Number(o.totalAmount)||0` | **DONE** |
| 4 | `Order.deliveryPartnerId/Name` not schema fields | rider assignment won't persist | add fields | **DONE** |
| 5 | `adjustStock` overwrites `Product.stock` `{status,quantity}` with a number | stock shape inconsistent | write `stock.quantity`/`stock.status` (also fixed in `createOrder` decrement + low-stock query) | **DONE** |
| 6 | `payment/verify` always returns `verified:true` | no payment security | real constant-time HMAC; 400 `verified:false` on mismatch; `PAYMENTS_TEST_MODE` + `testMode` flag | **DONE** |
| 7 | Missing auth on customer profile/address/delete + `special-groups`/`banners` mutations | anyone can edit/delete any customer | customer routes → `protectCustomer` in **P0-2**; banner/SG mutations **deferred** (web CMS sends no token there — needs frontend plumbing; not a mobile blocker) | **P0-2 / deferred** |
| 8 | `GET /api/orders` and `GET /api/reviews` fully public (all PII) | mobile must never call `/orders` | now `protect` + `authorize('Admin','Manager')`; admin `fetchReviews` given auth header; `/orders/mine` is P0-7 | **DONE** |
| 9 | `firebase-admin` present but no FCM code / device-token model | no push | add (see §8) | P1-3 |
| 10 | Hardcoded secrets in source (Mongo pw, JWT secret, Cloudinary, Razorpay) | security | env-only, no fallbacks; `backend/.env.example` added; missing-env warning in `index.js`. **User must still rotate the exposed credentials.** | **DONE (rotation pending on user)** |

## 8. Missing Backend Functionality (new work for a real app)

**Status: #1, #2, #12 DONE in P0-2. #5 is P0-7. #7 is P0-6.**

1. ~~**Real OTP**~~ **DONE (P0-2)** — `POST /api/customers/otp/send` + `/otp/verify`,
   pluggable `smsService` (test mode fixed code `000000`, `SMS_PROVIDER` env for
   msg91/twilio), 30-day customer JWT on verify, `Otp` model with TTL + attempt
   lockout.
2. ~~**Customer session/auth middleware**~~ **DONE (P0-2)** — `protectCustomer` +
   new `/customers/me`, `/customers/me/profile`, `/customers/me/addresses[...]`.
   Legacy `/customers/:id/*` left open for the web (documented debt); `POST /orders`
   will accept the token in P0-6.
3. **Push notifications (FCM)** — `DeviceToken` model + `POST /api/customers/:id/devices`
   to register, and server-side send on order status transitions + promos. Wire
   `firebase-admin` (already a dep).
4. **Order status → socket + push pipeline** — emit `order_status_update` to the
   order room whenever status changes (currently nothing emits it).
5. ~~**Customer order list by identity**~~ ✅ **DONE (P0-7)** — `GET /api/orders/mine` (protectCustomer).
6. **Product reviews (create)** — `POST /api/products/:id/reviews` for customers
   (model `Review` exists, only admin moderation routes exist).
7. ~~**Coupon apply/validate**~~ ✅ **DONE (P0-6)** — `POST /api/coupons/validate` server-computes the discount.
8. **Notifications list** — `GET /api/customers/:id/notifications` (model exists,
   no routes).
9. **Server-side cart & wishlist (optional, for cross-device)** — currently
   local-only on both clients. Only if product wants it.
10. **Order cancel by customer** — `POST /api/orders/:id/cancel` with a
    time/status window (no customer-facing cancel today).
11. **App config / min-version endpoint** — `GET /api/app/config` for
    force-update, feature flags, maintenance mode.
12. **Rate-limiting** on OTP + auth — **partially done (P0-2)**: OTP verify has a
    5-attempt-then-429 lockout per code. `express-rate-limit` per-IP/per-phone
    throttling on `/otp/send` still to add.

---

## 9. Screens Required for the Mobile App

Status: **B** = built (needs wiring to real API), **P** = partial, **N** = new.

### Onboarding / auth flow
| Screen | Status | Notes |
|---|---|---|
| Splash | ✅ P0-2 | awaits `ensureHydrated()`, routes on real auth state |
| Onboarding (3 slides) | B | keep; persist flag (already does) |
| Phone login | ✅ P0-2 | phone-only, real `/customers/otp/send`; Email/demo tab removed |
| OTP verify | ✅ P0-2 | real `/otp/verify`, JWT in secure storage, working resend timer + errors |
| Location permission | B | geolocator |
| Location select / map pin | B | Nominatim (keep) |
| Address form / confirm | P | save via `/customers/:id/addresses` |

### Main shell (bottom nav)
| Screen | Status | Notes |
|---|---|---|
| Home | B | live already; drop hardcoded fallbacks in prod |
| Categories | B→wire | switch from `MockDataService` to live provider |
| Category catalog (per category) | B→wire | `/api/products?categoryId=` |
| Subcategory filter/sort/organic | P | use server query params |
| Search | B→wire | use `/api/products?search=` (server-side) not client substring |
| Search results detail | P | |
| Cart | B | reconcile pricing rules with backend `/settings` |
| Wishlist | B→wire | live product hydration |
| Profile (tab) | B | wire to `/customers/:id` |

### Product & checkout
| Screen | Status | Notes |
|---|---|---|
| Product details | B→wire | `/api/products/:id` + real similar-products query |
| Product reviews list + write review | N | needs new endpoint (§8.6) |
| Checkout (address + payment + coupon) | ✅ P0-6/P1-1 | settings pricing, validated coupons, real Razorpay/wallet/COD, processing overlay |
| Payment (Razorpay checkout sheet) | ✅ P1-1 | `razorpay_flutter` via `PaymentGateway`/`CheckoutController`; real HMAC verify server-side; webhook endpoint |
| Order success | B | |

### Orders & tracking
| Screen | Status | Notes |
|---|---|---|
| Order history list | B→wire | `/api/orders/mine` (new) or `/orders/customer/:phone` |
| Order detail + status timeline | P | needs schema fix #2 |
| Live tracking map | B | needs backend emitter (§8.4) |
| Cancel order | N | needs endpoint (§8.10) |

### Account
| Screen | Status | Notes |
|---|---|---|
| Profile edit (name/email) | B→wire | `PUT /customers/:id/profile` |
| Saved addresses (CRUD) | B→wire | `/customers/:id/addresses*` |
| Wallet (balance + transactions) | P | `/customers/:id/wallet`; needs a transactions list endpoint |
| Membership / VIP | B | from `Customer.membershipType` |
| Support tickets list + chat | P | `/support/tickets` (needs customer auth) + socket |
| Notifications | P | needs endpoint (§8.8) + FCM |
| Settings (dark mode, etc.) | B | local |
| Legal / About / Help | N (low) | static or `/api/blogs` / CMS |
| Stores / locations | P | orphaned screen — add route or cut |

### Cross-cutting
| Item | Status | Notes |
|---|---|---|
| Register `/profile` and `/stores` routes | ✅ P0-4 | `/profile`→`/account` redirect; `/stores` registered + Account-menu link |
| Auth route guard in `go_router` | ✅ P0-2/P0-4 | `routerProvider` `redirect` + auth `refreshListenable`; `StatefulShellRoute.indexedStack` with 5 branches; `MainScaffold` + `PopScope` hardware-back |
| Force-update / maintenance gate | N | `/api/app/config` |
| Global error / offline / retry states | P | widgets exist (`ErrorState`, `EmptyState`) |

---

## 10. Design System Requirements

- Web `DESIGN.md` is **deliberately flat** — white cards on warm off-white
  (`#F8FAF7`), 1px hairline dividers, no shadow stacks, no glass. Primary green
  `#4CAF50`, full-pill buttons, 12–16px card radius, Plus Jakarta Sans / Inter.
- **✅ P0-5 DECISION (user-approved): align mobile to the flat web system.**
  `GlassCard` reimplemented flat (solid `surface`, 1px hairline border, ~zero
  shadow, radius 16); `blur` param kept but ignored — no call-site churn.
  `BackdropFilter` removed from `core/widgets`. Buttons → full pill.
  `AppColors.card/glass` de-translucent-ed. Typography → Plus Jakarta Sans
  (headings) / Inter (body) via `google_fonts`. VIP gold gradient retained.
- Keep: `flutter_screenutil` 390×844 baseline, `cached_network_image`, skeleton
  loaders (`shimmer`), Lottie for empty/success states, `Hero` product-image
  transitions.

## 11. Image / Media Requirements

- Product/category/banner images are **Cloudinary URLs** stored on the models
  (`imageUrl`, `images[]`, `coverImage`, gradient arrays for banners).
- Backend normalizes product images and falls back to an **Unsplash placeholder
  URL** when none is set — the app must tolerate placeholder/remote URLs and
  missing images gracefully.
- No local image bundling for catalog content — everything is remote; use
  `cached_network_image` with a branded placeholder + error widget.
- Festival campaign theming carries background images, patterns, decorative
  element assets, optional video (`campaign.video.url`) — replicate the web
  `FestivalCampaignWrapper` behavior if festival theming is in mobile scope
  (recommend P2).
- App-owned assets (logo, onboarding art, Lottie files) go in `mobileapp/assets/`
  (pubspec `assets:` block is currently commented out — needs enabling).
- Do **not** upload from the client via `/api/upload` (open, base64, 50mb) for
  customer flows; not needed for a shopper app.

## 12. Mobile-Specific Features (net-new vs web)

1. Push notifications (order updates, promos) — FCM.
2. Native Razorpay checkout sheet (`razorpay_flutter`).
3. Live location / "locate me" for address (geolocator — present).
4. Real-time order tracking map with rider position (socket — UI present, needs
   backend feed).
5. Biometric / device-remembered session (optional).
6. Deep links / app links (order tracking, product share) — optional.
7. Force-update gate + offline banner.
8. Haptics, pull-to-refresh, skeleton loaders (partially present).

## 13. Navigation Architecture

### 13.1 Current (mobile) — SUPERSEDED by P0-4 (StatefulShellRoute, 5 tabs: Home/Categories/Search/Orders/Account)
`go_router`, `initialLocation: '/splash'`, **no guards**. Flat route list;
`MainNavigationShell` is an `IndexedStack` of 4 tabs
(**Home / Categories / Search / Profile**) with a custom floating bottom nav +
floating cart bar. All other screens are `context.push`ed on top.

### 13.2 Proposed bottom navigation (5 tabs — quick-commerce norm)
```
┌────────┬────────────┬──────────┬──────────┬──────────┐
│  Home  │ Categories │  Search  │  Orders  │ Account  │
└────────┴────────────┴──────────┴──────────┴──────────┘
```
- **Home** — banners, categories, special groups, rails, festival theme.
- **Categories** — full category grid → category catalog → subcategory filter.
- **Search** — server-side search, recent searches, suggestions.
- **Orders** — active order (with tracking entry) + history. (Web calls this
  "Order Again".)
- **Account** — profile, addresses, wallet, membership, support, notifications,
  settings, legal.

Cart is **not** a tab — it's the persistent floating cart bar + `/cart` pushed
route (matches current mobile and web `FloatingCartBar`). If product prefers a
Cart tab, swap it for Search and make Search a home-header action.

### 13.3 Nested navigation
- Use `go_router` `StatefulShellRoute.indexedStack` so **each tab keeps its own
  navigation stack** (Home → product → reviews stays on the Home tab; switching
  tabs and back preserves position). Current single `IndexedStack` in
  `MainNavigationShell` loses per-tab deep stacks — migrate.
- Routes pushed **above** the shell (full-screen, no bottom nav): product
  details, cart, checkout, payment, order tracking, address map, login/OTP,
  onboarding.
- Routes pushed **within** a tab stack: category catalog, search results,
  order detail, wallet, membership, support thread, notifications.

### 13.4 Back-navigation behavior
- Android hardware back = pop current tab stack; if at a tab root, go to Home
  tab; if on Home tab root, show "press back again to exit" snackbar.
- Full-screen pushed routes: back pops to the exact origin (mirror web
  `useSmartBack` intent — return where the user came from).
- Checkout/payment: back asks for confirmation if an order is mid-flight.
- After successful order: replace stack with Order Success → Tracking (no back
  into checkout).
- Deep link / notification open: synthesize a sensible parent stack
  (e.g. tracking screen gets Orders tab beneath it).

## 14. Components Required (Flutter)

Most exist in `core/widgets/` — reuse, restyle per §10:
`AppCard`/`GlassCard`, `PrimaryButton`/`SecondaryButton`, `ProductCard`,
`CategoryCard`, `QuantitySelector`, `SearchBar`, `SectionHeader`,
`RatingWidget`, `DeliveryBadge`, `DiscountBadge`, `FloatingCart`,
`CustomBottomNavBar`, `LoadingSkeleton`, `EmptyState`, `ErrorState`,
`Badges`, `feedback_states`.

New/expanded:
- `AuthGuard` / router redirect
- `NetworkImageWithFallback` wrapper (branded placeholder + retry)
- `CouponInput` + applied-coupon chip
- `AddressCard` + address picker sheet
- `OrderStatusTimeline`
- `RiderTrackingMap` (wire to socket — `TrackingMapPainter` exists)
- `PaymentMethodSelector` (UPI/Card/Wallet/COD)
- `PushPermissionPrompt`
- `ForceUpdateDialog` / `MaintenanceScreen`
- `PullToRefresh` wrappers on list screens
- `FestivalThemeLayer` (if festival theming in scope)

## 15. Design / Data Model Notes for the App

- **Product** model is large and web-shaped. ✅ **P0-3**: `ProductModel.fromJson`
  is now fully tolerant (bare-number `stock` OR `{status,quantity}`, string vs
  number prices, missing images/arrays/nutrition, `mrp` clamped ≥ `price`); the
  shared normalizer lives in `mobileapp/lib/core/utils/parse.dart`
  (`stockQuantityOf`, `asColor`, `asDouble`, …). `ProductModel` exposes
  `stockQuantity` + `inStock` — cart stock gating in P0-6 uses these.
- **Customer** identity is phone-string keyed (`+91 XXXXXXXXXX` formatting is
  applied server-side; lookups are regex-tolerant). Store the canonical
  `customerId` (`cust_<phone>`) after auth, not just the phone.
- **Order** `orderId` is the natural key (e.g. `PNNHJHTYP######`), not `_id`.
  Status enum: `Pending, In Transit, Accepted, Packed, Ready, Assigned,
  Out For Delivery, Delivered, Cancelled, Returned, Refunded`.
- **Cart pricing** differs slightly between web and mobile today — pick one
  source of truth. Backend `Settings` has `taxPercent` (5), `deliveryFeeRule`
  (40 below 499). Mobile `CartState` uses 5% GST, ₹29 delivery below ₹400, ₹5
  platform fee, ₹100 coupon cap. **Reconcile against `/api/settings`.**

## 16. Risks & Dependencies

| Risk | Severity | Mitigation |
|---|---|---|
| No real customer auth anywhere in the stack | High | P0: build OTP + customer JWT before any real launch |
| Order status update endpoint throws (bug #2) — blocks tracking end-to-end | High | P0 schema fix |
| Payment verification is a no-op | High | P0 real HMAC + real Razorpay keys |
| Public `GET /api/orders` / `/api/reviews` leak all PII | High | P0 lock down |
| Hardcoded secrets in repo (Mongo pw, JWT, Cloudinary, Razorpay) | High | P0 rotate + env only |
| Backend runs "successfully" with no DB via offline stubs — masks integration failures | Medium | Test against a real DB; add a health gate; never trust a rendered screen |
| Seed-on-boot wipes catalog if counts dip | Medium | Guard/disable in non-dev |
| Mobile has two data paths (live Home vs stale MockDataService) | Medium | P1: unify on Riverpod providers → live API |
| ~~Design system divergence (glass vs flat)~~ | — | **RESOLVED P0-5** — aligned to flat web system |
| `order_status_update`/`rider_location_update` have no server emitter | Medium | P1 backend pipeline |
| Single-tenant; multi-tenant is a stated future direction | Low (now) | Don't bake single-tenant-only assumptions into new mobile API contracts |
| `firebase-admin`, `bullmq`, `redis`, `express-rate-limit` are deps but unwired | Low | Use them when adding push / OTP rate-limit |
| No automated tests anywhere (`mobileapp/test` has only the default widget test) | Medium | Add smoke tests around auth, cart, order placement |
| `.gitignore` doesn't exclude `node_modules`/`build`/`.dart_tool` | Low | Fix before next dependency commit |

## 17. Recommended Implementation Order

### Phase P0 — Foundations & blockers (must land first)
1. **Backend defect fixes** #1–#5, #7, #8, #10 (§7). Small, surgical — no module
   rewrites. Add `import mongoose`, `Order.trackingTimeline`, stock-shape
   normalization, lock down public order/review/customer routes, move secrets to
   env + rotate.
2. **Real customer auth**: `POST /api/customers/otp/send` + `/otp/verify` (SMS
   provider), issue customer JWT, `protectCustomer` middleware, `GET /orders/mine`.
   Add `express-rate-limit` on OTP.
3. **Mobile auth wiring**: replace mocked `AuthNotifier` with real calls; persist
   customer JWT in Hive/secure storage; `ApiService` attaches
   `Authorization: Bearer`; `go_router` redirect guard.
4. ~~**Design system decision**~~ ✅ **DONE (P0-5)** — flat; `GlassCard` flattened, pill buttons, Plus Jakarta/Inter.
5. **Fix `/profile` + `/stores` route registration**; migrate
   `MainNavigationShell` to `StatefulShellRoute` (per-tab stacks) + 5-tab nav.
6. **`ProductModel` hardening** — tolerant JSON parsing, shared stock normalizer.

### Phase P1 — Core shopping flow on real data
7. **Unify mobile data layer**: convert Categories, Category catalog, Product
   details, Search, Wishlist from `MockDataService` to live Riverpod providers
   hitting `/api/*`. Delete `MockDataService` fallbacks (or gate to `kDebugMode`).
   Server-side search via `?search=`.
8. **Cart/checkout on real data**: `/api/settings`-driven pricing;
   `POST /api/coupons/validate` (new, §8.7); coupon UI.
9. **Real payments**: `POST /api/payment/create-order` → `razorpay_flutter`
   sheet → `POST /api/payment/verify` (real HMAC) → `POST /api/orders` with
   token.
10. **Orders**: `GET /orders/mine`, remove demo seed, order detail + status
    timeline (needs #1 schema fix).
11. **Addresses & profile**: full CRUD wired to `/customers/:id/*` with customer
    token.

### Phase P2 — Realtime, engagement, polish
12. **Order tracking pipeline**: backend emits `order_status_update` to the order
    room on every transition; wire rider location feed; finish tracking map.
13. **Push notifications**: `DeviceToken` model + register endpoint + FCM send on
    status transitions; mobile FCM setup + permission prompt; notifications list
    endpoint + screen.
14. **Reviews**: `POST /api/products/:id/reviews` + write-review UI + list on PDP.
15. **Support**: tickets list + socket chat with real auth.
16. **Wallet transactions list** endpoint + screen; membership screen from real
    data.
17. **Order cancel** (§8.10).
18. **Force-update / maintenance** (`/api/app/config`) + offline states.
19. **Festival campaign theming** on Home (port `FestivalCampaignWrapper`
    behavior) — optional.
20. **Static content** (About/Help/Legal/Stores) — CMS or bundled.

### Phase P3 — Hardening
21. Smoke/integration tests (auth, cart, order placement, payment verify).
22. Analytics/crash reporting.
23. `.gitignore` cleanup; CI for `flutter analyze` + `flutter test`.
24. Accessibility pass, low-end Android perf pass.

---

## 18. Explicit Non-Goals

- Porting `/admin/*` ops console features to the customer app.
- Rebuilding the Flutter app from scratch.
- Replacing working backend controllers/models wholesale.
- Building multi-tenant infrastructure now (design contracts so as not to block it).
- Shipping with mock data, static prototypes, or fake OTP/payment in a production build.
