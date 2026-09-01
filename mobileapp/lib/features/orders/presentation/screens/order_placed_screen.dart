import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';

class OrderPlacedScreen extends StatelessWidget {
  final String orderId;
  const OrderPlacedScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/'); // never trap the user in the funnel
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
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
                    child: const Icon(Icons.check_rounded, size: 56, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 28),
                Text('Order placed', style: AppTypography.h1(textColor)),
                const SizedBox(height: 8),
                Text(
                  orderId.isEmpty
                      ? 'Your order is confirmed and being packed.'
                      : 'Order #$orderId is confirmed and being packed.',
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyMedium(subColor),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.schedule_rounded, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text('Arriving in ~8 minutes', style: AppTypography.labelMedium(AppColors.primaryText)),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                if (orderId.isNotEmpty)
                  SizedBox(
                    width: double.infinity,
                    child: PrimaryButton(text: 'Track order', onPressed: () => context.go('/tracking/$orderId')),
                  ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: SecondaryButton(text: 'Continue shopping', onPressed: () => context.go('/')),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => context.go('/orders'),
                  child: Text('View my orders', style: AppTypography.labelMedium(AppColors.primaryText)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
