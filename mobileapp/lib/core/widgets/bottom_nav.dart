import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';

class BottomNavDestination {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const BottomNavDestination(this.icon, this.activeIcon, this.label);
}

const kBottomNavDestinations = <BottomNavDestination>[
  BottomNavDestination(Icons.home_outlined, Icons.home_rounded, 'Home'),
  BottomNavDestination(Icons.grid_view_outlined, Icons.grid_view_rounded, 'Categories'),
  BottomNavDestination(Icons.search_rounded, Icons.search_rounded, 'Search'),
  BottomNavDestination(Icons.receipt_long_outlined, Icons.receipt_long_rounded, 'Orders'),
  BottomNavDestination(Icons.person_outline_rounded, Icons.person_rounded, 'Account'),
];

/// Flat, full-width bottom navigation. Every tab shows its label at all times
/// (discoverability + a11y). Active = brand green; ≥ 56 dp tap targets; a
/// hairline top border instead of a floating pill + shadow.
class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const CustomBottomNavBar({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: isDark ? AppColors.surfaceDark : AppColors.surface,
      elevation: 0,
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider),
          ),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 60,
            child: Row(
              children: [
                for (var i = 0; i < kBottomNavDestinations.length; i++)
                  Expanded(
                    child: _NavItem(
                      destination: kBottomNavDestinations[i],
                      selected: currentIndex == i,
                      isDark: isDark,
                      onTap: () => onTap(i),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final BottomNavDestination destination;
  final bool selected;
  final bool isDark;
  final VoidCallback onTap;

  const _NavItem({
    required this.destination,
    required this.selected,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final active = AppColors.primaryText;
    final inactive = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final color = selected ? active : inactive;

    return Semantics(
      button: true,
      selected: selected,
      label: destination.label,
      child: InkResponse(
        onTap: onTap,
        radius: 40,
        highlightShape: BoxShape.rectangle,
        child: SizedBox(
          height: 56,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(selected ? destination.activeIcon : destination.icon, color: color, size: 24),
              const SizedBox(height: 3),
              Text(
                destination.label,
                style: AppTypography.labelSmall(color).copyWith(
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
