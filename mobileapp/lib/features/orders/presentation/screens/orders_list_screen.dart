import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

Color statusColor(OrderStatus s) => switch (s) {
      OrderStatus.delivered => AppColors.primary,
      OrderStatus.cancelled => AppColors.error,
      OrderStatus.dispatched => AppColors.primary,
      _ => AppColors.warning,
    };

IconData statusIcon(OrderStatus s) => switch (s) {
      OrderStatus.delivered => Icons.check_circle_rounded,
      OrderStatus.cancelled => Icons.cancel_rounded,
      OrderStatus.dispatched => Icons.delivery_dining_rounded,
      OrderStatus.processing => Icons.inventory_2_rounded,
      OrderStatus.placed => Icons.receipt_long_rounded,
    };

void reorder(WidgetRef ref, OrderModel order) {
  final cart = ref.read(cartProvider.notifier);
  var added = 0;
  for (final it in order.items) {
    for (var i = 0; i < it.quantity; i++) {
      if (cart.addToCart(it.product, weight: it.selectedWeight)) added++;
    }
  }
  AppToast.success(added == 0 ? 'Items already at cart limit' : 'Added $added items to cart');
}

class OrdersListScreen extends ConsumerWidget {
  const OrdersListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersAsync = ref.watch(ordersProvider);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Orders'),
        centerTitle: false,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
      ),
      body: ordersAsync.when(
        loading: () => const SkeletonList(itemCount: 4, itemHeight: 150),
        error: (e, _) => ErrorState(onRetry: () => ref.read(ordersProvider.notifier).refresh()),
        data: (orders) {
          if (orders.isEmpty) {
            return EmptyState(
              icon: Icons.receipt_long_rounded,
              title: 'No orders yet',
              description: 'Your orders will show up here with live tracking.',
              actionText: 'Start shopping',
              onAction: () => context.go('/'),
            );
          }
          final active = orders.where((o) => o.isActive).toList();
          final past = orders.where((o) => !o.isActive).toList();

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                if (active.isNotEmpty) ...[
                  _header('Active', isDark),
                  for (final o in active) _OrderCard(order: o, isDark: isDark),
                  const SizedBox(height: 8),
                ],
                if (past.isNotEmpty) ...[
                  _header(active.isEmpty ? 'All orders' : 'Past orders', isDark),
                  for (final o in past) _OrderCard(order: o, isDark: isDark),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _header(String t, bool isDark) => Padding(
        padding: const EdgeInsets.only(bottom: 10, top: 4),
        child: Text(t, style: AppTypography.labelMedium(
          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
        )),
      );
}

class _OrderCard extends ConsumerWidget {
  final OrderModel order;
  final bool isDark;
  const _OrderCard({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = statusColor(order.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: AppRadius.brLg,
          onTap: () => context.push('/order/${order.id}'),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(statusIcon(order.status), size: 16, color: c),
                    const SizedBox(width: 6),
                    Text(order.statusText, style: AppTypography.labelMedium(c)),
                    const Spacer(),
                    Text(
                      '${order.date.day}/${order.date.month}/${order.date.year}',
                      style: AppTypography.bodySmall(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _Thumbs(order: order, isDark: isDark),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${order.items.length} item${order.items.length == 1 ? '' : 's'} · ₹${order.total.toStringAsFixed(0)}',
                            style: AppTypography.labelLarge(
                              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            order.deliveryAddress,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.bodySmall(
                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    if (order.isActive)
                      Expanded(
                        child: FilledButton(
                          onPressed: () => context.push('/tracking/${order.id}'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                          ),
                          child: const Text('Track order'),
                        ),
                      )
                    else
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            reorder(ref, order);
                            context.push('/cart');
                          },
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                          ),
                          child: const Text('Reorder'),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => context.push('/order/${order.id}'),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                        ),
                        child: const Text('Details'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Thumbs extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  const _Thumbs({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final imgs = order.items
        .map((i) => i.product.imageUrl)
        .where((u) => u.startsWith('http'))
        .take(3)
        .toList();
    if (imgs.isEmpty) {
      return Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: isDark ? Colors.white10 : AppColors.background,
          borderRadius: AppRadius.brSm,
        ),
        child: const Icon(Icons.shopping_bag_outlined, size: 20),
      );
    }
    return SizedBox(
      width: 48 + (imgs.length - 1) * 16.0,
      height: 48,
      child: Stack(
        children: [
          for (var i = 0; i < imgs.length; i++)
            Positioned(
              left: i * 16.0,
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: AppRadius.brSm,
                  border: Border.all(color: isDark ? AppColors.surfaceDark : AppColors.surface, width: 2),
                ),
                clipBehavior: Clip.antiAlias,
                child: CachedNetworkImage(
                  imageUrl: imgs[i],
                  fit: BoxFit.cover,
                  errorWidget: (_, _, _) => const Icon(Icons.shopping_bag_outlined, size: 16),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
