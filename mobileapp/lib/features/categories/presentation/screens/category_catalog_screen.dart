import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_bottom_sheet.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/widgets/catalog_cart_bar.dart';
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

  Future<void> _openFilters() async {
    await AppBottomSheet.show(
      context,
      title: 'Filter & sort',
      showClose: true,
      child: StatefulBuilder(
        builder: (context, setSheet) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          Widget toggle(String label, IconData icon, bool value, ValueChanged<bool> onSet) =>
              SwitchListTile(
                value: value,
                activeColor: AppColors.primary,
                contentPadding: EdgeInsets.zero,
                title: Text(label, style: AppTypography.bodyMedium(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                )),
                secondary: Icon(icon, color: AppColors.primary),
                onChanged: (v) {
                  setSheet(() => onSet(v));
                  setState(() {});
                },
              );
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
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              toggle('Organic only', Icons.eco_rounded, _organicOnly, (v) => _organicOnly = v),
              toggle('In stock only', Icons.inventory_2_outlined, _inStockOnly, (v) => _inStockOnly = v),
              toggle('On offer', Icons.local_offer_outlined, _onSaleOnly, (v) => _onSaleOnly = v),
              const Divider(height: 24),
              Text('Sort by', style: AppTypography.labelMedium(
                isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
              )),
              for (final k in _sortLabels.keys) sortTile(k),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final categories = ref.watch(categoriesProvider).valueOrNull ?? const [];
    final matches = categories.where((c) => c.id == widget.categoryId).toList();
    final category = matches.isNotEmpty ? matches.first : null;
    final title = category?.name ?? 'Category';
    final subChips = <String>['All', ...(category?.subCategories ?? const [])];

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
              icon: const Icon(Icons.tune_rounded),
              onPressed: _openFilters,
            ),
            if (_activeFilterCount > 0)
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
      body: Column(
        children: [
          if (subChips.length > 1)
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                physics: const BouncingScrollPhysics(),
                itemCount: subChips.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final s = subChips[i];
                  final selected = _sub == s;
                  return ChoiceChip(
                    label: Text(s),
                    selected: selected,
                    showCheckmark: false,
                    labelStyle: AppTypography.labelMedium(
                      selected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
                    ),
                    selectedColor: AppColors.primary,
                    backgroundColor: isDark ? Colors.white10 : AppColors.surface,
                    side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
                    shape: const StadiumBorder(),
                    onSelected: (_) => setState(() => _sub = s),
                  );
                },
              ),
            ),
          Expanded(
            child: productsAsync.when(
              loading: () => const SkeletonGrid(itemCount: 6),
              error: (e, _) => ErrorState(
                onRetry: () => ref.invalidate(categoryProductsProvider(query)),
              ),
              data: (products) {
                if (products.isEmpty) {
                  return EmptyState(
                    icon: Icons.inventory_2_outlined,
                    title: 'Nothing here yet',
                    description: _sub == 'All'
                        ? 'No products in this category right now.'
                        : 'No products under "$_sub". Try a different filter.',
                    actionText: _activeFilterCount > 0 || _sub != 'All' ? 'Clear filters' : null,
                    onAction: _activeFilterCount > 0 || _sub != 'All'
                        ? () => setState(() {
                              _sub = 'All';
                              _organicOnly = false;
                              _inStockOnly = false;
                              _onSaleOnly = false;
                              _sort = 'popular';
                            })
                        : null,
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async => ref.invalidate(categoryProductsProvider(query)),
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                          child: Text(
                            '${products.length} ${products.length == 1 ? 'product' : 'products'}'
                            '${_sort != 'popular' ? ' · ${_sortLabels[_sort]!.toLowerCase()}' : ''}',
                            style: AppTypography.bodySmall(
                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        sliver: SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.70,
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
