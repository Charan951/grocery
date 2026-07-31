import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/badges.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class ProductDetailsScreen extends ConsumerStatefulWidget {
  final String productId;

  const ProductDetailsScreen({
    super.key,
    required this.productId,
  });

  @override
  ConsumerState<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends ConsumerState<ProductDetailsScreen> {
  late ProductModel _product;
  late String _selectedWeight;
  int _quantityInCart = 0;

  @override
  void initState() {
    super.initState();
    _product = MockDataService.products.firstWhere(
      (p) => p.id == widget.productId,
      orElse: () => MockDataService.products.first,
    );
    _selectedWeight = _product.defaultWeight;
  }

  IconData _getProductIcon(String type) {
    switch (type.toLowerCase()) {
      case 'apple':
      case 'fruits':
        return Icons.apple_rounded;
      case 'vegetables':
      case 'carrot':
      case 'broccoli':
        return Icons.grass_rounded;
      case 'milk':
      case 'dairy':
        return Icons.water_drop_rounded;
      case 'bread':
      case 'bakery':
        return Icons.bakery_dining_rounded;
      case 'chicken':
      case 'meat':
        return Icons.kebab_dining_rounded;
      case 'pizza':
        return Icons.local_pizza_rounded;
      case 'burger':
        return Icons.lunch_dining_rounded;
      case 'beverages':
      case 'soda':
        return Icons.local_drink_rounded;
      case 'snacks':
      case 'chips':
        return Icons.cookie_rounded;
      default:
        return Icons.shopping_bag_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cartState = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final wishlistNotifier = ref.read(wishlistProvider.notifier);
    final isFav = ref.watch(wishlistProvider).contains(_product.id);

    // Calculate current item quantity in cart
    final cartItemIndex = cartState.items.indexWhere(
      (item) => item.product.id == _product.id && item.selectedWeight == _selectedWeight,
    );
    _quantityInCart = cartItemIndex >= 0 ? cartState.items[cartItemIndex].quantity : 0;

    // Filter similar products
    final similarProducts = MockDataService.products
        .where((p) => p.categoryId == _product.categoryId && p.id != _product.id)
        .toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Stack(
        children: [
          // Content
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // Hero Header & Gallery Image
              SliverAppBar(
                expandedHeight: 320.0,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  onPressed: () => context.pop(),
                ),
                actions: [
                  // Wishlist Button
                  IconButton(
                    icon: Icon(
                      isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      color: isFav ? AppColors.error : (isDark ? Colors.white : AppColors.textPrimary),
                    ),
                    onPressed: () {
                      wishlistNotifier.toggleWishlist(_product.id);
                    },
                  ),
                  // Share Button
                  IconButton(
                    icon: const Icon(Icons.share_rounded),
                    onPressed: () {},
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    color: isDark ? Colors.white.withOpacity(0.02) : Colors.black.withOpacity(0.01),
                    child: Center(
                      child: Hero(
                        tag: 'product_image_${_product.id}',
                        child: _product.imageUrl.startsWith('http')
                            ? Image.network(
                                _product.imageUrl,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                                loadingBuilder: (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return const Center(
                                    child: SizedBox(
                                      width: 32,
                                      height: 32,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  );
                                },
                                errorBuilder: (context, error, stackTrace) {
                                  return Center(
                                    child: Icon(
                                      _getProductIcon(_product.imageUrl),
                                      size: 140,
                                      color: _product.isOrganic ? AppColors.primary : AppColors.accent,
                                    ),
                                  );
                                },
                              )
                            : Icon(
                                _getProductIcon(_product.imageUrl),
                                size: 140,
                                color: _product.isOrganic ? AppColors.primary : AppColors.accent,
                              ),
                      ),
                    ),
                  ),
                ),
              ),

              // Product Info Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges
                      Row(
                        children: [
                          if (_product.isOrganic) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.eco_rounded, size: 12, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    '100% Organic',
                                    style: AppTypography.labelSmall(AppColors.primary),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          const DeliveryBadge(durationText: 'Delivery in 10-15 mins'),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Brand & Title
                      Text(
                        _product.brand.toUpperCase(),
                        style: AppTypography.labelMedium(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ).copyWith(letterSpacing: 1.0),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _product.name,
                        style: AppTypography.display(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ).copyWith(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.6),
                      ),
                      const SizedBox(height: 8),

                      // Ratings & Reviews
                      RatingWidget(
                        rating: _product.rating,
                        reviewsCount: _product.reviewsCount,
                        iconSize: 18,
                        fontSize: 14,
                      ),
                      const SizedBox(height: 24),

                      // Size/Weight Selector
                      Text(
                        'Select Portion / Size',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: _product.weightOptions.map((weight) {
                          final isSelected = _selectedWeight == weight;
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedWeight = weight;
                              });
                            },
                            child: Container(
                              margin: const EdgeInsets.only(right: 12),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primary.withOpacity(0.12)
                                    : (isDark ? Colors.white10 : Colors.white),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : (isDark ? Colors.white12 : AppColors.divider),
                                  width: 1.5,
                                ),
                              ),
                              child: Text(
                                weight,
                                style: AppTypography.labelLarge(
                                  isSelected ? AppColors.primary : (isDark ? Colors.white : AppColors.textPrimary),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 24),

                      // Description
                      Text(
                        'Description',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _product.description,
                        style: AppTypography.bodyMedium(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ).copyWith(height: 1.45),
                      ),
                      const SizedBox(height: 24),

                      // Nutrition Facts
                      Text(
                        'Nutrition Facts',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: _product.nutritionFacts.entries.map((entry) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    entry.key,
                                    style: AppTypography.bodyMedium(
                                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                    ),
                                  ),
                                  Text(
                                    entry.value,
                                    style: AppTypography.labelMedium(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Similar Products
                      if (similarProducts.isNotEmpty) ...[
                        Text(
                          'Similar Products',
                          style: AppTypography.h3(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 290,
                          child: ListView.builder(
                            physics: const BouncingScrollPhysics(),
                            scrollDirection: Axis.horizontal,
                            itemCount: similarProducts.length,
                            itemBuilder: (context, index) {
                              final prod = similarProducts[index];
                              return Padding(
                                padding: const EdgeInsets.only(right: 12),
                                child: ProductCard(
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
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                      const SizedBox(height: 120), // Bottom spacer for sticky bar
                    ],
                  ),
                ),
              ),
            ],
          ),
          
          // Sticky Bottom Add-To-Cart bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: GlassCard(
              borderRadius: 32,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              color: isDark ? const Color(0xE01C1C1E) : const Color(0xE6FFFFFF),
              borderColor: isDark ? Colors.white12 : Colors.black.withOpacity(0.04),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Price breakdown
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total Price',
                        style: AppTypography.bodySmall(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        '₹${(_product.price * (_quantityInCart > 0 ? _quantityInCart : 1)).toStringAsFixed(0)}',
                        style: AppTypography.h1(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ).copyWith(fontSize: 22),
                      ),
                    ],
                  ),
                  
                  // Increment Stepper OR Add Button
                  _quantityInCart > 0
                      ? Row(
                          children: [
                            GestureDetector(
                              onTap: () => cartNotifier.removeFromCart(_product, weight: _selectedWeight),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.remove_rounded, color: AppColors.primary),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16.0),
                              child: Text(
                                '$_quantityInCart',
                                style: AppTypography.labelLarge(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                ).copyWith(fontSize: 18),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => cartNotifier.addToCart(_product, weight: _selectedWeight),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.add_rounded, color: Colors.white),
                              ),
                            ),
                          ],
                        )
                      : SizedBox(
                          width: 170,
                          child: PrimaryButton(
                            text: 'Add to Cart',
                            onPressed: () {
                              cartNotifier.addToCart(_product, weight: _selectedWeight);
                            },
                          ),
                        ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
