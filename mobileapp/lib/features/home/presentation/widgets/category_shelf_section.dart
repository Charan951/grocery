import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/smart_image.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

/// Bestsellers shelf: up to 6 category cards (3 per row). Each card shows only
/// the products that have actually sold (top sellers first, max 4) and the
/// tiles fill the whole card. Ranking comes live from `/product-sales`.
/// Tapping a card opens that category's bestsellers as a flat, ranked list
/// (no subcategory rail) — same as the web `/products?ids=` page.
class CategoryShelfSection extends StatelessWidget {
  final String title;
  final List<CategoryModel> categories;
  final List<ProductModel> products;

  /// productId → units sold. Products with no sales are never shown.
  final Map<String, int> productSales;

  const CategoryShelfSection({
    super.key,
    required this.title,
    required this.categories,
    required this.products,
    required this.productSales,
  });

  static const int maxCategories = 6;

  List<_ShelfEntry> _entries() {
    final entries = <_ShelfEntry>[];
    for (final c in categories) {
      final sold = products
          .where((p) => p.categoryId == c.id && p.imageUrl.isNotEmpty && (productSales[p.id] ?? 0) > 0)
          .toList()
        ..sort((a, b) => productSales[b.id]!.compareTo(productSales[a.id]!));
      if (sold.isEmpty) continue;
      final score = sold.fold<int>(0, (s, p) => s + productSales[p.id]!);
      entries.add(_ShelfEntry(c, sold, score));
    }
    entries.sort((a, b) => b.score.compareTo(a.score));
    return entries.take(maxCategories).toList();
  }

  void _open(BuildContext context, _ShelfEntry e) {
    final ids = e.products.map((p) => Uri.encodeComponent(p.id)).join(',');
    final title = Uri.encodeComponent('Bestsellers in ${e.category.name}');
    context.push('/category/${e.category.id}?ids=$ids&title=$title');
  }

  @override
  Widget build(BuildContext context) {
    final entries = _entries();
    if (entries.isEmpty) return const SizedBox.shrink();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppTypography.sectionHeading(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, c) {
              const gap = 10.0;
              final w = (c.maxWidth - gap * 2) / 3;
              return Wrap(
                spacing: gap,
                runSpacing: 14,
                children: [
                  for (final e in entries)
                    SizedBox(
                      width: w,
                      child: _ShelfCard(
                        entry: e,
                        isDark: isDark,
                        onTap: () => _open(context, e),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ShelfEntry {
  final CategoryModel category;

  /// Every sold product in the category, top seller first.
  final List<ProductModel> products;
  final int score;
  const _ShelfEntry(this.category, this.products, this.score);
}

class _ShelfCard extends StatelessWidget {
  final _ShelfEntry entry;
  final bool isDark;
  final VoidCallback onTap;

  const _ShelfCard({required this.entry, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final shown = entry.products.take(4).toList();
    final more = entry.products.length - shown.length;
    final tileBg = isDark ? const Color(0xFF2A2A2C) : Colors.white;
    final cardBg = isDark ? const Color(0xFF1E1E20) : const Color(0xFFF1F3F8);
    final borderColor = isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB);

    Widget tile(ProductModel p) => Expanded(
          child: Container(
            decoration: BoxDecoration(color: tileBg, borderRadius: BorderRadius.circular(9)),
            clipBehavior: Clip.antiAlias,
            child: SizedBox.expand(
              child: smartImage(
                url: p.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_) => const SizedBox.shrink(),
              ),
            ),
          ),
        );

    Widget row(List<ProductModel> ps) => Expanded(
          child: Row(
            children: [
              for (var i = 0; i < ps.length; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                tile(ps[i]),
              ],
            ],
          ),
        );

    // Tiles always fill the card: 1 → full, 2 → side by side,
    // 3 → one wide on top + two below, 4 → 2×2.
    final List<Widget> rows = switch (shown.length) {
      1 => [row([shown[0]])],
      2 => [row(shown)],
      3 => [row([shown[0]]), row(shown.sublist(1))],
      _ => [row(shown.sublist(0, 2)), row(shown.sublist(2, 4))],
    };

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.bottomCenter,
            children: [
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: borderColor),
                ),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: Column(
                    children: [
                      for (var i = 0; i < rows.length; i++) ...[
                        if (i > 0) const SizedBox(height: 4),
                        rows[i],
                      ],
                    ],
                  ),
                ),
              ),
              if (more > 0)
                Positioned(
                  bottom: -7,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: borderColor),
                    ),
                    child: Text(
                      '+$more more',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          // Two lines reserved so every card is the same height.
          SizedBox(
            height: MediaQuery.textScalerOf(context).scale(12) * 1.2 * 2,
            child: Text(
              entry.category.name,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                height: 1.2,
                fontWeight: FontWeight.w800,
                color: isDark ? AppColors.textPrimaryDark : const Color(0xFF1F2937),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
