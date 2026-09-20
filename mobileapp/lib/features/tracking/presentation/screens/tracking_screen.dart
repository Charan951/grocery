import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart/core/widgets/freshcart_map.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/core/utils/web_link.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show bannersProvider;
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/tracking/presentation/controllers/tracking_controller.dart';
import 'package:freshcart/features/tracking/presentation/widgets/order_chat_sheet.dart';

String formatOrderNumber(String orderId) {
  final clean = orderId.replaceAll(RegExp(r'^[#A-Za-z\-_]+'), '');
  return clean.isNotEmpty ? clean : orderId.replaceAll('#', '');
}

/// Only banners with a usable image — otherwise the 46% banner slot is
/// reserved as blank space (the web hides the banner block in that case).
List<dynamic> _activeBanners(List<dynamic> all) => all.where((item) {
      if (item is! Map) return false;
      final b = Map<String, dynamic>.from(item);
      final active = b['active'] ?? b['isActive'];
      if (active == false || active == 0) return false;
      final img = (b['imageUrl'] ?? b['image'] ?? '').toString().trim();
      return img.startsWith('http');
    }).toList();

class TrackingScreen extends ConsumerStatefulWidget {
  final String orderId;

  const TrackingScreen({
    super.key,
    required this.orderId,
  });

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen> {
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// Scroll-linked source of truth for the App Bar's transition, mirroring
  /// the web tracker's `scrollProgress`: 0 at the very top (banner fully
  /// visible, bar transparent) to 1 once the banner has fully scrolled
  /// past (bar solid green). Tied to the banner's actual rendered height
  /// (not a hardcoded constant) so the transition always finishes exactly
  /// as the banner leaves the viewport, at any screen size.
  double _progress(bool hasBanner) {
    if (!_scrollController.hasClients) return 0;
    final bannerHeight =
        hasBanner ? MediaQuery.of(context).size.height * 0.46 : 160.0;
    final offset = _scrollController.offset;
    return (offset / bannerHeight).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final t = ref.watch(trackingProvider(widget.orderId));
    final bucket = t.statusBucket;
    final orderId = widget.orderId;
    final banners = _activeBanners(ref.watch(bannersProvider).valueOrNull ?? const []);
    final hasBanner = banners.isNotEmpty;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(16, 10, 16, 10 + MediaQuery.of(context).padding.bottom),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          border: Border(
            top: BorderSide(
              color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => context.push('/orders/$orderId'),
                icon: const Icon(Icons.receipt_long_rounded, size: 18),
                label: const Text(
                  'Order Details',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  side: BorderSide(
                    color: isDark ? AppColors.dividerDark : const Color(0xFFD1D5DB),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => context.go('/'),
                icon: const Icon(Icons.storefront_rounded, size: 18, color: Colors.white),
                label: const Text(
                  'Back to Store',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 1,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                ),
              ),
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          CustomScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            slivers: [
              // 1. Large banner carousel — fills edge-to-edge from the very
              // top of the page (the App Bar floats transparently over it,
              // as a Stack overlay below, instead of reserving its own
              // height above the banner). Scrolls away completely, same as
              // the web tracker.
              if (banners.isNotEmpty)
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: MediaQuery.of(context).size.height * 0.46,
                    width: double.infinity,
                    child: _TrackingBannerCarousel(banners: banners),
                  ),
                ),

              // 2. LIVE INTERACTIVE MAP CARD — pinned just below the app bar
              // while everything else scrolls underneath it, mirroring the
              // web tracker's pinned-map behavior.
              SliverPersistentHeader(
                pinned: true,
                delegate: _MapHeaderDelegate(
                  t: t,
                  isDark: isDark,
                  controller: _scrollController,
                  transitionPx: hasBanner
                      ? MediaQuery.of(context).size.height * 0.46
                      : 160.0,
                  topInset: MediaQuery.of(context).padding.top + 56,
                ),
              ),

              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([

                    // DOORSTEP OTP CODE (when available)
                    if (t.deliveryOtp.isNotEmpty) ...[
                      _DeliveryOtpCard(otp: t.deliveryOtp, isDark: isDark),
                      const SizedBox(height: 14),
                    ],

                    // DELIVERY PARTNER CARD — shown when assigned or partner name exists
                    if (t.assigned || t.riderName.isNotEmpty) ...[
                      _DeliveryPartnerCard(t: t, isDark: isDark, orderId: orderId),
                      const SizedBox(height: 14),
                    ],

                    // DELIVERY PARTNER RATING CARD — shown when delivered
                    if (bucket == OrderStatus.delivered && t.riderName.isNotEmpty) ...[
                      _DeliveryRatingCard(t: t, orderId: orderId, isDark: isDark),
                      const SizedBox(height: 14),
                    ],

                    // DELIVERY ADDRESS CARD
                    _DeliveryAddressCard(
                      address: t.deliveryAddress,
                      isDark: isDark,
                      isDelivered: bucket == OrderStatus.delivered,
                    ),
                    const SizedBox(height: 14),

                    // TRACKING TIMELINE
                    if (t.timeline.isNotEmpty) ...[
                      _TimelineCard(entries: t.timeline.reversed.toList(), isDark: isDark),
                      const SizedBox(height: 14),
                    ],

                    // ORDER ITEMS SUMMARY
                    if (t.items.isNotEmpty) ...[
                      _OrderItemsCard(items: t.items, total: t.total, isDark: isDark),
                    ],
                  ]),
                ),
              ),
            ],
          ),

