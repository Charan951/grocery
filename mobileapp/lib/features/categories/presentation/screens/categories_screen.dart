import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/services/mock_data_service.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Categories'),
        centerTitle: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              Text(
                'Shop by Category',
                style: AppTypography.display(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ).copyWith(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.8),
              ),
              const SizedBox(height: 8),
              Text(
                'Find farm-fresh vegetables, organic milk, daily bakery, premium snacks, and more.',
                style: AppTypography.bodyMedium(
                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: GridView.builder(
                  physics: const BouncingScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.15,
                  ),
                  itemCount: MockDataService.categories.length,
                  itemBuilder: (context, index) {
                    final cat = MockDataService.categories[index];
                    return GestureDetector(
                      onTap: () {
                        context.push('/category/${cat.id}');
                      },
                      child: GlassCard(
                        color: cat.color.withOpacity(isDark ? 0.12 : 0.06),
                        borderColor: cat.color.withOpacity(isDark ? 0.25 : 0.15),
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white10 : Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _getCategoryIcon(cat.icon),
                                color: isDark ? AppColors.accent : cat.color,
                                size: 28,
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  cat.name,
                                  style: AppTypography.title(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${cat.productCount} items',
                                  style: AppTypography.bodySmall(
                                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 100), // bottom spacing for navigation shell
            ],
          ),
        ),
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
