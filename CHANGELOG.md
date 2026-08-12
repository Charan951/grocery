# Changelog

All notable changes to the FreshCart monorepo (`backend/`, `frontend/`, `mobileapp/`) are documented here.

This project doesn't yet follow a formal release/versioning scheme (no tags, no per-app version bumps beyond the Flutter app's default `1.0.0+1`), so entries below are grouped by git commit rather than semantic version. Dates/times are taken from git commit metadata. See [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) for a full architectural reference and a detailed "Known Issues" list.

---

## [Unreleased] — Known Issues Snapshot (as of 2026-08-05)

Not new work — a summary of defects present in the current codebase, useful as a starting punch list. Full detail in [KNOWLEDGE_BASE.md §5](KNOWLEDGE_BASE.md#5-cross-cutting-concerns--known-issues).

### Backend
- `ReferenceError: mongoose is not defined` risk in `apiController.js` (missing import) affecting product-by-id lookup/update/delete and the dashboard status endpoint.
- `PUT /api/orders/:id/status` throws — `Order.trackingTimeline` is used but not declared in the schema.
- Dashboard revenue stats compute as `NaN` — code reads `order.grandTotal`, schema field is `totalAmount`.
- `inventoryController.adjustStock` overwrites `Product.stock` (an object) with a bare number.
- `POST /api/payment/verify` always reports `verified: true`, regardless of the real Razorpay signature check.
- Several mutating routes have no auth middleware: `/api/special-groups`, `/api/banners`, `/api/customers/:id` (profile/addresses/delete).
- `GET /api/orders` and `GET /api/reviews` are fully public, exposing customer PII and unmoderated reviews.
- `AuditLog` is never populated (`logAudit()` helper exists but is never called) despite full CRUD routes for it.
- Customer "auth" (`POST /api/customers/auth`) performs no real OTP verification.

### Frontend
- `HelpCenter.tsx` and `Locations.tsx` are built but not routed (dead code).
- Two separate admin product-CRUD surfaces (`pages/admin/Products.tsx` and the AdminCMS "products" tab) with divergent field sets.
- Checkout/payment flow is fully simulated client-side (no real Razorpay modal).
- Admin route protection is a single client-side boolean (`localStorage.admin_user` presence), not a real guard.

### Mobile app
- `/profile` and `/stores` are not registered in `app_router.dart`, though `home_screen.dart` navigates to `/profile` — will throw at runtime.
- `StoresScreen` is fully implemented but orphaned (no route, no menu entry).
- Auth flow (`authProvider`) is entirely mocked — app boots pre-authenticated as a demo user regardless of real login state.
- Only the Home screen uses reactive API providers; every other catalog screen reads a `MockDataService` snapshot fetched once at startup, so backend changes don't propagate without an app restart.

### Repository hygiene
- `.gitignore` does not exclude `node_modules/`, `build/`, or `.dart_tool/` — over 10,000 dependency/build files are committed to git history.

---

## [2026-08-03] — "hello" (`e26be19`)

*58 files changed, +9,906 / −3,324*

Major feature push across both backend and frontend, primarily focused on completing the storefront-to-order pipeline and richer admin content tooling.

### Backend
- Rewrote product seeding (`scripts/seedProducts.js` added; `src/config/seed.js` trimmed) with a larger, more realistic catalog.
- Substantially expanded `apiController.js` (+559 lines) — added/extended order creation and lifecycle handling, customer profile/address/wallet endpoints, and payment endpoints.
- Extended `Catalog`, `Customer`, `Inventory`, and `Order` models with additional fields to support the richer product/order/customer flows.
- Added 62 lines of new routes to `src/routes/api.js` to cover the newly added controller functions.

### Frontend
- Added a full customer-facing account layer: `CustomerAuthModal.tsx` (phone/OTP login), `CustomerProfileDrawer.tsx`, `CustomerAddresses.tsx`, `CustomerProfile.tsx`, `CustomerOrders.tsx`, `CustomerSupport.tsx` pages.
- Added `CheckoutModal.tsx` (checkout flow with simulated Razorpay payment) and `OrderSuccessModal.tsx` (post-purchase confirmation with confetti + tracking countdown).
- Added `FloatingCartBar.tsx` (persistent cart summary pill).
- Rewrote `LocationModal.tsx` (718 lines changed) for address selection.
- Significantly reworked `CMSContext.tsx` (+911 lines) — the central data/state hub — to support the new customer-facing flows alongside existing admin CMS data.
- Reworked `Header.tsx` (346 lines changed) and `AdminCMS.tsx` (750 lines changed) to integrate the new customer account entry points and expanded admin content management.
- Updated `CartDrawer.tsx` and `ProductCard.tsx` to integrate with the new checkout/account flows.

---

## [2026-07-31 14:16] — "Created category and subcategory CRUD" (`d5340af`)

*18 files changed, +1,580 / −598*

Introduced full category/subcategory management on both ends.

### Backend
- Added category and subcategory CRUD routes to `src/routes/api.js` (33 new lines).
- Adjusted `index.js` and `src/config/db.js` (connection handling/DNS workaround groundwork).

### Frontend
- Added `LocationModal.tsx` (new file, 502 lines) for delivery-location selection.
- Extended `CMSContext.tsx` (+206 lines) with category/subcategory state and CRUD methods.
- Reworked `pages/admin/Modules.tsx` (389 lines changed) to add the Categories/SubCategories admin modules.
- Updated `pages/AdminCMS.tsx` (379 lines changed), `pages/Home.tsx` (263 lines changed), and `components/Header.tsx`/`AdminLayout.tsx` to surface the new category/subcategory management and location-selection UI.
- Minor updates to `ProductDetails.tsx`, `admin/Dashboard.tsx`, `admin/Products.tsx`, `index.css`.

---

## [2026-07-31 10:01] — "first commit" (`766a477`)

*10,751 files changed, +1,458,356*

Initial import of the project: three-app monorepo scaffold.

- **`backend/`**: Express + Mongoose API scaffold — models (`Catalog`, `Customer`, `Finance`, `Inventory`, `Operations`, `Order`, `User`), controllers, routes, auth middleware, Cloudinary/DB config, seed script.
- **`frontend/`**: React + TypeScript + Vite storefront and admin CMS scaffold — routing, `CMSContext`, core pages (Home, Products, ProductDetails, Brands, Offers, Blog, About, Careers, Stores, Legal) and admin pages (Dashboard, Login, Modules, Orders, Products).
- **`mobileapp/`**: Flutter "FreshCart" app scaffold — Clean Architecture layout (`core/` + `features/`), Riverpod controllers, GoRouter routes, Hive storage, full glassmorphism design system, and all initial feature screens (onboarding, auth, home, categories, products, cart, checkout, tracking, profile, wallet, membership, support, search, wishlist). See [`mobileapp/walkthrough.md`](mobileapp/walkthrough.md) for the author's original narrative summary of this scaffold.
- Note: this commit also checked in `node_modules/` and platform build output for all three apps (see [KNOWLEDGE_BASE.md §6](KNOWLEDGE_BASE.md#6-repository-hygiene-notes)) — 10,241 of the 10,751 changed files are `node_modules` dependencies, not authored source.
