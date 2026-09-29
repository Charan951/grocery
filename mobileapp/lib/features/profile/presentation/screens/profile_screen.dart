import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

const _playStoreUrl = 'https://play.google.com/store/apps/details?id=com.freshcart.app.freshcart';

/// Account tab — Blinkit-style: green wash header with a centered avatar,
/// three quick tiles, then grouped white cards. Mirrors the web
/// `CustomerProfile.tsx` layout and menu order.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final pageColor = isDark ? AppColors.backgroundDark : const Color(0xFFF3F6F2);

    final auth = ref.watch(authProvider);
    final darkMode = ref.watch(themeProvider);
    final signedIn = auth.isAuthenticated;
    final name = auth.user?.name ?? '';
    final phone = auth.user?.phone ?? '';
    final email = auth.user?.email ?? '';
    final wallet = auth.user?.walletBalance ?? 0.0;
    final isVip = auth.user?.isVip ?? false;

    // Signed-out shoppers are sent to login instead of an account-only page.
    VoidCallback requireAuth(VoidCallback fn) => () => signedIn ? fn() : context.push('/login');
    VoidCallback comingSoon(String feature) => () => AppToast.info('$feature is coming soon');

    final topPad = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: pageColor,
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Green wash header
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? [AppColors.primary.withOpacity(0.35), AppColors.primary.withOpacity(0.12), pageColor]
                    : const [Color(0xFFBFE8C3), Color(0xFFDDF3DF), Color(0xFFF3F6F2)],
                stops: const [0, 0.45, 1],
              ),
            ),
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, topPad + 8, 16, 20),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: _CircleIconButton(
                      icon: Icons.arrow_back_rounded,
                      tooltip: 'Home',
                      isDark: isDark,
                      onTap: () => context.go('/'),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    width: 96,
                    height: 96,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surface,
                      shape: BoxShape.circle,
                      boxShadow: const [BoxShadow(color: AppColors.shadow, blurRadius: 12, offset: Offset(0, 4))],
                    ),
                    child: signedIn && name.trim().isNotEmpty
                        ? Text(
                            name.trim()[0].toUpperCase(),
                            style: AppTypography.displayMedium(AppColors.primaryText),
                          )
                        : const Icon(Icons.person_rounded, size: 52, color: AppColors.primaryText),
                  ),
                  const SizedBox(height: 12),
                  if (signedIn) ...[
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            name.isNotEmpty ? name : 'FreshCart shopper',
                            style: AppTypography.headlineMedium(textColor),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isVip) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.workspace_premium_rounded, color: AppColors.primaryText, size: 20),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [phone, email].where((s) => s.isNotEmpty).join(' • '),
                      style: AppTypography.bodyMedium(subColor),
                      textAlign: TextAlign.center,
                    ),
                    TextButton.icon(
                      onPressed: () => context.push('/account/edit'),
                      icon: const Icon(Icons.edit_outlined, size: 14),
                      label: const Text('Edit profile'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primaryText,
                        textStyle: AppTypography.labelMedium(AppColors.primaryText),
                      ),
                    ),
                  ] else ...[
                    Text('Your account', style: AppTypography.headlineMedium(textColor)),
                    const SizedBox(height: 4),
                    Text(
                      'Log in to track orders, save addresses and check out faster.',
                      style: AppTypography.bodyMedium(subColor),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 14),
                    FilledButton(
                      onPressed: () => context.push('/login'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primaryText,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                        shape: const StadiumBorder(),
                      ),
                      child: const Text('Log in or sign up'),
                    ),
                  ],
                ],
              ),
            ),
          ),

          Padding(
            // The shell overlays the bottom nav (~70), floating cart (~58) and
            // active-order pill (~58) on top of tab content — clear all three so
            // Log out / Delete account at the end of the list stay tappable.
            padding: EdgeInsets.fromLTRB(16, 0, 16, 220 + MediaQuery.paddingOf(context).bottom),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    _QuickTile(
                      icon: Icons.shopping_bag_outlined,
                      label: 'Your orders',
                      isDark: isDark,
                      onTap: requireAuth(() => context.go('/orders')),
                    ),
                    const SizedBox(width: 12),
                    _QuickTile(
                      icon: Icons.account_balance_wallet_outlined,
                      label: signedIn ? '₹${wallet.toStringAsFixed(0)}' : 'Wallet',
                      isDark: isDark,
                      onTap: requireAuth(() => context.push('/wallet')),
                    ),
                    const SizedBox(width: 12),
                    _QuickTile(
                      icon: Icons.support_agent_rounded,
                      label: 'Need help?',
                      isDark: isDark,
                      onTap: () => context.push('/support'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                _Card(
                  isDark: isDark,
                  child: SwitchListTile.adaptive(
                    value: darkMode,
                    activeColor: AppColors.primary,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    secondary: Icon(darkMode ? Icons.dark_mode_outlined : Icons.light_mode_outlined, color: textColor),
                    title: Text('Dark mode', style: AppTypography.labelLarge(textColor)),
                    onChanged: (_) => ref.read(themeProvider.notifier).toggleTheme(),
                  ),
                ),
                const SizedBox(height: 16),

                _MenuSection(isDark: isDark, title: 'Your information', items: [
                  _MenuItem(Icons.location_on_outlined, 'Address book', requireAuth(() => context.push('/addresses'))),
                  _MenuItem(Icons.favorite_border_rounded, 'Your wishlist', () => context.push('/wishlist')),
                ]),
                const SizedBox(height: 16),

                _MenuSection(isDark: isDark, title: 'Payments and refunds', items: [
                  _MenuItem(
                    Icons.account_balance_wallet_outlined,
                    'FreshCart Wallet',
                    requireAuth(() => context.push('/wallet')),
                    trailing: signedIn ? '₹${wallet.toStringAsFixed(2)}' : null,
                  ),
                  _MenuItem(Icons.account_balance_outlined, 'Bank & UPI details',
                      requireAuth(() => context.push('/refund-accounts'))),
                  _MenuItem(Icons.receipt_long_outlined, 'Payment & refunds', () => context.push('/support')),
                  _MenuItem(Icons.event_available_outlined, 'FreshCart Pay Later',
                      requireAuth(comingSoon('FreshCart Pay Later'))),
                ]),
                const SizedBox(height: 16),

                _MenuSection(isDark: isDark, title: 'Other information', items: [
                  _MenuItem(Icons.headset_mic_outlined, 'Help & support', () => context.push('/support')),
                  _MenuItem(Icons.star_border_rounded, 'Rate FreshCart', () => openUrl(_playStoreUrl)),
                  _MenuItem(Icons.description_outlined, 'Terms & legal', () => context.push('/legal')),
                ]),

                if (signedIn) ...[
                  const SizedBox(height: 16),
                  _Card(
                    isDark: isDark,
                    child: ListTile(
                      onTap: () async {
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
                      leading: const Icon(Icons.logout_rounded, color: AppColors.errorText),
                      title: Text('Log out', style: AppTypography.labelLarge(AppColors.errorText)),
                      minVerticalPadding: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: TextButton(
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
                      style: TextButton.styleFrom(foregroundColor: subColor),
                      child: const Text('Delete account'),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Center(child: Text('FreshCart · v1.0', style: AppTypography.bodySmall(subColor))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  _MenuItem(this.icon, this.label, this.onTap, {this.trailing});
}

class _Card extends StatelessWidget {
  final Widget child;
  final bool isDark;
  const _Card({required this.child, required this.isDark});

  @override
  Widget build(BuildContext context) => Material(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        clipBehavior: Clip.antiAlias,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.brMd),
        child: child,
      );
}

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool isDark;
  final VoidCallback onTap;
  const _CircleIconButton({required this.icon, required this.tooltip, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) => Material(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        shape: const CircleBorder(),
        elevation: 1,
        shadowColor: AppColors.shadow,
        child: IconButton(
          onPressed: onTap,
          tooltip: tooltip,
          icon: Icon(icon, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
        ),
      );
}

class _QuickTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isDark;
  final VoidCallback onTap;
  const _QuickTile({required this.icon, required this.label, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    return Expanded(
      child: _Card(
        isDark: isDark,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 6),
            child: Column(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: AppColors.primaryText, size: 22),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: AppTypography.labelMedium(textColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final String title;
  final List<_MenuItem> items;
  final bool isDark;
  const _MenuSection({required this.title, required this.items, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final divider = isDark ? AppColors.dividerDark : AppColors.divider;
    return _Card(
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(title, style: AppTypography.headlineH4(textColor)),
          ),
          for (final item in items) ...[
            Divider(height: 1, color: divider),
            _MenuTile(item: item, isDark: isDark),
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
      leading: Icon(item.icon, color: textColor),
      title: Text(item.label, style: AppTypography.labelLarge(textColor)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (item.trailing != null)
            Text(item.trailing!, style: AppTypography.labelMedium(AppColors.primaryText)),
          Icon(Icons.chevron_right_rounded, size: 20, color: subColor),
        ],
      ),
      minVerticalPadding: 12,
    );
  }
}
