import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';

/// A circular icon button with a guaranteed ≥ 44 dp tap target and a required
/// semantic label. Use for every icon-only action (back, share, wishlist,
/// filter, notifications, copy, remove, call…).
class AppIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String tooltip; // also the semantics label
  final Color? color;
  final Color? background;
  final double iconSize;
  final double diameter;

  const AppIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    this.color,
    this.background,
    this.iconSize = 20,
    this.diameter = 44,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final fg = color ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary);
    return Semantics(
      button: true,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: background ?? Colors.transparent,
          shape: const CircleBorder(),
          clipBehavior: Clip.antiAlias,
          child: InkResponse(
            onTap: onPressed,
            radius: diameter / 2,
            child: SizedBox(
              width: diameter,
              height: diameter,
              child: Icon(icon, size: iconSize, color: onPressed == null ? fg.withOpacity(0.4) : fg),
            ),
          ),
        ),
      ),
    );
  }
}
