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
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.receipt_long_rounded, size: 16, color: AppColors.primary),
              ),
              const SizedBox(width: 8),
              Text(
                'Bill details',
                style: AppTypography.labelLarge(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ).copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 14),
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
          if (cart.tipAmount > 0)
            _row(context, 'Delivery partner tip', '₹${cart.tipAmount.toStringAsFixed(2)}', green: true),
          if (cart.hasGiftPackaging)
            _row(context, 'Gift packaging', '₹${cart.giftPackagingFee.toStringAsFixed(2)}'),
          Divider(height: 20, color: isDark ? AppColors.dividerDark : AppColors.divider),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('To pay', style: AppTypography.title(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ).copyWith(fontWeight: FontWeight.w800)),
              Text('₹${cart.totalPayableAmount.toStringAsFixed(2)}', style: AppTypography.h3(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ).copyWith(fontWeight: FontWeight.w900, color: AppColors.primary)),
            ],
          ),
          if (showSavingsFooter && cart.totalSavings > 0) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                borderRadius: AppRadius.brMd,
                border: Border.all(color: AppColors.success.withOpacity(0.25)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.savings_rounded, size: 16, color: AppColors.success),
                  const SizedBox(width: 6),
                  Text(
                    'You save ₹${cart.totalSavings.toStringAsFixed(0)} on this order',
                    style: AppTypography.labelMedium(AppColors.success).copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
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
            green ? AppColors.success : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
          ).copyWith(fontWeight: green ? FontWeight.bold : FontWeight.w600)),
        ],
      ),
    );
  }
}

