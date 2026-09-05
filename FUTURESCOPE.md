# FreshCart — Future Scope & Implementation Plan

**Created:** 2026-09-05. **Purpose**: a single forward-looking document that
answers "what's next and how do we build it" — distinct from the other docs:

- `FUTURE_WORK.md` — the tactical, item-by-item backlog (FW-1, FW-2, …) with
  fine-grained done/not-done checkboxes. Check there for exact status of a
  specific small item.
- `MOBILE_APP_IMPLEMENTATION.md` §19 — the current P0/P1/P2 gap-closing
  roadmap (bugs + near-term production gaps in the *existing* app).
- **This file** — the strategic view: near-term items worth planning now,
  and genuinely new feature scope not yet in either doc above, each with
  enough of an implementation sketch to start from. Read `MEMORY.md` first —
  it has the real current architecture; don't assume anything below is
  already built just because it's described in detail.

Before picking anything up here: re-verify against real code first (per the
project's standing rule — code wins over any doc, including this one).

---

## How this doc is organized

- **Part A — Near-term (already scoped, ready to build)**: P1/P2 items that
  already exist in the roadmap, restated here with full implementation detail
  for whoever picks them up next.
- **Part B — Strategic / long-term (new scope, not yet in any backlog)**:
  bigger features that would meaningfully grow the product but haven't been
  scoped in detail anywhere yet. Each gets a rationale, a phased plan, and an
  explicit "don't build this yet" gate (a decision or dependency that should
  land before code starts).

Every item follows the same shape so it's easy to compare and pick up:
**Screen · Functionality · API required · Components required · Backend
changes · Dependencies · Testing requirements · Phasing**.

---

# Part A — Near-term (already scoped)

These mirror `MOBILE_APP_IMPLEMENTATION.md` §19 P1/P2 — repeated here with
slightly more implementation detail since that's what was asked for. Do not
duplicate-track status in two places: once one of these starts, update
*that* doc's checkbox/status line, not this file.

## A1. iOS push notifications (APNs)
- **Screen**: none directly — `NotificationsScreen`, order-status pushes, delivery-offer pushes, all currently Android-only in practice.
- **Functionality**: iOS devices receive the same FCM-relayed pushes Android already gets.
- **API required**: none new. `POST /customers/me/devices`, `POST /delivery/devices` already accept any FCM token, iOS included.
- **Components required**: none — `PushService` (both Flutter apps) already calls `firebase_messaging`, which is platform-agnostic.
- **Backend changes**: none. `pushService.js`'s `sendEachForMulticast` already works for iOS tokens once APNs is configured on Firebase's side.
- **Dependencies (blocking)**: an Apple Developer Program membership + an APNs Auth Key (`.p8`) uploaded to the Firebase project (`grocery-76b84`). This is a paid, external, user-owned step — nothing to build until it exists.
- **Testing**: can't be tested in the iOS Simulator (APNs requires a real device). Once the key is uploaded: install on a physical iPhone via TestFlight or a dev-signed build, trigger an order-status change, confirm the push arrives.
- **Phasing**: single step once the dependency is unblocked — no intermediate phases needed.

## A2. Per-request retry-with-backoff
- **Screen**: none directly — cross-cutting, most visible on flaky connections during Home/catalog/order-history loads.
- **Functionality**: a transient failure (timeout, 502/503, connection reset) retries automatically (e.g. 3 attempts, exponential backoff ~300ms/900ms/2700ms) before surfacing an error to the user; a genuine 4xx (bad request, 401, 404) never retries.
- **API required**: none — purely a client-side `Dio` interceptor change in `ApiService` (mobileapp) and the delivery app's equivalent client.
- **Components required**: a small `RetryInterceptor` (hand-rolled or `dio_smart_retry` package) added to the existing `Dio` instance's interceptor chain, ahead of the auth interceptor.
- **Backend changes**: none.
- **Dependencies**: none — fully self-contained.
- **Testing**: unit test with a fake `Dio` adapter that fails twice then succeeds — assert the call eventually resolves and the retry count/backoff timing; a second test asserts a 401/404 is *not* retried and surfaces immediately.
- **Phasing**: one PR, mobileapp first, then mirror in deliveryapp for consistency (per the "both apps" rule) if the delivery team also reports flaky-network complaints — otherwise mobileapp alone is fine to ship first and gauge impact.

## A3. Security hardening — banner/special-group mutation auth + legacy customer routes
- **Screen**: none (backend + web-admin only).
- **Functionality**: `special-groups`/`banners` create/update/delete require an authenticated Admin/Manager session (currently open to anyone who finds the endpoint); legacy tokenless `/customers/:id/*` routes are closed once web has a real customer session to replace them.
- **API required**: existing routes, just gated — `protect, authorize('Admin','Manager')` on banner/special-group mutations; `protectCustomer` replacing the open `/customers/:id/*` set.
- **Components required**: web admin's banner/special-group editors need to actually send the admin auth token on these calls (currently they don't — that's *why* the routes were left open).
- **Backend changes**: add middleware to the currently-open routes; this is the easy half.
- **Dependencies (the hard half)**: **web needs real customer authentication** before the legacy `/customers/:id/*` routes can close — today web identifies a customer purely by `{phone}` in the request body with a fake OTP (`1234`). This is a bigger, separate piece of work:
  - Phase 1: ship real OTP + JWT issuance for web (reuse the exact same `/customers/otp/send|verify` the mobile app already uses — no new backend work, just a web-side login flow).
  - Phase 2: migrate `CustomerAuthModal`/`CMSContext` to store and send that JWT (`Authorization: Bearer`) instead of raw phone.
  - Phase 3: switch every web call currently using `?phone=`/`{phone}` fallback over to the JWT-only `protectCustomer` routes.
  - Phase 4: remove the legacy tokenless routes.
- **Testing**: backend — 401/403 tests for the newly-gated banner/special-group routes; full regression suite on web's customer login → profile → address → order flow after each phase.
- **Phasing**: banner/special-group auth can ship immediately (low risk, self-contained). The customer-route lockdown is a 4-phase project — don't attempt it as one PR.

## A4. Delivery-app remaining items
- **Screen**: `deliveryapp` dashboard / order-detail.
- **Functionality**: (a) a dedicated "stack" view when a partner is carrying more than one active delivery; (b) call-masking between customer and partner so real phone numbers are never exchanged directly.
- **API required**: (a) none new — `GET /delivery/orders/active` already returns every active order for the partner; (b) a new `POST /delivery/orders/:id/call` (or similar) once a masking provider is chosen.
- **Components required**: (a) a horizontally-scrollable or list "active deliveries" card stack, replacing the current single-card dashboard view when count > 1; (b) a "Call customer" button that hits the masking endpoint instead of `tel:` linking the real number directly.
- **Backend changes**: (a) none; (b) integrate a telephony/masking provider (e.g. Exotel, Twilio Proxy) — new service module + credentials in `.env`.
- **Dependencies**: (b) **provider choice + budget approval from the user** — this has a recurring cost, don't build against a provider without that decision made first.
- **Testing**: (a) widget test rendering 2+ concurrent orders in the stack; (b) backend test against a mocked provider client once one is chosen.
- **Phasing**: (a) can ship any time, no dependency. (b) blocked until a provider is picked.

## A5. Festival-theme mobile/web parity
- **Screen**: mobile Home `_FestivalHero` vs the web's full festival theme engine (`AdminCMS.tsx` `PREDEFINED_FESTIVAL_THEMES`, `FestivalCampaignWrapper.tsx`).
- **Functionality**: mobile currently renders title/subtitle over a solid/gradient/image background only; web supports themed card styling, scallop borders, per-group product cards, accent colors, custom fonts.
- **API required**: none new — `GET /festival-campaigns` already returns the full campaign document; mobile just doesn't consume every field.
- **Components required**: extend `_FestivalHero` (mobileapp Home) to render the same `festivalGroups`/`cardStyling` fields the web `FestivalCampaignWrapper` does — product-group cards with discount badges, the scallop-border bottom accent, theme-driven text colors (careful: this is exactly the class of bug fixed this session in `SuperCategoryNav`/mobile `_SuperCategoryNav` — any new conditional theme coloring must be checked against every background it can actually render over, not just assumed dark-mode vs light-mode).
- **Backend changes**: none.
- **Dependencies**: none.
- **Testing**: widget tests per campaign background type (solid/gradient/image) + per `cardStyling` override; visual diff against the web campaign preview for at least one real seeded campaign.
- **Phasing**: incremental — ship background-type parity first, then card styling, then the scallop-border/decorative details last (lowest visual-risk-per-line-of-code ordering).

## A6. Analytics / crash reporting
- **Screen**: none (cross-cutting, both Flutter apps).
- **Functionality**: crash reports + basic funnel analytics (screen views, add-to-cart, checkout started/completed, search).
- **API required**: none — third-party SDK. `firebase_core` is already a dependency in both apps, so Firebase Crashlytics + Analytics is the path of least resistance (same project, no new account).
- **Components required**: SDK init in both `main.dart`s; an `AnalyticsService` wrapper (so call sites say `analytics.logAddToCart(product)` rather than sprinkling raw Firebase calls everywhere — easier to swap providers later if needed).
- **Backend changes**: none.
- **Dependencies**: a decision on what's tracked (privacy policy may need a one-line update to disclose analytics use — check with the user before enabling in production).
- **Testing**: manual — force a test crash, confirm it appears in the Crashlytics dashboard within a few minutes; confirm an opt-out toggle (if the user wants one) actually suppresses reporting.
- **Phasing**: Crashlytics first (highest value, zero user-facing risk), Analytics events second (needs the privacy-policy conversation first).

## A7. Accessibility & low-end device performance
- **Screen**: all.
- **Functionality**: every icon-only interactive control has a semantic label; tap targets meet the stated ≥44dp rule (verify it's actually followed, not just documented); acceptable frame times on a low-end Android device (the app's `AppColors`/`AppTypography` already encode a lot of the visual accessibility rules — this item is about *verifying* they're followed, not inventing new ones).
- **API required**: none.
- **Components required**: audit pass over `AppIconButton` call sites and any raw `IconButton`/`InkWell` usages for missing `semanticLabel`/`tooltip`.
- **Backend changes**: none.
- **Dependencies**: a genuinely low-end test device or Android Studio's low-end emulator profile (e.g. 2GB RAM, older API level).
- **Testing**: `flutter_test`'s `meetsGuideline` accessibility matchers on key screens; a manual TalkBack (Android) / VoiceOver (iOS) pass through the checkout flow specifically (highest-stakes flow for an accessibility failure); a profiled run (`flutter run --profile`) on the low-end target checking for dropped frames on Home/catalog scroll.
- **Phasing**: audit + fix low-hanging labels first (cheap, high value), perf profiling second (more time-intensive, do once the app is otherwise stable).

## A8. Repo hygiene / CI
- **Screen**: n/a.
- **Functionality**: nothing already-tracked-but-should-be-ignored stays tracked; CI runs `flutter analyze` + `flutter test` (both Flutter apps) + backend `npm test` on every push/PR.
- **Findings this session (not yet acted on)**: **259 build-cache files are currently tracked in git** under a root-level `.dart_tool/` (looks like a stray Chrome-driver test-cache directory, not real app code) even though `.gitignore` already lists that pattern — `.gitignore` only stops *new* files from being tracked, it doesn't untrack what's already committed. Needs `git rm -r --cached .dart_tool` (removes from git's index, **not** from disk) + a commit. `deliveryapp/` is also missing its own `build/`/`.dart_tool/` ignore entries (mobileapp has them explicitly; deliveryapp doesn't) — likely harmless today only because nothing's been committed from there yet, but worth adding proactively.
- **Backend changes**: none.
- **Dependencies**: none — but confirm with the user before running `git rm -r --cached` since it changes what's tracked (low-risk, reversible, but a repo-history-touching action).
- **Testing**: the CI pipeline itself is the test — verify it actually fails on an intentionally broken PR (e.g. a syntax error) before trusting it.
- **Phasing**: untrack the stray files first (quick, isolated), add the missing deliveryapp `.gitignore` entries, then wire CI last (needs the repo already clean, otherwise CI will "pass" while ignoring tracked junk).

---

# Part B — Strategic / long-term (new scope)

These are not in any existing backlog. Each is a real product direction, not
a guess — but none should be started without the stated gate first. Ordered
roughly by "smallest lift for the value" to "biggest lift."

## B1. Scheduled reorders / subscriptions
**Rationale**: quick-commerce retention is driven heavily by repeat staples
(milk, bread, eggs) — a "subscribe & save" or "reorder every N days" flow is
one of the highest-ROI features quick-commerce apps ship, and FreshCart
already has every prerequisite (real orders, real payment, real customer
identity).
- **Screen**: PDP ("Subscribe" toggle alongside Add to Cart), a new "My Subscriptions" screen under Account, a subscription-detail screen (pause/skip/cancel/change frequency).
- **Functionality**: pick a product + frequency (weekly/bi-weekly/monthly) + quantity; the system auto-creates an order on schedule using the customer's default address + saved payment method (or wallet); customer can pause/skip a single cycle, change frequency, or cancel anytime.
- **API required (new)**: `POST /api/customers/me/subscriptions`, `GET /api/customers/me/subscriptions`, `PATCH /api/customers/me/subscriptions/:id` (pause/skip/frequency/cancel), plus a backend scheduler (cron or a queue worker) that creates real `Order` documents on each subscription's due date, reusing the *existing* `createOrder` logic — not a parallel order-creation path.
- **Components required**: a frequency picker (bottom sheet, matches existing `AppBottomSheet` pattern), a subscription list-item card, a "next delivery" countdown/date chip.
- **Backend changes**: new `Subscription` model `{customerId, productId, frequency, quantity, nextRunAt, status, defaultAddressId, paymentMethod}`; a scheduled job (node-cron, already have `express-rate-limit`-style middleware patterns to follow) that finds due subscriptions and calls the existing order-creation service function directly (never re-implement checkout logic).
- **Dependencies**: a decision on failure handling — what happens when a scheduled charge fails (retry? skip and notify? auto-cancel after N failures?) — this needs a product decision before coding, not an engineering guess.
- **Testing**: backend — subscription CRUD, scheduler creates exactly one order per due subscription (idempotent — running the job twice must not double-order), pause/skip correctly shifts `nextRunAt`; mobile — full subscribe → view → pause → resume → cancel flow.
- **Phasing**: Phase 1 backend model + manual "run now" endpoint (no real scheduler yet, admin-triggered for testing) → Phase 2 real cron scheduler → Phase 3 mobile UI → Phase 4 push/email reminder before each auto-order ("Your milk subscription renews tomorrow").
- **Don't build until**: the failure-handling decision above is made, and whether COD subscriptions are even allowed (COD can't be "auto-charged" — likely subscriptions should require a prepaid method or wallet balance).

## B2. Personalized recommendations
**Rationale**: "similar products" already exists (same-category lookup); a
real recommendation surface ("Buy again", "Because you bought X") is a
natural next step and doesn't require ML to start — a rules-based v1 gets
most of the value.
- **Screen**: Home ("Buy again" rail using the customer's own order history), PDP ("Frequently bought together").
- **Functionality v1 (rules-based, no ML)**: "Buy again" = distinct products from the customer's last N delivered orders, most-recent first, deduped. "Frequently bought together" = other products that co-occur in the same order as this PDP's product across all orders (a simple co-occurrence count, computed periodically, not per-request).
- **API required (new)**: `GET /api/customers/me/buy-again` (reads the customer's own `Order` history — no new model), `GET /api/products/:id/frequently-bought-with` (reads a precomputed co-occurrence table).
- **Components required**: reuse the existing product rail/card components — this is a data feature, not a UI feature.
- **Backend changes**: a periodic aggregation job (nightly cron) that computes co-occurrence pairs from `Order.items` and writes them to a small `ProductAffinity {productId, relatedProductId, coOccurrenceCount}` collection; "Buy again" needs no new storage, it's a live query over existing `Order` documents.
- **Dependencies**: none blocking — this can start immediately, v1 is pure backend + existing UI components.
- **Testing**: backend — aggregation job produces correct pairs from a known fixture set of orders; "buy again" returns distinct products ordered by recency.
- **Phasing**: v1 (rules-based, above) first. **A real ML-based recommendation model (collaborative filtering, embeddings) is explicitly v2+ and should not be started until v1's rules-based version has been live long enough to tell whether the extra complexity is actually justified by the data** — don't build a recommendation ML pipeline speculatively.

## B3. Loyalty / rewards program
**Rationale**: `Customer.membershipType` (VIP) already exists as a flag but
has no earn/redeem mechanic behind it — a points program converts that from
a label into a retention lever.
- **Screen**: a new "Rewards" screen under Account (points balance, history, redeem options), a points-earned toast on order delivery, a redeem-at-checkout option.
- **Functionality**: earn points per ₹ spent (configurable rate via `Settings`, mirroring how `deliveryBaseFee` etc. are already admin-configurable); redeem points as a checkout discount (reuse the existing coupon/discount pipeline rather than inventing a parallel discount path); tier thresholds (Silver/Gold/VIP) drive the existing `membershipType` field.
- **API required (new)**: `GET /api/customers/me/loyalty` (balance + tier + history), backend hook in the existing `completeDelivery`/order-completion path to award points (same place `recordEarning` already runs for delivery partners — same pattern, different beneficiary), `POST /api/orders/:id/redeem-points` at checkout time.
- **Components required**: a points-balance chip (Account + Home), a redeem-points row in the checkout summary (next to the existing coupon-apply row).
- **Backend changes**: `Customer.loyaltyPoints` + `LoyaltyTransaction {customerId, orderId, type:'Earn'|'Redeem', points, at}` (mirrors the existing `WalletTransaction` pattern closely — reuse that design rather than inventing a new one); `Settings.loyaltyPointsPerRupee` + `Settings.pointsToRupeeRedemptionRate`.
- **Dependencies**: a decision on the earn/redeem rate and whether points expire (fraud/liability consideration — points-as-a-currency have real accounting implications, worth a quick sanity check with the user before shipping, not a pure engineering call).
- **Testing**: backend — points awarded correctly on delivery, redemption correctly discounts checkout and can't exceed balance, redemption + real coupon can't double-stack incorrectly (decide if they're mutually exclusive or combinable and test that explicitly).
- **Phasing**: Phase 1 earn-only (no redemption yet) so points visibly accrue and the tier system works → Phase 2 redemption at checkout → Phase 3 tier-based perks (e.g. free delivery above a tier).

## B4. Web customer parity (real auth + wallet + reviews)
**Rationale**: the mobile app has real customer JWT auth, wallet, and
reviews; the web storefront still identifies customers by raw phone number
with a fake OTP. This is the single biggest mobile/web capability gap and
blocks A3's security hardening above — it's listed here as its own strategic
item because it's genuinely large, not a quick fix.
- See **A3** above for the phased plan — this is the same underlying project, just framed here as the "why it matters strategically" entry. Do not scope it twice; A3's 4-phase plan is the actual plan.

## B5. Multi-tenant readiness
**Rationale**: `MEMORY.md` already states multi-tenant is "a stated future
direction (don't gold-plate for it, don't block it)" — this entry exists
purely to name the concrete things that would need to change, so nobody
accidentally paints the codebase into a single-tenant corner while building
A1–B4 above.
- **What NOT to do now**: build a tenant model, tenant-scoped auth, or a tenant admin console — none of that is warranted until there's a second real tenant.
- **What to keep in mind while building anything else**: avoid hardcoding singleton assumptions in *new* code — e.g. a new `Settings` document should conceptually be "per store," even if there's only ever one row today; a new model with a natural `storeId`/`tenantId` field costs nothing to include now and a lot to retrofit later. This is a design-discipline note, not a task to schedule.
- **Dependencies**: a real second-tenant business need. Nothing here should be built speculatively.

---

## Suggested overall sequencing

1. **Finish Part A's dependency-free items first** (A2 retry/backoff, A5 festival parity, A6 Crashlytics, A7 accessibility audit, A8 repo hygiene) — no blockers, pure engineering.
2. **Resolve Part A's external dependencies in parallel** (A1 APNs key, A4(b) telephony provider, A3's web-auth decision) — these need the user's input/budget, not more engineering time, so surface them now rather than letting them silently block later work.
3. **Then B2 (recommendations v1)** — highest value-to-effort ratio in Part B, no dependencies, reuses existing data.
4. **Then B1 (subscriptions) and B3 (loyalty)** — both meaningfully sized features; pick whichever the business wants to prioritize first, since they're independent of each other.
5. **B4 (web auth parity)** is really a prerequisite unlock, not a "nice to have" — the longer it's deferred, the more the security debt in A3 compounds. Worth scheduling deliberately rather than letting it stay permanently "next."
6. **B5 (multi-tenant)** stays a standing design constraint, not a scheduled item, until a real second tenant exists.
