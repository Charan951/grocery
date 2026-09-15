import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

/// Same stable per-customer order number ("#1" = the customer's very first
/// order) shown on the Your Orders list — falls back to the raw order id
/// while that list hasn't loaded yet.
String _friendlyOrderNumber(String orderId, WidgetRef ref) {
  final orders = ref.watch(ordersProvider).asData?.value;
  if (orders != null) {
    final total = orders.length;
    final idx = orders.indexWhere((o) => o.id == orderId);
    if (idx != -1) return '${total - idx}';
  }
  return orderId;
}

class _Step {
  final String label;
  final IconData icon;
  const _Step(this.label, this.icon);
}

const _kSteps = [
  _Step('Order Placed', Icons.done_all_rounded),
  _Step('Processing', Icons.inventory_2_rounded),
  _Step('Out for Delivery', Icons.local_shipping_rounded),
  _Step('Delivered', Icons.home_rounded),
];

class OrderPlacedScreen extends ConsumerWidget {
  final String orderId;
  const OrderPlacedScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final friendlyNumber = orderId.isEmpty ? '' : _friendlyOrderNumber(orderId, ref);
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final now = DateTime.now();
    final placedAt = '${now.day.toString().padLeft(2, '0')} '
        '${_month(now.month)} ${now.year}, '
        '${_hour12(now.hour)}:${now.minute.toString().padLeft(2, '0')} '
        '${now.hour >= 12 ? 'PM' : 'AM'}';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/'); // never trap the user in the funnel
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Close
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    onPressed: () => context.go('/'),
                    icon: const Icon(Icons.close_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
                      foregroundColor: subColor,
                      shape: const CircleBorder(),
                    ),
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        const SizedBox(height: 8),
                        TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: 1),
                          duration: const Duration(milliseconds: 500),
                          curve: Curves.easeOutBack,
                          builder: (context, t, child) => Transform.scale(scale: t, child: child),
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 28, offset: const Offset(0, 12)),
                              ],
                            ),
                            child: const Icon(Icons.done_all_rounded, size: 48, color: Colors.white),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text('Order Placed!', style: AppTypography.h1(textColor), textAlign: TextAlign.center),
                        const SizedBox(height: 8),
                        Text(
                          'Thank you for shopping with us.\nYour order has been placed successfully.',
                          textAlign: TextAlign.center,
                          style: AppTypography.bodyMedium(subColor),
                        ),

                        if (orderId.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: AppColors.primary.withOpacity(0.15)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.description_rounded, color: AppColors.primaryText, size: 18),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'ORDER NUMBER',
                                        style: AppTypography.labelSmall(AppColors.primaryText.withOpacity(0.8))
                                            .copyWith(letterSpacing: 0.5),
                                      ),
                                      const SizedBox(height: 2),
                                      Text('Order #$friendlyNumber', style: AppTypography.h3(textColor), overflow: TextOverflow.ellipsis),
                                      const SizedBox(height: 2),
                                      Text(placedAt, style: AppTypography.bodySmall(subColor)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 28),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (var i = 0; i < _kSteps.length; i++) ...[
                              Expanded(
                                child: Column(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: i == 0
                                            ? AppColors.primary
                                            : (isDark ? Colors.white10 : Colors.black.withOpacity(0.06)),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        _kSteps[i].icon,
                                        size: 18,
                                        color: i == 0 ? Colors.white : subColor,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      _kSteps[i].label,
                                      textAlign: TextAlign.center,
                                      style: AppTypography.labelSmall(i == 0 ? textColor : subColor),
                                    ),
                                  ],
                                ),
                              ),
                              if (i != _kSteps.length - 1)
                                Padding(
                                  padding: const EdgeInsets.only(top: 21),
                                  child: SizedBox(
                                    width: 16,
                                    child: Divider(color: isDark ? AppColors.dividerDark : AppColors.divider, thickness: 2),
                                  ),
                                ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),
                if (orderId.isNotEmpty)
                  PrimaryButton(
                    text: 'Go to Orders',
                    icon: const Icon(Icons.receipt_long_rounded, size: 18, color: Colors.white),
                    onPressed: () => context.go('/orders'),
                  ),
                const SizedBox(height: 12),
                if (orderId.isNotEmpty)
                  SecondaryButton(
                    text: 'Track Your Order',
                    icon: const Icon(Icons.local_shipping_outlined, size: 18, color: AppColors.primary),
                    onPressed: () => context.go('/tracking/$orderId'),
                  )
                else
                  SecondaryButton(text: 'Continue shopping', onPressed: () => context.go('/')),

                const SizedBox(height: 14),
                Text(
                  "We'll keep you updated with notifications.",
                  textAlign: TextAlign.center,
                  style: AppTypography.bodySmall(subColor),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.favorite_rounded, size: 12, color: Color(0xFFFB7185)),
                    const SizedBox(width: 4),
                    Text('Happy Shopping!', style: AppTypography.labelMedium(subColor)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _month(int m) => const [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ][m - 1];

int _hour12(int h) => h % 12 == 0 ? 12 : h % 12;
