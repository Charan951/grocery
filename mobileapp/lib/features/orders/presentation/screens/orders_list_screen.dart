import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/utils/invoice.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/core/widgets/tab_back_button.dart';
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

enum _OrdersTab { all, inProgress, delivered, cancelled }

extension _OrdersTabX on _OrdersTab {
  String get label => switch (this) {
        _OrdersTab.all => 'All',
        _OrdersTab.inProgress => 'In Progress',
        _OrdersTab.delivered => 'Delivered',
        _OrdersTab.cancelled => 'Cancelled',
      };

  bool matches(OrderModel o) => switch (this) {
        _OrdersTab.all => true,
        _OrdersTab.inProgress => o.isActive,
        _OrdersTab.delivered => o.status == OrderStatus.delivered,
        _OrdersTab.cancelled => o.status == OrderStatus.cancelled,
      };
}

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen> {
  _OrdersTab _tab = _OrdersTab.all;
  bool _defaultTabSet = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersAsync = ref.watch(ordersProvider);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        leading: const TabBackButton(),
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

          // Default the filter to whatever's most relevant: prefer "In
          // Progress" (something to track), else "Delivered", else "All".
          // Only applies once so it never stomps a manual filter change.
          if (!_defaultTabSet) {
            _defaultTabSet = true;
            final preferred = orders.any(_OrdersTab.inProgress.matches)
                ? _OrdersTab.inProgress
                : orders.any(_OrdersTab.delivered.matches)
                    ? _OrdersTab.delivered
                    : null;
            if (preferred != null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) setState(() => _tab = preferred);
              });
            }
          }

          final filtered = orders.where(_tab.matches).toList();

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              children: [
                _TabBar(
                  current: _tab,
                  isDark: isDark,
                  onSelect: (t) => setState(() => _tab = t),
                ),
                const SizedBox(height: 14),
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 48),
                    child: Center(
                      child: Text('No ${_tab.label.toLowerCase()} orders',
                          style: AppTypography.bodyMedium(
                            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          )),
                    ),
                  )
                else
                  for (final o in filtered) _OrderCard(order: o, isDark: isDark),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// A single filter control (not a row of tabs) — matches the web orders page.
/// Defaults to "All", with the three real status filters plus a reset to All.
class _TabBar extends StatelessWidget {
  final _OrdersTab current;
  final bool isDark;
  final ValueChanged<_OrdersTab> onSelect;
  const _TabBar({required this.current, required this.isDark, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final fg = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    return Align(
      alignment: Alignment.centerRight,
      child: PopupMenuButton<_OrdersTab>(
        initialValue: current,
        onSelected: onSelect,
        offset: const Offset(0, 44),
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.brMd, side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
        itemBuilder: (context) => [
          for (final t in _OrdersTab.values.where((t) => t != _OrdersTab.all))
            PopupMenuItem(
              value: t,
              child: Text(
                t.label,
                style: AppTypography.labelMedium(t == current ? AppColors.primary : fg),
              ),
            ),
          const PopupMenuDivider(height: 9),
          PopupMenuItem(
            value: _OrdersTab.all,
            child: Text(
              'All Orders',
              style: AppTypography.labelMedium(current == _OrdersTab.all ? AppColors.primary : fg),
            ),
          ),
        ],
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surface,
            borderRadius: AppRadius.brPill,
            border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.tune_rounded, size: 15, color: fg),
              const SizedBox(width: 7),
              Text(current == _OrdersTab.all ? 'All Orders' : current.label, style: AppTypography.labelMedium(fg)),
              const SizedBox(width: 4),
              Icon(Icons.keyboard_arrow_down_rounded, size: 17, color: fg),
            ],
          ),
        ),
      ),
    );
  }
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
                    if (order.isActive) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.12),
                          borderRadius: AppRadius.brPill,
                          border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.bolt_rounded, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Text(
                              order.statusText.isEmpty ? 'In Progress' : order.statusText,
                              style: AppTypography.labelSmall(AppColors.primaryText).copyWith(fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Icon(statusIcon(order.status), size: 16, color: c),
                      const SizedBox(width: 6),
                      Text(order.statusText, style: AppTypography.labelMedium(c)),
                    ],
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
                    _OrderInvoiceButton(order: order),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () => context.push('/order/${order.id}'),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                      ),
                      child: const Text('Details'),
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

class _OrderInvoiceButton extends StatefulWidget {
  final OrderModel order;
  const _OrderInvoiceButton({required this.order});

  @override
  State<_OrderInvoiceButton> createState() => _OrderInvoiceButtonState();
}

class _OrderInvoiceButtonState extends State<_OrderInvoiceButton> {
  bool _busy = false;

  Future<void> _download() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await downloadInvoice(widget.order);
    } catch (_) {
      if (mounted) AppToast.error('Could not generate invoice. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: _busy ? null : _download,
      icon: _busy
          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(Icons.download_rounded, size: 15),
      label: const Text('Invoice'),
      style: OutlinedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
        padding: const EdgeInsets.symmetric(horizontal: 10),
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
    final validItems = order.items
        .where((i) => i.product.imageUrl.startsWith('http'))
        .take(3)
        .toList();
    if (validItems.isEmpty) {
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
      width: 48 + (validItems.length - 1) * 16.0,
      height: 48,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < validItems.length; i++)
            Positioned(
              left: i * 16.0,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      borderRadius: AppRadius.brSm,
                      border: Border.all(color: isDark ? AppColors.surfaceDark : AppColors.surface, width: 2),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: CachedNetworkImage(
                      imageUrl: validItems[i].product.imageUrl,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) => const Icon(Icons.shopping_bag_outlined, size: 16),
                    ),
                  ),
                  if (validItems[i].quantity > 1)
                    Positioned(
                      top: -3,
                      right: -3,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.black87 : const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'x${validItems[i].quantity}',
                          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
