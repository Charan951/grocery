import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';

/// The one surface card for the whole app: white/`surface` fill, 1px hairline
/// border, **no shadow** — matches the raw `Container` cards on the newer
/// screens so the two styles converge. `AppCard` is the preferred name going
/// forward; `GlassCard` is kept as an alias so ~20 call sites don't churn.
/// (`blur` is dead — glassmorphism was dropped in P0-5.)
typedef AppCard = GlassCard;

class GlassCard extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final double blur; // ignored — kept for call-site compatibility
  final Color? color;
  final Color? borderColor;
  final double borderWidth;
  final List<BoxShadow>? shadow;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? width;
  final double? height;

  const GlassCard({
    super.key,
    required this.child,
    this.borderRadius = 16.0,
    this.blur = 0.0,
    this.color,
    this.borderColor,
    this.borderWidth = 1.0,
    this.shadow,
    this.padding,
    this.margin,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bg = color ?? (isDark ? AppColors.surfaceDark : AppColors.surface);
    final border = borderColor ?? (isDark ? AppColors.dividerDark : AppColors.divider);

    // Flat: no shadow by default (opt in via `shadow:`). The hairline border
    // carries the separation.
    final shadows = shadow ?? const <BoxShadow>[];

    return Container(
      width: width,
      height: height,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: border, width: borderWidth),
        boxShadow: shadows,
      ),
      child: child,
    );
  }
}
