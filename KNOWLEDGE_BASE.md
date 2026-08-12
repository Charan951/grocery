# FreshCart — Knowledge Base

> Generated 2026-08-05 by reading every source file in the repository. This is a monorepo containing three applications that together form a Zepto/Blinkit-style quick-commerce grocery platform:
>
> | App | Path | Stack | Role |
> |---|---|---|---|
> | **Backend API** | [`backend/`](backend/) | Node.js (ESM) + Express + MongoDB/Mongoose | REST API + Socket.IO server used by both the frontend and the mobile app |
> | **Frontend** | [`frontend/`](frontend/) | React 19 + TypeScript + Vite + Tailwind v4 | Customer storefront **and** the admin/ops CMS console, in one SPA |
> | **Mobile app** | [`mobileapp/`](mobileapp/) | Flutter (Dart) + Riverpod + GoRouter | "FreshCart" customer mobile app (Android/iOS/Web via Flutter) |

Each app can run **independently of the backend** — both the frontend and the mobile app ship with hardcoded/mock seed data and silently fall back to it whenever the API is unreachable. Keep this in mind when debugging: a screen "working" is not proof the backend call behind it succeeded.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Backend (`backend/`)](#2-backend-backend)
3. [Frontend (`frontend/`)](#3-frontend-frontend)
4. [Mobile App (`mobileapp/`)](#4-mobile-app-mobileapp)
5. [Cross-Cutting Concerns & Known Issues](#5-cross-cutting-concerns--known-issues)
6. [Repository Hygiene Notes](#6-repository-hygiene-notes)

---

## 1. System Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│   frontend/ (React)  │        │  mobileapp/ (Flutter) │
│  storefront + admin  │        │   customer app only   │
└──────────┬───────────┘        └──────────┬────────────┘
           │  fetch() REST + (admin) JWT    │  Dio REST + Socket.IO
           │  (mostly localhost:5000/api)   │  (10.0.2.2:5000/api on Android emulator)
           ▼                                ▼
                 ┌────────────────────────────────┐
                 │   backend/ (Express + Mongoose)  │
                 │   /api/*  +  Socket.IO server    │
                 └───────────────┬──────────────────┘
                                 ▼
                        MongoDB Atlas (Mongoose)
                 Cloudinary (images) · Razorpay (payments)
```

- Both clients talk to the **same** backend REST surface (`/api/...`), but neither depends on it being up — they degrade to local mock/seed data.
- Real-time (Socket.IO) is wired on the server (`join_order_room`, `support_message_send`/`support_message_received`) and consumed by the mobile app (`SocketService`), but **no backend controller ever emits an event**, so live order-status push notifications are not actually connected end-to-end today (see [§5](#5-cross-cutting-concerns--known-issues)).
- There is no API gateway/shared contract package — the REST shape is implicitly shared by convention between `backend/src/routes/api.js`, `frontend/src/context/CMSContext.tsx` (+ various pages), and `mobileapp/lib/core/services/api_service.dart`.

---

## 2. Backend (`backend/`)

**Package**: `backend` v1.0.0, "Enterprise Grocery Dashboard Backend", ESM (`"type": "module"`).

**Entry point**: [`backend/index.js`](backend/index.js) → boots Express + a raw `http.Server` + a Socket.IO server on the same port, connects Mongo, seeds defaults, mounts `/api`.

### 2.1 Dependencies

| Package | Actually used? |
|---|---|
| `express`, `mongoose`, `cors`, `helmet`, `morgan`, `dotenv`, `express-mongo-sanitize` | ✅ core stack |
| `jsonwebtoken`, `bcryptjs` | ✅ auth (though `bcryptjs` is only used inside the `User` model's hook — the direct imports in `apiController.js`/`seed.js` are dead) |
| `cloudinary` | ✅ image upload |
| `razorpay` | ✅ payment order creation/verification (verification is a no-op — see §5) |
| `socket.io` | ✅ server started, but no controller emits to it |
| `firebase-admin`, `redis`, `bullmq`, `express-rate-limit` | ❌ declared in `package.json`, **never imported anywhere** in the codebase |

### 2.2 Middleware stack (`index.js`)

`helmet({contentSecurityPolicy:false})` → `cors()` (fully open) → `morgan('dev')` → `express.json({limit:'50mb'})` → `express.urlencoded({limit:'50mb'})` → `express-mongo-sanitize()` → `/api` router.

- The 50MB body limit exists so base64-encoded images can be POSTed directly to `/api/upload`.
- CORS is wide open (`origin: '*'` on both Express and Socket.IO) — fine for local dev, a concern if ever exposed publicly as-is.
- Global error handler at the bottom returns `{success:false, message}` with `err.status || 500`.

### 2.3 Database connection & offline mode (`src/config/db.js`)

`connectDB()` connects Mongoose to `process.env.MONGO_URI` (falls back to a **hardcoded Atlas URI with embedded credentials** if unset — see §6 secrets note), forces IPv4 (`family:4`), overrides DNS to `8.8.8.8`/`1.1.1.1` to dodge a known Windows SRV-lookup bug, and returns `null` on failure instead of crashing.

If Mongo is unreachable, the server **keeps running**. `src/routes/api.js` installs a fallback middleware that checks `mongoose.connection.readyState`: if not connected, it intercepts requests and returns mocked/empty success responses (e.g. login returns a fake `mock_jwt_token_offline_<ts>`, list endpoints return `[]`, mutations echo `{success:true, offlineMode:true}` without persisting anything). This is the server-side half of the "always works, sometimes fake" philosophy shared by all three apps.

### 2.4 Seeding (`src/config/seed.js`)

Runs once at boot, only if DB connected:
1. **Users** — one seed account per role if `User` collection is empty: `admin@freshcart.com` / `admin123` (Admin), plus Manager/Employee/Delivery/Customer equivalents (`<role>@freshcart.com` / `<role>123`). The Customer seed also gets a linked `Customer` profile with ₹500 wallet balance and referral code `SEEDREF2026`.
2. **Settings** — a default singleton `Settings` doc if none exists.
3. **Categories** — re-seeds (wiping first) if `Category.countDocuments() < 7`: 7 Zepto-style categories (Fruits & Vegetables, Dairy/Bread/Eggs, Atta/Rice/Oil/Dals, Breakfast/Spreads/Sauces, Tea/Coffee/Health Drinks, Ice Creams/Frozen, Chocolates & Sweets), each with rich embedded `subCategories`.
4. **Products** — re-seeds (wiping first) if `Product.countDocuments() < 40`: ~45 detailed products across those categories with Unsplash image URLs.

⚠️ Because these are threshold checks (`< 7`, `< 40`) evaluated **on every boot**, deleting enough categories/products in production could trigger a silent wipe-and-reseed on the next restart.

### 2.5 Auth middleware (`src/middleware/auth.js`)

- `protect` — verifies `Authorization: Bearer <JWT>` (secret from `JWT_SECRET`, fallback hardcoded), loads `req.user` from `User` (password excluded). 401 on missing/invalid/expired token.
- `authorize(...roles)` — RBAC gate; 403 if `req.user.role` not in the allow-list.

### 2.6 Data models (`src/models/`)

Almost all relationships are **loose string-keyed foreign keys** (`categoryId`, `productId`, `customerId` as plain strings), **not** Mongoose `ObjectId` refs — there is no `.populate()` anywhere in the codebase, and no cascade/orphan protection.

| Model | Collection | Key fields | Notes |
|---|---|---|---|
| `Category` | `categories` | `id`, `slug`, `name`, `icon`, `color`, `subCategories[]` (embedded), `displayOrder`, `productCount` | `productCount` is manually incremented/decremented, can drift |
| `Brand` | `brands` | `id`, `name`, `logoUrl`, `productCount` | |
| `Product` | `products` | `id`, `slug`, `categoryId`, `subCategory`, `price`/`mrp`/`discount`, `images[]`, `weightOptions[]`, `highlights{}`, `delivery{}`, `seller{}`, `stock{status,quantity}` | Rich denormalized document; string `categoryId` FK |
| `SpecialGroup` | `specialgroups` | `id`, `title`, `items[]` (embedded promo tiles) | Powers the mobile-style "Special Subcategories" grid |
| `Banner` | `banners` | `title`, `imageUrl`, `linkUrl`, `positionIndex`, `active` | Inter-section homepage banners |
| `Customer` | `customers` | `customerId`, `name`, `email`, `phone` (unique), `membershipType`, `walletBalance`, `addresses[]` (embedded) | Separate identity system from `User` (see §5) |
| `Address` | `addresses` | (same schema as `Customer.addresses[]`) | **Dead** — registered as its own model but never queried; addresses only ever accessed as the embedded array |
| `Coupon` | `coupons` | `code`, `discount`, `minOrder`, `value`, `isPercent`, `active` | |
| `Offer` | `offers` | `id`, `title`, `type` | |
| `Payment` | `payments` | `transactionId`, `orderId`, `amount`, `status`, `gateway` | **Dead** — Razorpay flow never writes to this collection |
| `WalletTransaction` | `wallettransactions` | `customerId`, `amount`, `type` (Credit/Debit) | Written by `customerController.updateWallet` |
| `Invoice` | `invoices` | `invoiceId`, `orderId`, `pdfUrl` | **Dead** — never referenced |
| `Inventory` | `inventories` | `productId`, `warehouseId`, `stockQty`, `lowStockThreshold`, `logs[]` | Separate stock ledger from `Product.stock` |
| `Review` | `reviews` | `productId`, `customerId`, `rating`, `comment`, `status` (Approved/Pending/Rejected) | |
| `Notification` | `notifications` | `userId`, `title`, `body`, `read`, `type` | **Dead** — no routes/controller use it |
| `CMSPage` | `cmspages` | `slug`, `title`, `content`, `status`, `seoMetadata{}` | **Dead** — fully unused, no routes |
| `Blog` | `blogs` | `id`, `title`, `excerpt`, `content`, `author{}`, `category` | |
| `Settings` | `settings` | `businessName`, `taxPercent`, `deliveryFeeRule`, `gatewayKeys{}`, `notificationsEnabled` | Singleton doc |
| `AuditLog` | `auditlogs` | `userId`, `action`, `details`, `ipAddress`, `timestamp` | Full CRUD routes exist, but the `logAudit()` helper that would populate it is **never called** — collection is always empty |
| `SupportTicket` | `supporttickets` | `ticketId`, `customerId`, `status`, `priority`, `messages[]` (embedded) | |
| `Order` | `orders` | `orderId`, `customerId`, `items[]`, `subTotal`/`totalAmount`, `paymentStatus`, `status` (10-state enum), `deliveryAddress` | Missing `grandTotal`/`trackingTimeline`/`deliveryPartnerId` fields that controller code assumes exist — **live bugs**, see §5 |
| `Role` | `roles` | `name`, `permissions[]` | **Dead** — RBAC is done purely via the `User.role` string + `authorize()` allow-list, this model is never read |
| `User` | `users` | `name`, `email` (unique), `password` (bcrypt-hashed via `pre('save')`), `role`, `status`, `avatarUrl` | Staff/admin identity; `comparePassword()` instance method |

### 2.7 REST API surface

Base path: `/api` (mounted in `index.js`). All handlers live in [`src/controllers/apiController.js`](backend/src/controllers/apiController.js); routes wired in [`src/routes/api.js`](backend/src/routes/api.js).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/upload` | — | Upload base64 image → Cloudinary |
| POST | `/api/auth/register` | — | Create `User` (+`Customer` profile if role Customer) |
| POST | `/api/auth/login` | — | Email/password login → JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/dashboard/stats` | ✅ | Revenue/order/product/customer KPIs |
| GET | `/api/dashboard/status` | — | Server/DB/payment status (Redis/Queue fields are hardcoded strings) |
| GET | `/api/products` | — | List/filter/search/sort products |
| GET | `/api/products/:id` | — | Get one product |
| POST/PUT | `/api/products[/:id]` | ✅ Admin/Manager | Create/update product |
| DELETE | `/api/products/:id` | ✅ Admin | Delete product |
| POST | `/api/products/bulk` | ✅ Admin | Bulk insert |
| GET | `/api/categories` | — | List categories |
| POST/PUT/DELETE | `/api/categories[/:id]` | ✅ Admin/Manager (DELETE: Admin) | Category CRUD |
| POST/PUT/DELETE | `/api/categories/:id/subcategories[/:subId]` | ✅ Admin/Manager | Embedded sub-category CRUD |
| GET | `/api/special-groups` | — | List promo groups |
| POST/PUT/DELETE | `/api/special-groups[/:id]` | ⚠️ **none** | No auth applied — anyone can mutate |
| GET | `/api/banners` | — | List banners |
| POST/PUT/DELETE | `/api/banners[/:id]` | ⚠️ **none** | No auth applied |
| GET | `/api/orders` | ⚠️ **none** | Lists **all** orders (customer PII) publicly, no pagination |
| GET | `/api/orders/customer/:phone` | — | Orders for a phone number |
| GET | `/api/orders/:id` | — | One order |
| POST | `/api/orders` | — (intentional) | Create order from client cart |
| PUT | `/api/orders/:id/status` | ✅ Admin/Manager/Delivery | Update status — **broken**, see §5 |
| GET | `/api/coupons` | — | List coupons |
| POST/PUT/DELETE | `/api/coupons[/:code]` | ✅ Admin/Manager (DELETE: Admin) | Coupon CRUD |
| GET | `/api/blogs` | — | List posts |
| POST/PUT/DELETE | `/api/blogs[/:id]` | ✅ Admin/Manager (DELETE: Admin) | Blog CRUD |
| GET/PUT | `/api/settings` | GET: — · PUT: ✅ Admin | Platform settings |
| GET | `/api/customers` | ✅ | List customers |
| POST | `/api/customers/auth` | — | Phone find-or-create (**no real OTP check**, see §5) |
| GET | `/api/customers/:id` | — | Profile by id/phone |
| PUT | `/api/customers/:id/profile` | ⚠️ **none** | Update name/email |
| POST/DELETE | `/api/customers/:id/addresses[/:addressId]` | ⚠️ **none** | Address CRUD |
| DELETE | `/api/customers/:id` | ⚠️ **none** | Delete account — anyone can delete any account by id/phone |
| PUT | `/api/customers/:id/wallet` | ✅ | Credit/debit wallet |
| GET | `/api/support/tickets` | ✅ | All tickets |
| POST | `/api/support/tickets` | — | Customer creates ticket |
| POST | `/api/support/tickets/:id/message` | ✅ | Reply — staff-only (customers can't reply via this route, see §5) |
| PUT | `/api/support/tickets/:id/status` | ✅ Admin/Manager | Update ticket status |
| GET | `/api/brands` | — | List brands |
| POST/PUT/DELETE | `/api/brands[/:id]` | ✅ Admin/Manager (DELETE: Admin) | Brand CRUD |
| GET | `/api/inventory` | ✅ | List inventory |
| POST | `/api/inventory/adjust` | ✅ Admin/Manager | Adjust stock (has a schema-shape bug, see §5) |
| GET | `/api/employees` | ✅ Admin/Manager | List staff (`role != Customer`) |
| POST/PUT/DELETE | `/api/employees[/:id]` | ✅ Admin | Staff CRUD |
| GET | `/api/reviews` | — | All reviews (incl. Pending/Rejected — public) |
| PUT | `/api/reviews/:id/status` | ✅ Admin/Manager | Approve/reject |
| DELETE | `/api/reviews/:id` | ✅ Admin | Delete review |
| GET/DELETE | `/api/audit-logs` | ✅ Admin | View/clear (always empty, see §5) |
| POST | `/api/payment/create-order` | — | Razorpay order (falls back to a fake mock order on failure) |
| POST | `/api/payment/verify` | — | Signature check — **always returns `verified:true`**, see §5 |

### 2.8 Business logic notes

- **Category/Product**: human-readable string `id`s (auto-slugified from `name`) used as the app-level primary key alongside Mongo `_id`; lookups match against `id`/`slug`/`_id` interchangeably.
- **Order creation** (`POST /api/orders`, public): normalizes many possible client payload shapes, decrements product stock fire-and-forget, and — notably — **falls back to an in-memory mock order object on any DB write failure while still returning HTTP 201**, masking persistence failures from the caller.
- **Order status update**: intended to append to a tracking timeline and optionally assign a delivery partner, but the schema doesn't have those fields (see §5) — the route throws in practice.
- **Inventory adjustment**: writes a log entry and is *supposed* to sync `Product.stock`, but overwrites the nested `{status, quantity}` object with a bare number, corrupting the shape.
- **Wallet**: `Customer.walletBalance` +/- with a `WalletTransaction` log; not wired into the order/checkout flow automatically.
- **Customer auth**: `POST /api/customers/auth` is a phone-only find-or-create with **no OTP verification, no password, no token** — a separate, much weaker identity system from the JWT `User` auth used by staff.
- **Razorpay**: order creation degrades to a fake mock order on API failure; **payment verification always reports success** regardless of the actual HMAC check result.
- **Cloudinary**: single generic `POST /api/upload` (no auth), used for all product/banner/CMS images.
- **Socket.IO**: `join_order_room` + `support_message_send`→`support_message_received` (global broadcast, not scoped to a room) are the only two custom events; nothing in `apiController.js` ever emits to `io`.
- **Redis/BullMQ/Firebase Admin**: declared as dependencies, never actually implemented — dashboard "Redis: Connected" / "BullMQ Idle" text is hardcoded.

### 2.9 Environment variables

| Variable | Purpose | Fallback if unset |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | Mongo Atlas connection string | Hardcoded Atlas URI w/ embedded credentials |
| `JWT_SECRET` | JWT sign/verify | Hardcoded string |
| `JWT_REFRESH_SECRET` | Present in `.env` | **Never read** — no refresh-token flow exists |
| `REDIS_URL` | Present in `.env` | **Never read** — no Redis client exists |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary SDK | Hardcoded fallback credentials |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay SDK | Hardcoded test keys |

### 2.10 Scripts

- [`scripts/dbTool.js`](backend/scripts/dbTool.js) — CLI DB utility (`npm run db:tool`, `npm run db:clear`); its `createProduct` helper writes a product shape that doesn't fully match the current `Catalog.js` schema (appears written against an older/simpler shape).
- [`scripts/seedProducts.js`](backend/scripts/seedProducts.js) — standalone product-seeding script (connects to `MONGO_URI` or local Mongo directly).

---

## 3. Frontend (`frontend/`)

React 19 + TypeScript + Vite SPA that is **both** the public storefront and the `/admin/*` operations console.

### 3.1 Tech stack

| Concern | Library |
|---|---|
| Framework | `react`/`react-dom` 19 |
| Routing | `react-router-dom` v7 (`BrowserRouter`) |
| Animation | `framer-motion` (drawers, modals, page/marquee transitions) |
| Icons | `lucide-react` |
| Maps | `leaflet` is a dependency but **not actually used** — real "map" UI is OpenStreetMap `<iframe>` embeds + Nominatim REST calls + manual pixel↔lat/lng math |
| FX | `canvas-confetti` (add-to-cart, order success) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), CSS custom properties in `index.css` |
| Build/Lint | Vite, TypeScript, `oxlint` |
| State | **No Redux/Zustand/React Query** — plain React Context + `useState` + `localStorage` for everything |

### 3.2 Routing (`src/App.tsx`)

`CMSProvider` → `CartWishlistProvider` → `Router` → `AppContent`, which branches on `location.pathname.startsWith('/admin')`.

**Admin auth is a single client-side boolean**: if `localStorage.admin_user` is absent, the entire `/admin/*` tree renders `<Login>` directly instead of routing — there's no per-route guard.

#### Admin routes (all under `<AdminLayout>`)

`/admin` (Dashboard) · `/admin/orders` · `/admin/products` · `/admin/categories` · `/admin/subcategories` · `/admin/inventory` · `/admin/customers` · `/admin/delivery` · `/admin/employees` · `/admin/coupons` · `/admin/cms` (AdminCMS.tsx) · `/admin/finance` · `/admin/analytics` (static, no data) · `/admin/reviews` · `/admin/support` & `/admin/notifications` (same component) · `/admin/settings` · `/admin/audit-logs`

> `Modules.tsx` also exports `CMSModule` (blog CRUD) which is **not routed** — superseded by `AdminCMS.tsx`.

#### Public routes

`/` (Home) · `/about` · `/products` · `/product/:id` · `/brands` · `/offers` · `/blog` · `/blog/:id` · `/help`, `/support`, `/account/support`, `/customer-support` (all → `CustomerSupport`) · `/careers` · `/locations`, `/saved-addresses`, `/account/addresses` (all → `CustomerAddresses`) · `/stores` · `/legal`, `/terms-of-service`, `/privacy-policy` (+ `/s/` prefixed variants) → `Legal` · `/orders`, `/account/orders` → `CustomerOrders` · `/profile`, `/account/profile` → `CustomerProfile`

> `HelpCenter.tsx` and `Locations.tsx` are fully built page components but **not referenced by any route** (dead code, superseded by `CustomerSupport` and the pincode-checker duplicated elsewhere).

Header/Footer/FloatingCartBar are hidden on "standalone" full-screen flows (`/s/*`, checkout-adjacent, account pages). Global overlays (`WishlistDrawer`, `CartDrawer`, `FloatingCartBar`, `QuickViewModal`) are mounted outside `<Routes>` with state lifted to `AppContent`.

### 3.3 State/data layer

#### `context/CMSContext.tsx` (~1,440 lines) — the central data hub

Holds `{banners, categories, specialCategoryGroups, products, coupons, blogs, testimonials, faqs, stores, jobs, seoSettings}`.

**Hydration strategy** (this is the key architectural pattern of the app):
1. On mount, read `localStorage['freshcart_cms_data_v2']`; use it if it looks "complete" (≥30 products, ≥5 categories, has special groups).
2. Otherwise fall back to a large **hardcoded demo dataset baked into the file** (~60+ products, 8 categories, banners, coupons, blogs, testimonials, FAQs, stores, jobs).
3. A mount-time `useEffect` calls `syncWithBackend()` — parallel `fetch()`s (1.5s timeout) to `/api/{products,categories,special-groups,banners,coupons,blogs}`; overwrites local state only if the backend responds with non-empty arrays, otherwise silently keeps local/demo data.
4. Every state change is persisted back to `localStorage['freshcart_cms_data_v2']`.

Also persists: `activeHub` (warehouse selector), `userLocation` (delivery address), `homeSelectedSubCategories` (Home-page visibility toggles) — each its own `localStorage` key.

**Mutators**: banner/special-group CRUD sync to the backend (fire-and-forget or full round-trip for special groups); product/category/subcategory/coupon/blog/FAQ/testimonial/store/job CRUD are **local-only** (admin pages that need backend persistence, e.g. `pages/admin/Products.tsx`, make their own separate `fetch` calls in addition to updating context). `uploadImage()` proxies to `POST /api/upload` (Cloudinary).

#### `context/CartWishlistContext.tsx`

Entirely local, no backend sync: `cart[]` (`localStorage['freshcart_cart']`), `wishlist[]` (`localStorage['freshcart_wishlist']`), confetti burst on new-item add, derived `cartCount`/`cartSubtotal`.

#### Customer & admin auth (not context-based)

No `CustomerAuthContext` — logged-in customer object lives in `localStorage['customer_user']`, re-read independently (via IIFE) by every component that needs it. Addresses/orders are phone-scoped localStorage keys (`saved_addresses_<phone>`, `customer_orders_<phone>`). Admin session is likewise just `localStorage.admin_token`/`admin_user` lifted into `App.tsx` state.

### 3.4 Customer-facing features

- **Home** — hero category scroller, per-subcategory shelves (sorted by `displayOrder`), inter-section CMS banners, mobile "Special Category Groups" grid, Fresh/Organic/Best-seller shelves, blog teasers, FAQ accordion, countdown-to-midnight flash sale timer.
- **Products/browsing** — category landing → subcategory grid view, URL-param filters, client-side sort/pagination, fuzzy category-name matching.
- **Product details** — gallery, highlights/seller info, "Frequently Bought Together" bundle picker, reviews (local-only, seeded with 2 mock reviews), related products.
- **Brands / Offers / Blog** — Brands uses a hardcoded static registry (not the `/api/brands` endpoint); Offers surfaces CMS coupons + referral card; Blog is CMS-backed with local comments.
- **Cart/Checkout** — `CartDrawer` (coupon apply, address gate), `CheckoutModal` (loads Razorpay `checkout.js` but the actual payment is **simulated** — fake order/payment IDs synthesized client-side, `POST /api/payment/verify` called with dummy values, order persisted to both localStorage and `POST /api/orders`), `OrderSuccessModal` (confetti + 10-min countdown).
- **Auth** — `CustomerAuthModal`: phone → OTP two-step UI; **any 4-digit code is accepted** (no real verification); calls `POST /api/customers/auth`, falls back to a locally-synthesized customer if unreachable.
- **Account** — `CustomerAddresses` (OSM iframe + Nominatim geocoding, phone-scoped storage), `CustomerProfile` (edit/delete account), `CustomerOrders` (status-filtered order history, mock invoice download), `CustomerSupport` (contact cards, per-order issue form, keyword-based mock live-chat bot).
- **Content/marketing** — About, Careers (fake resume upload), Stores (hand-built inline SVG "map", no real map library), Legal (Terms/Privacy tabs).
- **UX patterns** — right-side sliding drawers (framer-motion) for Cart/Wishlist/Auth/Profile/Checkout/Chat; centered blurred-backdrop modals for Location/QuickView/OrderSuccess; `SEO.tsx` headless component injecting title/meta/OG/JSON-LD per page.

### 3.5 Admin CMS features

- **Login** (`pages/admin/Login.tsx`) — `POST /api/auth/{login,register}`; **offline sandbox fallback** validates against a hardcoded mock-account table if the fetch throws. Registration lets the user freely pick a role client-side.
- **AdminLayout** — collapsible sidebar (16 nav items) + topbar (non-functional global search, hardcoded notifications, hardcoded profile identity regardless of who's actually logged in).
- **Dashboard** — KPI grid from `GET /api/dashboard/{stats,status}`, hand-drawn (non-data-driven) SVG revenue chart, low-stock alerts computed client-side, 4 inert "Quick Action" buttons.
- **Products** (admin) — full catalog CRUD with image upload (Cloudinary), inline subcategory creation, bulk JSON export/import. Always updates local `CMSContext` state even if the API call silently fails.
- **Orders** (admin) — status-tab filter, printable invoice drawer (`window.print()`), single-valid-next-transition status button (Pending→Accepted→Packed→Ready→Assign Rider→Out For Delivery→Delivered, + Cancel), rider assignment modal (static 3-rider list).
- **AdminCMS** (`/admin/cms`, 1,383 lines) — tabbed page: Home-subcategory visibility toggles, Special Groups builder, Banners CRUD, an embedded product form, Coupons, Blogs, per-page SEO metadata editor.
- **`Modules.tsx`** (3,036 lines) — 13 more admin modules: Categories, SubCategories (reorder up/down), Inventory (stock adjust), Customers (+ order history + wallet edit), Delivery (riders modeled as `Employee`s filtered by role), Employees, Coupons (edit-in-place variant), CMS (blogs, unrouted dupe), Finance (derives figures from `/api/orders` client-side), Analytics (static SVG, no live data), Reviews (moderation), Support (ticket inbox), AuditLogs (read-only viewer), Settings.

### 3.6 Notable frontend tech debt

- Most files hardcode `http://localhost:5000/api`; a handful (`CustomerAuthModal`, `CheckoutModal`, `CustomerAddresses`, `CustomerProfile`, `CustomerOrders`) use relative `/api/...` instead — an inconsistent-but-functional seam.
- Two independent admin product-CRUD surfaces (`pages/admin/Products.tsx` and the AdminCMS "products" tab) with slightly different field sets.
- Payment is fully simulated end-to-end; no real Razorpay checkout modal ever opens.
- Dead pages: `HelpCenter.tsx`, `Locations.tsx`, `Modules.tsx`'s `CMSModule`.

---

## 4. Mobile App (`mobileapp/`)

Flutter app ("FreshCart") targeting the same backend. See also [`mobileapp/walkthrough.md`](mobileapp/walkthrough.md) for the original implementation narrative (now slightly stale — it undersells how much of the app actually talks to a live backend).

### 4.1 Tech stack

| Concern | Library |
|---|---|
| State management | `flutter_riverpod` (`StateNotifierProvider`, `FutureProvider`, `.family` variants) |
| Routing | `go_router` — single `GoRouter`, **no route guards**; screens self-navigate based on state |
| DI | `get_it` — small singleton container (`StorageService`, `ApiService`, `SocketService`) |
| Networking | `dio` (REST) + `socket_io_client` (realtime) |
| Local storage | `hive`/`hive_flutter` (schemaless boxes, no `TypeAdapter`s) |
| UI/UX | `flutter_screenutil` (390×844 design size), `cached_network_image`, `flutter_svg`, `lottie`, `flutter_animate`, `shimmer`, `mapcn_flutter` + `latlong2` + `geolocator` |

### 4.2 Architecture

Lightweight two-layer "Clean Architecture" — `core/` (cross-cutting: constants, theme, widgets, services, DI, routes) + `features/<name>/{data/models, presentation/{controllers,screens}}`. No separate `domain/` or repository-interface layer; controllers talk directly to `ApiService`/`SocketService`/`StorageService`/`MockDataService`.

Features: `authentication`, `cart`, `categories`, `checkout`, `home`, `onboarding`, `orders`, `products`, `profile`, `search`, `splash`, `tracking`, `wishlist`.

### 4.3 Bootstrap (`main.dart`)

1. `WidgetsFlutterBinding.ensureInitialized()`.
2. `setupInjection()` — Hive init + GetIt registrations.
3. Fires (non-blocking) `MockDataService.syncWithServer(hostUrl)` to hydrate mock lists from the live backend before first render.
4. `runApp(ProviderScope(...))`; `ScreenUtilInit` + theme-aware `MaterialApp.router`.

### 4.4 Real backend vs. mock data — important

This is a **hybrid**, not a pure-mock app:

- **`ApiService`** — Dio client, base URL `http://10.0.2.2:5000/api` (Android emulator) or `http://localhost:5000/api`, 5s timeouts. Every method (`fetchBanners`, `fetchCategories`, `fetchSpecialGroups`, `fetchProducts`, `validateCoupon`, `createOrder`, `fetchCustomerOrders`) try/catches to a hardcoded or `MockDataService` fallback on failure.
- **`MockDataService`** — static mutable `categories`/`products` lists (~24 hand-authored products across 8 categories) plus `mockBanners`/`mockCoupons`/`mockAddresses`. `syncWithServer()` (called once at startup) overwrites these lists in-place from the live backend if reachable — so most screens transparently get real data after boot, or demo data if the backend never responded.
- **`SocketService`** — singleton around `socket_io_client`, lazy-connects, exposes `orderStatusStream`/`riderLocationStream`/`supportMessageStream`.

| Screen/feature | Data source |
|---|---|
| Home | `catalog_providers.dart` `FutureProvider`s → live `ApiService` (with fallback) |
| Categories tab, Category catalog, Product details, Search, Wishlist | Static `MockDataService.categories`/`.products` (refreshed **once** at startup only) |
| Cart coupons | `MockDataService.mockCoupons` |
| Order placement | `ApiService.createOrder()` (real POST + offline fallback) + Socket room join |
| Order tracking | `SocketService` streams |
| Support chat | `SocketService`, with a 1s local auto-reply if socket not connected |
| **Auth (login/OTP/profile)** | **Fully mocked** — no backend calls at all; app boots pre-authenticated as demo user "John Doe" |
| Address geocoding | OpenStreetMap Nominatim (third-party, not the app's own backend) |

### 4.5 Navigation (`core/routes/app_router.dart`)

`GoRouter(initialLocation: '/splash')`, no guards — `SplashScreen` decides the next route from `authProvider` state.

`/splash` → `/onboarding` → `/login` → `/otp` → `/location` / `/location_select` / `/map_selection` → `/` (`MainNavigationShell`: Home/Categories/Search/Profile tabs) → `/category/:id`, `/product/:id`, `/wishlist`, `/cart`, `/checkout`, `/tracking/:orderId`, `/wallet`, `/membership`, `/support`, `/addresses`, `/orders`, `/notifications`, `/search_detail`.

⚠️ `/profile` and `/stores` are **not registered routes** even though `home_screen.dart` calls `context.push('/profile')` — this will throw at runtime; Profile is only reachable via the bottom-nav tab. `StoresScreen` is fully built but orphaned (no route, no menu entry).

### 4.6 State management inventory (Riverpod)

| Provider | Manages |
|---|---|
| `themeProvider` | Dark-mode flag (Hive-persisted) |
| `authProvider` | Auth/onboarding/location-permission/user profile — **fully mocked**, pre-authenticated demo user "John Doe", ₹250 wallet, VIP |
| `cartProvider` | Cart items, coupon, delivery slot; pricing math (subtotal, savings, coupon cap ₹100, delivery fee free ≥₹400 else ₹29, 5% GST); Hive-persisted |
| `wishlistProvider` | Favorited product IDs, Hive-persisted |
| `ordersProvider` | Local order list (seeded 1 demo order); `placeOrder()` → `ApiService.createOrder` + Socket room join |
| `trackingProvider` (`.family` by orderId) | Rider location/status, live via Socket streams |
| `supportProvider` | Chat messages via Socket, local auto-reply fallback |
| `apiServiceProvider`, `bannersProvider`, `categoriesProvider`, `specialGroupsProvider`, `productsProvider` | Home-screen-only API-backed `FutureProvider`s |

### 4.7 Local persistence (Hive)

Three boxes: `freshcart_settings` (onboarding flag, dark mode), `freshcart_cart` (cart items as JSON maps), `freshcart_favorites` (favorite product IDs). No `TypeAdapter`s registered — everything stored as raw dynamic maps. `clearAll()` wipes cart + favorites only.

### 4.8 Design system

`AppColors` (primary green `#4CAF50`, gold VIP gradient, light/dark palettes), `AppSpacing` (4–64px scale), `AppTypography` (SF Pro Display/Inter), `AppTheme` (Material 3 light/dark). Glassmorphism widget library in `core/widgets/`: `GlassCard` (BackdropFilter blur, the foundational primitive), `PrimaryButton`/`SecondaryButton`/`GlassButton`, `RatingWidget`/`DeliveryBadge`/`DiscountBadge`, `CategoryCard`/`ProductCard` (with `Hero` transitions), `LoadingSkeleton`/`EmptyState`/`ErrorState`, `FloatingCart` (free-delivery pill), custom floating `BottomNavBar`, `QuantitySelector`, glass `SearchBar`, `SectionHeader`. Custom painters: `MockMapPainter` (location screen), `TrackingMapPainter` (delivery route).

### 4.9 Feature summary by domain

- **Auth/Onboarding**: Splash → Onboarding (3 slides) → Login (Phone-OTP or Email tab, email path skips OTP entirely) → OTP (any 6 digits accepted) → Location permission (mock map) → Location select/Map selection (real Nominatim geocoding + `mapcn_flutter`).
- **Home/Catalog**: `MainNavigationShell` (4-tab IndexedStack + floating nav + floating cart), `HomeScreen` (gradient header, category chips, banners, special-groups grid, per-category rails).
- **Cart/Checkout**: swipe-to-delete cart, delivery-speed radio, coupon list, `CheckoutScreen` (address/payment method incl. wallet-balance gating, 2s simulated processing, places order, routes to tracking).
- **Categories/Products**: grid browse, subcategory chip tabs, Organic filter, sort; product details with weight selector, nutrition facts, similar products.
- **Orders/Tracking**: order history with mock invoice "download", custom-painted live tracking map, Socket-driven rider updates.
- **Profile/Wallet/Membership/Support/Search/Wishlist**: profile menu (dark-mode toggle, no Stores entry), Wallet (static "Add Money" no-op, hardcoded transaction history), Membership (static VIP perks), Support (Socket chat), Search (client-side substring search over `MockDataService.products`), Wishlist (Hive-backed favorites grid).

---

## 5. Cross-Cutting Concerns & Known Issues

These are worth knowing before making changes — several are **live, reproducible bugs**, not just style nits.

### Backend bugs
1. **`mongoose` is used but never imported in `apiController.js`** — `dashboardController.getSystemStatus`, `productController.getProduct`/`updateProduct`/`deleteProduct` reference the global `mongoose` object without an import; these code paths will throw `ReferenceError` under ESM.
2. **`Order.trackingTimeline` doesn't exist in the schema**, but `orderController.updateStatus` calls `.push()` on it — throws on every status update, so `PUT /api/orders/:id/status` is effectively broken.
3. **`Order.grandTotal` doesn't exist** (schema field is `totalAmount`) — `dashboardController.getStats` sums `o.grandTotal`, producing `NaN` revenue once real orders exist.
4. **`Order.deliveryPartnerId`/`deliveryPartnerName` aren't schema fields** — assigned but won't persist (moot since #2 throws first).
5. **`inventoryController.adjustStock` clobbers `Product.stock`'s shape**, overwriting `{status, quantity}` with a bare number.
6. **Razorpay `verifyPayment` always returns `verified:true`** regardless of the actual HMAC check.
7. **Missing auth** on `/api/special-groups`, `/api/banners` (mutations), `/api/customers/:id` DELETE, `/api/customers/:id/profile` PUT, `/api/customers/:id/addresses` — open write access.
8. **`GET /api/orders` and `GET /api/reviews` are fully public** — exposes all customer PII / unmoderated reviews.
9. **`logAudit()` is exported but never called** — `AuditLog` collection is always empty despite full CRUD routes existing for it.
10. Dead models never read/written: `Role`, standalone `Address`, `Notification`, `CMSPage`, `Payment`, `Invoice`.
11. **Two disconnected customer identity systems**: JWT `User` auth vs. phone-only `Customer` lookup with no real OTP and no FK back to `User._id`.
12. **Hardcoded secret fallbacks in source**: Mongo URI+password, JWT secret, Cloudinary key/secret, Razorpay test keys.
13. Seed re-trigger footgun: category/product wipe-and-reseed if counts drop below threshold, runs on every boot.

### Frontend/mobile bugs & gaps
14. **Mobile: `/profile` and `/stores` routes are missing** from `app_router.dart` despite being referenced/expected — runtime navigation error; `StoresScreen` is fully built but orphaned.
15. **Mobile: two parallel data paths** — reactive API `FutureProvider`s (Home only) vs. static `MockDataService` lists refreshed once at startup (everywhere else) — non-Home screens won't reflect backend changes without an app restart.
16. **Mobile auth is entirely mocked** while catalog/orders/tracking do integrate live — inconsistent trust boundary if this ever ships to real users.
17. **Frontend: payment is fully simulated** end-to-end (matches backend's no-op verification).
18. **Frontend: admin route protection is a single client-side boolean**; customer "OTP" accepts any 4-digit code — neither is real access control, consistent with the backend's own lack of OTP verification.
19. **Neither client persists an actual link between local cart/order data and a server-verified identity** — everything is keyed by phone number in `localStorage`, trivially spoofable client-side.

### Shared characteristic (not a bug, but a load-bearing design decision)
All three apps are built to **degrade gracefully to local mock/seed data** whenever the backend is unreachable or a call fails. This is convenient for demos and frontend/mobile development in isolation, but it also means a screen rendering correctly is not evidence a backend integration point is actually working — always check network calls directly when verifying an integration.

---

## 6. Repository Hygiene Notes

- **`.gitignore`** only excludes 3 stray PNG files — it does **not** exclude `node_modules/`, `build/`, or `.dart_tool/`. As a result the initial commit checked in **10,241 `node_modules` files** and Flutter/Android build artifacts under `mobileapp/build/` and `mobileapp/.dart_tool/`. Recommend adding a proper `.gitignore` (Node + Flutter templates) before the next commit that touches dependencies, and considering a history cleanup if repo size becomes a problem.
- Root-level `package-lock.json` exists but there's no root `package.json` — likely a stray artifact from running `npm install` at the repo root by mistake.
- Backend, frontend, and mobile app each have their own `package.json`/`pubspec.yaml` and are otherwise independent — there is no workspace/monorepo tool (no Nx/Turborepo/Lerna, no npm workspaces) tying them together; each must be run/installed separately (`cd backend && npm install`, `cd frontend && npm install`, `cd mobileapp && flutter pub get`).
