import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

final activeOrdersProvider = FutureProvider.autoDispose<List<DeliveryOrder>>((ref) {
  // refresh when auth profile changes (e.g. after accept)
  ref.watch(authProvider.select((s) => s.profile?.activeOrderIds.length));
  return ref.read(apiProvider).activeOrders();
});

final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async {
  try {
    final r = await ref.read(apiProvider).notifications(unreadOnly: true);
    return r.unread;
  } catch (_) {
    return 0;
  }
});

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  bool _toggling = false;

  Future<void> _toggle(bool value) async {
    setState(() => _toggling = true);
    try {
      final loc = ref.read(locationServiceProvider);
      if (value) {
        final ok = await loc.ensurePermission();
        if (!ok) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission is required to go online.')),
            );
          }
          return;
        }
      }
      final res = await ref.read(apiProvider).setOnline(value);
      await ref.read(authProvider.notifier).refreshProfile();
      if (res['isOnline'] == true) {
        await loc.start(interval: const Duration(seconds: 12));
      } else {
        loc.stop();
      }
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(authProvider.select((s) => s.profile));
    final online = p?.isOnline ?? false;
    final active = ref.watch(activeOrdersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/notifications');
              ref.invalidate(unreadCountProvider);
            },
            icon: Badge(
              isLabelVisible: (ref.watch(unreadCountProvider).valueOrNull ?? 0) > 0,
              label: Text('${ref.watch(unreadCountProvider).valueOrNull ?? 0}'),
              child: const Icon(Icons.notifications_none_rounded),
            ),
          ),
          IconButton(onPressed: () => context.push('/history'), icon: const Icon(Icons.history_rounded)),
          IconButton(onPressed: () => context.push('/profile'), icon: const Icon(Icons.person_outline_rounded)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authProvider.notifier).refreshProfile();
          ref.invalidate(activeOrdersProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: (online ? kBrand : Colors.grey).withValues(alpha: 0.14),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(online ? Icons.bolt_rounded : Icons.power_settings_new_rounded,
                          color: online ? kBrand : Colors.grey),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(online ? "You're online" : "You're offline",
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          Text(
                            online ? 'Availability: ${p?.availability ?? '—'}' : 'Go online to receive orders',
                            style: const TextStyle(color: Colors.black54, fontSize: 12.5),
                          ),
                        ],
                      ),
                    ),
                    _toggling
                        ? const SizedBox(width: 40, child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)))
                        : Switch(value: online, onChanged: _toggle),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _stat('Completed', '${p?.completedCount ?? 0}', Icons.check_circle_rounded),
                const SizedBox(width: 12),
                _stat('Failed', '${p?.failedCount ?? 0}', Icons.cancel_rounded),
                const SizedBox(width: 12),
                _stat(
                  (p?.ratingCount ?? 0) > 0 ? 'Rating (${p!.ratingCount})' : 'Rating',
                  (p?.rating ?? 5).toStringAsFixed(1),
                  Icons.star_rounded,
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Active delivery', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 10),
            active.when(
              loading: () => const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => _empty("Couldn't load orders", '$e'),
              data: (orders) {
                if (orders.isEmpty) {
                  return _empty(online ? 'No active delivery' : 'You are offline',
                      online ? 'New orders will pop up here.' : 'Go online to start.');
                }
                return Column(children: orders.map(_activeCard).toList());
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon) => Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            child: Column(
              children: [
                Icon(icon, color: kBrand, size: 22),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                Text(label, style: const TextStyle(color: Colors.black54, fontSize: 11.5)),
              ],
            ),
          ),
        ),
      );

  Widget _activeCard(DeliveryOrder o) => Card(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          title: Text(o.orderId, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('${o.status}  ·  ₹${o.totalAmount.toStringAsFixed(0)}${o.isCOD ? ' COD' : ''}\n${o.deliveryAddress}'),
          isThreeLine: true,
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => context.push('/order/${o.orderId}'),
        ),
      );

  Widget _empty(String t, String s) => Card(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            children: [
              const Icon(Icons.inbox_rounded, size: 40, color: Colors.black26),
              const SizedBox(height: 10),
              Text(t, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(s, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54, fontSize: 12.5)),
            ],
          ),
        ),
      );
}
