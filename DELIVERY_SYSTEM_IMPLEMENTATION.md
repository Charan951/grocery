# FreshCart — Delivery Partner System: Audit & Implementation Plan

> **Read `MEMORY.md`, `MOBILE_APP_IMPLEMENTATION.md`, `KNOWLEDGE_BASE.md`, `PRODUCT.md`
> before implementing.** This is an **audit + plan only — no code has been written.**
> Backend is the source of truth. Reuse existing models/APIs/patterns. Do not break
> existing functionality. RBAC everywhere. Do not expose customer or partner PII.

Audit date: 2026-09-01 · Author: pre-implementation audit
Status after P0–P1-2 of the mobile initiative (see `MEMORY.md §5`).

---

## 0. Executive Summary

A delivery-partner layer is **~15% present**: a `User` row with `role:'Delivery'`,
`Order.deliveryPartnerId/Name` + `Assigned`/`Out For Delivery` statuses, a manual
"Assign Rider" modal in admin `Orders.tsx`, a static `DeliveryModule` fleet card
list, a staff-only `POST /api/orders/:id/rider-location` + `rider_location_update`
socket event, and per-order Socket.IO rooms with `order_status_update`.

**Missing:** a delivery-partner domain model (online status, geo-location,
workload, zones, earnings), a partner auth guard, online/offline + location
heartbeat, an offer/accept/reject assignment flow with timeout & re-offer, an
automatic assignment engine, a delivery-partner mobile app, an admin live fleet
map, delivery proof (OTP/photo), failed-delivery capture, and customer-facing
live rider tracking on the web.

**Approach:** additive. New `DeliveryPartner` + `Assignment` (+ later
`DeliveryEarning`) collections keyed by `User._id` — mirroring how `Customer` is a
separate doc from `User`. New `/api/delivery/*` (partner) and
`/api/admin/delivery/*` (ops) route groups. Reuse the existing Socket.IO server
(`app.set('io')`), per-order rooms, JWT+RBAC, `Notification` model, `geolocator` /
`url_launcher` / `latlong2` / `mapcn_flutter` in Flutter, and Leaflet in the web
admin. **No new infrastructure** (no Kafka/Redis-streams/queue) — a `setInterval`
sweeper + a Mongo TTL index handle offer expiry.

**Open decisions for you (see §23 end):** (a) separate `deliveryapp/` Flutter
package vs. a build flavor of the customer app; (b) is **earnings** in P0 scope or
P2; (c) is **doorstep OTP proof** mandatory or optional; (d) phone privacy —
number masking provider vs. time-boxed reveal.

---

## 1. Existing Architecture

### 1.1 Monorepo
```
backend/   Node + Express (ESM) + MongoDB Atlas (Mongoose) + Socket.IO   :5000
           app.js (createApp → app + httpServer + io, app.set('io', io))
           index.js (dotenv + createApp + connectDB + listen)
frontend/  React 19 + TS + Vite + Tailwind v4 SPA — storefront + /admin/*
mobileapp/ Flutter customer app ("freshcart") — Riverpod, go_router, Dio,
           socket_io_client, Hive, geolocator, mapcn_flutter, latlong2, url_launcher
```

### 1.2 Backend
- **Single router** `backend/src/routes/api.js` → `apiController.js` (~1600 lines)
  + `authCustomerController.js` + `festivalCampaignController.js`.
- **Auth / RBAC** (`src/middleware/auth.js`):
  - `protect` — staff JWT (`User`), 24h. `authorize(...roles)` on `User.role`.
  - `protectCustomer` — 30-day customer JWT (`type:'customer'`).
  - `attachCustomerOptional` — soft customer auth (used on `POST /orders`, `/payment/*`).
  - Roles: `Admin, Manager, Employee, Delivery, Customer` (string on `User.role`).
  - **`POST /api/auth/login` already authenticates any `User` role, including
    `Delivery`** → the seeded `delivery@freshcart.com` / `delivery123` can log in
    today and receive a staff JWT.
- **Realtime** (`app.js`): Socket.IO, `origin:*`. Rooms per `orderId`. Events:
  - client→server: `join_order_room`, `leave_order_room`, `support_message_send`
  - server→client: `order_status_update` (emitted on `updateStatus` + `createOrder`),
    `rider_location_update` (emitted by `POST /api/orders/:id/rider-location`),
    `support_message_received`
  - `io` reachable in controllers via `req.app.get('io')`.
- **Offline-stub middleware** at the top of `api.js` short-circuits many routes
  when Mongo is disconnected — **not** a production trust boundary.
- **Tests**: `backend/npm test` — 12 `node:test` + `supertest` integration tests
  (incl. a real socket.io-client test).

### 1.3 Frontend (web)
- `App.tsx` (storefront) + lazy `AdminApp.tsx` (`/admin/*`, ~16 routes).
- Admin auth = presence of `localStorage.admin_token` (client-side flag; the token
  is a real staff JWT used for API calls).
- Admin modules in `src/pages/admin/Modules.tsx` incl. **`DeliveryModule`**
  (`/admin/delivery`), **`EmployeesModule`** (`/admin/employees`),
  `src/pages/admin/Orders.tsx`.
- Leaflet + `@types/leaflet` are already dependencies (`LocationModal` uses OSM).
- Customer order tracking = `src/pages/CustomerOrders.tsx` — status buckets +
  `trackingTimeline` list. **No map, no socket** on web yet.

### 1.4 Mobile (customer app)
- Real customer OTP auth (JWT in `flutter_secure_storage`, Dio interceptor,
  `go_router` redirect guard). `StatefulShellRoute` 5-tab shell.
- `SocketService` (singleton) — `connectionStream`, per-order rooms,
  auto-rejoin on reconnect, `order_status_update` + `rider_location_update` streams.
- `TrackingNotifier` — seeds from `GET /orders/:id`, socket + 15s polling fallback,
  `TrackingMapPainter` custom painter (store→home route + rider marker).
- `geolocator`, `url_launcher`, `latlong2`, `mapcn_flutter` present.
- A **parallel work-stream** is actively adding a design-system widget layer
  (`core/widgets/app_*`, `AuthScaffold`, `PhoneField`, `OtpField`, `AppToast`) —
  coexists cleanly; watch for overlap.

---

## 2. Existing Order Flow

1. Customer places order — `POST /api/orders` (`attachCustomerOptional`;
   `customerId` from token). Stock decremented (`$inc: 'stock.quantity'`).
   `Payment` reconciliation doc written. `order_status_update` emitted.
2. **Status enum** (`Order.status`): `Pending, In Transit, Accepted, Packed,
   Ready, Assigned, Out For Delivery, Delivered, Cancelled, Returned, Refunded`.
   Default `In Transit` (a quirk — mobile/web send explicit `Pending`).
3. Ops move status via `PUT /api/orders/:id/status`
   (`protect` + `authorize('Admin','Manager','Delivery')`). Appends
   `trackingTimeline[{status,note,at}]`; on `Delivered` sets `paymentStatus:'Paid'`;
   emits `order_status_update` to the order room.
4. **Manual rider assignment** (admin `Orders.tsx` → "Assign Rider" modal):
   `PUT /orders/:id/status` with `{status:'Assigned', deliveryPartnerId:'dr_'+name,
   deliveryPartnerName}` — **`deliveryPartnerId` is a synthetic string, not a
   `User._id`.** Rider dropdown = `GET /employees` filtered to `role==='Delivery'`.
5. `POST /api/orders/:id/rider-location {lat,lng,etaMinutes,...}`
   (`authorize('Admin','Manager','Delivery')`) → emits `rider_location_update` to
   the order room. **No producer calls it in the normal flow** (no rider app).
6. Customer sees status + timeline (web: list; mobile: `tracking_screen` with live
   socket + polling + painted map, rider marker only if `rider_location_update`
   arrives).

**Gap:** nothing transitions `Ready → Assigned` automatically; the partner side of
the flow (accept, pickup, deliver, proof, fail) does not exist.

---

## 3. Existing User (Customer) Flow

