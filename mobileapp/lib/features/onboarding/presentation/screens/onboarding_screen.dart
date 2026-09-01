import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/fade_slide_in.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class _Slide {
  final String image;
  final IconData icon;
  final String title;
  final String subtitle;
  const _Slide(this.image, this.icon, this.title, this.subtitle);
}

const _slides = <_Slide>[
  _Slide(
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&auto=format&fit=crop',
    Icons.eco_rounded,
    'Farm-fresh, every day',
    'Fruit, vegetables and daily staples picked this morning — delivered before you unpack the bags.',
  ),
  _Slide(
    'https://images.unsplash.com/photo-1543168256-418811576931?w=1200&q=80&auto=format&fit=crop',
    Icons.savings_rounded,
    'Prices you can trust',
    'Honest weights, everyday low prices and offers that actually save you money at checkout.',
  ),
  _Slide(
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=1200&q=80&auto=format&fit=crop',
    Icons.delivery_dining_rounded,
    'Track every order live',
    "Watch your order leave the store and reach your door — you'll always know exactly where it is.",
  ),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pager = PageController();
  Timer? _autoplay;
  int _page = 0;
  double _pageOffset = 0;
  bool _autoplayDone = false;

  @override
  void initState() {
    super.initState();
    _pager.addListener(() {
      setState(() => _pageOffset = _pager.page ?? 0);
    });
    _startAutoplay();
  }

  /// Auto-advance one slide per second, once through, then stop.
  void _startAutoplay() {
    _autoplay?.cancel();
    _autoplay = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      if (_page >= _slides.length - 1) {
        t.cancel();
        setState(() => _autoplayDone = true);
        return;
      }
      _pager.nextPage(
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _stopAutoplay() {
    if (_autoplay?.isActive ?? false) {
      _autoplay!.cancel();
      setState(() => _autoplayDone = true);
    }
  }

  @override
  void dispose() {
    _autoplay?.cancel();
    _pager.dispose();
    super.dispose();
  }

  void _finish() {
    ref.read(authProvider.notifier).completeOnboarding();
    context.go('/login');
  }

  void _next() {
    _stopAutoplay();
    if (_page < _slides.length - 1) {
      _pager.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.backgroundDark : AppColors.background;
    final onLast = _page == _slides.length - 1;

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          // ---- Full-bleed image pager with a parallax drift ----
          NotificationListener<UserScrollNotification>(
            onNotification: (_) {
              _stopAutoplay();
              return false;
            },
            child: PageView.builder(
              controller: _pager,
              onPageChanged: (i) => setState(() => _page = i),
              itemCount: _slides.length,
              itemBuilder: (context, i) {
                final delta = (i - _pageOffset).clamp(-1.0, 1.0);
                return _SlideImage(slide: _slides[i], parallax: delta * 60, isDark: isDark);
              },
            ),
          ),

          // ---- Bottom scrim so the copy stays readable ----
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.0, 0.45, 1.0],
                    colors: [
                      Colors.black.withValues(alpha: 0.05),
                      Colors.black.withValues(alpha: 0.35),
                      Colors.black.withValues(alpha: 0.85),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ---- Skip ----
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(right: 8, top: 4),
                child: TextButton(
                  onPressed: _finish,
                  child: const Text('Skip', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ),
            ),
          ),

          // ---- Copy + controls ----
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.fromLTRB(24, 0, 24, size.height * 0.04 + 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Text swaps per page with its own fade/slide-in.
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 350),
                      transitionBuilder: (child, anim) => FadeTransition(
                        opacity: anim,
                        child: SlideTransition(
                          position: Tween(begin: const Offset(0, 0.15), end: Offset.zero).animate(anim),
                          child: child,
                        ),
                      ),
                      child: Column(
                        key: ValueKey(_page),
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.16),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(_slides[_page].icon, color: Colors.white, size: 22),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _slides[_page].title,
                            style: AppTypography.h1(Colors.white).copyWith(fontWeight: FontWeight.w900, height: 1.1),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            _slides[_page].subtitle,
                            style: AppTypography.bodyMedium(Colors.white.withValues(alpha: 0.88)).copyWith(height: 1.5),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                    Row(
                      children: List.generate(_slides.length, (i) {
                        final active = i == _page;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 260),
                          margin: const EdgeInsets.only(right: 6),
                          width: active ? 26 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: active ? Colors.white : Colors.white.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 18),
                    FadeSlideIn(
                      child: PrimaryButton(
                        text: onLast || _autoplayDone ? (onLast ? 'Get started' : 'Next') : 'Next',
                        onPressed: _next,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SlideImage extends StatelessWidget {
  final _Slide slide;
  final double parallax;
  final bool isDark;
  const _SlideImage({required this.slide, required this.parallax, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    return ClipRect(
      child: OverflowBox(
        maxWidth: w + 120,
        child: Transform.translate(
          offset: Offset(parallax, 0),
          child: CachedNetworkImage(
            imageUrl: slide.image,
            fit: BoxFit.cover,
            fadeInDuration: const Duration(milliseconds: 350),
            placeholder: (_, _) => Container(color: isDark ? Colors.black : AppColors.primary.withValues(alpha: 0.15)),
            errorWidget: (_, _, _) => DecoratedBox(
              decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
              child: Center(child: Icon(slide.icon, size: 96, color: Colors.white.withValues(alpha: 0.9))),
            ),
          ),
        ),
      ),
    );
  }
}
