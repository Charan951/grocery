import 'package:flutter/material.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/widgets/product_card.dart';
import 'package:freshcart/core/widgets/section_header.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

/// A titled horizontal shelf of [ProductCard]s used throughout Home.
class ProductRail extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<ProductModel> products;
  final VoidCallback? onSeeAll;
  final ValueChanged<ProductModel> onOpen;
  final ValueChanged<ProductModel> onAdd;

  const ProductRail({
    super.key,
    required this.title,
    this.subtitle,
    required this.products,
    this.onSeeAll,
    required this.onOpen,
    required this.onAdd,
  });

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, subtitleGap),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SectionHeader(
                title: title,
                padding: EdgeInsets.zero,
                actionText: onSeeAll != null ? 'See all' : null,
                onAction: onSeeAll,
              ),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    subtitle!,
                    style: AppTypography.bodySmall(
                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                    ),
                  ),
                ),
            ],
          ),
        ),
        SizedBox(
          height: 198,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            physics: const BouncingScrollPhysics(),
            itemCount: products.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final p = products[i];
              return ProductCard(
                product: p,
                width: 135.0,
                onTap: () => onOpen(p),
                onAdd: () => onAdd(p),
              );
            },
          ),
        ),
      ],
    );
  }

  static const double subtitleGap = 10;
}

/// Loading placeholder matching [ProductRail]'s footprint.
class ProductRailSkeleton extends StatelessWidget {
  const ProductRailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SkeletonLine(widthFactor: 0.4, height: 18),
          ),
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 4,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, _) => const SizedBox(width: 165, child: SkeletonProductCard()),
            ),
          ),
        ],
      ),
    );
  }
}
