import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

/// A slim "N items · ₹total · View cart" bar for full-screen catalog routes
/// (which sit above the tab shell and so don't get the shell's floating cart).
/// Renders nothing when the cart is empty.
class CatalogCartBar extends ConsumerWidget {
  const CatalogCartBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final count = cart.totalItemsCount;
    if (count == 0) return const SizedBox.shrink();

    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Material(
        color: AppColors.primary,
        borderRadius: AppRadius.brPill,
        child: InkWell(
          borderRadius: AppRadius.brPill,
          onTap: () => context.push('/cart'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              children: [
                Text(
                  '$count ${count == 1 ? 'item' : 'items'}',
                  style: AppTypography.labelLarge(Colors.white),
                ),
                Text('  ·  ₹${cart.totalPayableAmount.toStringAsFixed(0)}',
                    style: AppTypography.labelLarge(Colors.white.withOpacity(0.85))),
                const Spacer(),
                Text('View cart', style: AppTypography.labelLarge(Colors.white)),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
