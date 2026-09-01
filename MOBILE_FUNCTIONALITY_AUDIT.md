# FreshCart — Mobile Functionality Audit

> **Web** (`frontend/`, React SPA storefront) **vs Mobile** (`mobileapp/`, Flutter customer app).
> Date: **2026-09-01** (full refresh — supersedes the earlier 2026-09-01 snapshot; reflects
> FW-3/FW-4/FW-5/FW-6/FW-11/FW-13/FW-16 + the P1-D3 web tracker).
> Scope: **customer-facing storefront only.** Admin (`/admin/*`) is web-only by design — out of scope.
> The delivery-partner app (`deliveryapp/`) is a separate product — out of scope.

Legend: **✓** Complete · **⚠** Partial · **✗** Missing · **🐛** Broken / fake data

**This is an audit only. Nothing here is being fixed in this pass.**

---

## 0. Executive summary

| Capability | Web | Mobile | Verdict | Note |
|---|---|---|---|---|
| Browse → cart → checkout → pay → track | ✓ | ✓ | **✓ parity** | Native, real API, all 4 states, ~117 mobile tests. |
| Customer auth | 🐛 fake OTP `1234` + phone-keyed `/customers/auth`, **no JWT** | ✓ real OTP → JWT (`protectCustomer`) | **mobile ahead** | Web's missing real auth (**WEB-1**) is what blocks web wallet/membership. |
| Home | ✓ | ✓ | ✓ | Mobile adds a festival hero (FW-11) + live-order banner (FW-6). |
| Product listing / filters | ✓ organic + sort + In-stock/On-offer pills; client-side pagination | ⚠ organic + sort + In-stock/On-offer; **no pagination / infinite scroll**, no brand picker | **⚠** | Backend `GET /products` now supports `brand`/`inStock`/`onSale`/`page`/`limit` (FW-5). Mobile provider is still one-shot. |
| Product detail + reviews | ✓ | ✓ | ✓ | PDP ratings & reviews section + write sheet on both. |
| Search | ✓ text + suggestions | ⚠ text + recents; **no trending/suggestions**, mic removed (FW-16) | **⚠** | |
| Cart + coupons | ✓ | ✓ | ✓ | Coupon validate server-side both. **2026-09-01 UX pass (both):** free-delivery progress bar, "you save ₹X" (MRP savings), per-row MRP strikethrough + %-off, "Save for later" → wishlist. |
| Wishlist | ✓ drawer (2026-09-01: grid-ish rows w/ MRP/%-off, in-stock badge, disabled Add when OOS, "Move all to cart", value/savings footer) | ✓ full 2-col grid screen (add / remove / add-all, states) | ✓ | |
| Checkout (Razorpay / Wallet / COD) | ✓ | ✓ | ✓ | Real gateway + HMAC verify + webhook. COD now created `Pending` (BE-3). |
| Orders list | ✓ tabs (All/In Transit/Delivered/Cancelled) | ✓ same tabs (FW-6) | **✓ parity** | |
| Order detail + timeline | ✓ | ✓ | ✓ | |
| Order cancel (pre-dispatch, wallet refund) | ✓ | ✓ | ✓ | `POST /orders/:id/cancel`. |
| Live order tracking (map, rider, ETA, route, call/WA) | ✓ `/track/:orderId` — Leaflet, **rider→drop OSRM road route** + straight-line fallback, gliding rider marker, follow-cam, store+drop markers, 10s poll | ✓ `tracking_screen` — **real map now** (`mapcn_flutter`/`flutter_map`, OSM tiles), rider+drop markers, **OSRM route polyline** + fallback, recenter-on-move, socket + 15s poll | **✓ parity (2026-09-01)** | Backend `delivery` block (masked → revealed) + `deliveryLocation`/`pickup` consumed by both. |
| Invoice / credit note | 🐛 `alert()` stub | 🐛 `alert()` stub | **🐛 both** | `Invoice` model exists, no endpoint. |
| Wallet | 🐛 hardcoded `₹0` in profile drawer | ✓ balance + history + **top-up** (FW-4) | **mobile ahead** | Web blocked on WEB-1. |
| Address book | ✓ add / **edit** / delete / map / geocode | ⚠ add / delete only — **no edit, no set-default** | **⚠** | Backend has no edit/set-default route (parity gap on both). |
| Profile edit (name/phone) | ✓ | ✓ | ✓ | No avatar upload on either. |
| Membership (join / upgrade VIP) | ✗ benefits page only | ✗ benefits page only | **✗ both** | No backend endpoint (FW-7). |
| Notifications — in-app feed | ✗ nothing | ⚠ derived from order timelines (no dedicated endpoint) | **mobile ahead / ⚠** | |
| Notifications — push (FCM) | ✗ | ✓ device token + order-status + delivery-offer pushes (FW-3) | **mobile ahead** | iOS APNs key still owed. |
| Content pages (About / Blog / Brands / Offers / Careers / Stores) | ✓ all | ✗ none (Legal only) | **✗ mobile** | See §1. |
| Legal (Terms / Privacy) | ✓ | ✓ bundled `LegalScreen` | ✓ | |
| Help / Support | ✓ FAQ + `tel:` + chat | ⚠ socket chat only — no FAQ, no `tel:`, no ticket history | **⚠** | |
| Stores | ⚠ hardcoded list + fake map | ⚠ hardcoded list + Call + Directions | **⚠ both** | No `/api/stores`. |
| Offline / maintenance / force-update | ✗ | ✓ banner + `/app/config` gate (FW-1) | **mobile ahead** | Retry-with-backoff still open. |
| Deep links / app links | ✗ | ✗ | **✗ both** | No `assetlinks`/AASA, no `intent-filter` host. |
| Permissions UX | n/a (browser) | ✓ location: post-login flow — real OS check on login/hydrate, rationale sheet, **open-settings** for deniedForever, GPS-off dialog, in-screen banner (`LocationPermissionService`, 2026-09-01). FCM prompt on init (⚠ no pre-rationale). | **✓ location / ⚠ push** | |
| **INTERNET permission (Android)** | n/a | **🐛→✓ fixed 2026-09-01** — was only in the *debug* manifest, so release builds had no network (API + product images failed). Now in `main/AndroidManifest.xml`. | ✓ | |
| Analytics / crash reporting | ✗ | ✗ | **✗ both** | FW-12. |
| Deep back-navigation / state restore | n/a | ⚠ `go_router` + hardware back; filter state survives but **no scroll restore, no tab-state persistence** | **⚠** | |
| Bookings / Enquiries / Quotes / RFQ | n/a | n/a | **n/a** | Not part of this grocery quick-commerce product on either side. |

