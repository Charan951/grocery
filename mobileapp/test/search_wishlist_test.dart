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
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';
import 'package:freshcart/features/search/presentation/controllers/search_controller.dart';
import 'package:freshcart/features/search/presentation/screens/search_screen.dart';
import 'package:freshcart/features/wishlist/presentation/controllers/wishlist_controller.dart';
import 'package:freshcart/features/wishlist/presentation/screens/wishlist_screen.dart';

class _FakeStorage extends StorageService {
  final _recents = <String>[];
  final _favs = <String>[];
  _FakeStorage({List<String>? favs}) {
    if (favs != null) _favs.addAll(favs);
  }
  @override
  bool get isOnboardingCompleted => true;
  @override
  List<dynamic> getCartItems() => const [];
  @override
  Future<void> saveCartItems(List<Map<String, dynamic>> items) async {}
  @override
  List<String> getRecentSearches() => List.of(_recents);
  @override
  Future<void> addRecentSearch(String term) async {
    _recents.remove(term);
    _recents.insert(0, term);
  }
  @override
  Future<void> clearRecentSearches() async => _recents.clear();
  @override
  List<String> getFavoriteIds() => List.of(_favs);
  @override
  Future<void> toggleFavorite(String id) async =>
      _favs.contains(id) ? _favs.remove(id) : _favs.add(id);
}

ProductModel _p(String id) => ProductModel(
      id: id,
      name: 'Milk $id',
      brand: 'Amul',
      categoryId: 'dairy',
      rating: 4.5,
      reviewsCount: 5,
      price: 30,
      mrp: 35,
      weightOptions: const ['1 L'],
      defaultWeight: '1 L',
      description: '',
      nutritionFacts: const {},
      ingredients: const [],
      imageUrl: 'https://example.com/$id.jpg',
    );

const _cat = CategoryModel(
  id: 'dairy',
  name: 'Dairy',
  icon: 'dairy',
  color: Colors.blue,
  productCount: 2,
  subCategories: ['Milk', 'Curd'],
);

Widget _host({
  required Widget home,
  List<ProductModel>? searchResults,
  List<ProductModel>? allProducts,
  Object? allProductsError,
  _FakeStorage? storage,
}) {
  final s = storage ?? _FakeStorage();
  return ProviderScope(
    overrides: [
      settingsProvider.overrideWith((ref) async => <String, dynamic>{}),
      pricingConfigProvider.overrideWithValue(const PricingConfig()),
      cartProvider.overrideWith((ref) => CartNotifier(s, ref)),
      recentSearchesProvider.overrideWith((ref) => RecentSearchesNotifier(s)),
      wishlistProvider.overrideWith((ref) => WishlistNotifier(s)),
      categoriesProvider.overrideWith((ref) async => const [_cat]),
      allProductsProvider.overrideWith((ref) {
        if (allProductsError != null) return Future.error(allProductsError);
        return Future.value(allProducts ?? [_p('1'), _p('2')]);
      }),
      searchProductsProvider.overrideWith((ref, q) async => searchResults ?? [_p('1')]),
    ],
    child: MaterialApp.router(
      theme: AppTheme.lightTheme,
      scaffoldMessengerKey: AppToast.messengerKey,
      routerConfig: GoRouter(routes: [
        GoRoute(path: '/', builder: (_, _) => home),
        GoRoute(path: '/product/:id', builder: (_, s) => Scaffold(body: Text('PDP ${s.pathParameters['id']}'))),
        GoRoute(path: '/cart', builder: (_, _) => const Scaffold(body: Text('CART'))),
      ]),
    ),
  );
}

Future<void> _boot(WidgetTester t, Widget w) async {
  await t.pumpWidget(w);
  await t.pump();
  await t.pump(const Duration(milliseconds: 250));
}

void main() {
  group('Search', () {
    testWidgets('empty query shows trending terms from the live catalog', (tester) async {
      await _boot(tester, _host(home: const SearchScreen()));
      expect(find.text('Trending'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'Dairy'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'Milk'), findsOneWidget);
    });

    testWidgets('tapping a term runs the search, records a recent, and shows results', (tester) async {
      await _boot(tester, _host(home: const SearchScreen()));
      await tester.tap(find.widgetWithText(ActionChip, 'Curd'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.textContaining('result'), findsOneWidget);
      expect(find.text('Milk 1'), findsOneWidget);

      // clearing the query returns to discovery with the recent recorded
      await tester.tap(find.byIcon(Icons.close_rounded));
      await tester.pump();
      expect(find.text('Recent'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'Curd'), findsWidgets);
    });

    testWidgets('no results shows the empty state', (tester) async {
      await _boot(tester, _host(home: const SearchScreen(), searchResults: const []));
      await tester.enterText(find.byType(TextField), 'zzz');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pump();
      expect(find.text('No matches found'), findsOneWidget);
    });
  });

  group('Wishlist', () {
    testWidgets('empty state when nothing is saved', (tester) async {
      await _boot(tester, _host(home: const WishlistScreen()));
      expect(find.text('Your wishlist is empty'), findsOneWidget);
    });

    testWidgets('lists saved products with a count and a remove control', (tester) async {
      final storage = _FakeStorage(favs: ['1', '2']);
      await _boot(tester, _host(home: const WishlistScreen(), storage: storage));
      expect(find.text('2 items saved'), findsOneWidget);
      expect(find.text('Milk 1'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close_rounded).first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('1 item saved'), findsOneWidget);
      expect(find.text('Removed from wishlist'), findsOneWidget);
    });

    testWidgets('"Add all" adds every saved product to the cart', (tester) async {
      final storage = _FakeStorage(favs: ['1', '2']);
      await _boot(tester, _host(home: const WishlistScreen(), storage: storage));
      await tester.tap(find.text('Add all'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.textContaining('Added 2 items to cart'), findsOneWidget);
    });

    testWidgets('error state offers retry', (tester) async {
      await _boot(tester, _host(home: const WishlistScreen(), allProductsError: ApiException('x')));
      expect(find.text('Try again'), findsOneWidget);
    });
  });
}
