# FreshCart — Future Work & Task Backlog

Single source of truth for everything **not yet built**. Updated as items land.
Completed work lives in `MEMORY.md` §5; the mobile-vs-web gap analysis is in
`MOBILE_FUNCTIONALITY_AUDIT.md`; the design review is in `MOBILE_UI_UX_AUDIT.md`.

**Last updated:** 2026-09-01 (FW-3 DONE — FCM offer + order-status pushes live end to end; iOS APNs key + web-push open. FW-2 done; FW-1 mostly done)

---

## How to pick up an item

Every feature is evaluated across the **whole product** before coding
(the FEATURE DEVELOPMENT RULE):

> Backend · Database · APIs · Web · Responsive Web · Mobile App · Navigation ·
> Auth · Permissions · Notifications · Images/media · Loading / Empty / Error /
> Success states · Performance · Security · Testing.
>
> Never implement a feature in only one frontend unless explicitly requested.
> Before coding → Analyse → feature plan → confirm dependencies.
> After coding → Test → Fix → update this file + `MEMORY.md` + the audit.

Auth note: the **web storefront has no customer JWT** (fake OTP + phone-keyed
`/api/customers/auth`). Customer-scoped endpoints that must serve web too should
use `attachCustomerOptional` and accept `{ phone }` in the body (as
`POST /orders/:id/cancel` and `POST /products/:id/reviews` already do), OR the
web needs a real customer-auth pass first (see WEB-1).

---

## Status legend

`[ ]` not started `[~]` partially done `[x]` done (kept here briefly for context)

---

## P0 — core journey gaps

### FW-1 · Offline resilience + app config — `[~]` mostly done 2026-09-01
- `[x]` **Backend:** `GET /api/app/config` (public) → `{ minSupportedVersion,
  latestVersion, maintenance, maintenanceMessage, updateUrl, supportEmail,
  supportPhone }`, backed by `Settings.appConfig`. DB-down fallback is permissive
  (never hard-blocks).
- `[x]` **Mobile:** `connectivity_plus` global offline banner via
  `MaterialApp.router` `builder` (`ConnectivityBanner` — "You're offline" strip +
  "Back online" flash). `package_info_plus` for the running version.
  `app_config.dart` (`appConfigProvider` tolerant, `isVersionBelow` semver,
  `appGateProvider` → ok / maintenance / forceUpdate). Splash checks the gate in
  parallel with hydration → `/maintenance` or `/force_update`
  (`app_gate_screens.dart`, both retry-able).
- `[ ]` **Still to do:** per-request retry-with-backoff on transient failures;
  swap raw error states for "you're offline" copy where it matters.
- Tests: `app_config_test` (7 — semver, fromJson, gate resolution); backend
  `/app/config` shape. `npm test` 39/39, `flutter test` 117/117.

### FW-2 · Secure the account-deletion route, then wire mobile — `[x]` DONE 2026-09-01
- `[x]` **Backend:** new `DELETE /api/customers/me` (`attachCustomerOptional` —
  app token OR `?phone=` for the token-less web). Cascade: deletes `Customer` +
  `Review` + `WalletTransaction`, scrubs `customerName` → "Deleted user" on past
  orders (kept as records). Legacy `DELETE /api/customers/:id` is now
  `protect, authorize('Admin','Manager')` — no longer an open route.
- `[x]` **Mobile:** `AuthNotifier.deleteAccount()` (API then `logout()`;
  session kept on failure) + "Delete account" TextButton on the profile screen
  (confirm modal → `/login`).
- `[x]` **Web:** `CustomerProfile.tsx` `handleDeleteAccount` → `DELETE
  /api/customers/me?phone=…`.
- Tests: backend cascade + `me` 401-after + legacy-route-401; mobile
  `deleteAccount` success + keep-session-on-failure. `npm test` 38/38,
  `flutter test` 110/110.

---

## P1 — parity & completeness

### FW-3 · Push notifications (FCM) — `[x]` DONE 2026-09-01 (iOS APNs key + web-push still open)
- `[x]` **Backend:** `pushService.js` (lazy `firebase-admin`; creds from
  `FIREBASE_SERVICE_ACCOUNT` = path / raw JSON / base64, or
  `GOOGLE_APPLICATION_CREDENTIALS`, or `src/config/service_account.json`;
  silent no-op when unset). `POST/DELETE /api/delivery/devices[/:token]` +
  `POST/DELETE /api/customers/me/devices[/:token]`. `assignmentService.createOffer`
  sends a `delivery_offer` data message.
