import 'package:freshcart/core/utils/parse.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

enum OrderStatus { placed, processing, dispatched, delivered, cancelled }

/// Maps the backend's wide status enum onto the app's 5 buckets.
OrderStatus orderStatusFrom(String raw) {
  switch (raw.toLowerCase()) {
    case 'pending':
    case 'accepted':
      return OrderStatus.placed;
    case 'packed':
    case 'ready':
    case 'arrived at store':
      return OrderStatus.processing;
    case 'assigned':
    case 'out for delivery':
    case 'arrived':
    case 'in transit':
      return OrderStatus.dispatched;
    case 'delivered':
      return OrderStatus.delivered;
    case 'failed':
    case 'cancelled':
    case 'returned':
    case 'refunded':
      return OrderStatus.cancelled;
    default:
      return OrderStatus.placed;
  }
}

class OrderTimelineEntry {
  final String status;
  final String note;
  final DateTime? at;
  const OrderTimelineEntry({required this.status, required this.note, this.at});

  factory OrderTimelineEntry.fromJson(Map<String, dynamic> j) => OrderTimelineEntry(
        status: asString(j['status']),
        note: asString(j['note']),
        at: DateTime.tryParse(asString(j['at'])),
      );
}

class OrderModel {
  final String id;
  final DateTime date;
  final OrderStatus status;
  final String statusRaw;
  final List<CartItemModel> items;
  final double subtotal;
  final double deliveryFee;
  final double platformFee;
  final double discount;
  final double tax;
  final double total;
  final String deliveryAddress;
  final String eta;
  final String paymentMethod;
  final String paymentStatus;
  final List<OrderTimelineEntry> timeline;

  const OrderModel({
    required this.id,
    required this.date,
    required this.status,
    this.statusRaw = '',
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.platformFee,
    required this.discount,
    required this.tax,
    required this.total,
    required this.deliveryAddress,
    required this.eta,
    this.paymentMethod = '',
    this.paymentStatus = '',
    this.timeline = const [],
  });

  String get statusText {
    if (statusRaw.isNotEmpty) return statusRaw;
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

  bool get isActive => status != OrderStatus.delivered && status != OrderStatus.cancelled;

  /// Backend `Order` document -> OrderModel.
  factory OrderModel.fromServerJson(Map<String, dynamic> j) {
    final rawItems = (j['items'] as List?) ?? const [];
    final items = rawItems.whereType<Map>().map((raw) {
      final m = Map<String, dynamic>.from(raw);
      final qty = asInt(m['quantity'] ?? m['qty'], fallback: 1);
      // Build a light ProductModel from the order line (no live fetch needed).
      final product = ProductModel.fromJson({
        'id': asString(m['productId'] ?? m['id']),
        'name': asString(m['name'], fallback: 'Item'),
        'price': m['price'] ?? 0,
        'mrp': m['mrp'] ?? m['price'] ?? 0,
        'imageUrl': asString(m['image']),
      });
      return CartItemModel(
        product: product,
        quantity: qty,
        selectedWeight: asString(m['weightSpec'], fallback: '1 pc'),
      );
    }).toList();

    final total = asDouble(j['totalAmount'], fallback: asDouble(j['total']));
    final itemTotal = asDouble(j['itemTotal'], fallback: asDouble(j['subTotal']));
    final statusRaw = asString(j['status'], fallback: 'Pending');

    return OrderModel(
      id: asString(j['orderId'], fallback: asString(j['id'])),
      date: DateTime.tryParse(asString(j['createdAt'])) ?? DateTime.now(),
      status: orderStatusFrom(statusRaw),
      statusRaw: statusRaw,
      items: items,
      subtotal: itemTotal,
      deliveryFee: asDouble(j['deliveryFee']),
      platformFee: asDouble(j['handlingFee']),
      discount: asDouble(j['discount']),
      tax: 0,
      total: total,
      deliveryAddress: asString(j['deliveryAddress'], fallback: 'Delivery address'),
      eta: asString(j['estimatedDelivery'], fallback: '10 mins'),
      paymentMethod: asString(j['paymentMethod']),
      paymentStatus: asString(j['paymentStatus']),
      timeline: ((j['trackingTimeline'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => OrderTimelineEntry.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }

  /// Local (Hive / optimistic) round-trip.
  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: asString(json['id']),
      date: DateTime.tryParse(asString(json['date'])) ?? DateTime.now(),
      status: OrderStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => OrderStatus.placed,
      ),
      statusRaw: asString(json['statusRaw']),
      items: ((json['items'] as List?) ?? const [])
          .map((i) => CartItemModel.fromJson(Map<String, dynamic>.from(i as Map)))
          .toList(),
      subtotal: asDouble(json['subtotal']),
      deliveryFee: asDouble(json['deliveryFee']),
      platformFee: asDouble(json['platformFee']),
      discount: asDouble(json['discount']),
      tax: asDouble(json['tax']),
      total: asDouble(json['total']),
      deliveryAddress: asString(json['deliveryAddress']),
      eta: asString(json['eta']),
      paymentMethod: asString(json['paymentMethod']),
      paymentStatus: asString(json['paymentStatus']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'date': date.toIso8601String(),
        'status': status.name,
        'statusRaw': statusRaw,
        'items': items.map((i) => i.toJson()).toList(),
        'subtotal': subtotal,
        'deliveryFee': deliveryFee,
        'platformFee': platformFee,
        'discount': discount,
        'tax': tax,
        'total': total,
        'deliveryAddress': deliveryAddress,
        'eta': eta,
        'paymentMethod': paymentMethod,
        'paymentStatus': paymentStatus,
      };

  OrderModel copyWith({
    OrderStatus? status,
    String? statusRaw,
    String? eta,
    String? paymentStatus,
  }) {
    return OrderModel(
      id: id,
      date: date,
      status: status ?? this.status,
      statusRaw: statusRaw ?? this.statusRaw,
      items: items,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      platformFee: platformFee,
      discount: discount,
      tax: tax,
      total: total,
      deliveryAddress: deliveryAddress,
      eta: eta ?? this.eta,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      timeline: timeline,
    );
  }
}
