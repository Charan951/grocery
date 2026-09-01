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

- **Backend**: single `/api` router (`backend/src/routes/api.js`) → `apiController.js`
  (1525 lines) + `festivalCampaignController.js`. Models in `backend/src/models/`:
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
  Nav (since P0-4): `routerProvider` GoRouter + `StatefulShellRoute`, 5 tabs Home/Categories/Search/Orders/Account (was `IndexedStack` in
  `MainNavigationShell`).

## 3. Design System

- Web (`DESIGN.md`): **flat**. White cards on warm off-white `#F8FAF7`, 1px
  hairline dividers, minimal shadow, no glass. Primary green `#4CAF50`, full-pill
  buttons, 12–16px radius. Plus Jakarta Sans (display) / Inter (body). Admin =
  deep-forest "control tower" ink theme.
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

## 5. Completed Major Work

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
- Socket listens for `order_status_update` / `rider_location_update` but nothing
  emits them server-side.

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
  both clients), Razorpay (payments, simulated), Firebase (dep only, no code).

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

- **Backend: `npm test` → 35 tests, all green**
  (`node:test` + `supertest` against `MONGO_URI`). Covers auth/OTP, protectCustomer,
  coupon validate, order placement + `/orders/mine` + ownership, status timeline,
  **order cancel (owner check, wallet refund, past-window 409) + wallet ledger**,
  payment test-mode, delivery partner lifecycle + admin assign/reassign/unassign +
  partner password-reset/activate-deactivate.
- **Mobile: `flutter test` → 105 tests, all green** — `auth_flow_test`,
  `catalog_models_test`, `pricing_test`, `design_flat_test`, `order_model_test`,
  `foundation_widgets_test` (7), `navigation_test` (5 — nested/back nav),
  `auth_flow_widget_test` (10 — PhoneField/OtpField + login→OTP→success flow +
  Terms/Privacy consent line), `legal_screen_test` (2 — tab default + `?tab=`),
  `orders_flow_test` (12 — incl. cancel pre-dispatch + no-cancel once dispatched).
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

## 13. Last Updated

2026-09-01 — Delivery P1-D4 (backend): FCM push for delivery offers. New pushService.js (lazy firebase-admin, no-op when FIREBASE_SERVICE_ACCOUNT unset), POST/DELETE /api/delivery/devices + /api/customers/me/devices, createOffer sends a delivery_offer data message. Backend 35 tests. Flutter FCM client still needs the user's Firebase project.

2026-09-01 — Mobile audit fix Group 2 (partial): order cancel + wallet history. New `POST /api/orders/:id/cancel` (dual-auth token-or-{phone}; pre-dispatch only; prepaid → wallet Credit + Refunded; releases rider) wired to mobile order-detail + web CustomerOrders; new `GET /api/customers/me/wallet/transactions` wired to the mobile wallet screen history list. Backend npm test 33/33, flutter test 105/105, frontend build clean, debug APK built. Next in Group 2: product reviews (`GET/POST /products/:id/reviews`).

2026-09-01 — Delivery P1-D3: customer live rider tracking. Backend getOrder adds a masked `delivery` block (real phone/location only in the Out For Delivery/Arrived reveal window; OTP owner-only). Web /track/:orderId (lazy Leaflet, 10s poll, Call/WhatsApp) + "Track live" on in-transit orders. Mobile tracking_screen consumes the block, gates Call on canContact, adds WhatsApp. Backend 31 tests, mobile 103 tests, builds clean. Next: P1-D4 FCM offer push.

2026-09-01 — Mobile audit fix Group 1 (Broken functionality): login Terms/Privacy now real links → new bundled LegalScreen (/legal?tab=terms|privacy) + legal_content.dart mirroring web Legal.tsx; PDP share uses share_plus native sheet (added dep) instead of clipboard. flutter test 103/103, analyze clean. Next: Group 2 (reviews, order cancel, wallet transactions — need surgical backend routes on existing Review/Order/WalletTransaction models, wired to web + mobile).

2026-09-01 — Delivery P1-D2: admin live fleet map (imperative Leaflet, polls GET /admin/delivery/fleet every 10s) + PartnerDetail page at /admin/delivery/:userId; backend GET /admin/delivery/partners/:userId/deliveries|performance. Backend 30 tests green, frontend build clean. Next: P1-D3 customer live tracking.

2026-09-01 — Delivery P1-D1: automatic assignment on Order → Ready. assignmentService +findCandidates (2dsphere $near, capacity + online + active filter, distance/load/rating rank) +tryAssign (idempotent, attempt tracking, radius auto-expand ×1/2/3, re-offer on decline/expire for source=auto, stall when exhausted). Trigger in updateStatus, gated by Settings.autoAssignEnabled. Backend 29 tests green. Next: P1-D2 admin fleet map.

2026-09-01 — Delivery P0-D5: admin web delivery management — DeliveryModule rebuilt on GET /admin/delivery/partners (live status, add, reset-pw, activate/deactivate, responsive table+cards); Orders.tsx assign flow rewired to real POST /admin/orders/:id/assign|reassign|unassign with partner select + force option. 2 new backend endpoints (reset-password through hash, account suspend/activate). Backend 27 tests green, frontend build clean. Next: P1-D1 auto-assign on Ready.

2026-09-01 — Delivery P0-D4: new `deliveryapp/` Flutter package (MVP) — splash/login/forgot/dashboard(online toggle + location heartbeat)/order-detail(lifecycle + OTP/photo proof)/history/profile, socket `partner:<id>` offer overlay with countdown Accept/Reject. No backend changes. `flutter analyze` clean, 5 tests green, debug APK builds. Next: P0-D5 admin web delivery management + responsive.