---

## 1. Pages & routes

**Mobile routes:** `/splash /maintenance /force_update /onboarding /login /otp /location_select`
· tabs `/ /categories /search /orders /account`
· pushed `/category/:id /product/:id /cart /checkout /order-placed/:id /order/:id /tracking/:orderId
/wishlist /wallet /membership /support /addresses /stores /notifications /account/edit /search_detail /legal`.

| Web route | Mobile equivalent | Status | Notes |
|---|---|---|---|
| `/` Home | `HomeScreen` | ✓ | Banners / categories / special-groups / curated + per-category rails. Mobile-only: festival hero (FW-11), live-order banner (FW-6). |
| `/categories` | `CategoriesScreen` (tab) | ✓ | Sections + subcategory tiles + trending cloud. |
| `/products` (all products) | — | ✗ | Mobile has no "browse everything" list; only per-category. |
| `/category/:slug` | `CategoryCatalogScreen` (`/category/:id`) | ⚠ | No pagination / infinite scroll; no brand filter UI (§6). |
| `/product/:id`, `/prn/:slug/prid/:id` | `ProductDetailsScreen` | ⚠ | Full PDP + reviews + `share_plus`. No SEO-slug route (n/a on mobile). |
| `/brands` | — | ✗ | `GET /api/brands` unused on mobile. |
| `/offers` | — (coupons only inside cart) | ✗ | No offers / coupon-browse / referral page. |
| `/blog`, `/blog/:id` | — | ✗ | `GET /api/blogs` unused. |
| `/about` | — | ✗ | Not built (web content is mostly hardcoded anyway). |
| `/careers` | — | ✗ | Web form itself is a 🐛 `alert()` stub (resume upload not wired). |
| `/legal` + `/s/terms-of-service` + `/s/privacy-policy` | `LegalScreen` (`/legal?tab=`) | ✓ | Login Terms/Privacy are tappable spans → bundled screen. |
| `/help` `/support` | `SupportScreen` | ⚠ | Socket chat only. No FAQ content, no `tel:` shortcut, no ticket history (`SupportTicket` model exists). |
| `/stores` `/locations` | `StoresScreen` | ⚠ | Hardcoded list on both. Mobile adds Call + Directions. |
| `/orders` `/account/orders` | `OrdersListScreen` (tab) | ✓ | Status tabs on both now (FW-6). |
| `/track/:orderId` | `TrackingScreen` (`/tracking/:orderId`) | ✓ | Both real maps with a live rider→drop route (OSRM). Status stepper, ETA, call/WhatsApp, reveal-window gating. |
| `/profile` `/account/profile` | `ProfileScreen` (tab) + `/account/edit` | ✓ | |
| — | `/wishlist` | ✓ | Web wishlist is a header drawer; mobile has a full screen. Parity+. |
| — | `/wallet` | ✓ (mobile ahead) | Real balance + history + top-up. Web drawer shows fake `₹0`. |
| — | `/notifications` | ⚠ (mobile ahead) | Order-timeline activity feed. Web has none. |
| — | `/onboarding`, `/maintenance`, `/force_update` | ✓ (mobile-only) | No web equivalent needed. |

