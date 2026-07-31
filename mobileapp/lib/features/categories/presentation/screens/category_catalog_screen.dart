import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

class CategoryCatalogScreen extends ConsumerStatefulWidget {
  final String categoryId;

  const CategoryCatalogScreen({
    super.key,
    required this.categoryId,
  });

  @override
  ConsumerState<CategoryCatalogScreen> createState() => _CategoryCatalogScreenState();
}

class _CategoryCatalogScreenState extends ConsumerState<CategoryCatalogScreen> {
  bool _organicOnly = false;
  String _sortBy = 'popular'; // popular, price_low, price_high

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final CategoryModel category;
    final standardCategory = MockDataService.categories.firstWhere(
      (c) => c.id == widget.categoryId,
      orElse: () => const CategoryModel(id: '', name: '', icon: '', color: Colors.grey, productCount: 0),
    );

    if (standardCategory.id.isNotEmpty) {
      category = standardCategory;
    } else {
      final String name = widget.categoryId;
      String iconStr = 'custom';
      Color color = const Color(0xFF2E7D32);
      
      if (name.toLowerCase().contains('fresh')) {
        iconStr = 'organic';
        color = const Color(0xFF4CAF50);
      } else if (name.toLowerCase().contains('grocery')) {
        iconStr = 'dairy';
        color = const Color(0xFF007AFF);
      } else if (name.toLowerCase().contains('electronics') || name.toLowerCase().contains('earbud')) {
        iconStr = 'frozen';
        color = const Color(0xFF8E8E93);
      } else if (name.toLowerCase().contains('monsoon') || name.toLowerCase().contains('umbrella')) {
        iconStr = 'beverages';
        color = const Color(0xFFAF52DE);
      } else if (name.toLowerCase().contains('kitchen') || name.toLowerCase().contains('crockery')) {
        iconStr = 'bakery';
        color = const Color(0xFFFF9500);
      } else if (name.toLowerCase().contains('cleaning') || name.toLowerCase().contains('home')) {
        iconStr = 'dairy';
        color = const Color(0xFF5AC8FA);
      } else if (name.toLowerCase().contains('makeup') || name.toLowerCase().contains('fragrance')) {
        iconStr = 'snacks';
        color = const Color(0xFFFF2D55);
      } else if (name.toLowerCase().contains('skin') || name.toLowerCase().contains('hair')) {
        iconStr = 'organic';
        color = const Color(0xFF34C759);
      }

      category = CategoryModel(
        id: widget.categoryId,
        name: name,
        icon: iconStr,
        color: color,
        productCount: 0,
      );
    }

    var filteredProducts = MockDataService.products.where((p) {
      final catId = widget.categoryId.toLowerCase();
      
      if (p.categoryId == widget.categoryId) return true;
      
      if (catId.contains('fresh')) {
        return p.categoryId == 'cat_organic' || p.categoryId == 'cat_veg' || p.categoryId == 'cat_fruits';
      }
      
      if (catId.contains('grocery')) {
        return p.categoryId == 'cat_dairy' || p.categoryId == 'cat_bakery' || p.categoryId == 'cat_snacks' || p.categoryId == 'cat_drinks';
      }
      
      if (catId.contains('kitchen') || catId.contains('crockery')) {
        return p.categoryId == 'cat_bakery' || p.categoryId == 'cat_organic';
      }
      if (catId.contains('cleaning') || catId.contains('home')) {
        return p.categoryId == 'cat_dairy';
      }
      if (catId.contains('makeup') || catId.contains('fragrance') || catId.contains('skin') || catId.contains('hair')) {
        return p.categoryId == 'cat_organic';
      }
      if (catId.contains('after hours') || catId.contains('kickoff') || catId.contains('munchies') || catId.contains('snack')) {
        return p.categoryId == 'cat_snacks';
      }
      if (catId.contains('beverage') || catId.contains('mixer') || catId.contains('drink')) {
        return p.categoryId == 'cat_drinks';
      }
      if (catId.contains('instant') || catId.contains('bakery')) {
        return p.categoryId == 'cat_bakery' || p.categoryId == 'cat_snacks';
      }
      if (catId.contains('meat') || catId.contains('seafood')) {
        return p.categoryId == 'cat_meat';
      }
      
      return false;
    }).toList();

    if (_organicOnly) {
      filteredProducts = filteredProducts.where((p) => p.isOrganic).toList();
    }

    if (_sortBy == 'price_low') {
      filteredProducts.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortBy == 'price_high') {
      filteredProducts.sort((a, b) => b.price.compareTo(a.price));
    }

    final cartNotifier = ref.read(cartProvider.notifier);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: Text(category.name),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter Pills Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Row(
                children: [
                  // Organic filter
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _organicOnly = !_organicOnly;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: _organicOnly
                            ? AppColors.primary
                            : (isDark ? Colors.white10 : Colors.white),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _organicOnly ? Colors.transparent : (isDark ? Colors.white24 : AppColors.divider),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.eco_rounded,
                            size: 16,
                            color: _organicOnly ? Colors.white : AppColors.primary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Organic Only',
                            style: AppTypography.labelMedium(
                              _organicOnly ? Colors.white : (isDark ? Colors.white : AppColors.textPrimary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  
                  // Sort dropdown
                  Expanded(
                    child: GlassCard(
                      borderRadius: 20,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      color: isDark ? Colors.white12 : Colors.white,
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _sortBy,
                          icon: const Icon(Icons.keyboard_arrow_down_rounded),
                          style: TextStyle(
                            color: isDark ? Colors.white : AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                          onChanged: (String? newValue) {
                            if (newValue != null) {
                              setState(() {
                                _sortBy = newValue;
                              });
                            }
                          },
                          items: const [
                            DropdownMenuItem(value: 'popular', child: Text('Sort: Popular')),
                            DropdownMenuItem(value: 'price_low', child: Text('Price: Low to High')),
                            DropdownMenuItem(value: 'price_high', child: Text('Price: High to Low')),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Products Grid
            Expanded(
              child: filteredProducts.isEmpty
                  ? Center(
                      child: Text(
                        'No products found in this category.',
                        style: AppTypography.bodyMedium(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ),
                      ),
                    )
                  : GridView.builder(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 14,
                        childAspectRatio: 0.64,
                      ),
                      itemCount: filteredProducts.length,
                      itemBuilder: (context, index) {
                        final prod = filteredProducts[index];
                        return ProductCard(
                          product: prod,
                          onTap: () => context.push('/product/${prod.id}'),
                          onAdd: () {
                            cartNotifier.addToCart(prod);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Added ${prod.name} to Cart'),
                                duration: const Duration(seconds: 1),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
