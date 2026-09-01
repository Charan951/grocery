import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';

/// Flat sticky action bar for Cart ("Checkout") and Checkout ("Place order").
class CheckoutBar extends StatelessWidget {
  final String label;
  final double amount;
  final String cta;
  final bool isLoading;
  final VoidCallback? onPressed;

  const CheckoutBar({
    super.key,
    required this.label,
    required this.amount,
    required this.cta,
    required this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  )),
                  Text('₹${amount.toStringAsFixed(0)}', style: AppTypography.h2(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  )),
                ],
              ),
              const Spacer(),
              SizedBox(
                width: 190,
                child: PrimaryButton(text: cta, isLoading: isLoading, onPressed: onPressed),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
