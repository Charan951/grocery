import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/tracking/presentation/controllers/tracking_controller.dart';

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

    return AppScaffold(
      title: 'Order #$orderId',
      onBack: () => context.canPop() ? context.pop() : context.go('/orders'),
      actions: [
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
                  Icon(t.connected ? Icons.circle : Icons.sync_rounded,
                      size: 8, color: t.connected ? AppColors.primaryText : AppColors.warningText),
                  const SizedBox(width: 5),
                  Text(t.connected ? 'Live' : 'Reconnecting',
                      style: AppTypography.labelSmall(
                          t.connected ? AppColors.primaryText : AppColors.warningText)),
                ],
              ),
            ),
          ),
        ),
      ],
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: SafeArea(
          top: false,
          child: SecondaryButton(text: 'Back to home', onPressed: () => context.go('/')),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Live delivery map
            Expanded(
              flex: 4,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFECECEC)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Stack(
                    children: [
                      CustomPaint(
                        painter: TrackingMapPainter(
                          isDark: isDark,
                          status: bucket,
                        ),
                        child: Container(),
                      ),
                      Positioned(
                        top: 20,
                        left: 20,
                        right: 20,
                        child: GlassCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Estimated arrival',
                                    style: AppTypography.bodySmall(
                                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${t.etaMinutes} min',
                                    style: AppTypography.h2(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    ).copyWith(fontSize: 18),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.electric_bolt_rounded,
                                  color: AppColors.primary,
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
            ),

            // Live Order status progress sheet
            Expanded(
              flex: 5,
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 12),
                      GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: AppColors.primary.withOpacity(0.2),
                              child: const Icon(Icons.delivery_dining_rounded, color: AppColors.primary, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    t.riderName,
                                    style: AppTypography.labelLarge(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    !t.hasRider
                                        ? 'Waiting for a delivery partner'
                                        : t.canContact
                                            ? t.riderPhone
                                            : (t.riderPhoneMasked.isNotEmpty
                                                ? '${t.riderPhoneMasked} • contact opens when out for delivery'
                                                : 'Contact opens when out for delivery'),
                                    style: AppTypography.bodySmall(
                                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (t.canContact)
                              Row(
                                children: [
                                  GestureDetector(
                                    onTap: () => dialPhone(t.riderPhone),
                                    child: _buildRoundButton(Icons.call_rounded, isDark),
                                  ),
                                  const SizedBox(width: 8),
                                  GestureDetector(
                                    onTap: () {
                                      final digits = t.riderPhone.replaceAll(RegExp(r'[^0-9]'), '');
                                      final ten = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
                                      openUrl('https://wa.me/91$ten');
                                    },
                                    child: _buildRoundButton(Icons.chat_bubble_rounded, isDark),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      Text(
                        'Order progress',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildTimelineItem('Order Placed', 'Order placed & assigned to Dark Store.', bucket, OrderStatus.placed, isDark, isFirst: true),
                      _buildTimelineItem('Grocery Packing', 'Fresh items packed in insulated bag.', bucket, OrderStatus.processing, isDark),
                      _buildTimelineItem('Out for Delivery', 'Your delivery partner is on the way.', bucket, OrderStatus.dispatched, isDark),
                      _buildTimelineItem('Delivered', 'Order successfully handed over.', bucket, OrderStatus.delivered, isDark, isLast: true),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoundButton(IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? Colors.white10 : Colors.black.withOpacity(0.04),
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        size: 20,
        color: isDark ? Colors.white : AppColors.textPrimary,
      ),
    );
  }

  Widget _buildTimelineItem(
    String title,
    String subtitle,
    OrderStatus currentStatus,
    OrderStatus targetStatus,
    bool isDark, {
    bool isFirst = false,
    bool isLast = false,
  }) {
    final statusIndex = currentStatus.index;
    final targetIndex = targetStatus.index;

    final isCompleted = statusIndex >= targetIndex;
    final isActive = statusIndex == targetIndex;

    final color = isCompleted
        ? AppColors.primary
        : (isDark ? Colors.white24 : Colors.black12);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: isCompleted ? AppColors.primary : Colors.transparent,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isCompleted ? AppColors.primary : (isDark ? Colors.white24 : Colors.black26),
                    width: 2.0,
                  ),
                ),
                child: isActive
                    ? Center(
                        child: Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                      )
                    : null,
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2.0,
                    color: color,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.labelLarge(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ).copyWith(
                    fontWeight: isCompleted ? FontWeight.bold : FontWeight.w500,
                    color: isCompleted ? (isDark ? AppColors.accent : AppColors.primary) : null,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class TrackingMapPainter extends CustomPainter {
  final bool isDark;
  final OrderStatus status;

  TrackingMapPainter({
    required this.isDark,
    required this.status,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = isDark ? const Color(0xFF2C2C2E) : const Color(0xFFECECEC)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    canvas.drawLine(const Offset(30, 0), Offset(30, size.height), linePaint);
    canvas.drawLine(Offset(size.width - 40, 0), Offset(size.width - 40, size.height), linePaint);
    canvas.drawLine(const Offset(0, 100), Offset(size.width, 100), linePaint);
    canvas.drawLine(Offset(0, size.height - 80), Offset(size.width, size.height - 80), linePaint);

    final startPt = Offset(50, size.height - 120);
    final endPt = Offset(size.width - 80, 80);

    final routePaint = Paint()
      ..color = AppColors.primary.withOpacity(0.3)
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(startPt.dx, startPt.dy);
    path.lineTo(startPt.dx, endPt.dy);
    path.lineTo(endPt.dx, endPt.dy);
    canvas.drawPath(path, routePaint);

    final activeRoutePaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    double progress = 0.05;
    if (status == OrderStatus.processing) progress = 0.3;
    if (status == OrderStatus.dispatched) progress = 0.65;
    if (status == OrderStatus.delivered) progress = 1.0;

    final totalX = endPt.dx - startPt.dx;
    final totalY = startPt.dy - endPt.dy;
    final cornerProgress = totalY / (totalX + totalY);

    Offset riderPos;
    if (progress <= cornerProgress) {
      final subProg = progress / cornerProgress;
      riderPos = Offset(startPt.dx, startPt.dy - (totalY * subProg));
    } else {
      final subProg = (progress - cornerProgress) / (1.0 - cornerProgress);
      riderPos = Offset(startPt.dx + (totalX * subProg), endPt.dy);
    }

    final activePath = Path();
    activePath.moveTo(startPt.dx, startPt.dy);
    if (progress <= cornerProgress) {
      activePath.lineTo(riderPos.dx, riderPos.dy);
    } else {
      activePath.lineTo(startPt.dx, endPt.dy);
      activePath.lineTo(riderPos.dx, riderPos.dy);
    }
    canvas.drawPath(activePath, activeRoutePaint);

    final storePaint = Paint()
      ..color = isDark ? Colors.white30 : Colors.black26
      ..style = PaintingStyle.fill;
    canvas.drawCircle(startPt, 8, storePaint);

    final storePoint = Paint()
      ..color = AppColors.accent
      ..style = PaintingStyle.fill;
    canvas.drawCircle(startPt, 5, storePoint);

    canvas.drawCircle(endPt, 12, storePaint);
    final homePoint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.fill;
    canvas.drawCircle(endPt, 8, homePoint);

    final riderBg = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.15)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    canvas.drawCircle(riderPos + const Offset(0, 3), 14, shadowPaint);
    canvas.drawCircle(riderPos, 14, riderBg);

    final riderPoint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.fill;
    canvas.drawCircle(riderPos, 10, riderPoint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
