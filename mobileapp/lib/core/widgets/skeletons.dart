import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:shimmer/shimmer.dart';

/// Composed skeleton placeholders. Primitive box lives in `feedback_states.dart`
/// as [LoadingSkeleton]; these wrap it into common page shapes so screens don't
/// re-roll their own loading layouts.

/// Wrap a subtree of [SkeletonBox]/[SkeletonLine] in one shimmer sweep.
class SkeletonGroup extends StatelessWidget {
  final Widget child;
  const SkeletonGroup({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[850]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[800]! : Colors.grey[100]!,
      child: child,
    );
  }
}

class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final BorderRadius borderRadius;
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = AppRadius.brSm,
  });

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(color: Colors.white, borderRadius: borderRadius),
      );
}

class SkeletonLine extends StatelessWidget {
  final double widthFactor;
  final double height;
  const SkeletonLine({super.key, this.widthFactor = 1.0, this.height = 12});

  @override
  Widget build(BuildContext context) => FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: widthFactor,
        child: SkeletonBox(height: height, borderRadius: BorderRadius.circular(6)),
      );
}

/// Placeholder matching the product card footprint.
class SkeletonProductCard extends StatelessWidget {
  const SkeletonProductCard({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          SkeletonBox(height: 120, borderRadius: AppRadius.brMd),
          SizedBox(height: 10),
          SkeletonLine(widthFactor: 0.9),
          SizedBox(height: 6),
          SkeletonLine(widthFactor: 0.55),
          SizedBox(height: 10),
          SkeletonLine(widthFactor: 0.4, height: 16),
        ],
      ),
    );
  }
}

/// A vertical list of generic rows.
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final EdgeInsets padding;
  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.itemHeight = 72,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonGroup(
      child: ListView.separated(
        padding: padding,
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        itemCount: itemCount,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, _) => Row(
          children: [
            SkeletonBox(width: itemHeight - 8, height: itemHeight - 8, borderRadius: AppRadius.brMd),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SkeletonLine(widthFactor: 0.8),
                  SizedBox(height: 8),
                  SkeletonLine(widthFactor: 0.5),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A grid of [SkeletonProductCard]s.
class SkeletonGrid extends StatelessWidget {
  final int itemCount;
  final int crossAxisCount;
  final double childAspectRatio;
  final EdgeInsets padding;
  const SkeletonGrid({
    super.key,
    this.itemCount = 6,
    this.crossAxisCount = 2,
    this.childAspectRatio = 0.70,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: padding,
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: itemCount,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: childAspectRatio,
      ),
      itemBuilder: (_, _) => const SkeletonProductCard(),
    );
  }
}
