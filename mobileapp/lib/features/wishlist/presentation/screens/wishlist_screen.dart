import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/widgets/catalog_cart_bar.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final wishlistIds = ref.watch(wishlistProvider);
    final productsAsync = ref.watch(allProductsProvider);

    return productsAsync.when(
      loading: () => const AppScaffold(title: 'Wishlist', body: SkeletonGrid(itemCount: 6, childAspectRatio: 0.62)),
      error: (e, _) => AppScaffold(
        title: 'Wishlist',
        body: ErrorState(onRetry: () => ref.invalidate(allProductsProvider)),
      ),
      data: (allProducts) {
        final saved = allProducts.where((p) => wishlistIds.contains(p.id)).toList();

        if (saved.isEmpty) {
          return AppScaffold(
            title: 'Wishlist',
            body: EmptyState(
              icon: Icons.favorite_border_rounded,
              title: 'Your wishlist is empty',
              description: 'Tap the heart on any product to save it here for later.',
              actionText: 'Start shopping',
              onAction: () => context.go('/'),
            ),
          );
        }

        return AppScaffold(
          title: 'Wishlist',
          bottomNavigationBar: const CatalogCartBar(),
          actions: [
            TextButton(
              onPressed: () {
                var added = 0;
                for (final p in saved) {
                  if (ref.read(cartProvider.notifier).addToCart(p)) added++;
                }
                AppToast.success(added == 0
                    ? 'Everything is already at its cart limit'
                    : 'Added $added ${added == 1 ? 'item' : 'items'} to cart');
              },
              child: Text('Add all', style: AppTypography.labelMedium(AppColors.primaryText)),
            ),
          ],
          body: RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => ref.invalidate(allProductsProvider),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                    child: Text(
                      '${saved.length} ${saved.length == 1 ? 'item' : 'items'} saved',
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
                      childAspectRatio: 0.62,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final p = saved[i];
                        return Stack(
                          children: [
                            ProductCard(
                              product: p,
                              heroTag: 'product_image_${p.id}',
                              width: double.infinity,
                              showWishlistButton: false,
                              onTap: () => context.push('/product/${p.id}'),
                              onAdd: () {
                                ref.read(cartProvider.notifier).addToCart(p)
                                    ? AppToast.success('${p.name} added to cart')
                                    : AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                              },
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Material(
                                color: (isDark ? Colors.black : Colors.white).withOpacity(0.9),
                                shape: const CircleBorder(),
                                child: InkWell(
                                  customBorder: const CircleBorder(),
                                  onTap: () {
                                    ref.read(wishlistProvider.notifier).toggleWishlist(p.id);
                                    AppToast.success('Removed from wishlist');
                                  },
                                  child: const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: Icon(Icons.close_rounded, size: 16, color: AppColors.error),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                      childCount: saved.length,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
