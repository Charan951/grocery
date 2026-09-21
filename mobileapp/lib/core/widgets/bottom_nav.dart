import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class BottomNavDestination {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const BottomNavDestination(this.icon, this.activeIcon, this.label);
}

/// Four tabs, Home in the centre (Blinkit-style), mirroring the web
/// storefront's bottom nav. Search is NOT a tab — it's reached from the home
/// search bar and pushed full-screen (`/search`).
const kBottomNavDestinations = <BottomNavDestination>[
  // Same Lucide outline icons as the web BottomNav (active = same glyph, bolder label).
  BottomNavDestination(LucideIcons.grid3x3, LucideIcons.grid3x3, 'Categories'),
  BottomNavDestination(LucideIcons.house, LucideIcons.house, 'Home'),
  BottomNavDestination(LucideIcons.package, LucideIcons.package, 'Orders'),
  BottomNavDestination(LucideIcons.circleUser, LucideIcons.circleUser, 'Account'),
];

/// Index of the Home tab in [kBottomNavDestinations]. Home is centre, not
/// first, so "back returns to Home" logic must not assume index 0.
const kHomeNavIndex = 1;

/// Flat, full-width bottom navigation. Every tab shows its label at all times
/// (discoverability + a11y). Active = dark charcoal matching web; ≥ 56 dp tap targets; a
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
    // Web parity: icon is always gray-700; label is gray-900 extrabold when
    // active, gray-600 medium otherwise.
    final iconColor = isDark ? AppColors.textPrimaryDark : const Color(0xFF374151);
    final labelColor = selected
        ? (isDark ? AppColors.textPrimaryDark : const Color(0xFF111827))
        : (isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563));

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
              Icon(selected ? destination.activeIcon : destination.icon, color: iconColor, size: 22),
              const SizedBox(height: 4),
              Text(
                destination.label,
                style: (selected
                        ? AppTypography.navigationStyles.activeBottomNav(labelColor)
                        : AppTypography.navigationStyles.bottomNav(labelColor))
                    .copyWith(
                  fontSize: 11,
                  height: 1.2,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
