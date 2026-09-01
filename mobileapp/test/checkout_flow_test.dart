import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/pricing.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/cart/presentation/screens/cart_screen.dart';
import 'package:freshcart/features/checkout/presentation/controllers/checkout_controller.dart';
import 'package:freshcart/features/checkout/presentation/screens/checkout_screen.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/orders/presentation/screens/order_placed_screen.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

ProductModel _p(String id) => ProductModel(
      id: id,
      name: 'Bananas $id',
      brand: 'Farm',
      categoryId: 'fruit',
      rating: 4.5,
      reviewsCount: 3,
      price: 40,
      mrp: 50,
      weightOptions: const ['1 dozen'],
      defaultWeight: '1 dozen',
      description: '',
      nutritionFacts: const {},
      ingredients: const [],
      imageUrl: 'x',
    );

class _Storage extends StorageService {
  final List<Map<String, dynamic>> _cart;
  _Storage({List<CartItemModel> items = const []})
      : _cart = items.map((e) => e.toJson()).toList();
  @override
  bool get isOnboardingCompleted => true;
  @override
  List<dynamic> getCartItems() => _cart;
  @override
  Future<void> saveCartItems(List<Map<String, dynamic>> items) async {
    _cart
      ..clear()
      ..addAll(items);
  }
}

class _Api extends ApiService {
  @override
  Future<Map<String, dynamic>> fetchMe() async => throw Exception('no');
  @override
  Future<Map<String, dynamic>> validateCoupon(String code, num subtotal) async =>
      {'valid': true, 'code': code, 'discount': 10, 'message': 'Coupon applied'};
}

class _FakeCheckout extends CheckoutController {
  _FakeCheckout(super.ref);
  PaymentMethod? submittedMethod;
  @override
  Future<void> submit({required PaymentMethod method, required String address}) async {
    submittedMethod = method;
  }
}

AuthNotifier _auth({Map<String, dynamic>? address}) {
  final n = AuthNotifier(_Storage(), _Api(), _NoToken());
  if (address != null) {
    n.state = n.state.copyWith(
      isAuthenticated: true,
      user: UserProfile(
        name: 'A', phone: '+91 9', walletBalance: 0, isVip: false,
        addresses: [address], selectedAddress: address,
      ),
    );
  }
  return n;
}

class _NoToken extends TokenStore {
  @override
  String? get token => null;
  @override
  bool get hasToken => false;
  @override
  Future<String?> load() async => null;
  @override
  Future<void> save(String t) async {}
  @override
  Future<void> clear() async {}
}

Widget _host(Widget home, {List<Override> overrides = const []}) => ProviderScope(
      overrides: [
        settingsProvider.overrideWith((ref) async => <String, dynamic>{}),
        pricingConfigProvider.overrideWithValue(const PricingConfig()),
        apiServiceProvider.overrideWithValue(_Api()),
        couponsProvider.overrideWith((ref) async => const []),
        ...overrides,
      ],
      child: MaterialApp.router(
        theme: AppTheme.lightTheme,
        scaffoldMessengerKey: AppToast.messengerKey,
        routerConfig: GoRouter(initialLocation: '/start', routes: [
          GoRoute(path: '/start', builder: (_, _) => home),
          GoRoute(path: '/', builder: (_, _) => const Scaffold(body: Text('HOME'))),
          GoRoute(path: '/checkout', builder: (_, _) => const Scaffold(body: Text('CHECKOUT'))),
          GoRoute(path: '/addresses', builder: (_, _) => const Scaffold(body: Text('ADDRESSES'))),
          GoRoute(path: '/orders', builder: (_, _) => const Scaffold(body: Text('ORDERS'))),
          GoRoute(path: '/tracking/:id', builder: (_, _) => const Scaffold(body: Text('TRACKING'))),
        ]),
      ),
    );

Future<void> _boot(WidgetTester t, Widget w) async {
  await t.pumpWidget(w);
  await t.pump();
  await t.pump(const Duration(milliseconds: 200));
}

