import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';

class RatingWidget extends StatelessWidget {
  final double rating;
  final int? reviewsCount;
  final double iconSize;
  final double fontSize;

  const RatingWidget({
    super.key,
    required this.rating,
    this.reviewsCount,
    this.iconSize = 14.0,
    this.fontSize = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(
          Icons.star_rounded,
          color: AppColors.warning,
          size: iconSize,
        ),
        const SizedBox(width: 4),
        Text(
          rating.toStringAsFixed(1),
          style: AppTypography.labelMedium(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ).copyWith(fontSize: fontSize),
        ),
        if (reviewsCount != null) ...[
          const SizedBox(width: 4),
          Text(
            '(${reviewsCount! > 999 ? "${(reviewsCount! / 1000).toStringAsFixed(1)}k" : reviewsCount})',
            style: AppTypography.bodySmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ).copyWith(fontSize: fontSize),
          ),
        ],
      ],
    );
  }
}

class DeliveryBadge extends StatelessWidget {
  final String durationText;
  final Color? backgroundColor;
  final Color? textColor;

  const DeliveryBadge({
    super.key,
    required this.durationText,
    this.backgroundColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final defaultBgColor = isDark
        ? AppColors.primary.withOpacity(0.15)
        : AppColors.primary.withOpacity(0.08);

    final defaultTextColor = isDark
        ? AppColors.accent
        : AppColors.primary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor ?? defaultBgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.electric_bolt_rounded,
            size: 12,
            color: textColor ?? defaultTextColor,
          ),
          const SizedBox(width: 2),
          Text(
            durationText,
            style: AppTypography.labelSmall(
              textColor ?? defaultTextColor,
            ),
          ),
        ],
      ),
    );
  }
}

class DiscountBadge extends StatelessWidget {
  final String text;

  const DiscountBadge({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF3B30), Color(0xFFFF453A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF3B30).withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Text(
        text,
        style: AppTypography.labelSmall(Colors.white).copyWith(fontSize: 10),
      ),
    );
  }
}
