import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class MembershipScreen extends ConsumerWidget {
  const MembershipScreen({super.key});

  static const _perks = [
    (Icons.delivery_dining_rounded, 'Free delivery', 'Unlimited free deliveries on eligible orders.'),
    (Icons.percent_rounded, 'Extra cashback', 'Higher wallet cashback on qualifying orders.'),
    (Icons.support_agent_rounded, 'Priority support', 'Faster queue access via chat.'),
    (Icons.schedule_rounded, 'Priority slots', 'Early access to delivery slots during rush hours.'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final isVip = ref.watch(authProvider.select((s) => s.user?.isVip)) ?? false;

    return AppScaffold(
      title: 'VIP membership',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surface,
              borderRadius: AppRadius.brLg,
              border: Border.all(color: AppColors.primary),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: AppRadius.brSm,
                      ),
                      child: Text('VIP', style: AppTypography.labelSmall(Colors.white).copyWith(letterSpacing: 1)),
                    ),
                    const Icon(Icons.workspace_premium_rounded, color: AppColors.primaryText, size: 30),
                  ],
                ),
                const SizedBox(height: 16),
                Text(isVip ? 'Membership active' : 'FreshCart VIP', style: AppTypography.h2(textColor)),
                const SizedBox(height: 4),
                Text(
                  isVip ? 'Free delivery and rewards are enabled on your account.' : 'Save on delivery fees and earn more cashback.',
                  style: AppTypography.bodyMedium(subColor),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text('Benefits', style: AppTypography.h3(textColor)),
          const SizedBox(height: 12),
          for (final (icon, title, body) in _perks)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: AppRadius.brMd,
                    ),
                    child: Icon(icon, color: AppColors.primaryText, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: AppTypography.labelLarge(textColor)),
                        const SizedBox(height: 2),
                        Text(body, style: AppTypography.bodySmall(subColor).copyWith(height: 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
