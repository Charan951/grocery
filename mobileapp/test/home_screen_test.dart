import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/pricing.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/home/presentation/screens/home_screen.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';

class _FakeStorage extends StorageService {
  @override
  bool get isOnboardingCompleted => true;
  @override
  Future<void> completeOnboarding() async {}
  @override
  List<dynamic> getCartItems() => const [];
  @override
  Future<void> saveCartItems(List<Map<String, dynamic>> items) async {}
  @override
  List<String> getFavoriteIds() => const [];
  @override
  Future<void> toggleFavorite(String id) async {}
}

class _FakeTokenStore extends TokenStore {
  @override
  String? get token => null;
  @override
  bool get hasToken => false;
  @override
  Future<String?> load() async => null;
  @override
  Future<void> save(String token) async {}
  @override
  Future<void> clear() async {}
}

class _FakeApi extends ApiService {
  @override
  Future<Map<String, dynamic>> fetchMe() async => throw ApiException('no', statusCode: 401);
}

AuthNotifier _auth() => AuthNotifier(_FakeStorage(), _FakeApi(), _FakeTokenStore());

ProductModel _p(String id, String cat, {bool fresh = false, bool organic = false, bool best = false}) =>
    ProductModel(
      id: id,
      name: 'Product $id',
      brand: 'Acme',
      categoryId: cat,
      rating: 4.5,
      reviewsCount: 10,
      price: 50,
      mrp: 60,
      weightOptions: const ['1 pc'],
      defaultWeight: '1 pc',
      description: '',
      nutritionFacts: const {},
      ingredients: const [],
      imageUrl: 'https://example.com/$id.jpg',
      isFreshPick: fresh,
      isOrganic: organic,
      isBestSeller: best,
    );

const _cat = CategoryModel(id: 'veg', name: 'Vegetables', icon: 'vegetables', color: Colors.green, productCount: 3);

Widget _host({
  required List<Override> overrides,
  GoRouter? router,
}) {
  final r = router ??
      GoRouter(routes: [
        GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
        GoRoute(path: '/product/:id', builder: (_, s) => Scaffold(body: Text('PDP ${s.pathParameters['id']}'))),
        GoRoute(path: '/category/:id', builder: (_, s) => Scaffold(body: Text('CAT ${s.pathParameters['id']}'))),
        GoRoute(path: '/search', builder: (_, _) => const Scaffold(body: Text('SEARCH'))),
        GoRoute(path: '/cart', builder: (_, _) => const Scaffold(body: Text('CART'))),
        GoRoute(path: '/location_select', builder: (_, _) => const Scaffold(body: Text('LOC'))),
        GoRoute(path: '/account', builder: (_, _) => const Scaffold(body: Text('ACCOUNT'))),
      ]);
  return ProviderScope(
    overrides: [
      settingsProvider.overrideWith((ref) async => <String, dynamic>{}),
      pricingConfigProvider.overrideWithValue(const PricingConfig()),
      authProvider.overrideWith((ref) => _auth()),
      cartProvider.overrideWith((ref) => CartNotifier(_FakeStorage(), ref)),
      wishlistProvider.overrideWith((ref) => WishlistNotifier(_FakeStorage())),
      ...overrides,
    ],
    child: MaterialApp.router(
      theme: AppTheme.lightTheme,
      scaffoldMessengerKey: AppToast.messengerKey,
      routerConfig: r,
    ),
  );
}

List<Override> _catalog({
  AsyncValue<List<CategoryModel>>? categories,
  AsyncValue<List<ProductModel>>? products,
}) =>
    [
      bannersProvider.overrideWith((ref) async => const []),
      specialGroupsProvider.overrideWith((ref) async => const []),
      categoriesProvider.overrideWith((ref) => switch (categories ?? AsyncData([_cat])) {
            AsyncData(:final value) => Future.value(value),
            AsyncError(:final error) => Future.error(error),
            _ => Completer<List<CategoryModel>>().future,
          }),
      allProductsProvider.overrideWith((ref) => switch (products ??
              AsyncData([_p('1', 'veg', fresh: true), _p('2', 'veg', organic: true), _p('3', 'veg', best: true)])) {
            AsyncData(:final value) => Future.value(value),
            AsyncError(:final error) => Future.error(error),
            _ => Completer<List<ProductModel>>().future,
          }),
    ];

void main() {
  Future<void> boot(WidgetTester tester, {List<Override>? overrides}) async {
    await tester.pumpWidget(_host(overrides: overrides ?? _catalog()));
    await tester.pump(); // resolve future providers
    await tester.pump(const Duration(milliseconds: 200));
  }

  testWidgets('renders curated rails and category shelf on success', (tester) async {
    await boot(tester);

    expect(find.text('Shop by category'), findsOneWidget);
    expect(find.text('Fresh today'), findsOneWidget);
    expect(find.text('Vegetables'), findsWidgets); // category chip (top strip)

    final scroller = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(find.text('Organic collection'), 400, scrollable: scroller);
    expect(find.text('Organic collection'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Best sellers'), 400, scrollable: scroller);
    expect(find.text('Best sellers'), findsOneWidget);
  });

  testWidgets('tapping a product opens its detail route', (tester) async {
    await boot(tester);

    await tester.tap(find.text('Product 1').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('PDP 1'), findsOneWidget);
  });

  testWidgets('adding a product shows a confirmation toast', (tester) async {
    await boot(tester);

    await tester.tap(find.byIcon(Icons.add_rounded).first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.textContaining('added to cart'), findsOneWidget);
  });

  testWidgets('shows a retry-able error when both catalog calls fail', (tester) async {
    await boot(tester, overrides: _catalog(
      categories: AsyncError(ApiException('down'), StackTrace.empty),
      products: AsyncError(ApiException('down'), StackTrace.empty),
    ));

    expect(find.text('Try again'), findsOneWidget);
  });

  testWidgets('shows an empty state when the catalog is bare', (tester) async {
    await boot(tester, overrides: _catalog(
      categories: const AsyncData([]),
      products: const AsyncData([]),
    ));

    expect(find.text('Store is being stocked'), findsOneWidget);
  });
}
