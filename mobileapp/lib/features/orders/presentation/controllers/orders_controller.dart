import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/socket_service.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';

class OrdersNotifier extends StateNotifier<List<OrderModel>> {
  final ApiService _api;
  final SocketService _socket;

  OrdersNotifier(this._api, this._socket) : super([]) {
    _loadPastOrders();
  }

  void _loadPastOrders() {
    state = [
      OrderModel(
        id: 'FC-82931',
        date: DateTime.now().subtract(const Duration(days: 2)),
        status: OrderStatus.delivered,
        items: [],
        subtotal: 1099.0,
        deliveryFee: 0.0,
        platformFee: 5.0,
        discount: 120.0,
        tax: 20.0,
        total: 999.0,
        deliveryAddress: 'Flat 402, Apple Heights, Sector 12',
        eta: 'Delivered',
      ),
    ];
  }

  OrderModel? get activeOrder {
    try {
      return state.firstWhere(
        (o) => o.status != OrderStatus.delivered && o.status != OrderStatus.cancelled,
      );
    } catch (_) {
      return null;
    }
  }

  Future<String> placeOrder({
    required List<CartItemModel> items,
    required double subtotal,
    required double deliveryFee,
    required double platformFee,
    required double discount,
    required double tax,
    required double total,
    required String address,
  }) async {
    final orderId = 'FC-${10000 + state.length * 17}';
    final newOrder = OrderModel(
      id: orderId,
      date: DateTime.now(),
      status: OrderStatus.placed,
      items: items,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      platformFee: platformFee,
      discount: discount,
      tax: tax,
      total: total,
      deliveryAddress: address,
      eta: '12 Mins',
    );

    state = [newOrder, ...state];

    // Submit to REST API
    final orderPayload = {
      'id': orderId,
      'subtotal': subtotal,
      'deliveryFee': deliveryFee,
      'platformFee': platformFee,
      'discount': discount,
      'tax': tax,
      'total': total,
      'deliveryAddress': address,
      'status': 'Processing',
    };

    await _api.createOrder(orderPayload);

    // Join Socket room for real-time tracking updates
    _socket.joinOrderRoom(orderId);

    return orderId;
  }
}

final ordersProvider = StateNotifierProvider<OrdersNotifier, List<OrderModel>>((ref) {
  return OrdersNotifier(getIt<ApiService>(), getIt<SocketService>());
});
