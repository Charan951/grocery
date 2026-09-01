import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// Small centered spinner for inline / full-page loading.
class AppLoader extends StatelessWidget {
  final double size;
  final Color? color;
  final String? message;

  const AppLoader({super.key, this.size = 28, this.color, this.message});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CircularProgressIndicator(
            strokeWidth: 2.6,
            valueColor: AlwaysStoppedAnimation(color ?? AppColors.primary),
          ),
        ),
        if (message != null) ...[
          const SizedBox(height: 12),
          Text(
            message!,
            style: AppTypography.bodySmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}

/// Centers an [AppLoader] in the available space. Use as a page body while data
/// loads.
class AppLoadingView extends StatelessWidget {
  final String? message;
  const AppLoadingView({super.key, this.message});

  @override
  Widget build(BuildContext context) => Center(child: AppLoader(message: message));
}

/// Wraps [child] and, when [isLoading], paints a dimming scrim + spinner on top
/// while blocking interaction. For submit buttons prefer the button's own
/// `isLoading` flag; use this for whole-form / whole-page blocking work.
class LoadingOverlay extends StatelessWidget {
  final bool isLoading;
  final Widget child;
  final String? message;

  const LoadingOverlay({
    super.key,
    required this.isLoading,
    required this.child,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Positioned.fill(
            child: AbsorbPointer(
              child: Container(
                color: Colors.black.withOpacity(0.35),
                alignment: Alignment.center,
                child: AppLoader(color: Colors.white, message: message),
              ),
            ),
          ),
      ],
    );
  }
}
