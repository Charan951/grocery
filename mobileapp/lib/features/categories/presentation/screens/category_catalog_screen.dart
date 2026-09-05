import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_bottom_sheet.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/widgets/catalog_cart_bar.dart';
import 'package:freshcart/features/categories/presentation/screens/categories_screen.dart'
    show availableSubCategoriesFor, CategoriesScreen;
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

const _sortLabels = {
  'popular': 'Popular',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  'rating': 'Top rated',
};

class CategoryCatalogScreen extends ConsumerStatefulWidget {
  final String categoryId;
  final String? initialSubCategory;

  const CategoryCatalogScreen({
    super.key,
    required this.categoryId,
    this.initialSubCategory,
  });

  @override
  ConsumerState<CategoryCatalogScreen> createState() => _CategoryCatalogScreenState();
}

class _CategoryCatalogScreenState extends ConsumerState<CategoryCatalogScreen> {
  late String _sub = widget.initialSubCategory?.trim().isNotEmpty == true
      ? widget.initialSubCategory!.trim()
      : 'All';
  bool _organicOnly = false;
  bool _inStockOnly = false;
  bool _onSaleOnly = false;
  String _sort = 'popular';

  int get _activeFilterCount =>
      (_organicOnly ? 1 : 0) +
      (_inStockOnly ? 1 : 0) +
      (_onSaleOnly ? 1 : 0) +
      (_sort != 'popular' ? 1 : 0);