---

## 2. Navigation & back navigation

| Item | Web | Mobile | Status |
|---|---|---|---|
| Primary nav | Header + hamburger drawer (Home, Catalog, Offers, Blog, About, Help, Locations, Stores, Careers, Admin) | 5-tab bottom bar (Home, Categories, Search, Orders, Account) | ⚠ mobile bottom-bar omits all content pages; they're simply absent. |
| Back navigation | Browser back | `go_router` + Android hardware back; `_smartBack` fallbacks | ✓ |
| Deep-return after login | ✓ | ⚠ `redirect` guard sends to `/` or `/login`; **no "return to intended route"** after auth. |
| Scroll position restore | browser-native | ✗ no `PageStorageKey` / restoration on lists | ⚠ |
| Tab state persistence | n/a | ⚠ tab branches keep state via `StatefulShellRoute`, but catalog filter/scroll reset on deep pop | ⚠ |
| Promo-card / banner → route mapping | ✓ `resolveAppRoute` | ⚠ mobile maps banner taps; **promo-cards not consumed at all** on mobile | ⚠ |

---

## 3. Authentication

| Item | Web | Mobile | Status |
|---|---|---|---|
| Method | Phone → **fake OTP (`1234`)** → `POST /customers/auth` by phone, **no token stored** | Phone → real `POST /customers/otp/send` + `/verify` → 30-day JWT in `flutter_secure_storage` | **mobile ✓ / web 🐛** |
| Session hydrate | re-reads `customer_user` from `localStorage` | `GET /customers/me` on boot, 401 → auto-logout | mobile ✓ |
| Logout | clears `localStorage` | clears token + caches + FCM unregister | ✓ |
| Terms / Privacy links at sign-in | ✓ | ✓ (tappable → `/legal`) | ✓ |
| Delete account | ✓ `DELETE /customers/me?phone=` | ✓ `AuthNotifier.deleteAccount()` → `/login` | ✓ |
| Guest browsing | ✓ | ✓ | ✓ |
| **Consequence** | Web cannot use any `protectCustomer` route → wallet, membership, real order ownership all fall back to `{phone}`-in-body or stubs. | — | **WEB-1 is the single biggest web gap.** |

---

## 4. Forms

| Form | Web | Mobile | Status |
|---|---|---|---|
| OTP entry | ✓ | ✓ (`OtpField`, resend, dev-code in test mode) | ✓ |
| Address add | ✓ (map + geocode + label + house/landmark) | ✓ (`POST /customers/me/addresses`) | ✓ |
| Address **edit** | ✓ `PUT /customers/:phone/addresses` | ✗ no edit UI or route | ✗ |
| Address set-default | ⚠ client-only flag | ✗ | ✗ both weak (no backend route) |
| Profile edit (name / phone) | ✓ | ✓ `PUT /customers/me/profile` | ✓ |
| Wallet top-up amount | ✗ | ✓ `_AmountSheet` (chips + custom, validated) | mobile ahead |
| Checkout address / slot / payment | ✓ | ✓ | ✓ |
| Coupon apply | ✓ | ✓ (server validate) | ✓ |
| Review write | ✓ | ✓ (rating + comment, verified-purchase gated) | ✓ |
| Careers application | 🐛 `alert()` stub | — | n/a (web stub) |
| Support message | ✓ | ✓ (socket) | ✓ |
| Field validation / inline errors | ✓ | ✓ (`AppTextField` on newer forms; `location_select` still raw `TextField`) | ⚠ mobile inconsistent |

