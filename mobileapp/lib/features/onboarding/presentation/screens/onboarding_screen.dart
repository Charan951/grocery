import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'title': 'Freshness\nDelivered Instantly',
      'subtitle': 'Get farm fresh groceries delivered to your doorstep in just minutes.',
      'icon': Icons.spa_rounded,
      'color': const Color(0xFF34C759),
      'illustration': 'fresh_groceries',
    },
    {
      'title': 'Smart Shopping\nExperience',
      'subtitle': 'Discover offers, personalized recommendations and seamless shopping.',
      'icon': Icons.insights_rounded,
      'color': const Color(0xFFFF9500),
      'illustration': 'smart_shopping',
    },
    {
      'title': 'Track Every\nOrder Live',
      'subtitle': 'Know exactly where your groceries are with real-time delivery tracking.',
      'icon': Icons.local_shipping_rounded,
      'color': const Color(0xFF007AFF),
      'illustration': 'fast_delivery',
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onNext() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _finishOnboarding();
    }
  }

  void _finishOnboarding() {
    ref.read(authProvider.notifier).completeOnboarding();
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar with skip button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (_currentPage < _slides.length - 1)
                    TextButton(
                      onPressed: _finishOnboarding,
                      child: Text(
                        'Skip',
                        style: AppTypography.labelLarge(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ),
                      ),
                    )
                  else
                    const SizedBox(height: 48), // keeps spacing aligned
                ],
              ),
            ),
            
            // Slider area
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemCount: _slides.length,
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Illustration mockup
                        _buildIllustration(slide['illustration'], slide['color'], isDark),
                        const SizedBox(height: 48),
                        
                        // Text section
                        Text(
                          slide['title'],
                          textAlign: TextAlign.center,
                          style: AppTypography.display(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ).copyWith(
                            fontWeight: FontWeight.w800,
                            height: 1.15,
                            letterSpacing: -0.8,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20.0),
                          child: Text(
                            slide['subtitle'],
                            textAlign: TextAlign.center,
                            style: AppTypography.bodyMedium(
                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                            ).copyWith(height: 1.45),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            
            // Indicators & Action Button
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  // Dot indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _slides.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentPage == index ? 24.0 : 8.0,
                        height: 8.0,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? AppColors.primary
                              : (isDark ? Colors.white24 : Colors.black12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // CTA button
                  PrimaryButton(
                    text: _currentPage == _slides.length - 1 ? 'Get Started' : 'Next',
                    onPressed: _onNext,
                    icon: _currentPage == _slides.length - 1 
                        ? const Icon(Icons.arrow_forward_rounded, color: Colors.white)
                        : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIllustration(String key, Color accentColor, bool isDark) {
    IconData icon;
    switch (key) {
      case 'fresh_groceries':
        icon = Icons.eco_rounded;
        break;
      case 'smart_shopping':
        icon = Icons.shopping_bag_rounded;
        break;
      case 'fast_delivery':
      default:
        icon = Icons.electric_bolt_rounded;
        break;
    }

    return GlassCard(
      width: 240,
      height: 240,
      borderRadius: 48,
      blur: 25,
      color: accentColor.withOpacity(isDark ? 0.12 : 0.08),
      borderColor: accentColor.withOpacity(isDark ? 0.25 : 0.15),
      child: Center(
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Glowing background circle
            Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
            ),
            // Floating items simulations using icons
            Icon(
              icon,
              size: 80,
              color: accentColor,
            ),
            Positioned(
              top: 30,
              right: 30,
              child: Icon(Icons.star_rounded, size: 24, color: accentColor.withOpacity(0.6)),
            ),
            Positioned(
              bottom: 30,
              left: 30,
              child: Icon(Icons.auto_awesome_rounded, size: 20, color: accentColor.withOpacity(0.6)),
            ),
          ],
        ),
      ),
    );
  }
}
