import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';

/// Slim cart bar shown above the bottom nav when the cart has items. Flat,
/// tokenised, full-width. The free-delivery hint reads the real threshold from
/// `PricingConfig` (was a hardcoded ₹400).
class FloatingCart extends ConsumerWidget {
  final VoidCallback onTap;
  const FloatingCart({super.key, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final count = cart.totalItemsCount;
    if (count == 0) return const SizedBox.shrink();

    final config = ref.watch(pricingConfigProvider);
    final remaining = config.freeDeliveryThreshold - cart.subtotal;
    final freeUnlocked = remaining <= 0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surface,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                child: const Icon(Icons.shopping_bag_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$count ${count == 1 ? 'item' : 'items'} · ₹${cart.totalPayableAmount.toStringAsFixed(0)}',
                      style: AppTypography.labelLarge(
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      freeUnlocked
                          ? 'Free delivery unlocked'
                          : 'Add ₹${remaining.toStringAsFixed(0)} more for free delivery',
                      style: AppTypography.bodySmall(
                        freeUnlocked
                            ? AppColors.primaryText
                            : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('View cart', style: AppTypography.labelLarge(AppColors.primaryText)),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.primaryText, size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
