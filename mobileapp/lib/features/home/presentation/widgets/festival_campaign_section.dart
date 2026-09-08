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

/// 1:1 port of the web storefront's `FestivalCampaignWrapper.tsx` (mobile
/// breakpoint). Layout, spacing, type scale, colours and the two card styles
/// (`style1` uniform grid / paged carousel, `style2` hero-rotator + 2×2 grid)
/// mirror the React component. The gradient background is painted by the parent
/// (`home_screen.dart`) so the section blends with the header above it — this
/// widget only draws the content + the bottom scallop arch.
class FestivalCampaignSection extends ConsumerWidget {
  final FestivalCampaignModel campaign;
  final Function(String categoryId) onOpenCategory;

  const FestivalCampaignSection({
    super.key,
    required this.campaign,
    required this.onOpenCategory,
  });

  // web: DEFAULT_GROUP_IMAGES — used only when a group has neither its own image
  // nor a resolvable curated-product image.
  static const _fallbackImages = <String>[
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = FestivalThemeResolver.resolve(campaign);
    final allProducts =
        ref.watch(allProductsProvider).valueOrNull ?? const <ProductModel>[];

    // Match the web filter exactly: active groups, and prefer those that carry
    // real content (own image or ≥1 curated product). If every active group is
    // name-only, fall back to showing them all rather than nothing.
    final activeGroups =
        campaign.festivalGroups.where((g) => g.isActive).take(18).toList();
    final realGroups = activeGroups
        .where((g) =>
            (g.imageUrl ?? '').trim().isNotEmpty || g.products.isNotEmpty)
        .toList();
    final groups = realGroups.isNotEmpty ? realGroups : activeGroups;
    if (groups.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Padding(
          // web: section `pt-5` (20) + inner `px-4` (16); cards block `mb-5` (20)
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
          child: Column(
            children: [
              _TitleBlock(campaign: campaign, theme: theme),
              const SizedBox(height: 16), // web title block `mb-4`

              if (campaign.enableBanner &&
                  campaign.bannerImage.trim().isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CachedNetworkImage(
                    imageUrl: campaign.bannerImage,
                    height: 120,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorWidget: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // style2 is a hero + fixed 2×2 grid — it can only show 4 groups.
              // Outside 3–4 groups (too few = empty cells, too many = silently
              // dropped) fall back to the style1 grid/carousel, which shows
              // every group.
              if (campaign.cardStyle == 'style2' &&
                  groups.length >= 3 &&
                  groups.length <= 4)
                _Style2Layout(
                  groups: groups,
                  products: allProducts,
                  theme: theme,
                  imageFor: (g, i) => _imageFor(g, allProducts, i),
                  onTapGroup: (g) => _openGroup(context, g, allProducts),
                )
              else
                _Style1Layout(
                  groups: groups,
                  theme: theme,
                  imageFor: (g, i) => _imageFor(g, allProducts, i),
                  onTapGroup: (g) => _openGroup(context, g, allProducts),
                ),
            ],
          ),
        ),

        // web: bottom scallop arch transition (24 quadratic arches)
        _ScallopArchBorder(
          fillColor: isDark ? const Color(0xFF18181B) : Colors.white,
        ),
      ],
    );
  }

  String _imageFor(
    FestivalGroupModel group,
    List<ProductModel> allProducts,
    int index,
  ) {
    if (group.imageUrl != null && group.imageUrl!.trim().isNotEmpty) {
      return group.imageUrl!.trim();
    }
    // Use the group's FIRST product (group order), exactly like web — not the
    // first catalog product that happens to be in the group.
    if (group.products.isNotEmpty) {
      final firstId = group.products.first;
      final match = allProducts.where((p) => p.id == firstId);
      if (match.isNotEmpty && match.first.imageUrl.isNotEmpty) {
        return match.first.imageUrl;
      }
    }
    return _fallbackImages[index % _fallbackImages.length];
  }

  /// Where a festival group card lands — mirrors `festivalGroupHref` on web:
  ///  - exactly one curated product  -> that product's page
  ///  - several curated products with a category -> that category
  ///  - nothing usable -> catalog search seeded with the group name
  ///    (web: `/products?search=<name>`)
  void _openGroup(
    BuildContext context,
    FestivalGroupModel group,
    List<ProductModel> allProducts,
  ) {
    final curated = group.products
        .map((id) => allProducts.where((p) => p.id == id))
        .expand((e) => e)
        .toList();

    if (curated.length == 1 && curated.first.id.isNotEmpty) {
      context.push('/product/${curated.first.id}');
      return;
    }
    final withCat = curated.where((p) => p.categoryId.isNotEmpty);
    if (withCat.isNotEmpty) {
      onOpenCategory(withCat.first.categoryId);
      return;
    }
    final name = group.displayName.trim();
    context.push(name.isEmpty ? '/search' : '/search?q=${Uri.encodeComponent(name)}');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Title block  (web: "— Celebrate —" eyebrow + festival name in the theme font)
// ─────────────────────────────────────────────────────────────────────────────

class _TitleBlock extends StatelessWidget {
  final FestivalCampaignModel campaign;
  final ResolvedFestivalTheme theme;

  const _TitleBlock({required this.campaign, required this.theme});

  @override
  Widget build(BuildContext context) {
    // web: `color: theme.text` at `opacity: 0.72`
    final eyebrowColor = theme.textColor.withOpacity(0.72);

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(theme.emoji, style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 8), // web `gap-2`
            Text(
              'CELEBRATE',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 3.0, // web `tracking-[0.28em]` ≈ 11 * 0.28
                color: eyebrowColor,
              ),
            ),
            const SizedBox(width: 8),
            Text(theme.emoji, style: const TextStyle(fontSize: 12)),
          ],
        ),
        const SizedBox(height: 4), // web `mt-1`
        Text(
          campaign.name.isNotEmpty ? campaign.name : 'Celebrate',
          textAlign: TextAlign.center,
          style: AppTypography.festivalCalligraphy(
            theme.textColor,
            fontSize: 30, // web `text-[30px]`
            fontWeight: FontWeight.w400, // web `font-normal`
            fontPreset: theme.fontPreset,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared card chrome
// ─────────────────────────────────────────────────────────────────────────────

/// Bottom-anchored dark scrim, `heightFactor` of the card, transparent → black.
class _Scrim extends StatelessWidget {
  final double heightFactor;
  final double maxOpacity;
  final double midOpacity;

  const _Scrim({
    required this.heightFactor,
    required this.maxOpacity,
    required this.midOpacity,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: FractionallySizedBox(
        heightFactor: heightFactor,
        widthFactor: 1,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.transparent,
                Colors.black.withOpacity(midOpacity),
                Colors.black.withOpacity(maxOpacity),
              ],
              stops: const [0.0, 0.55, 1.0],
            ),
          ),
        ),
      ),
    );
  }
}

