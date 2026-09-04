import 'dart:async';
import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
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

class SearchBarHeader extends StatefulWidget {
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
  State<SearchBarHeader> createState() => _SearchBarHeaderState();
}

class _SearchBarHeaderState extends State<SearchBarHeader> {
  static const List<String> _placeholders = [
    'Search "atta, dal, coke and more"',
    'Search "fresh milk, bread & eggs"',
    'Search "chips, snacks & cold drinks"',
    'Search "fresh fruits & vegetables"',
    'Search "rice, cooking oil & spices"',
    'Search "chocolates, biscuits & ice cream"',
    'Search "soaps, shampoo & personal care"',
  ];

  Timer? _timer;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (mounted) {
        setState(() {
          _currentIndex = (_currentIndex + 1) % _placeholders.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = widget.backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surface);
    final subColor = isDark ? AppColors.textSecondaryDark : Colors.grey.shade600;

    return Container(
      color: surface,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              label: _placeholders[_currentIndex],
              child: Material(
                color: isDark ? Colors.white10 : Colors.white,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  onTap: widget.onSearchTap,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white10 : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isDark ? AppColors.dividerDark : Colors.grey.shade300),
                      boxShadow: [
                        if (!isDark)
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.search_rounded, size: 20, color: isDark ? Colors.white70 : Colors.black87),
                        const SizedBox(width: 10),
                        Expanded(
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 350),
                            transitionBuilder: (Widget child, Animation<double> animation) {
                              return FadeTransition(
                                opacity: animation,
                                child: child,
                              );
                            },
                            child: Align(
                              alignment: Alignment.centerLeft,
                              key: ValueKey<int>(_currentIndex),
                              child: Text(
                                _placeholders[_currentIndex],
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: subColor,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ),
                        Icon(Icons.mic_none_rounded, size: 20, color: isDark ? Colors.white70 : Colors.black87),
                      ],
                    ),
                  ),
                ),
              ),
            ),
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
