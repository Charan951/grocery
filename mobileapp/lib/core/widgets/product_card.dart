import 'package:cached_network_image/cached_network_image.dart';
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
  final String? heroTag;

  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
    required this.onAdd,
    this.width = 135.0,
    this.heroTag,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final imageWidget = product.imageUrl.startsWith('http')
        ? CachedNetworkImage(
            imageUrl: product.imageUrl,
            fit: BoxFit.cover,
            width: double.infinity,
            height: 76,
            fadeInDuration: const Duration(milliseconds: 200),
            placeholder: (context, _) => Container(
              color: isDark ? Colors.white10 : Colors.black.withOpacity(0.04),
            ),
            errorWidget: (context, _, _) => Center(
              child: Icon(
                _getProductIcon(product.imageUrl),
                size: 32,
                color: product.isOrganic ? AppColors.primary : AppColors.accent,
              ),
            ),
          )
        : Center(
            child: Icon(
              _getProductIcon(product.imageUrl),
              size: 32,
              color: product.isOrganic
                  ? AppColors.primary
                  : AppColors.accent,
            ),
          );

    return GestureDetector(
      onTap: onTap,
      child: GlassCard(
        width: width,
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Image area with discount badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 76,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withOpacity(0.03)
                        : Colors.black.withOpacity(0.02),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: heroTag != null
                        ? Hero(tag: heroTag!, child: imageWidget)
                        : imageWidget,
                  ),
                ),
                if (product.hasDiscount)
                  Positioned(
                    top: -4,
                    left: -4,
                    child: DiscountBadge(
                      text:
                          '${product.discountPercent.toStringAsFixed(0)}% OFF',
                    ),
                  ),
                if (product.isOrganic)
                  Positioned(
                    top: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Color(0xE634C759),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.eco_rounded,
                        size: 9,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 2),

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
                      isDark
                          ? AppColors.textSecondaryDark
                          : AppColors.textSecondary,
                    ).copyWith(letterSpacing: 0.5, fontSize: 8),
                  ),
                ),
                RatingWidget(rating: product.rating),
              ],
            ),
            const SizedBox(height: 2),

            // Title
            SizedBox(
              height: 26,
              child: Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.title(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ).copyWith(fontSize: 10.5, height: 1.15),
              ),
            ),
            const SizedBox(height: 2),

            // Weight label
            Text(
              product.defaultWeight,
              style: TextStyle(
                fontSize: 9,
                color: isDark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),

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
                          fontSize: 9,
                          color: isDark
                              ? AppColors.textSecondaryDark
                              : AppColors.textSecondary,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    Text(
                      '₹${product.price.toStringAsFixed(0)}',
                      style: AppTypography.h3(
                        isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimary,
                      ).copyWith(fontSize: 12, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onAdd,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0C831F),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF15803D), width: 1),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.add_rounded, color: Colors.white, size: 12),
                        SizedBox(width: 2),
                        Text(
                          'ADD',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
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
