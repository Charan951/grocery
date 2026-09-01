import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

final historyProvider = FutureProvider.autoDispose<List<DeliveryOrder>>((ref) async {
  try {
    return await ref.read(apiProvider).history();
  } catch (_) {
    // history endpoint arrives in P1 — fall back to active until then
    return ref.read(apiProvider).activeOrders();
  }
});

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(historyProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Delivery history')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (orders) {
          if (orders.isEmpty) {
            return const Center(child: Text('No deliveries yet'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(historyProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: orders.length,
              itemBuilder: (c, i) {
                final o = orders[i];
                final done = o.status == 'Delivered';
                return Card(
                  child: ListTile(
                    leading: Icon(done ? Icons.check_circle : Icons.info_outline,
                        color: done ? Colors.green : Colors.orange),
                    title: Text(o.orderId, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text('${o.status}  ·  ₹${o.totalAmount.toStringAsFixed(0)}'),
                    onTap: () => context.push('/order/${o.orderId}'),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