          // 0. Floating App Bar overlay — NOT a sliver, so it never reserves
          // layout height above the banner (mirrors the web tracker's
          // `sticky` + negative-margin trick for an edge-to-edge banner
          // under a transparent bar). Rebuilds every scroll frame via
          // AnimatedBuilder listening directly to the ScrollController
          // (no setState needed), so every visual — background, back
          // button style, headline/pill opacity — interpolates
          // continuously with scroll progress instead of snapping at a
          // threshold.
          AnimatedBuilder(
            animation: _scrollController,
            builder: (context, _) {
              return _TrackingAppBar(
                progress: _progress(hasBanner),
                isDark: isDark,
                t: t,
                onBack: () => context.canPop() ? context.pop() : context.go('/orders'),
                onRefresh: () => ref.invalidate(trackingProvider(orderId)),
              );
            },
          ),
        ],
      ),
    );
  }
}

/// Redesigned App Bar. Initial state (top of page, banner visible) = a
/// minimal floating circular back button over the banner — no title, no
/// help icon. Scrolled state = a solid green (#0C8B4F) full-width bar with
/// back button + order-status headline + an "Arriving in X mins • Live"
/// pill with a refresh icon. Every property (background alpha, padding,
/// back-button size/tint/shadow, headline+pill opacity) is a direct
/// function of `progress` — continuous, not a hard snap — mirroring the
/// web tracker's `barT` easing.
class _TrackingAppBar extends StatelessWidget {
  final double progress;
  final bool isDark;
  final TrackingState t;
  final VoidCallback onBack;
  final VoidCallback onRefresh;

