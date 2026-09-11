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
    final stepIdx = _trackingStepIndex(bucket, t.status);
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
          // 1. LIVE INTERACTIVE MAP CARD
          _MapSection(t: t, bucket: bucket, isDark: isDark),
          const SizedBox(height: 14),

          // 2. ETA & LIVE STATUS HERO CARD
          _EtaHeroCard(t: t, bucket: bucket, isDark: isDark),
          const SizedBox(height: 14),

          // 3. 4-STEP MILESTONE TRACKER
          _MilestoneCard(currentStep: stepIdx, isDark: isDark),
          const SizedBox(height: 14),

          // 4. DOORSTEP OTP CODE (when available)
          if (t.deliveryOtp.isNotEmpty) ...[
            _DeliveryOtpCard(otp: t.deliveryOtp, isDark: isDark),
            const SizedBox(height: 14),
          ],

          // 5. DELIVERY PARTNER CARD
          _DeliveryPartnerCard(t: t, isDark: isDark),
          const SizedBox(height: 14),

          // 6. ORDER ITEMS SUMMARY
          if (t.items.isNotEmpty) ...[
            _OrderItemsCard(items: t.items, total: t.total, isDark: isDark),
            const SizedBox(height: 14),
          ],

          // 7. TRACKING TIMELINE
          if (t.timeline.isNotEmpty) ...[
            _TimelineCard(entries: t.timeline, isDark: isDark),
          ],
        ],
      ),
    );
  }
}

int _trackingStepIndex(OrderStatus bucket, String status) {
  if (bucket == OrderStatus.delivered) return 3;
  final s = status.toLowerCase();
  if (bucket == OrderStatus.dispatched ||
      s == 'in progress' ||
      s == 'in transit' ||
      s == 'out for delivery' ||
      s == 'assigned' ||
      s == 'arrived') {
    return 2;
  }
  if (bucket == OrderStatus.processing || s == 'packed' || s == 'ready' || s == 'arrived at store') {
    return 1;
  }
  return 0; // Placed / Pending
}

class _MapSection extends StatelessWidget {
  final TrackingState t;
  final OrderStatus bucket;
  final bool isDark;

  const _MapSection({required this.t, required this.bucket, required this.isDark});

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
      child: Stack(
        children: [
          Positioned.fill(
            child: _LiveMap(t: t, isDark: isDark),
          ),
          // Floating status badge over map bottom
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: (isDark ? const Color(0xFF1E1E20) : Colors.white).withOpacity(0.94),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      bucket == OrderStatus.delivered
                          ? Icons.check_circle_rounded
                          : (t.hasRider ? Icons.delivery_dining_rounded : Icons.storefront_rounded),
                      size: 16,
                      color: AppColors.primaryText,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      bucket == OrderStatus.delivered
                          ? 'Order delivered safely'
                          : (t.hasRider
                              ? 'Rider is on the way to your doorstep'
                              : 'Order being prepared at local dark store'),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
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
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              '10 MINS',
              style: TextStyle(
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

class _MilestoneCard extends StatelessWidget {
  final int currentStep;
  final bool isDark;

  const _MilestoneCard({required this.currentStep, required this.isDark});

  static const _steps = ['Placed', 'Packed', 'In Progress', 'Delivered'];

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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Delivery Milestones',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (var i = 0; i < _steps.length; i++) ...[
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 2.5,
                              color: i == 0
                                  ? Colors.transparent
                                  : (i <= currentStep
                                      ? AppColors.primary
                                      : (isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB))),
                            ),
                          ),
                          _node(i),
                          Expanded(
                            child: Container(
                              height: 2.5,
                              color: i == _steps.length - 1
                                  ? Colors.transparent
                                  : (i < currentStep
                                      ? AppColors.primary
                                      : (isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB))),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _steps[i],
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: i == currentStep
                              ? FontWeight.w800
                              : (i < currentStep ? FontWeight.w600 : FontWeight.w500),
                          color: i == currentStep
                              ? AppColors.primaryText
                              : (i < currentStep
                                  ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
                                  : (isDark ? AppColors.textSecondaryDark : const Color(0xFF9CA3AF))),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _node(int index) {
    final isDone = index < currentStep;
    final isCurrent = index == currentStep;
    if (isDone) {
      return Container(
        width: 20,
        height: 20,
        decoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.check_rounded, color: Colors.white, size: 13),
      );
    }
    if (isCurrent) {
      return Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.35),
              blurRadius: 6,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Center(
          child: Container(
            width: 7,
            height: 7,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
        ),
      );
    }
    return Container(
      width: 16,
      height: 16,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : const Color(0xFFF3F4F6),
        shape: BoxShape.circle,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFD1D5DB),
          width: 1.5,
        ),
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

  const _DeliveryPartnerCard({required this.t, required this.isDark});

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
                Row(
                  children: [
                    Text(
                      t.riderName,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                    if (t.hasRider) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star_rounded, size: 12, color: Color(0xFFD97706)),
                            SizedBox(width: 2),
                            Text(
                              '4.9',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF92400E),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  !t.hasRider
                      ? 'Waiting for a delivery partner'
                      : t.canContact
                          ? t.riderPhone
                          : (t.riderPhoneMasked.isNotEmpty
                              ? '${t.riderPhoneMasked} • contact opens at doorstep'
                              : 'Contact opens when out for delivery'),
                  style: TextStyle(
                    fontSize: 11.5,
                    color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          if (t.canContact) ...[
            GestureDetector(
              onTap: () => dialPhone(t.riderPhone),
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.call_rounded, color: Colors.white, size: 18),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () {
                final digits = t.riderPhone.replaceAll(RegExp(r'[^0-9]'), '');
                final ten = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
                openUrl('https://wa.me/91$ten');
              },
              child: Container(
                padding: const EdgeInsets.all(9),
                decoration: const BoxDecoration(
                  color: Color(0xFF25D366),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.chat_bubble_rounded, color: Colors.white, size: 18),
              ),
            ),
          ],
        ],
      ),
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
