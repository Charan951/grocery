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
  final String? addressTitle;
  final String? addressSubtitle;
  final VoidCallback? onChangeAddress;

  const CheckoutBar({
    super.key,
    required this.label,
    required this.amount,
    required this.cta,
    required this.onPressed,
    this.isLoading = false,
    this.addressTitle,
    this.addressSubtitle,
    this.onChangeAddress,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasAddressRow = addressTitle != null && addressTitle!.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasAddressRow) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.amber.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.apartment_rounded, size: 18, color: Colors.amber),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Delivering to ',
                                style: AppTypography.bodySmall(
                                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                ).copyWith(fontSize: 12),
                              ),
                              Text(
                                addressTitle!,
                                style: AppTypography.labelMedium(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                ).copyWith(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ],
                          ),
                          if (addressSubtitle != null && addressSubtitle!.isNotEmpty)
                            Text(
                              addressSubtitle!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.bodySmall(
                                isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                              ).copyWith(fontSize: 11),
                            ),
                        ],
                      ),
                    ),
                    if (onChangeAddress != null)
                      TextButton(
                        onPressed: onChangeAddress,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'Change',
                          style: AppTypography.labelMedium(AppColors.primary).copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                  ],
                ),
              ),
              Divider(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
            ],
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              child: Row(
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label.toUpperCase(),
                        style: AppTypography.labelSmall(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ).copyWith(letterSpacing: 0.8, fontWeight: FontWeight.bold, fontSize: 10),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '₹${amount.toStringAsFixed(0)}',
                        style: AppTypography.h2(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ).copyWith(fontWeight: FontWeight.w900, color: AppColors.primary, height: 1.1),
                      ),
                    ],
                  ),
                  const Spacer(),
                  SizedBox(
                    width: 190,
                    height: 48,
                    child: PrimaryButton(
                      text: cta,
                      isLoading: isLoading,
                      onPressed: onPressed,
                      icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

