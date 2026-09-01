import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    final auth = ref.watch(authProvider);
    final darkMode = ref.watch(themeProvider);
    final name = auth.user?.name ?? 'Guest';
    final phone = auth.user?.phone ?? 'Not signed in';
    final wallet = auth.user?.walletBalance ?? 0.0;
    final isVip = auth.user?.isVip ?? false;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Account'),
        centerTitle: false,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _Card(
            isDark: isDark,
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primary.withOpacity(0.12),
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : 'G',
                    style: AppTypography.h2(AppColors.primaryText),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(child: Text(name, style: AppTypography.h3(textColor), overflow: TextOverflow.ellipsis)),
                          if (isVip) ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.workspace_premium_rounded, color: AppColors.primaryText, size: 16),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(phone, style: AppTypography.bodySmall(subColor)),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/account/edit'),
                  child: Text('Edit', style: AppTypography.labelMedium(AppColors.primaryText)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          GestureDetector(
            onTap: () => context.push('/membership'),
            child: _Card(
              isDark: isDark,
              child: Row(
                children: [
                  const Icon(Icons.workspace_premium_rounded, color: AppColors.primaryText),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('FreshCart VIP', style: AppTypography.labelLarge(textColor)),
                        Text(
                          isVip ? 'Active — free delivery on your orders' : 'Save on delivery fees',
                          style: AppTypography.bodySmall(subColor),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, size: 18, color: subColor),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          _sectionLabel('My account', subColor),
          const SizedBox(height: 8),
          _MenuGroup(isDark: isDark, items: [
            _MenuItem(Icons.receipt_long_outlined, 'Order history', () => context.go('/orders')),
            _MenuItem(Icons.favorite_border_rounded, 'Wishlist', () => context.push('/wishlist')),
            _MenuItem(Icons.notifications_none_rounded, 'Notifications', () => context.push('/notifications')),
            _MenuItem(Icons.account_balance_wallet_outlined, 'Wallet · ₹${wallet.toStringAsFixed(0)}', () => context.push('/wallet')),
            _MenuItem(Icons.location_on_outlined, 'Delivery addresses', () => context.push('/addresses')),
            _MenuItem(Icons.storefront_outlined, 'Store locations', () => context.push('/stores')),
          ]),
          const SizedBox(height: 24),

          _sectionLabel('Preferences', subColor),
          const SizedBox(height: 8),
          _Card(
            isDark: isDark,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile.adaptive(
                  value: darkMode,
                  activeColor: AppColors.primary,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  secondary: Icon(darkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded, color: subColor),
                  title: Text('Dark mode', style: AppTypography.labelLarge(textColor)),
                  onChanged: (_) => ref.read(themeProvider.notifier).toggleTheme(),
                ),
                Divider(height: 1, color: isDark ? AppColors.dividerDark : AppColors.divider),
                _MenuTile(
                  isDark: isDark,
                  item: _MenuItem(Icons.headset_mic_outlined, 'Help & support', () => context.push('/support')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          SecondaryButton(
            text: 'Log out',
            onPressed: () async {
              final ok = await AppModal.confirm(
                context,
                title: 'Log out?',
                message: 'You can sign back in any time with your phone number.',
                confirmLabel: 'Log out',
                destructive: true,
              );
              if (ok && context.mounted) {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              }
            },
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () async {
              final ok = await AppModal.confirm(
                context,
                title: 'Delete account?',
                message: 'This permanently removes your profile, wallet balance '
                    'and reviews. Past orders are kept as records but no longer '
                    'linked to you. This cannot be undone.',
                confirmLabel: 'Delete account',
                cancelLabel: 'Keep account',
                destructive: true,
                icon: Icons.delete_forever_outlined,
              );
              if (!ok || !context.mounted) return;
              try {
                await ref.read(authProvider.notifier).deleteAccount();
                if (context.mounted) context.go('/login');
                AppToast.success('Your account has been deleted');
              } on ApiException catch (e) {
                AppToast.error(e.message);
              } catch (_) {
                AppToast.error('Could not delete your account. Please try again.');
              }
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete account'),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String t, Color c) =>
      Padding(padding: const EdgeInsets.only(left: 4), child: Text(t.toUpperCase(), style: AppTypography.labelSmall(c).copyWith(letterSpacing: 0.6)));
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  _MenuItem(this.icon, this.label, this.onTap);
}

class _Card extends StatelessWidget {
  final Widget child;
  final bool isDark;
  final EdgeInsetsGeometry padding;
  const _Card({required this.child, required this.isDark, this.padding = const EdgeInsets.all(16)});

  @override
  Widget build(BuildContext context) => Container(
        padding: padding,
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surface,
          borderRadius: AppRadius.brLg,
          border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
        ),
        child: child,
      );
}

class _MenuGroup extends StatelessWidget {
  final List<_MenuItem> items;
  final bool isDark;
  const _MenuGroup({required this.items, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return _Card(
      isDark: isDark,
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            _MenuTile(item: items[i], isDark: isDark),
            if (i != items.length - 1)
              Divider(height: 1, indent: 52, color: isDark ? AppColors.dividerDark : AppColors.divider),
          ],
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final _MenuItem item;
  final bool isDark;
  const _MenuTile({required this.item, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    return ListTile(
      onTap: item.onTap,
      leading: Icon(item.icon, color: subColor),
      title: Text(item.label, style: AppTypography.labelLarge(textColor)),
      trailing: Icon(Icons.chevron_right_rounded, size: 18, color: subColor),
      minVerticalPadding: 14,
    );
  }
}
