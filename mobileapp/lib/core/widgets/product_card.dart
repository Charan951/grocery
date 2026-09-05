import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/badges.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';

/// Product grid/rail card — matches the web storefront's card: a square
/// image tile (heart button top-right, floating ADD/qty-stepper bottom-right
/// over the image), then a green price pill + discount line, title, weight,
/// and a brand pill + rating row underneath.
class ProductCard extends ConsumerWidget {
  final ProductModel product;
  final VoidCallback onTap;
  final VoidCallback onAdd;
  final double width;
  final String? heroTag;

  /// Set false where the caller already renders its own wishlist affordance
  /// over the card (e.g. the Wishlist screen's "remove" ✕ button in the same
  /// corner) so the two don't overlap.
  final bool showWishlistButton;

  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
    required this.onAdd,
    this.width = 135.0,
    this.heroTag,
    this.showWishlistButton = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final favorited = showWishlistButton && ref.watch(wishlistProvider).contains(product.id);

    CartItemModel? cartItem;
    for (final item in ref.watch(cartProvider).items) {
      if (item.product.id == product.id) {
        cartItem = item;
        break;
      }
    }
    final qty = cartItem?.quantity ?? 0;
    final isOutOfStock = !product.inStock;
    final hasOptions = product.weightOptions.length > 1;

    final imageWidget = product.imageUrl.startsWith('http')
        ? CachedNetworkImage(
            imageUrl: product.imageUrl,
            fit: BoxFit.contain,
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
              color: product.isOrganic ? AppColors.primary : AppColors.accent,
            ),
          );

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.03) : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                      ),
                      child: heroTag != null ? Hero(tag: heroTag!, child: imageWidget) : imageWidget,
                    ),
                  ),
                  if (isOutOfStock)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: AppColors.error, borderRadius: BorderRadius.circular(20)),
                        child: Text(
                          'OUT OF STOCK',
                          style: AppTypography.labelSmall(Colors.white).copyWith(fontSize: 8, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  if (showWishlistButton)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: _CircleIconButton(
                        icon: favorited ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        color: favorited ? AppColors.error : (isDark ? Colors.white70 : AppColors.textSecondary),
                        isDark: isDark,
                        onTap: () => ref.read(wishlistProvider.notifier).toggleWishlist(product.id),
                      ),
                    ),
                  Positioned(
                    bottom: 6,
                    right: 6,
                    child: isOutOfStock
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white10 : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                            ),
                            child: Text(
                              'Sold Out',
                              style: AppTypography.labelSmall(
                                isDark ? AppColors.textSecondaryDark : AppColors.textTertiary,
                              ).copyWith(fontWeight: FontWeight.w700),
                            ),
                          )
                        : qty > 0
                            ? _QtyStepper(
                                qty: qty,
                                onIncrement: () {
                                  final ok = ref.read(cartProvider.notifier).addToCart(product);
                                  if (!ok) AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                                },
                                onDecrement: () => ref.read(cartProvider.notifier).removeFromCart(product),
                              )
                            : _AddChip(onTap: onAdd, optionsCount: hasOptions ? product.weightOptions.length : null),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Price row: green pill + strikethrough MRP.
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primaryText,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '₹${product.price.toStringAsFixed(0)}',
                    style: AppTypography.labelMedium(Colors.white).copyWith(fontWeight: FontWeight.w900, fontSize: 11),
                  ),
                ),
                if (product.hasDiscount) ...[
                  const SizedBox(width: 6),
                  Text(
                    '₹${product.mrp.toStringAsFixed(0)}',
                    style: AppTypography.bodySmall(
                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                    ).copyWith(decoration: TextDecoration.lineThrough, fontSize: 11),
                  ),
                ],
              ],
            ),
            if (product.hasDiscount)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '₹${(product.mrp - product.price).toStringAsFixed(0)} OFF',
                  style: AppTypography.labelSmall(AppColors.primaryText).copyWith(fontWeight: FontWeight.w800, fontSize: 9),
                ),
              ),
            const SizedBox(height: 3),

            // Title
            Text(
              product.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.title(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ).copyWith(fontSize: 11, height: 1.2, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 2),

            // Weight label
            Text(
              product.defaultWeight,
              style: AppTypography.bodySmall(
                isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
              ).copyWith(fontSize: 10, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 4),

            // Brand tag & rating
            Row(
              children: [
                if (product.brand.isNotEmpty)
                  Flexible(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        product.brand,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.labelSmall(AppColors.primaryText).copyWith(fontWeight: FontWeight.w700, fontSize: 9),
                      ),
                    ),
                  ),
                const Spacer(),
                RatingWidget(rating: product.rating, iconSize: 11, fontSize: 9.5),
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

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool isDark;
  final VoidCallback onTap;

  const _CircleIconButton({required this.icon, required this.color, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: (isDark ? Colors.black : Colors.white).withOpacity(0.92),
      shape: const CircleBorder(),
      elevation: 0.5,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(5),
          child: Icon(icon, size: 13, color: color),
        ),
      ),
    );
  }
}

class _AddChip extends StatelessWidget {
  final VoidCallback onTap;
  final int? optionsCount;

  const _AddChip({required this.onTap, this.optionsCount});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.error, width: 1.5),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 4, offset: const Offset(0, 1))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.add_rounded, color: AppColors.error, size: 13),
                const SizedBox(width: 2),
                Text(
                  'ADD',
                  style: AppTypography.labelSmall(AppColors.error).copyWith(fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 0.5),
                ),
              ],
            ),
            if (optionsCount != null)
              Text(
                '$optionsCount options',
                style: AppTypography.labelSmall(AppColors.error).copyWith(fontSize: 7, fontWeight: FontWeight.w500),
              ),
          ],
        ),
      ),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  final int qty;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const _QtyStepper({required this.qty, required this.onIncrement, required this.onDecrement});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primaryText,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 4, offset: const Offset(0, 1))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _stepperButton(Icons.remove_rounded, onDecrement),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              '$qty',
              style: AppTypography.labelSmall(Colors.white).copyWith(fontWeight: FontWeight.w900, fontSize: 11),
            ),
          ),
          _stepperButton(Icons.add_rounded, onIncrement),
        ],
      ),
    );
  }

  Widget _stepperButton(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 12, color: Colors.white),
      ),
    );
  }
}