  const _TrackingAppBar({
    required this.progress,
    required this.isDark,
    required this.t,
    required this.onBack,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    final isDelivered = t.statusBucket == OrderStatus.delivered;

    // Bar-only easing: stays fully transparent while the banner is still
    // mostly on screen, then ramps to solid over the back half of the
    // scroll — matches the web tracker's `barT` so the green fill never
    // reads as a muddy tint over the banner photo.
    final barT = ((progress - 0.5) / 0.5).clamp(0.0, 1.0);

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: IgnorePointer(
        ignoring: false,
        child: Container(
          padding: EdgeInsets.only(
            top: topPad + 10 + 2 * barT,
            left: 12,
            right: 12,
            bottom: 10 + 8 * barT,
          ),
          decoration: BoxDecoration(
            color: Color.lerp(Colors.transparent, const Color(0xFF0C8B4F), barT),
            boxShadow: barT > 0.5
                ? [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 2))]
                : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                // Fixed at the 44px touch-target minimum (was 36-40px,
                // shrinking further with scroll — matches the web
                // tracker's /impeccable audit fix). Only color/shadow
                // cross-fade now, not size.
                height: 44,
                child: _CircleIconButton(
                  icon: Icons.arrow_back_rounded,
                  onTap: onBack,
                  filled: Color.lerp(Colors.white.withOpacity(0.95), Colors.white.withOpacity(0.15), barT)!,
                  iconColor: Color.lerp(const Color(0xFF1F2937), Colors.white, barT)!,
                  size: 44,
                  shadow: barT < 0.5,
                ),
              ),

              // SCROLLED content: order headline + "Arriving in X mins •
              // Live" pill. Always laid out, cross-fading in via opacity
              // so it never hard-pops the instant progress crosses a
              // threshold. Collapsed to zero height pre-scroll via
              // ClipRect + AnimatedSize-free interpolation (SizedBox with
              // a height tied to barT) so it never reserves space over
              // the banner while transparent.
              ClipRect(
                child: Align(
                  alignment: Alignment.topLeft,
                  heightFactor: barT,
                  child: Opacity(
                    opacity: barT,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            isDelivered
                                ? 'Order delivered'
                                : (t.hasRider
                                    ? 'Delivery partner is heading to your drop'
                                    : (t.statusBucket == OrderStatus.processing
                                        ? 'Order packed'
                                        : 'Order accepted — preparing your order')),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      isDelivered
                                          ? 'Delivered'
                                          : 'Arriving in ${t.etaMinutes} min${t.etaMinutes == 1 ? '' : 's'}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      width: 3,
                                      height: 3,
                                      decoration: const BoxDecoration(color: Colors.white54, shape: BoxShape.circle),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.circle, size: 6, color: Colors.white),
                                    const SizedBox(width: 3),
                                    const Text('Live', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              // 36px, not the 44px ideal (matches the web
                              // tracker's /impeccable audit tradeoff) — a
                              // full 44px would overwhelm this compact
                              // pill's proportions; 36px is a meaningful
                              // step up from the original 26px.
                              _CircleIconButton(
                                icon: Icons.refresh_rounded,
                                onTap: onRefresh,
                                filled: Colors.white.withOpacity(0.15),
                                iconColor: Colors.white,
                                size: 36,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color filled;
  final Color iconColor;
  final double size;
  final bool shadow;

  const _CircleIconButton({
    required this.icon,
    required this.onTap,
    required this.filled,
    required this.iconColor,
    this.size = 34,
    this.shadow = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: filled,
          shape: BoxShape.circle,
          boxShadow: shadow
              ? [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 8, offset: const Offset(0, 1))]
              : null,
        ),
        child: Icon(icon, size: size * 0.5, color: iconColor),
      ),
    );
  }
}

/// Promotional CMS banner carousel shown at the top of the tracking screen,
/// mirroring the web tracker's large hero banner that scrolls away.
class _TrackingBannerCarousel extends StatefulWidget {
  final List<dynamic> banners;
  const _TrackingBannerCarousel({required this.banners});

  @override
  State<_TrackingBannerCarousel> createState() => _TrackingBannerCarouselState();
}

class _TrackingBannerCarouselState extends State<_TrackingBannerCarousel> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeBanners = widget.banners.where((item) {
      if (item is! Map) return false;
      final b = Map<String, dynamic>.from(item);
      final active = b['active'] ?? b['isActive'];
      if (active == false || active == 0) return false;
      final img = (b['imageUrl'] ?? b['image'] ?? '').toString().trim();
      return img.isNotEmpty && img.startsWith('http');
    }).toList();

    if (activeBanners.isEmpty) return const SizedBox.shrink();

    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          controller: _controller,
          onPageChanged: (i) => setState(() => _page = i),
          itemCount: activeBanners.length,
          itemBuilder: (context, i) {
            final b = Map<String, dynamic>.from(activeBanners[i] as Map);
            final img = (b['imageUrl'] ?? b['image'] ?? '') as String;
            final route = resolveAppRoute((b['linkUrl'] ?? '') as String);
            return GestureDetector(
              onTap: route == null ? null : () => context.push(route),
              child: CachedNetworkImage(imageUrl: img, fit: BoxFit.cover, width: double.infinity),
            );
          },
        ),
        if (activeBanners.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(activeBanners.length, (i) {
                final active = i == _page;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 16 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? Colors.white : Colors.white38,
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }
}

/// Pinned map header: keeps the live map flush below the app bar while the
/// rest of the tracking content (ETA, OTP, partner, timeline) scrolls
/// underneath it — mirrors the web tracker's fixed-map-on-scroll behavior.
class _MapHeaderDelegate extends SliverPersistentHeaderDelegate {
  final TrackingState t;
  final bool isDark;
  final ScrollController controller;
  // Scroll distance over which the ETA card collapses and the map grows —
  // the banner's height, same as the web tracker's TRANSITION_PX.
  final double transitionPx;
  // Height of the app bar the map must sit flush below once pinned —
  // matches the web tracker's `appBarH`-driven map top offset.
  final double topInset;
  static const double _startH = 228;
  static const double _pinnedH = 250;

  _MapHeaderDelegate({
    required this.t,
    required this.isDark,
    required this.controller,
    required this.transitionPx,
    required this.topInset,
  });

  @override
  double get minExtent => topInset + _pinnedH + 12;

  @override
  double get maxExtent => topInset + _pinnedH + 12;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final p = controller.hasClients
            ? (controller.offset / transitionPx).clamp(0.0, 1.0)
            : 0.0;
        final h = _startH + (_pinnedH - _startH) * p;
        return Padding(
          padding: EdgeInsets.fromLTRB(16, topInset + 12, 16, 0),
          child: Align(
            alignment: Alignment.topCenter,
            child: SizedBox(
              height: h,
              // ETA column (0.85fr) collapses to 0 while the map (1.15fr →
              // 2fr) grows to fill the row, like the web tracker's grid.
              child: LayoutBuilder(
                builder: (context, c) {
                  final gap = 14.0 * (1 - p);
                  final etaFr = 0.85 * (1 - p);
                  final mapFr = 1.15 + 0.85 * p;
                  final usable = c.maxWidth - gap;
                  final etaW = usable * etaFr / (etaFr + mapFr);
                  final mapW = usable - etaW;
                  return Row(
                    children: [
                      if (etaW > 1)
                        Opacity(
                          opacity: 1 - p,
                          child: SizedBox(
                            width: etaW,
                            height: h,
                            child: ClipRect(
                              child: OverflowBox(
                                alignment: Alignment.topLeft,
                                minWidth: usable * 0.85 / 2,
                                maxWidth: usable * 0.85 / 2,
                                child: _EtaSideCard(t: t, isDark: isDark),
                              ),
                            ),
                          ),
                        ),
                      SizedBox(width: gap),
                      SizedBox(
                        width: mapW,
                        height: h,
                        child: Container(
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF242426) : const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
                            ),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Stack(
                            children: [
                              Positioned.fill(child: _LiveMap(t: t, isDark: isDark)),
                              Positioned(
                                top: 10,
                                left: 10,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.95),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.circle, size: 8, color: Color(0xFF10B981)),
                                      SizedBox(width: 5),
                                      Text(
                                        'Live GPS',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF1F2937),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  bool shouldRebuild(covariant _MapHeaderDelegate oldDelegate) {
    return oldDelegate.t != t ||
        oldDelegate.isDark != isDark ||
        oldDelegate.topInset != topInset ||
        oldDelegate.transitionPx != transitionPx;
  }
}

/// Compact mint ETA card shown left of the map (web tracker's hero card).
class _EtaSideCard extends StatelessWidget {
  final TrackingState t;
  final bool isDark;

  const _EtaSideCard({required this.t, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final isDelivered = t.statusBucket == OrderStatus.delivered;
    final sub = isDelivered
        ? 'Groceries delivered with care'
        : (t.hasRider
            ? 'Delivery partner is heading to your drop'
            : 'Items being packed at FreshCart Dark Store');

    return Container(
      height: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2922) : const Color(0xFFE8F8F0),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFFA7F3D0).withOpacity(0.7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.bolt_rounded, size: 20, color: Color(0xFF065F46)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Estimated Arrival',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563),
                      ),
                    ),
                    Text(
                      isDelivered ? 'Delivered' : '${t.etaMinutes} mins',
                      maxLines: 1,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        height: 1.15,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            sub,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              height: 1.3,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563),
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.95),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.circle, size: 8, color: Color(0xFF10B981)),
                SizedBox(width: 6),
                Text(
                  'Live',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF1F2937)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


class _DeliveryOtpCard extends StatelessWidget {
  final String otp;
  final bool isDark;
  const _DeliveryOtpCard({required this.otp, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2922) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF86EFAC)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lock_outline_rounded, color: AppColors.primaryText, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'DOORSTEP CODE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                    color: AppColors.primaryText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Share with delivery partner at door',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: Text(
              otp.split('').join(' '),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: AppColors.primaryText,
                letterSpacing: 2,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DeliveryPartnerCard extends StatelessWidget {
  final TrackingState t;
  final bool isDark;
  final String orderId;

  const _DeliveryPartnerCard({required this.t, required this.isDark, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            'DELIVERY PARTNER',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
              color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary.withOpacity(0.15),
            child: const Icon(
              Icons.delivery_dining_rounded,
              color: AppColors.primary,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t.riderName,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ),
                ),
                if (!t.hasRider) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Waiting for a delivery partner',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Builder(
            builder: (context) => GestureDetector(
              onTap: () => showOrderChatSheet(context, orderId: orderId, partnerName: t.riderName),
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2A2A2C) : const Color(0xFFF3F4F6),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.forum_rounded,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  size: 18,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => dialPhone(t.riderPhone.isNotEmpty ? t.riderPhone : t.riderPhoneMasked),
            child: Container(
              padding: const EdgeInsets.all(9),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.call_rounded, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    ),
      ],
    );
  }
}

class _OrderItemsCard extends StatelessWidget {
  final List<CartItemModel> items;
  final double total;
  final bool isDark;

  const _OrderItemsCard({required this.items, required this.total, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Items (${items.length})',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              Divider(
                height: 16,
                color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6),
              ),
            Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${items[i].quantity}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryText,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        items[i].product.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      if (items[i].selectedWeight.isNotEmpty)
                        Text(
                          items[i].selectedWeight,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '₹${items[i].totalPrice.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Divider(
              height: 1,
              color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Amount',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ),
              ),
              Text(
                '₹${total.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primaryText,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _fmtTime(DateTime d) {
  final l = d.toLocal();
  final h = l.hour % 12 == 0 ? 12 : l.hour % 12;
  final m = l.minute.toString().padLeft(2, '0');
  return '${h.toString().padLeft(2, '0')}:$m ${l.hour >= 12 ? 'pm' : 'am'}';
}

class _TimelineCard extends StatelessWidget {
  final List<OrderTimelineEntry> entries;
  final bool isDark;

  const _TimelineCard({required this.entries, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.format_list_bulleted_rounded,
                  size: 18, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
              const SizedBox(width: 8),
              Text(
                'Status Updates',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (var i = 0; i < entries.length; i++)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    if (i != entries.length - 1)
                      Container(
                        width: 2,
                        height: 32,
                        color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              entries[i].status,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                              ),
                            ),
                            if (entries[i].at != null)
                              Text(
                                _fmtTime(entries[i].at!),
                                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                              ),
                          ],
                        ),
                        if (entries[i].note.isNotEmpty)
                          Text(
                            entries[i].note,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _DeliveryAddressCard extends StatelessWidget {
  final String address;
  final bool isDark;
  final bool isDelivered;

  const _DeliveryAddressCard({
    required this.address,
    required this.isDark,
    required this.isDelivered,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2A2A2C) : const Color(0xFFF3F4F6),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.location_on_rounded,
              color: isDark ? AppColors.textPrimaryDark : const Color(0xFF374151),
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Delivery Address',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                    if (!isDelivered)
                      GestureDetector(
                        onTap: () => context.push('/addresses'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F8F0),
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: const Text(
                            'Change',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF047857),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  address,
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DeliveryRatingCard extends ConsumerStatefulWidget {
  final TrackingState t;
  final String orderId;
  final bool isDark;

  const _DeliveryRatingCard({
    required this.t,
    required this.orderId,
    required this.isDark,
  });

  @override
  ConsumerState<_DeliveryRatingCard> createState() => _DeliveryRatingCardState();
}

class _DeliveryRatingCardState extends ConsumerState<_DeliveryRatingCard> {
  int _stars = 0;
  final _commentController = TextEditingController();
  bool _busy = false;
  bool _editing = false;
  bool _submitted = false;

  @override
  void initState() {
    super.initState();
    if (widget.t.deliveryRating != null) {
      _stars = (widget.t.deliveryRating!['stars'] as num?)?.toInt() ?? 0;
      _commentController.text = (widget.t.deliveryRating!['comment'] as String?) ?? '';
      _submitted = _stars > 0;
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_stars == 0 || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(trackingProvider(widget.orderId).notifier).submitRating(
        _stars,
        _commentController.text,
      );
      if (mounted) {
        setState(() {
          _busy = false;
          _editing = false;
          _submitted = true;
        });
        AppToast.success('Rating submitted! Thank you.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _busy = false);
        AppToast.error('Could not save rating');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final existingRating = (widget.t.deliveryRating?['stars'] as num?)?.toInt() ?? 0;
    final partnerName = widget.t.riderName.isNotEmpty ? widget.t.riderName : 'Delivery Partner';

    return Container(
      decoration: BoxDecoration(
        color: widget.isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: widget.isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(widget.isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            (existingRating > 0 || _submitted)
                ? 'Thanks for rating your delivery'
                : 'Rate your delivery by $partnerName',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: widget.isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(5, (index) {
              final starNum = index + 1;
              final isFilled = starNum <= (_stars > 0 ? _stars : existingRating);
              return GestureDetector(
                onTap: _busy ? null : () => setState(() {
                  _stars = starNum;
                  _submitted = false;
                }),
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Icon(
                    isFilled ? Icons.star_rounded : Icons.star_border_rounded,
                    color: isFilled ? const Color(0xFFF59E0B) : const Color(0xFFD1D5DB),
                    size: 32,
                  ),
                ),
              );
            }),
          ),
          if (_editing || (existingRating == 0 && !_submitted)) ...[
            const SizedBox(height: 10),
            TextField(
              controller: _commentController,
              maxLength: 300,
              maxLines: 2,
              style: TextStyle(fontSize: 12, color: widget.isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Add a note (optional)',
                counterText: '',
                filled: true,
                fillColor: widget.isDark ? const Color(0xFF2A2A2C) : const Color(0xFFF9FAFB),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: widget.isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: widget.isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
                ),
              ),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: (_stars > 0 && !_busy) ? _submit : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
              ),
              child: Text(
                _busy ? 'Saving…' : 'Submit rating',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ),
          ] else if (existingRating > 0 || _submitted) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => setState(() => _editing = true),
              child: const Text(
                'Change rating',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF047857),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Real map: OSM tiles + Store marker + Rider marker + Drop marker + route curve (OSRM / fallback).
class _LiveMap extends ConsumerStatefulWidget {
  final TrackingState t;
  final bool isDark;
  const _LiveMap({required this.t, required this.isDark});

  @override
  ConsumerState<_LiveMap> createState() => _LiveMapState();
}

class _LiveMapState extends ConsumerState<_LiveMap> with TickerProviderStateMixin {
  late final FreshCartMapController _map = FreshCartMapController(vsync: this);
  late final AnimationController _pulseController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2000),
  )..repeat();

  LatLng get _dest => widget.t.destination ?? const LatLng(17.4468, 78.3888);
  LatLng get _store => widget.t.storeLocation ?? const LatLng(17.4490, 78.3740);
  LatLng get _origin => widget.t.riderLocation;

  List<LatLng> get _effectiveRoutePoints {
    if (widget.t.routePoints.length >= 2) {
      return widget.t.routePoints;
    }
    return <LatLng>[_store, _origin, _dest];
  }

  void _recenter() {
    _map.fitCoordinates(
      <LatLng>[_store, _origin, _dest],
      padding: const EdgeInsets.fromLTRB(36, 32, 36, 56),
      maxZoom: 17.5,
      minZoom: 14.5,
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _recenter());
  }

  @override
  void didUpdateWidget(covariant _LiveMap old) {
    super.didUpdateWidget(old);
    if (old.t.riderLocation != widget.t.riderLocation ||
        old.t.destination != widget.t.destination ||
        old.t.storeLocation != widget.t.storeLocation ||
        old.t.routePoints != widget.t.routePoints) {
      _recenter();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _map.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final routePts = _effectiveRoutePoints;

    final markers = <Marker>[
      // 1. Store Marker ("FreshCart HITEC City")
      Marker(
        point: _store,
        width: 90,
        height: 62,
        alignment: Alignment.topCenter,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFF059669),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF059669).withOpacity(0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 2),
            const Text(
              'FreshCart\nHITEC City',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFF111827),
                height: 1.1,
              ),
            ),
          ],
        ),
      ),

      // 2. Rider Marker (Delivery Partner with animated pulse ring)
      Marker(
        point: _origin,
        width: 54,
        height: 54,
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final v = _pulseController.value;
                return Container(
                  width: 24 + (30 * v),
                  height: 24 + (30 * v),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF10B981).withOpacity(0.35 * (1 - v)),
                  ),
                );
              },
            ),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFF059669),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.22),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(
                Icons.delivery_dining_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
        ),
      ),

      // 3. Destination Drop Marker ("Delivery Address")
      Marker(
        point: _dest,
        width: 48,
        height: 48,
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final v = _pulseController.value;
                return Container(
                  width: 20 + (28 * v),
                  height: 20 + (28 * v),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF3B82F6).withOpacity(0.3 * (1 - v)),
                  ),
                );
              },
            ),
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.4),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ];

    return FreshCartMap(
      controller: _map,
      initialCenter: _origin,
      initialZoom: 15.5,
      isDark: widget.isDark,
      routePoints: routePts,
      routeColor: AppColors.primary,
      routeWidth: 4.5,
      markers: markers,
      showPulseMarker: false,
      showAttribution: true,
      showControls: true,
      fitPadding: const EdgeInsets.fromLTRB(36, 32, 36, 56),
      fitMinZoom: 14.5,
      fitMaxZoom: 17.5,
      onMapReady: _recenter,
    );
  }
}
