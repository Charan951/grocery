import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/pricing.dart';
import 'package:freshcart/core/services/socket_service.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';
import 'package:freshcart/features/orders/presentation/screens/order_detail_screen.dart';
import 'package:freshcart/features/orders/presentation/screens/orders_list_screen.dart';

class _Storage extends StorageService {
  final _cart = <Map<String, dynamic>>[];
  @override
  bool get isOnboardingCompleted => true;
  @override
  List<dynamic> getCartItems() => _cart;
  @override
  Future<void> saveCartItems(List<Map<String, dynamic>> items) async {
    _cart..clear()..addAll(items);
  }
}

Map<String, dynamic> _orderJson({
  required String id,
  required String status,
  int qty = 2,
}) =>
    {
      'orderId': id,
      'status': status,
      'createdAt': '2026-08-20T10:00:00Z',
      'totalAmount': 120,
      'itemTotal': 100,
      'deliveryFee': 0,
      'handlingFee': 5,
      'discount': 0,
      'deliveryAddress': '12 MG Road, Bengaluru',
      'paymentMethod': 'UPI',
      'paymentStatus': 'Paid',
      'items': [
        {'productId': 'p1', 'name': 'Milk', 'price': 30, 'quantity': qty, 'weightSpec': '1 L', 'image': 'https://x/p1.jpg'},
      ],
      'trackingTimeline': [
        {'status': 'Placed', 'note': 'Order received'},
        {'status': 'Packed', 'note': 'Items packed'},
      ],
    };

class _Api extends ApiService {
  final List<Map<String, dynamic>> orders;
  final Object? error;
  _Api({this.orders = const [], this.error});
  @override
  Future<List<Map<String, dynamic>>> fetchMyOrders() async {
    if (error != null) throw error!;
    return orders;
  }
  @override
  Future<Map<String, dynamic>> fetchOrder(String id) async =>
      orders.firstWhere((o) => o['orderId'] == id, orElse: () => _orderJson(id: id, status: 'Delivered'));

  String? cancelledId;
  String? cancelReason;
  @override
  Future<Map<String, dynamic>> cancelOrder(String id, {String? reason}) async {
    cancelledId = id;
    cancelReason = reason;
    return {'success': true, 'refunded': true, 'walletBalance': 270};
  }
}

Widget _host(Widget home, {required _Api api, List<Override> extra = const []}) => ProviderScope(
      overrides: [
        settingsProvider.overrideWith((ref) async => <String, dynamic>{}),
        pricingConfigProvider.overrideWithValue(const PricingConfig()),
        cartProvider.overrideWith((ref) => CartNotifier(_Storage(), ref)),
        apiServiceProvider.overrideWithValue(api),
        ordersProvider.overrideWith((ref) => OrdersNotifier(api, SocketService())),
        ...extra,
      ],
      child: MaterialApp.router(
        theme: AppTheme.lightTheme,
        scaffoldMessengerKey: AppToast.messengerKey,
        routerConfig: GoRouter(routes: [
          GoRoute(path: '/', builder: (_, _) => home),
          GoRoute(path: '/order/:id', builder: (_, s) => OrderDetailScreen(orderId: s.pathParameters['id']!)),
          GoRoute(path: '/tracking/:id', builder: (_, _) => const Scaffold(body: Text('TRACKING'))),
          GoRoute(path: '/cart', builder: (_, _) => const Scaffold(body: Text('CART'))),
          GoRoute(path: '/home', builder: (_, _) => const Scaffold(body: Text('HOME'))),
        ]),
      ),
    );

Future<void> _boot(WidgetTester t, Widget w) async {
  await t.pumpWidget(w);
  await t.pump();
  await t.pump(const Duration(milliseconds: 200));
}

void main() {
  group('Orders list', () {
    testWidgets('empty state', (tester) async {
      await _boot(tester, _host(const OrdersListScreen(), api: _Api(orders: const [])));
      expect(find.text('No orders yet'), findsOneWidget);
    });

    testWidgets('splits active and past, shows Track vs Reorder', (tester) async {
      await _boot(tester, _host(const OrdersListScreen(), api: _Api(orders: [
        _orderJson(id: 'A1', status: 'Out for Delivery'),
        _orderJson(id: 'P1', status: 'Delivered'),
      ])));
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Past orders'), findsOneWidget);
      expect(find.text('Track order'), findsOneWidget);
      expect(find.text('Reorder'), findsOneWidget);
    });

    testWidgets('reorder adds items to the cart and opens it', (tester) async {
      await _boot(tester, _host(const OrdersListScreen(),
          api: _Api(orders: [_orderJson(id: 'P1', status: 'Delivered', qty: 3)])));
      await tester.tap(find.text('Reorder'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('CART'), findsOneWidget);
      expect(find.textContaining('items to cart'), findsOneWidget);
    });

    testWidgets('error state offers retry', (tester) async {
      await _boot(tester, _host(const OrdersListScreen(), api: _Api(error: ApiException('down'))));
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('tapping a card opens the detail', (tester) async {
      await _boot(tester, _host(const OrdersListScreen(),
          api: _Api(orders: [_orderJson(id: 'P1', status: 'Delivered')])));
      await tester.tap(find.text('Details').first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Order #P1'), findsOneWidget);
    });
  });

  group('Order detail', () {
    testWidgets('renders status, timeline, items and bill', (tester) async {
      await _boot(tester, _host(const OrderDetailScreen(orderId: 'P1'),
          api: _Api(orders: [_orderJson(id: 'P1', status: 'Delivered')])));
      expect(find.text('Order #P1'), findsOneWidget);
      expect(find.text('Delivered'), findsWidgets);
      final sc = find.byType(Scrollable).first;
      await tester.scrollUntilVisible(find.text('Placed'), 300, scrollable: sc);
      expect(find.text('Status'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Reorder these items'), 400, scrollable: sc);
    });

    testWidgets('active order shows Track button', (tester) async {
      await _boot(tester, _host(const OrderDetailScreen(orderId: 'A1'),
          api: _Api(orders: [_orderJson(id: 'A1', status: 'Out for Delivery')])));
      await tester.scrollUntilVisible(find.text('Track this order'), 400,
          scrollable: find.byType(Scrollable).first);
      expect(find.text('Track this order'), findsOneWidget);
    });

    testWidgets('error offers retry', (tester) async {
      final api = _Api();
      await _boot(tester, _host(const OrderDetailScreen(orderId: 'ZZ'), api: api, extra: [
        orderDetailProvider('ZZ').overrideWith((ref) => Future.error(ApiException('nope'))),
      ]));
      await tester.pump(const Duration(milliseconds: 200));
      expect(find.text('Try again'), findsOneWidget);
    });
  });
}
