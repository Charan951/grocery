import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final wishlistIds = ref.watch(wishlistProvider);
    final favoritedProducts = MockDataService.products
        .where((p) => wishlistIds.contains(p.id))
        .toList();

    final cartNotifier = ref.read(cartProvider.notifier);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('My Wishlist'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: favoritedProducts.isEmpty
            ? EmptyState(
                title: 'Your Wishlist is Empty',
                description: 'Explore our catalog and tap the heart icon on products you love to save them here.',
                icon: Icons.favorite_border_rounded,
                actionText: 'Shop Now',
                onAction: () {
                  // Direct to main categories tab
                  context.go('/');
                },
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20.0, 16.0, 20.0, 8.0),
                    child: Text(
                      '${favoritedProducts.length} items saved',
                      style: AppTypography.bodyMedium(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: GridView.builder(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 14,
                        childAspectRatio: 0.64,
                      ),
                      itemCount: favoritedProducts.length,
                      itemBuilder: (context, index) {
                        final prod = favoritedProducts[index];
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
