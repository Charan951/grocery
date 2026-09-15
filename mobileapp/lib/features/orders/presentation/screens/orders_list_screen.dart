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
import 'package:freshcart/core/widgets/tab_back_button.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

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

/// "Order delivered" (Blinkit-style) card: status icon + title, price +
/// chevron, "Placed at …" line, item thumbnails, and (delivered orders
/// only) a full-width "Order Again" footer link.
class _OrderCard extends ConsumerWidget {
  final OrderModel order;
  final bool isDark;
  const _OrderCard({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDelivered = order.status == OrderStatus.delivered;
    final title = order.isActive
        ? 'Order ${(order.statusText.isEmpty ? 'in progress' : order.statusText).toLowerCase()}'
        : isDelivered
            ? 'Order delivered'
            : 'Order cancelled';
    final badgeColor = order.isActive ? AppColors.warning : (isDelivered ? AppColors.primary : AppColors.error);
    final badgeIcon = order.isActive ? Icons.bolt_rounded : (isDelivered ? Icons.check_rounded : Icons.close_rounded);
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    // Fixed +5:30 offset (IST has no DST) so the placed-at time is always
    // shown in IST, regardless of the viewer's device timezone.
    final ist = order.date.toUtc().add(const Duration(hours: 5, minutes: 30));
    final placedAt = '${_ordinal(ist.day)} ${_month(ist.month)} ${ist.year}, '
        '${_hour12(ist.hour).toString().padLeft(2, '0')}:${ist.minute.toString().padLeft(2, '0')} ${ist.hour >= 12 ? 'pm' : 'am'}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/order/${order.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.labelLarge(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  ).copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(color: badgeColor, shape: BoxShape.circle),
                                child: Icon(badgeIcon, size: 13, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '₹${order.total.toStringAsFixed(0)}',
                          style: AppTypography.labelLarge(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ).copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.chevron_right_rounded, size: 18, color: subColor),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Placed at $placedAt', style: AppTypography.bodySmall(subColor)),
                    const SizedBox(height: 12),
                    _Thumbs(order: order, isDark: isDark),
                  ],
                ),
              ),
              if (isDelivered)
                InkWell(
                  onTap: () {
                    reorder(ref, order);
                    context.push('/cart');
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
                    ),
                    child: const Center(
                      child: Text(
                        'Order Again',
                        style: TextStyle(color: Color(0xFFEF4B6B), fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

String _month(int m) => const [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ][m - 1];

int _hour12(int h) => h % 12 == 0 ? 12 : h % 12;

String _ordinal(int n) {
  if (n % 10 == 1 && n % 100 != 11) return '${n}st';
  if (n % 10 == 2 && n % 100 != 12) return '${n}nd';
  if (n % 10 == 3 && n % 100 != 13) return '${n}rd';
  return '${n}th';
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
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: isDark ? Colors.white10 : AppColors.background,
          borderRadius: AppRadius.brMd,
        ),
        child: const Icon(Icons.shopping_bag_outlined, size: 22),
      );
    }
    return Row(
      children: [
        for (var i = 0; i < validItems.length; i++) ...[
          if (i != 0) const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  borderRadius: AppRadius.brMd,
                  color: isDark ? Colors.white10 : AppColors.background,
                ),
                clipBehavior: Clip.antiAlias,
                child: CachedNetworkImage(
                  imageUrl: validItems[i].product.imageUrl,
                  fit: BoxFit.cover,
                  errorWidget: (_, _, _) => const Icon(Icons.shopping_bag_outlined, size: 18),
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
        ],
      ],
    );
  }
}
