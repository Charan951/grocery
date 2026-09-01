import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

/// Categories tab — a directory of every category and its subcategories, plus a
/// trending-terms cloud built from the live catalog.
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  static IconData iconFor(String icon, String name) {
    final k = '$icon $name'.toLowerCase();
    if (k.contains('organic') || k.contains('leaf') || k.contains('eco')) return Icons.eco_rounded;
    if (k.contains('veg')) return Icons.grass_rounded;
    if (k.contains('fruit')) return Icons.apple_rounded;
    if (k.contains('bak') || k.contains('bread')) return Icons.bakery_dining_rounded;
    if (k.contains('dairy') || k.contains('milk') || k.contains('egg')) return Icons.water_drop_rounded;
    if (k.contains('meat') || k.contains('fish') || k.contains('chicken')) return Icons.set_meal_rounded;
    if (k.contains('frozen')) return Icons.ac_unit_rounded;
    if (k.contains('snack') || k.contains('packaged')) return Icons.cookie_rounded;
    if (k.contains('beverage') || k.contains('drink')) return Icons.local_cafe_rounded;
    if (k.contains('masala') || k.contains('spice')) return Icons.scatter_plot_rounded;
    if (k.contains('rice') || k.contains('atta') || k.contains('dal') || k.contains('staple')) return Icons.rice_bowl_rounded;
    if (k.contains('clean') || k.contains('home')) return Icons.cleaning_services_rounded;
    if (k.contains('baby')) return Icons.child_friendly_rounded;
    if (k.contains('personal') || k.contains('care') || k.contains('beauty')) return Icons.spa_rounded;
    return Icons.shopping_basket_rounded;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final categoriesAsync = ref.watch(categoriesProvider);
    final products = ref.watch(allProductsProvider).valueOrNull ?? const [];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Categories'),
        centerTitle: false,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
      ),
      body: categoriesAsync.when(
        loading: () => const _CategoriesSkeleton(),
        error: (e, _) => ErrorState(onRetry: () => ref.invalidate(categoriesProvider)),
        data: (categories) {
          if (categories.isEmpty) {
            return const EmptyState(
              icon: Icons.grid_view_rounded,
              title: 'No categories yet',
              description: 'Our catalog is being stocked. Pull down to refresh.',
            );
          }
          final trending = _trendingTerms(categories, products);
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              ref.invalidate(categoriesProvider);
              ref.invalidate(allProductsProvider);
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                for (final c in categories) _CategorySection(category: c, isDark: isDark),
                if (trending.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Trending searches', style: AppTypography.h3(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  )),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final t in trending)
                        ActionChip(
                          label: Text(t.label),
                          labelStyle: AppTypography.labelSmall(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ).copyWith(fontWeight: FontWeight.w500),
                          backgroundColor: isDark ? Colors.white10 : AppColors.surface,
                          side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
                          shape: const StadiumBorder(),
                          onPressed: () => context.push(t.route),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  List<_Term> _trendingTerms(List<CategoryModel> cats, List<dynamic> products) {
    final terms = <_Term>[];
    for (final c in cats) {
      terms.add(_Term(c.name, '/category/${c.id}'));
      for (final s in c.subCategories.take(3)) {
        terms.add(_Term(s, '/category/${c.id}?sub=${Uri.encodeComponent(s)}'));
      }
    }
    return terms.take(18).toList();
  }
}

class _Term {
  final String label;
  final String route;
  const _Term(this.label, this.route);
}

class _CategorySection extends StatelessWidget {
  final CategoryModel category;
  final bool isDark;
  const _CategorySection({required this.category, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final subs = category.subCategories;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(CategoriesScreen.iconFor(category.icon, category.name),
                  size: 20, color: category.color),
              const SizedBox(width: 8),
              Expanded(child: Text(category.name, style: AppTypography.title(textColor))),
              GestureDetector(
                onTap: () => context.push('/category/${category.id}'),
                child: Row(
                  children: [
                    Text('See all', style: AppTypography.labelMedium(AppColors.primaryText)),
                    const Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.primary),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (subs.isEmpty)
            _SubTile(
              label: category.name,
              color: category.color,
              icon: CategoriesScreen.iconFor(category.icon, category.name),
              isDark: isDark,
              onTap: () => context.push('/category/${category.id}'),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: EdgeInsets.zero,
              itemCount: subs.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.74,
              ),
              itemBuilder: (context, i) => _SubTile(
                label: subs[i],
                color: category.color,
                icon: CategoriesScreen.iconFor('', subs[i]),
                isDark: isDark,
                onTap: () => context.push(
                  '/category/${category.id}?sub=${Uri.encodeComponent(subs[i])}',
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SubTile extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final bool isDark;
  final VoidCallback onTap;
  const _SubTile({
    required this.label,
    required this.color,
    required this.icon,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: Container(
              decoration: BoxDecoration(
                color: color.withOpacity(isDark ? 0.14 : 0.09),
                borderRadius: AppRadius.brMd,
              ),
              child: Icon(icon, color: isDark ? AppColors.accent : color, size: 26),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            maxLines: 2,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.labelSmall(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ).copyWith(fontWeight: FontWeight.w500, height: 1.2),
          ),
        ],
      ),
    );
  }
}

class _CategoriesSkeleton extends StatelessWidget {
  const _CategoriesSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        for (var s = 0; s < 3; s++) ...[
          const SkeletonLine(widthFactor: 0.4, height: 18),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 8,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
            ),
            itemBuilder: (_, _) => const SkeletonBox(height: double.infinity, borderRadius: AppRadius.brMd),
          ),
          const SizedBox(height: 24),
        ],
      ],
    );
  }
}
