// ignore_for_file: unnecessary_underscores

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
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
      actions: [
        IconButton(
          icon: const Icon(Icons.search_rounded),
          onPressed: () => context.push('/search'),
        ),
        TextButton(
          onPressed: () async {
            final ok = await AppModal.confirm(
              context,
              title: 'Clear cart?',
              message:
                  'This removes all ${cart.totalItemsCount} items from your cart.',
              confirmLabel: 'Clear',
              destructive: true,
            );
            if (ok) {
              notifier.clearCart();
              AppToast.info('Cart cleared');
            }
          },
          child: Text(
            'Clear',
            style: AppTypography.labelMedium(AppColors.error),
          ),
        ),
      ],
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

          // 3. "You might also like" Shelf
          popularProductsAsync.when(
            data: (products) {
              final recommendations = products
                  .where((p) => !cart.items.any((ci) => ci.product.id == p.id))
                  .take(6)
                  .toList();
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

          // 6. Delivery Instructions (No donations per user request)
          _DeliveryInstructionsSection(
            selected: cart.selectedInstructions,
            onToggle: notifier.toggleInstruction,
            isDark: isDark,
          ),
          const SizedBox(height: 16),

          // 7. Delivery Partner Tip
          _DeliveryPartnerTipSection(
            selectedTip: cart.tipAmount,
            onSelectTip: notifier.setTipAmount,
            isDark: isDark,
          ),
          const SizedBox(height: 16),

          // 8. Gift Packaging (Default ₹30 fee added to total when selected)
          _GiftPackagingSection(
            isSelected: cart.hasGiftPackaging,
            fee: cart.giftPackagingFee,
            onToggle: notifier.toggleGiftPackaging,
            isDark: isDark,
          ),
          const SizedBox(height: 16),

          // 9. Cancellation Policy
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

class _DeliveryInstructionsSection extends StatelessWidget {
  final Set<String> selected;
  final ValueChanged<String> onToggle;
  final bool isDark;

  const _DeliveryInstructionsSection({
    required this.selected,
    required this.onToggle,
    required this.isDark,
  });

  static const _instructions = [
    ('Record', 'Press here and hold', Icons.mic_none_rounded),
    ('Avoid calling', 'Keep phone free', Icons.phone_disabled_outlined),
    (
      'Don\'t ring the bell',
      'Silent delivery',
      Icons.notifications_off_outlined,
    ),
    ('Leave at door', 'Drop outside', Icons.door_front_door_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Delivery instructions',
          style: AppTypography.title(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ).copyWith(fontWeight: FontWeight.w900, fontSize: 16),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 95,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _instructions.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, idx) {
              final (title, subtitle, icon) = _instructions[idx];
              final isSelected = selected.contains(title);
              return GestureDetector(
                onTap: () => onToggle(title),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 125,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withOpacity(0.08)
                        : (isDark ? AppColors.surfaceDark : AppColors.surface),
                    borderRadius: AppRadius.brLg,
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark
                                ? AppColors.dividerDark
                                : AppColors.divider),
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(
                            icon,
                            size: 20,
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                          Icon(
                            isSelected
                                ? Icons.check_box_rounded
                                : Icons.check_box_outline_blank_rounded,
                            size: 18,
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style:
                                AppTypography.labelSmall(
                                  isDark
                                      ? AppColors.textPrimaryDark
                                      : AppColors.textPrimary,
                                ).copyWith(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                          ),
                          Text(
                            subtitle,
                            style: AppTypography.bodySmall(
                              isDark
                                  ? AppColors.textSecondaryDark
                                  : AppColors.textSecondary,
                            ).copyWith(fontSize: 9),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _DeliveryPartnerTipSection extends StatelessWidget {
  final int selectedTip;
  final ValueChanged<int> onSelectTip;
  final bool isDark;

  const _DeliveryPartnerTipSection({
    required this.selectedTip,
    required this.onSelectTip,
    required this.isDark,
  });

  static const _tips = [(20, '😄'), (30, '🤩'), (50, '😍')];

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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tip your delivery partner',
                      style: AppTypography.title(
                        isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimary,
                      ).copyWith(fontWeight: FontWeight.w900, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your kindness means a lot! 100% of your tip will go directly to your delivery partner.',
                      style: AppTypography.bodySmall(
                        isDark
                            ? AppColors.textSecondaryDark
                            : AppColors.textSecondary,
                      ).copyWith(fontSize: 11, height: 1.3),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.two_wheeler_rounded,
                  color: Colors.amber,
                  size: 24,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (final (amt, emoji) in _tips)
                Expanded(
                  child: GestureDetector(
                    onTap: () => onSelectTip(amt),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: selectedTip == amt
                            ? AppColors.primary.withOpacity(0.1)
                            : (isDark ? Colors.white10 : AppColors.background),
                        borderRadius: AppRadius.brMd,
                        border: Border.all(
                          color: selectedTip == amt
                              ? AppColors.primary
                              : (isDark
                                    ? AppColors.dividerDark
                                    : AppColors.divider),
                          width: selectedTip == amt ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(emoji, style: const TextStyle(fontSize: 14)),
                          const SizedBox(width: 4),
                          Text(
                            '₹$amt',
                            style:
                                AppTypography.labelMedium(
                                  selectedTip == amt
                                      ? AppColors.primaryText
                                      : (isDark
                                            ? AppColors.textPrimaryDark
                                            : AppColors.textPrimary),
                                ).copyWith(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GiftPackagingSection extends StatelessWidget {
  final bool isSelected;
  final double fee;
  final VoidCallback onToggle;
  final bool isDark;

  const _GiftPackagingSection({
    required this.isSelected,
    required this.fee,
    required this.onToggle,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(
          color: isSelected
              ? AppColors.primary
              : (isDark ? AppColors.dividerDark : AppColors.divider),
          width: isSelected ? 1.5 : 1.0,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.purple.withOpacity(0.1),
              borderRadius: AppRadius.brMd,
            ),
            child: const Icon(
              Icons.card_giftcard_rounded,
              color: Colors.purple,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Gift Packaging',
                  style: AppTypography.labelLarge(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ).copyWith(fontWeight: FontWeight.w900, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  'Get your items in a special gift bag for just ₹${fee.toStringAsFixed(0)}',
                  style: AppTypography.bodySmall(
                    isDark
                        ? AppColors.textSecondaryDark
                        : AppColors.textSecondary,
                  ).copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: onToggle,
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                color: isSelected ? AppColors.primary : AppColors.primaryText,
                width: 1.5,
              ),
              backgroundColor: isSelected
                  ? AppColors.primary.withOpacity(0.1)
                  : Colors.transparent,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              isSelected ? 'Added' : 'Select',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: isSelected ? AppColors.primary : AppColors.primaryText,
                fontSize: 12,
              ),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Cancellation Policy',
            style: AppTypography.labelLarge(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ).copyWith(fontWeight: FontWeight.w900, fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(
            'Once order placed, any cancellation may result in a fee. In case of unexpected delays leading to order cancellation, a complete refund will be provided.',
            style: AppTypography.bodySmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ).copyWith(fontSize: 11, height: 1.3),
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
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _apply(String code) async {
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
        AppToast.success(res['message']?.toString() ?? 'Coupon applied');
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
                  onPressed: () =>
                      ref.read(cartProvider.notifier).removeCoupon(),
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
      ],
    );
  }
}
