import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/badges.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class ProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback onTap;
  final VoidCallback onAdd;
  final double width;

  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
    required this.onAdd,
    this.width = 165.0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: GlassCard(
        width: width,
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Image area with discount badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 100,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.03) : Colors.black.withOpacity(0.02),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Hero(
                      tag: 'product_image_${product.id}',
                      child: product.imageUrl.startsWith('http')
                          ? Image.network(
                              product.imageUrl,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              height: 100,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return const Center(
                                  child: SizedBox(
                                    width: 20,
                                    height: 20,
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
                                    _getProductIcon(product.imageUrl),
                                    size: 40,
                                    color: product.isOrganic ? AppColors.primary : AppColors.accent,
                                  ),
                                );
                              },
                            )
                          : Center(
                              child: Icon(
                                _getProductIcon(product.imageUrl),
                                size: 48,
                                color: product.isOrganic ? AppColors.primary : AppColors.accent,
                              ),
                            ),
                    ),
                  ),
                ),
                if (product.hasDiscount)
                  Positioned(
                    top: -6,
                    left: -6,
                    child: DiscountBadge(
                      text: '${product.discountPercent.toStringAsFixed(0)}% OFF',
                    ),
                  ),
                if (product.isOrganic)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Color(0xE634C759),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.eco_rounded,
                        size: 10,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),

            // Brand & Rating
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    product.brand.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.labelSmall(
                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                    ).copyWith(letterSpacing: 0.6, fontSize: 9),
                  ),
                ),
                RatingWidget(rating: product.rating),
              ],
            ),
            const SizedBox(height: 2),

            // Title
            SizedBox(
              height: 34,
              child: Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.title(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ).copyWith(fontSize: 12, height: 1.2),
              ),
            ),
            const SizedBox(height: 2),

            // Weight label
            Text(
              product.defaultWeight,
              style: TextStyle(
                fontSize: 10,
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),

            // Pricing & Add Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (product.hasDiscount)
                      Text(
                        '₹${product.mrp.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 10,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    Text(
                      '₹${product.price.toStringAsFixed(0)}',
                      style: AppTypography.h3(
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ).copyWith(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: onAdd,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.add_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
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
      case 'cookie':
        return Icons.cookie_rounded;
      case 'wallet':
        return Icons.wallet_rounded;
      default:
        return Icons.shopping_bag_rounded;
    }
  }
}
