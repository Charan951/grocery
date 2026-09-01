# FreshCart — Mobile Functionality Audit

> Web (`frontend/`, React SPA storefront) **vs** Mobile (`mobileapp/`, Flutter).
> Date: 2026-08-31. Scope: customer-facing storefront only (admin `/admin/*` is web-only by design, out of scope).
> Legend: ✓ Complete · ⚠ Partial · ✗ Missing · 🐛 Broken / fake data

**Fix status:** _Group 1 (Broken functionality) fixed 2026-08-31 — see the `✅ FIXED`
notes inline and §29._ Remaining groups (2–10) not started.

---

## 0. Executive summary

| Area | Verdict | One-liner |
|---|---|---|
| Browse → cart → pay → track (Flows 1–4) | ✓ | Rebuilt native, real API, all 5 states, tested (100 tests). |
| Account tab & sub-pages | ⚠ | ✅ Addresses/Wallet/Stores/Notifications fixed (real API or fake data removed). Membership still static. |
| Profile edit | ✓ | ✅ `ProfileEditScreen` (`/account/edit`) → `PUT /customers/me/profile`. |
| Notifications (in-app list) | ⚠ | ✅ Real activity feed from order timelines + bell entry point. Push (FCM) still ✗. |
| Reviews (read/write) | ✗ | PDP shows a rating number only. No list, no compose. |
| Content pages (Offers, Brands, Blog, About, Legal, Help) | ✗ | Not built on mobile at all. |
| Call / dial actions | ✓ | ✅ `url_launcher` + `core/utils/launch.dart`; store + rider call/directions wired. |
| Deep links / app links | ✗ | No intent-filters, no `go_router` deep-link config. |
| Address CRUD | ✓ | ✅ Real `POST` / `DELETE /customers/me/addresses`; mock insert removed. |
| Filters / sorting | ⚠ | Missing discount-sort, price-range, brand filter, pagination. |
| Orphaned routes | ✓ | ✅ `/location` + `/map_selection` deleted; `/wishlist` + `/notifications` now have entry points. |
| Banner tap targets | ✓ | ✅ `resolveAppRoute()` maps CMS links; unmappable render non-tappable. |
| WhatsApp / Bookings / Enquiries / Quotes | n/a | Not present in web either (grocery quick-commerce). |

---

## 1. Pages

| Web page / route | Mobile equivalent | Status | Notes |
|---|---|---|---|
| `/` Home | `HomeScreen` (`/`) | ✓ | Native rebuild; real banners/categories/special-groups/products; curated rails. |
| `/categories` | `CategoriesScreen` (`/categories` tab) | ✓ | Per-category sections + subcategory tiles + trending. |
| `/products`, `/category/:slug` (listing) | `CategoryCatalogScreen` (`/category/:id`) | ⚠ | No `/products`-style all-products view; no pagination; fewer filters (see §9/§10). Banner `linkUrl`s like `/products?category=` **don't resolve** on mobile → 🐛. |
| `/product/:id`, `/prn/:slug/prid/:id` | `ProductDetailsScreen` (`/product/:id`) | ⚠ | Full PDP done; **no reviews section**, no SEO slug route. |
| `/brands` | — | ✗ | Not built. `GET /api/brands` unused on mobile. |
| `/offers` | — (coupons only inside Cart) | ✗ | No offers/coupon browse page; no referral-code copy. |
| `/blog`, `/blog/:id` | — | ✗ | Not built. `GET /api/blogs` unused. |
| `/about` | — | ✗ | Not built. |
| `/legal`, `/s/terms-of-service`, `/s/privacy-policy` | — | ✗ | Login screen shows the words "Terms of Service and Privacy Policy" as **plain text, no links/route**. |
| `/help`, `/support`, `/customer-support` | `SupportScreen` (`/support`) | ⚠ | Live socket chat only; no FAQ/help-center content, no ticket history. |
| `/careers` | — | ✗ | Not built (low priority). |
| `/stores` | `StoresScreen` (`/stores`) | ✅ | Static list on **both** platforms (no endpoint); rebuilt flat + **Call** / **Directions** actions wired. |
| `/locations`, `/saved-addresses`, `/account/addresses` | `AddressesScreen` (`/addresses`) | ✅ | Real add/delete via `/customers/me/addresses`; select; empty state. |
| `/orders`, `/account/orders` | `OrdersListScreen` (`/orders` tab) | ✓ | Both real now. Web `CustomerOrders` mock array **removed**; web filter tabs fixed (`bucketOf`); ✅ **status timeline ported to web** order-detail. |
| `/profile`, `/account/profile` | `ProfileScreen` (`/account` tab) | ✅ | Menu + **Edit** → `ProfileEditScreen` (`PUT /customers/me/profile`). |
| — | `WishlistScreen` (`/wishlist`) | ✅ | Reachable from a **Profile menu row**. |
| — | `NotificationsScreen` (`/notifications`) | ✅ | Real feed from order timelines; **bell in Home header** + Profile row. |
| — | `MembershipScreen` (`/membership`) | ⚠ | Static perks; hardcoded Member ID; no join/upgrade action. |
| — | `WalletScreen` (`/wallet`) | ✅ | Real balance + funding explainer + `referralCode` copy; fake txns + no-op button removed. |
| Quick-view modal (from cards) | — | ⚠ | Mobile taps straight through to PDP (acceptable, but note the parity gap). |
| Festival campaign themed Home (mobile-only on web) | — | ✗ | `FestivalCampaignWrapper` not ported (P2-1). |

