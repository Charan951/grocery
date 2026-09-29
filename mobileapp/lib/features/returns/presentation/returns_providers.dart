import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/returns/data/return_models.dart';

/// Eligibility + existing return/exchange requests for one order.
final orderReturnsProvider = FutureProvider.autoDispose.family<OrderReturns, String>((ref, orderId) async {
  final json = await ref.watch(apiServiceProvider).fetchOrderReturns(orderId);
  return OrderReturns.fromJson(json);
});

/// The signed-in customer's saved bank accounts / UPI IDs for refunds.
final refundAccountsProvider = FutureProvider.autoDispose<List<RefundAccount>>((ref) async {
  final list = await ref.watch(apiServiceProvider).fetchRefundAccounts();
  return list.map(RefundAccount.fromJson).toList();
});

/// The shared issue list (same one the web shows).
final returnConfigProvider = FutureProvider.autoDispose<ReturnConfig>((ref) async {
  final json = await ref.watch(apiServiceProvider).fetchReturnConfig();
  return ReturnConfig.fromJson(json);
});
