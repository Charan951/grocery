import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

/// Which ranking a shelf uses.
enum CategoryShelfKind { bestsellers, topDeals }

/// Blinkit-style shelf: up to 6 category cards (3 per row), each showing a
/// 2×2 grid of product images, a "+N more" pill and the category name.
/// Categories are ranked dynamically — by units sold (bestsellers) or by
/// average discount (top deals).
class CategoryShelfSection extends StatelessWidget {
  final String title;
  final CategoryShelfKind kind;
  final List<CategoryModel> categories;
  final List<ProductModel> products;

  /// categoryId → units sold, from `/category-sales`. May be empty.
  final Map<String, int> sales;
  final void Function(String categoryId) onOpenCategory;

  const CategoryShelfSection({
    super.key,
    required this.title,
    required this.kind,
    required this.categories,
    required this.products,
    required this.sales,
    required this.onOpenCategory,
  });

  static const int maxCategories = 6;

  List<_ShelfEntry> _entries() {
    final entries = <_ShelfEntry>[];
    for (final c in categories) {
      final inCat = products.where((p) => p.categoryId == c.id).toList();
      if (inCat.isEmpty) continue;

      double score;
      if (kind == CategoryShelfKind.bestsellers) {
        // Real sales first; ties/no sales fall back to best-seller flags.
        score = (sales[c.id] ?? 0) * 1000.0 +
            inCat.where((p) => p.isBestSeller).length * 10 +
            inCat.length * 0.01;
        inCat.sort((a, b) {
          if (a.isBestSeller != b.isBestSeller) return a.isBestSeller ? -1 : 1;
          return b.reviewsCount.compareTo(a.reviewsCount);
        });
      } else {
        final deals = inCat.where((p) => p.hasDiscount).toList();
        if (deals.isEmpty) continue;
        score = deals.fold<double>(0, (s, p) => s + p.discountPercent) / deals.length;
        deals.sort((a, b) => b.discountPercent.compareTo(a.discountPercent));
        inCat
          ..clear()
          ..addAll(deals);
      }
      entries.add(_ShelfEntry(c, inCat, score));
    }
    entries.sort((a, b) => b.score.compareTo(a.score));
    return entries.take(maxCategories).toList();
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
            style: AppTypography.h3(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
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
                        onTap: () => onOpenCategory(e.category.id),
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
  final List<ProductModel> products;
  final double score;
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

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E20) : const Color(0xFFF1F3F8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
              ),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                GridView.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 4,
                  crossAxisSpacing: 4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    for (var i = 0; i < 4; i++)
                      Container(
                        decoration: BoxDecoration(
                          color: tileBg,
                          borderRadius: BorderRadius.circular(9),
                        ),
                        clipBehavior: Clip.antiAlias,
                        padding: const EdgeInsets.all(3),
                        child: i < shown.length
                            ? CachedNetworkImage(
                                imageUrl: shown[i].imageUrl,
                                fit: BoxFit.contain,
                                errorWidget: (_, _, _) => const SizedBox.shrink(),
                              )
                            : null,
                      ),
                  ],
                ),
                if (more > 0)
                  Positioned(
                    bottom: -2,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFF1F3F8),
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(
                            color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
                          ),
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
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
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
        ],
      ),
    );
  }
}
