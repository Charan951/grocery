import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_icon_button.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/qty_stepper.dart';
import 'package:freshcart/core/widgets/badges.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/floating_cart.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/home/presentation/widgets/product_rail.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import 'package:freshcart/features/products/presentation/widgets/product_reviews_section.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';

class ProductDetailsScreen extends ConsumerWidget {
  final String productId;
  const ProductDetailsScreen({super.key, required this.productId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.backgroundDark : AppColors.background;
    final productAsync = ref.watch(productDetailProvider(productId));

    return productAsync.when(
      loading: () => Scaffold(
        backgroundColor: bg,
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: const _PdpSkeleton(),
      ),
      error: (e, _) => Scaffold(
        backgroundColor: bg,
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: ErrorState(onRetry: () => ref.invalidate(productDetailProvider(productId))),
      ),
      data: (product) => _ProductDetailsView(product: product),
    );
  }
}

class _ProductDetailsView extends ConsumerStatefulWidget {
  final ProductModel product;
  const _ProductDetailsView({required this.product});

  @override
  ConsumerState<_ProductDetailsView> createState() => _ProductDetailsViewState();
}

class _ProductDetailsViewState extends ConsumerState<_ProductDetailsView> {
  ProductModel get _p => widget.product;
  late String _weight = _p.defaultWeight;

