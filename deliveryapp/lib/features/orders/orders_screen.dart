import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/delivery_numbering.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/core/widgets/filter_sheet.dart';
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
        actions: [
          FilterAction<String>(
            title: 'Filter history',
            selected: _filterLabel,
            options: _filters.keys.map((label) => FilterOption(label, label)).toList(),
            onChanged: (label) => setState(() => _filterLabel = label),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: kGreen,
        onRefresh: () async => ref.invalidate(_historyProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _label('History', history.valueOrNull?.length),
                if (_filterLabel != 'All')
                  Text(_filterLabel,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kGreen)),
              ],
            ),
            const SizedBox(height: 12),
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

  Widget _label(String text, int? count) => Row(
        children: [
          Text(text.toUpperCase(),
              style: const TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1, color: kTextFaint)),
          if (count != null && count > 0) ...[
            const SizedBox(width: 6),
            Text('· $count',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kTextFaint)),
          ],
        ],
      );

  Widget _tile(DeliveryOrder o, int? number) {
    final subtitle = o.deliveryAddress.isEmpty ? o.status : o.deliveryAddress;
    final label = number != null ? 'Delivery #$number' : o.orderId;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        child: InkWell(
          onTap: () => context.push('/order/${o.orderId}'),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _toneSoft(o.status),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Icon(Icons.place_rounded, size: 18, color: _tone(o.status)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(label,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          ),
                          const SizedBox(width: 6),
                          _pill(o.status),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: kTextMuted, fontSize: 11.5)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text('₹${o.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                const Icon(Icons.chevron_right_rounded, color: kTextFaint),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _pill(String status) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: _toneSoft(status), borderRadius: BorderRadius.circular(4)),
        child: Text(status.toUpperCase(),
            style: TextStyle(
                fontSize: 8.5, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: _tone(status))),
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
