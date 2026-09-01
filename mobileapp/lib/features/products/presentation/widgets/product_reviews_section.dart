import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_bottom_sheet.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart'
    show apiServiceProvider;
import 'package:freshcart/features/products/presentation/controllers/reviews_controller.dart';

/// PDP "Ratings & reviews" block — reads `productReviewsProvider`, and lets a
/// verified purchaser open a bottom sheet to submit one (`POST /products/:id/reviews`).
class ProductReviewsSection extends ConsumerWidget {
  final String productId;
  final bool isDark;
  const ProductReviewsSection({super.key, required this.productId, required this.isDark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final async = ref.watch(productReviewsProvider(productId));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Ratings & reviews', style: AppTypography.title(textColor)),
            TextButton(
              onPressed: () => _openWriteSheet(context, ref),
              child: const Text('Write a review'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        async.when(
          loading: () => const SkeletonGroup(
            child: SkeletonBox(height: 88, borderRadius: AppRadius.brLg),
          ),
          error: (_, _) => Text(
            'Could not load reviews right now.',
            style: AppTypography.bodySmall(subColor),
          ),
          data: (data) {
            if (data.summary.count == 0) {
              return Text(
                'No reviews yet. Received this item? Be the first to review it.',
                style: AppTypography.bodySmall(subColor).copyWith(height: 1.5),
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(data.summary.average.toStringAsFixed(1),
                        style: AppTypography.h1(textColor)),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Stars(rating: data.summary.average.round()),
                        const SizedBox(height: 2),
                        Text(
                          '${data.summary.count} '
                          '${data.summary.count == 1 ? 'review' : 'reviews'}',
                          style: AppTypography.bodySmall(subColor),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                for (final r in data.reviews.take(5))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            _Stars(rating: r.rating, size: 13),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(r.author,
                                  style: AppTypography.labelMedium(textColor),
                                  overflow: TextOverflow.ellipsis),
                            ),
                          ],
                        ),
                        if (r.comment.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(r.comment,
                              style: AppTypography.bodySmall(subColor).copyWith(height: 1.5)),
                        ],
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _openWriteSheet(BuildContext context, WidgetRef ref) async {
    final submitted = await AppBottomSheet.show<bool>(
      context,
      title: 'Write a review',
      child: _WriteReviewSheet(productId: productId),
    );
    if (submitted == true) ref.invalidate(productReviewsProvider(productId));
  }
}

class _Stars extends StatelessWidget {
  final int rating;
  final double size;
  const _Stars({required this.rating, this.size = 16});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            i <= rating ? Icons.star_rounded : Icons.star_outline_rounded,
            size: size,
            color: AppColors.warningText,
          ),
      ],
    );
  }
}

class _WriteReviewSheet extends ConsumerStatefulWidget {
  final String productId;
  const _WriteReviewSheet({required this.productId});

  @override
  ConsumerState<_WriteReviewSheet> createState() => _WriteReviewSheetState();
}

class _WriteReviewSheetState extends ConsumerState<_WriteReviewSheet> {
  int _rating = 0;
  final _comment = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating < 1) {
      setState(() => _error = 'Tap a star to rate this product');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiServiceProvider).submitProductReview(
            widget.productId,
            rating: _rating,
            comment: _comment.text,
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      AppToast.success(res['updated'] == true
          ? 'Review updated · pending approval'
          : 'Thanks! Your review is pending approval');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not submit your review. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Only customers who received this item can review it.',
            style: AppTypography.bodySmall(subColor)),
        const SizedBox(height: 12),
        Row(
          children: [
            for (var i = 1; i <= 5; i++)
              IconButton(
                onPressed: _busy ? null : () => setState(() => _rating = i),
                iconSize: 32,
                padding: const EdgeInsets.symmetric(horizontal: 2),
                constraints: const BoxConstraints(),
                icon: Icon(
                  i <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                  color: AppColors.warningText,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        AppTextField(
          controller: _comment,
          label: 'Your review (optional)',
          hintText: 'How was the quality, freshness, packaging?',
          maxLines: 4,
          maxLength: 1000,
          enabled: !_busy,
          errorText: _error,
        ),
        const SizedBox(height: 12),
        PrimaryButton(
          text: 'Submit review',
          isLoading: _busy,
          onPressed: _submit,
        ),
      ],
    );
  }
}
