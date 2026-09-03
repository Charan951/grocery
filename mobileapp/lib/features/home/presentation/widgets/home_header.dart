import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

class LocationHeader extends StatelessWidget {
  final String addressLine;
  final VoidCallback onAddressTap;
  final VoidCallback onProfileTap;
  final VoidCallback onNotificationsTap;
  final Color? backgroundColor;

  const LocationHeader({
    super.key,
    required this.addressLine,
    required this.onAddressTap,
    required this.onProfileTap,
    required this.onNotificationsTap,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surface);
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return Container(
      color: surface,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Expanded(
              child: Semantics(
                button: true,
                label: 'Delivery address: $addressLine. Tap to change.',
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onAddressTap,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.bolt_rounded, size: 16, color: AppColors.primary),
                              const SizedBox(width: 2),
                              Text('Express delivery', style: AppTypography.labelMedium(textColor)),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  addressLine,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.bodySmall(subColor),
                                ),
                              ),
                              Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: subColor),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _CircleIcon(
              icon: Icons.notifications_none_rounded,
              onTap: onNotificationsTap,
              isDark: isDark,
              label: 'Notifications',
            ),
            const SizedBox(width: 8),
            _CircleIcon(
              icon: Icons.person_outline_rounded,
              onTap: onProfileTap,
              isDark: isDark,
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}

class SearchBarHeader extends StatelessWidget {
  final int cartCount;
  final VoidCallback onSearchTap;
  final VoidCallback onCartTap;
  final Color? backgroundColor;

  const SearchBarHeader({
    super.key,
    required this.cartCount,
    required this.onSearchTap,
    required this.onCartTap,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surface);
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return Container(
      color: surface,
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              label: 'Search for atta, dal, coke and more',
              child: Material(
                color: isDark ? Colors.white10 : AppColors.background,
                borderRadius: AppRadius.brPill,
                child: InkWell(
                  onTap: onSearchTap,
                  borderRadius: AppRadius.brPill,
                  child: Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      borderRadius: AppRadius.brPill,
                      border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.search_rounded, size: 20, color: subColor),
                        const SizedBox(width: 8),
                        Text(
                          'Search for atta, dal, coke and more',
                          style: AppTypography.bodySmall(subColor),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Stack(
            clipBehavior: Clip.none,
            children: [
              _CircleIcon(
                icon: Icons.shopping_bag_outlined,
                onTap: onCartTap,
                isDark: isDark,
                label: cartCount > 0 ? 'Cart, $cartCount items' : 'Cart',
              ),
              if (cartCount > 0)
                Positioned(
                  right: -2,
                  top: -2,
                  child: IgnorePointer(
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                      child: Text(
                        '$cartCount',
                        textAlign: TextAlign.center,
                        style: AppTypography.labelSmall(Colors.white).copyWith(fontSize: 10),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Flat Home header combining LocationHeader and SearchBarHeader.
class HomeHeader extends StatelessWidget {
  final String addressLine;
  final int cartCount;
  final VoidCallback onAddressTap;
  final VoidCallback onProfileTap;
  final VoidCallback onSearchTap;
  final VoidCallback onCartTap;
  final VoidCallback onNotificationsTap;
  final Color? backgroundColor;

  const HomeHeader({
    super.key,
    required this.addressLine,
    required this.cartCount,
    required this.onAddressTap,
    required this.onProfileTap,
    required this.onSearchTap,
    required this.onCartTap,
    required this.onNotificationsTap,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        LocationHeader(
          addressLine: addressLine,
          onAddressTap: onAddressTap,
          onProfileTap: onProfileTap,
          onNotificationsTap: onNotificationsTap,
          backgroundColor: backgroundColor,
        ),
        SearchBarHeader(
          cartCount: cartCount,
          onSearchTap: onSearchTap,
          onCartTap: onCartTap,
          backgroundColor: backgroundColor,
        ),
      ],
    );
  }
}

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isDark;
  final String label;
  const _CircleIcon({
    required this.icon,
    required this.onTap,
    required this.isDark,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: isDark ? Colors.white10 : AppColors.background,
        shape: CircleBorder(side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Center(
              child: Icon(icon, size: 20, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
            ),
          ),
        ),
      ),
    );
  }
}