---

## 2. Navigation

| Item | Status | Notes |
|---|---|---|
| Bottom nav (Home / Categories / Search / Orders / Account) | ✓ | `StatefulShellRoute`, per-tab stacks preserved. |
| Full-screen routes above the shell (cart, checkout, PDP, tracking…) | ✓ | |
| Auth redirect guard (unauth → `/login`) | ✓ | `redirect` in `routerProvider`. |
| Re-tap active tab → pop to root | ✓ | |
| Hardware back: non-home tab → Home; Home root → "press back again to exit" | ✓ | `MainScaffold` `PopScope`. |
| Orphaned routes | ✅ | `/location` + `/map_selection` **deleted**; `/notifications` (bell) + `/wishlist` (Profile row) now reachable. |
| Banner / promo tap targets | ✅ | `core/utils/web_link.dart` `resolveAppRoute()` maps CMS links to real routes; unmappable = non-tappable. |
| "See all" / category / subcategory links | ✓ | Resolve to `/category/:id(?sub=)`. |
| Profile → wallet/addresses/stores/support/membership | ✓ | Links exist (targets are the broken screens, not the nav). |
| Profile → Notifications | ✅ | Menu row + Home header bell. |
| Profile → Wishlist | ✅ | Menu row. |
| Profile → Edit profile | ✅ | "Edit" on the avatar card → `/account/edit`. |
| Deep-linked route while signed out | ✓ | Bounces to `/login` (but no post-login return-to-intended-route). |

---

## 3. Authentication

| Item | Status | Notes |
|---|---|---|
| Phone entry → OTP → verify | ✓ | Real `/customers/otp/send` + `/otp/verify`, 30-day customer JWT. |
| OTP: 6-box, paste-fill, backspace, auto-submit, resend timer, test-mode banner | ✓ | `OtpField`. |
| Token persisted securely; attached to requests; 401 → logout→`/login` | ✓ | `TokenStore` + Dio interceptor. |
| Splash routes on real hydrated state | ✓ | |
| Logout clears token + local caches | ✅ | `logout()` also clears cart / wishlist / recent-search (best-effort). |
| Onboarding (real product-image collage) | ✓ | |
| Post-verify → `/location_select` (new user) or `/` (returning) | ✓ | |
| "Continue = agree to Terms/Privacy" | 🐛 | Text only, not tappable, no legal screen. |
| Rate-limit / lockout messaging surfaced | ⚠ | Backend enforces; mobile shows the generic error message, no specific "try again in Ns". |
| Account deletion | ✗ | Web has none either; `DELETE /customers/:id` exists, unused. |
| Biometric app-lock | ✗ | P2-8, not present. |

---

## 4. Forms

