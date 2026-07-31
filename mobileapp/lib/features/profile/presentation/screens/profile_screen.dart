import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final authWatch = ref.watch(authProvider);
    final authNotifier = ref.read(authProvider.notifier);

    final isDarkModeEnabled = ref.watch(themeProvider);

    final userName = authWatch.user?.name ?? 'Guest User';
    final userPhone = authWatch.user?.phone ?? 'Sign in to access account';
    final walletBalance = authWatch.user?.walletBalance ?? 0.0;
    final isVip = authWatch.user?.isVip ?? false;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile'),
        centerTitle: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              children: [
                const SizedBox(height: 12),
                
                // Profile Avatar Glass Card
                GlassCard(
                  padding: const EdgeInsets.all(24),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: AppColors.primary.withOpacity(0.12),
                        child: Text(
                          userName.isNotEmpty ? userName[0].toUpperCase() : 'G',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  userName,
                                  style: AppTypography.h2(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  ).copyWith(fontSize: 20),
                                ),
                                if (isVip) ...[
                                  const SizedBox(width: 6),
                                  const Icon(
                                    Icons.workspace_premium_rounded,
                                    color: AppColors.primary,
                                    size: 18,
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              userPhone,
                              style: AppTypography.bodySmall(
                                isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // VIP Pass Card
                GestureDetector(
                  onTap: () => context.push('/membership'),
                  child: GlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                    borderColor: AppColors.primary.withOpacity(0.2),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.workspace_premium_rounded, color: AppColors.primary, size: 24),
                            const SizedBox(width: 16),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'FreshCart VIP Member',
                                  style: AppTypography.labelLarge(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  isVip ? 'Membership active: free delivery active' : 'Join VIP to save delivery fees',
                                  style: AppTypography.bodySmall(
                                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.primary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Account Dashboard Options
                _buildMenuSection(context, 'My Account', [
                  _buildMenuItem(context, Icons.history_rounded, 'Order History', () => context.push('/orders'), isDark),
                  _buildMenuItem(context, Icons.account_balance_wallet_rounded, 'FreshCart Wallet (₹${walletBalance.toStringAsFixed(0)})', () => context.push('/wallet'), isDark),
                  _buildMenuItem(context, Icons.location_on_rounded, 'Delivery Addresses', () => context.push('/addresses'), isDark),
                ]),
                const SizedBox(height: 20),

                _buildMenuSection(context, 'Preferences', [
                  // Dark Mode switch
                  ListTile(
                    leading: Icon(
                      isDarkModeEnabled ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                      color: isDark ? Colors.white70 : AppColors.textPrimary,
                    ),
                    title: Text(
                      'Dark Mode',
                      style: AppTypography.labelLarge(
                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                      ),
                    ),
                    trailing: Switch.adaptive(
                      value: isDarkModeEnabled,
                      activeColor: AppColors.primary,
                      onChanged: (val) {
                        ref.read(themeProvider.notifier).toggleTheme();
                      },
                    ),
                  ),
                  _buildMenuItem(context, Icons.headset_mic_rounded, 'Live Help & Support', () => context.push('/support'), isDark),
                ]),
                const SizedBox(height: 24),

                // Logout Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      authNotifier.logout();
                      context.go('/login');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error.withOpacity(0.08),
                      foregroundColor: AppColors.error,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: Text(
                      'Log Out',
                      style: AppTypography.labelLarge(AppColors.error).copyWith(fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(height: 120), // bottom spacer
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMenuSection(BuildContext context, String header, List<Widget> items) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 8, bottom: 8),
          child: Text(
            header,
            style: AppTypography.labelSmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ).copyWith(letterSpacing: 0.8),
          ),
        ),
        GlassCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: items,
          ),
        ),
      ],
    );
  }

  Widget _buildMenuItem(BuildContext context, IconData icon, String title, VoidCallback onTap, bool isDark) {
    return ListTile(
      leading: Icon(icon, color: isDark ? Colors.white70 : AppColors.textPrimary),
      title: Text(
        title,
        style: AppTypography.labelLarge(
          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
        ),
      ),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
      onTap: onTap,
    );
  }
}
