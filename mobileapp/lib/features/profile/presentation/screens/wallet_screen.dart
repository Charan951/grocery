import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

/// Wallet — balance is server-authoritative (`Customer.walletBalance`, refreshed
/// on every `/customers/me` hydrate). The backend has no customer-facing
/// transaction-history route or top-up endpoint yet, so this screen shows the
/// balance, how it's funded, and the referral code — no fabricated data.
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = ref.watch(authProvider).user;
    final balance = user?.walletBalance ?? 0.0;
    final referral = user?.referralCode;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return AppScaffold(
      title: 'FreshCart Wallet',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: AppRadius.brLg,
              border: Border.all(color: AppColors.primary.withOpacity(0.25)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Available balance', style: AppTypography.bodyMedium(subColor)),
                const SizedBox(height: 4),
                Text('₹${balance.toStringAsFixed(2)}',
                    style: AppTypography.display(textColor).copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('Spendable at checkout via the Wallet payment option.',
                    style: AppTypography.bodySmall(subColor)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          _InfoCard(
            isDark: isDark,
            icon: Icons.savings_outlined,
            title: 'How your wallet is credited',
            body: 'Refunds for cancelled or missing items, cashback on eligible '
                'orders, and referral rewards are added automatically.',
          ),
          const SizedBox(height: 12),

          if (referral != null && referral.isNotEmpty)
            _InfoCard(
              isDark: isDark,
              icon: Icons.card_giftcard_rounded,
              title: 'Refer & earn',
              body: 'Share your code — you both get wallet credit on their first order.',
              trailing: OutlinedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: referral));
                  AppToast.success('Referral code copied');
                },
                icon: const Icon(Icons.copy_rounded, size: 16),
                label: Text(referral),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final bool isDark;
  final IconData icon;
  final String title;
  final String body;
  final Widget? trailing;
  const _InfoCard({
    required this.isDark,
    required this.icon,
    required this.title,
    required this.body,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title, style: AppTypography.title(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                )),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(body, style: AppTypography.bodySmall(
            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
          ).copyWith(height: 1.5)),
          if (trailing != null) ...[const SizedBox(height: 12), trailing!],
        ],
      ),
    );
  }
}
