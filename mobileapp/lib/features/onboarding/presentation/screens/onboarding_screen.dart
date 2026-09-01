import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

class _Slide {
  final String title;
  final String subtitle;
  const _Slide(this.title, this.subtitle);
}

const _slides = <_Slide>[
  _Slide('Groceries in minutes', 'Fresh produce, daily staples and treats — at your door before you unpack the bags.'),
  _Slide('Prices you can trust', 'Everyday low prices, honest weights, and offers that actually save you money.'),
  _Slide('Track every order live', "Watch your order leave the store and arrive — you'll always know where it is."),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pager = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pager.dispose();
    super.dispose();
  }

  void _next() {
    if (_page < _slides.length - 1) {
      _pager.nextPage(duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic);
    } else {
      _finish();
    }
  }

  void _finish() {
    ref.read(authProvider.notifier).completeOnboarding();
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.backgroundDark : AppColors.background;
    final imagesAsync = ref.watch(allProductsProvider);

    return Scaffold(
      backgroundColor: bg,
      body: Column(
        children: [
          // ---- Product-image collage (real catalog data) ----
          Expanded(
            flex: 5,
            child: Stack(
              fit: StackFit.expand,
              children: [
                imagesAsync.when(
                  data: (products) {
                    final urls = products
                        .map((p) => p.imageUrl)
                        .where((u) => u.startsWith('http'))
                        .take(15)
                        .toList();
                    if (urls.isEmpty) return _CollageFallback(isDark: isDark);
                    return _Collage(urls: urls);
                  },
                  loading: () => const _CollageSkeleton(),
                  error: (_, _) => _CollageFallback(isDark: isDark),
                ),
                // Fade the collage into the sheet below.
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 96,
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [bg.withOpacity(0), bg],
                        ),
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  child: Align(
                    alignment: Alignment.topRight,
                    child: Padding(
                      padding: const EdgeInsets.only(right: 8, top: 4),
                      child: TextButton(
                        onPressed: _finish,
                        child: Text(
                          'Skip',
                          style: AppTypography.labelLarge(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ---- Copy + controls ----
          Expanded(
            flex: 4,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 4, 24, 20),
              child: Column(
                children: [
                  Expanded(
                    child: PageView.builder(
                      controller: _pager,
                      onPageChanged: (i) => setState(() => _page = i),
                      itemCount: _slides.length,
                      itemBuilder: (context, i) {
                        final s = _slides[i];
                        return Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              s.title,
                              textAlign: TextAlign.center,
                              style: AppTypography.h1(
                                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              s.subtitle,
                              textAlign: TextAlign.center,
                              style: AppTypography.bodyMedium(
                                isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                              ).copyWith(height: 1.5),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (i) {
                      final active = i == _page;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: active ? 22 : 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.primary
                              : (isDark ? Colors.white24 : Colors.black12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 20),
                  PrimaryButton(
                    text: _page == _slides.length - 1 ? 'Get started' : 'Next',
                    onPressed: _next,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Three vertically-offset columns of real product tiles — a calm, premium
/// "wall of fresh goods". Non-scrolling; sized to the available space.
class _Collage extends StatelessWidget {
  final List<String> urls;
  const _Collage({required this.urls});

  @override
  Widget build(BuildContext context) {
    final cols = <List<String>>[[], [], []];
    for (var i = 0; i < urls.length; i++) {
      cols[i % 3].add(urls[i]);
    }
    const offsets = [18.0, 0.0, 30.0];
    return ClipRect(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 12, 10, 0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < 3; i++)
              Expanded(
                child: Transform.translate(
                  offset: Offset(0, offsets[i]),
                  child: SingleChildScrollView(
                    physics: const NeverScrollableScrollPhysics(),
                    child: Column(
                    children: [
                      for (final u in (cols[i].isEmpty ? urls : cols[i]).take(5))
                        Padding(
                          padding: const EdgeInsets.all(4),
                          child: AspectRatio(
                            aspectRatio: 1,
                            child: ClipRRect(
                              borderRadius: AppRadius.brMd,
                              child: CachedNetworkImage(
                                imageUrl: u,
                                fit: BoxFit.cover,
                                fadeInDuration: const Duration(milliseconds: 250),
                                placeholder: (_, _) => Container(color: Colors.black12),
                                errorWidget: (_, _, _) => Container(
                                  color: Colors.black12,
                                  child: const Icon(Icons.image_not_supported_outlined, size: 18),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CollageSkeleton extends StatelessWidget {
  const _CollageSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 16),
        itemCount: 9,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
        ),
        itemBuilder: (_, _) => const LoadingSkeleton(width: 100, height: 100, borderRadius: 16),
      ),
    );
  }
}

class _CollageFallback extends StatelessWidget {
  final bool isDark;
  const _CollageFallback({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 140,
        height: 140,
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          borderRadius: AppRadius.brXl,
          boxShadow: [
            BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 30, offset: const Offset(0, 12)),
          ],
        ),
        child: const Icon(Icons.shopping_basket_rounded, size: 68, color: Colors.white),
      ),
    );
  }
}
