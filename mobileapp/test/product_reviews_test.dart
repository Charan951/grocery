import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart'
    show apiServiceProvider;
import 'package:freshcart/features/products/presentation/widgets/product_reviews_section.dart';

class _Api extends ApiService {
  final Map<String, dynamic> getResult;
  Object? submitError;
  Map<String, dynamic>? lastSubmit;

  _Api({required this.getResult});

  @override
  Future<Map<String, dynamic>> fetchProductReviews(String productId) async => getResult;

  @override
  Future<Map<String, dynamic>> submitProductReview(String productId,
      {required int rating, String? comment}) async {
    lastSubmit = {'rating': rating, 'comment': comment};
    if (submitError != null) throw submitError!;
    return {'success': true, 'review': {'rating': rating}, 'updated': false};
  }
}

Widget _host(_Api api) => ProviderScope(
      overrides: [apiServiceProvider.overrideWithValue(api)],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        scaffoldMessengerKey: AppToast.messengerKey,
        home: const Scaffold(
          body: SingleChildScrollView(
            child: ProductReviewsSection(productId: 'p1', isDark: false),
          ),
        ),
      ),
    );

void main() {
  testWidgets('renders the summary and approved reviews', (tester) async {
    final api = _Api(getResult: {
      'success': true,
      'summary': {'average': 4.5, 'count': 2, 'distribution': [0, 0, 0, 1, 1]},
      'reviews': [
        {'_id': 'r1', 'customerName': 'Asha', 'rating': 5, 'comment': 'Very fresh'},
        {'_id': 'r2', 'customerName': 'Ravi', 'rating': 4, 'comment': 'Good'},
      ],
    });
    await tester.pumpWidget(_host(api));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('4.5'), findsOneWidget);
    expect(find.text('2 reviews'), findsOneWidget);
    expect(find.text('Very fresh'), findsOneWidget);
    expect(find.text('Asha'), findsOneWidget);
  });

  testWidgets('empty state invites a review', (tester) async {
    final api = _Api(getResult: {
      'success': true,
      'summary': {'average': 0, 'count': 0, 'distribution': [0, 0, 0, 0, 0]},
      'reviews': [],
    });
    await tester.pumpWidget(_host(api));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.textContaining('No reviews yet'), findsOneWidget);
  });

  testWidgets('write sheet surfaces a verified-purchase rejection', (tester) async {
    final api = _Api(getResult: {
      'success': true,
      'summary': {'average': 0, 'count': 0, 'distribution': [0, 0, 0, 0, 0]},
      'reviews': [],
    })
      ..submitError = ApiException('You can review this only after receiving it in an order',
          statusCode: 403);

    await tester.pumpWidget(_host(api));
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Write a review'));
    await tester.pumpAndSettle();

    // Pick 4 stars, then submit.
    await tester.tap(find.byIcon(Icons.star_outline_rounded).at(3));
    await tester.pump();
    await tester.tap(find.text('Submit review'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(api.lastSubmit?['rating'], 4);
    expect(find.textContaining('after receiving it'), findsOneWidget);
  });
}