  void _share() {
    // No public deep-link domain yet — share a descriptive line + the web URL.
    final url = 'https://www.freshcart.com/product/${_p.id}';
    Share.share(
      '${_p.name} — ₹${_p.price.toStringAsFixed(0)} on FreshCart\n$url',
      subject: _p.name,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final isFav = ref.watch(wishlistProvider).contains(_p.id);
    final similar = ref.watch(similarProductsProvider(_p)).valueOrNull ?? const <ProductModel>[];

    final line = cart.items.where((i) => i.product.id == _p.id && i.selectedWeight == _weight);
    final qty = line.isEmpty ? 0 : line.first.quantity;

    final gallery = _p.gallery.isNotEmpty ? _p.gallery : <String>[_p.imageUrl];
    final lowStock = _p.stockQuantity > 0 && _p.stockQuantity <= 5;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: Stack(
        children: [
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverAppBar(
                expandedHeight: 300,
                pinned: true,
                backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
                surfaceTintColor: Colors.transparent,
                leading: _RoundBtn(
                  icon: Icons.arrow_back_rounded,
                  tooltip: 'Back',
                  onTap: () => context.pop(),
                ),
                actions: [
                  _RoundBtn(
                    icon: isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    tooltip: isFav ? 'Remove from wishlist' : 'Add to wishlist',
                    color: isFav ? AppColors.error : null,
                    onTap: () {
                      ref.read(wishlistProvider.notifier).toggleWishlist(_p.id);
                      AppToast.success(isFav ? 'Removed from wishlist' : 'Added to wishlist');
                    },
                  ),
                  _RoundBtn(icon: Icons.ios_share_rounded, tooltip: 'Share', onTap: _share),
                  const SizedBox(width: 4),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: _Gallery(urls: gallery, heroId: _p.id),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (_p.isOrganic) ...[
                            _Pill(icon: Icons.eco_rounded, label: 'Organic', color: AppColors.primary),
                            const SizedBox(width: 8),
                          ],
                          const DeliveryBadge(durationText: 'Express delivery'),
                          const Spacer(),
                          if (lowStock)
                            Text('Only ${_p.stockQuantity} left',
                                style: AppTypography.labelSmall(AppColors.warningText)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(_p.brand.toUpperCase(),
                          style: AppTypography.labelMedium(subColor).copyWith(letterSpacing: 1)),
                      const SizedBox(height: 4),
                      Text(_p.name, style: AppTypography.h1(textColor)),
                      const SizedBox(height: 8),
                      RatingWidget(rating: _p.rating, reviewsCount: _p.reviewsCount, iconSize: 16, fontSize: 13),
                      const SizedBox(height: 16),

                      // Price
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('₹${_p.price.toStringAsFixed(0)}', style: AppTypography.h1(textColor)),
                          const SizedBox(width: 8),
                          if (_p.hasDiscount) ...[
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text('₹${_p.mrp.toStringAsFixed(0)}',
                                  style: AppTypography.bodyMedium(subColor)
                                      .copyWith(decoration: TextDecoration.lineThrough)),
                            ),
                            const SizedBox(width: 8),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text('${_p.discountPercent.toStringAsFixed(0)}% OFF',
                                  style: AppTypography.labelMedium(AppColors.primaryText)),
                            ),
                          ],
                        ],
                      ),
                      Text('Inclusive of all taxes', style: AppTypography.labelSmall(subColor).copyWith(fontWeight: FontWeight.w400)),
                      const SizedBox(height: 20),

                      if (_p.weightOptions.length > 1) ...[
                        Text('Select size', style: AppTypography.title(textColor)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: _p.weightOptions.map((w) {
                            final sel = _weight == w;
                            return GestureDetector(
                              onTap: () => setState(() => _weight = w),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                decoration: BoxDecoration(
                                  color: sel ? AppColors.primary.withOpacity(0.1) : (isDark ? Colors.white10 : AppColors.surface),
                                  borderRadius: AppRadius.brMd,
                                  border: Border.all(
                                    color: sel ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.divider),
                                    width: sel ? 1.5 : 1,
                                  ),
                                ),
                                child: Text(w, style: AppTypography.labelLarge(
                                  sel ? AppColors.primary : textColor,
                                )),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 24),
                      ],

                      if (_p.description.trim().isNotEmpty) ...[
                        Text('About this item', style: AppTypography.title(textColor)),
                        const SizedBox(height: 6),
                        Text(_p.description, style: AppTypography.bodyMedium(subColor).copyWith(height: 1.5)),
                        const SizedBox(height: 24),
                      ],

                      // Key info
                      GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            _InfoRow('Unit', _p.defaultWeight, isDark),
                            if (_p.subCategory != null) _InfoRow('Type', _p.subCategory!, isDark),
                            _InfoRow('Organic', _p.isOrganic ? 'Yes' : 'No', isDark),
                            _InfoRow('In stock', _p.inStock ? 'Yes' : 'No', isDark, last: _p.nutritionFacts.isEmpty),
                            if (_p.nutritionFacts.isNotEmpty)
                              for (final e in _p.nutritionFacts.entries)
                                _InfoRow(e.key, e.value, isDark, last: e.key == _p.nutritionFacts.entries.last.key),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      ProductReviewsSection(productId: _p.id, isDark: isDark),
                      const SizedBox(height: 24),

                      _TrustBlock(isDark: isDark),

                      if (similar.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: ProductRail(
                            title: 'You might also like',
                            products: similar,
                            onOpen: (p) => context.push('/product/${p.id}'),
                            onAdd: (p) {
                              ref.read(cartProvider.notifier).addToCart(p)
                                  ? AppToast.success('${p.name} added to cart')
                                  : AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Floating View Cart button floating right above the bottom sticky bar
          if (cart.totalItemsCount > 0)
            Positioned(
              left: 0,
              right: 0,
              bottom: 12,
              child: FloatingCart(onTap: () => context.push('/cart')),
            ),
        ],
      ),
      bottomNavigationBar: _StickyBar(
        isDark: isDark,
        price: _p.price,
        qty: qty,
        inStock: _p.inStock,
        onAdd: () {
          final ok = cartNotifier.addToCart(_p, weight: _weight);
          ok ? AppToast.success('${_p.name} added to cart')
             : AppToast.info('You can add up to $kMaxQtyPerItem of an item');
        },
        onInc: () {
          final ok = cartNotifier.addToCart(_p, weight: _weight);
          if (!ok) AppToast.info('You can add up to $kMaxQtyPerItem of an item');
        },
        onDec: () => cartNotifier.removeFromCart(_p, weight: _weight),
      ),
    );
  }
}

class _Gallery extends StatefulWidget {
  final List<String> urls;
  final String heroId;
  const _Gallery({required this.urls, required this.heroId});

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  final _c = PageController();
  int _i = 0;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ColoredBox(
      color: isDark ? AppColors.surfaceDark : AppColors.surface,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          PageView.builder(
            controller: _c,
            onPageChanged: (v) => setState(() => _i = v),
            itemCount: widget.urls.length,
            itemBuilder: (context, i) {
              final img = widget.urls[i].startsWith('http')
                  ? CachedNetworkImage(
                      imageUrl: widget.urls[i],
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      errorWidget: (_, _, _) =>
                          const Icon(Icons.image_not_supported_outlined, size: 80),
                    )
                  : const Center(
                      child: Icon(Icons.shopping_bag_rounded, size: 120, color: AppColors.accent),
                    );
              return i == 0 ? Hero(tag: 'product_image_${widget.heroId}', child: img) : img;
            },
          ),
          if (widget.urls.length > 1)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(widget.urls.length, (i) {
                  final active = i == _i;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: active ? 16 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary : Colors.black26,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
            ),
        ],
      ),
    );
  }
}

class _RoundBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final String tooltip;
  final Color? color;
  const _RoundBtn({required this.icon, required this.onTap, required this.tooltip, this.color});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
      child: AppIconButton(
        icon: icon,
        tooltip: tooltip,
        onPressed: onTap,
        diameter: 44,
        background: (isDark ? Colors.black : Colors.white).withOpacity(0.85),
        color: color,
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _Pill({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(label, style: AppTypography.labelSmall(color)),
      ]),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String k;
  final String v;
  final bool isDark;
  final bool last;
  const _InfoRow(this.k, this.v, this.isDark, {this.last = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: last ? 0 : 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: AppTypography.bodyMedium(
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
          )),
          Text(v, style: AppTypography.labelMedium(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          )),
        ],
      ),
    );
  }
}