---

## 5. API integration & CRUD

Mobile endpoints in use: `/customers/otp/{send,verify}`, `/customers/me` (GET/PUT),
`/customers/me/addresses` (POST/DELETE), `/customers/me/devices` (POST/DELETE),
`/customers/me/wallet/{debit,topup,topup/verify,transactions}`, `/customers/me` (DELETE),
`/banners`, `/festival-campaigns/active`, `/categories`, `/special-groups`, `/products` (+query),
`/products/:id`, `/products/:id/reviews` (GET/POST), `/settings`, `/coupons`, `/coupons/validate`,
`/orders` (POST), `/orders/mine`, `/orders/:id` (GET), `/orders/:id/cancel`, `/orders/:id/rider-location`,
`/payment/{create-order,verify}`, `/app/config`.

| Resource | Web | Mobile | Status |
|---|---|---|---|
| Products (read) | ✓ (CMS bulk-load, client filter/paginate) | ✓ (per-query fetch) | ✓ — different strategy; mobile ignores new `page`/`limit` (⚠, §6). |
| Categories / banners / special-groups | ✓ | ✓ | ✓ |
| **Promo cards** | ✓ `/promo-cards` | ✗ never fetched | ✗ |
| **Blogs** | ✓ `/blogs` | ✗ | ✗ |
| **Brands** | ✓ (derived from products) | ✗ | ✗ |
| **Coupons browse** | ✓ `/coupons` on `/offers` | ⚠ only used for validate inside cart | ⚠ |
| Orders (create / list / detail / cancel) | ✓ (phone-keyed) | ✓ (token) | ✓ |
| Reviews (CRUD) | ✓ | ✓ | ✓ |
| Wallet (debit / topup / ledger) | 🐛 stub | ✓ | mobile ahead |
| Addresses (CRUD) | C**R**UD + partial U | C**R**–D (no U) | ⚠ |
| Festival campaign | ✓ (full theme engine) | ⚠ hero only (FW-11) | ⚠ |

---

## 6. Search · Filters · Sorting

| Item | Web | Mobile | Status |
|---|---|---|---|
| Text search | ✓ | ✓ (`/search` tab + `/search_detail`) | ✓ |
| Recent searches | ✓ | ✓ (persisted) | ✓ |
| Trending / suggestions | ✓ | ✗ (empty state is bare) | ✗ |
| Voice search | decorative | removed (FW-16) — hook kept | n/a |
| Sort (price ↑/↓, rating, discount) | ✓ | ✓ (popular / price-low / price-high / rating — **no discount sort**) | ⚠ |
| Filter: organic | ✓ | ✓ | ✓ |
| Filter: in-stock / on-offer | ✓ pills | ✓ toggles (FW-5) | ✓ |
| Filter: price range | ✓ | ✗ (backend supports `minPrice`/`maxPrice`) | ✗ |
| Filter: brand | ✗ (no UI) | ✗ (backend supports `brand`) | ✗ both |
| Pagination / infinite scroll | ✓ client-side (`itemsPerPage`) | ✗ one-shot `FutureProvider`, no `page`/`limit` | ✗ |
| Filter state survives back-nav | ✓ | ✓ (`CatalogQuery` equality) | ✓ |

---

## 7. Images / media / Uploads

| Item | Web | Mobile | Status |
|---|---|---|---|
| Product / category / banner images | ✓ | ✓ (`cached_network_image`, error fallbacks) | ✓ |
| Festival background image | ✓ | ✓ (FW-11, dark scrim) | ✓ |
| Avatar upload | ✗ | ✗ | ✗ both |
| Review photo upload | ✗ | ✗ | ✗ both |
| Resume upload (Careers) | 🐛 stub | — | n/a |
| POD photo (delivery) | delivery app only | delivery app only | n/a here |
| `/api/upload` (Cloudinary) | admin only | unused | n/a |

