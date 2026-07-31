import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';

class OrdersNotifier extends StateNotifier<List<OrderModel>> {
  Timer? _trackingTimer;

  OrdersNotifier() : super([]) {
    _loadPastOrders();
  }

  void _loadPastOrders() {
    // Start with empty or mock history
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

  String placeOrder({
    required List<CartItemModel> items,
    required double subtotal,
    required double deliveryFee,
    required double platformFee,
    required double discount,
    required double tax,
    required double total,
    required String address,
  }) {
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
    _startLiveTracking(orderId);
    return orderId;
  }

  void _startLiveTracking(String orderId) {
    _trackingTimer?.cancel();
    
    // Simulate order progress status transitions
    int seconds = 0;
    _trackingTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      seconds += 15;
      
      final currentOrders = List<OrderModel>.from(state);
      final index = currentOrders.indexWhere((o) => o.id == orderId);
      if (index < 0) {
        timer.cancel();
        return;
      }
      
      final order = currentOrders[index];
      OrderModel updatedOrder;

      if (seconds == 15) {
        updatedOrder = order.copyWith(status: OrderStatus.processing, eta: '10 Mins');
      } else if (seconds == 30) {
        updatedOrder = order.copyWith(status: OrderStatus.dispatched, eta: '5 Mins');
      } else if (seconds == 45) {
        updatedOrder = order.copyWith(status: OrderStatus.delivered, eta: 'Delivered');
        timer.cancel();
      } else {
        updatedOrder = order;
      }

      currentOrders[index] = updatedOrder;
      state = currentOrders;
    });
  }

  @override
  void dispose() {
    _trackingTimer?.cancel();
    super.dispose();
  }
}

final ordersProvider = StateNotifierProvider<OrdersNotifier, List<OrderModel>>((ref) {
  return OrdersNotifier();
});