  Future<void> _openSort() async {
    await AppBottomSheet.show(
      context,
      title: 'Sort by',
      showClose: true,
      child: StatefulBuilder(
        builder: (context, setSheet) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          Widget sortTile(String key) => RadioListTile<String>(
                value: key,
                groupValue: _sort,
                activeColor: AppColors.primary,
                contentPadding: EdgeInsets.zero,
                title: Text(_sortLabels[key]!, style: AppTypography.bodyMedium(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                )),
                onChanged: (v) {
                  setSheet(() => _sort = v!);
                  setState(() {});
                },
              );
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [for (final k in _sortLabels.keys) sortTile(k)],
          );
        },
      ),
    );
  }

  void _clearAll() {
    setState(() {
      _sub = 'All';
      _organicOnly = false;
      _inStockOnly = false;
      _onSaleOnly = false;
      _sort = 'popular';
    });
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider).valueOrNull ?? const [];
    final matches = categories.where((c) => c.id == widget.categoryId).toList();
    final category = matches.isNotEmpty ? matches.first : null;
    final title = category?.name ?? 'Category';
    final allProducts = ref.watch(allProductsProvider).valueOrNull ?? const [];
    final subChips = <String>[
      'All',
      if (category != null) ...availableSubCategoriesFor(category, allProducts),
    ];

    final query = CatalogQuery(
      categoryId: widget.categoryId,
      subCategory: _sub,
      organicOnly: _organicOnly,
      inStockOnly: _inStockOnly,
      onSaleOnly: _onSaleOnly,
      sort: _sort,
    );
    final productsAsync = ref.watch(categoryProductsProvider(query));

    return AppScaffold(
      title: title,
      actions: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: const Icon(Icons.sort_rounded),
              onPressed: _openSort,
            ),
            if (_sort != 'popular')
              Positioned(
                right: 6,
                top: 6,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                ),
              ),
          ],
        ),
      ],
      bottomNavigationBar: const CatalogCartBar(),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Left subcategory icon-rail (mirrors the web storefront's mobile
          // layout: a narrow icon rail beside the product grid, rather than a
          // horizontal chip row above it).
          if (subChips.length > 1)
            _SubcategoryRail(
              items: subChips,
              selected: _sub,
              onSelected: (s) => setState(() => _sub = s),
            ),

          Expanded(
            child: productsAsync.when(
              loading: () => const SkeletonGrid(itemCount: 6, childAspectRatio: 0.62),
              error: (e, _) => ErrorState(
                onRetry: () => ref.invalidate(categoryProductsProvider(query)),
              ),
              data: (products) {
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async => ref.invalidate(categoryProductsProvider(query)),
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
                        sliver: SliverToBoxAdapter(
                          child: _FilterHeaderCard(
                            countLabel: '${products.length} ${products.length == 1 ? 'product' : 'products'}'
                                '${_sort != 'popular' ? ' · ${_sortLabels[_sort]!.toLowerCase()}' : ''}',
                            organicOnly: _organicOnly,
                            inStockOnly: _inStockOnly,
                            onSaleOnly: _onSaleOnly,
                            onToggleOrganic: () => setState(() => _organicOnly = !_organicOnly),
                            onToggleInStock: () => setState(() => _inStockOnly = !_inStockOnly),
                            onToggleOnSale: () => setState(() => _onSaleOnly = !_onSaleOnly),
                          ),
                        ),
                      ),
                      if (products.isEmpty)
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: EmptyState(
                            icon: Icons.inventory_2_outlined,
                            title: 'Nothing here yet',
                            description: _sub == 'All'
                                ? 'No products in this category right now.'
                                : 'No products under "$_sub". Try a different filter.',
                            actionText: _activeFilterCount > 0 || _sub != 'All' ? 'Clear filters' : null,
                            onAction: _activeFilterCount > 0 || _sub != 'All' ? _clearAll : null,
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
                          sliver: SliverGrid(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 16,
                              childAspectRatio: 0.62,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (context, i) {
                                final p = products[i];
                                return ProductCard(
                                  product: p,
                                  heroTag: 'product_image_${p.id}',
                                  width: double.infinity,
                                  onTap: () => context.push('/product/${p.id}'),
                                  onAdd: () {
                                    final ok = ref.read(cartProvider.notifier).addToCart(p);
                                    ok
                                        ? AppToast.success('${p.name} added to cart')
                                        : AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                                  },
                                );
                              },
                              childCount: products.length,
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// The header card shown above the grid: a count line plus quick "Organic /
/// In stock / On offer" toggle pills — mirrors the web storefront's category
/// page header exactly.
class _FilterHeaderCard extends StatelessWidget {
  final String countLabel;
  final bool organicOnly;
  final bool inStockOnly;
  final bool onSaleOnly;
  final VoidCallback onToggleOrganic;
  final VoidCallback onToggleInStock;
  final VoidCallback onToggleOnSale;

  const _FilterHeaderCard({
    required this.countLabel,
    required this.organicOnly,
    required this.inStockOnly,
    required this.onSaleOnly,
    required this.onToggleOrganic,
    required this.onToggleInStock,
    required this.onToggleOnSale,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final divider = isDark ? AppColors.dividerDark : AppColors.divider;

    Widget pill(String label, bool on, VoidCallback onTap) {
      return GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: on ? AppColors.primaryText : (isDark ? Colors.white.withOpacity(0.05) : AppColors.background),
            borderRadius: AppRadius.brPill,
            border: Border.all(color: on ? AppColors.primaryText : divider),
          ),
          child: Text(
            label,
            style: AppTypography.labelSmall(on ? Colors.white : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondary))
                .copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            countLabel,
            style: AppTypography.bodySmall(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)
                .copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              pill('Organic', organicOnly, onToggleOrganic),
              pill('In stock', inStockOnly, onToggleInStock),
              pill('On offer', onSaleOnly, onToggleOnSale),
            ],
          ),
        ],
      ),
    );
  }
}

/// Left icon-rail: a narrow, independently-scrolling column of circular
/// subcategory icons, each labelled below — the web storefront's mobile
/// category layout (a 72-96px rail beside the product grid), in place of a
/// horizontal chip row.
class _SubcategoryRail extends StatelessWidget {
  final List<String> items;
  final String selected;
  final ValueChanged<String> onSelected;

  const _SubcategoryRail({required this.items, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 76,
      color: isDark ? AppColors.surfaceDark : AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, i) {
          final name = items[i];
          final isActive = name == selected;
          final icon = name == 'All'
              ? Icons.apps_rounded
              : CategoriesScreen.iconFor('', name);
          return _SubcategoryRailItem(
            label: name,
            icon: icon,
            selected: isActive,
            onTap: () => onSelected(name),
          );
        },
      ),
    );
  }
}

class _SubcategoryRailItem extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _SubcategoryRailItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sub = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return Semantics(
      selected: selected,
      button: true,
      label: label,
      child: ExcludeSemantics(
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                if (selected)
                  Positioned(
                    right: -6,
                    top: 8,
                    bottom: 8,
                    child: Container(width: 3, decoration: BoxDecoration(
                      color: AppColors.primaryText,
                      borderRadius: BorderRadius.circular(2),
                    )),
                  ),
                Column(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: selected
                            ? AppColors.primary.withOpacity(0.14)
                            : (isDark ? Colors.white.withOpacity(0.04) : AppColors.background),
                        border: Border.all(
                          color: selected ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.divider),
                          width: selected ? 1.5 : 1,
                        ),
                      ),
                      child: Icon(icon, size: 20, color: selected ? AppColors.primaryText : sub),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.labelSmall(selected ? AppColors.primaryText : sub)
                          .copyWith(fontSize: 9, fontWeight: selected ? FontWeight.w800 : FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
