import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// Flat Home header: delivery-time promise, tappable delivery address, profile
/// avatar, and a read-only search entry with a cart shortcut.
class HomeHeader extends StatelessWidget {
  final String addressLine;
  final int cartCount;
  final VoidCallback onAddressTap;
  final VoidCallback onProfileTap;
  final VoidCallback onSearchTap;
  final VoidCallback onCartTap;
  final VoidCallback onNotificationsTap;

  const HomeHeader({
    super.key,
    required this.addressLine,
    required this.cartCount,
    required this.onAddressTap,
    required this.onProfileTap,
    required this.onSearchTap,
    required this.onCartTap,
    required this.onNotificationsTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surfaceDark : AppColors.surface;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return Container(
      color: surface,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: onAddressTap,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.bolt_rounded, size: 16, color: AppColors.primary),
                            const SizedBox(width: 2),
                            Text('Delivery in 8 mins',
                                style: AppTypography.labelMedium(textColor)),
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
                const SizedBox(width: 8),
                _CircleIcon(
                  icon: Icons.notifications_none_rounded,
                  onTap: onNotificationsTap,
                  isDark: isDark,
                ),
                const SizedBox(width: 8),
                _CircleIcon(
                  icon: Icons.person_outline_rounded,
                  onTap: onProfileTap,
                  isDark: isDark,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: onSearchTap,
                    child: Container(
                      height: 46,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : AppColors.background,
                        borderRadius: AppRadius.brPill,
                        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.search_rounded, size: 20, color: subColor),
                          const SizedBox(width: 8),
                          Text('Search for atta, dal, coke and more',
                              style: AppTypography.bodySmall(subColor)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    _CircleIcon(icon: Icons.shopping_bag_outlined, onTap: onCartTap, isDark: isDark),
                    if (cartCount > 0)
                      Positioned(
                        right: -2,
                        top: -2,
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
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isDark;
  const _CircleIcon({required this.icon, required this.onTap, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isDark ? Colors.white10 : AppColors.background,
      shape: CircleBorder(side: BorderSide(color: isDark ? AppColors.dividerDark : AppColors.divider)),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, size: 22, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
        ),
      ),
    );
  }
}