---

## 8. Profile

| Item | Web | Mobile | Status |
|---|---|---|---|
| View name / phone / email | ✓ | ✓ | ✓ |
| Edit name / phone | ✓ | ✓ | ✓ |
| Wallet entry | 🐛 fake `₹0` | ✓ real screen | mobile ahead |
| Addresses entry | ✓ | ✓ (add/delete only) | ⚠ |
| Membership / VIP | benefits page, no join | benefits page, no join | ✗ both |
| Referral code | ✓ (Offers page) | ✓ (wallet screen, copy) | ✓ |
| Order history entry | ✓ | ✓ | ✓ |
| Notifications entry | ✗ | ✓ | mobile ahead |
| Theme toggle | ✗ | ✓ (dark mode) | mobile ahead |
| Language / locale | ✗ | ✗ | ✗ both |
| Help / support entry | ✓ | ✓ | ✓ |
| Legal entry | ✓ | ✓ | ✓ |
| Delete account | ✓ | ✓ | ✓ |
| Logout | ✓ | ✓ | ✓ |

---

## 9. Orders

| Item | Web | Mobile | Status |
|---|---|---|---|
| List with status tabs (All / In Transit / Delivered / Cancelled) | ✓ | ✓ (FW-6) | ✓ |
| Detail: items, totals, address, payment | ✓ | ✓ | ✓ |
| Status timeline | ✓ | ✓ | ✓ |
| Live tracking link | ✓ `/track/:id` | ✓ `/tracking/:id` | ✓ real map both |
| Active-order banner on Home | ✓ (FW-6) | ✓ (FW-6) | ✓ |
| Reorder | ✓ | ✓ | ✓ |
| Cancel (pre-dispatch) + wallet refund | ✓ | ✓ | ✓ |
| Invoice / receipt | 🐛 `alert()` | 🐛 `alert()` | 🐛 both |
| Rate delivered order | ✓ (PDP review, verified) | ✓ | ✓ |
| Real-time status via socket | ✓ | ✓ (`order_status_update` + 15s poll fallback) | ✓ |

---

## 10. Bookings · Enquiries · Quotes · RFQ

**n/a on both platforms.** This is a grocery quick-commerce product; there are no
booking, enquiry, quotation, or RFQ flows in the web app to port. If these are
expected, they are a **net-new product decision**, not a mobile parity gap.

---

## 11. Call · WhatsApp

| Item | Web | Mobile | Status |
|---|---|---|---|
| Call support | ✓ `tel:+91…` on `/help` | ✗ Support screen has no `tel:` shortcut | ✗ mobile |
| Call delivery rider (tracking) | ✓ (reveal window) | ✓ `dialPhone` (reveal window) | ✓ |
| WhatsApp rider (tracking) | ✓ `wa.me` | ✓ `wa.me/91…` | ✓ |
| Call store (Stores page) | ✗ | ✓ `dialPhone` | mobile ahead |
| Directions to store | ✓ (map link) | ✓ `openMaps` | ✓ |
| Share product | ✓ `navigator.share` | ✓ `share_plus` native sheet | ✓ |
| Share payload URL | placeholder `freshcart.com` | placeholder `freshcart.com` | ⚠ both (FW-9) |

---

## 12. Notifications

| Item | Web | Mobile | Status |
|---|---|---|---|
| In-app activity feed | ✗ | ⚠ order-timeline-derived (`/notifications`), no dedicated endpoint, no unread state | mobile ahead / ⚠ |
| Push — Android FCM | ✗ | ✓ token register + `onMessage`/`onMessageOpenedApp`, order-status + delivery-offer pushes (FW-3) | mobile ahead |
| Push — iOS | ✗ | ⚠ code wired; **APNs auth key not uploaded to Firebase**, Push capability not added in Xcode | ⚠ |
| Web push | ✗ | n/a | ✗ (FW-3 leaves web push explicitly optional) |
| Permission prompt + rationale | n/a | ⚠ `requestPermission()` on init, no rationale sheet / settings deep-link | ⚠ |
| Tap → deep link to order | n/a | ✓ (routes to the order / dashboard) | ✓ |

---

## 13. Payments

