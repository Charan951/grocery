import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart/core/widgets/freshcart_map.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/tracking/presentation/controllers/tracking_controller.dart';
import 'package:freshcart/features/tracking/presentation/widgets/order_chat_sheet.dart';

String formatOrderNumber(String orderId) {
  final clean = orderId.replaceAll(RegExp(r'^[#A-Za-z\-_]+'), '');
  return clean.isNotEmpty ? clean : orderId.replaceAll('#', '');
}

class TrackingScreen extends ConsumerWidget {
  final String orderId;

  const TrackingScreen({
    super.key,
    required this.orderId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final t = ref.watch(trackingProvider(orderId));
    final bucket = t.statusBucket;
    final orderNum = formatOrderNumber(orderId);

    return AppScaffold(
      titleWidget: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(
          'Track Order $orderNum',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ),
        ),
      ),
      onBack: () => context.canPop() ? context.pop() : context.go('/orders'),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 4),
          child: IconButton(
            tooltip: 'Copy Order Number',
            icon: const Icon(Icons.copy_rounded, size: 18),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: orderNum));
              AppToast.success('Order number copied: $orderNum');
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: (t.connected ? AppColors.primary : AppColors.warning).withOpacity(0.12),
                borderRadius: BorderRadius.circular(100),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    t.connected ? Icons.circle : Icons.sync_rounded,
                    size: 8,
                    color: t.connected ? AppColors.primaryText : AppColors.warningText,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    t.connected ? 'Live GPS' : 'Connecting',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: t.connected ? AppColors.primaryText : AppColors.warningText,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
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
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => context.go('/'),
                icon: const Icon(Icons.storefront_rounded, size: 18, color: Colors.white),
                label: const Text(
                  'Back to Home',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 1,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          // 1. LIVE INTERACTIVE MAP CARD — only while a partner is assigned
          // and the order is still active; hidden before assignment and
          // after completion.
          if (t.assigned) ...[
            _MapSection(t: t, isDark: isDark),
            const SizedBox(height: 14),
          ],

          // 2. ETA & LIVE STATUS HERO CARD
          _EtaHeroCard(t: t, bucket: bucket, isDark: isDark),
          const SizedBox(height: 14),

          // 3. DOORSTEP OTP CODE (when available)
          if (t.deliveryOtp.isNotEmpty) ...[
            _DeliveryOtpCard(otp: t.deliveryOtp, isDark: isDark),
            const SizedBox(height: 14),
          ],

          // 4. DELIVERY PARTNER CARD — only once actually assigned.
          if (t.assigned) ...[
            _DeliveryPartnerCard(t: t, isDark: isDark, orderId: orderId),
            const SizedBox(height: 14),
          ],

          // 5. TRACKING TIMELINE
          if (t.timeline.isNotEmpty) ...[
            _TimelineCard(entries: t.timeline, isDark: isDark),
            const SizedBox(height: 14),
          ],

          // 6. ORDER ITEMS SUMMARY — kept last per request
          if (t.items.isNotEmpty) ...[
            _OrderItemsCard(items: t.items, total: t.total, isDark: isDark),
          ],
        ],
      ),
    );
  }
}

class _MapSection extends StatelessWidget {
  final TrackingState t;
  final bool isDark;

  const _MapSection({required this.t, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 270,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF242426) : const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: _LiveMap(t: t, isDark: isDark),
    );
  }
}

class _EtaHeroCard extends StatelessWidget {
  final TrackingState t;
  final OrderStatus bucket;
  final bool isDark;

  const _EtaHeroCard({required this.t, required this.bucket, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final isDelivered = bucket == OrderStatus.delivered;

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
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isDelivered ? Icons.check_circle_rounded : Icons.bolt_rounded,
              color: AppColors.primaryText,
              size: 26,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ESTIMATED ARRIVAL',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                    color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isDelivered ? 'Delivered' : '${t.etaMinutes} mins',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isDelivered
                      ? 'Groceries delivered with care'
                      : (t.hasRider
                          ? 'Delivery partner is heading to your drop'
                          : 'Items being packed at FreshCart Dark Store'),
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (!isDelivered)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${t.etaMinutes} MINS',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primaryText,
                ),
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
            'DELIVERY PARTNER DETAILS',
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
          Text(
            'Order Status Updates',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ),
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
                        Text(
                          entries[i].status,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ),
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

/// Real map: OSM tiles + rider marker + drop marker + rider→drop route (OSRM,
/// straight-line fallback). Recenters as the rider moves.
class _LiveMap extends ConsumerStatefulWidget {
  final TrackingState t;
  final bool isDark;
  const _LiveMap({required this.t, required this.isDark});

  @override
  ConsumerState<_LiveMap> createState() => _LiveMapState();
}

class _LiveMapState extends ConsumerState<_LiveMap> with TickerProviderStateMixin {
  late final FreshCartMapController _map = FreshCartMapController(vsync: this);

  LatLng get _dest => widget.t.destination ?? const LatLng(17.4474, 78.3762);
  LatLng get _store =>
      widget.t.storeLocation ?? LatLng(_dest.latitude - 0.0085, _dest.longitude + 0.0075);
  LatLng get _origin => widget.t.hasRider ? widget.t.riderLocation : _store;

  List<LatLng> get _effectiveRoutePoints {
    if (widget.t.routePoints.length >= 2) {
      return widget.t.routePoints;
    }
    return <LatLng>[_origin, _dest];
  }

  void _recenter() {
    _map.fitCoordinates(
      _effectiveRoutePoints,
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
        old.t.hasRider != widget.t.hasRider ||
        old.t.routePoints != widget.t.routePoints) {
      _recenter();
    }
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final routePts = _effectiveRoutePoints;

    final markers = <Marker>[
      // 1. Origin marker: Rider bike (if assigned) or FreshCart Dark Store
      if (t.hasRider)
        Marker(
          point: t.riderLocation,
          width: 50,
          height: 56,
          alignment: Alignment.topCenter,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.18),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: const Text(
                  'Rider',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
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
        )
      else
        Marker(
          point: _store,
          width: 64,
          height: 56,
          alignment: Alignment.topCenter,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF1B5E20),
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.18),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: const Text(
                  'Dark Store',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFF2E7D32),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.storefront_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ],
          ),
        ),

      // 2. Destination marker (Customer Home / Delivery Drop)
      Marker(
        point: _dest,
        width: 48,
        height: 56,
        alignment: Alignment.topCenter,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.18),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: const Text(
                'Drop',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFD32F2F),
                ),
              ),
            ),
            const SizedBox(height: 2),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFE53935),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.home_rounded,
                color: Colors.white,
                size: 18,
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
