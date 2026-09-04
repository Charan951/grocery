import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import '../../data/models/festival_campaign_model.dart';
import '../controllers/catalog_providers.dart';
import '../utils/festival_theme_resolver.dart';

class FestivalCampaignSection extends ConsumerWidget {
  final FestivalCampaignModel campaign;
  final Function(String categoryId) onOpenCategory;

  const FestivalCampaignSection({
    super.key,
    required this.campaign,
    required this.onOpenCategory,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = FestivalThemeResolver.resolve(campaign);
    final allProducts = ref.watch(allProductsProvider).valueOrNull ?? const [];

    // Filter active groups & enforce maximum limit of 10 cards
    final activeGroups = campaign.festivalGroups
        .where((g) => g.isActive && (g.products.isNotEmpty || g.imageUrl != null))
        .take(10)
        .toList();

    if (activeGroups.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Column(
            children: [
              // Blinkit Style Header Header: — CELEBRATE — Festival Name
              Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(theme.emoji, style: const TextStyle(fontSize: 15)),
                      const SizedBox(width: 5),
                      Text(
                        'CELEBRATE',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.0,
                          color: theme.accentColor,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(theme.emoji, style: const TextStyle(fontSize: 15)),
                    ],
                  ),
                  const SizedBox(height: 1),
                  Text(
                    campaign.name,
                    textAlign: TextAlign.center,
                    style: AppTypography.festivalCalligraphy(
                      theme.textColor,
                      fontSize: 28,
                      fontPreset: theme.fontPreset,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Optional Banner
              if (campaign.enableBanner && campaign.bannerImage.trim().isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: CachedNetworkImage(
                    imageUrl: campaign.bannerImage,
                    height: 110,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 6),
              ],

              // Group Cards Layout Logic based on Count
              _buildResponsiveCardsLayout(context, activeGroups, allProducts, theme),
            ],
          ),
        ),

        // Bottom Scallop Arch Border transition
        _ScallopArchBorder(
          fillColor: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF18181B)
              : Colors.white,
        ),
      ],
    );
  }

  Widget _buildResponsiveCardsLayout(
    BuildContext context,
    List<FestivalGroupModel> groups,
    List<ProductModel> allProducts,
    ResolvedFestivalTheme theme,
  ) {
    final count = groups.length;

    // > 4 cards (5 up to 10): Auto-scrolling horizontal row every 3 seconds
    if (count > 4) {
      return _AutoScrollGroupCardsList(
        groups: groups,
        allProducts: allProducts,
        theme: theme,
        cardBuilder: _buildSingleGroupCard,
      );
    }

    if (count == 1) {
      return SizedBox(
        height: 140,
        width: double.infinity,
        child: _buildSingleGroupCard(context, groups[0], allProducts, theme),
      );
    }

    if (count == 2) {
      return Row(
        children: [
          Expanded(child: SizedBox(height: 135, child: _buildSingleGroupCard(context, groups[0], allProducts, theme))),
          const SizedBox(width: 8),
          Expanded(child: SizedBox(height: 135, child: _buildSingleGroupCard(context, groups[1], allProducts, theme))),
        ],
      );
    }

    if (count == 3) {
      return Row(
        children: [
          for (int i = 0; i < 3; i++) ...[
            if (i > 0) const SizedBox(width: 6),
            Expanded(child: SizedBox(height: 130, child: _buildSingleGroupCard(context, groups[i], allProducts, theme))),
          ],
        ],
      );
    }

    // count == 4: Fit all 4 cards in a single row without increasing theme height!
    return Row(
      children: [
        for (int i = 0; i < 4; i++) ...[
          if (i > 0) const SizedBox(width: 5),
          Expanded(
            child: SizedBox(
              height: 125,
              child: _buildSingleGroupCard(
                context,
                groups[i],
                allProducts,
                theme,
                isCompact: true,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSingleGroupCard(
    BuildContext context,
    FestivalGroupModel group,
    List<ProductModel> allProducts,
    ResolvedFestivalTheme theme, {
    bool isCompact = false,
  }) {
    // Resolve group image
    String? cardImage = group.imageUrl;
    String targetCatId = 'all';

    if (group.products.isNotEmpty) {
      final firstProd = allProducts.firstWhere(
        (p) => group.products.contains(p.id),
        orElse: () => allProducts.isNotEmpty ? allProducts.first : const ProductModel(
          id: '', name: '', brand: '', categoryId: '', rating: 0, reviewsCount: 0,
          price: 0, mrp: 0, weightOptions: [], defaultWeight: '', description: '',
          nutritionFacts: {}, ingredients: [], imageUrl: '',
        ),
      );
      if (cardImage == null || cardImage.isEmpty) {
        cardImage = firstProd.imageUrl;
      }
      if (firstProd.categoryId.isNotEmpty) {
        targetCatId = firstProd.categoryId;
      }
    }

    final displayImg = (cardImage != null && cardImage.trim().isNotEmpty)
        ? cardImage.trim()
        : null;

    return GestureDetector(
      onTap: () {
        if (targetCatId != 'all') {
          onOpenCategory(targetCatId);
        } else {
          context.push('/search');
        }
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(isCompact ? 14 : 20),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background Category Image filling the card cleanly from Database
            if (displayImg != null && displayImg.startsWith('http'))
              CachedNetworkImage(
                imageUrl: displayImg,
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => Container(
                  color: theme.cardBackground,
                  child: Center(
                    child: Icon(Icons.shopping_bag_outlined, color: theme.accentColor, size: isCompact ? 24 : 36),
                  ),
                ),
              )
            else
              Container(
                color: theme.cardBackground,
                child: Center(
                  child: Icon(Icons.shopping_bag_outlined, color: theme.accentColor, size: isCompact ? 24 : 36),
                ),
              ),

            // Dark gradient overlay at bottom for crisp title text legibility
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Colors.black.withOpacity(0.2),
                      Colors.black.withOpacity(0.88),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.25, 0.6, 1.0],
                  ),
                ),
              ),
            ),

            // Optional Discount Badge at Top Right
            if (group.discountPercent > 0)
              Positioned(
                top: isCompact ? 4 : 8,
                right: isCompact ? 4 : 8,
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: isCompact ? 4 : 6,
                    vertical: isCompact ? 1 : 2,
                  ),
                  decoration: BoxDecoration(
                    color: theme.buttonColor,
                    borderRadius: BorderRadius.circular(isCompact ? 6 : 8),
                  ),
                  child: Text(
                    '${group.discountPercent.toInt()}% OFF',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: isCompact ? 8 : 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),

            // Content at Bottom Left & Chevron Action Button on Bottom Right
            Positioned(
              left: isCompact ? 6 : 10,
              right: isCompact ? 6 : 10,
              bottom: isCompact ? 6 : 10,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      group.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: isCompact ? 10 : 13,
                        fontWeight: FontWeight.w900,
                        height: 1.1,
                        shadows: const [Shadow(color: Colors.black45, blurRadius: 4)],
                      ),
                    ),
                  ),
                  SizedBox(width: isCompact ? 2 : 4),

                  // Circular Chevron Button matching Blinkit design
                  Container(
                    width: isCompact ? 18 : 24,
                    height: isCompact ? 18 : 24,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.chevron_right_rounded,
                      size: isCompact ? 12 : 18,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScallopArchBorder extends StatelessWidget {
  final Color fillColor;
  const _ScallopArchBorder({required this.fillColor});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 14,
      width: double.infinity,
      child: CustomPaint(
        painter: _ScallopPainter(fillColor: fillColor),
      ),
    );
  }
}

class _ScallopPainter extends CustomPainter {
  final Color fillColor;
  _ScallopPainter({required this.fillColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = fillColor
      ..style = PaintingStyle.fill;

    final path = Path();
    path.moveTo(0, size.height);
    const count = 24;
    final archW = size.width / count;

    for (int i = 0; i < count; i++) {
      final startX = i * archW;
      final midX = startX + archW / 2;
      final endX = startX + archW;
      path.lineTo(startX, size.height);
      path.quadraticBezierTo(midX, 0, endX, size.height);
    }
    path.lineTo(size.width, size.height);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _AutoScrollGroupCardsList extends StatefulWidget {
  final List<FestivalGroupModel> groups;
  final List<ProductModel> allProducts;
  final ResolvedFestivalTheme theme;
  final Widget Function(
    BuildContext context,
    FestivalGroupModel group,
    List<ProductModel> allProducts,
    ResolvedFestivalTheme theme, {
    bool isCompact,
  }) cardBuilder;

  const _AutoScrollGroupCardsList({
    required this.groups,
    required this.allProducts,
    required this.theme,
    required this.cardBuilder,
  });

  @override
  State<_AutoScrollGroupCardsList> createState() =>
      _AutoScrollGroupCardsListState();
}

class _AutoScrollGroupCardsListState extends State<_AutoScrollGroupCardsList> {
  late final ScrollController _scrollController;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (_scrollController.hasClients) {
        final maxScroll = _scrollController.position.maxScrollExtent;
        final currentOffset = _scrollController.offset;
        const step = 133.0; // 125 width + 8 spacing
        double target = currentOffset + step;
        if (target >= maxScroll + 10) {
          target = 0;
        }
        _scrollController.animateTo(
          target,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 150,
      child: ListView.separated(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: widget.groups.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          return SizedBox(
            width: 125,
            child: widget.cardBuilder(
              context,
              widget.groups[index],
              widget.allProducts,
              widget.theme,
              isCompact: true,
            ),
          );
        },
      ),
    );
  }
}

