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
import 'package:freshcart/core/widgets/smart_image.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/widgets/catalog_cart_bar.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/categories/data/subcategory_image_resolver.dart';
import 'package:freshcart/features/categories/presentation/screens/categories_screen.dart'
    show availableSubCategoriesFor;
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

const _sortLabels = {
  'popular': 'Popular',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  'rating': 'Top rated',
};

class _SubCategoryItemData {
  final String name;
  final String imageUrl;
  const _SubCategoryItemData({required this.name, required this.imageUrl});
}

class CategoryCatalogScreen extends ConsumerStatefulWidget {
  final String categoryId;
  final String? initialSubCategory;
  final String? title;
  final List<String>? productIds;
  final String? searchQuery;
  final bool hideSubcategories;
  final String? superCategorySlug;

  const CategoryCatalogScreen({
    super.key,
    required this.categoryId,
    this.initialSubCategory,
    this.title,
    this.productIds,
    this.searchQuery,
    this.hideSubcategories = false,
    this.superCategorySlug,
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
    final title = (widget.title != null && widget.title!.trim().isNotEmpty)
        ? widget.title!.trim()
        : (category?.name ?? 'Category');
    final allProducts = ref.watch(allProductsProvider).valueOrNull ?? const [];
    var subNames = category != null ? availableSubCategoriesFor(category, allProducts) : <String>[];

    // When arriving from a Super Category tab, admins may have hand-picked
    // only a subset of this category's subcategories for that tab — scope
    // the rail down to that subset instead of showing every subcategory.
    final scSlug = widget.superCategorySlug;
    if (scSlug != null && scSlug.trim().isNotEmpty) {
      final superCats = ref.watch(superCategoriesProvider).valueOrNull ?? const [];
      String norm(String v) => v.toLowerCase().replaceFirst(RegExp(r'^sc_'), '');
      final target = norm(scSlug);
      Map<String, dynamic>? sc;
      for (final s in superCats) {
        final slug = norm((s['slug'] ?? '').toString());
        final id = norm((s['id'] ?? '').toString());
        if (slug == target || id == target) {
          sc = s;
          break;
        }
      }
      final scSubs = (sc?['subCategories'] as List?)
              ?.map((e) => e.toString().toLowerCase())
              .toSet() ??
          const <String>{};
      if (scSubs.isNotEmpty) {
        final scoped = subNames.where((n) => scSubs.contains(n.toLowerCase())).toList();
        if (scoped.isNotEmpty) subNames = scoped;
      }
    }

    final subItems = <_SubCategoryItemData>[
      _SubCategoryItemData(
        name: 'All',
        imageUrl: (category?.imageUrl.isNotEmpty == true)
            ? category!.imageUrl
            : 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&auto=format&fit=crop',
      ),
      for (final name in subNames) ...[
        () {
          final match = category?.subCategoryItems.firstWhere(
            (s) => s.name.toLowerCase() == name.toLowerCase(),
            orElse: () => SubCategoryModel(id: name, name: name),
          );
          final customImg = match?.imageUrl ?? '';
          final resolvedImg = resolveSubCategoryImage(name, category?.name, customImg);
          return _SubCategoryItemData(name: name, imageUrl: resolvedImg);
        }()
      ]
    ];

    final query = CatalogQuery(
      categoryId: widget.categoryId,
      subCategory: _sub,
      organicOnly: _organicOnly,
      inStockOnly: _inStockOnly,
      onSaleOnly: _onSaleOnly,
      sort: _sort,
      title: widget.title,
      productIds: widget.productIds,
      searchQuery: widget.searchQuery,
    );
    final productsAsync = ref.watch(categoryProductsProvider(query));

    final showSubcategories = !widget.hideSubcategories &&
        widget.productIds == null &&
        subItems.length > 1;

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
          if (showSubcategories)
            _SubcategoryRail(
              items: subItems,
              selected: _sub,
              onSelected: (s) => setState(() => _sub = s),
            ),

          Expanded(
            child: productsAsync.when(
              loading: () => const SkeletonGrid(itemCount: 6, childAspectRatio: 0.53),
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
                            currentSort: _sort,
                            onOpenSort: _openSort,
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
                              childAspectRatio: 0.53,
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

class _FilterHeaderCard extends StatelessWidget {
  final String currentSort;
  final VoidCallback onOpenSort;

  const _FilterHeaderCard({
    required this.currentSort,
    required this.onOpenSort,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final divider = isDark ? AppColors.dividerDark : AppColors.divider;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: divider),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Filter & Sort',
            style: AppTypography.title(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ).copyWith(fontWeight: FontWeight.w700, fontSize: 13),
          ),
          InkWell(
            onTap: onOpenSort,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withOpacity(0.06) : AppColors.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: divider),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.tune_rounded, size: 14, color: AppColors.primaryText),
                  const SizedBox(width: 5),
                  Text(
                    _sortLabels[currentSort] ?? 'Sort',
                    style: AppTypography.labelSmall(
                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    ).copyWith(fontWeight: FontWeight.w800, fontSize: 11),
                  ),
                  const SizedBox(width: 2),
                  Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: isDark ? Colors.white70 : Colors.black54),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubcategoryRail extends StatelessWidget {
  final List<_SubCategoryItemData> items;
  final String selected;
  final ValueChanged<String> onSelected;

  const _SubcategoryRail({required this.items, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 76,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        border: Border(
          right: BorderSide(
            color: isDark ? AppColors.dividerDark : AppColors.divider,
            width: 1,
          ),
        ),
      ),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, i) {
          final item = items[i];
          final isActive = item.name == selected;
          return _SubcategoryRailItem(
            label: item.name,
            imageUrl: item.imageUrl,
            selected: isActive,
            onTap: () => onSelected(item.name),
          );
        },
      ),
    );
  }
}

class _SubcategoryRailItem extends StatelessWidget {
  final String label;
  final String imageUrl;
  final bool selected;
  final VoidCallback onTap;

  const _SubcategoryRailItem({
    required this.label,
    required this.imageUrl,
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
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
            child: Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: selected
                            ? AppColors.primary.withOpacity(0.14)
                            : (isDark ? Colors.white.withOpacity(0.04) : AppColors.background),
                        border: Border.all(
                          color: selected ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.divider),
                          width: selected ? 2.0 : 1.0,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: smartImage(
                          url: imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_) => Container(
                            color: isDark ? Colors.white10 : Colors.black12,
                            child: Icon(Icons.shopping_bag_rounded, size: 20, color: AppColors.primary),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Text(
                        label,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.labelSmall(selected ? AppColors.primaryText : sub)
                            .copyWith(fontSize: 9.5, fontWeight: selected ? FontWeight.w800 : FontWeight.w600, height: 1.15),
                      ),
                    ),
                  ],
                ),
                if (selected)
                  Positioned(
                    right: -4,
                    top: 4,
                    bottom: 4,
                    child: Container(
                      width: 3.5,
                      decoration: BoxDecoration(
                        color: AppColors.primaryText,
                        borderRadius: const BorderRadius.horizontal(left: Radius.circular(3)),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
