import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// The one section heading for the whole app. One size (`h3` = 18), optional
/// one-line subtitle, optional trailing text action. Use this instead of an
/// inline `AppTypography.h3` / `.title` for anything that labels a block.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionText,
    this.onAction,
    this.padding = const EdgeInsets.symmetric(horizontal: 16.0),
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.h3(textColor)),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: AppTypography.bodySmall(subColor)),
                ],
              ],
            ),
          ),
          if (actionText != null && onAction != null)
            Semantics(
              button: true,
              label: actionText,
              child: InkResponse(
                onTap: onAction,
                radius: 28,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                  child: Row(
                    children: [
                      Text(actionText!, style: AppTypography.labelMedium(AppColors.primaryText)),
                      const SizedBox(width: 2),
                      const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.primaryText),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
