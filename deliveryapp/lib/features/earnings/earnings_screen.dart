import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/providers.dart';

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

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'today', label: Text('Today')),
                ButtonSegment(value: 'week', label: Text('Week')),
                ButtonSegment(value: 'month', label: Text('Month')),
              ],
              selected: {range},
              onSelectionChanged: (s) =>
                  ref.read(_rangeProvider.notifier).state = s.first,
            ),
          ),
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
                                  style: const TextStyle(color: Colors.black54)),
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
                          return Card(
                            child: ListTile(
                              dense: true,
                              title: Text('${e['orderId']}',
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
                    color: Colors.black54,
                    fontWeight: strong ? FontWeight.w700 : FontWeight.w400)),
            Text(v, style: TextStyle(fontWeight: strong ? FontWeight.w800 : FontWeight.w600)),
          ],
        ),
      );
}
