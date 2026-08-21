# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Shoppers (customer storefront)** — everyday grocery buyers who want essentials (produce, dairy, staples, snacks, drinks) delivered fast, browsing and ordering from a phone-first web storefront. Primary job: find what's needed, trust the price/freshness, and get it delivered in minutes without friction (address entry, search, cart, checkout).
- **Internal ops staff (admin console, today)** — the operating business's own admin, managers, delivery riders/coordinators, and support agents, using `/admin/*` to manage catalog, inventory, orders, delivery, coupons, CMS content, customers, and support tickets.
- **Future tenant operators (planned)** — other grocery businesses who would run their own storefront + ops console on this platform once it becomes multi-tenant/resellable (see Capabilities and Constraints — not yet built).

## Product Purpose

FreshCart is a quick-commerce grocery delivery platform: a customer storefront for browsing and ordering groceries with a locked-in **10-minute delivery promise**, backed by an operations console for running the catalog, inventory, orders, delivery, and support behind that promise. Success is a shopper completing an order with confidence in speed and freshness, and ops staff running fulfillment without leaving the console.

## Positioning

A Zepto/Blinkit-style quick-commerce grocery platform: the 10-minute delivery promise is the core, non-negotiable value proposition the entire experience is built around (browsing, address/location UX, order tracking, and messaging all reinforce speed). It currently competes as a full-stack owned platform (storefront + native-adjacent mobile app + ops console) rather than a marketplace aggregator.

## Operating Context

- **Monorepo, three apps**: `backend/` (Node/Express/MongoDB REST + Socket.IO API), `frontend/` (React 19 + TypeScript + Vite + Tailwind v4 SPA — both the public storefront *and* the `/admin/*` ops console), `mobileapp/` (Flutter customer app with its own independent design system — not in scope for this frontend's design decisions).
- Customer flows: home browsing, category/subcategory navigation, search, product details, cart, address selection (OpenStreetMap/Nominatim), checkout (Razorpay-integrated, currently simulated end-to-end), order tracking/history, wallet, support tickets, profile.
- Ops flows: dashboard KPIs, product/category/inventory CRUD, order lifecycle management, delivery/rider assignment, coupons, CMS content (banners, blogs, homepage sections, SEO), customer management, reviews moderation, support inbox, audit logs, settings.
- Both storefront and ops console currently degrade gracefully to local/mock data when the backend is unreachable — a deliberate resilience pattern during active development, not a production trust boundary.

## Capabilities and Constraints

- **Current architecture is single-tenant.** There is no tenant/organization data model, no per-tenant scoping on any collection or route, and admin auth is a single client-side flag. Multi-tenancy is a confirmed future direction, not yet implemented — treat it as a constraint on new work (avoid assumptions that bake in single-tenant-only data shapes where reasonably avoidable) rather than a feature to build proactively.
- Payment (Razorpay) and customer OTP auth are currently simulated/mocked end-to-end — functional for demo/dev, not production-trustworthy yet.
- Admin route protection is presence-of-localStorage-flag only; no server-side per-route guard yet.
- Known backend defects exist (see `KNOWLEDGE_BASE.md` §5) — e.g. order-status update throws, dashboard revenue can compute `NaN`, several mutating routes lack auth. These are functional bugs, not design constraints, but they cap what "it works end-to-end" can currently mean when demoing order/payment flows.
- No i18n/multi-currency layer exists; content assumes India (₹, Indian addresses/phone formats).

## Brand Commitments

- Name: **FreshCart**. Logo asset at `frontend/public/logo.png`; favicon at `frontend/public/favicon.svg`.
- Established brand green anchors the palette (`--primary: #4CAF50` and derived shades) across both the storefront and the admin "Operations/Ledger" console theme — see `frontend/src/index.css`.

## Evidence on Hand

- `KNOWLEDGE_BASE.md` — a full, current architectural reference across all three apps (generated from reading every source file); treat it as authoritative for "what actually exists" and re-derive rather than trust stale summaries if it visibly diverges from the code.
- `CHANGELOG.md` — commit-grouped history of feature work.
- No testimonials, case studies, press, pricing tiers, or real customer evidence exist yet — do not fabricate any for a real-startup product; treat their absence as a gap future work may need to fill with real content, not placeholder copy.

## Product Principles

1. **Speed is the product.** Every customer-facing decision should reinforce the 10-minute promise (perceived speed, clarity, minimal friction) — this is the one positioning fact that isn't negotiable.
2. **Storefront and ops console are one codebase, two audiences.** Keep customer-facing UI held to consumer/e-commerce polish and ops UI held to dense, scannable, task-first standards — don't let one audience's needs distort the other's.
3. **Design for eventual multi-tenancy without gold-plating for it now.** Prefer choices that wouldn't need to be undone if tenant-scoping arrives, but don't build multi-tenant UI/features speculatively.
4. **Demo-graceful, not production-trusted.** The mock/fallback-data pattern is intentional during this build phase; don't treat a screen "working" as proof a backend integration is real, and don't design flows that assume payment/auth are already trustworthy.
5. **India-first context.** ₹ currency, Indian address formats/phone numbers, and locally-relevant grocery categories are the baseline reality, not a placeholder to abstract away yet.