- Storefront: browse → cart → address (OSM Nominatim) → checkout (Razorpay test /
  wallet / COD) → order placed → `CustomerOrders.tsx` history + timeline.
- Mobile: OTP login → catalog → cart → checkout → `/order-placed/:id` → `/orders`
  → `/order/:id` detail → `/tracking/:orderId` (live).
- Customer identity: `Customer` doc keyed by `customerId = cust_<phone10>`; phone
  stored `+91 XXXXXXXXXX`. Addresses are subdocs with `{lat,lng,fullAddress,...}`.
- **Customers currently cannot**: see rider identity, call/WhatsApp the rider,
  see the rider on a map on the web.

---

## 4. Existing Admin Flow

- `/admin` dashboard (KPIs), `/admin/orders` (status board + assign modal),
  `/admin/delivery` (**static** fleet card list — add rider name/email/password,
  delete; hard-coded "Available"/"Active Fleet" labels, **no real status/location**),
  `/admin/employees` (User CRUD incl. role `Delivery`), plus catalog/CMS/finance/etc.
- Admin API calls send `Authorization: Bearer <admin_token>`.
- **Admin currently cannot**: see partner online/offline, see partner location or a
  fleet map, reassign/unassign cleanly (only "set status again"), view a partner's
  delivery history / performance / earnings, reset a partner password, or
  activate/deactivate (the `User.status` enum `Active/Suspended` exists but the UI
  doesn't use it).

---

## 5. Existing APIs (delivery-relevant)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | open | works for `role:'Delivery'` → staff JWT |
| GET | `/api/auth/me` | `protect` | returns `req.user` |
| GET | `/api/employees` | `protect` + Admin/Manager | all non-Customer `User`s (used as the rider list) |
| POST | `/api/employees` | `protect` + Admin | create `User` (role defaults `Employee`) |
| PUT | `/api/employees/:id` | `protect` + Admin | `User.findByIdAndUpdate` (raw body — unsafe for password) |
| DELETE | `/api/employees/:id` | `protect` + Admin | hard delete |
| GET | `/api/orders` | `protect` + Admin/Manager | all orders (PII) |
| GET | `/api/orders/:id` | `attachCustomerOptional` | ownership-checked for customers |
| GET | `/api/orders/customer/:phone` | open | customer history |
| PUT | `/api/orders/:id/status` | `protect` + Admin/Manager/Delivery | status + `deliveryPartnerId/Name` + timeline + socket emit |
| POST | `/api/orders/:id/rider-location` | `protect` + Admin/Manager/Delivery | emits `rider_location_update` |
| GET | `/api/dashboard/stats` | `protect` | KPI aggregation pattern to reuse for performance |
| — | Socket `join_order_room` / `order_status_update` / `rider_location_update` | — | per-order realtime |

**No** partner-scoped endpoints, **no** assignment endpoints, **no** fleet
endpoint, **no** forgot/reset-password.

---

## 6. Existing Database Models (delivery-relevant)

- **`User`** (`models/User.js`): `name, email(unique), password(bcrypt pre-save),
  phone, role, status('Active'|'Suspended'), avatarUrl`, `comparePassword()`.
  `Role` model exists but is **unused/dead**.
- **`Order`** (`models/Order.js`): see §2. Has `deliveryPartnerId`,
  `deliveryPartnerName`, `trackingTimeline[]`, `estimatedDelivery` (string),
  `deliveryAddress` (**string only — no lat/lng on the order**),
  `orderArrivedAt` (unused), `paymentStatus`.
- **`Notification`** (`models/Operations.js`): `{userId, title, body, read, type}`
  — **defined but never written/read anywhere.** Reuse for delivery notifications.
- **`AuditLog`** + `logAudit()` — exported, never called. Reuse for
  assignment/override audit.
- **`Settings`**: `deliveryFeeRule`, `taxPercent`, `supportPhone` — reuse for
  earnings base fee / config.
- No `DeliveryPartner`, `Assignment`, `Earning`, `Zone`, `DeviceToken` models.
- No geospatial (`2dsphere`) index anywhere.

---

## 7. Existing Notification System

- **None functional.** `Notification` Mongoose model exists but unused.
- `firebase-admin` is a backend dependency — **not wired** (no FCM send, no device
  tokens). Push (mobile P1-3) is planned, not done.
- Real-time "notifications" today = Socket.IO events only, while a socket is open.
- **Decision:** delivery notifications = `Notification` doc (persistent inbox) +
  Socket.IO event (live) + FCM (when P1-3 lands, for backgrounded partner app).

---

## 8. Existing Map / Location System

- **Geocoding**: OpenStreetMap **Nominatim** (web `LocationModal`, mobile
  location screens) — free, no key. Reverse + forward geocode.
- **Web maps**: `leaflet` + `@types/leaflet` are dependencies; used in
  `LocationModal` (address pin). No live-tracking map component yet.
- **Mobile maps**: `mapcn_flutter` + `latlong2`; custom `TrackingMapPainter`
  (schematic route, not a real tile map); `geolocator` for device GPS;
  `url_launcher` for external navigation intents.
- **Order geo**: the order stores only `deliveryAddress` **string**. Customer
  `Address` subdocs *do* carry `{lat, lng}` — but the order-creation payload
  flattens to a string. **Need to persist `deliveryLocation {lat,lng}` on the
  order** for routing/assignment/ETA.
- No store/dark-store coordinates are configured anywhere (single implied dark
  store). **Need a store origin** (in `Settings` or a `Store` doc).

---

## 9. What Can Be Reused

| Area | Reuse |
|---|---|
| Auth | `POST /auth/login` (Delivery role), JWT signing, `bcrypt` hash + `comparePassword`, `protect`/`authorize` pattern → add `protectDelivery` |
| Identity split | `Customer`-separate-from-`User` pattern → `DeliveryPartner` separate from `User` |
| Orders | `Order` model, status enum (already has `Assigned`/`Out For Delivery`), `trackingTimeline`, `deliveryPartnerId/Name`, `PUT /orders/:id/status` + its socket emit |
| Realtime | Socket.IO server, `app.set('io')`, per-order rooms, reconnect/rejoin logic (mobile `SocketService`), 15s polling fallback pattern |
| Location fan-out | `POST /orders/:id/rider-location` + `rider_location_update` event (keep for admin/manual; partner app calls a new `/delivery/location`) |
| Notifications | `Notification` model (activate it) + `logAudit()` (activate it) |
| Maps | Leaflet (web), `mapcn_flutter`/`latlong2`/`TrackingMapPainter`/`geolocator`/`url_launcher` (mobile), Nominatim geocoding |
| Media | Cloudinary `POST /api/upload` (base64→URL) for delivery-proof photos |
| Config | `Settings` (fees, support phone) for earnings base + store origin |
| Admin web | `DeliveryModule` shell, `Orders.tsx` assign modal, `AdminLayout` nav, `ShelfTag`/`PageHeader` components, admin token header helper |
| Mobile patterns | `ApiService` + Dio interceptor, `TokenStore` (secure), `AppConfig` (`--dart-define`), `ApiException`, Riverpod `StateNotifier`/`FutureProvider`, `flutter build apk` + `env/*.json` |
| Tests | `backend/test/*.test.js` harness (`node:test`+`supertest`+`socket.io-client`), Flutter `flutter_test` |
| Dashboard | `dashboardController.getStats` aggregation style for performance metrics |

---

## 10. What Needs To Be Created

**Backend**
- `DeliveryPartner`, `Assignment` models (+ `DeliveryEarning`, `DeliveryZone` later).
- `protectDelivery` middleware; partner forgot/reset-password (token or OTP).
- `deliveryController` (partner-scoped) + `adminDeliveryController` (ops).
- `assignmentService` — candidate selection, ranking, offer/accept/reject/expire,
  re-offer, duplicate prevention; an expiry sweeper (`setInterval` + TTL index).
- `Order` fields: real FK `deliveryPartnerUserId`, `deliveryLocation {lat,lng}`,
  `pickup {name,lat,lng}`, `deliveryOtp`, `podPhotoUrl`, `failureReason`,
  `pickedUpAt`, `deliveredAt`, `assignmentId`.
- Store origin config (Settings fields or a tiny `Store` doc).
- Socket: authed `partner:<userId>` rooms, `admin_fleet` room; events
  `delivery_offer`, `delivery_offer_revoked`, `assignment_confirmed`,
  `fleet_update`, `order_cancelled`.
- Activate `Notification` + `logAudit()`.

**Admin web**
- Replace static `DeliveryModule` with a real partner management + live fleet map.
- Real assign / reassign / unassign in `Orders.tsx` (against new endpoints, real
  partner id, assignment history).
- Partner detail page: profile, status, location, deliveries, performance, earnings.
- Sidebar nav entries; responsive layouts.

**User web + mobile (customer)**
- Live rider tracking on order detail: socket `order:<id>` room, Leaflet (web) /
  existing painter or a real map (mobile) with rider marker + ETA; call + WhatsApp
  (privacy-safe); progress steps. (Mobile is ~70% there via `TrackingNotifier`.)

**Delivery-partner mobile app** (new — see §17): full app.

**Shared**
- Haversine/geo utils, delivery state-machine definition, ETA estimator.

---

## 11. Database Changes

> New collections; **`Order` gets additive fields only** (no breaking changes).

### 11.1 `DeliveryPartner` (new) — keyed by `User._id`
```
userId            ObjectId ref User (unique, index)   // the login identity
phone             String  (index)                     // for masking / contact
vehicleType       String  enum ['bike','scooter','bicycle','car','on_foot']  default 'bike'
isOnline          Boolean default false               // partner toggle
availability      String  enum ['offline','available','busy']  default 'offline'
currentLocation   { type:'Point', coordinates:[lng,lat] }   // GeoJSON, 2dsphere index
locationUpdatedAt Date
zones             [String]                             // zone ids/names (P2 makes this real)
activeOrderIds    [String]  (order.orderId)            // in-progress deliveries
maxConcurrent     Number  default 1                    // batching cap
completedCount    Number  default 0
failedCount       Number  default 0
rating            Number  default 5
ratingCount       Number  default 0
deviceTokens      [String]                             // FCM (P1-3)
lastSeenAt        Date
onboardedAt       Date
timestamps
```
Indexes: `{ userId:1 } unique`, `{ currentLocation:'2dsphere' }`,
`{ isOnline:1, availability:1 }`.

### 11.2 `Assignment` (new) — one row per offer attempt
```
orderId       String  (index)          // Order.orderId
partnerUserId ObjectId ref User (index)
status        String  enum ['offered','accepted','rejected','expired','cancelled','completed','failed']  index
attempt       Number  default 1
distanceMeters Number
offeredAt     Date default now
respondedAt   Date
expiresAt     Date                      // TTL index -> auto-purge stale 'offered' rows after grace
reason        String                    // reject/fail reason
timestamps
```
Indexes: `{ orderId:1, status:1 }`, `{ partnerUserId:1, status:1 }`,
`{ expiresAt:1 } TTL (expireAfterSeconds: 3600)`.
**Invariant:** at most one `status ∈ {offered, accepted}` per `orderId` at a time —
enforced by atomic `findOneAndUpdate` transitions (not a DB unique index, because
history rows share `orderId`).

### 11.3 `Order` — additive fields
```
deliveryPartnerUserId  ObjectId ref User      // REAL fk (deliveryPartnerId string kept for back-compat / display)
assignmentId           ObjectId ref Assignment
deliveryLocation       { lat:Number, lng:Number }   // resolved from the chosen customer address
pickup                 { name:String, lat:Number, lng:Number }   // dark store origin (from Settings)
deliveryOtp            String                 // 4-digit, hashed OR plain (short-lived, low-risk) — decision in §20
podPhotoUrl            String                 // Cloudinary URL (proof of delivery)
failureReason          String
pickedUpAt             Date
deliveredAt            Date
```

### 11.4 `DeliveryEarning` (new — P2, or P1 if earnings in scope)
```
partnerUserId ObjectId ref User (index)
orderId       String
baseFee       Number
distanceFee   Number
surge         Number  default 0
tips          Number  default 0
total         Number
status        String enum ['pending','settled']  default 'pending'
earnedAt      Date
settledAt     Date
```

### 11.5 `DeliveryZone` (new — P2)
```
name    String
polygon { type:'Polygon', coordinates:[[[lng,lat],...]] }   // 2dsphere
active  Boolean
```

### 11.6 `Settings` — add
```
storeOrigin      { name, lat, lng }        // dark-store pickup point
deliveryBaseFee  Number  default 20        // partner earning base
deliveryPerKmFee Number  default 6
offerTimeoutSec  Number  default 25
maxOfferAttempts Number  default 5
assignRadiusKm   Number  default 6
```

### 11.7 `DeviceToken` (new — shared with mobile P1-3)
```
ownerType String enum ['customer','partner']
ownerId   String    // customerId or User._id
token     String (index)
platform  String
updatedAt Date
```

**Seed:** keep `delivery@freshcart.com`; add a matching `DeliveryPartner` doc for
it so demo works. Gate any reseed behind `NODE_ENV !== 'production'` (already the pattern).

---

## 12. Backend Changes

### 12.1 Middleware
- `protectDelivery` — `protect` + `req.user.role === 'Delivery'` + `req.user.status
  === 'Active'` + load the `DeliveryPartner` doc onto `req.partner`. 401/403 otherwise.
- Extend nothing else; `authorize('Admin','Manager')` covers ops endpoints.

### 12.2 New controllers
- **`deliveryController`** (partner-scoped, `protectDelivery`):
  - `GET  /api/delivery/me` — partner profile + today's summary
  - `PUT  /api/delivery/status` `{isOnline}` — online/offline toggle (also flips `availability`)
  - `POST /api/delivery/location` `{lat,lng,heading?,speed?}` — heartbeat (rate-limited); persists + fans out (`fleet_update`; `rider_location_update` to the active order's room)
  - `GET  /api/delivery/orders/active` — current assigned/in-progress orders (reconciliation source on app resume)
  - `GET  /api/delivery/orders/history?status=&page=` — completed/failed/cancelled
  - `GET  /api/delivery/orders/:id` — one order (only if assigned to this partner) with **masked customer contact**
  - `POST /api/delivery/assignments/:id/accept` — atomic; sets `Order.status='Assigned'`, `deliveryPartnerUserId`, joins timeline; emits
  - `POST /api/delivery/assignments/:id/reject` `{reason?}` — atomic; triggers re-offer
  - `POST /api/delivery/orders/:id/pickup-arrived`
  - `POST /api/delivery/orders/:id/picked-up` → `Order.status='Out For Delivery'`, `pickedUpAt`
  - `POST /api/delivery/orders/:id/arrived`
  - `POST /api/delivery/orders/:id/complete` `{otp?, podPhoto?(base64)}` → verifies OTP if enabled, uploads photo (Cloudinary), `Order.status='Delivered'`, `deliveredAt`, `paymentStatus='Paid'` (COD), earning row, partner counters, frees `activeOrderIds`
  - `POST /api/delivery/orders/:id/fail` `{reason}` → `Order.status` stays / moves to a `Failed` sub-state (see §21), `failureReason`, frees partner, alerts admin
  - `GET  /api/delivery/earnings?range=` — (if in scope)
  - `GET  /api/delivery/notifications` + `PUT /api/delivery/notifications/:id/read`
  - `POST /api/delivery/devices` — FCM token (P1-3)
  - `POST /api/delivery/auth/forgot` `{email}` → email/OTP reset token
  - `POST /api/delivery/auth/reset` `{token,password}`
  - Partners **log in via the existing `POST /api/auth/login`** (email+password) — no new login endpoint needed; the app just checks `role==='Delivery'`.
- **`adminDeliveryController`** (`protect` + `authorize('Admin','Manager')`):
  - `GET  /api/admin/delivery/partners` — list w/ live status, location, active order, last-seen
  - `POST /api/admin/delivery/partners` — create `User(role:'Delivery')` + `DeliveryPartner` (proper password hashing, unlike raw `PUT /employees`)
  - `GET  /api/admin/delivery/partners/:id` — full profile
  - `PUT  /api/admin/delivery/partners/:id` — edit (name, phone, vehicle, zones, maxConcurrent)
  - `PUT  /api/admin/delivery/partners/:id/activate` / `.../deactivate` — flips `User.status`; deactivate also forces offline + blocks new offers + reassigns active orders
  - `POST /api/admin/delivery/partners/:id/reset-password` — admin-set new password
  - `GET  /api/admin/delivery/partners/:id/deliveries` — history
  - `GET  /api/admin/delivery/partners/:id/performance` — acceptance rate, on-time %, avg time, completed/failed
  - `GET  /api/admin/delivery/partners/:id/earnings` — (if in scope)
  - `GET  /api/admin/delivery/fleet` — snapshot for the map (all online partners: loc, status, current order, updatedAt)
  - `POST /api/admin/orders/:id/assign` `{partnerUserId}` — manual direct assign (skips the offer, or sends a forced offer — config)
  - `POST /api/admin/orders/:id/reassign` `{partnerUserId}` — unassign current + assign new + audit
  - `POST /api/admin/orders/:id/unassign` `{reason}` — clears partner, order back to `Ready`, audit, re-queue for auto-assign

### 12.3 Order controller
- `createOrder` — resolve & persist `deliveryLocation {lat,lng}` from the chosen
  customer address (fall back to Nominatim geocode of the string if missing);
  persist `pickup` from `Settings.storeOrigin`.
- `updateStatus` — when the new status is `Ready` **and** no partner assigned →
  call `assignmentService.tryAssign(order)`. When status becomes `Cancelled` and a
  partner is assigned → emit `order_cancelled` to `partner:<id>`, revoke assignment,
  free partner.
- Keep `deliveryPartnerId`/`Name` (string) populated for display back-compat.

### 12.4 `assignmentService` (the engine — §19)
- `tryAssign(order)` → pick candidates → rank → offer top → create `Assignment` +
  emit `delivery_offer` to `partner:<userId>` + set `expiresAt`.
- `handleAccept / handleReject / handleExpiry` → atomic transitions + re-offer.
- `sweeper()` — `setInterval(15s)`: expire overdue `offered` rows, re-offer, and
  after `maxOfferAttempts` flag the order `assignmentStalled:true` + notify admin.

### 12.5 Socket wiring (`app.js`)
- On connection: if the handshake carries a valid JWT (`auth.token`), and role is
  `Delivery` → `socket.join('partner:' + userId)`; if `Admin`/`Manager` →
  `socket.join('admin_fleet')`. (Add lightweight JWT verify in the connection
  handler — reuse `jsonwebtoken`.)
- Handlers already present: order rooms. Add nothing client→server for delivery
  (partner actions go through REST for auditability); server→client emits are done
  by the controllers/service.
- New server→client events: `delivery_offer`, `delivery_offer_revoked`,
  `assignment_confirmed`, `fleet_update`, `order_cancelled`.

### 12.6 Cross-cutting
- Activate `Notification` writes (offer, assigned, cancelled, payout) +
  `logAudit()` (assign/reassign/unassign/override/deactivate).
- `express-rate-limit` (already a dep) on `/delivery/location` and
  `/delivery/auth/*`.
- Add `backend/test/delivery.test.js` + extend `socket.test.js`.

---

## 13. API Changes (summary)

**Additive, namespaced. Nothing existing is removed or repurposed.**

- New group `/api/delivery/*` (`protectDelivery`) — 20-ish partner endpoints (§12.2).
- New group `/api/admin/delivery/*` + `/api/admin/orders/:id/{assign,reassign,unassign}`
  (`authorize('Admin','Manager')`).
- `POST /api/orders` — response/body gains `deliveryLocation`, `pickup` (internal).
- `PUT /api/orders/:id/status` — unchanged signature; now may trigger auto-assign.
- Existing `POST /api/orders/:id/rider-location` — **kept** (manual/admin path); the
  partner app uses `/api/delivery/location` instead.
- Socket: new authed rooms + 5 new server→client events.
- **Deprecate (not delete)** the admin habit of assigning via
  `PUT /orders/:id/status {deliveryPartnerId:'dr_'+name}` — `Orders.tsx` switches to
  `/api/admin/orders/:id/assign` with a real `partnerUserId`.

---

## 14. Admin Web Changes

### 14.1 `DeliveryModule` → "Delivery Partners"
- Table/cards: name, phone, vehicle, **online/offline** dot, **available/busy**,
  current order (link), last-seen (relative), rating, completed/failed.
- Actions: **Add** (real create w/ hashed pw), **Edit**, **Activate/Deactivate**,
  **Reset password**, **View profile**.
- **Live fleet map** (Leaflet): markers per online partner, colour by
  available/busy, popup (name, current order, updatedAt); auto-refresh via socket
  `fleet_update` (fallback: poll `/api/admin/delivery/fleet` every 15s).
- New route `/admin/delivery/:id` — partner profile: details, live status/loc,
  **deliveries** (completed/failed/cancelled tabs), **performance** widget,
  **earnings** (if in scope).

### 14.2 `Orders.tsx`
- "Assign Rider" modal → real dropdown from `/api/admin/delivery/partners`
  (online first), calls `/api/admin/orders/:id/assign`.
- Add **Reassign** and **Unassign** buttons on assigned orders.
- Show assignment state: partner name, accepted/offered, attempts, `assignmentStalled` banner.
- Optional mini-map on the order detail drawer showing partner ↔ customer.

### 14.3 Nav / layout
- `AdminLayout` sidebar: keep `/admin/delivery`; the module is rebuilt in place.
- Reuse `PageHeader`, `ShelfTag`, admin token helper.

---

## 15. User Web Changes

- `CustomerOrders.tsx` order detail (and/or a dedicated `/track/:orderId` route):
  - Subscribe to socket `order:<orderId>` room; consume `order_status_update` +
    `rider_location_update`.
  - **Leaflet map**: customer pin + store pin + rider marker (only when status ∈
    {Assigned, Out For Delivery}); polyline; ETA label.
  - **Progress steps** driven by real `trackingTimeline`.
  - **Contact**: "Call rider" (`tel:` — number policy §20) and "WhatsApp"
    (`https://wa.me/<number>?text=...`) shown **only** while Out For Delivery.
  - Fallback to 15s polling of `/api/orders/:id` if the socket is down (mirror the
    mobile pattern).
- Header/`SEO` unaffected. No change to checkout/cart.

---

## 16. Responsive Changes

- **Admin fleet map + partner table**: desktop = table + side map; tablet =
  stacked; mobile = cards + full-width collapsible map. Admin is currently
  dense-desktop — add Tailwind `sm:`/`md:`/`lg:` breakpoints on the new module and
  the order drawer.
- **Customer tracking**: mobile-web is the primary surface — map ~40vh, sticky
  action bar (Call / WhatsApp / Help), steps below; tablet = two-column.
- **Order detail drawer** in `Orders.tsx`: ensure it's a full-screen sheet on
  mobile.
- Test at 360 / 414 / 768 / 1024 / 1440.

---

## 17. Mobile App Changes

### 17.1 Structure decision (needs your call — §23)
- **Option A (recommended): new Flutter package `deliveryapp/`** in the monorepo.
  Different audience, auth (email+password, not OTP), lifecycle (background
  location, always-on socket), and store-listing. Copy/adapt the proven patterns
  from `mobileapp/core` (`ApiService` skeleton, `TokenStore`, `AppConfig`,
  `ApiException`, `SocketService`, theme tokens). ~1–1.5k LOC of shared-ish code
  duplicated; clean separation, independent release cadence.
- **Option B: a build flavor / role-gated mode of `mobileapp/`.** Shares the
  design-system layer the parallel stream is building; smaller net code. But
  bloats the customer binary, complicates the router guard, and couples release
  cycles. Only sensible if you specifically want one codebase.

### 17.2 Screens (delivery-partner app)
| Screen | Purpose |
|---|---|
| Splash / auth gate | route by stored staff JWT + `role==='Delivery'` |
| Login | email + password; "Forgot password" |
| Forgot / Reset password | request + set new |
| Dashboard | big **Online/Offline** toggle; today: deliveries, earnings, online time; active-order card; "you're offline" empty state |
| New Order Offer (full-screen, modal) | order summary, pickup + drop distance, payout, **countdown ring**, **Accept** / **Reject(reason)**; auto-dismiss on expiry; arrives via socket `delivery_offer` (foreground) or FCM (background) |
| Order Details | items, amounts, payment type (COD flag), pickup + customer blocks, timeline |
| Pickup flow | "Navigate to store" (`url_launcher` → Google/Apple Maps), **Arrived at store**, **Picked up** |
| Active Delivery | map (customer + self), **Navigate to customer**, **Arrived**, **Complete** |
| Delivery Confirmation | enter **OTP** (if enabled) and/or capture **photo** (camera); Submit |
| Failed Delivery | reason picker (customer unreachable / wrong address / refused / other + note); confirm |
| Customer Details | first name, **masked phone**, address, **Call** / **WhatsApp** (only while Out For Delivery) |
| Map / Navigation | in-app map view; deep-link to external nav |
| History | completed / failed / cancelled tabs, filter by date, per-order detail |
| Earnings (if in scope) | today / week / month; per-delivery breakdown; payout status |
| Notifications | `Notification` inbox, read/unread |
| Profile | name, phone, vehicle, rating, stats; edit limited fields |
| Settings | location permission + "allow background", notification prefs, theme, logout |
| Help / Support | FAQ + contact (reuse support ticket API or a tel/email) |

### 17.3 Mechanics
- **Auth**: `POST /api/auth/login` → staff JWT in `flutter_secure_storage`; Dio
  interceptor; 401 → logout; `go_router` redirect guard (mirror customer app).
- **Socket**: connect on login with `auth:{token}`; join happens server-side
  (`partner:<id>`); listen for `delivery_offer` / `_revoked` / `assignment_confirmed`
  / `order_status_update` / `order_cancelled`.
- **Location**: `geolocator` stream while `isOnline`; POST `/api/delivery/location`
  every 10–15s (every ~5s while `Out For Delivery`). Background: Android
  foreground service (`flutter_background_geolocation` or a lightweight foreground
  service package) — **new dependency, flag in §23**. Degrade to
  foreground-only + "keep app open" nudge if background not granted.
- **Offers when backgrounded**: FCM high-priority data message (depends on
  customer-app **P1-3** push infra — reuse the `DeviceToken` model + `firebase-admin`).
- **State reconciliation**: on resume/reconnect, `GET /api/delivery/orders/active`
  → rebuild the current step.
- **Offline resilience**: queue "complete/fail" actions; retry idempotently by `orderId`.
- Reuse `mapcn_flutter`/`latlong2`/`TrackingMapPainter` for the map; `url_launcher`
  for nav; `image_picker` (new dep) for POD photo.

---

## 18. Real-Time Architecture

**Reuse the existing single Socket.IO server. No new broker.**

### Rooms
| Room | Members | Purpose |
|---|---|---|
| `order:<orderId>` *(exists)* | customer (their order), assigned partner, admins viewing | order status + rider location for that order |
| `partner:<userId>` *(new, JWT-gated)* | one delivery partner | offers, revocations, cancellations targeted at them |
| `admin_fleet` *(new, Admin/Manager only)* | ops dashboards | `fleet_update` stream (all partners' status/location) |

### Event flow
```
Order → Ready (PUT /orders/:id/status)
  └─ assignmentService.tryAssign
       ├─ create Assignment{offered, expiresAt=now+offerTimeoutSec}
       ├─ emit 'delivery_offer' → partner:<u>         (+ FCM if socket idle)
       └─ Notification doc

Partner Accept (POST /delivery/assignments/:id/accept)
  ├─ atomic Assignment offered→accepted
  ├─ Order.status=Assigned, deliveryPartnerUserId=u, timeline+=
  ├─ emit 'assignment_confirmed' → partner:<u>
  ├─ emit 'order_status_update'  → order:<id>          (customer + admin)
  ├─ emit 'fleet_update'         → admin_fleet
  └─ any other outstanding offer for this order → 'delivery_offer_revoked'

Partner Reject / Timeout
  ├─ Assignment offered→rejected|expired
  └─ tryAssign(next candidate)   (attempt++, exclude prior partners)

Partner location heartbeat (POST /delivery/location, every 10–15s)
  ├─ DeliveryPartner.currentLocation/locationUpdatedAt
  ├─ emit 'fleet_update'          → admin_fleet
  └─ if partner has an active order: emit 'rider_location_update' → order:<activeOrderId>

Order status steps (picked-up / out-for-delivery / delivered / failed)
  └─ emit 'order_status_update'   → order:<id>   (existing mechanism)

Order cancelled while assigned
  ├─ emit 'order_cancelled'       → partner:<u>
  ├─ Assignment → cancelled, free partner
  └─ emit 'fleet_update'          → admin_fleet
```

### Fallbacks (already the house pattern)
- Customer & partner apps: 15s REST polling (`/orders/:id`,
  `/delivery/orders/active`) while the socket is disconnected.
- Admin fleet: 15s poll `/api/admin/delivery/fleet`.
- Offer delivery guaranteed by: socket → FCM → (partner opens app) reconcile via
  `/delivery/orders/active` + a "pending offers" field.

### Persistence / expiry
- `Assignment.expiresAt` **TTL index** cleans very old `offered` rows.
- A `setInterval(15s)` **sweeper** does the *functional* expiry (re-offer) — TTL
  alone can't trigger business logic.

---

## 19. Automatic Assignment Logic

**Trigger:** `Order.status → Ready` (packed & at the dark store) and
`deliveryPartnerUserId == null`. *Not* on order create (single dark store,
10-minute model — pickup point is fixed, so we assign once the parcel physically
exists).

**Candidate query** (`DeliveryPartner`):
```
role via User = 'Delivery' AND User.status = 'Active'
isOnline = true
availability = 'available'  OR  (availability='busy' AND activeOrderIds.length < maxConcurrent)
locationUpdatedAt >= now - 3min           // stale location = not really online
currentLocation $near storeOrigin, $maxDistance = assignRadiusKm
(P2) storeOrigin within one of partner.zones
```

**Ranking** (ascending cost):
1. distance from store (haversine / `$near` order)
2. current active-order count (prefer idle)
3. time since last offer to this partner (fairness / round-robin-ish)
4. rating (tie-break, prefer higher)

**Offer loop:**
```
attempt = 1
while attempt <= maxOfferAttempts:
    candidate = rank(candidates - alreadyOffered)
    if none: mark order.assignmentStalled=true; notify admin_fleet; break
    Assignment{orderId, partnerUserId, attempt, distanceMeters, status:'offered',
               expiresAt: now + offerTimeoutSec}
    emit delivery_offer → partner room  (+ FCM)
    wait for accept / reject / expiry (event-driven; sweeper enforces expiry)
    on accept  -> confirm, stop
    on reject/expire -> attempt++, add partner to exclusion set, continue
```

**Duplicate / race prevention:**
- Accept is `Assignment.findOneAndUpdate({_id, status:'offered'}, {status:'accepted', respondedAt})` — first writer wins; losers get `delivery_offer_revoked`.
- Before confirming: `Order.findOneAndUpdate({orderId, deliveryPartnerUserId:null}, {...})` — guards against two accepts landing together.
- One in-flight `offered|accepted` Assignment per order (enforced in code around the atomic ops).
- Manual admin assign/reassign cancels any outstanding offer first.

**Config** (from `Settings`): `offerTimeoutSec` (25), `maxOfferAttempts` (5),
`assignRadiusKm` (6). Radius auto-expands (×1.5) after 2 failed full sweeps.

**No new tech:** MongoDB `2dsphere` `$near` + in-process ranking + `setInterval`
sweeper.

---

## 20. Security

- **RBAC**
  - `protectDelivery` = staff JWT + `role==='Delivery'` + `status==='Active'`.
  - Partner endpoints scope every query to `req.partner`/`req.user._id`; a partner
    can only read/act on an order **currently assigned to them** (`/delivery/orders/:id`
    checks `deliveryPartnerUserId`).
  - Admin endpoints: `authorize('Admin','Manager')`. Destructive (delete/reset-pw)
    = `Admin` only.
- **Customer PII shown to a partner**: first name only, delivery address,
  **masked phone** (`+91 98••• ••210`) by default; a **"Call" action** that either
  (a) opens `tel:` with the full number **only while status ∈ {Assigned, Out For
  Delivery}** and writes an `AuditLog` entry, or (b) routes through a call-masking
  provider (Exotel/Twilio) if you want zero number exposure — **decision in §23**.
  Never expose customer email, other orders, payment details, or exact saved-address
  labels beyond the one for this delivery.
- **Partner PII shown to a customer**: first name, vehicle, rating, **masked
  phone** + Call/WhatsApp actions (same reveal window). Never email, full name,
  home address, earnings, other orders.
- **Location data**: store only latest point + short rolling history (cap ~50
  points or 2h); broadcast a partner's location **only** to `admin_fleet` and to
  the `order:<id>` room of their **current** delivery. Stop broadcasting on
  Delivered/Failed. Validate lat∈[-90,90], lng∈[-180,180]; rate-limit heartbeat
  (≤1/3s).
- **Auth hardening**: `express-rate-limit` on `/delivery/auth/*` and
  `/delivery/location`; reset tokens single-use + short TTL; admin "reset password"
  is audited; deactivating a partner immediately invalidates their ability to
  accept (checked in `protectDelivery` + accept handler) and forces offline.
- **Assignment integrity**: all state transitions are atomic `findOneAndUpdate`;
  accept/reject verify the assignment belongs to the caller; completion is
  idempotent by `orderId`.
- **Socket**: verify JWT in the connection handshake before joining
  `partner:*` / `admin_fleet`; never accept a room name from the client for those.
- **Proof**: POD photo via existing Cloudinary upload (not stored as base64 in
  Mongo). Doorstep OTP is 4 digits, single order, short-lived — low value; storing
  it plain on the order is acceptable, or hash it (decision §23).
- **Do not** weaken the existing offline-stub middleware for delivery routes
  (bypass `/delivery/*` from the stub, like `/customers/me` — a fake "success"
  must never stand in for an assignment or a completion).
- Secrets: no new secrets except optional call-masking + FCM (already flagged for
  P1-3). `.env.example` updated.

---

## 21. Edge Cases

| Case | Handling |
|---|---|
| No online partner in radius | expand radius ×1.5 twice, then `assignmentStalled` + admin alert; order waits at `Ready` |
| Partner accepts then goes offline before pickup | pickup-timeout (e.g. 4 min) → auto-unassign + re-offer + strike; admin notified |
| Two partners accept near-simultaneously | atomic accept — first wins; second gets `delivery_offer_revoked` + toast |
| Partner rejects every offer | attempt cap → manual queue; low acceptance rate surfaced in performance |
| Order cancelled after assignment | `order_cancelled` → partner room; assignment `cancelled`; partner freed; if already picked up → admin decides (return-to-store flow, P2) |
| Customer not reachable at door | Failed Delivery → reason `customer_unreachable`; order → `Failed` sub-state; admin can reattempt/refund |
| Wrong doorstep OTP | 3 tries → block submit → force Failed with reason, or admin override |
| App killed during "Complete" | action queued locally; idempotent server completion by `orderId` (second call returns the same result) |
| Location permission denied / background denied | can't go **Online**; clear in-app explainer; foreground-only mode with "keep app open" |
| Socket down for partner | FCM offer + on-reopen `/delivery/orders/active` reconcile; 15s polling |
| Clock skew on offer countdown | server-authoritative `expiresAt`; client shows `max(0, expiresAt-now)` |
| Partner deactivated mid-delivery | keep the order assigned (don't strand it) but block new offers; admin reassigns; partner app shows "your account is inactive — finish current delivery" |
| `deliveryLocation` missing (old address string only) | geocode via Nominatim at assign time; if that fails, assign by store proximity only + warn |
| Duplicate heartbeats / GPS jitter | debounce; ignore points < 15m from last unless > 20s elapsed |
| Multi-order batch (P2) | `maxConcurrent`; offer only if `activeOrderIds.length < maxConcurrent`; sequence stops by nearest-drop |
| Admin manual assign to a busy/offline partner | allowed with confirm ("partner is offline — force assign?"); audited; still emits an offer they must accept unless "force" |
| Reassign after pickup | block unless admin `force` + reason (parcel is physically with partner A) |
| Payment COD | `complete` sets `paymentStatus='Paid'`; earning includes nothing special; admin sees cash-collected flag |
| Timezone / "today" for earnings & stats | compute in a fixed IST offset (India-first per `PRODUCT.md`) |

---

## 22. Testing Plan

### Backend (`node:test` + `supertest` + `socket.io-client`, extends the P0-8 harness)
- **Unit**: haversine, candidate ranking, offer state machine (all transitions +
  illegal transitions), ETA estimator, earning calc.
- **Integration**:
  - partner login (role check), forgot/reset, deactivated partner → 403
  - online/offline toggle; location heartbeat validation + rate-limit
  - `tryAssign`: candidate filtering (offline/stale/out-of-radius excluded),
    ranking order, offer created + `expiresAt`
  - accept (happy) → order `Assigned`, FK set, timeline, socket events
  - reject / expiry → re-offer to next; exclusion set respected; attempt cap →
    `assignmentStalled`
  - race: two accepts → exactly one wins, other 409/revoked
  - full lifecycle: Ready → offer → accept → pickup-arrived → picked-up → arrived
    → complete(OTP+photo) → Delivered, `deliveredAt`, earning row, partner counters
  - failed delivery path + reason persisted
  - admin assign/reassign/unassign + audit rows
  - **RBAC matrix**: customer token, other-partner token, no token → 401/403 on
    every `/delivery/*` and `/admin/delivery/*`
  - **PII**: `/delivery/orders/:id` response has no email / other orders / payment
    secrets; phone is masked unless within reveal window
- **Socket**: `delivery_offer` reaches only `partner:<u>`; `fleet_update` reaches
  `admin_fleet` and not customers; `rider_location_update` reaches only the active
  `order:<id>` room; revoke on second accept.

### Web
- Admin: component tests for the partner table + assign/reassign/unassign;
  manual pass of the fleet map (marker updates on `fleet_update`).
- Customer: tracking view renders steps from `trackingTimeline`; rider marker
  appears only in the reveal window; Call/WhatsApp links correct; polling fallback.

### Mobile (delivery app)
- Unit: auth controller, offer state machine, location throttle, models
  (tolerant `fromJson`), earnings calc.
- Widget: offer countdown + accept/reject; pickup/deliver step gating; OTP entry;
  failed-reason picker.
- Integration (staging): login → online → receive offer (seeded) → accept →
  full flow → history reflects it. `flutter analyze` clean, `flutter build apk`.

### Non-functional
- Load: 200 online partners heartbeating every 10s; assignment latency P95 < 2s.
- Battery: heartbeat interval tuning; background-service impact note.
- Security review sign-off on PII masking + RBAC before launch.

---

## 23. P0 / P1 / P2 Implementation Roadmap

> Each item: **what · APIs · models · web · mobile · tests**. Backend is built
> first and is the source of truth; UI follows.

### PHASE P0 — Core assignment loop, backend-truthful (no automation yet)

**P0-D1 · Delivery domain + partner auth** — ✅ DONE 2026-09-01 (backend; see MEMORY.md §5)
- Models: `DeliveryPartner` (§11.1), `DeviceToken`. Seed a `DeliveryPartner` for
  `delivery@freshcart.com`.
- Backend: `protectDelivery`; `GET /api/delivery/me`; `PUT /api/delivery/status`;
  `POST /api/delivery/location` (+ rate-limit + validation); forgot/reset password.
- Socket: JWT-verified connection → join `partner:<userId>` / `admin_fleet`.
- Tests: partner login/role, deactivated→403, status toggle, heartbeat validation,
  room join.

**P0-D2 · Assignment model + manual offer/accept/reject** — ✅ DONE 2026-09-01 (backend; see MEMORY.md §5)
- Models: `Assignment` (§11.2). `Order` additive fields (§11.3): FK,
  `deliveryLocation`, `pickup`, `pickedUpAt`, `deliveredAt`, `failureReason`,
  `deliveryOtp`, `podPhotoUrl`, `assignmentId`.
- Backend: `assignmentService` core (offer/accept/reject/expire/re-offer +
  sweeper); `POST /api/delivery/assignments/:id/{accept,reject}`;
  `POST /api/admin/orders/:id/{assign,reassign,unassign}` (real `partnerUserId`);
  `updateStatus` emits `order_cancelled` + revokes on cancel.
- `createOrder`: persist `deliveryLocation` + `pickup`.
- Tests: state machine, atomic accept race, re-offer, admin assign/reassign/unassign, audit.

**P0-D3 · Partner delivery lifecycle + proof** — ✅ DONE 2026-09-01 (backend; see MEMORY.md §5)
- Backend: `pickup-arrived / picked-up / arrived / complete / fail` endpoints
  (idempotent by `orderId`); OTP verify (if enabled) + Cloudinary POD upload;
  partner counters; `Notification` writes.
- Tests: full Ready→Delivered lifecycle, failed path, idempotent completion, PII masking.

**P0-D4 · Delivery-partner mobile app (MVP)** — ✅ DONE 2026-09-01
- New `deliveryapp/` package created (`--org com.freshcart --project-name
  freshcart_delivery`). Screens built: Splash, Login, Forgot (2-step), Dashboard
  (+Online toggle + 12s location heartbeat), Offer overlay (countdown ring /
  accept / reject, socket `delivery_offer`), Order Details (Call/WhatsApp respect
  phone mask, maps navigation, items, timeline, bottom action bar), Lifecycle
  actions (arrived-at-store → picked-up → arrived → complete[OTP + optional
  camera POD photo] / fail[reason]), History, Profile/Settings. Riverpod +
  go_router redirect guard + Dio Bearer/401 interceptor + `flutter_secure_storage`
  + `socket_io_client` `partner:<id>` room + `geolocator` foreground heartbeat +
  `/delivery/orders/active` reconcile. Android perms INTERNET/FINE+COARSE
  LOCATION/CAMERA + tel/https/geo `<queries>`. No backend changes.
- Verified: `flutter analyze` clean, `flutter test` 5 green (models fromJson,
  offer countdown), `flutter build apk --debug` OK. No emulator run.
- Deferred to P1/P2: dedicated Failed-Delivery screen polish, background
  location, FCM push for offers, ratings, earnings detail.

**P0-D5 · Admin web — real partner management + manual assign** — ✅ DONE 2026-09-01
- `DeliveryModule` (`Modules.tsx`) rebuilt: consumes `GET /api/admin/delivery/
  partners`, 15s auto-refresh, online/available/on-delivery/suspended badges,
  active-orders `n/max`, completed/failed, rating, last-seen; Add partner (`POST
  /employees` role Delivery), per-row Reset-password + Activate/Deactivate.
  Responsive: `hidden md:block` table + `md:hidden` card list.
- `Orders.tsx`: fake hardcoded-name assign replaced with real `POST /api/admin/
  orders/:id/{assign,reassign,unassign}` + partner `<select>` (online-first),
  Force-assign checkbox, offered/forced result message, `assignmentStalled`
  badge, drawer Reassign/Unassign actions.
- Backend added: `POST /api/admin/delivery/partners/:userId/reset-password`
  (through `user.save()` hash, min 6, Admin, audit) and `.../account {active}`
  (suspend/activate, forces offline, 409 if active orders, audit).
- Verified: backend `npm test` 27 green (+2), `tsc --noEmit` clean, `vite build` OK.

**P0 exit:** an admin can create a real partner; the partner logs into the new
app, goes online, is offered an order manually assigned by admin, accepts, picks
up, delivers with OTP/photo, and it all shows truthfully in admin + the customer's
existing timeline. No fake data anywhere.

---

### PHASE P1 — Automation + customer live tracking + admin live map

**P1-D1 · Automatic assignment on `Ready`** — ✅ DONE 2026-09-01
- `assignmentService.findCandidates` (2dsphere `$near` on
  `DeliveryPartner.currentLocation` when the pickup has coords, else plain scan;
  filters online + under `maxConcurrent` + `User` role Delivery/status Active;
  ranks distance → activeOrders → rating) and `tryAssign(orderOrId)` (idempotent;
  prior-attempt tracking + partner exclusion; radius auto-expand ×1/×2/×3 of
  `Settings.assignRadiusKm`; single best-candidate offer `source:'auto'`;
  `attempt > Settings.maxOfferAttempts` → `markStalled` + admin alert).
- `onOfferDeclined({source})` re-invokes `tryAssign` for `source:'auto'` (rolls
  to next candidate); `rejectOffer` + `expireStaleOffers` pass `a.source`; the
  existing 15s sweeper drives timeout re-offers.
- Trigger: `apiController.updateStatus` fires `tryAssign` non-blocking on
  `status==='Ready' && !deliveryPartnerUserId`, gated by new
  `Settings.autoAssignEnabled` (default true).
- Verified: backend `npm test` 29 green (+2: nearest-offer + `offer_pending`
  no-op; decline→re-offer(attempt 2)→exhaust→`assignmentStalled`).

**P1-D2 · Admin live fleet map + partner detail** — ✅ DONE 2026-09-01
- Backend: `GET /api/admin/delivery/partners/:userId/deliveries?status=&limit=`
  (partner's orders, safe projection) and `.../performance` (Assignment tallies →
  offered/accepted/rejected/expired + acceptanceRate; Order-derived
  deliveredCount/failedCount + avgPickupMins/avgDeliveryMins; lifetime
  counters + rating). 404 for unknown/non-Delivery userId.
- Frontend: `DeliveryFleetMap.tsx` — imperative Leaflet (no react-leaflet),
  OSM tiles, `L.divIcon` colour pins (green available / amber busy / grey
  offline), **polls `GET /api/admin/delivery/fleet` every 10s** (no
  socket.io-client added to the admin bundle), marker reconcile + first-fit
  bounds; rendered at the top of `DeliveryModule`. `PartnerDetail.tsx` at
  `/admin/delivery/:userId` — stat grid + delivery-history table; partner names
  in `DeliveryModule` link to it. Responsive throughout.
- Verified: backend `npm test` 30 green (+1 perf/deliveries/404); frontend
  `tsc -b && vite build` clean (leaflet CSS bundled).

**P1-D3 · Customer live rider tracking (web + polish mobile)** — ✅ DONE 2026-09-01
- Backend `orderController.getOrder`: ownership check refactored (owner flag);
  adds a `delivery` block for non-terminal assigned orders — `partnerName`
  (first name), `phoneMasked` always, real `phone` + `canContact` + `location`
  + `locationUpdatedAt` only in the reveal window (status ∈ {Out For Delivery,
  Arrived}); `deliveryOtp` stripped for everyone except the authenticated owner
  in that window; `customerPhone` masked for non-owners. New `maskPhone` helper.
- Web: `frontend/src/pages/TrackOrder.tsx` at `/track/:orderId` (lazy — leaflet
  split into its own chunk), imperative Leaflet rider + destination markers,
  progress stepper, haversine ETA, Call/WhatsApp (only when `canContact`),
  **polls `GET /api/orders/:id` every 10s**. "Track live" button on in-transit
  cards in `CustomerOrders.tsx`.
- Mobile: `TrackingState` +`riderPhoneMasked`/`canContact`; `_refreshFromApi`
  consumes the new `delivery` block (name / masked+real phone / initial rider
  location); `tracking_screen` gates Call on `canContact`, adds WhatsApp, shows
  the masked number + "contact opens when out for delivery" otherwise, dev copy
  tidied. Schematic map painter kept (real tile-map swap deferred — `mapcn`
  package risk, out of scope for polish).
- Verified: backend `npm test` 31 green (+1 reveal-window gating); frontend
  `vite build` clean; mobile `flutter analyze` clean + `flutter test` 103 green.

**P1-D4 · Push for offers (FCM)** — ✅ DONE 2026-09-01 (Firebase project `grocery-76b84`)
- `backend/src/services/pushService.js`: lazy `firebase-admin` init from
  `FIREBASE_SERVICE_ACCOUNT` (raw JSON or base64) or
  `GOOGLE_APPLICATION_CREDENTIALS`; `isPushConfigured()`, `registerDeviceToken`
  (upsert by token), `removeDeviceToken`, `sendToOwner(ownerId, {title,body,data})`
  (`sendEachForMulticast`, high priority, prunes `token-not-registered`).
  **Not configured → every send is a silent no-op**, so dispatch is unaffected.
- Endpoints: `POST/DELETE /api/delivery/devices[/:token]` (protectDelivery),
  `POST/DELETE /api/customers/me/devices[/:token]` (protectCustomer).
- `assignmentService.createOffer` fires `sendToOwner(partner, {type:'delivery_offer',
  assignmentId, orderId})` alongside the socket emit (non-blocking).
- `.env.example` documents `FIREBASE_SERVICE_ACCOUNT`.
- Service account lives in `backend/.env` (`FIREBASE_SERVICE_ACCOUNT`, base64,
  git-ignored) — set it per environment; without it push silently no-ops.
- **Clients** (`deliveryapp/` + `mobileapp/`): `firebase_core` +
  `firebase_messaging` deps; `android/app/google-services.json` +
  `ios/Runner/GoogleService-Info.plist` (committed — client config, not secret);
  `com.google.gms.google-services` gradle plugin wired in
  `android/settings.gradle.kts` + `android/app/build.gradle.kts`;
  hand-written `lib/firebase_options.dart`. `PushService` (per app): `init()`
  requests permission, reads the token, listens `onTokenRefresh` /
  `onMessageOpenedApp` / `getInitialMessage`; token registered after
  login + on hydrate, unregistered on logout. deliveryapp tap on a
  `delivery_offer` → dashboard (socket drives the live offer sheet); mobileapp
  tap → order. `main()` inits Firebase + registers a background handler; all
  guarded so a missing/broken Firebase build still runs.
- Tests: backend `npm test` 41 green (token register idempotent + unregister;
  `sendToOwner` with no devices → `sent:0`). deliveryapp `flutter analyze`/
  `test` (6) / debug APK; mobileapp `flutter analyze`/`test` (117) / debug APK.

**P1-D5 · Notifications + audit activation** — ✅ DONE 2026-09-01
- Partner inbox: `GET /api/delivery/notifications?unreadOnly=1&limit=` (returns
  `{unread, notifications}`) + `POST /api/delivery/notifications/read {ids?}`
  (omit `ids` = mark all). `GET /api/delivery/me` now also returns
  `unreadNotifications`. `assignmentService.createOffer` writes a `type:'Offer'`
  Notification; `cancelForOrder` writes a `type:'Order'` "Delivery cancelled"
  Notification to each affected partner.
- Audit: `logAudit()` already fires for every admin delivery override —
  Order Offered / Force-Assigned / Reassign / Unassigned, Partner Password
  Reset, Partner Activated / Deactivated (wired in P0-D5, verified here). Visible
  via the existing `/admin/audit-logs`.
- deliveryapp: `AppNotification` model, `api.notifications()` /
  `markNotificationsRead()`, `NotificationsScreen` at `/notifications`, a bell
  icon + unread `Badge` on the dashboard AppBar.
- Verified: backend `npm test` 36 green (+1 inbox); deliveryapp `flutter
  analyze` clean, `flutter test` 6, debug APK builds.

**P1-D5 (original scope note)**
- Activate `Notification` (offer / assigned / cancelled / delivered / payout) with
  `/delivery/notifications` + read; activate `logAudit()` for all assign
  overrides / deactivations / password resets.

**P1 exit:** orders auto-assign with retry/backoff and no duplicates; admin watches
the fleet live; customers track the rider on a map on both web and mobile.

---

### PHASE P2 — Earnings, zones, batching, analytics, background location

- **P2-D1 Earnings**: `DeliveryEarning` model + calc (base + per-km from
  `Settings`, tips, COD flag); partner Earnings screen; admin earnings view +
  `settled` toggle / payout export.
- **P2-D2 Zones**: `DeliveryZone` (polygon) CRUD in admin; zone-aware candidate
  filter; per-zone SLA.
- **P2-D3 Batching**: `maxConcurrent` > 1; multi-drop offer; nearest-drop
  sequencing; partner "stack" UI.
- **P2-D4 Performance analytics** — ✅ DONE 2026-09-01 (tracked as P2-D3 in MEMORY).
  `DeliveryPartner.distanceTravelledM` odometer from heartbeat legs (haversine,
  jitter/teleport filtered). `GET /api/admin/delivery/analytics?days=` →
  fleet rollup (partners/online/busy/delivered/acceptance/avgDelivery/avgRating)
  + per-partner leaderboard. Admin `DeliveryModule` "Fleet performance" card
  (stat strip + top-8 leaderboard); `PartnerDetail` gains Distance + rating
  count. Tests: backend 47. **Still open**: SLA/idle alerts, active-hours from
  an availability log.
- **P2-D5 Background location**: Android foreground service / iOS background modes
  (new dep — see below); geofence auto-"arrived"; heartbeat tuning for battery.
- **P2-D6 Ratings** — ✅ DONE 2026-09-01. `Order.deliveryRating {stars,comment,at}`;
  `POST /api/orders/:id/rate-partner` (`attachCustomerOptional`, owner-only,
  Delivered-only, re-submit edits); recomputes `DeliveryPartner.rating`/`ratingCount`
  from an aggregate; `stars<=2` → admin `Notification`. Web `TrackOrder` rating
  card; admin `DeliveryModule` `★ x.x (n)` + red **Low** badge
  (`ratingCount>=3 && rating<4`); mobile customer order-detail `_RatePartnerCard`
  (`ApiService.ratePartner`, `OrderModel.deliveryRatingStars`); deliveryapp
  dashboard shows rating count. Tests: backend 46, mobile 119, deliveryapp 6.
- **P2-D7 Return-to-store / re-attempt flow** for failed/cancelled-after-pickup.

---

## Dependencies to acquire / add

| Item | Where | Needed for | Notes |
|---|---|---|---|
| `image_picker` (Flutter) | deliveryapp | POD photo | standard |
| background-location pkg (Flutter) | deliveryapp | P2-D5 | `flutter_background_geolocation` (paid for some platforms) or a foreground-service pkg — pick in P2 |
| `firebase-admin` wiring + Firebase project + service account | backend | P1-D4 (shared with customer P1-3) | you must supply the project/JSON |
| Call-masking provider (Exotel/Twilio) | backend | §20 (optional) | only if you want zero phone exposure; otherwise time-boxed `tel:` reveal, no new dep |
| Leaflet marker/rotation plugin (web) | frontend | admin fleet + customer map | small, CDN-friendly |
| `express-rate-limit` | backend | already a dependency — just use it | |
| `2dsphere` index migration | Mongo | P1-D1 | one-time `createIndex` |

---

## Decisions needed from you before P0 starts

1. **Delivery mobile app**: new `deliveryapp/` package (recommended) **or** a
   flavor of `mobileapp/`?
2. **Earnings**: in P0 scope, or defer to P2 (recommended — keeps P0 focused on
   the delivery loop)?
3. **Doorstep proof**: OTP **and** photo, OTP **or** photo, or photo-only? Mandatory
   or skippable-with-reason?
4. **Phone privacy**: time-boxed `tel:`/`wa.me` reveal + audit (no new infra) **or**
   a call-masking provider (zero exposure, new dependency + cost)?
5. **Auto-assign trigger**: on `Ready` (recommended) or a different status?
6. **Manual admin assign**: force-assign directly (skip offer) or always send an
   offer the partner must accept?

Nothing is built until these are answered and the plan is approved.