| Item | Web | Mobile | Status |
|---|---|---|---|
| Razorpay checkout | ✓ (`/payment/verify`) | ✓ native sheet (`razorpay_flutter`) + Simulated fallback in test mode | ✓ |
| HMAC signature verify (server) | ✓ | ✓ | ✓ |
| Webhook reconciliation | ✓ `/payment/webhook` | n/a (server) | ✓ |
| Wallet payment at checkout | ✓ (if balance) | ✓ `walletDebit` (balance-checked) | ✓ |
| Wallet **top-up** | 🐛 stub | ✓ `topup` + `topup/verify` (FW-4) | mobile ahead |
| COD | ✓ | ✓ — now created `paymentStatus: Pending`, flips to Paid on Delivered (BE-3) | ✓ |
| Failed / cancelled payment → no order placed | ✓ | ✓ (`CheckoutController` state machine) | ✓ |
| Membership purchase | ✗ | ✗ | ✗ both (FW-7) |

---

## 14. Settings

| Item | Web | Mobile | Status |
|---|---|---|---|
| Dedicated settings screen | ✗ (spread across profile) | ✗ (spread across profile) | ⚠ both |
| Theme (light / dark) | ✗ | ✓ toggle in profile | mobile ahead |
| Notification preferences | ✗ | ✗ | ✗ both |
| Language / region | ✗ | ✗ | ✗ both |
| Default address / payment | ⚠ client-only | ✗ | ⚠ |
| App version / build info | n/a | ✓ (`package_info_plus`, shown on gate screens) | ✓ |
| Clear cache / data | n/a | ⚠ only via logout | ⚠ |

---

## 15. States — Loading / Empty / Error / Success

| Screen | Loading | Empty | Error | Success | Notes |
|---|---|---|---|---|---|
| Home | ✓ skeleton | ✓ "store being stocked" | ✓ retry | — | ✓ |
| Category catalog | ✓ skeleton | ✓ per-filter empty + "clear filters" | ✓ retry | — | ✓ |
| Product detail | ✓ | ✓ (not found) | ✓ retry | ✓ toast add-to-cart | ✓ |
| Search | ✓ | ✓ no-results | ✓ | — | ⚠ empty state has no suggestions |
| Cart | ✓ | ✓ | ✓ | ✓ | ✓ |
| Checkout | ✓ processing overlay w/ stage | n/a | ✓ inline + toast | ✓ → `/order-placed` | ✓ |
| Orders list | ✓ skeleton | ✓ per-tab | ✓ retry | — | ✓ |
| Order detail | ✓ | n/a | ✓ | ✓ (cancel toast) | ✓ |
| Tracking | ✓ | n/a | ✓ | — | ✓ real map + route; "Reconnecting" pill on socket drop |
| Wallet | ✓ skeleton | ✓ no-txns | ✓ retry | ✓ (top-up toast) | ✓ |
| Addresses | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ skeleton | ✓ | ✓ retry | — | ✓ |
| Location select | ⚠ spinner | n/a | ✓ **now toasts geocode failure** (FW-13) | ✓ | ⚠ raw `TextField`s, hardcoded colours |
| Support | ⚠ | ⚠ | ⚠ socket errors swallowed | ⚠ | ⚠ thin |

Overall: **states are consistently handled on the core commerce path.** Weak spots:
`location_select` (design), `support` (error handling), tracking (map fidelity),
search empty state.

---

## 16. Deep links / app links

| Item | Web | Mobile | Status |
|---|---|---|---|
| `https://<domain>/product/:id` opens app | n/a | ✗ no `intent-filter` host / iOS associated domains | ✗ |
| `assetlinks.json` / AASA served | ✗ | ✗ | ✗ |
| `go_router` deep-link parsing | — | ⚠ routes exist but no external-link entry, no `uni_links`/`app_links` | ✗ |
| Share URLs point at real app-link domain | ✗ placeholder | ✗ placeholder | ✗ (FW-9) |
| Push tap → in-app route | n/a | ✓ (FW-3) | ✓ |

---

## 17. Permissions