void main() {
  group('Cart', () {
    testWidgets('empty cart shows the empty state', (tester) async {
      await _boot(tester, _host(const CartScreen(), overrides: [
        cartProvider.overrideWith((ref) => CartNotifier(_Storage(), ref)),
        authProvider.overrideWith((ref) => _auth()),
      ]));
      expect(find.text('Your cart is empty'), findsOneWidget);
    });

    testWidgets('with items: rows, bill details and a Checkout bar', (tester) async {
      final storage = _Storage(items: [
        CartItemModel(product: _p('1'), quantity: 2, selectedWeight: '1 dozen'),
      ]);
      await _boot(tester, _host(const CartScreen(), overrides: [
        cartProvider.overrideWith((ref) => CartNotifier(storage, ref)),
        authProvider.overrideWith((ref) => _auth()),
      ]));
      expect(find.text('Bananas 1'), findsOneWidget);
      expect(find.text('2'), findsWidgets); // stepper qty
      expect(find.text('Checkout'), findsOneWidget); // bottom bar, always mounted
      // Bill details sits below the free-delivery bar / savings / coupon block.
      await tester.scrollUntilVisible(find.text('Bill details'), 300,
          scrollable: find.byType(Scrollable).first);
      expect(find.text('Bill details'), findsOneWidget);
    });

    testWidgets('stepper + adds a unit', (tester) async {
      final storage = _Storage(items: [
        CartItemModel(product: _p('1'), quantity: 1, selectedWeight: '1 dozen'),
      ]);
      await _boot(tester, _host(const CartScreen(), overrides: [
        cartProvider.overrideWith((ref) => CartNotifier(storage, ref)),
        authProvider.overrideWith((ref) => _auth()),
      ]));
      await tester.tap(find.byIcon(Icons.add_rounded).first);
      await tester.pump();
      expect(find.text('2'), findsWidgets);
    });

    testWidgets('Clear asks for confirmation', (tester) async {
      final storage = _Storage(items: [
        CartItemModel(product: _p('1'), quantity: 1, selectedWeight: '1 dozen'),
      ]);
      await _boot(tester, _host(const CartScreen(), overrides: [
        cartProvider.overrideWith((ref) => CartNotifier(storage, ref)),
        authProvider.overrideWith((ref) => _auth()),
      ]));
      await tester.tap(find.text('Clear'));
      await tester.pumpAndSettle();
      expect(find.text('Clear cart?'), findsOneWidget);
    });
  });

  group('Checkout', () {
    testWidgets('place order without an address shows an error toast', (tester) async {
      final storage = _Storage(items: [
        CartItemModel(product: _p('1'), quantity: 1, selectedWeight: '1 dozen'),
      ]);
      await _boot(tester, _host(const CheckoutScreen(), overrides: [
        cartProvider.overrideWith((ref) => CartNotifier(storage, ref)),
        authProvider.overrideWith((ref) => _auth()),
      ]));
      await tester.tap(find.text('Place order'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Add a delivery address to continue'), findsOneWidget);
    });

    testWidgets('COD selection then place order submits with the COD method', (tester) async {
      final storage = _Storage(items: [
        CartItemModel(product: _p('1'), quantity: 1, selectedWeight: '1 dozen'),
      ]);
      late _FakeCheckout fake;
      await _boot(tester, _host(const CheckoutScreen(), overrides: [
        cartProvider.overrideWith((ref) => CartNotifier(storage, ref)),
        authProvider.overrideWith((ref) => _auth(address: {
              'name': 'Home',
              'addressLine': '12 MG Road',
            })),
        checkoutControllerProvider.overrideWith((ref) => fake = _FakeCheckout(ref)),
      ]));
      await tester.scrollUntilVisible(find.text('Cash on delivery'), 300,
          scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Cash on delivery'));
      await tester.pump();
      await tester.tap(find.text('Place order'));
      await tester.pump();
      expect(fake.submittedMethod, PaymentMethod.cod);
    });
  });

  group('Order placed', () {
    testWidgets('shows confirmation, ETA and actions; hardware back goes home', (tester) async {
      await _boot(tester, _host(const OrderPlacedScreen(orderId: 'ORD123')));
      expect(find.text('Order placed'), findsOneWidget);
      expect(find.textContaining('ORD123'), findsOneWidget);
      expect(find.text('Arriving in ~8 minutes'), findsOneWidget);
      expect(find.text('Track order'), findsOneWidget);

      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('HOME'), findsOneWidget);
    });
  });
}