- `[x]` **Delivery + customer apps:** `firebase_core` + `firebase_messaging`,
  `google-services.json` / `GoogleService-Info.plist` (Firebase project
  `grocery-76b84`), `firebase_options.dart`, `PushService` (permission + token
  register after login / unregister on logout + `onMessageOpenedApp` tap route).
- `[x]` **Backend:** `sendToOwner` now fires on customer-facing status
  milestones — `orderController.updateStatus` (Out For Delivery / Arrived /
  Delivered / Cancelled) and `deliveryController.notifyCustomer` (on-the-way /
  delivered). Data payload `{ type:'order_update', orderId, status }` → tap
  routes to the order.
- `[ ]` **iOS:** upload the APNs auth key to Firebase + add the Push capability
  in Xcode before an iOS release.
- `[ ]` **Web:** optional web-push later; keep the in-app notifications feed in
  sync.
- **Acceptance:** ✅ moving an order to "Out for Delivery" pushes to the
  customer's device; tap opens `/order/:id`. (Live once Android is on a device
  with the app; iOS pending the APNs key.)

### FW-4 · Wallet top-up (Razorpay) + web wallet parity
- `[ ]` **Backend:** `POST /api/customers/me/wallet/topup` → creates a Razorpay
  order; on verify, credit `walletBalance` + `WalletTransaction{type:'Credit'}`.
- `[ ]` **Mobile:** "Add money" on the wallet screen → Razorpay sheet → refresh
  balance + history.
- `[ ]` **Web:** `CustomerProfileDrawer` wallet block is a hardcoded `₹0` stub —
  show the real balance, real "Add Balance" flow, and a transactions list
  (needs WEB-1 or a phone-keyed read route).
- **Acceptance:** top-up reflects in balance + ledger on both clients; web no
  longer shows a fake `₹0`.

### FW-5 · Category filters + pagination
- `[ ]` **Mobile & Web:** filter sheet — price range (`minPrice/maxPrice` already
  server-side), brand, in-stock only, discount; sort (price, discount, rating).
- `[ ]` **Backend:** confirm/extend `GET /products` query params; add
  `page`/`limit` + return `total`. **Mobile:** infinite scroll on large
  categories.
- **Acceptance:** filtering a large category is paginated and fast; filter state
  survives back-navigation.

### FW-6 · Orders — status-filter tabs, active-order banner, invoice
- `[~]` **Mobile:** add All / In Transit / Delivered / Cancelled tabs on the
  orders list (web already has them via `bucketOf`). Currently only a 2-way
  active/past split.
- `[ ]` **Mobile & Web:** active-order banner on Home (tap → tracking).
- `[ ]` **Backend + both:** real invoice / credit-note (PDF or hosted HTML) —
  today the button is an `alert()` stub. Model `Invoice` exists.
- **Acceptance:** tabs match the 14-value status enum via buckets; Home shows a
  live banner while an order is in flight; invoice opens a real document.

### FW-7 · Membership — real join / upgrade
- `[ ]` **Backend:** endpoint to start/upgrade `membershipType` (Normal → VIP),
  priced via Razorpay or wallet; store expiry.
- `[ ]` **Mobile & Web:** membership screen "Join" CTA → payment → benefits
  reflected (free delivery threshold, etc. via `PricingConfig`).
- **Acceptance:** joining changes `membershipType` and the checkout pricing rules
  that read it.

### FW-8 · Content pages on mobile (parity with web)
- `[ ]` **Mobile screens** backed by existing APIs: Offers (`/offers`), Brands
  (`/brands` + brand catalog), Blog list + detail (`/blogs`), About, Help-Centre
  FAQ.
- `[ ]` Wire CMS `webLink` → `resolveAppRoute()` for any promo cards that point
  at these.
- **Acceptance:** every web storefront content route has a native mobile
  equivalent; no dead links from banners/promo cards.

---

## P2 — polish & platform

### FW-9 · Deep links / app links
- `[ ]` Android `intent-filter` + iOS associated domains + `assetlinks.json` /
  AASA. Route `https://<domain>/product/:id`, `/order/:id` into the app.
- `[ ]` Swap `share_plus` payloads from the placeholder `freshcart.com` URL to
  the real app-link domain.

### FW-10 · Permissions hardening
- `[ ]` `permission_handler` — rationale sheets + "Open settings" fallback for
  location (and notifications, camera if PoD photo is ever added to the customer
  app). iOS `Info.plist` usage strings.

### FW-11 · Festival campaign theming on Home
- `[ ]` **Mobile:** consume `GET /api/festival-campaigns/active` → themed hero /
  accent colours on Home (web already themed — see commit `f616d5e`).

