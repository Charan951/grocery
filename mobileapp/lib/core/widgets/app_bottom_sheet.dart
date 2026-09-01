import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// Standard modal bottom sheet: drag handle, optional title row, rounded top,
/// safe-area-aware bottom padding, keyboard-aware inset, optional scrolling.
class AppBottomSheet {
  AppBottomSheet._();

  static Future<T?> show<T>(
    BuildContext context, {
    required Widget child,
    String? title,
    bool isScrollControlled = true,
    bool showHandle = true,
    bool showClose = false,
    bool isDismissible = true,
    bool enableDrag = true,
    EdgeInsets contentPadding = const EdgeInsets.fromLTRB(20, 8, 20, 20),
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
      barrierColor: Colors.black.withOpacity(0.45),
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.brSheet),
      builder: (ctx) {
        final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
        return Padding(
          // lift above the keyboard when a field inside is focused
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (showHandle)
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(top: 12, bottom: 4),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.dividerDark : AppColors.divider,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                if (title != null || showClose)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 12, 4),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(title ?? '', style: AppTypography.h3(textColor)),
                        ),
                        if (showClose)
                          IconButton(
                            icon: Icon(Icons.close_rounded, color: textColor),
                            onPressed: () => Navigator.of(ctx).pop(),
                            splashRadius: 20,
                          ),
                      ],
                    ),
                  ),
                Flexible(
                  child: SingleChildScrollView(
                    padding: contentPadding,
                    child: child,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
