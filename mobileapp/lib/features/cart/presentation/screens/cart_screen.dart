// ignore_for_file: unnecessary_underscores

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/qty_stepper.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/cart/presentation/widgets/billing_summary.dart';
import 'package:freshcart/features/cart/presentation/widgets/checkout_bar.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cart = ref.watch(cartProvider);
    final notifier = ref.read(cartProvider.notifier);
    final auth = ref.watch(authProvider);

    final selectedAddr =
        auth.user?.selectedAddress ??
        (auth.user?.addresses.isNotEmpty == true
            ? auth.user!.addresses.first
            : null);
    final addressTitle = selectedAddr != null
        ? (selectedAddr['name'] ?? 'Home').toString()
        : 'Home';
    final addressSubtitle = selectedAddr != null
        ? (selectedAddr['addressLine'] ??
                  selectedAddr['address'] ??
                  selectedAddr['fullAddress'] ??
                  '')
              .toString()
        : 'Select delivery address';

    if (cart.items.isEmpty) {
      return AppScaffold(
        title: 'Checkout',
        body: EmptyState(
          icon: Icons.shopping_cart_outlined,
          title: 'Your cart is empty',
          description:
              "You haven't added anything yet. Let's find something fresh.",
          actionText: 'Start shopping',
          onAction: () => context.go('/'),
        ),
      );
    }

    final popularProductsAsync = ref.watch(allProductsProvider);

    return AppScaffold(
      title: 'Checkout',
      bottomNavigationBar: CheckoutBar(
        label: 'To pay',
        amount: cart.totalPayableAmount,
        cta: 'Select Payment Method',
        addressTitle: addressTitle,
        addressSubtitle: addressSubtitle,
        onChangeAddress: () => context.push('/addresses'),
        onPressed: () => context.push('/checkout'),
      ),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 28),
        children: [
          // 1. Delivery ETA Card
          _DeliveryEtaCard(itemCount: cart.totalItemsCount, isDark: isDark),
          const SizedBox(height: 12),

          // 2. Cart Items List
          for (final item in cart.items)
            _CartRow(
              key: ValueKey('${item.product.id}_${item.selectedWeight}'),
              item: item,
              isDark: isDark,
              onInc: () {
                if (!notifier.addToCart(
                  item.product,
                  weight: item.selectedWeight,
                )) {
                  AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                }
              },
              onDec: () => notifier.removeFromCart(
                item.product,
                weight: item.selectedWeight,
              ),
              onDelete: () => notifier.deleteItem(item),
              onSaveForLater: () {
                notifier.deleteItem(item);
                if (!ref.read(wishlistProvider).contains(item.product.id)) {
                  ref
                      .read(wishlistProvider.notifier)
                      .toggleWishlist(item.product.id);
                }
                AppToast.success('Moved to wishlist');
              },
            ),
          const SizedBox(height: 14),

          // 3. "You might also like" Shelf (Same Category Products)
          popularProductsAsync.when(
            data: (products) {
              final notInCart = products
                  .where((p) => !cart.items.any((ci) => ci.product.id == p.id))
                  .toList();

              final cartCategoryIds = cart.items
                  .map((i) => i.product.categoryId.toLowerCase())
                  .where((c) => c.isNotEmpty)
                  .toSet();

              final cartSubCategories = cart.items
                  .map((i) => i.product.subCategory?.toLowerCase() ?? '')
                  .where((c) => c.isNotEmpty)
                  .toSet();

              final sameSubCatProducts = <ProductModel>[];
              final sameCategoryProducts = <ProductModel>[];
              final otherProducts = <ProductModel>[];

              for (final p in notInCart) {
                final pCat = p.categoryId.toLowerCase();
                final pSub = p.subCategory?.toLowerCase() ?? '';

                final isSameSub = pSub.isNotEmpty && cartSubCategories.contains(pSub);
                final isSameCat = pCat.isNotEmpty && cartCategoryIds.contains(pCat);

                if (isSameSub && isSameCat) {
                  sameSubCatProducts.add(p);
                } else if (isSameCat) {
                  sameCategoryProducts.add(p);
                } else {
                  otherProducts.add(p);
                }
              }

              final recommendations = [
                ...sameSubCatProducts,
                ...sameCategoryProducts,
                ...otherProducts,
              ].take(10).toList();

              if (recommendations.isEmpty) return const SizedBox.shrink();
              return _YouMightAlsoLikeShelf(
                products: recommendations,
                isDark: isDark,
                onAdd: (p) {
                  notifier.addToCart(p);
                  AppToast.success('Added ${p.name}');
                },
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 16),

          // 4. Bill Details (Placed immediately after items & recommendations)
          BillingSummary(cart: cart),
          const SizedBox(height: 16),

          // 5. Coupons Section
          _CouponSection(),
          const SizedBox(height: 16),

          // 6. Cancellation Policy
          _CancellationPolicyCard(isDark: isDark),
        ],
      ),
    );
  }
}

