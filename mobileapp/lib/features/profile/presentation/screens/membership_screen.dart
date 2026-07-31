import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class MembershipScreen extends ConsumerWidget {
  const MembershipScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final authState = ref.watch(authProvider);
    final isVip = authState.user?.isVip ?? false;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('VIP Membership'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 12),
                
                // VIP Pass Card
                GlassCard(
                  padding: const EdgeInsets.all(24),
                  color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                  borderColor: AppColors.primary,
                  borderWidth: 1.5,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              'VIP CLUB',
                              style: AppTypography.labelSmall(Colors.white).copyWith(letterSpacing: 1.0),
                            ),
                          ),
                          const Icon(Icons.workspace_premium_rounded, color: AppColors.primary, size: 36),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Text(
                        isVip ? 'Membership Active' : 'Join FreshCart VIP',
                        style: AppTypography.h1(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ).copyWith(fontSize: 24, letterSpacing: -0.5),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isVip ? 'Free Delivery & Rewards unlocked' : 'Save up to ₹499/month on fees',
                        style: AppTypography.bodySmall(
                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Divider(color: Colors.white12),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Member ID',
                            style: AppTypography.bodySmall(
                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                            ),
                          ),
                          Text(
                            '#FC-VIP-99321',
                            style: AppTypography.labelLarge(
                              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // VIP Perks List
                Text(
                  'Exclusive Benefits',
                  style: AppTypography.h2(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                _buildPerkTile(Icons.delivery_dining_rounded, 'Free Delivery', 'Get unlimited free deliveries on all grocery orders above ₹149.', isDark),
                _buildPerkTile(Icons.percent_rounded, 'Extra Cashbacks', 'Save 10% cashbacks directly credited to your wallet.', isDark),
                _buildPerkTile(Icons.support_agent_rounded, 'VIP Customer Support', 'Direct queue access to support agents via chat or call.', isDark),
                _buildPerkTile(Icons.schedule_rounded, 'Priority Time Slots', 'Early access slots during high-demand rush hours.', isDark),
                
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPerkTile(IconData icon, String title, String subtitle, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.labelLarge(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ).copyWith(height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
