import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// Shared shell for the sign-in screens (login, OTP): themed background, a
/// circular back button, the FreshCart brand badge, a title + subtitle block,
/// the screen [body], and a CTA pinned to the bottom that rises above the
/// keyboard.
class AuthScaffold extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget body;
  final Widget cta;
  final VoidCallback? onBack;
  final Widget? belowTitle;

  const AuthScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.body,
    required this.cta,
    this.onBack,
    this.belowTitle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.backgroundDark : AppColors.background;

    return Scaffold(
      backgroundColor: bg,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CircleBack(onTap: onBack ?? () => Navigator.of(context).maybePop(), isDark: isDark),
              const SizedBox(height: 24),
              const _BrandBadge(),
              const SizedBox(height: 24),
              Text(
                title,
                style: AppTypography.h1(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: AppTypography.bodyMedium(
                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                ).copyWith(height: 1.45),
              ),
              if (belowTitle != null) ...[const SizedBox(height: 16), belowTitle!],
              const SizedBox(height: 28),
              Expanded(
                child: SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  child: body,
                ),
              ),
              const SizedBox(height: 12),
              cta,
            ],
          ),
        ),
      ),
    );
  }
}

class _CircleBack extends StatelessWidget {
  final VoidCallback onTap;
  final bool isDark;
  const _CircleBack({required this.onTap, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surface,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 16,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _BrandBadge extends StatelessWidget {
  const _BrandBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: AppRadius.brMd,
        boxShadow: [
          BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: const Icon(Icons.shopping_basket_rounded, color: Colors.white, size: 28),
    );
  }
}
