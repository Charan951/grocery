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
  String _selectedSubCategory = 'All';
  String _sortBy = 'popular'; // popular, price_low, price_high

  // Subcategory Tabs mapping for categories
  final Map<String, List<String>> _categorySubMap = {
    'fruits-vegetables': ['All', 'Fresh Vegetables', 'Fresh Fruits', 'Exotics & Premium', 'Organics & Hydroponics', 'Mangoes & Melons'],
    'cat_veg': ['All', 'Fresh Vegetables', 'Exotics & Premium', 'Organics & Hydroponics'],
    'cat_fruits': ['All', 'Fresh Fruits', 'Exotics & Premium', 'Mangoes & Melons'],
    'dairy-bread-eggs': ['All', 'Milk', 'Breads & Buns', 'Eggs', 'Curd & Probiotic Drinks', 'Paneer & Cream'],
    'cat_dairy': ['All', 'Milk', 'Curd & Probiotic Drinks', 'Paneer & Cream', 'Butter', 'Cheese'],
    'cat_bakery': ['All', 'Breads & Buns', 'Fresh Bakery', 'Indian Breads'],
    'atta-rice-oil-dals': ['All', 'Atta', 'Rice', 'Edible Oils', 'Dals & Pulses', 'Ghee'],
    'meats-fish-eggs': ['All', 'Chicken', 'Mutton', 'Fish & Seafood', 'Eggs & Poultry'],
    'masala-dry-fruits-more': ['All', 'Whole Spices', 'Powdered Spices', 'Almonds & Cashews', 'Raisins & Walnuts'],
    'packaged-food': ['All', 'Chips & Namkeen', 'Noodles & Pasta', 'Biscuits & Cookies'],
  };

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
      category = CategoryModel(
        id: widget.categoryId,
        name: name,
        icon: 'custom',
        color: const Color(0xFF00A86B),
        productCount: 0,
      );
    }

    final availableSubCategories = _categorySubMap[widget.categoryId] ?? ['All', 'Popular Items', 'Fresh Picks', 'Organics'];

    var filteredProducts = MockDataService.products.where((p) {
      final catId = widget.categoryId.toLowerCase();
      bool matchCategory = (p.categoryId == widget.categoryId);
      
      if (!matchCategory) {
        if (catId.contains('fresh') || catId.contains('veg') || catId.contains('fruit')) {
          matchCategory = p.categoryId == 'cat_organic' || p.categoryId == 'cat_veg' || p.categoryId == 'cat_fruits';
        } else if (catId.contains('grocery') || catId.contains('dairy') || catId.contains('bakery')) {
          matchCategory = p.categoryId == 'cat_dairy' || p.categoryId == 'cat_bakery' || p.categoryId == 'cat_snacks' || p.categoryId == 'cat_drinks';
        }
      }

      if (!matchCategory) return false;

      if (_selectedSubCategory != 'All') {
        final pSub = (p.subCategory ?? '').toLowerCase();
        final selSub = _selectedSubCategory.toLowerCase();
        return pSub.contains(selSub) || selSub.contains(pSub) || p.name.toLowerCase().contains(selSub);
      }

      return true;
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
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
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
            // 1. Subcategory Horizontal Tabs Bar (Matching Web Frontend Products.tsx)
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(vertical: 4),
              color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: availableSubCategories.length,
                itemBuilder: (context, index) {
                  final sub = availableSubCategories[index];
                  final isSelected = _selectedSubCategory == sub;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(sub, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87))),
                      selected: isSelected,
                      selectedColor: const Color(0xFF00A86B),
                      backgroundColor: isDark ? Colors.white10 : Colors.grey.shade100,
                      onSelected: (_) => setState(() => _selectedSubCategory = sub),
                    ),
                  );
                },
              ),
            ),

            // 2. Filter & Sorting Controls
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _organicOnly = !_organicOnly;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: _organicOnly ? const Color(0xFF00A86B) : (isDark ? Colors.white10 : Colors.white),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: _organicOnly ? Colors.transparent : (isDark ? Colors.white24 : AppColors.divider),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.eco_rounded,
                            size: 14,
                            color: _organicOnly ? Colors.white : const Color(0xFF00A86B),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Organic Only',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _organicOnly ? Colors.white : (isDark ? Colors.white : AppColors.textPrimary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  Expanded(
                    child: GlassCard(
                      borderRadius: 16,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                      color: isDark ? Colors.white12 : Colors.white,
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _sortBy,
                          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18),
                          style: TextStyle(
                            color: isDark ? Colors.white : AppColors.textPrimary,
                            fontSize: 12,
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

            // 3. Products 2-Column Grid
            Expanded(
              child: filteredProducts.isEmpty
                  ? Center(
                      child: Text(
                        'No products found for "$_selectedSubCategory"',
                        style: AppTypography.bodyMedium(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ),
                      ),
                    )
                  : GridView.builder(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
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
                                backgroundColor: const Color(0xFF00A86B),
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
