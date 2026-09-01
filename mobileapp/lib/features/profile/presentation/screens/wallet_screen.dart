import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart'
    show apiServiceProvider;

/// A single wallet ledger entry from `GET /customers/me/wallet/transactions`.
class WalletTxn {
  final double amount;
  final bool credit;
  final String description;
  final DateTime? date;
  WalletTxn({required this.amount, required this.credit, required this.description, this.date});

  factory WalletTxn.fromJson(Map<String, dynamic> j) => WalletTxn(
        amount: (j['amount'] as num?)?.toDouble() ?? 0,
        credit: (j['type'] ?? '').toString().toLowerCase() == 'credit',
        description: (j['description'] ?? '').toString(),
        date: DateTime.tryParse((j['date'] ?? '').toString()),
      );
}

/// The signed-in customer's wallet ledger (newest first).
final walletTransactionsProvider = FutureProvider.autoDispose<List<WalletTxn>>((ref) async {
  final res = await ref.watch(apiServiceProvider).fetchWalletTransactions();
  final list = (res['transactions'] as List?) ?? const [];
  return list.map((e) => WalletTxn.fromJson(Map<String, dynamic>.from(e as Map))).toList();
});

/// Wallet — balance is server-authoritative (`Customer.walletBalance`, refreshed
/// on every `/customers/me` hydrate). The ledger below comes from the real
/// `GET /customers/me/wallet/transactions` route — no fabricated data.
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
    final txns = ref.watch(walletTransactionsProvider);

    return AppScaffold(
      title: 'FreshCart Wallet',
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => ref.invalidate(walletTransactionsProvider),
        child: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
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

          const SizedBox(height: 24),
          Text('Transaction history', style: AppTypography.title(textColor)),
          const SizedBox(height: 8),
          txns.when(
            loading: () => const SkeletonGroup(
              child: Column(children: [
                SkeletonBox(height: 56, borderRadius: AppRadius.brLg),
                SizedBox(height: 8),
                SkeletonBox(height: 56, borderRadius: AppRadius.brLg),
                SizedBox(height: 8),
                SkeletonBox(height: 56, borderRadius: AppRadius.brLg),
              ]),
            ),
            error: (_, _) => ErrorState(
              description: 'Could not load your transactions.',
              onRetry: () => ref.invalidate(walletTransactionsProvider),
            ),
            data: (list) => list.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'No wallet activity yet. Refunds, cashback and referral '
                      'rewards will appear here.',
                      style: AppTypography.bodySmall(subColor).copyWith(height: 1.5),
                    ),
                  )
                : Column(
                    children: [
                      for (final t in list) _TxnRow(txn: t, isDark: isDark),
                    ],
                  ),
          ),
        ],
      ),
      ),
    );
  }
}

class _TxnRow extends StatelessWidget {
  final WalletTxn txn;
  final bool isDark;
  const _TxnRow({required this.txn, required this.isDark});

  String get _when {
    final d = txn.date;
    if (d == null) return '';
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final l = d.toLocal();
    return '${l.day} ${m[l.month - 1]} ${l.year}';
  }

  @override
  Widget build(BuildContext context) {
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final tint = txn.credit ? AppColors.primaryText : AppColors.error;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brLg,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Row(
        children: [
          Icon(
            txn.credit ? Icons.south_west_rounded : Icons.north_east_rounded,
            color: tint,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  txn.description.isEmpty ? (txn.credit ? 'Credit' : 'Debit') : txn.description,
                  style: AppTypography.bodyMedium(textColor),
                ),
                if (_when.isNotEmpty)
                  Text(_when, style: AppTypography.bodySmall(subColor)),
              ],
            ),
          ),
          Text(
            '${txn.credit ? '+' : '−'} ₹${txn.amount.toStringAsFixed(2)}',
            style: AppTypography.labelLarge(tint),
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
