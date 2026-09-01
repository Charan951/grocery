import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';
import 'package:freshcart/features/orders/presentation/screens/orders_list_screen.dart' show reorder, statusColor, statusIcon;

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final async = ref.watch(orderDetailProvider(orderId));

    return AppScaffold(
      title: 'Order #$orderId',
      body: async.when(
        loading: () => const _DetailSkeleton(),
        error: (e, _) => ErrorState(onRetry: () => ref.invalidate(orderDetailProvider(orderId))),
        data: (order) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async => ref.invalidate(orderDetailProvider(orderId)),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
            children: [
              _StatusHeader(order: order, isDark: isDark),
              const SizedBox(height: 20),
              if (order.timeline.isNotEmpty) ...[
                _title('Status', isDark),
                const SizedBox(height: 8),
                _Timeline(entries: order.timeline, isDark: isDark),
                const SizedBox(height: 20),
              ],
              _title('Items (${order.items.length})', isDark),
              const SizedBox(height: 8),
              GlassCard(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    for (final it in order.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: AppRadius.brSm,
                              child: SizedBox(
                                width: 40,
                                height: 40,
                                child: it.product.imageUrl.startsWith('http')
                                    ? CachedNetworkImage(
                                        imageUrl: it.product.imageUrl,
                                        fit: BoxFit.cover,
                                        errorWidget: (_, _, _) => const Icon(Icons.shopping_bag_outlined, size: 16),
                                      )
                                    : const Icon(Icons.shopping_bag_outlined, size: 16),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '${it.product.name}  ·  ${it.selectedWeight}  ×${it.quantity}',
                                style: AppTypography.bodyMedium(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Text('₹${(it.product.price * it.quantity).toStringAsFixed(0)}',
                                style: AppTypography.labelMedium(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                )),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _title('Bill', isDark),
              const SizedBox(height: 8),
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _row('Item total', '₹${order.subtotal.toStringAsFixed(2)}', isDark),
                    if (order.discount > 0)
                      _row('Discount', '- ₹${order.discount.toStringAsFixed(2)}', isDark, green: true),
                    _row('Delivery', order.deliveryFee == 0 ? 'FREE' : '₹${order.deliveryFee.toStringAsFixed(2)}',
                        isDark, green: order.deliveryFee == 0),
                    _row('Handling fee', '₹${order.platformFee.toStringAsFixed(2)}', isDark),
                    if (order.tax > 0) _row('Taxes', '₹${order.tax.toStringAsFixed(2)}', isDark),
                    Divider(height: 20, color: isDark ? AppColors.dividerDark : AppColors.divider),
                    _row('Total', '₹${order.total.toStringAsFixed(2)}', isDark, bold: true),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _title('Delivery & payment', isDark),
              const SizedBox(height: 8),
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(order.deliveryAddress, style: AppTypography.bodyMedium(
                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    )),
                    const SizedBox(height: 6),
                    Text(
                      '${order.paymentMethod.isEmpty ? 'Payment' : order.paymentMethod} · '
                      '${order.paymentStatus.isEmpty ? '—' : order.paymentStatus}',
                      style: AppTypography.bodySmall(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (order.isActive)
                PrimaryButton(text: 'Track this order', onPressed: () => context.push('/tracking/${order.id}'))
              else
                SecondaryButton(
                  text: 'Reorder these items',
                  onPressed: () {
                    reorder(ref, order);
                    context.push('/cart');
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _title(String t, bool isDark) => Text(t, style: AppTypography.title(
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
      ));

  Widget _row(String k, String v, bool isDark, {bool green = false, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: bold
              ? AppTypography.labelLarge(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
              : AppTypography.bodyMedium(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
          Text(v, style: green
              ? AppTypography.labelMedium(AppColors.primaryText)
              : (bold
                  ? AppTypography.labelLarge(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
                  : AppTypography.labelMedium(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary))),
        ],
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  const _StatusHeader({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final c = statusColor(order.status);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.withOpacity(0.08),
        borderRadius: AppRadius.brLg,
        border: Border.all(color: c.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Icon(statusIcon(order.status), color: c),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(order.statusText, style: AppTypography.labelLarge(c)),
                if (order.eta.isNotEmpty)
                  Text('ETA ${order.eta}', style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  final List<OrderTimelineEntry> entries;
  final bool isDark;
  const _Timeline({required this.entries, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          for (var i = 0; i < entries.length; i++)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                    ),
                    if (i != entries.length - 1)
                      Container(width: 2, height: 32, color: isDark ? AppColors.dividerDark : AppColors.divider),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(entries[i].status, style: AppTypography.labelMedium(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        )),
                        if (entries[i].note.isNotEmpty)
                          Text(entries[i].note, style: AppTypography.bodySmall(
                            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          )),
                      ],
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

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonGroup(
      child: ListView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBox(height: 64, borderRadius: AppRadius.brLg),
          SizedBox(height: 20),
          SkeletonLine(widthFactor: 0.3, height: 16),
          SizedBox(height: 10),
          SkeletonBox(height: 120, borderRadius: AppRadius.brLg),
          SizedBox(height: 20),
          SkeletonLine(widthFactor: 0.3, height: 16),
          SizedBox(height: 10),
          SkeletonBox(height: 160, borderRadius: AppRadius.brLg),
        ],
      ),
    );
  }
}
