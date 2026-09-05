import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
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
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/categories/presentation/screens/categories_screen.dart';
import 'package:freshcart/features/categories/presentation/screens/category_catalog_screen.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

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

ProductModel _p(String id, {bool organic = false, String? subCategory}) => ProductModel(
      id: id,
      name: 'Product $id',
      brand: 'Acme',
      categoryId: 'veg',
      subCategory: subCategory,
      rating: 4.5,
      reviewsCount: 3,
      price: 40,
      mrp: 50,
      weightOptions: const ['1 pc'],
      defaultWeight: '1 pc',
      description: '',
      nutritionFacts: const {},
      ingredients: const [],
      imageUrl: 'https://example.com/$id.jpg',
      isOrganic: organic,
    );

const _veg = CategoryModel(
  id: 'veg',
  name: 'Vegetables',
  icon: 'vegetables',
  color: Colors.green,
  productCount: 2,
  subCategories: ['Leafy greens', 'Root veg'],
);

GoRouter _router({String start = '/categories'}) => GoRouter(
      initialLocation: start,
      routes: [
        GoRoute(path: '/categories', builder: (_, _) => const CategoriesScreen()),
        GoRoute(
          path: '/category/:id',
          builder: (_, s) => CategoryCatalogScreen(
            categoryId: s.pathParameters['id']!,
            initialSubCategory: s.uri.queryParameters['sub'],
          ),
        ),
        GoRoute(path: '/product/:id', builder: (_, s) => Scaffold(body: Text('PDP ${s.pathParameters['id']}'))),
        GoRoute(path: '/cart', builder: (_, _) => const Scaffold(body: Text('CART'))),
      ],
    );

Widget _host(List<Override> overrides, {String start = '/categories'}) => ProviderScope(
      overrides: [
        settingsProvider.overrideWith((ref) async => <String, dynamic>{}),
        pricingConfigProvider.overrideWithValue(const PricingConfig()),
        cartProvider.overrideWith((ref) => CartNotifier(_FakeStorage(), ref)),
        wishlistProvider.overrideWith((ref) => WishlistNotifier(_FakeStorage())),
        ...overrides,
      ],
      child: MaterialApp.router(
        theme: AppTheme.lightTheme,
        scaffoldMessengerKey: AppToast.messengerKey,
        routerConfig: _router(start: start),
      ),
    );

List<Override> _base({
  AsyncValue<List<CategoryModel>>? categories,
  List<ProductModel>? categoryProducts,
}) =>
    [
      allProductsProvider.overrideWith((ref) async => [
            _p('1', subCategory: 'Leafy greens'),
            _p('2', organic: true, subCategory: 'Root veg'),
          ]),
      categoriesProvider.overrideWith((ref) => switch (categories ?? const AsyncData([_veg])) {
            AsyncData(:final value) => Future.value(value),
            AsyncError(:final error) => Future.error(error),
            _ => Future.value(const []),
          }),
      categoryProductsProvider.overrideWith(
          (ref, q) async => categoryProducts ?? [_p('1'), _p('2', organic: true)]),
    ];

Future<void> _boot(WidgetTester t, Widget w) async {
  await t.pumpWidget(w);
  await t.pump();
  await t.pump(const Duration(milliseconds: 200));
}

void main() {
  group('Categories tab', () {
    testWidgets('lists category sections, subcategory tiles and trending chips', (tester) async {
      await _boot(tester, _host(_base()));
      expect(find.text('Vegetables'), findsWidgets);
      expect(find.text('Leafy greens'), findsWidgets);
      expect(find.text('Trending searches'), findsOneWidget);
    });

    testWidgets('tapping a subcategory tile opens the catalog filtered to it', (tester) async {
      await _boot(tester, _host(_base()));
      await tester.tap(find.text('Leafy greens').first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      // Catalog screen shows the sub chip selected + product count line.
      expect(find.textContaining('products'), findsOneWidget);
      expect(find.text('PDP 1'), findsNothing);
    });

    testWidgets('error state offers retry', (tester) async {
      await _boot(tester, _host(_base(categories: AsyncError(ApiException('x'), StackTrace.empty))));
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('empty state when there are no categories', (tester) async {
      await _boot(tester, _host(_base(categories: const AsyncData([]))));
      expect(find.text('No categories yet'), findsOneWidget);
    });
  });

  group('Category catalog', () {
    testWidgets('renders a product grid with a count line', (tester) async {
      await _boot(tester, _host(_base(), start: '/category/veg'));
      expect(find.text('Vegetables'), findsOneWidget); // app bar title
      expect(find.text('2 products'), findsOneWidget);
    });

    testWidgets('respects the initial subcategory from the route', (tester) async {
      final handle = tester.ensureSemantics();
      await _boot(tester, _host(_base(), start: '/category/veg?sub=Root%20veg'));
      final node = tester.getSemantics(find.bySemanticsLabel('Root veg'));
      expect(node.hasFlag(SemanticsFlag.isSelected), isTrue);
      handle.dispose();
    });

    testWidgets('empty result shows a clear-filters affordance', (tester) async {
      await _boot(tester, _host(_base(categoryProducts: const []), start: '/category/veg?sub=Root%20veg'));
      expect(find.text('Clear filters'), findsOneWidget);
    });

    testWidgets('adding a product shows a toast', (tester) async {
      await _boot(tester, _host(_base(), start: '/category/veg'));
      await tester.tap(find.byIcon(Icons.add_rounded).first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.textContaining('added to cart'), findsOneWidget);
    });
  });
}
