# FreshCart — Mobile Functionality Audit

> Web (`frontend/`, React SPA storefront) **vs** Mobile (`mobileapp/`, Flutter).
> Date: **2026-09-01** (refresh — supersedes the 2026-08-31 audit).
> Scope: customer-facing storefront only. Admin (`/admin/*`) is web-only by design — out of scope.
> Legend: ✓ Complete · ⚠ Partial · ✗ Missing · 🐛 Broken / fake data

This audit is a snapshot of gaps. **Nothing here is being fixed in this pass.**

Since the last audit, mobile got: real address CRUD, a profile-edit screen, a real
wallet screen (fake data removed), a real notifications feed, `url_launcher`
dial/maps, banner tap-target mapping, orphaned-route cleanup, and a full
design-system pass. Web got the order **status timeline** (ported from mobile).
All reflected below.

---

## 0. Executive summary

| Area | Verdict | One-liner |
|---|---|---|
| Browse → cart → pay → track | ✓ | Native, real API, all states, 100 widget/unit tests. |
| Auth (phone → OTP → JWT) | ✓ | Real. Terms/Privacy still plain text (🐛 minor). |
| Address CRUD | ✓ | Real `POST` / `DELETE /customers/me/addresses`. No edit / set-default endpoint (backend gap, parity with web). |
| Profile edit | ✓ | `ProfileEditScreen` → `PUT /customers/me/profile`. |
| Wallet | ⚠ | Real balance + referral code. No transaction history / top-up — **no backend route** (web's wallet drawer is a hardcoded `₹0` stub, so mobile is ahead). |
| Notifications (in-app) | ⚠ | Real activity feed from order timelines + bell entry point. No dedicated endpoint, no push (FCM). Web has nothing. |
| Reviews (read + write) | ✗ | PDP shows a rating number only. **No customer review endpoint** (staff moderation only). |
| Order cancel | ✗ | No UI and **no `POST /orders/:id/cancel` route**. |
| Content pages (Offers, Brands, Blog, About, Legal, Help/FAQ, Careers) | ✗ | Not built on mobile. Backend has `/blogs`, `/brands`. |
| Payments (Razorpay / Wallet / COD) | ✓ | Real gateway + HMAC verify + webhook. |
| Push notifications (FCM) | ✗ | No `firebase_*` deps, no `POST_NOTIFICATIONS`, no token routes. |
| Deep links / app links | ✗ | No `intent-filter` host, no `go_router` deep-link config, no `share_plus`. |
| Offline / force-update / maintenance | ✗ | No `connectivity_plus`, no `GET /app/config`. |
| Filters / sorting | ⚠ | Organic + 4 sorts. No price-range, brand, in-stock, discount-sort, pagination. |
| Permissions | ⚠ | Location handled ad-hoc via `geolocator`; no `permission_handler`, no rationale, no "open settings". |
| Stores | ⚠ | Hardcoded list on **both** platforms (no endpoint). Mobile now has Call + Directions. |
| WhatsApp / Bookings / Enquiries / Quotes | n/a | Not in web either (grocery quick-commerce). |

---

## 1. Pages

Mobile routes: `/splash /onboarding /login /otp /location_select` · tabs
`/ /categories /search /orders /account` · pushed `/category/:id /product/:id
/cart /checkout /order-placed/:id /order/:id /tracking/:id /wishlist /wallet
/membership /support /addresses /stores /notifications /account/edit /search_detail`.

| Web page / route | Mobile equivalent | Status | Notes |
|---|---|---|---|
| `/` Home | `HomeScreen` | ✓ | Real banners / categories / special-groups / products; curated + per-category rails. |
| `/categories` | `CategoriesScreen` (tab) | ✓ | Per-category sections + subcategory tiles + trending cloud. |
| `/products`, `/category/:slug` (listing) | `CategoryCatalogScreen` (`/category/:id`) | ⚠ | No all-products `/products` view; no pagination; fewer filters (§8). |
| `/product/:id`, `/prn/:slug/prid/:id` | `ProductDetailsScreen` | ⚠ | Full PDP; **no reviews section**, no SEO slug route. |
| `/brands` | — | ✗ | `GET /api/brands` unused on mobile. |
| `/offers` | — (coupons only inside Cart) | ✗ | No offers / coupon browse page. |
| `/blog`, `/blog/:id` | — | ✗ | `GET /api/blogs` unused. |
| `/about` | — | ✗ | Not built. |
| `/legal`, `/s/terms-of-service`, `/s/privacy-policy` | — | 🐛 | Login shows "Terms of Service and Privacy Policy" as **plain text — no link, no screen**. |
| `/help`, `/support` | `SupportScreen` | ⚠ | Socket chat only; no FAQ / help-centre content, no ticket history. |
| `/careers` | — | ✗ | Not built (low priority). |
| `/stores` | `StoresScreen` | ⚠ | Hardcoded 3 stores on **both** platforms (no endpoint). Mobile adds Call / Directions. |
| `/locations`, `/saved-addresses`, `/account/addresses` | `AddressesScreen` | ✓ | Real add / delete / select. |
| `/orders`, `/account/orders` | `OrdersListScreen` (tab) | ✓ | Both real now; mobile has Active/Past split + reorder + thumbnails. |
| `/profile`, `/account/profile` | `ProfileScreen` (tab) + `ProfileEditScreen` | ✓ | Menu + Edit → `PUT /customers/me/profile`. Web also has delete-account (mobile ✗). |
| — (web `CustomerProfileDrawer` shows a wallet stub) | `WalletScreen` (`/wallet`) | ⚠ | Real balance + funding note + referral copy. No txns / top-up (no endpoint). |
| — | `NotificationsScreen` (`/notifications`) | ⚠ | Real feed from order `trackingTimeline`s; bell in Home header + Profile row. |
| — | `MembershipScreen` (`/membership`) | ⚠ | Static benefits; **no join / upgrade action**. |
| — | `WishlistScreen` (`/wishlist`) | ✓ | Reachable from a Profile menu row; grid + remove-× + "Add all". |
| Quick-view modal (from cards) | — | ⚠ | Mobile taps straight through to PDP. |
| Festival campaign themed Home (mobile-web) | — | ✗ | `FestivalCampaignWrapper` not ported. `GET /festival-campaigns/active` unused. |

---

## 2. Navigation

| Item | Status | Notes |
|---|---|---|
| Bottom nav (5 tabs, all labels, persistent) | ✓ | Rebuilt — full-width flat bar, never hides. |
| Full-screen routes above the tab shell | ✓ | cart, checkout, PDP, tracking, wallet, etc. |
| Auth redirect guard (unauth → `/login`) | ✓ | `redirect` in `routerProvider`. |
| Re-tap active tab → pop to root | ✓ | |
| Hardware back: non-home tab → Home; Home root → exit-confirm | ✓ | `MainScaffold` `PopScope`. |
| Orphaned routes | ✓ | `/location` + `/map_selection` deleted; `/wishlist` + `/notifications` now have entry points. |
| Banner / promo tap targets | ✓ | `resolveAppRoute()` maps CMS links; unmappable → non-tappable. |
| "See all" / category / subcategory links | ✓ | Resolve to `/category/:id(?sub=)`. |
| Profile → wallet / addresses / stores / support / membership / wishlist / notifications / edit | ✓ | All wired. |
| Deep-linked route while signed out | ⚠ | Bounces to `/login`; **no return-to-intended-route** after sign-in. |
| Deep links from outside the app | ✗ | See §26. |

---

## 3. Authentication

| Item | Status | Notes |
|---|---|---|
| Phone → OTP → verify → customer JWT | ✓ | Real `/customers/otp/send` + `/otp/verify`, 30-day token. |
| `OtpField` (6-box, paste, backspace, auto-submit, resend timer, test-mode banner) | ✓ | |
| Token secured; Bearer on requests; 401 → logout → `/login` | ✓ | `TokenStore` + Dio interceptor. |
| Splash routes on real hydrated state | ✓ | |
| Logout clears token + cart / wishlist / recent-search caches | ✓ | Best-effort. |
| "Continue = agree to Terms/Privacy" | 🐛 | Plain text; no legal screen (§1). |
| Rate-limit / lockout messaging | ⚠ | Backend enforces; mobile shows the generic error string, no "try again in Ns". |
| Account deletion | ✗ | Web has it (`DELETE /customers/:id`, open route). Mobile has no UI. |
| Biometric app-lock | ✗ | Not present. |

---

## 4. Forms

| Form | Status | Notes |
|---|---|---|
| Phone field (`+91`, grouping, 10-digit) | ✓ | `PhoneField`. |
| OTP input | ✓ | `OtpField`. |
| Coupon code entry (Cart) | ✓ | `AppTextField` + Apply → server `validateCoupon`. |
| Add-address form (label / house / area / city / pincode) | ✓ | `AppBottomSheet` + `AppTextField`, validated → real `POST`. |
| Profile edit (name / email) | ✓ | `ProfileEditScreen`, validated → real `PUT`. |
| Location-select address fields (house / landmark) | ⚠ | Still raw `TextField` inside `location_select` (not `AppTextField`). |
| Support chat input | ⚠ | Bare `TextField` in a pill container (not `AppTextField`). |
| Search field | ✓ | Debounced, recents, clear, `textInputAction: search`. |
| Field-level validation + inline errors | ✓ (auth / address / profile) / ⚠ (elsewhere) | `AppTextField` supports `errorText`. |

---

## 5. API integration

`ApiService` (mobile): `sendOtp, verifyOtp, fetchMe, updateMyProfile, addAddress,
deleteAddress, fetchBanners, fetchCategories, fetchSpecialGroups, fetchProducts,
fetchProduct, fetchSettings, fetchCoupons, validateCoupon, createOrder,
createRazorpayOrder, verifyPayment, walletDebit, fetchMyOrders, fetchOrder`.

| Endpoint | Mobile | Status |
|---|---|---|
| `GET /categories /products /products/:id /banners /special-groups /settings /coupons` | wired | ✓ |
| `POST /coupons/validate` | wired | ✓ |
| `POST /orders`, `GET /orders/mine`, `GET /orders/:id` | wired | ✓ |
| `POST /customers/otp/*`, `GET /customers/me` | wired | ✓ |
| `PUT /customers/me/profile` | `ProfileEditScreen` | ✓ |
| `POST` / `DELETE /customers/me/addresses[/:id]` | `AddressesScreen` / `location_select` | ✓ |
| `POST /customers/me/wallet/debit` | checkout wallet path | ✓ |
| `POST /payment/create-order` + `/payment/verify` + webhook | wired | ✓ |
| `GET /brands` | — | ✗ unused |
| `GET /blogs` | — | ✗ unused |
| `GET /festival-campaigns/active` | — | ✗ unused |
| Product reviews (`GET/POST /products/:id/reviews`) | — | ✗ **route does not exist** |
| Order cancel (`POST /orders/:id/cancel`) | — | ✗ **route does not exist** |
| Notifications list / mark-read | — | ✗ **route does not exist** |
| Wallet transactions (`GET …/wallet/transactions`) | — | ✗ **route does not exist** |
| Wallet top-up (`PUT /customers/:id/wallet`) | — | ✗ exists but `protect` (staff) — not customer-callable |
| Device tokens (FCM) | — | ✗ **route does not exist** |
| `GET /api/app/config` (force-update / maintenance) | — | ✗ **route does not exist** |
| `GET /api/stores` | — | ✗ **route does not exist** (static on both platforms) |
| Offline degrade | ⚠ | Catalog throws typed `ApiException` (no fake data) ✓; **no offline banner / retry-with-backoff / connectivity awareness**. |

---

## 6. CRUD operations

| Entity | Create | Read | Update | Delete | Status |
|---|---|---|---|---|---|
| Cart items | ✓ | ✓ | ✓ qty ± | ✓ swipe / clear | ✓ (local Hive, matches web localStorage) |
| Wishlist | ✓ heart | ✓ | — | ✓ heart / ×-overlay | ✓ (local only; web is also local) |
| Coupon on cart | ✓ apply | ✓ list | — | ✓ remove | ✓ |
| Addresses | ✓ real `POST` | ✓ list + select | ✗ (no PUT endpoint; parity w/ web) | ✓ real `DELETE` | ✓ |
| Profile (name / email) | — | ✓ | ✓ `PUT /me/profile` | ✗ delete-account | ⚠ (no delete on mobile) |
| Orders | ✓ place | ✓ list + detail | ✗ no cancel | — | ⚠ |
| Reviews | ✗ | ✗ | ✗ | ✗ | ✗ (no endpoint) |
| Support tickets | ⚠ chat send | ⚠ live only | — | — | ⚠ no persisted ticket list |

---

## 7. Search

| Item | Status | Notes |
|---|---|---|
| Server-side search (`?search=`) | ✓ | `searchProductsProvider`. |
| Debounce (350 ms) | ✓ | |
| Recent searches (persisted, cap 8) | ✓ | `StorageService` + `recentSearchesProvider`. |
| Trending terms from live catalog | ✓ | Category + subcategory names. |
| Clear button | ✓ | |
| Autofocus when opened from the Home pill | ✓ | `/search_detail`. |
| Result grid + count + empty state | ✓ | |
| Voice search | ✗ | Mic icon in `CustomSearchBar` is decorative. |
| Suggestions endpoint | ✗ | Not present (web doesn't have it either). |

---

## 8. Filters

| Filter | Web | Mobile | Status |
|---|---|---|---|
| Organic only | ✓ | ✓ (bottom sheet) | ✓ |
| Subcategory | ✓ | ✓ (chip strip) | ✓ |
| Category | ✓ | ✓ (route) | ✓ |
| Price range (min/max) | server supports `minPrice/maxPrice` | ✗ | ✗ |
| Brand | ✓ (text match) | ✗ | ✗ |
| In-stock only | ⚠ | ✗ | ✗ |
| Active-filter indicator | — | ✓ (dot on tune icon) | ✓ |
| Clear-filters affordance | — | ✓ (in empty state) | ✓ |

---

## 9. Sorting

| Sort | Web | Mobile | Status |
|---|---|---|---|
| Popular / default | ✓ | ✓ | ✓ |
| Price low→high / high→low | ✓ | ✓ | ✓ |
| Rating | ✓ | ✓ | ✓ |
| Discount (biggest saving) | ✓ | ✗ | ✗ |
| Applied-sort shown in count line | — | ✓ | ✓ |

---

## 10. Images

| Item | Status | Notes |
|---|---|---|
| Product cards / PDP gallery / cart rows / order thumbs / banners / special groups / onboarding | ✓ | `CachedNetworkImage` + `errorWidget` fallbacks; grey-box placeholder. |
| PDP multi-image gallery (`ProductModel.gallery`) | ✓ | PageView + dots + Hero. |
| Category tiles | ⚠ | Icon glyphs, not photos. **No subcategory image field from the API.** |
| Fallback icon selection | ⚠ | `_getProductIcon(imageUrl)` / `iconFor()` string heuristics → generic basket common. |
| Broken-image handling | ✓ | Everywhere. |

---

## 11. Uploads

| Item | Status | Notes |
|---|---|---|
| Any customer-facing upload (profile photo, review photo, complaint attachment) | n/a | Neither web nor mobile has customer uploads. Nothing to port. |

---

## 12. Profile / Account

| Item | Status | Notes |
|---|---|---|
| View name / phone / VIP badge | ✓ | |
| Edit name / email | ✓ | `ProfileEditScreen`. |
| Wallet balance | ✓ | Real (`user.walletBalance`). |
| Wallet transaction history | ✗ | No customer endpoint. Screen shows a funding explainer instead of fake rows. |
| Wallet top-up | ✗ | No customer endpoint. |
| Membership / VIP | ⚠ | Static benefits page; no join / renew. |
| Saved addresses | ✓ | Real CRUD. |
| Store locations | ⚠ | Static list; Call + Directions actionable. |
| Support | ⚠ | Socket chat only. |
| Notifications centre | ⚠ | Real feed (order timelines); bell + menu entry points. |
| Wishlist | ✓ | Menu row. |
| Dark-mode toggle | ✓ | Persisted via `StorageService`. |
| Language / units / other settings | ✗ | India-English only. |
| Logout | ✓ | Confirm modal; clears token + local caches. |
| Delete account | ✗ | Web has it; mobile doesn't. |
| Referral code | ✓ | Wallet screen shows the real `referralCode` with copy. |

---

## 13. Orders

| Item | Status | Notes |
|---|---|---|
| List real customer orders | ✓ | `GET /orders/mine`. |
| Active / Past split | ✓ | |
| Status filter tabs | ✗ (mobile) / ✓ (web) | Mobile has the 2-way split only; no dedicated Cancelled view. |
| Order card: status, date, thumbnails, total, address | ✓ | |
| Order detail: status header, timeline, items, bill, delivery/payment | ✓ | |
| Reorder (re-add to cart) | ✓ | List + detail. |
| Track order | ✓ | → `/tracking/:id`. |
| Cancel order | ✗ | No UI; **no `POST /orders/:id/cancel` route**. |
| Download / view invoice | ✗ | Web has a stub "Download Invoice"; mobile none. |
| Rate / review a delivered order | ✗ | No entry point; no endpoint. |
| Empty / loading / error states | ✓ | `SkeletonList` / `ErrorState` / `EmptyState`. |
| Pull-to-refresh | ✓ | |
| Active-order banner on Home | ⚠ | `OrdersNotifier.activeOrder` exists; not surfaced on Home. |

---

## 14. Bookings

| Item | Status | Notes |
|---|---|---|
| Delivery-slot / time selection | ✓ | Cart "Delivery speed" radio (Instant / Evening) → carried into checkout. |
| Any other "booking" concept | n/a | Grocery quick-commerce — none in web either. |

---

## 15. Enquiries

| Item | Status | Notes |
|---|---|---|
| Enquiry / contact form | n/a | Not in web. Closest is the Support chat (⚠). |

---

## 16. Quotes

| Item | Status | Notes |
|---|---|---|
| Quote request / RFQ | n/a | Not applicable to this product. |

---

## 17. Call

| Item | Status | Notes |
|---|---|---|
| `url_launcher` / dialer intent | ✓ | `url_launcher: ^6.2.5` + `core/utils/launch.dart` + manifest `<queries>` for `tel:` / `https`. |
| Store phone numbers | ✓ | **Call** button → `dialPhone`. |
| Store directions | ✓ | **Directions** → `openMaps` (Google Maps web URL). |
| Rider "call" on tracking | ✓ | Wired to `dialPhone(riderPhone)`. |
| Support phone (`tel:` on web) | ✗ | Not surfaced on mobile (chat only). |

---

## 18. WhatsApp

| Item | Status | Notes |
|---|---|---|
| `wa.me` / WhatsApp deep link | n/a | Not in web; no requirement identified. |

---

## 19. Notifications

| Item | Status | Notes |
|---|---|---|
| In-app notification list | ⚠ | Real activity feed derived from order `trackingTimeline`s (newest first, tap → `/order/:id`). **No dedicated `/notifications` endpoint** exists. Web has no notifications feature at all. |
| Entry point | ✓ | Home-header bell + Profile menu row. |
| Read / unread state | ✗ | Feed is derived, not stored. |
| Push notifications (FCM) | ✗ | No `firebase_core` / `firebase_messaging`; no `POST_NOTIFICATIONS` permission; no `DeviceToken` route; no permission prompt. |
| Notification tap → deep link | ✗ | No deep-link handling. |
| Toast / transient feedback | ✓ | `AppToast` (success / error / info / warning) app-wide. |
| Order-status push on transitions | ✗ | Server emits socket `order_status_update`; no push. |

---

## 20. Payments

| Item | Status | Notes |
|---|---|---|
| Razorpay native checkout (UPI / Card / Netbanking) | ✓ | `razorpay_flutter`, `PaymentGateway` + `RazorpayGateway`. |
| Wallet payment (balance gate + server debit) | ✓ | `walletDebit`; tile disabled + "Low balance" when short. |
| COD | ✓ | Places order with `paid:false`. |
| Payment failure / cancel → no order created | ✓ | `CheckoutController` state machine. |
| Processing overlay with stage text | ✓ | `LoadingOverlay`. |
| Server-side HMAC signature verification + webhook | ✓ | Real. |
| Retry after failure | ⚠ | Toast + reset to idle; user re-taps "Place order". No explicit retry CTA. |
| Saved cards / UPI IDs | ⚠ | Static tiles; Razorpay sheet handles instruments. |
| Wallet top-up via Razorpay | ✗ | Not built (no customer endpoint). |
| Order status reflects verified payment | ✓ | Backend gates on verification. |

---

## 21. Settings

| Item | Status | Notes |
|---|---|---|
| Dark mode | ✓ | Toggle in Profile, persisted. |
| Notification preferences | ✗ | No push, so nothing to configure. |
| Delivery-address default | ⚠ | No set-default endpoint; `selectedAddress` (client) is the checkout source of truth. |
| Environment config (`API_BASE_URL`, `ENV`) | ✓ | `AppConfig` via `--dart-define`. |
| Force-update / maintenance gate | ✗ | No `GET /api/app/config`; no `ForceUpdateDialog` / `MaintenanceScreen`. |
| Language / region | ✗ | Hardcoded India-English; not structured for l10n. |
| Clear cache / data | ⚠ | `StorageService.clearAll()` exists; no UI (logout uses it). |

---

## 22. Error handling

| Item | Status | Notes |
|---|---|---|
| Typed `ApiException` + Dio interceptor (401 → logout) | ✓ | |
| `ErrorState` (icon + message + `PrimaryButton` retry) on data screens | ✓ | Home, Categories, Catalog, PDP, Search, Orders, Order detail, Wishlist, Notifications. |
| Retry re-invokes provider / `refresh()` | ✓ | |
| Toast on action failure (cart cap, coupon invalid, checkout fail, address save, dial fail) | ✓ | `AppToast`. |
| Retry-with-backoff for idempotent GETs | ✗ | Not implemented. |
| Offline banner / connectivity awareness | ✗ | `connectivity_plus` absent. |
| Global crash reporting (Crashlytics / Sentry) | ✗ | Not present. |
| `location_select` reverse-geocode / GPS failures | ⚠ | Swallowed silently (`catch (_) {}`); falls back to a hardcoded Hyderabad address string. |
| Account sub-screens with no network (membership / stores) | n/a | Static content. |

---

## 23. Loading states

| Screen | Status | Notes |
|---|---|---|
| Home / Categories / Catalog / PDP / Search / Wishlist / Orders / Order detail / Notifications | ✓ | Skeleton family (`SkeletonList` / `SkeletonGrid` / `ProductRailSkeleton` / `_*Skeleton`). |
| Checkout processing | ✓ | `LoadingOverlay` + stage text. |
| Coupon apply / address save / profile save | ✓ | Inline spinner / `LoadingOverlay`. |
| Splash hydration | ✓ | Awaits `ensureHydrated()`; hardcoded 2.2 s floor (P2). |
| Wallet / Membership / Stores | n/a | Static — no fetch. |
| Support chat send | ⚠ | No pending/sent indicator on the bubble. |
| Image placeholders | ✓ | Calm grey box (was a spinner). |

---

## 24. Empty states

| Screen | Status | Notes |
|---|---|---|
| Cart / Wishlist / Orders / Search / Category catalog / Categories / Home / Addresses / Notifications | ✓ | `EmptyState` (icon-in-circle, h3, body, `PrimaryButton` action). |
| `location_select` (no saved addresses) | ⚠ | Plain grey sentence, not the `EmptyState` component. |
| Support chat | ⚠ | Seeded with one hardcoded agent greeting (never truly empty). |
| Wallet transactions | n/a | No history section (no endpoint). |

---

## 25. Back navigation

| Item | Status | Notes |
|---|---|---|
| `AppScaffold` back (pop), icon size 20, left title | ✓ | Consistent across pushed routes. |
| Login back → pop-or-`/onboarding` | ✓ | |
| OTP back → pop to login | ✓ | |
| `location_select` `_leave()` = pop-or-`/` | ✓ | Works whether reached via `go` (sign-in) or `push` (in-app). |
| Order-placed hardware back → `/` (no dead-end) | ✓ | `PopScope`. |
| Tracking back → pop-or-`/orders` | ✓ | |
| Tab hardware-back rules | ✓ | Non-home → Home; Home → exit-confirm. Verified by `navigation_test.dart`. |
| Nested push/pop within a tab survives a tab switch | ✓ | |
| Post-login "return to intended deep link" | ✗ | Always lands on `/`. |

---

## 26. Deep links

| Item | Status | Notes |
|---|---|---|
| Android `intent-filter` for `https://` app links / custom scheme | ✗ | Manifest has only `MAIN`/`LAUNCHER` + a `<queries>` block for `url_launcher`. No `android:host` / `autoVerify`. |
| iOS associated domains / `apple-app-site-association` | ✗ | Not configured. |
| `go_router` deep-link parsing (product / order / tracking) | ✗ | Routes are internal-only. |
| Web SEO URLs (`/prn/:slug/prid/:id`, `/s/privacy-policy`) → mobile | ✗ | No equivalents. |
| Notification payload → screen routing | ✗ | No push. |
| Share product / order (`share_plus`) | 🐛 | PDP "share" copies a **plain summary string** to the clipboard — no URL, no deep link. `share_plus` not a dependency. |
| `assetlinks.json` / domain hosting | ✗ | Not set up. |

---

## 27. Permissions

| Permission | Status | Notes |
|---|---|---|
| Location (`ACCESS_FINE/COARSE_LOCATION`) | ⚠ | Declared. Requested ad-hoc via `geolocator` in `location_select`; **no `permission_handler`**, no rationale sheet, no "open settings" when permanently denied. |
| Notifications (`POST_NOTIFICATIONS`, Android 13+) | ✗ | Not declared; no runtime prompt (no push feature). |
| Camera / storage / contacts / microphone | n/a | No feature needs them. |
| iOS `Info.plist` usage strings | ⚠ | Not audited; at minimum a location string is required for the App Store. |
| Permission-denial handled gracefully | ⚠ | `location_select` shows a SnackBar "enable GPS"; no route to app settings. |

---

## 28. Prioritised gap list (for a future fix phase — not started)

### P0 — user-facing gaps on the core journey
1. ✗ **Reviews** on PDP (read list + write from a delivered order). **Needs a backend route first** (`GET/POST /products/:id/reviews` — model `Review` exists, only staff moderation is exposed).
2. ✗ **Order cancel** with reason + wallet refund. **Needs `POST /orders/:id/cancel`** (does not exist).
3. 🐛 **Legal**: make the login "Terms / Privacy" text real links to a bundled Legal screen.
4. ✗ **Offline resilience**: `connectivity_plus` banner + retry-with-backoff; `GET /api/app/config` for force-update / maintenance.

### P1 — parity & completeness
5. ✗ **Push notifications** (FCM): `firebase_core` + `firebase_messaging`, `POST_NOTIFICATIONS`, `DeviceToken` route + `firebase-admin` send hooked into `orderController.updateStatus`, permission prompt, tap → deep link.
6. ✗ **Wallet**: `GET …/wallet/transactions` + a customer-scoped top-up (Razorpay) — both need backend routes.
7. ⚠ **Filters**: price-range (`minPrice/maxPrice` already server-side), brand, in-stock, discount-sort; pagination for large categories.
8. ⚠ **Orders**: status-filter tabs (All / In Transit / Delivered / Cancelled), active-order banner on Home, invoice.
9. ✗ **Account deletion** on mobile (`DELETE /customers/:id` exists but is an open route — should be secured to `protectCustomer` first).
10. ⚠ **Membership**: a real join / upgrade action.
11. ✗ **Content pages**: Offers, Brands, Blog + detail, About, Help-Centre FAQ.

### P2 — polish & platform
12. ✗ **Deep links / app links**: `intent-filter` + associated domains + `assetlinks.json`; `share_plus` with real product/order URLs.
13. ⚠ **Permissions**: `permission_handler` + rationale + "open settings" for location; iOS `Info.plist` strings.
14. ✗ **Festival campaign theming** on Home (`GET /festival-campaigns/active`).
15. ✗ **Analytics + crash reporting** (Firebase Analytics + Crashlytics, or Sentry).
16. ⚠ **`location_select`** address fields → `AppTextField`; reverse-geocode failures surfaced, not swallowed.
17. ⚠ **Category imagery**: no subcategory image field from the API → tiles stay icon-only until the backend adds one.
18. ⚠ **Support**: FAQ / help content + persisted ticket history (`SupportTicket` model exists); pending/sent indicators on chat bubbles.
19. ⚠ **Search**: wire or remove the decorative mic; delete the now-dead `quantity_selector.dart`.

---

## 29. What is solid (no action needed)

- Auth (phone → OTP → JWT), splash routing, onboarding.
- Browse: Home, Categories, Category catalog, PDP, Search, Wishlist — real data, 5 states each, native layouts.
- Cart → Checkout → Payment (Razorpay / Wallet / COD) → Order placed → Orders list → Order detail → Tracking.
- Address CRUD, Profile edit, Wallet (balance + referral), Notifications feed, Stores (Call / Directions) — on real APIs where the backend supports it, no fabricated data.
- Design-system consistency (flat, one bottom nav, one stepper, `AppScaffold` / `AppToast` / `AppModal` / `AppBottomSheet` / skeletons / `LoadingOverlay`, contrast-safe tokens).
- Back-navigation correctness (tabs, nested stacks, funnel exits).
- 100 passing widget/unit tests; `flutter analyze` clean; debug APK builds.
