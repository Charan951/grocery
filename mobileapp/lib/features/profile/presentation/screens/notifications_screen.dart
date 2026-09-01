import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

/// Activity feed. The backend has no dedicated notifications endpoint yet, so
/// this is derived from the real order timelines (`GET /orders/mine` →
/// `trackingTimeline`) — every status transition the customer's orders have
/// been through, newest first. No fabricated data.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ordersAsync = ref.watch(ordersProvider);

    return AppScaffold(
      title: 'Notifications',
      body: ordersAsync.when(
        loading: () => const SkeletonList(itemCount: 5, itemHeight: 72),
        error: (e, _) => ErrorState(onRetry: () => ref.read(ordersProvider.notifier).refresh()),
        data: (orders) {
          final items = _feed(orders);
          if (items.isEmpty) {
            return const EmptyState(
              icon: Icons.notifications_none_rounded,
              title: 'Nothing here yet',
              description: 'Updates about your orders will appear here.',
            );
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final n = items[i];
                return GestureDetector(
                  onTap: () => context.push('/order/${n.orderId}'),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surface,
                      borderRadius: AppRadius.brMd,
                      border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.local_shipping_outlined, size: 18, color: AppColors.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Order #${n.orderId} · ${n.status}',
                                  style: AppTypography.labelLarge(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  )),
                              if (n.note.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(n.note, style: AppTypography.bodySmall(
                                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                )),
                              ],
                              if (n.at != null) ...[
                                const SizedBox(height: 4),
                                Text(_ago(n.at!), style: AppTypography.labelSmall(
                                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                ).copyWith(fontWeight: FontWeight.w400)),
                              ],
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textSecondary),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  List<_Item> _feed(List<OrderModel> orders) {
    final out = <_Item>[];
    for (final o in orders) {
      for (final t in o.timeline) {
        out.add(_Item(orderId: o.id, status: t.status, note: t.note, at: t.at ?? o.date));
      }
      if (o.timeline.isEmpty) {
        out.add(_Item(orderId: o.id, status: o.statusText, note: '', at: o.date));
      }
    }
    out.sort((a, b) => (b.at ?? DateTime(0)).compareTo(a.at ?? DateTime(0)));
    return out;
  }

  String _ago(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'Just now';
    if (d.inMinutes < 60) return '${d.inMinutes} min ago';
    if (d.inHours < 24) return '${d.inHours} h ago';
    if (d.inDays < 7) return '${d.inDays} d ago';
    return '${t.day}/${t.month}/${t.year}';
  }
}

class _Item {
  final String orderId;
  final String status;
  final String note;
  final DateTime? at;
  _Item({required this.orderId, required this.status, required this.note, this.at});
}
