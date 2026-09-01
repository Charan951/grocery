import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

final notificationsProvider =
    FutureProvider.autoDispose<({int unread, List<AppNotification> items})>((ref) {
  return ref.read(apiProvider).notifications();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  String _ago(DateTime? d) {
    if (d == null) return '';
    final s = DateTime.now().difference(d).inSeconds;
    if (s < 60) return '${s}s ago';
    if (s < 3600) return '${s ~/ 60}m ago';
    if (s < 86400) return '${s ~/ 3600}h ago';
    return '${s ~/ 86400}d ago';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(apiProvider).markNotificationsRead();
              ref.invalidate(notificationsProvider);
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (data) {
          if (data.items.isEmpty) {
            return const Center(child: Text('No notifications'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.separated(
              itemCount: data.items.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (c, i) {
                final n = data.items[i];
                return ListTile(
                  leading: Icon(
                    n.type == 'Offer' ? Icons.local_shipping_outlined : Icons.notifications_none_rounded,
                    color: n.read ? Colors.black38 : null,
                  ),
                  title: Text(n.title,
                      style: TextStyle(fontWeight: n.read ? FontWeight.w500 : FontWeight.w800)),
                  subtitle: Text(n.body),
                  trailing: Text(_ago(n.createdAt),
                      style: const TextStyle(fontSize: 11, color: Colors.black45)),
                  tileColor: n.read ? null : Colors.green.withValues(alpha: 0.04),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
