import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

void main() {
  group('PartnerProfile.fromJson', () {
    test('parses fields and applies defaults', () {
      final p = PartnerProfile.fromJson({
        'userId': 'u1',
        'name': 'Ravi',
        'email': 'ravi@x.com',
        'phone': '9876543210',
        'isOnline': true,
        'activeOrderIds': ['ORD1', 'ORD2'],
        'completedCount': 12,
      });
      expect(p.userId, 'u1');
      expect(p.name, 'Ravi');
      expect(p.isOnline, true);
      expect(p.activeOrderIds, ['ORD1', 'ORD2']);
      expect(p.completedCount, 12);
      expect(p.vehicleType, 'bike'); // default
      expect(p.availability, 'offline'); // default
      expect(p.rating, 5); // default
    });
  });

  group('DeliveryOffer', () {
    test('secondsLeft clamps to zero for past expiry', () {
      final o = DeliveryOffer.fromJson({
        'assignmentId': 'a1',
        'orderId': 'ORD1',
        'expiresAt': DateTime.now().subtract(const Duration(seconds: 5)).toIso8601String(),
      });
      expect(o.secondsLeft(), 0);
    });

    test('secondsLeft is positive for future expiry', () {
      final o = DeliveryOffer.fromJson({
        'assignmentId': 'a1',
        'orderId': 'ORD1',
        'expiresAt': DateTime.now().add(const Duration(seconds: 20)).toIso8601String(),
      });
      expect(o.secondsLeft(), greaterThan(10));
      expect(o.secondsLeft(), lessThanOrEqualTo(20));
    });

    test('isCOD flag parsed', () {
      final o = DeliveryOffer.fromJson({'assignmentId': 'a', 'orderId': 'o', 'isCOD': true});
      expect(o.isCOD, true);
    });
  });

  group('AppNotification.fromJson', () {
    test('parses fields and defaults type', () {
      final n = AppNotification.fromJson({
        '_id': 'n1', 'title': 'New delivery offer', 'body': 'Order ORD1', 'read': false,
        'createdAt': DateTime.now().toIso8601String(),
      });
      expect(n.id, 'n1');
      expect(n.type, 'Order'); // default when absent
      expect(n.read, false);
      expect(n.createdAt, isNotNull);
    });
  });

  group('DeliveryOrder.fromJson', () {
    test('maps items, timeline and COD detection', () {
      final d = DeliveryOrder.fromJson({
        'orderId': 'ORD9',
        'status': 'Out For Delivery',
        'customerName': 'Asha',
        'customerPhone': '98••••10',
        'paymentMethod': 'Cash on Delivery',
        'totalAmount': 349.5,
        'items': [
          {'name': 'Milk', 'qty': 2, 'price': 30},
        ],
        'trackingTimeline': [
          {'status': 'Assigned', 'note': 'x'},
        ],
      });
      expect(d.orderId, 'ORD9');
      expect(d.items.single.name, 'Milk');
      expect(d.items.single.quantity, 2);
      expect(d.timeline.length, 1);
      expect(d.isCOD, true);
      expect(d.totalAmount, 349.5);
    });
  });
}