class _DiscountBadge extends StatelessWidget {
  final double percent;
  final Color color;
  final bool small;

  const _DiscountBadge({
    required this.percent,
    required this.color,
    this.small = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 6 : 8,
        vertical: small ? 2 : 3,
      ),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6), // web `rounded-md`
      ),
      child: Text(
        '${percent.toInt()}% OFF',
        style: TextStyle(
          color: Colors.white,
          fontSize: small ? 9 : 10,
          fontWeight: FontWeight.w900,
          height: 1,
        ),
      ),
    );
  }
}

Widget _cardImage(String image, Color fallbackBg) {
  if (image.startsWith('http')) {
    return CachedNetworkImage(
      imageUrl: image,
      fit: BoxFit.cover,
      placeholder: (_, _) => ColoredBox(color: fallbackBg),
      errorWidget: (_, _, _) => ColoredBox(color: fallbackBg),
    );
  }
  return ColoredBox(color: fallbackBg);
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLE 1  — uniform image cards
//   1–3 groups : single row (that many columns)
//   4–6 groups : 3-column grid (wraps to 2 rows)
//   > 6 groups : horizontal snap carousel, each page a 3×2 grid
// ─────────────────────────────────────────────────────────────────────────────

class _Style1Layout extends StatelessWidget {
  final List<FestivalGroupModel> groups;
  final ResolvedFestivalTheme theme;
  final String Function(FestivalGroupModel group, int index) imageFor;
  final void Function(FestivalGroupModel group) onTapGroup;

  const _Style1Layout({
    required this.groups,
    required this.theme,
    required this.imageFor,
    required this.onTapGroup,
  });

  static const double _cardH = 130; // card height (web `h-[150px]`, tightened)
  static const double _gap = 10; // web `gap-2.5`

  @override
  Widget build(BuildContext context) {
    final list = groups.take(18).toList();

    Widget card(FestivalGroupModel g, int i) => SizedBox(
          height: _cardH,
          child: _Style1Card(
            group: g,
            image: imageFor(g, i),
            theme: theme,
            onTap: () => onTapGroup(g),
          ),
        );

    // Always lay out relative to the real available width (the section already
    // pads `px-4`), so 3 columns fit exactly and never wrap to 2.
    Widget gridOf(List<FestivalGroupModel> page, int baseIdx) {
      return LayoutBuilder(
        builder: (context, c) {
          final itemW = ((c.maxWidth - 2 * _gap) / 3).floorToDouble();
          return Wrap(
            spacing: _gap,
            runSpacing: _gap,
            children: [
              for (var i = 0; i < page.length; i++)
                SizedBox(width: itemW, child: card(page[i], baseIdx + i)),
            ],
          );
        },
      );
    }

    // 1–6 groups → one static grid.
    if (list.length <= 6) {
      return gridOf(list, 0);
    }

    // > 6 groups → swipeable pages, each a full-width 3×2 grid.
    final pages = <List<FestivalGroupModel>>[];
    for (var i = 0; i < list.length; i += 6) {
      pages.add(list.sublist(i, (i + 6).clamp(0, list.length)));
    }
    final pageCtrl = PageController();

    return Column(
      children: [
        SizedBox(
          height: _cardH * 2 + _gap,
          child: PageView.builder(
            controller: pageCtrl,
            itemCount: pages.length,
            itemBuilder: (_, pi) => gridOf(pages[pi], pi * 6),
          ),
        ),
        const SizedBox(height: 10),
        _PageDots(controller: pageCtrl, count: pages.length, color: theme.textColor),
      ],
    );
  }
}

class _PageDots extends StatelessWidget {
  final PageController controller;
  final int count;
  final Color color;
  const _PageDots({
    required this.controller,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (_, _) {
        final page = controller.hasClients
            ? (controller.page ?? controller.initialPage.toDouble()).round()
            : 0;
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < count; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == page ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: color.withOpacity(i == page ? 0.9 : 0.3),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _Style1Card extends StatelessWidget {
  final FestivalGroupModel group;
  final String image;
  final ResolvedFestivalTheme theme;
  final VoidCallback onTap;

  const _Style1Card({
    required this.group,
    required this.image,
    required this.theme,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16), // web `rounded-2xl`
        child: Stack(
          fit: StackFit.expand,
          children: [
            _cardImage(image, theme.cardBackground),
            const _Scrim(heightFactor: 0.6, maxOpacity: 0.80, midOpacity: 0.20),

            if (group.discountPercent > 0)
              Positioned(
                top: 6,
                right: 6,
                child: _DiscountBadge(
                  percent: group.discountPercent,
                  color: theme.buttonColor,
                  small: true,
                ),
              ),

            // web: bottom row — name (flex) + white chevron circle
            Positioned(
              left: 8,
              right: 8,
              bottom: 8,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Text(
                      group.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        height: 1.15,
                        shadows: [Shadow(color: Colors.black54, blurRadius: 3)],
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Container(
                    width: 16,
                    height: 16,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.chevron_right_rounded,
                      size: 11,
                      color: Color(0xFF1C1C1E),
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

// ─────────────────────────────────────────────────────────────────────────────
// STYLE 2  — left hero rotator (38%) + right 2×2 group grid (62%)
// ─────────────────────────────────────────────────────────────────────────────

class _Style2Layout extends StatelessWidget {
  final List<FestivalGroupModel> groups;
  final List<ProductModel> products;
  final ResolvedFestivalTheme theme;
  final String Function(FestivalGroupModel group, int index) imageFor;
  final void Function(FestivalGroupModel group) onTapGroup;

  const _Style2Layout({
    required this.groups,
    required this.products,
    required this.theme,
    required this.imageFor,
    required this.onTapGroup,
  });

  @override
  Widget build(BuildContext context) {
    final gridGroups = groups.take(4).toList();

    return SizedBox(
      height: 320, // web `h-[320px]`
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Left hero — 38%
          Expanded(
            flex: 38,
            child: _Style2Hero(
              groups: groups,
              products: products,
              theme: theme,
              imageFor: imageFor,
              onTapGroup: onTapGroup,
            ),
          ),
          const SizedBox(width: 12), // web `gap-3`
          // Right 2×2 grid — 62%
          Expanded(
            flex: 62,
            child: _Style2Grid(
              groups: gridGroups,
              theme: theme,
              imageFor: imageFor,
              onTapGroup: onTapGroup,
            ),
          ),
        ],
      ),
    );
  }
}

class _Style2Grid extends StatelessWidget {
  final List<FestivalGroupModel> groups;
  final ResolvedFestivalTheme theme;
  final String Function(FestivalGroupModel group, int index) imageFor;
  final void Function(FestivalGroupModel group) onTapGroup;

  const _Style2Grid({
    required this.groups,
    required this.theme,
    required this.imageFor,
    required this.onTapGroup,
  });

  @override
  Widget build(BuildContext context) {
    Widget cell(int i) {
      if (i >= groups.length) return const SizedBox.shrink();
      return _Style2GridCard(
        group: groups[i],
        image: imageFor(groups[i], i),
        theme: theme,
        onTap: () => onTapGroup(groups[i]),
      );
    }

    Widget row(List<Widget> children) => Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        );

    // 1 group → fills; 2 → stacked; 3 → row of 2 + full-width; 4 → 2×2.
    switch (groups.length) {
      case 1:
        return cell(0);
      case 2:
        return Column(
          children: [
            row([Expanded(child: cell(0))]),
            const SizedBox(height: 12),
            row([Expanded(child: cell(1))]),
          ],
        );
      case 3:
        return Column(
          children: [
            row([
              Expanded(child: cell(0)),
              const SizedBox(width: 12),
              Expanded(child: cell(1)),
            ]),
            const SizedBox(height: 12),
            row([Expanded(child: cell(2))]),
          ],
        );
      default:
        return Column(
          children: [
            row([
              Expanded(child: cell(0)),
              const SizedBox(width: 12),
              Expanded(child: cell(1)),
            ]),
            const SizedBox(height: 12), // web `gap-3`
            row([
              Expanded(child: cell(2)),
              const SizedBox(width: 12),
              Expanded(child: cell(3)),
            ]),
          ],
        );
    }
  }
}

class _Style2GridCard extends StatelessWidget {
  final FestivalGroupModel group;
  final String image;
  final ResolvedFestivalTheme theme;
  final VoidCallback onTap;

  const _Style2GridCard({
    required this.group,
    required this.image,
    required this.theme,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16), // web `rounded-2xl`
          border: Border.all(color: theme.cardBorder),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            _cardImage(image, theme.cardBackground),
            const _Scrim(heightFactor: 0.6, maxOpacity: 0.75, midOpacity: 0.15),

            if (group.discountPercent > 0)
              Positioned(
                top: 8,
                right: 8,
                child: _DiscountBadge(
                  percent: group.discountPercent,
                  color: theme.buttonColor,
                  small: true,
                ),
              ),

            Positioned(
              left: 12,
              right: 12,
              bottom: 10,
              child: Text(
                group.displayName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.left,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13, // web `text-[13px]`
                  fontWeight: FontWeight.w900,
                  height: 1.15,
                  shadows: [
                    Shadow(color: Colors.black54, blurRadius: 6, offset: Offset(0, 1)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Left hero — cross-fades through every (group, product) pair, 4.5 s each.
class _Style2Hero extends StatefulWidget {
  final List<FestivalGroupModel> groups;
  final List<ProductModel> products;
  final ResolvedFestivalTheme theme;
  final String Function(FestivalGroupModel group, int index) imageFor;
  final void Function(FestivalGroupModel group) onTapGroup;

  const _Style2Hero({
    required this.groups,
    required this.products,
    required this.theme,
    required this.imageFor,
    required this.onTapGroup,
  });

  @override
  State<_Style2Hero> createState() => _Style2HeroState();
}

class _HeroItem {
  final FestivalGroupModel group;
  final ProductModel? product;
  const _HeroItem(this.group, this.product);
}

class _Style2HeroState extends State<_Style2Hero> {
  int _i = 0;
  Timer? _timer;
  late List<_HeroItem> _items;

  @override
  void initState() {
    super.initState();
    _items = _buildItems();
    if (_items.length > 1) {
      _timer = Timer.periodic(const Duration(milliseconds: 4500), (_) {
        if (mounted) setState(() => _i = (_i + 1) % _items.length);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  List<_HeroItem> _buildItems() {
    final out = <_HeroItem>[];
    for (final g in widget.groups) {
      final prods = widget.products.where((p) => g.products.contains(p.id)).toList();
      if (prods.isEmpty) {
        out.add(_HeroItem(g, null));
      } else {
        for (final p in prods) {
          out.add(_HeroItem(g, p));
        }
      }
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme;
    final item = _items.isEmpty ? null : _items[_i % _items.length];
    final group = item?.group;
    final prod = item?.product;

    final offer = prod?.price ?? 0;
    var mrp = (prod != null && prod.mrp > prod.price) ? prod.mrp : 0;
    final disc = group?.discountPercent ?? 0;
    if (mrp <= offer && disc > 0 && offer > 0) {
      mrp = (offer / (1 - disc / 100)).round();
    }

    // Product image first; otherwise fall back to the group's resolved image
    // (its own image, a curated product's image, or a themed stock photo) so
    // the hero is never a blank coloured panel — matching the right-grid cards.
    final img = (prod != null && prod.imageUrl.isNotEmpty)
        ? prod.imageUrl
        : (group != null
            ? widget.imageFor(group, widget.groups.indexOf(group).clamp(0, 999))
            : '');
    final prodName = prod?.name ?? '';

    return GestureDetector(
      onTap: () {
        if (prod != null && prod.id.isNotEmpty && prod.id != group?.id) {
          context.push('/product/${prod.id}');
        } else if (group != null) {
          widget.onTapGroup(group);
        }
      },
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: theme.cardBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.cardBorder),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Rotating full-bleed image — cross-fades, card never resizes.
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: SizedBox.expand(
                key: ValueKey(_i),
                child: img.startsWith('http')
                    ? _cardImage(img, theme.cardBackground)
                    : ColoredBox(
                        color: isDarkColor(theme.cardBackground)
                            ? Colors.white.withOpacity(0.10)
                            : Colors.black.withOpacity(0.05),
                      ),
              ),
            ),
            const _Scrim(heightFactor: 0.66, maxOpacity: 0.85, midOpacity: 0.25),

            if (disc > 0)
              Positioned(
                top: 10,
                right: 10,
                child: _DiscountBadge(
                  percent: disc.toDouble(),
                  color: theme.buttonColor,
                ),
              ),

            // Rotation progress pills (max 6) — web: active 16px / others 5px.
            if (_items.length > 1)
              Positioned(
                top: 12,
                left: 12,
                child: Row(
                  children: [
                    for (var d = 0; d < _items.length.clamp(0, 6); d++)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.only(right: 4),
                        height: 4,
                        width: d == _i % _items.length.clamp(1, 6) ? 16 : 5,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(
                            d == _i % _items.length.clamp(1, 6) ? 0.95 : 0.45,
                          ),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                  ],
                ),
              ),

            // Copy overlay — web: p-3.5 (14), eyebrow / name / price
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      (group?.displayName ?? 'Festive Offer').toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.70),
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.8, // web `tracking-[0.18em]`
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      prodName.isNotEmpty ? prodName : 'Festive picks',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        height: 1.15,
                        shadows: [Shadow(color: Colors.black54, blurRadius: 6)],
                      ),
                    ),
                    if (offer > 0) ...[
                      const SizedBox(height: 6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '₹${offer.toInt()}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              height: 1,
                              shadows: [Shadow(color: Colors.black45, blurRadius: 4)],
                            ),
                          ),
                          if (mrp > offer) ...[
                            const SizedBox(width: 6),
                            Text(
                              '₹${mrp.toInt()}',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.60),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                height: 1,
                                decoration: TextDecoration.lineThrough,
                                decorationColor: Colors.white.withOpacity(0.60),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom scallop arch  (unchanged — already matches the web SVG path)
// ─────────────────────────────────────────────────────────────────────────────

class _ScallopArchBorder extends StatelessWidget {
  final Color fillColor;
  const _ScallopArchBorder({required this.fillColor});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 14,
      width: double.infinity,
      child: CustomPaint(painter: _ScallopPainter(fillColor: fillColor)),
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

    final path = Path()..moveTo(0, size.height);
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