| Form | Status | Notes |
|---|---|---|
| Phone number field (`+91`, grouping, 10-digit) | ✓ | `PhoneField`. |
| OTP input | ✓ | `OtpField`. |
| Coupon code entry (Cart) | ✓ | `AppTextField` + Apply, server `validateCoupon`. |
| Address form | ✅ | `AddressesScreen` `AppBottomSheet` form (validated) → `POST /customers/me/addresses`; `location_select` posts too. |
| "Add new address" (Addresses screen) | ✅ | Opens the validated form; posts for real. Mock insert removed. |
| Profile edit (name / email) | ✅ | `ProfileEditScreen`. |
| Support chat message input | ✓ | Sends over socket. |
| Search field | ✓ | Debounced, recents, clear button, `textInputAction: search`. |
| Field-level validation + inline errors | ✓ (auth) / ⚠ (elsewhere) | `AppTextField` supports `errorText`; only auth screens use it rigorously. |
| Generic form widgets available | ✓ | `AppTextField`, `AppModal.confirm`, `AppBottomSheet`. |

---

## 5. API integration

`ApiService` methods present: `sendOtp`, `verifyOtp`, `fetchMe`, `updateMyProfile`, `fetchBanners`, `fetchCategories`, `fetchSpecialGroups`, `fetchProducts`, `fetchProduct`, `fetchSettings`, `fetchCoupons`, `validateCoupon`, `createOrder`, `createRazorpayOrder`, `verifyPayment`, `walletDebit`, `fetchMyOrders`, `fetchOrder`.

| Web-consumed endpoint | Mobile | Status |
|---|---|---|
| `GET /categories`, `/products`, `/products/:id`, `/banners`, `/special-groups`, `/settings`, `/coupons` | wired | ✓ |
| `POST /coupons/validate` | wired | ✓ |
| `POST /orders`, `GET /orders/mine`, `GET /orders/:id` | wired | ✓ |
| `POST /customers/otp/*`, `GET /customers/me` | wired | ✓ |
| `PUT /customers/me/profile` | `ProfileEditScreen` → `updateProfile` | ✅ |
| `POST` / `DELETE /customers/me/addresses[/:id]` | `ApiService.addAddress` / `deleteAddress` → `AuthNotifier` | ✅ |
| `GET /brands` | not used | ✗ |
| `GET /blogs` | not used | ✗ |
| `GET /festival-campaigns/active` | not used | ✗ |
| `GET /customers/:id/notifications`, `PUT …/read` | not used | ✗ |
| `POST /products/:id/reviews`, `GET …/reviews` | endpoints not built (P1-4) + no client | ✗ |
| `POST /orders/:id/cancel` | endpoint exists (per MEMORY), **no client** | ✗ |
| `GET /customers/:id/wallet/transactions` | endpoint not built (P2-3) + no client | ✗ |
| `PUT /customers/:id/wallet` (top-up) | not used (Add Money is a no-op) | 🐛 |
| `POST /customers/:id/devices` (FCM token) | endpoint + client absent | ✗ |
| `GET /api/app/config` (force-update/maintenance) | absent | ✗ |
| `GET /api/stores` (or CMS `stores`) | absent → hardcoded | 🐛 |
| Payment webhook / `POST /payment/webhook` | server-side only, n/a to client | ✓ |
| Offline degrade / stub behaviour | ⚠ | Catalog throws `ApiException` (good, no fake); but no offline banner / retry-with-backoff / connectivity awareness (`connectivity_plus` absent). |

---

## 6. CRUD operations

| Entity | Create | Read | Update | Delete | Status |
|---|---|---|---|---|---|
| Cart items | ✓ add | ✓ | ✓ qty ± | ✓ swipe / clear | ✓ (local Hive, matches web localStorage) |
| Wishlist | ✓ heart | ✓ | — | ✓ heart / ✗-overlay | ✓ (local only; web is also local — parity) |
| Coupon on cart | ✓ apply | ✓ list | — | ✓ remove | ✓ |
| Addresses | ✅ real `POST` | ✓ list + select | — (no PUT endpoint) | ✅ real `DELETE` | ✅ |
| Profile (name/email) | — | ✓ read | ✅ `PUT /me/profile` | ✗ delete-account | ✅ |
| Orders | ✓ place | ✓ list + detail | ✗ (no cancel) | — | ⚠ |
| Reviews | ✗ | ✗ | ✗ | ✗ | ✗ |
| Support tickets | ⚠ chat send | ⚠ live only | — | — | ⚠ no persisted ticket list. |

---

## 7. Search

