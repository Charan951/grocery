import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/features/orders/data/models/order_model.dart';

void main() {
  group('orderStatusFrom', () {
    test('maps the backend enum onto the 5 app buckets', () {
      expect(orderStatusFrom('Pending'), OrderStatus.placed);
      expect(orderStatusFrom('Packed'), OrderStatus.processing);
      expect(orderStatusFrom('Out For Delivery'), OrderStatus.dispatched);
      expect(orderStatusFrom('In Transit'), OrderStatus.dispatched);
      expect(orderStatusFrom('Delivered'), OrderStatus.delivered);
      expect(orderStatusFrom('Returned'), OrderStatus.cancelled);
      expect(orderStatusFrom('something-else'), OrderStatus.placed);
    });
  });

  group('OrderModel.fromServerJson', () {
    test('parses a real backend Order document', () {
      final o = OrderModel.fromServerJson({
        'orderId': 'PNNHJHTYP123456',
        'createdAt': '2026-08-31T10:00:00.000Z',
        'status': 'Packed',
        'paymentMethod': 'COD',
        'paymentStatus': 'Pending',
        'itemTotal': 100,
        'totalAmount': 145,
        'deliveryFee': 40,
        'handlingFee': 5,
        'discount': 0,
        'deliveryAddress': '12B Indiranagar',
        'items': [
          {'productId': 'p1', 'name': 'Milk', 'quantity': 2, 'price': 50, 'weightSpec': '500 g', 'image': 'https://x/m.png'},
        ],
        'trackingTimeline': [
          {'status': 'Pending', 'note': 'Order received', 'at': '2026-08-31T10:00:00.000Z'},
          {'status': 'Packed', 'note': 'Packed by store', 'at': '2026-08-31T10:05:00.000Z'},
        ],
      });

      expect(o.id, 'PNNHJHTYP123456');
      expect(o.status, OrderStatus.processing);
      expect(o.statusRaw, 'Packed');
      expect(o.isActive, isTrue);
      expect(o.total, 145);
      expect(o.subtotal, 100);
      expect(o.deliveryFee, 40);
      expect(o.platformFee, 5);
      expect(o.items.single.product.name, 'Milk');
      expect(o.items.single.quantity, 2);
      expect(o.timeline.length, 2);
      expect(o.timeline.last.status, 'Packed');
      expect(o.paymentMethod, 'COD');
    });

    test('tolerates a minimal document', () {
      final o = OrderModel.fromServerJson({'orderId': 'X1', 'status': 'Delivered'});
      expect(o.id, 'X1');
      expect(o.status, OrderStatus.delivered);
      expect(o.isActive, isFalse);
      expect(o.items, isEmpty);
      expect(o.timeline, isEmpty);
      expect(o.total, 0);
    });

    test('local toJson <-> fromJson round-trip keeps status', () {
      final o = OrderModel.fromServerJson({
        'orderId': 'X2', 'status': 'Pending', 'totalAmount': 50,
      });
      final again = OrderModel.fromJson(o.toJson());
      expect(again.id, 'X2');
      expect(again.status, OrderStatus.placed);
      expect(again.total, 50);
    });
  });
}
