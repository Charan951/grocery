import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/services/app_config.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _controller.forward();
    _navigateToNext();
  }

  Future<void> _navigateToNext() async {
    // Run the branding animation, the token -> profile hydration, and the
    // app-config gate check in parallel.
    final results = await Future.wait([
      Future.delayed(const Duration(milliseconds: 2200)),
      ref.read(authProvider.notifier).ensureHydrated(),
      ref.read(appGateProvider.future),
    ]);
    if (!mounted) return;

    final gate = results[2] as AppGate;
    if (gate == AppGate.maintenance) {
      context.go('/maintenance');
      return;
    }
    if (gate == AppGate.forceUpdate) {
      context.go('/force_update');
      return;
    }

    final authState = ref.read(authProvider);

    if (!authState.isOnboardingCompleted) {
      context.go('/onboarding');
    } else if (!authState.isAuthenticated) {
      context.go('/login');
    } else {
      // Straight to Home — HomeScreen's own `_maybeAskLocation()` prompts for
      // the real OS permission in place if it's off, instead of a separate
      // location-picker screen blocking the way in.
      context.go('/');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Center(
        child: FadeTransition(
          opacity: _opacityAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Premium logo circle
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.25),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Image.asset(
                      'assets/images/logo.png',
                      width: 90,
                      height: 90,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.shopping_basket_rounded,
                        size: 60,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Premium typography
                Text(
                  'FreshCart',
                  style: AppTypography.display(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ).copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Farm Fresh • Delivered Instantly',
                  style: AppTypography.bodyMedium(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ).copyWith(
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