### FW-12 · Analytics + crash reporting
- `[ ]` Firebase Analytics + Crashlytics (or Sentry) in mobile; funnel events
  (view PDP, add to cart, checkout, order placed). Backend error logging review.

### FW-13 · `location_select` screen cleanup
- `[ ]` Address fields → `AppTextField`; surface reverse-geocode failures instead
  of swallowing them; use the shared design tokens.

### FW-14 · Category / subcategory imagery
- `[ ]` **Backend:** add an image field to subcategories. **Mobile & Web:** show
  real tiles instead of icon-only.

### FW-15 · Support / Help centre
- `[ ]` FAQ + help content (mobile + web). Persist ticket history
  (`SupportTicket` model exists) and show pending/sent indicators on chat
  bubbles.

### FW-16 · Search polish
- `[ ]` Wire or remove the decorative mic button on the search bar.
- `[ ]` Delete the dead `quantity_selector.dart` (superseded by `QtyStepper`).
- `[ ]` Voice search (if the mic stays) or recent/trending suggestions.

---

## Web-specific

### WEB-1 · Real customer authentication for the storefront
- `[ ]` Replace the fake OTP (`default 1234`) + phone-keyed `/api/customers/auth`
  with the real customer OTP + JWT flow the mobile app uses
  (`/api/customers/otp/send|verify`, `protectCustomer`).
- **Unblocks:** web wallet (FW-4), and lets web drop the `{ phone }`-in-body
  pattern for cancel/reviews.

### WEB-2 · Bundle size
- `[ ]` `dist/assets/index-*.js` is ~800 KB (gzip ~220 KB) — route-level code
  splitting (`React.lazy`) for admin + heavy storefront pages.

---

## Email / notifications

### EMAIL-1 · Transactional email — `[~]` started 2026-09-01
- `[x]` `nodemailer` + `src/services/mailService.js` (Gmail SMTP via App
  Password; no-op if unset; `MAIL_TEST_MODE` outbox). Delivery-partner login
  credentials emailed on create + on password reset.
- `[ ]` Extend to: order confirmation / out-for-delivery / delivered to the
  customer email; support-ticket replies; admin welcome. Move to a queue
  (BullMQ is already a dep) if volume grows.
- `[ ]` Consider a proper From domain + SPF/DKIM instead of a personal Gmail
  before production.

## Backend / infra

### BE-1 · Endpoint auth review
- `[x]` `DELETE /api/customers/:id` — now staff-only (FW-2).
- `[ ]` Still open, confirm intentional or gate: `POST /api/products`,
  `PUT/DELETE /api/products/:id`, the phone-keyed `/api/customers/:id/*` block
  (profile / addresses — blocked on WEB-1), `POST /api/orders` (create).

### BE-2 · Reviews moderation UX
- `[ ]` Admin: surface the customer-submitted `Pending` reviews queue prominently
  (they now arrive from the storefront). Bulk approve/reject.

### BE-3 · Order cancel — COD edge
- `[~]` `createOrder` defaults `paymentStatus:'Paid'` even for COD. Cancel refund
  is guarded by a `paymentMethod` COD/cash regex — tighten `createOrder` so COD
  orders are `paymentStatus:'Pending'` and remove the regex reliance.

### BE-4 · Test coverage for the frontend
- `[ ]` No automated tests on `frontend/` — add at least smoke/RTL tests for the
  customer journey (PDP → cart → checkout, order cancel, review submit).

---

## Delivery app (separate track — see `MEMORY.md` for P1-D* status)

### DEL-1 · Remaining delivery roadmap
- `[ ]` Whatever follows P1-D5 (partner notifications inbox shipped 2026-09-01):
  customer↔rider chat, proof-of-delivery review, earnings/payout screens,
  shift scheduling. Confirm scope before starting.

---

## UI / UX audit — open items

Pull the current open P1/P2 rows from `MOBILE_UI_UX_AUDIT.md` when starting a
design pass. P0 items are all resolved (flat design system, single bottom nav,
one `QtyStepper`, one `SectionHeader`, contrast-safe green tokens).

---

## Done recently (context only — full detail in `MEMORY.md` §5)

- `[x]` Group 1 — Legal links + `LegalScreen`; PDP native share (`share_plus`).
- `[x]` Group 2 — order cancel (+ wallet refund), wallet transaction history,
  product reviews (verified-purchase, moderated) — all on mobile **and** web.
- `[x]` FW-2 — self-service account deletion (`DELETE /customers/me`, cascade)
  + legacy `DELETE /customers/:id` locked to staff.
