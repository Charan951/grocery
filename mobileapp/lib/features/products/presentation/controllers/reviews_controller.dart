import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart'
    show apiServiceProvider;

/// One approved customer review of a product.
class ProductReview {
  final String id;
  final String author;
  final int rating;
  final String comment;
  final DateTime? date;

  ProductReview({
    required this.id,
    required this.author,
    required this.rating,
    required this.comment,
    this.date,
  });

  factory ProductReview.fromJson(Map<String, dynamic> j) => ProductReview(
        id: (j['_id'] ?? j['id'] ?? '').toString(),
        author: (j['customerName'] ?? 'Customer').toString(),
        rating: (j['rating'] as num?)?.round() ?? 0,
        comment: (j['comment'] ?? '').toString(),
        date: DateTime.tryParse((j['createdAt'] ?? j['updatedAt'] ?? '').toString()),
      );
}

/// Rating rollup for the product header + the reviews section.
class ReviewSummary {
  final double average;
  final int count;
  final List<int> distribution; // index 0 => 1 star … index 4 => 5 stars

  const ReviewSummary({
    this.average = 0,
    this.count = 0,
    this.distribution = const [0, 0, 0, 0, 0],
  });

  factory ReviewSummary.fromJson(Map<String, dynamic> j) => ReviewSummary(
        average: (j['average'] as num?)?.toDouble() ?? 0,
        count: (j['count'] as num?)?.toInt() ?? 0,
        distribution: (j['distribution'] as List?)
                ?.map((e) => (e as num).toInt())
                .toList()
                .cast<int>() ??
            const [0, 0, 0, 0, 0],
      );
}

class ProductReviews {
  final ReviewSummary summary;
  final List<ProductReview> reviews;
  const ProductReviews({required this.summary, required this.reviews});
}

/// `GET /products/:id/reviews` — approved reviews + summary. Public.
final productReviewsProvider =
    FutureProvider.autoDispose.family<ProductReviews, String>((ref, productId) async {
  final res = await ref.watch(apiServiceProvider).fetchProductReviews(productId);
  final list = (res['reviews'] as List?) ?? const [];
  return ProductReviews(
    summary: ReviewSummary.fromJson(
      Map<String, dynamic>.from((res['summary'] as Map?) ?? const {}),
    ),
    reviews: list
        .map((e) => ProductReview.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(),
  );
});
