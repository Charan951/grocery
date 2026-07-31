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

    return GestureDetector(
      onTap: onTap,
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
              child: Icon(
                _getCategoryIcon(category.icon),
                color: isDark ? AppColors.accent : category.color,
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            category.name,
            textAlign: TextAlign.center,
            style: AppTypography.labelMedium(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ).copyWith(fontSize: 12),
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String name) {
    switch (name.toLowerCase()) {
      case 'organic':
        return Icons.eco_rounded;
      case 'vegetables':
        return Icons.grass_rounded;
      case 'fruits':
        return Icons.apple_rounded;
      case 'bakery':
        return Icons.bakery_dining_rounded;
      case 'dairy':
        return Icons.water_drop_rounded;
      case 'meat':
        return Icons.kebab_dining_rounded;
      case 'frozen':
        return Icons.ac_unit_rounded;
      case 'snacks':
        return Icons.cookie_rounded;
      case 'beverages':
        return Icons.local_drink_rounded;
      default:
        return Icons.shopping_basket_rounded;
    }
  }
}
