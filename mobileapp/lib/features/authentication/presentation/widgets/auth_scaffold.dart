import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/fade_slide_in.dart';

/// Shared shell for the sign-in screens (login, OTP, password, register) —
/// a teal marquee panel of scrolling product photos up top (matching the
/// web storefront's sign-in drawer), a floating circular back button over
/// it, then a white sheet below with the FreshCart brand badge, a title +
/// subtitle block, the screen [body], and a CTA. Staggered-animated on
/// entry so every step in the flow feels consistent.
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
    // Fixed fraction of the *full* screen height (not the keyboard-shrunk
    // viewport) so the marquee panel stays a stable size — same as the web
    // drawer's top-half percentage.
    final marqueeHeight = (h * 0.34).clamp(220.0, 320.0);

    return Scaffold(
      backgroundColor: bg,
      resizeToAvoidBottomInset: true,
      body: Column(
        children: [
          SizedBox(
            height: marqueeHeight,
            width: double.infinity,
            child: _MarqueePanel(onBack: onBack),
          ),
          Expanded(
            child: SafeArea(
              top: false,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    physics: const ClampingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 480),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const FadeSlideIn(delay: Duration(milliseconds: 60), child: _BrandBadge()),
                                const SizedBox(height: 14),
                                FadeSlideIn(
                                  delay: const Duration(milliseconds: 110),
                                  child: Text(
                                    title,
                                    textAlign: TextAlign.center,
                                    style: AppTypography.h1(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    ).copyWith(fontWeight: FontWeight.w900),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                FadeSlideIn(
                                  delay: const Duration(milliseconds: 150),
                                  child: Text(
                                    subtitle,
                                    textAlign: TextAlign.center,
                                    style: AppTypography.bodyMedium(
                                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                    ).copyWith(height: 1.45, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                if (belowTitle != null) ...[
                                  const SizedBox(height: 16),
                                  FadeSlideIn(delay: const Duration(milliseconds: 190), child: belowTitle!),
                                ],
                                const SizedBox(height: 20),
                                ConstrainedBox(
                                  constraints: const BoxConstraints(maxWidth: 360),
                                  child: FadeSlideIn(delay: const Duration(milliseconds: 220), child: body),
                                ),
                                const SizedBox(height: 12),
                                ConstrainedBox(
                                  constraints: const BoxConstraints(maxWidth: 360),
                                  child: FadeSlideIn(delay: const Duration(milliseconds: 280), child: cta),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The teal marquee panel: 4 rows of real product photos scrolling
/// continuously (2 left, 2 right), faded into the white sheet at the
/// bottom, with a floating circular back button over the top-left.
class _MarqueePanel extends StatelessWidget {
  final VoidCallback? onBack;
  const _MarqueePanel({this.onBack});

  static const _row1 = [
    'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop',
  ];
  static const _row2 = [
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=200&auto=format&fit=crop',
  ];
  static const _row3 = [
    'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop',
  ];
  static const _row4 = [
    'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&auto=format&fit=crop',
  ];

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFFE0F7FA), const Color(0xFFE0F7FA).withOpacity(0.4)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ),
        Positioned.fill(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            // Size each row off the panel's *actual* height instead of a
            // fixed tile size — a short viewport (e.g. a landscape test
            // surface) would otherwise overflow the fixed-height rows.
            child: LayoutBuilder(
              builder: (context, constraints) {
                const gap = 8.0;
                final tileSize = ((constraints.maxHeight - gap * 3) / 4).clamp(32.0, 72.0);
                return Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    _MarqueeRow(images: _row1, tileSize: tileSize),
                    const SizedBox(height: gap),
                    _MarqueeRow(images: _row2, reverse: true, tileSize: tileSize),
                    const SizedBox(height: gap),
                    _MarqueeRow(images: _row3, tileSize: tileSize),
                    const SizedBox(height: gap),
                    _MarqueeRow(images: _row4, reverse: true, tileSize: tileSize),
                  ],
                );
              },
            ),
          ),
        ),
        // Fade the marquee into the white sheet below so it doesn't hard-cut.
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          height: 72,
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.transparent, AppColors.background],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
        Positioned(
          top: 12,
          left: 16,
          child: SafeArea(
            bottom: false,
            child: FadeSlideIn(child: _CircleBack(onTap: onBack ?? () => Navigator.of(context).maybePop())),
          ),
        ),
      ],
    );
  }
}

/// One continuously-scrolling row of rounded product tiles. Content repeats
/// with a fixed period so translating by exactly that period each loop is
/// seamless — no packages, no jump-cut.
class _MarqueeRow extends StatefulWidget {
  final List<String> images;
  final bool reverse;
  final double tileSize;
  const _MarqueeRow({required this.images, required this.tileSize, this.reverse = false});

  @override
  State<_MarqueeRow> createState() => _MarqueeRowState();
}

class _MarqueeRowState extends State<_MarqueeRow> with SingleTickerProviderStateMixin {
  static const double _gap = 12;

  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 20));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Respect "reduce motion" (also how widget tests opt out of this
    // infinite loop, since `pumpAndSettle` never returns for a repeating
    // animation) — a static row still shows the product photos either way.
    final reduceMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduceMotion) {
      if (_controller.isAnimating) _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tile = widget.tileSize;
    final period = widget.images.length * (tile + _gap);
    final tiles = [...widget.images, ...widget.images, ...widget.images, ...widget.images];

    return SizedBox(
      height: tile,
      child: ClipRect(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final progress = widget.reverse ? (1 - _controller.value) : _controller.value;
            final dx = -period - (progress * period);
            return OverflowBox(
              maxWidth: double.infinity,
              alignment: Alignment.centerLeft,
              child: Transform.translate(
                offset: Offset(dx, 0),
                child: Row(
                  children: [
                    for (final url in tiles) ...[
                      _MarqueeTile(url: url, size: tile),
                      const SizedBox(width: _gap),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _MarqueeTile extends StatelessWidget {
  final String url;
  final double size;
  const _MarqueeTile({required this.url, required this.size});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.3),
      child: Container(
        width: size,
        height: size,
        color: const Color(0xFFE0F7FA),
        child: CachedNetworkImage(
          imageUrl: url,
          fit: BoxFit.cover,
          fadeInDuration: const Duration(milliseconds: 200),
          errorWidget: (context, url, error) => const SizedBox.shrink(),
        ),
      ),
    );
  }
}

class _CircleBack extends StatelessWidget {
  final VoidCallback onTap;
  const _CircleBack({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 3,
      shadowColor: Colors.black26,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.all(10),
          child: Icon(Icons.arrow_back_rounded, size: 18, color: AppColors.textPrimary),
        ),
      ),
    );
  }
}

/// The "fresh/cart" wordmark badge, matching the web sign-in drawer exactly.
class _BrandBadge extends StatelessWidget {
  const _BrandBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryText],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppRadius.brMd,
        boxShadow: [
          BoxShadow(color: AppColors.primary.withOpacity(0.25), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Center(
        child: RichText(
          textAlign: TextAlign.center,
          text: const TextSpan(
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, height: 1.15, color: Colors.white),
            children: [
              TextSpan(text: 'fresh\n'),
              TextSpan(text: 'cart', style: TextStyle(color: Color(0xFFA5D6A7))),
            ],
          ),
        ),
      ),
    );
  }
}
