import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/delivery_numbering.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/core/widgets/filter_sheet.dart';
import 'package:freshcart_delivery/core/widgets/tab_back_button.dart';

final _rangeProvider = StateProvider.autoDispose<String>((ref) => 'week');

final earningsProvider = FutureProvider.autoDispose<
    ({Map<String, num> summary, List<Map<String, dynamic>> items})>((ref) async {
  final range = ref.watch(_rangeProvider);
  return ref.read(apiProvider).earnings(range: range);
});

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final range = ref.watch(_rangeProvider);
    final async = ref.watch(earningsProvider);
    final numberByOrderId = ref.watch(deliveryNumberingProvider).valueOrNull ?? const <String, int>{};

    return Scaffold(
      appBar: AppBar(
        leading: const TabBackButton(),
        title: const Text('Earnings'),
        actions: [
          FilterAction<String>(
            title: 'Time range',
            selected: range,
            options: const [
              FilterOption('today', 'Today'),
              FilterOption('week', 'This week'),
              FilterOption('month', 'This month'),
            ],
            onChanged: (v) => ref.read(_rangeProvider.notifier).state = v,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e')),
              data: (data) {
                final s = data.summary;
                String money(num? v) => '₹${(v ?? 0).toStringAsFixed(0)}';
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(earningsProvider),
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(money(s['total']),
                                  style: const TextStyle(
                                      fontSize: 30, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 2),
                              Text('${s['count'] ?? 0} deliveries',
                                  style: const TextStyle(color: kTextMuted)),
                              const Divider(height: 20),
                              _line('Base pay', money(s['base'])),
                              _line('Distance pay', money(s['distance'])),
                              _line('Tips', money(s['tips'])),
                              const SizedBox(height: 8),
                              _line('Awaiting payout', money(s['pending']),
                                  strong: true),
                              _line('Settled', money(s['settled'])),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (data.items.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('No earnings in this period')),
                        )
                      else
                        ...data.items.map((e) {
                          final settled = e['status'] == 'settled';
                          final number = numberByOrderId[e['orderId']];
                          final label = number != null ? 'Delivery #$number' : '${e['orderId']}';
                          return Card(
                            child: ListTile(
                              dense: true,
                              title: Text(label,
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(
                                  'Base ₹${e['baseFee'] ?? 0} + ${(e['distanceKm'] ?? 0)} km ₹${e['distanceFee'] ?? 0}'),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('₹${e['total'] ?? 0}',
                                      style: const TextStyle(fontWeight: FontWeight.w800)),
                                  Text(settled ? 'settled' : 'pending',
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: settled ? Colors.green : Colors.orange)),
                                ],
                              ),
                            ),
                          );
                        }),
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

  Widget _line(String k, String v, {bool strong = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k,
                style: TextStyle(
                    color: kTextMuted,
                    fontWeight: strong ? FontWeight.w700 : FontWeight.w400)),
            Text(v, style: TextStyle(fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
          ],
        ),
      );
}