| Item | Status | Notes |
|---|---|---|
| Server-side search (`?search=`) | ✓ | `searchProductsProvider`. |
| Debounce (350 ms) | ✓ | |
| Recent searches (persisted) | ✓ | `StorageService` + `recentSearchesProvider`, cap 8. |
| Trending terms from live catalog | ✓ | Category + subcategory names. |
| Clear button | ✓ | |
| Autofocus when opened from Home pill | ✓ | `/search_detail`. |
| Result grid + count + empty state | ✓ | |
| In-header live results dropdown (web) | ⚠ | Mobile is a full screen instead (reasonable). |
| Voice search | ✗ | Mic icon in `CustomSearchBar` is decorative / no-op. |
| Suggestions endpoint (`/products/suggestions`) | ✗ | P2-4, not present (web doesn't have it either). |

---

## 8. Filters

| Filter | Web | Mobile | Status |
|---|---|---|---|
| Organic only | ✓ | ✓ (bottom sheet) | ✓ |
| Subcategory | ✓ | ✓ (chip strip) | ✓ |
| Category | ✓ | ✓ (route) | ✓ |
| Price range (min/max) | server supports `minPrice/maxPrice`; web UI partial | ✗ | ✗ |
| Brand | ✓ (text match) | ✗ | ✗ |
| In-stock only | ⚠ | ✗ | ✗ |
| Active-filter indicator | — | ✓ (dot on tune icon) | ✓ |
| Clear filters affordance | — | ✓ (in empty state) | ✓ |

---

## 9. Sorting

| Sort | Web | Mobile | Status |
|---|---|---|---|
| Popular / default | ✓ | ✓ | ✓ |
| Price low→high / high→low | ✓ | ✓ | ✓ |
| Rating (top rated) | ✓ | ✓ | ✓ |
| Discount (biggest saving) | ✓ | ✗ | ✗ |
| Applied-sort shown in count line | — | ✓ | ✓ |

---

## 10. Images

| Item | Status | Notes |
|---|---|---|
| Product card images | ✓ | `CachedNetworkImage` + shimmer + branded fallback (upgraded this pass). |
| PDP gallery (multi-image, dots, Hero) | ✓ | `ProductModel.gallery` from `images[]`. |
| Banner carousel images | ✓ | `CachedNetworkImage`. |
| Special-group tile images | ✓ | Real CMS images. |
| Onboarding product collage | ✓ | Real catalog images. |
| Cart / order-row thumbnails | ✓ | Added this pass. |
| Category tiles | ⚠ | Icon glyphs, not images. Web uses `getSubCategoryImage` (deterministic photo). No subcategory image field from API on mobile. |
| Wishlist / search grids | ✓ | Reuse `ProductCard`. |
| Broken-image handling | ✓ | `errorWidget` everywhere. |

---

## 11. Uploads

| Item | Status | Notes |
|---|---|---|
| Any customer-facing upload (profile photo, review photo, complaint attachment) | n/a | Neither web nor mobile has customer uploads. Profile avatar is an initial. Nothing to port. |

---

## 12. Profile / Account

| Item | Status | Notes |
|---|---|---|
| View name / phone / VIP badge | ✓ | From `authProvider`. |
| Edit name / email | ✅ | `ProfileEditScreen` → `PUT /customers/me/profile`. |
| Wallet balance | ✓ | Real (`user.walletBalance`). |
| Wallet transaction history | ✗ (fake removed) | No customer endpoint; no fabricated rows. |
| Wallet "Add Money" | ✗ (removed) | No customer top-up endpoint; not faked. |
| Membership / VIP | ⚠ | Static perks; fake `#FC-VIP-99321`; no join/renew. |
| Saved addresses | ✅ | Real add / delete / select. |
| Store locator | ✅ | Static list (parity w/ web); Call + Directions actionable. |
| Support | ⚠ | Socket chat only. |
| Notifications centre | ✅ | Real feed (order timelines) + bell entry point. |
| Wishlist | ✅ | Profile menu row. |
| Dark-mode toggle | ✓ | `themeProvider`, persisted. |
| Language / units / other settings | ✗ | None (India-English only — acceptable for now). |
| Logout | ✓ | Clears token; ⚠ leaves cart/wishlist/recents caches. |
| Delete account | ✗ | |
| Referral code | ✅ | Wallet shows the real `referralCode` with copy. |

---

## 13. Orders

| Item | Status | Notes |
|---|---|---|
| List real customer orders | ✓ | `GET /orders/mine`. |
| Active / Past split | ✓ | |
| Status filter tabs (All / In Transit / Delivered / Cancelled) | ✗ (mobile) / ✅ (web) | Mobile has Active/Past split only. Web tabs now bucket real backend statuses correctly. |
| Order card: status, date, thumbnails, total, address | ✓ | |
| Order detail: status header, timeline, items, bill, delivery/payment | ✓ | |
| Reorder (re-add to cart) | ✓ | List + detail; loops `addToCart`. |
| Track order | ✓ | → `/tracking/:id`. |
| Cancel order | ✗ | `POST /orders/:id/cancel` exists; no client, no UI. |
| Download / view invoice | ✗ | Web has a (stub) "Download Invoice"; mobile none. |
| Rate / review a delivered order | ✗ | No entry point. |
| Empty / loading / error states | ✓ | `SkeletonList` / `ErrorState` / `EmptyState`. |
| Pull-to-refresh | ✓ | |
| Active-order banner on Home / Orders tab | ⚠ | `OrdersNotifier.activeOrder` exists; not surfaced on Home. |

---

## 14. Bookings

| Item | Status | Notes |
|---|---|---|
| Slot / delivery-time selection | ✓ | Cart "Delivery speed" radio (Instant / Evening) → carried into checkout. |
| Any other "booking" concept | n/a | Grocery quick-commerce — no reservations/appointments in web either. Offers page mentions a "6 AM slot" perk (marketing copy only). |

---

## 15. Enquiries

| Item | Status | Notes |
|---|---|---|
| Enquiry / contact form | n/a | Not present in web. Closest is Support chat (⚠, see §12). |

---

## 16. Quotes

| Item | Status | Notes |
|---|---|---|
| Quote request / RFQ | n/a | Not applicable to this product. |

---

## 17. Call

| Item | Status | Notes |
|---|---|---|
| `url_launcher` / dialer intent | ✅ | `url_launcher: ^6.2.5` + `core/utils/launch.dart` + manifest `<queries>`. |
| Support phone (`tel:+911800373742` on web) | ✗ | Not shown on mobile; would be inert anyway. |
| Store phone numbers | ✅ | **Call** button → `dialPhone`. |
| Rider "call" button on tracking | ✅ | Wired to `dialPhone(t.riderPhone)`. |
| Rider "chat" button on tracking | ✓ | Routes to `/support`. |

---

## 18. WhatsApp

| Item | Status | Notes |
|---|---|---|
| `wa.me` / WhatsApp deep link | n/a | Not present in web. No requirement identified. |

---

## 19. Notifications

| Item | Status | Notes |
|---|---|---|
| In-app notification list | ✅ (derived) | Real activity feed from order `trackingTimeline`s (no dedicated endpoint exists). |
| Entry point (bell icon / Profile link) | ✅ | Home-header bell + Profile menu row. |
| Read / unread state | ✗ | |
| Push notifications (FCM) | ✗ | `firebase_core` / `firebase_messaging` not in `pubspec`; no `PushService`; `POST_NOTIFICATIONS` permission absent from manifest; no permission prompt. |
| Notification tap → deep link | ✗ | No deep-link handling at all. |
| Toast / in-app transient feedback | ✓ | `AppToast` (success/error/info/warning) wired app-wide. |
| Order-status push on transitions | ✗ | Server emits socket `order_status_update`; no push. |

---

## 20. Payments

| Item | Status | Notes |
|---|---|---|
| Razorpay native checkout (UPI / Card / Netbanking) | ✓ | `razorpay_flutter`, `PaymentGateway` + `RazorpayGateway`, real `create-order` → gateway → `verify` → place order. |
| Wallet payment (balance gate + server debit) | ✓ | `walletDebit`, disabled tile + "Low balance" when short. |
| COD | ✓ | Places order with `paid:false`. |
| Payment failure / cancel → no order created | ✓ | `CheckoutController` state machine. |
| Processing overlay with stage text | ✓ | `LoadingOverlay`. |
| Signature verification server-side | ✓ | Real HMAC (P0-1/P1-1). |
| Retry after failure | ⚠ | Toast + reset to idle; user re-taps "Place order". No explicit retry CTA. |
| Payment method icons / saved instruments | ⚠ | Static tiles; no saved cards/UPI IDs (Razorpay sheet handles it). |
| Wallet top-up via Razorpay | 🐛 | "Add Money" no-op (see §12). |
| Order status reflects verified payment (`Pending`→`Confirmed`) | ✓ | Backend gates on verification. |

---

## 21. Settings

| Item | Status | Notes |
|---|---|---|
| Dark mode | ✓ | Toggle in Profile, persisted via `StorageService`. |
| Notification preferences | ✗ | No push, so nothing to configure. |
| Address default / delivery preferences | 🐛 | No set-default (see §6). |
| Environment config (`API_BASE_URL`, `ENV`) | ✓ | `AppConfig` via `--dart-define` (P0-8). |
| Force-update / maintenance gate | ✗ | `GET /api/app/config` + `ForceUpdateDialog` / `MaintenanceScreen` not built (P1-6). |
| Language / region | ✗ | Hardcoded India-English (acceptable now, not structured for l10n). |
| Clear cache / data | ⚠ | `StorageService.clearAll()` exists; no UI. |

---

## 22. Error handling

| Item | Status | Notes |
|---|---|---|
| Typed `ApiException` + Dio interceptor (401 → logout) | ✓ | |
| `ErrorState` (icon + message + retry) on data screens | ✓ | Home, Categories, Catalog, PDP, Search, Orders, Order detail, Wishlist. |
| Retry re-invokes provider / `refresh()` | ✓ | |
| Toast on action failure (add-to-cart cap, coupon invalid, checkout fail, wishlist) | ✓ | `AppToast`. |
| Retry-with-backoff for idempotent GETs | ✗ | Not implemented (P1-6). |
| Offline banner / connectivity awareness | ✗ | `connectivity_plus` absent. |
| Global crash reporting (Crashlytics / Sentry) | ✗ | P2-5. |
| Account sub-screens (wallet/stores/notifications/membership) | ⚠ | No error handling because they never hit the network. |
| `location_select` reverse-geocode / GPS failures | ⚠ | Swallowed silently (`catch (_) {}`), falls back to a hardcoded Hyderabad address string. |

---

## 23. Loading states

| Screen | Status | Notes |
|---|---|---|
| Home | ✓ | `_HomeSkeleton` (3 `ProductRailSkeleton`). |
| Categories | ✓ | `_CategoriesSkeleton`. |
| Category catalog | ✓ | `SkeletonGrid`. |
| PDP | ✓ | `_PdpSkeleton`. |
| Search results | ✓ | `SkeletonGrid`. |
| Wishlist | ✓ | `SkeletonGrid`. |
| Orders list | ✓ | `SkeletonList`. |
| Order detail | ✓ | `_DetailSkeleton`. |
| Checkout processing | ✓ | `LoadingOverlay` + stage text. |
| Coupon apply | ✓ | Inline spinner on Apply button. |
| Splash hydration | ✓ | Branded splash awaits `ensureHydrated()`. |
| Wallet / Membership / Stores / Notifications | ✗ | Instant (static data) — no skeletons because no fetch. |
| Support chat send | ⚠ | No pending/sent indicator on the bubble. |
| Image placeholders | ✓ | Shimmer / spinner in `CachedNetworkImage`. |

---

## 24. Empty states

| Screen | Status | Notes |
|---|---|---|
| Cart empty | ✓ | `EmptyState` → Start shopping. |
| Wishlist empty | ✓ | → Start shopping. |
| Orders empty | ✓ | → Start shopping. |
| Search no results | ✓ | "No matches found". |
| Category catalog empty | ✓ | + "Clear filters" action. |
| Categories empty | ✓ | |
| Home empty (bare catalog) | ✓ | "Store is being stocked". |
| Addresses empty | ✅ | Proper `EmptyState` + working Add. |
| Notifications empty | ✅ | Real `EmptyState` when no orders. |
| Wallet transactions | n/a | No history section (no endpoint). |
| Support chat empty | ⚠ | Seeded with one hardcoded agent greeting. |

---

## 25. Back navigation

| Item | Status | Notes |
|---|---|---|
| `AppScaffold` back button (pop) | ✓ | Consistent across pushed routes. |
| Login back → pop-or-`/onboarding` | ✓ | |
| OTP back → pop to login | ✓ | |
| `location_select` → `_leave()` = pop-or-`/` | ✓ | Fixed (was `context.pop()` on a `go`-reached screen). |
| Order-placed hardware back → `/` (no dead-end) | ✓ | `PopScope` + `onPopInvokedWithResult`. |
| Tracking back → pop-or-`/orders` | ✓ | |
| Tab hardware-back rules | ✓ | Non-home → Home; Home → exit-confirm. |
| Nested push/pop within a tab survives tab switch | ✓ | Verified by `navigation_test.dart`. |
| Wallet / Membership / Support / Addresses / Stores / Notifications back | ✓ | Raw `context.pop()` — fine (always `push`-reached), but not using `AppScaffold`. |
| Post-login "return to intended deep link" | ✗ | Redirect always lands on `/`. |

---

## 26. Deep links

| Item | Status | Notes |
|---|---|---|
| Android `intent-filter` for `https://` app links / custom scheme | ✗ | `AndroidManifest.xml` has only the default `MAIN`/`LAUNCHER` filter. |
| iOS associated domains / `apple-app-site-association` | ✗ | Not configured. |
| `go_router` deep-link parsing (product, order, tracking) | ✗ | No handling; routes are internal-only. |
| Web SEO URLs (`/prn/:slug/prid/:id`, `/s/privacy-policy`) → mobile | ✗ | No equivalents. |
| Notification payload → screen routing | ✗ | No push, no routing. |
| Share product / share order (`share_plus`) | 🐛 | PDP "share" copies a **plain summary string to clipboard** (no URL / deep link). No `share_plus`. |
| `assetlinks.json` / domain hosting | ✗ | Not set up (P2-7). |

---

## 27. Permissions

| Permission | Status | Notes |
|---|---|---|
| Location (`ACCESS_FINE/COARSE_LOCATION`) | ⚠ | Declared in manifest. Requested ad-hoc via `geolocator` inside `location_select` / `map_selection`; no `permission_handler`, no rationale UI, no "open settings" flow when permanently denied. |
| Notifications (`POST_NOTIFICATIONS`, Android 13+) | ✗ | Not declared; no runtime prompt (no push feature). |
| Camera / storage / contacts / microphone | n/a | No feature needs them (mic icon is decorative). |
| iOS `Info.plist` usage strings | ⚠ | Not audited here; at minimum location strings needed for App Store. |
| Permission denial handled gracefully | ⚠ | `location_select` shows a SnackBar "enable GPS"; `map_selection` shows SnackBars; neither routes to app settings. |
| `LocationScreen` (`/location`) fake OS dialog | ✅ | **Deleted** with the `/location` route. |

---

## 28. Cross-cutting / other parity gaps

| Item | Status | Notes |
|---|---|---|
| SEO / meta (`SEO` component on every web page) | n/a | Not applicable to a native app. |
| `useSmartBack` history-aware back (web) | ✓ (equivalent) | Mobile uses pop-or-home fallbacks. |
| Cart qty cap = 3/item parity | ✓ | `kMaxQtyPerItem`. |
| Pricing (tax %, delivery rule, free-delivery threshold) from `/settings` | ✓ | `PricingConfig` — but `FloatingCart` widget still hardcodes a ₹400 free-delivery threshold (stale copy; shell only). ⚠ |
| VIP free-delivery logic | ⚠ | Cart shows a hardcoded "You saved ₹29.00 Delivery Fee as VIP" string; not computed. |
| Real-time tracking (socket `order_status_update`) | ✓ | `trackingProvider`; rider map position is a **status-driven mock** (no real rider GPS — no rider app exists; documented). |
| Festival theming | ✗ | P2-1. |
| Analytics / funnel events | ✗ | P2-5. |
| a11y (semantic labels, tap targets, text scaling) | ⚠ | Bottom nav has `Semantics`; not audited app-wide. |

---

## 29. Prioritised gap list

### P0 — broken / fake data users will hit immediately — ✅ DONE 2026-08-31
1. ✅ **Addresses**: real CRUD via `POST` / `DELETE /customers/me/addresses` (`AddressesScreen` rebuilt with add-form + delete-confirm); hardcoded mock insert removed; `location_select` persists for real. Server owns `isDefault` (first address); "selected" is client-side (`selectAddress`) — no set-default endpoint exists, and checkout uses `selectedAddress` anyway.
2. ✅ **Wallet**: fake 3-row transaction list **removed**; no-op "Add Money" button **removed** (no customer history/top-up endpoint). Shows real balance + funding explainer + `referralCode` (copy). _Backend still lacks `GET wallet/transactions` + customer top-up — see P2._
3. ✅ **Stores**: rebuilt flat; **Call** (`dialPhone`) + **Directions** (`openMaps`) wired. Note: the store list is hardcoded on **both** web (`defaultStores` in `CMSContext`) and mobile — no backend endpoint. Not a mobile-specific gap.
4. ✅ **Notifications**: real activity feed derived from order `trackingTimeline`s (`ordersProvider`), newest-first, tap → `/order/:id`, with loading/error/empty. **Bell** added to the Home header + Profile menu row. _No dedicated notifications endpoint + no FCM push — see P1._
5. ✅ **Profile edit**: `ProfileEditScreen` (`/account/edit`) → `PUT /customers/me/profile` (`updateProfile`); "Edit" on the Account card; phone read-only.
6. ✅ **Orphaned routes**: `location_screen.dart` (fake OS dialog) + `map_selection_screen.dart` deleted with `/location` + `/map_selection`. `/wishlist` + `/notifications` now reachable (Profile menu + Home bell).
7. ✅ **Home banner tap targets**: `core/utils/web_link.dart` `resolveAppRoute()` maps `/products?category=…` → `/category/…`; unmappable targets render non-tappable.
8. ✅ **Tracking "call rider"** + **store phones**: `url_launcher: ^6.2.5` + `core/utils/launch.dart` + manifest `<queries>` for `tel:` / `https`.

**Also fixed this pass:** logout now clears cart / wishlist / recent-search caches (P1 #15).

### P1 — important parity (not started)
9. ✗ **Reviews** on PDP (read list + write from a delivered order) — needs backend P1-4 too.
10. ✗ **Order cancel** (`POST /orders/:id/cancel`) with reason + refund-to-wallet — **backend route does not exist yet** (must be added).
11. ✗ **Push notifications** (FCM) + `POST_NOTIFICATIONS` permission + permission prompt + deep-link routing.
12. ⚠ **Filters**: discount sort, price-range, brand, in-stock; consider pagination for large categories.
13. ⚠ **Membership**: real join/upgrade action; drop the fake Member ID.
14. ⚠ **Offline/error resilience**: `connectivity_plus` banner, retry-with-backoff, `GET /app/config` force-update/maintenance.
15. ✅ **Logout** clears cart / wishlist / recent-search caches (done in Group 1).
16. ⚠ **Legal**: make the login "Terms/Privacy" text real links to a Legal screen (bundled markdown is fine).

### P2 — content & polish
17. ✗ Content pages: Offers, Brands, Blog, About, Help-Center FAQ.
18. ✗ Deep links / app links (`intent-filter`, associated domains, `share_plus` with real URLs).
19. ✗ Festival campaign theming on Home.
20. ✗ Analytics + crash reporting.
21. ⚠ `location_select` off-palette colours (`#00A86B`) + hardcoded default address string; full redesign.
22. ⚠ Category tiles: real subcategory images instead of icon glyphs.
23. ⚠ `FloatingCart` widget: flat restyle + real free-delivery threshold from `PricingConfig`; VIP saved-fee string should be computed.
24. ⚠ Support: FAQ/help content + persisted ticket history; pending/sent indicators on chat bubbles.

---

## 30. What is genuinely solid (no action needed)

- Auth flow (onboarding → phone → OTP → verify → location/home).
- Browse: Home, Categories, Category catalog, PDP, Search, Wishlist — real data, all 5 states, native layouts.
- Cart → Checkout → Payment (Razorpay/Wallet/COD) → Order placed → Orders list → Order detail → Tracking.
- Design-system consistency (flat, `AppScaffold` / `AppToast` / `AppModal` / `AppBottomSheet` / skeletons / `LoadingOverlay`).
- Back-navigation correctness (tabs, nested stacks, funnel exits).
- 92 passing widget/unit tests; debug APK builds green.
