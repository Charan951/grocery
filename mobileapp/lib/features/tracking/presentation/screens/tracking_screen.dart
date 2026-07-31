import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

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

    final orders = ref.watch(ordersProvider);
    final order = orders.firstWhere(
      (o) => o.id == orderId,
      orElse: () => orders.first,
    );

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: Text('Track Order: $orderId'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            context.go('/');
          },
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Map Area (Mock Visualizer)
            Expanded(
              flex: 4,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
                      blurRadius: 30,
                    )
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(32),
                  child: Stack(
                    children: [
                      // Map custom painter
                      CustomPaint(
                        painter: TrackingMapPainter(
                          isDark: isDark,
                          status: order.status,
                        ),
                        child: Container(),
                      ),
                      
                      // Floating ETA Card
                      Positioned(
                        top: 20,
                        left: 20,
                        right: 20,
                        child: GlassCard(
                          padding: const EdgeInsets.all(16),
                          color: isDark ? const Color(0xE01C1C1E) : const Color(0xE6FFFFFF),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Estimated Arrival',
                                    style: AppTypography.bodySmall(
                                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    order.eta == 'Delivered' ? 'Delivered' : 'Arriving in ${order.eta}',
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
                      
                      // Driver Info Card
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
                                    'Ramesh Kumar',
                                    style: AppTypography.labelLarge(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      const Icon(Icons.star_rounded, color: AppColors.warning, size: 14),
                                      const SizedBox(width: 4),
                                      Text(
                                        '4.9 (1.2k deliveries)',
                                        style: AppTypography.bodySmall(
                                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            // Action buttons
                            Row(
                              children: [
                                _buildRoundButton(Icons.call_rounded, isDark),
                                const SizedBox(width: 8),
                                _buildRoundButton(Icons.chat_bubble_rounded, isDark),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Status Timeline
                      Text(
                        'Delivery Timeline',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildTimelineItem('Order Placed', 'We have received your order.', order.status, OrderStatus.placed, isDark, isFirst: true),
                      _buildTimelineItem('Grocery Packing', 'Your fresh items are being carefully packed at our dark store.', order.status, OrderStatus.processing, isDark),
                      _buildTimelineItem('Out for Delivery', 'Our delivery partner is on the way to your door.', order.status, OrderStatus.dispatched, isDark),
                      _buildTimelineItem('Delivered', 'Order successfully received.', order.status, OrderStatus.delivered, isDark, isLast: true),

                      const SizedBox(height: 24),
                      PrimaryButton(
                        text: 'Go to Homepage',
                        onPressed: () => context.go('/'),
                      ),
                      const SizedBox(height: 32),
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
          // Timeline indicator
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
          
          // Details
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

    // Draw simple grid map roads
    canvas.drawLine(const Offset(30, 0), Offset(30, size.height), linePaint);
    canvas.drawLine(Offset(size.width - 40, 0), Offset(size.width - 40, size.height), linePaint);
    canvas.drawLine(const Offset(0, 100), Offset(size.width, 100), linePaint);
    canvas.drawLine(Offset(0, size.height - 80), Offset(size.width, size.height - 80), linePaint);

    // Dark store coordinate (A) & Delivery Destination coordinate (B)
    final startPt = Offset(50, size.height - 120);
    final endPt = Offset(size.width - 80, 80);

    // Route line path
    final routePaint = Paint()
      ..color = AppColors.primary.withOpacity(0.3)
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(startPt.dx, startPt.dy);
    // Draw L-shaped path
    path.lineTo(startPt.dx, endPt.dy);
    path.lineTo(endPt.dx, endPt.dy);
    canvas.drawPath(path, routePaint);

    // Draw active completed path
    final activeRoutePaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    double progress = 0.05; // Placed
    if (status == OrderStatus.processing) progress = 0.3;
    if (status == OrderStatus.dispatched) progress = 0.65;
    if (status == OrderStatus.delivered) progress = 1.0;

    // Calculate rider position coordinate on path
    Offset riderPos;
    final totalX = endPt.dx - startPt.dx;
    final totalY = startPt.dy - endPt.dy;
    final cornerProgress = totalY / (totalX + totalY);

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

    // Pin points A (Dark Store) and B (Home)
    final storePaint = Paint()
      ..color = isDark ? Colors.white30 : Colors.black26
      ..style = PaintingStyle.fill;
    canvas.drawCircle(startPt, 8, storePaint);

    final storePoint = Paint()
      ..color = AppColors.accent
      ..style = PaintingStyle.fill;
    canvas.drawCircle(startPt, 5, storePoint);

    // Pin Home
    canvas.drawCircle(endPt, 12, storePaint);
    final homePoint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.fill;
    canvas.drawCircle(endPt, 8, homePoint);

    // Rider Icon circle marker
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
