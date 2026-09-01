import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/socket_service.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';

class OrdersNotifier extends StateNotifier<AsyncValue<List<OrderModel>>> {
  final ApiService _api;
  final SocketService _socket;

  OrdersNotifier(this._api, this._socket) : super(const AsyncValue.loading()) {
    refresh();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      final raw = await _api.fetchMyOrders();
      state = AsyncValue.data(raw.map(OrderModel.fromServerJson).toList());
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  OrderModel? get activeOrder {
    final list = state.asData?.value ?? const [];
    for (final o in list) {
      if (o.isActive) return o;
    }
    return null;
  }

  /// Posts a real order, returns the server orderId, and optimistically prepends
  /// it to the list. Throws [ApiException] on failure.
  Future<String> placeOrder({
    required List<CartItemModel> items,
    required double subtotal,
    required double deliveryFee,
    required double platformFee,
    required double discount,
    required double tax,
    required double total,
    required String address,
    required String paymentMethod,
    required bool paid,
    String? paymentId,
    String? paymentRef,
  }) async {
    final payload = {
      'items': items
          .map((i) => {
                'productId': i.product.id,
                'id': i.product.id,
                'name': i.product.name,
                'weightSpec': i.selectedWeight,
                'quantity': i.quantity,
                'qty': i.quantity,
                'price': i.product.price,
                'mrp': i.product.mrp,
                'image': i.product.imageUrl,
              })
          .toList(),
      'itemTotal': subtotal,
      'subTotal': subtotal,
      'discount': discount,
      'deliveryFee': deliveryFee,
      'handlingFee': platformFee,
      'totalAmount': total,
      'paymentMethod': paymentMethod,
      'paymentStatus': paid ? 'Paid' : 'Pending',
      'status': 'Pending',
      'deliveryAddress': address,
      'paymentId': paymentId,
      'paymentRef': paymentRef,
    };

    final order = await _api.createOrder(payload); // throws on failure
    final orderId = (order['orderId'] ?? order['id'] ?? '').toString();

    final optimistic = OrderModel(
      id: orderId,
      date: DateTime.now(),
      status: OrderStatus.placed,
      statusRaw: 'Pending',
      items: items,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      platformFee: platformFee,
      discount: discount,
      tax: tax,
      total: total,
      deliveryAddress: address,
      eta: (order['estimatedDelivery'] ?? '10 mins').toString(),
      paymentMethod: paymentMethod,
      paymentStatus: paid ? 'Paid' : 'Pending',
    );
    state = AsyncValue.data([optimistic, ...(state.asData?.value ?? const [])]);

    if (orderId.isNotEmpty) _socket.joinOrderRoom(orderId);
    return orderId;
  }

  /// Cancels [orderId] (server enforces the cancellable window + wallet refund).
  /// Updates the local list on success. Returns `true` when a refund was issued.
  /// Throws [ApiException] (e.g. 409) when the order can no longer be cancelled.
  Future<bool> cancelOrder(String orderId, {String? reason}) async {
    final res = await _api.cancelOrder(orderId, reason: reason);
    final refunded = res['refunded'] == true;
    final list = state.asData?.value;
    if (list != null) {
      state = AsyncValue.data([
        for (final o in list)
          if (o.id == orderId)
            o.copyWith(
              status: OrderStatus.cancelled,
              statusRaw: 'Cancelled',
              paymentStatus: refunded ? 'Refunded' : o.paymentStatus,
            )
          else
            o,
      ]);
    }
    return refunded;
  }
}

final ordersProvider =
    StateNotifierProvider<OrdersNotifier, AsyncValue<List<OrderModel>>>((ref) {
  return OrdersNotifier(getIt<ApiService>(), getIt<SocketService>());
});

/// Single order detail (fresh fetch, includes the status timeline).
final orderDetailProvider =
    FutureProvider.family<OrderModel, String>((ref, orderId) async {
  final raw = await ref.watch(apiServiceProvider).fetchOrder(orderId);
  return OrderModel.fromServerJson(raw);
});
