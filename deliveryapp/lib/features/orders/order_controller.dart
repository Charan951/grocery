import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

class OrderNotifier extends StateNotifier<AsyncValue<DeliveryOrder>> {
  final Ref _ref;
  final String orderId;
  OrderNotifier(this._ref, this.orderId) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    try {
      state = AsyncValue.data(await _ref.read(apiProvider).order(orderId));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> _run(Future<DeliveryOrder> Function() action) async {
    try {
      final o = await action();
      state = AsyncValue.data(o);
      // active-order list / profile may have changed (complete/fail frees the partner)
      _ref.read(authProvider.notifier).refreshProfile();
    } on ApiException {
      rethrow;
    }
  }

  Future<void> pickupArrived() => _run(() => _ref.read(apiProvider).pickupArrived(orderId));
  Future<void> pickedUp() => _run(() => _ref.read(apiProvider).pickedUp(orderId));
  Future<void> arrived() => _run(() => _ref.read(apiProvider).arrived(orderId));
  Future<void> complete({String? otp, String? photoBase64}) =>
      _run(() => _ref.read(apiProvider).complete(orderId, otp: otp, podPhotoBase64: photoBase64));
  Future<void> fail(String reason) => _run(() => _ref.read(apiProvider).fail(orderId, reason));
  Future<void> markReturned() => _run(() => _ref.read(apiProvider).markReturned(orderId));
}

final orderProvider = StateNotifierProvider.family<OrderNotifier, AsyncValue<DeliveryOrder>, String>(
  (ref, id) => OrderNotifier(ref, id),
);
