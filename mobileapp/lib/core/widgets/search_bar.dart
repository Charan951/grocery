import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';

class CustomSearchBar extends StatelessWidget {
  final String hintText;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onVoicePressed;
  final VoidCallback? onTap;
  final bool readOnly;
  final TextEditingController? controller;

  const CustomSearchBar({
    super.key,
    this.hintText = 'What are you looking for?',
    this.onChanged,
    this.onSubmitted,
    this.onVoicePressed,
    this.onTap,
    this.readOnly = false,
    this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GlassCard(
      borderRadius: 24.0,
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      color: isDark ? Colors.white.withOpacity(0.04) : Colors.white,
      borderColor: isDark ? Colors.white.withOpacity(0.02) : const Color(0x1F000000),
      child: Container(
        height: 54,
        alignment: Alignment.center,
        child: TextField(
          controller: controller,
          readOnly: readOnly,
          onTap: onTap,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          style: AppTypography.bodyMedium(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: AppTypography.bodyMedium(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ),
            icon: Icon(
              Icons.search_rounded,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
              size: 22,
            ),
            suffixIcon: GestureDetector(
              onTap: onVoicePressed ?? () {},
              child: Icon(
                Icons.mic_none_rounded,
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                size: 22,
              ),
            ),
            border: InputBorder.none,
            isDense: true,
          ),
        ),
      ),
    );
  }
}
