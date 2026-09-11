import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/providers.dart';

/// Stable per-partner delivery numbers (#1 = their very first delivery),
/// derived once from the unfiltered lifetime history (backend returns
/// newest-first) and shared by every screen that needs a human-friendly
/// label instead of the raw DB orderId (Orders history, Earnings list).
final deliveryNumberingProvider = FutureProvider.autoDispose<Map<String, int>>((ref) async {
  final orders = await ref.read(apiProvider).history();
  final total = orders.length;
  return {for (var i = 0; i < total; i++) orders[i].orderId: total - i};
});
