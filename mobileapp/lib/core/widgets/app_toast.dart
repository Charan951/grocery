import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

enum ToastVariant { success, error, info, warning }

/// App-wide toast / inline-alert system.
///
/// Backed by a single global [ScaffoldMessengerState] so it can be called from
/// anywhere — controllers, providers, `catch` blocks — without a [BuildContext].
/// Wire [messengerKey] into `MaterialApp.router(scaffoldMessengerKey: ...)`.
class AppToast {
  AppToast._();

  static final GlobalKey<ScaffoldMessengerState> messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  static void success(String message, {String? actionLabel, VoidCallback? onAction}) =>
      _show(message, ToastVariant.success, actionLabel: actionLabel, onAction: onAction);

  static void error(String message, {String? actionLabel, VoidCallback? onAction}) =>
      _show(message, ToastVariant.error, actionLabel: actionLabel, onAction: onAction);

  static void info(String message, {String? actionLabel, VoidCallback? onAction}) =>
      _show(message, ToastVariant.info, actionLabel: actionLabel, onAction: onAction);

  static void warning(String message, {String? actionLabel, VoidCallback? onAction}) =>
      _show(message, ToastVariant.warning, actionLabel: actionLabel, onAction: onAction);

  static void dismiss() => messengerKey.currentState?.hideCurrentSnackBar();

  static void _show(
    String message,
    ToastVariant variant, {
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    final messenger = messengerKey.currentState;
    if (messenger == null) return;

    final (color, icon) = switch (variant) {
      ToastVariant.success => (AppColors.success, Icons.check_circle_rounded),
      ToastVariant.error => (AppColors.error, Icons.error_rounded),
      ToastVariant.warning => (AppColors.warning, Icons.warning_amber_rounded),
      ToastVariant.info => (AppColors.primary, Icons.info_rounded),
    };

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xFF1C1C1E),
          elevation: 6,
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          duration: Duration(seconds: variant == ToastVariant.error ? 5 : 3),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.brSm),
          content: Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(message, style: AppTypography.bodyMedium(Colors.white)),
              ),
            ],
          ),
          action: (actionLabel != null && onAction != null)
              ? SnackBarAction(
                  label: actionLabel,
                  textColor: color,
                  onPressed: onAction,
                )
              : null,
        ),
      );
  }
}

/// A static inline banner for persistent form-level / page-level messages
/// (validation summaries, offline notice). Not auto-dismissing.
class AppAlert extends StatelessWidget {
  final String message;
  final ToastVariant variant;
  final VoidCallback? onClose;

  const AppAlert({
    super.key,
    required this.message,
    this.variant = ToastVariant.info,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (variant) {
      ToastVariant.success => (AppColors.success, Icons.check_circle_rounded),
      ToastVariant.error => (AppColors.error, Icons.error_rounded),
      ToastVariant.warning => (AppColors.warning, Icons.warning_amber_rounded),
      ToastVariant.info => (AppColors.primary, Icons.info_rounded),
    };
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(isDark ? 0.16 : 0.08),
        borderRadius: AppRadius.brSm,
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: AppTypography.bodySmall(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ),
            ),
          ),
          if (onClose != null)
            GestureDetector(
              onTap: onClose,
              child: Icon(Icons.close_rounded, size: 18, color: color),
            ),
        ],
      ),
    );
  }
}
