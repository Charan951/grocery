import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/pricing.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import 'package:freshcart/features/products/presentation/screens/product_details_screen.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';

class _FakeStorage extends StorageService {
  @override
  bool get isOnboardingCompleted => true;
  @override
  List<dynamic> getCartItems() => const [];
  @override
  Future<void> saveCartItems(List<Map<String, dynamic>> items) async {}
  @override
  List<String> getFavoriteIds() => const [];
  @override
  Future<void> toggleFavorite(String id) async {}
}

ProductModel _p(String id, {int stock = 20, double price = 50, double mrp = 60}) => ProductModel(
      id: id,
      name: 'Tomatoes $id',
      brand: 'FarmCo',
      categoryId: 'veg',
      rating: 4.4,
      reviewsCount: 12,
      price: price,
      mrp: mrp,
      weightOptions: const ['500 g', '1 kg'],
      defaultWeight: '500 g',
      description: 'Fresh vine tomatoes.',
      nutritionFacts: const {'Energy': '18 kcal'},
      ingredients: const [],
      imageUrl: 'https://example.com/$id.jpg',
      stockQuantity: stock,
    );

Widget _host(String id, {ProductModel? product, Object? error}) => ProviderScope(
      overrides: [
        settingsProvider.overrideWith((ref) async => <String, dynamic>{}),
        pricingConfigProvider.overrideWithValue(const PricingConfig()),
        cartProvider.overrideWith((ref) => CartNotifier(_FakeStorage(), ref)),
        wishlistProvider.overrideWith((ref) => WishlistNotifier(_FakeStorage())),
        productDetailProvider.overrideWith((ref, arg) {
          if (error != null) return Future.error(error);
          return Future.value(product ?? _p(arg));
        }),
        similarProductsProvider.overrideWith((ref, arg) async => [_p('sim1'), _p('sim2')]),
      ],
      child: MaterialApp.router(
        theme: AppTheme.lightTheme,
        scaffoldMessengerKey: AppToast.messengerKey,
        routerConfig: GoRouter(
          initialLocation: '/product/$id',
          routes: [
            GoRoute(path: '/product/:id', builder: (_, s) => ProductDetailsScreen(productId: s.pathParameters['id']!)),
            GoRoute(path: '/cart', builder: (_, _) => const Scaffold(body: Text('CART'))),
          ],
        ),
      ),
    );

Future<void> _boot(WidgetTester t, Widget w) async {
  await t.pumpWidget(w);
  await t.pump();
  await t.pump(const Duration(milliseconds: 200));
}

void main() {
  testWidgets('renders name, price, discount and size options', (tester) async {
    await _boot(tester, _host('1', product: _p('1', price: 50, mrp: 100)));
    expect(find.text('Tomatoes 1'), findsOneWidget);
    expect(find.text('₹50'), findsWidgets);
    expect(find.text('50% OFF'), findsOneWidget);
    expect(find.text('1 kg'), findsOneWidget); // size chip
  });

  testWidgets('Add to cart updates the sticky bar to a stepper and toasts', (tester) async {
    await _boot(tester, _host('1'));
    expect(find.text('Add to cart'), findsOneWidget);

    await tester.tap(find.text('Add to cart'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.textContaining('added to cart'), findsOneWidget);
    expect(find.byIcon(Icons.remove_rounded), findsOneWidget);
    expect(find.byIcon(Icons.add_rounded), findsWidgets);
  });

  testWidgets('out-of-stock disables the CTA', (tester) async {
    await _boot(tester, _host('1', product: _p('1', stock: 0)));
    expect(find.text('Out of stock'), findsOneWidget);
    expect(find.text('Add to cart'), findsNothing);
  });

  testWidgets('low stock shows the "Only N left" warning', (tester) async {
    await _boot(tester, _host('1', product: _p('1', stock: 3)));
    expect(find.text('Only 3 left'), findsOneWidget);
  });

  testWidgets('wishlist toggle flips the icon and toasts', (tester) async {
    await _boot(tester, _host('1'));
    expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
    await tester.tap(find.byIcon(Icons.favorite_border_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
    expect(find.text('Added to wishlist'), findsOneWidget);
  });

  testWidgets('error state offers retry', (tester) async {
    await _boot(tester, _host('1', error: ApiException('boom')));
    expect(find.text('Try again'), findsOneWidget);
  });
}