class _DeliveryEtaCard extends StatelessWidget {
  final int itemCount;
  final bool isDark;

  const _DeliveryEtaCard({required this.itemCount, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.divider,
        ),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.timer_outlined,
              color: AppColors.primaryText,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Delivery in 8 minutes',
                style: AppTypography.title(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ).copyWith(fontWeight: FontWeight.w900, fontSize: 16),
              ),
              const SizedBox(height: 2),
              Text(
                'Shipment of $itemCount ${itemCount == 1 ? 'item' : 'items'}',
                style: AppTypography.bodySmall(
                  isDark
                      ? AppColors.textSecondaryDark
                      : AppColors.textSecondary,
                ).copyWith(fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CartRow extends StatelessWidget {
  final CartItemModel item;
  final bool isDark;
  final VoidCallback onInc;
  final VoidCallback onDec;
  final VoidCallback onDelete;
  final VoidCallback onSaveForLater;

  const _CartRow({
    super.key,
    required this.item,
    required this.isDark,
    required this.onInc,
    required this.onDec,
    required this.onDelete,
    required this.onSaveForLater,
  });

  @override
  Widget build(BuildContext context) {
    final p = item.product;
    final hasDiscount = p.mrp > p.price;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.divider,
        ),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.02),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              borderRadius: AppRadius.brMd,
              border: Border.all(
                color: isDark ? AppColors.dividerDark : AppColors.divider,
              ),
              color: isDark
                  ? Colors.black12
                  : AppColors.divider.withOpacity(0.5),
            ),
            child: ClipRRect(
              borderRadius: AppRadius.brMd,
              child: p.imageUrl.startsWith('http')
                  ? CachedNetworkImage(
                      imageUrl: p.imageUrl,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) => const Icon(
                        Icons.shopping_bag_outlined,
                        color: AppColors.textSecondary,
                      ),
                    )
                  : const Icon(
                      Icons.shopping_bag_outlined,
                      color: AppColors.textSecondary,
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.labelLarge(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ).copyWith(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  item.selectedWeight,
                  style: AppTypography.bodySmall(
                    isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textSecondary,
                  ).copyWith(fontSize: 12),
                ),
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: onSaveForLater,
                  child: Text(
                    'Move to wishlist',
                    style: AppTypography.labelSmall(AppColors.textSecondary)
                        .copyWith(
                          decoration: TextDecoration.underline,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              QtyStepper(
                quantity: item.quantity,
                onIncrement: onInc,
                onDecrement: onDec,
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (hasDiscount) ...[
                    Text(
                      '₹${p.mrp.toStringAsFixed(0)}',
                      style:
                          AppTypography.bodySmall(
                            isDark
                                ? AppColors.textSecondaryDark
                                : AppColors.textSecondary,
                          ).copyWith(
                            decoration: TextDecoration.lineThrough,
                            fontSize: 11,
                          ),
                    ),
                    const SizedBox(width: 4),
                  ],
                  Text(
                    '₹${(p.price * item.quantity).toStringAsFixed(0)}',
                    style: AppTypography.labelLarge(
                      isDark
                          ? AppColors.textPrimaryDark
                          : AppColors.textPrimary,
                    ).copyWith(fontWeight: FontWeight.w900, fontSize: 14),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _YouMightAlsoLikeShelf extends StatelessWidget {
  final List<ProductModel> products;
  final bool isDark;
  final ValueChanged<ProductModel> onAdd;

  const _YouMightAlsoLikeShelf({
    required this.products,
    required this.isDark,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.divider,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Text(
              'You might also like',
              style: AppTypography.title(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ).copyWith(fontWeight: FontWeight.w900, fontSize: 16),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              itemCount: products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, idx) {
                final p = products[idx];
                final off = p.mrp > p.price
                    ? (((p.mrp - p.price) / p.mrp) * 100).round()
                    : 0;
                return Container(
                  width: 130,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.brMd,
                    border: Border.all(
                      color: isDark ? AppColors.dividerDark : AppColors.divider,
                    ),
                    color: isDark ? Colors.black12 : AppColors.background,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: AppRadius.brSm,
                            child: SizedBox(
                              width: 114,
                              height: 80,
                              child: p.imageUrl.startsWith('http')
                                  ? CachedNetworkImage(
                                      imageUrl: p.imageUrl,
                                      fit: BoxFit.cover,
                                    )
                                  : const Icon(Icons.shopping_bag_outlined),
                            ),
                          ),
                          Positioned(
                            bottom: 4,
                            left: 4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color: AppColors.primaryText,
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                p.defaultWeight,
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 4,
                            right: 4,
                            child: SizedBox(
                              height: 26,
                              child: ElevatedButton(
                                onPressed: () => onAdd(p),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.primaryText,
                                  side: const BorderSide(
                                    color: AppColors.primaryText,
                                    width: 1.5,
                                  ),
                                  elevation: 1,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ),
                                child: const Text(
                                  'ADD',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            '₹${p.price.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              color: isDark
                                  ? AppColors.textPrimaryDark
                                  : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          if (p.mrp > p.price)
                            Text(
                              '₹${p.mrp.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                                color: AppColors.textSecondary,
                              ),
                            ),
                        ],
                      ),
                      if (off > 0)
                        Text(
                          '$off% OFF on MRP',
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.blueAccent,
                          ),
                        ),
                      const SizedBox(height: 2),
                      Text(
                        p.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimary,
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

class _CancellationPolicyCard extends StatelessWidget {
  final bool isDark;

  const _CancellationPolicyCard({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : AppColors.divider,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.shield_outlined,
              color: AppColors.primaryText,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cancellation policy',
                  style: AppTypography.labelLarge(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ).copyWith(fontWeight: FontWeight.w900, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  'Once placed, cancelling may attract a fee. If we delay or fail to deliver, you get a full refund.',
                  style: AppTypography.bodySmall(
                    isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textSecondary,
                  ).copyWith(fontSize: 11.5, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CouponSection extends ConsumerStatefulWidget {
  @override
  ConsumerState<_CouponSection> createState() => _CouponSectionState();
}

class _CouponSectionState extends ConsumerState<_CouponSection> {
  final _code = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    // New customer: apply their first-order coupon as soon as the cart qualifies.
    ref.listenManual<AsyncValue<Map<String, dynamic>>>(
      availableCouponsProvider,
      (_, next) {
        final auto = next.valueOrNull?['autoApplyCode']?.toString();
        if (auto == null || auto.isEmpty) return;
        if (ref.read(cartProvider).appliedCoupon != null) return;
        if (ref.read(autoCouponDismissedProvider)) return;
        _apply(auto, successMessage: '$auto auto-applied on your first order');
      },
      fireImmediately: true,
    );
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _remove(Map<String, dynamic> applied) {
    final auto = ref.read(availableCouponsProvider).valueOrNull?['autoApplyCode'];
    if (applied['code'] == auto) {
      ref.read(autoCouponDismissedProvider.notifier).state = true;
    }
    ref.read(cartProvider.notifier).removeCoupon();
  }

  Future<void> _apply(String code, {String? successMessage}) async {
    final c = code.trim().toUpperCase();
    if (c.isEmpty || _busy) return;
    setState(() => _busy = true);
    final cart = ref.read(cartProvider);
    try {
      final res = await ref
          .read(apiServiceProvider)
          .validateCoupon(c, cart.subtotal);
      if (res['valid'] == true) {
        ref
            .read(cartProvider.notifier)
            .applyValidatedCoupon(
              (res['code'] ?? c).toString(),
              (res['discount'] as num?)?.toDouble() ?? 0,
            );
        _code.clear();
        AppToast.success(successMessage ?? res['message']?.toString() ?? 'Coupon applied');
      } else {
        AppToast.error(
          res['message']?.toString() ?? 'This coupon is not valid',
        );
      }
    } on ApiException catch (e) {
      AppToast.error(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final applied = ref.watch(cartProvider.select((c) => c.appliedCoupon));
    final available = ref.watch(availableCouponsProvider).valueOrNull;
    final coupons = ((available?['coupons'] as List?) ?? const [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    // Closest locked first-order coupon, for the "add ₹X more" nudge.
    final nudge = applied == null
        ? coupons.where((c) =>
            c['firstOrderOnly'] == true &&
            c['eligible'] != true &&
            ((c['amountNeeded'] as num?) ?? 0) > 0).firstOrNull
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.confirmation_number_outlined,
              size: 18,
              color: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Text(
              'Coupons & Offers',
              style: AppTypography.title(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ).copyWith(fontWeight: FontWeight.w900, fontSize: 16),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (applied != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: AppRadius.brLg,
              border: Border.all(color: AppColors.primary, width: 1.5),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.local_offer_rounded,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${applied['code']} applied',
                        style: AppTypography.labelMedium(
                          AppColors.primaryText,
                        ).copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '₹${(applied['discount'] as num).toStringAsFixed(0)} coupon discount added',
                        style: AppTypography.bodySmall(AppColors.primaryText),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => _remove(applied),
                  child: Text(
                    'Remove',
                    style: AppTypography.labelMedium(
                      AppColors.error,
                    ).copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          )
        else
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppTextField(
                  controller: _code,
                  hintText: 'Enter coupon code (e.g. FRESH50)',
                  textInputAction: TextInputAction.done,
                  onSubmitted: _apply,
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 48,
                child: FilledButton(
                  onPressed: _busy ? null : () => _apply(_code.text),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: AppRadius.brLg),
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Apply',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        if (nudge != null) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.warning.withOpacity(0.12),
              borderRadius: AppRadius.brLg,
            ),
            child: Text(
              'Add ₹${nudge['amountNeeded']} more to get ₹${nudge['savings']} off your first order with ${nudge['code']}',
              style: AppTypography.labelMedium(AppColors.warningText)
                  .copyWith(fontWeight: FontWeight.bold),
            ),
          ),
        ],
        if (coupons.isNotEmpty) ...[
          const SizedBox(height: 14),
          Text(
            'AVAILABLE COUPONS',
            style: AppTypography.labelSmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ).copyWith(fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 8),
          for (final c in coupons)
            _AvailableCouponTile(
              coupon: c,
              isApplied: applied?['code'] == c['code'],
              busy: _busy,
              onApply: () => _apply(c['code'].toString()),
            ),
        ],
      ],
    );
  }
}

class _AvailableCouponTile extends ConsumerWidget {
  final Map<String, dynamic> coupon;
  final bool isApplied;
  final bool busy;
  final VoidCallback onApply;

  const _AvailableCouponTile({
    required this.coupon,
    required this.isApplied,
    required this.busy,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final eligible = coupon['eligible'] == true;
    final minOrder = (coupon['minOrder'] as num?) ?? 0;
    final needed = (coupon['amountNeeded'] as num?) ?? 0;
    final savings = (coupon['savings'] as num?) ?? 0;
    final subtotal = ref.watch(cartProvider.select((c) => c.subtotal));
    final primaryText = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final mutedText = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    final status = eligible
        ? (coupon['message']?.toString() ?? 'Save ₹$savings on this order')
        : needed > 0
            ? 'Add ₹$needed more to unlock ₹$savings off'
            : (coupon['message']?.toString() ?? '');

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: eligible
              ? AppColors.primary.withOpacity(0.5)
              : (isDark ? AppColors.dividerDark : AppColors.divider),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          coupon['code'].toString(),
                          style: AppTypography.labelLarge(
                            eligible ? primaryText : mutedText,
                          ).copyWith(fontWeight: FontWeight.w900),
                        ),
                        if (coupon['firstOrderOnly'] == true)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.deepPurple.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'FIRST ORDER',
                              style: AppTypography.labelSmall(Colors.deepPurple)
                                  .copyWith(fontWeight: FontWeight.w900, fontSize: 9),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      status,
                      style: AppTypography.bodySmall(
                        eligible ? AppColors.primaryText : mutedText,
                      ).copyWith(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      '${coupon['discount'] ?? ''}${minOrder > 0 ? ' · min order ₹$minOrder' : ''}',
                      style: AppTypography.labelSmall(mutedText),
                    ),
                  ],
                ),
              ),
              if (eligible)
                isApplied
                    ? Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          'APPLIED',
                          style: AppTypography.labelSmall(AppColors.primaryText)
                              .copyWith(fontWeight: FontWeight.w900),
                        ),
                      )
                    : TextButton(
                        onPressed: busy ? null : onApply,
                        style: TextButton.styleFrom(
                          minimumSize: const Size(48, 36),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: const Text(
                          'APPLY',
                          style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primaryText),
                        ),
                      ),
            ],
          ),
          if (!eligible && needed > 0 && minOrder > 0) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: (subtotal / minOrder).clamp(0.0, 1.0).toDouble(),
                minHeight: 4,
                backgroundColor: isDark ? AppColors.dividerDark : AppColors.divider,
                color: AppColors.warning,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
