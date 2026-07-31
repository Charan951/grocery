import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';

class AnimatedQuantitySelector extends StatelessWidget {
  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final double height;
  final double iconSize;

  const AnimatedQuantitySelector({
    super.key,
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
    this.height = 40.0,
    this.iconSize = 18.0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(height / 2),
        border: Border.all(
          color: isDark ? Colors.white12 : AppColors.divider,
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Decrement Button
          GestureDetector(
            onTap: onDecrement,
            behavior: HitTestBehavior.opaque,
            child: Container(
              width: height,
              height: height,
              alignment: Alignment.center,
              child: Icon(
                Icons.remove_rounded,
                color: quantity > 0
                    ? (isDark ? AppColors.accent : AppColors.primary)
                    : Colors.transparent,
                size: iconSize,
              ),
            ),
          ),
          
          // Quantity Text
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            transitionBuilder: (Widget child, Animation<double> animation) {
              return ScaleTransition(scale: animation, child: child);
            },
            child: Container(
              key: ValueKey<int>(quantity),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              alignment: Alignment.center,
              child: Text(
                quantity.toString(),
                style: AppTypography.labelLarge(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ).copyWith(fontSize: 15),
              ),
            ),
          ),
          
          // Increment Button
          GestureDetector(
            onTap: onIncrement,
            behavior: HitTestBehavior.opaque,
            child: Container(
              width: height,
              height: height,
              alignment: Alignment.center,
              child: Icon(
                Icons.add_rounded,
                color: isDark ? AppColors.accent : AppColors.primary,
                size: iconSize,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
