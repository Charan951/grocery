import 'package:cached_network_image/cached_network_image.dart';
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
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/categories/presentation/screens/categories_screen.dart'
    show availableSubCategoriesFor;
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

const _sortLabels = {
  'popular': 'Popular',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  'rating': 'Top rated',
};

String _resolveSubCategoryImage(String subName, String? catName, [String? customImg]) {
  if (customImg != null && customImg.trim().isNotEmpty) {
    final trimmed = customImg.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
      return trimmed;
    }
  }

  final subLower = subName.toLowerCase().trim();

  if (subLower.contains('veg')) return 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&auto=format&fit=crop';
  if (subLower.contains('fruit')) return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&auto=format&fit=crop';
  if (subLower.contains('exotic') || subLower.contains('premium')) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop';
  if (subLower.contains('organic') || subLower.contains('hydro')) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop';
  if (subLower.contains('leafy') || subLower.contains('herb') || subLower.contains('season')) return 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&auto=format&fit=crop';
  if (subLower.contains('mango') || subLower.contains('melon')) return 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&auto=format&fit=crop';
  if (subLower.contains('cut') || subLower.contains('sprout')) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&auto=format&fit=crop';

  if (subLower.contains('milk')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop';
  if (subLower.contains('bread') || subLower.contains('bun')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop';
  if (subLower.contains('egg')) return 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=200&auto=format&fit=crop';
  if (subLower.contains('curd') || subLower.contains('yogurt') || subLower.contains('drink')) return 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=200&auto=format&fit=crop';
  if (subLower.contains('paneer') || subLower.contains('cream') || subLower.contains('cheese')) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop';
  if (subLower.contains('butter')) return 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop';

  if (subLower.contains('chip') || subLower.contains('namkeen') || subLower.contains('snack')) return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop';
  if (subLower.contains('noodle') || subLower.contains('pasta')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200&auto=format&fit=crop';
  if (subLower.contains('biscuit') || subLower.contains('cookie')) return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&auto=format&fit=crop';
  if (subLower.contains('chocolate') || subLower.contains('sweet')) return 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop';

  if (subLower.contains('atta') || subLower.contains('flour')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop';
  if (subLower.contains('rice')) return 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200&auto=format&fit=crop';
  if (subLower.contains('oil')) return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop';
  if (subLower.contains('dal') || subLower.contains('pulse')) return 'https://images.unsplash.com/photo-1585994191611-726a88060c2d?w=200&auto=format&fit=crop';
  if (subLower.contains('ghee')) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop';

  if (subLower.contains('chicken')) return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200&auto=format&fit=crop';
  if (subLower.contains('mutton') || subLower.contains('meat')) return 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop';
  if (subLower.contains('fish') || subLower.contains('seafood')) return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&auto=format&fit=crop';

  if (subLower.contains('spice') || subLower.contains('masala')) return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop';
  if (subLower.contains('dry fruit') || subLower.contains('nut') || subLower.contains('cashew') || subLower.contains('almond')) return 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=200&auto=format&fit=crop';

  if (subLower.contains('cereal') || subLower.contains('oats')) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&auto=format&fit=crop';
  if (subLower.contains('sauce') || subLower.contains('ketchup') || subLower.contains('spread')) return 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=200&auto=format&fit=crop';

  return 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&auto=format&fit=crop';
}

class _SubCategoryItemData {
  final String name;
  final String imageUrl;
  const _SubCategoryItemData({required this.name, required this.imageUrl});
}

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
    final subNames = category != null ? availableSubCategoriesFor(category, allProducts) : <String>[];

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
          final resolvedImg = _resolveSubCategoryImage(name, category?.name, customImg);
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
          if (subItems.length > 1)
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
                        child: imageUrl.startsWith('http')
                            ? CachedNetworkImage(
                                imageUrl: imageUrl,
                                fit: BoxFit.cover,
                                fadeInDuration: const Duration(milliseconds: 150),
                                errorWidget: (context, url, error) => Container(
                                  color: isDark ? Colors.white10 : Colors.black12,
                                  child: Icon(Icons.shopping_bag_rounded, size: 20, color: AppColors.primary),
                                ),
                              )
                            : Container(
                                color: isDark ? Colors.white10 : Colors.black12,
                                child: Icon(Icons.shopping_bag_rounded, size: 20, color: AppColors.primary),
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
