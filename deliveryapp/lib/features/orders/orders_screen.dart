import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/delivery_numbering.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/core/widgets/tab_back_button.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

final _historyProvider =
    FutureProvider.autoDispose.family<List<DeliveryOrder>, String?>((ref, status) async {
  return ref.read(apiProvider).history(status: status);
});

const _filters = <String, String?>{
  'All': null,
  'Delivered': 'delivered',
  'Failed': 'failed',
  'Returned': 'returned',
};

const _emptyHistory = <String, ({IconData icon, String title, String sub})>{
  'All': (icon: Icons.assignment_outlined, title: 'No deliveries yet', sub: 'Completed runs will be listed here.'),
  'Delivered': (icon: Icons.check_circle_outline, title: 'No completed runs', sub: 'Deliveries you finish show up here.'),
  'Failed': (icon: Icons.error_outline, title: 'No failed runs', sub: 'Nothing has gone wrong. Keep it up.'),
  'Returned': (icon: Icons.undo_rounded, title: 'No returns', sub: 'Parcels sent back to the store appear here.'),
};

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});
  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  String _filterLabel = 'All';

  Color _tone(String s) => switch (s) {
        'Delivered' => kGreen,
        'Failed' => kRed,
        'Returned' => kAmber,
        _ => kTextFaint,
      };

  Color _toneSoft(String s) => switch (s) {
        'Delivered' => kGreenSoft,
        'Failed' => kRedSoft,
        'Returned' => kAmberSoft,
        _ => kPaper,
      };

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(_historyProvider(_filters[_filterLabel]));

    // Stable per-partner delivery numbers (#1 = their very first delivery),
    // independent of whichever status filter is active.
    final numberByOrderId = ref.watch(deliveryNumberingProvider).valueOrNull ?? const <String, int>{};

    return Scaffold(
      appBar: AppBar(
        leading: const TabBackButton(),
        title: const Text('Orders'),
      ),
      body: RefreshIndicator(
        color: kGreen,
        onRefresh: () async => ref.invalidate(_historyProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            _chips(),
            const SizedBox(height: 14),
            history.when(
              loading: _loader,
              error: (e, _) => _empty(Icons.wifi_off_rounded, "Couldn't load history", '$e'),
              data: (orders) {
                if (orders.isEmpty) {
                  final e = _emptyHistory[_filterLabel]!;
                  return _empty(e.icon, e.title, e.sub);
                }
                return Column(
                  children: orders.map((o) => _tile(o, numberByOrderId[o.orderId])).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  static const _chipIcons = <String, IconData>{
    'All': Icons.dashboard_rounded,
    'Delivered': Icons.check_circle_rounded,
    'Failed': Icons.cancel_rounded,
    'Returned': Icons.undo_rounded,
  };

  Widget _chips() => SizedBox(
        height: 40,
        child: ListView(
          scrollDirection: Axis.horizontal,
          children: _filters.keys.map((label) {
            final sel = label == _filterLabel;
            final fg = sel ? Colors.white : (label == 'All' ? kTextMuted : _tone(label));
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => setState(() => _filterLabel = label),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: sel ? kGreen : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? kGreen : Colors.black12),
                  ),
                  child: Row(children: [
                    Icon(_chipIcons[label], size: 16, color: fg),
                    const SizedBox(width: 6),
                    Text(label,
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600, color: sel ? Colors.white : kTextMuted)),
                  ]),
                ),
              ),
            );
          }).toList(),
        ),
      );

  String? _placedAt(DeliveryOrder o) {
    for (final t in o.timeline) {
      final raw = t['timestamp'] ?? t['time'] ?? t['at'] ?? t['date'];
      final d = raw == null ? null : DateTime.tryParse(raw.toString());
      if (d != null) {
        final l = d.toUtc().add(const Duration(hours: 5, minutes: 30));
        const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        final h = l.hour % 12 == 0 ? 12 : l.hour % 12;
        return '${l.day} ${m[l.month - 1]} ${l.year} • $h:${l.minute.toString().padLeft(2, '0')} ${l.hour >= 12 ? 'PM' : 'AM'}';
      }
    }
    return null;
  }

  Widget _tile(DeliveryOrder o, int? number) {
    final subtitle = o.deliveryAddress.isEmpty ? o.status : o.deliveryAddress;
    final label = number != null ? 'Delivery #$number' : 'Delivery';
    final when = _placedAt(o);
    final count = o.items.fold<int>(0, (a, i) => a + i.quantity);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        margin: EdgeInsets.zero,
        child: InkWell(
          onTap: () => context.push('/order/${o.orderId}'),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(color: kGreenSoft, borderRadius: BorderRadius.circular(14)),
                      child: const Icon(Icons.local_shipping_rounded, size: 26, color: kGreen),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          if (when != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(when, style: const TextStyle(color: kTextMuted, fontSize: 12)),
                            ),
                          const SizedBox(height: 4),
                          Row(children: [
                            const Icon(Icons.location_on_outlined, size: 14, color: kTextMuted),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(subtitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: kTextMuted, fontSize: 12)),
                            ),
                          ]),
                          const SizedBox(height: 8),
                          _pill(o.status),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text('₹${o.totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                    const Icon(Icons.chevron_right_rounded, color: kTextFaint),
                  ],
                ),
                const Divider(height: 22),
                Row(children: [
                  const Icon(Icons.inventory_2_outlined, size: 16, color: kTextMuted),
                  const SizedBox(width: 6),
                  Text('$count ${count == 1 ? 'item' : 'items'}',
                      style: const TextStyle(color: kTextMuted, fontSize: 12.5)),
                  const SizedBox(width: 14),
                  Icon(o.isCOD ? Icons.payments_outlined : Icons.credit_score_rounded, size: 16, color: kTextMuted),
                  const SizedBox(width: 6),
                  Text(o.isCOD ? 'COD' : 'Prepaid', style: const TextStyle(color: kTextMuted, fontSize: 12.5)),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _pill(String status) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: _toneSoft(status), borderRadius: BorderRadius.circular(12)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(status == 'Delivered' ? Icons.check_circle_rounded : Icons.info_rounded, size: 14, color: _tone(status)),
          const SizedBox(width: 4),
          Text(status, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _tone(status))),
        ]),
      );

  static Widget _loader() =>
      const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator()));

  Widget _empty(IconData icon, String title, String sub) => Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 20),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(color: kPaper, shape: BoxShape.circle),
                child: Icon(icon, size: 18, color: kTextFaint),
              ),
              const SizedBox(height: 10),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 4),
              Text(sub,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: kTextMuted, fontSize: 12)),
            ],
          ),
        ),
      );
}