| Permission | Web | Mobile | Status |
|---|---|---|---|
| `android.permission.INTERNET` | n/a | **now in `main/AndroidManifest.xml`** (+ `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`). Was debug-only → release builds had no network. | ✓ (fixed 2026-09-01) |
| Location | browser prompt | **`LocationPermissionService`**: real OS check on **login + hydrate** → splash routes to `/location_select`; that screen auto-runs the flow — **rationale sheet**, request, GPS-off → `openLocationSettings()`, deniedForever → `openAppSettings()`, persistent in-screen banner with a retry/settings CTA. `grantLocationPermission()` set only on a real grant. | ✓ (2026-09-01) |
| Notifications (FCM) | n/a | `FirebaseMessaging.requestPermission()` on init | ⚠ no pre-prompt rationale; Android 13 `POST_NOTIFICATIONS` now declared |
| Camera / photos | n/a | not requested (no avatar/review photo) | n/a |
| `permission_handler` package | n/a | ✗ not used — `geolocator` + the new service cover location; would still help for notifications | ⚠ |
| iOS `Info.plist` usage strings | n/a | ⚠ location strings present; notification/APNs setup incomplete | ⚠ |

---

## 18. Prioritized gap list (mobile, unless noted)

**P0 — real functional gaps**
1. **🐛 Invoice / receipt** is an `alert()` stub on **both** platforms. `Invoice` model exists; no endpoint. (FW-6)
2. ~~Live tracking map schematic on mobile~~ — **done 2026-09-01**: real `mapcn_flutter` map + OSRM rider→drop route on mobile; web gained the same route line + gliding marker + follow-cam.
3. **✗ Product listing has no pagination / infinite scroll** on mobile; backend supports `page`/`limit` (FW-5). Large categories load everything.
4. **✗ Address edit + set-default** missing on mobile (and no backend route — parity gap both).

**P1 — parity / completeness**
5. **✗ Content pages** — Offers, Brands, Blog(+detail), About, Help/FAQ — none on mobile. Backend has `/blogs`, `/brands`, `/coupons`. (FW-8)
6. **✗ Membership join/upgrade** — benefits-only on both; no `POST …/membership` endpoint. (FW-7)
7. **✗ Filters** — price-range + brand picker missing on mobile; discount-sort missing. Brand picker missing on web too.
8. **⚠ Web has no real customer auth** (fake OTP, no JWT) → blocks web wallet, membership, proper order ownership. (**WEB-1** — web-side, but it's why several "mobile ahead" rows exist.)
9. **✗ Search** — no trending/suggested queries; bare empty state.
10. **✗ Deep links / app links** — neither platform; share URLs are placeholders. (FW-9)
11. **⚠ Support** — mobile has chat only: no FAQ content, no `tel:` shortcut, no ticket history (`SupportTicket` model exists).
12. **✗ Promo cards** never consumed on mobile (banners + special-groups are).

**P2 — polish / platform**
13. **⚠ `permission_handler`** rationale sheets + "open settings" fallback (location, notifications). (FW-10)
14. **✗ Analytics + crash reporting** (Firebase Analytics / Crashlytics / Sentry) on mobile. (FW-12)
15. **⚠ `location_select`** — raw `TextField`s → `AppTextField`; replace hardcoded colours with tokens. (FW-13 half-done)
16. **⚠ Navigation** — no scroll-position restore, no "return to intended route" after login.
17. **⚠ Stores** — hardcoded on both; no `/api/stores`.
18. **⚠ Settings** — no dedicated screen, no notification prefs, no language.
19. **⚠ iOS push** — APNs key + Xcode Push capability not set up (FW-3 remainder).
20. **✗ Avatar / review-photo upload** — neither platform.

**Where mobile is *ahead* of web (web parity gaps):**
- Real customer auth (OTP → JWT).
- Wallet: real balance + history + top-up (web = fake `₹0`).
- In-app notifications feed.
- Push notifications (FCM).
- Offline banner + maintenance / force-update gate.
- Dark-mode toggle.
- App-version awareness.

---

## 19. Test coverage snapshot

- **Mobile:** `flutter test` **117** passing (auth, catalog models, pricing, design,
  order model, foundation widgets, navigation, auth-flow widget, checkout controller,
  home, orders flow, product details, search/wishlist, account screens, category screens,
  legal, product reviews, app-config). `flutter analyze` clean. `flutter build apk --debug` OK.
- **Web:** **no automated tests** (`frontend/`). `tsc -b && vite build` clean. (BE-4)
- **Backend:** `npm test` **45** passing (integration, against Atlas).
