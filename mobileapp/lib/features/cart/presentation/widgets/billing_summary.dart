import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

/// The shared bill-of-sale card used on Cart and Checkout. Reads everything from
/// [CartState] so the two screens can never drift.
class BillingSummary extends StatelessWidget {
  final CartState cart;
  final bool showSavingsFooter;

  const BillingSummary({super.key, required this.cart, this.showSavingsFooter = true});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final taxPct = cart.pricing.taxPercent.toStringAsFixed(0);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Column(
        children: [
          _row(context, 'Item total', '₹${cart.totalMrp.toStringAsFixed(2)}'),
          if (cart.itemSavings > 0)
            _row(context, 'Product discount', '- ₹${cart.itemSavings.toStringAsFixed(2)}', green: true),
          if (cart.couponDiscount > 0)
            _row(context, 'Coupon discount', '- ₹${cart.couponDiscount.toStringAsFixed(2)}', green: true),
          _row(context, 'Platform fee', '₹${cart.platformFee.toStringAsFixed(2)}'),
          _row(
            context,
            'Delivery',
            cart.deliveryFee == 0 ? 'FREE' : '₹${cart.deliveryFee.toStringAsFixed(2)}',
            green: cart.deliveryFee == 0,
          ),
          _row(context, 'Taxes ($taxPct% GST)', '₹${cart.taxAmount.toStringAsFixed(2)}'),
          Divider(height: 24, color: isDark ? AppColors.dividerDark : AppColors.divider),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('To pay', style: AppTypography.title(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              )),
              Text('₹${cart.totalPayableAmount.toStringAsFixed(2)}', style: AppTypography.h3(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              )),
            ],
          ),
          if (showSavingsFooter && cart.totalSavings > 0) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: AppRadius.brSm,
              ),
              child: Text(
                'You save ₹${cart.totalSavings.toStringAsFixed(0)} on this order',
                textAlign: TextAlign.center,
                style: AppTypography.labelMedium(AppColors.primaryText),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value, {bool green = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodyMedium(
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
          )),
          Text(value, style: AppTypography.labelMedium(
            green ? AppColors.primary : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
          )),
        ],
      ),
    );
  }
}
