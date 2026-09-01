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
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/cart/presentation/widgets/billing_summary.dart';
import 'package:freshcart/features/cart/presentation/widgets/checkout_bar.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cart = ref.watch(cartProvider);
    final notifier = ref.read(cartProvider.notifier);

    if (cart.items.isEmpty) {
      return AppScaffold(
        title: 'Cart',
        body: EmptyState(
          icon: Icons.shopping_cart_outlined,
          title: 'Your cart is empty',
          description: "You haven't added anything yet. Let's find something fresh.",
          actionText: 'Start shopping',
          onAction: () => context.go('/'),
        ),
      );
    }

    return AppScaffold(
      title: 'Cart',
      actions: [
        TextButton(
          onPressed: () async {
            final ok = await AppModal.confirm(
              context,
              title: 'Clear cart?',
              message: 'This removes all ${cart.totalItemsCount} items from your cart.',
              confirmLabel: 'Clear',
              destructive: true,
            );
            if (ok) {
              notifier.clearCart();
              AppToast.info('Cart cleared');
            }
          },
          child: Text('Clear', style: AppTypography.labelMedium(AppColors.error)),
        ),
      ],
      bottomNavigationBar: CheckoutBar(
        label: 'To pay',
        amount: cart.totalPayableAmount,
        cta: 'Checkout',
        onPressed: () => context.push('/checkout'),
      ),
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          for (final item in cart.items)
            _CartRow(
              key: ValueKey('${item.product.id}_${item.selectedWeight}'),
              item: item,
              isDark: isDark,
              onInc: () {
                if (!notifier.addToCart(item.product, weight: item.selectedWeight)) {
                  AppToast.info('You can add up to $kMaxQtyPerItem of an item');
                }
              },
              onDec: () => notifier.removeFromCart(item.product, weight: item.selectedWeight),
              onDelete: () => notifier.deleteItem(item),
            ),
          const SizedBox(height: 12),
          _DeliverySlot(
            selected: cart.selectedDeliverySlot,
            onSelect: notifier.setDeliverySlot,
            isDark: isDark,
          ),
          const SizedBox(height: 20),
          _CouponSection(),
          const SizedBox(height: 20),
          Text('Bill details', style: AppTypography.title(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          )),
          const SizedBox(height: 10),
          BillingSummary(cart: cart),
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

  const _CartRow({
    super.key,
    required this.item,
    required this.isDark,
    required this.onInc,
    required this.onDec,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final p = item.product;
    return Dismissible(
      key: ValueKey('dismiss_${p.id}_${item.selectedWeight}'),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete(),
      background: Container(
        alignment: Alignment.centerRight,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(color: AppColors.error, borderRadius: AppRadius.brMd),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: AppRadius.brSm,
              child: SizedBox(
                width: 56,
                height: 56,
                child: p.imageUrl.startsWith('http')
                    ? CachedNetworkImage(
                        imageUrl: p.imageUrl,
                        fit: BoxFit.cover,
                        errorWidget: (_, _, _) => const Icon(Icons.shopping_bag_outlined),
                      )
                    : const Icon(Icons.shopping_bag_outlined),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: AppTypography.labelLarge(
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      )),
                  const SizedBox(height: 2),
                  Text('${item.selectedWeight} · ₹${p.price.toStringAsFixed(0)}',
                      style: AppTypography.bodySmall(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      )),
                ],
              ),
            ),
            QtyStepper(quantity: item.quantity, onIncrement: onInc, onDecrement: onDec),
          ],
        ),
      ),
    );
  }
}


class _DeliverySlot extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelect;
  final bool isDark;
  const _DeliverySlot({required this.selected, required this.onSelect, required this.isDark});

  static const _slots = [
    ('Instant (10-15 mins)', 'From the nearest store'),
    ('Evening (5 PM - 7 PM)', 'Scheduled for today'),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Delivery speed', style: AppTypography.title(
          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
        )),
        const SizedBox(height: 10),
        for (final (title, sub) in _slots)
          GestureDetector(
            onTap: () => onSelect(title),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: selected == title
                    ? AppColors.primary.withOpacity(0.08)
                    : (isDark ? AppColors.surfaceDark : AppColors.surface),
                borderRadius: AppRadius.brMd,
                border: Border.all(
                  color: selected == title
                      ? AppColors.primary
                      : (isDark ? AppColors.dividerDark : AppColors.divider),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    selected == title ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                    color: selected == title ? AppColors.primary : AppColors.textSecondary,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: AppTypography.labelLarge(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        )),
                        Text(sub, style: AppTypography.bodySmall(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
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
      final res = await ref.read(apiServiceProvider).validateCoupon(c, cart.subtotal);
      if (res['valid'] == true) {
        ref.read(cartProvider.notifier).applyValidatedCoupon(
              (res['code'] ?? c).toString(),
              (res['discount'] as num?)?.toDouble() ?? 0,
            );
        _code.clear();
        AppToast.success(res['message']?.toString() ?? 'Coupon applied');
      } else {
        AppToast.error(res['message']?.toString() ?? 'This coupon is not valid');
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
    final couponsAsync = ref.watch(couponsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Coupons', style: AppTypography.title(
          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
        )),
        const SizedBox(height: 10),
        if (applied != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: AppRadius.brMd,
              border: Border.all(color: AppColors.primary),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_offer_rounded, size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('${applied['code']} applied · ₹${(applied['discount'] as num).toStringAsFixed(0)} off',
                      style: AppTypography.labelMedium(AppColors.primaryText)),
                ),
                GestureDetector(
                  onTap: () => ref.read(cartProvider.notifier).removeCoupon(),
                  child: Text('Remove', style: AppTypography.labelMedium(AppColors.error)),
                ),
              ],
            ),
          )
        else ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppTextField(
                  controller: _code,
                  hintText: 'Enter coupon code',
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
                    shape: RoundedRectangleBorder(borderRadius: AppRadius.brMd),
                  ),
                  child: _busy
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Apply'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          couponsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, _) => const SizedBox.shrink(),
            data: (coupons) => Column(
              children: [
                for (final c in coupons.take(4))
                  GestureDetector(
                    onTap: () => _apply((c['code'] ?? '').toString()),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surface,
                        borderRadius: AppRadius.brMd,
                        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text((c['code'] ?? '').toString(), style: AppTypography.labelMedium(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                )),
                                if ((c['description'] ?? '').toString().isNotEmpty)
                                  Text(c['description'].toString(), style: AppTypography.bodySmall(
                                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                  )),
                              ],
                            ),
                          ),
                          Text('Apply', style: AppTypography.labelMedium(AppColors.primaryText)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
