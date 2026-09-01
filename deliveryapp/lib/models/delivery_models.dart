double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
int _i(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
String _s(dynamic v) => v?.toString() ?? '';

class PartnerProfile {
  final String userId, name, email, phone, vehicleType, availability;
  final bool isOnline;
  final List<String> activeOrderIds;
  final int completedCount, failedCount;
  final double rating;
  final int ratingCount;
  final double todayEarnings;

  PartnerProfile({
    required this.userId,
    required this.name,
    required this.email,
    required this.phone,
    required this.vehicleType,
    required this.availability,
    required this.isOnline,
    required this.activeOrderIds,
    required this.completedCount,
    required this.failedCount,
    required this.rating,
    this.ratingCount = 0,
    this.todayEarnings = 0,
  });

  factory PartnerProfile.fromJson(Map<String, dynamic> j) => PartnerProfile(
        userId: _s(j['userId']),
        name: _s(j['name']),
        email: _s(j['email']),
        phone: _s(j['phone']),
        vehicleType: _s(j['vehicleType']).isEmpty ? 'bike' : _s(j['vehicleType']),
        availability: _s(j['availability']).isEmpty ? 'offline' : _s(j['availability']),
        isOnline: j['isOnline'] == true,
        activeOrderIds: ((j['activeOrderIds'] as List?) ?? const []).map(_s).toList(),
        completedCount: _i(j['completedCount']),
        failedCount: _i(j['failedCount']),
        rating: j['rating'] == null ? 5 : _d(j['rating']),
        ratingCount: _i(j['ratingCount']),
        todayEarnings: _d(j['todayEarnings']),
      );
}

/// An incoming assignment offer (socket `delivery_offer`).
class DeliveryOffer {
  final String assignmentId, orderId, deliveryAddress, paymentMethod;
  final double amount;
  final int itemCount;
  final bool isCOD;
  final DateTime? expiresAt;
  final double? distanceMeters;
  final Map<String, dynamic>? pickup;
  final Map<String, dynamic>? drop;

  DeliveryOffer({
    required this.assignmentId,
    required this.orderId,
    required this.deliveryAddress,
    required this.paymentMethod,
    required this.amount,
    required this.itemCount,
    required this.isCOD,
    required this.expiresAt,
    required this.distanceMeters,
    required this.pickup,
    required this.drop,
  });

  factory DeliveryOffer.fromJson(Map<String, dynamic> j) => DeliveryOffer(
        assignmentId: _s(j['assignmentId']),
        orderId: _s(j['orderId']),
        deliveryAddress: _s(j['deliveryAddress']),
        paymentMethod: _s(j['paymentMethod']),
        amount: _d(j['amount']),
        itemCount: _i(j['itemCount']),
        isCOD: j['isCOD'] == true,
        expiresAt: DateTime.tryParse(_s(j['expiresAt'])),
        distanceMeters: j['distanceMeters'] == null ? null : _d(j['distanceMeters']),
        pickup: j['pickup'] is Map ? Map<String, dynamic>.from(j['pickup']) : null,
        drop: j['drop'] is Map ? Map<String, dynamic>.from(j['drop']) : null,
      );

  int secondsLeft() {
    if (expiresAt == null) return 0;
    final s = expiresAt!.difference(DateTime.now()).inSeconds;
    return s < 0 ? 0 : s;
  }
}

class AppNotification {
  final String id, title, body, type;
  final bool read;
  final DateTime? createdAt;
  AppNotification(this.id, this.title, this.body, this.type, this.read, this.createdAt);
  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        _s(j['_id']),
        _s(j['title']),
        _s(j['body']),
        _s(j['type']).isEmpty ? 'Order' : _s(j['type']),
        j['read'] == true,
        DateTime.tryParse(_s(j['createdAt'])),
      );
}

class OrderItemLine {
  final String name, weightSpec;
  final int quantity;
  final double price;
  OrderItemLine(this.name, this.weightSpec, this.quantity, this.price);
  factory OrderItemLine.fromJson(Map<String, dynamic> j) =>
      OrderItemLine(_s(j['name']), _s(j['weightSpec']), _i(j['quantity'] ?? j['qty']), _d(j['price']));
}

class DeliveryOrder {
  final String orderId, status, customerName, customerPhone, deliveryAddress, paymentMethod, paymentStatus, failureReason;
  final double totalAmount;
  final List<OrderItemLine> items;
  final Map<String, dynamic>? pickup;
  final Map<String, dynamic>? deliveryLocation;
  final List<Map<String, dynamic>> timeline;

  DeliveryOrder({
    required this.orderId,
    required this.status,
    required this.customerName,
    required this.customerPhone,
    required this.deliveryAddress,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.failureReason,
    required this.totalAmount,
    required this.items,
    required this.pickup,
    required this.deliveryLocation,
    required this.timeline,
  });

  bool get isCOD => RegExp(r'cash|cod', caseSensitive: false).hasMatch(paymentMethod);

  factory DeliveryOrder.fromJson(Map<String, dynamic> j) => DeliveryOrder(
        orderId: _s(j['orderId']),
        status: _s(j['status']),
        customerName: _s(j['customerName']),
        customerPhone: _s(j['customerPhone']),
        deliveryAddress: _s(j['deliveryAddress']),
        paymentMethod: _s(j['paymentMethod']),
        paymentStatus: _s(j['paymentStatus']),
        failureReason: _s(j['failureReason']),
        totalAmount: _d(j['totalAmount']),
        items: ((j['items'] as List?) ?? const [])
            .whereType<Map>()
            .map((e) => OrderItemLine.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        pickup: j['pickup'] is Map ? Map<String, dynamic>.from(j['pickup']) : null,
        deliveryLocation: j['deliveryLocation'] is Map ? Map<String, dynamic>.from(j['deliveryLocation']) : null,
        timeline: ((j['trackingTimeline'] as List?) ?? const [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList(),
      );
}
