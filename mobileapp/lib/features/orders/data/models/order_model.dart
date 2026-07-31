import 'package:freshcart/features/cart/data/models/cart_item_model.dart';

enum OrderStatus { placed, processing, dispatched, delivered, cancelled }

class OrderModel {
  final String id;
  final DateTime date;
  final OrderStatus status;
  final List<CartItemModel> items;
  final double subtotal;
  final double deliveryFee;
  final double platformFee;
  final double discount;
  final double tax;
  final double total;
  final String deliveryAddress;
  final String eta;

  const OrderModel({
    required this.id,
    required this.date,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.platformFee,
    required this.discount,
    required this.tax,
    required this.total,
    required this.deliveryAddress,
    required this.eta,
  });

  String get statusText {
    switch (status) {
      case OrderStatus.placed:
        return 'Order Placed';
      case OrderStatus.processing:
        return 'Packing Groceries';
      case OrderStatus.dispatched:
        return 'Out for Delivery';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      status: OrderStatus.values.firstWhere((e) => e.name == json['status']),
      items: (json['items'] as List)
          .map((i) => CartItemModel.fromJson(Map<String, dynamic>.from(i as Map)))
          .toList(),
      subtotal: (json['subtotal'] as num).toDouble(),
      deliveryFee: (json['deliveryFee'] as num).toDouble(),
      platformFee: (json['platformFee'] as num).toDouble(),
      discount: (json['discount'] as num).toDouble(),
      tax: (json['tax'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      deliveryAddress: json['deliveryAddress'] as String,
      eta: json['eta'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'status': status.name,
      'items': items.map((i) => i.toJson()).toList(),
      'subtotal': subtotal,
      'deliveryFee': deliveryFee,
      'platformFee': platformFee,
      'discount': discount,
      'tax': tax,
      'total': total,
      'deliveryAddress': deliveryAddress,
      'eta': eta,
    };
  }

  OrderModel copyWith({
    OrderStatus? status,
    String? eta,
  }) {
    return OrderModel(
      id: id,
      date: date,
      status: status ?? this.status,
      items: items,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      platformFee: platformFee,
      discount: discount,
      tax: tax,
      total: total,
      deliveryAddress: deliveryAddress,
      eta: eta ?? this.eta,
    );
  }
}