class _TrustBlock extends StatelessWidget {
  final bool isDark;
  const _TrustBlock({required this.isDark});

  @override
  Widget build(BuildContext context) {
    const rows = [
      (Icons.schedule_rounded, 'Round-the-clock delivery, in minutes'),
      (Icons.sell_outlined, 'Best prices and offers, every day'),
      (Icons.inventory_2_outlined, 'Wide assortment, always in stock'),
    ];
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Why shop from FreshCart', style: AppTypography.title(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          )),
          const SizedBox(height: 12),
          for (final (icon, label) in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                Icon(icon, size: 18, color: AppColors.primary),
                const SizedBox(width: 10),
                Expanded(child: Text(label, style: AppTypography.bodySmall(
                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                ))),
              ]),
            ),
        ],
      ),
    );
  }
}

class _StickyBar extends StatelessWidget {
  final bool isDark;
  final double price;
  final int qty;
  final bool inStock;
  final VoidCallback onAdd;
  final VoidCallback onInc;
  final VoidCallback onDec;

  const _StickyBar({
    required this.isDark,
    required this.price,
    required this.qty,
    required this.inStock,
    required this.onAdd,
    required this.onInc,
    required this.onDec,
  });

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Total', style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  )),
                  Text('₹${(price * (qty > 0 ? qty : 1)).toStringAsFixed(0)}',
                      style: AppTypography.h2(textColor)),
                ],
              ),
              const Spacer(),
              if (!inStock)
                SizedBox(
                  width: 180,
                  height: 48,
                  child: PrimaryButton(text: 'Out of stock', onPressed: null),
                )
              else if (qty == 0)
                SizedBox(
                  width: 180,
                  height: 48,
                  child: PrimaryButton(text: 'Add to cart', onPressed: onAdd),
                )
              else
                SizedBox(
                  height: 48,
                  child: QtyStepper(quantity: qty, onIncrement: onInc, onDecrement: onDec, large: true),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PdpSkeleton extends StatelessWidget {
  const _PdpSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonGroup(
      child: ListView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: const [
          SkeletonBox(height: 240, borderRadius: AppRadius.brLg),
          SizedBox(height: 20),
          SkeletonLine(widthFactor: 0.3),
          SizedBox(height: 10),
          SkeletonLine(widthFactor: 0.8, height: 22),
          SizedBox(height: 12),
          SkeletonLine(widthFactor: 0.4),
          SizedBox(height: 24),
          SkeletonLine(widthFactor: 0.5, height: 18),
          SizedBox(height: 12),
          SkeletonLine(widthFactor: 1),
          SizedBox(height: 6),
          SkeletonLine(widthFactor: 0.9),
          SizedBox(height: 6),
          SkeletonLine(widthFactor: 0.6),
        ],
      ),
    );
  }
}
