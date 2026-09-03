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
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            children: [
              // Blinkit Style Header Header: — CELEBRATE — Festival Name
              Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(theme.emoji, style: const TextStyle(fontSize: 16)),
                      const SizedBox(width: 6),
                      Text(
                        'CELEBRATE',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.2,
                          color: theme.accentColor,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(theme.emoji, style: const TextStyle(fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    campaign.name,
                    textAlign: TextAlign.center,
                    style: AppTypography.h2(theme.textColor).copyWith(
                      fontWeight: FontWeight.w900,
                      fontSize: 22,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Optional Banner
              if (campaign.enableBanner && campaign.bannerImage.trim().isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CachedNetworkImage(
                    imageUrl: campaign.bannerImage,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 14),
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

    // > 5 cards (up to 10): Horizontal Scrollable Row
    if (count > 5) {
      return SizedBox(
        height: 180,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          itemCount: count,
          separatorBuilder: (context, index) => const SizedBox(width: 12),
          itemBuilder: (context, index) {
            return SizedBox(
              width: 140,
              child: _buildSingleGroupCard(context, groups[index], allProducts, theme),
            );
          },
        ),
      );
    }

    // <= 5 cards: Grid / Row arrangement
    if (count == 1) {
      return SizedBox(
        height: 180,
        width: double.infinity,
        child: _buildSingleGroupCard(context, groups[0], allProducts, theme),
      );
    }

    if (count == 2) {
      return Row(
        children: [
          Expanded(child: SizedBox(height: 180, child: _buildSingleGroupCard(context, groups[0], allProducts, theme))),
          const SizedBox(width: 12),
          Expanded(child: SizedBox(height: 180, child: _buildSingleGroupCard(context, groups[1], allProducts, theme))),
        ],
      );
    }

    if (count == 3) {
      return Row(
        children: [
          for (int i = 0; i < 3; i++) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(child: SizedBox(height: 170, child: _buildSingleGroupCard(context, groups[i], allProducts, theme))),
          ],
        ],
      );
    }

    if (count == 4) {
      return Column(
        children: [
          Row(
            children: [
              Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[0], allProducts, theme))),
              const SizedBox(width: 10),
              Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[1], allProducts, theme))),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[2], allProducts, theme))),
              const SizedBox(width: 10),
              Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[3], allProducts, theme))),
            ],
          ),
        ],
      );
    }

    // count == 5
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[0], allProducts, theme))),
            const SizedBox(width: 10),
            Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[1], allProducts, theme))),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            for (int i = 2; i < 5; i++) ...[
              if (i > 2) const SizedBox(width: 10),
              Expanded(child: SizedBox(height: 160, child: _buildSingleGroupCard(context, groups[i], allProducts, theme))),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildSingleGroupCard(
    BuildContext context,
    FestivalGroupModel group,
    List<ProductModel> allProducts,
    ResolvedFestivalTheme theme,
  ) {
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

    final displayImg = (cardImage != null && cardImage.isNotEmpty)
        ? cardImage
        : 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&auto=format&fit=crop';

    return GestureDetector(
      onTap: () {
        if (targetCatId != 'all') {
          onOpenCategory(targetCatId);
        } else {
          context.push('/search');
        }
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background Category Image filling the card cleanly
            CachedNetworkImage(
              imageUrl: displayImg,
              fit: BoxFit.cover,
              errorWidget: (context, url, error) => Container(
                color: theme.cardBackground,
                child: Center(
                  child: Icon(Icons.shopping_bag_outlined, color: theme.accentColor, size: 36),
                ),
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
                      Colors.black.withOpacity(0.85),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.3, 0.65, 1.0],
                  ),
                ),
              ),
            ),

            // Optional Discount Badge at Top Right
            if (group.discountPercent > 0)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: theme.buttonColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${group.discountPercent.toInt()}% OFF',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),

            // Content at Bottom Left & Chevron Action Button on Bottom Right
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          group.displayName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            height: 1.1,
                            shadows: [Shadow(color: Colors.black45, blurRadius: 4)],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 4),

                  // Circular Chevron Button matching Blinkit design
                  Container(
                    width: 24,
                    height: 24,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
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
