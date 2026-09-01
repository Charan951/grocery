import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';

/// Centered modal dialogs, flat-styled to match the design system.
///
/// `AppModal.show` for arbitrary content; `AppModal.confirm` for the common
/// title + message + confirm/cancel pattern (returns `true` on confirm).
class AppModal {
  AppModal._();

  static Future<T?> show<T>(
    BuildContext context, {
    required Widget child,
    bool barrierDismissible = true,
    EdgeInsets insetPadding = const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierColor: Colors.black.withOpacity(0.45),
      builder: (_) => Dialog(
        insetPadding: insetPadding,
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.brLg,
          side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
        child: Padding(padding: const EdgeInsets.all(20), child: child),
      ),
    );
  }

  static Future<bool> confirm(
    BuildContext context, {
    required String title,
    required String message,
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
    bool destructive = false,
    IconData? icon,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    final result = await show<bool>(
      context,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: (destructive ? AppColors.error : AppColors.primary).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon,
                  color: destructive ? AppColors.error : AppColors.primary, size: 28),
            ),
            const SizedBox(height: 16),
          ],
          Text(title, textAlign: TextAlign.center, style: AppTypography.h3(textColor)),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center, style: AppTypography.bodyMedium(subColor)),
          const SizedBox(height: 24),
          PrimaryButton(
            text: confirmLabel,
            height: 48,
            onPressed: () => Navigator.of(context).pop(true),
          ),
          const SizedBox(height: 10),
          SecondaryButton(
            text: cancelLabel,
            height: 48,
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ],
      ),
    );
    return result ?? false;
  }
}
