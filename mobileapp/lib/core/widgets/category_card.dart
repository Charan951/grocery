import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';

class CategoryCard extends StatelessWidget {
  final CategoryModel category;
  final VoidCallback onTap;

  const CategoryCard({
    super.key,
    required this.category,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final hasNetworkImage = category.imageUrl.trim().startsWith('http');

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 76,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            GlassCard(
              width: 72,
              height: 72,
              borderRadius: 24,
              color: category.color.withOpacity(isDark ? 0.12 : 0.08),
              borderColor: category.color.withOpacity(isDark ? 0.25 : 0.15),
              padding: EdgeInsets.zero,
              child: Center(
                child: hasNetworkImage
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: CachedNetworkImage(
                          imageUrl: category.imageUrl,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorWidget: (context, url, error) => Icon(
                            _getCategoryIcon(category.icon, category.name),
                            color: isDark ? AppColors.accent : category.color,
                            size: 32,
                          ),
                        ),
                      )
                    : Icon(
                        _getCategoryIcon(category.icon, category.name),
                        color: isDark ? AppColors.accent : category.color,
                        size: 32,
                      ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.labelMedium(
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ).copyWith(fontSize: 11, height: 1.1),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String iconStr, String catName) {
    final key = '${iconStr.toLowerCase()} ${catName.toLowerCase()}';
    if (key.contains('carrot') || key.contains('fruit') || key.contains('veg')) {
      return Icons.eco_rounded;
    }
    if (key.contains('milk') || key.contains('dairy') || key.contains('egg') || key.contains('bread')) {
      return Icons.egg_alt_rounded;
    }
    if (key.contains('wheat') || key.contains('rice') || key.contains('atta') || key.contains('grain')) {
      return Icons.grain_rounded;
    }
    if (key.contains('beef') || key.contains('meat') || key.contains('fish') || key.contains('chicken')) {
      return Icons.kebab_dining_rounded;
    }
    if (key.contains('spice') || key.contains('masala') || key.contains('dry fruit')) {
      return Icons.local_fire_department_rounded;
    }
    if (key.contains('croissant') || key.contains('breakfast') || key.contains('sauce')) {
      return Icons.free_breakfast_rounded;
    }
    if (key.contains('drink') || key.contains('beverage') || key.contains('juice')) {
      return Icons.local_drink_rounded;
    }
    if (key.contains('snack') || key.contains('cookie') || key.contains('munchies')) {
      return Icons.cookie_rounded;
    }
    if (key.contains('sweet') || key.contains('cake') || key.contains('ice')) {
      return Icons.cake_rounded;
    }
    if (key.contains('clean') || key.contains('house')) {
      return Icons.cleaning_services_rounded;
    }
    if (key.contains('baby')) {
      return Icons.child_care_rounded;
    }
    if (key.contains('pet')) {
      return Icons.pets_rounded;
    }
    if (key.contains('organic')) {
      return Icons.spa_rounded;
    }
    return Icons.shopping_basket_rounded;
  }
}
