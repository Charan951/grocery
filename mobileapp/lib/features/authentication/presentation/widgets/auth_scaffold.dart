import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/fade_slide_in.dart';

/// Shared shell for the sign-in screens (login, OTP): themed background, a
/// circular back button, the FreshCart brand badge, a title + subtitle block,
/// the screen [body], and a CTA pinned to the bottom that rises above the
/// keyboard. Responsive (content is width-clamped and centred on large
/// screens) and staggered-animated on entry so login/OTP feel consistent.
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
    final h = MediaQuery.sizeOf(context).height;
    // Breathe a little more on tall phones, tighten on short ones.
    final topGap = (h * 0.03).clamp(12.0, 40.0);

    return Scaffold(
      backgroundColor: bg,
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: EdgeInsets.fromLTRB(24, topGap, 24, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FadeSlideIn(
                    child: _CircleBack(
                      onTap: onBack ?? () => Navigator.of(context).maybePop(),
                      isDark: isDark,
                    ),
                  ),
                  SizedBox(height: topGap.clamp(16.0, 24.0)),
                  const FadeSlideIn(delay: Duration(milliseconds: 60), child: _BrandBadge()),
                  const SizedBox(height: 22),
                  FadeSlideIn(
                    delay: const Duration(milliseconds: 110),
                    child: Text(
                      title,
                      style: AppTypography.h1(
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  FadeSlideIn(
                    delay: const Duration(milliseconds: 150),
                    child: Text(
                      subtitle,
                      style: AppTypography.bodyMedium(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      ).copyWith(height: 1.45),
                    ),
                  ),
                  if (belowTitle != null) ...[
                    const SizedBox(height: 16),
                    FadeSlideIn(delay: const Duration(milliseconds: 190), child: belowTitle!),
                  ],
                  const SizedBox(height: 28),
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const ClampingScrollPhysics(),
                      child: FadeSlideIn(delay: const Duration(milliseconds: 220), child: body),
                    ),
                  ),
                  const SizedBox(height: 12),
                  FadeSlideIn(delay: const Duration(milliseconds: 280), child: cta),
                ],
              ),
            ),
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
            Icons.arrow_back_rounded,
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
