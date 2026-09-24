import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/returns/data/return_models.dart';
import 'package:freshcart/features/returns/presentation/returns_providers.dart';

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String fmtReturnDate(DateTime? d) {
  if (d == null) return '';
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '${d.day} ${_months[d.month - 1]}, $h:$m ${d.hour < 12 ? 'am' : 'pm'}';
}

String inr(num n) => '₹${n % 1 == 0 ? n.toInt() : n.toStringAsFixed(2)}';

/// Return / exchange block on a delivered order: existing requests (status,
/// pickup code, refund) and the entry point to raise a new one. Mirrors the
/// web's `OrderReturns` component.
class OrderReturnsSection extends ConsumerWidget {
  final String orderId;
  final bool isDark;
  const OrderReturnsSection({super.key, required this.orderId, required this.isDark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(orderReturnsProvider(orderId));
    return async.maybeWhen(
      data: (data) {
        if (data.requests.isEmpty && !data.eligible) {
          if (data.reason.isEmpty) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Text(
              data.reason,
              textAlign: TextAlign.center,
              style: AppTypography.captionSmall(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary),
            ),
          );
        }
        return Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Returns & exchanges',
                style: AppTypography.title(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              for (final r in data.requests) ...[
                _ReturnCard(r: r, isDark: isDark, orderId: orderId),
                const SizedBox(height: 10),
              ],
              if (data.eligible) _StartReturnTile(data: data, isDark: isDark, orderId: orderId),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

BoxDecoration _card(bool isDark) => BoxDecoration(
      color: isDark ? AppColors.surfaceDark : Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(isDark ? 0.2 : 0.04), blurRadius: 16, offset: const Offset(0, 4)),
      ],
    );

class _StartReturnTile extends StatelessWidget {
  final OrderReturns data;
  final bool isDark;
  final String orderId;
  const _StartReturnTile({required this.data, required this.isDark, required this.orderId});

  @override
  Widget build(BuildContext context) {
    final sub = data.windowEndsAt != null
        ? 'Available until ${fmtReturnDate(data.windowEndsAt)} · Free doorstep pickup'
        : 'Within ${data.windowHours} hours of delivery · Free doorstep pickup';
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push('/order/$orderId/return'),
        child: Ink(
          decoration: _card(isDark),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.assignment_return_outlined, color: Color(0xFFEA580C), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Problem with an item? Return or exchange',
                      style: AppTypography.labelLarge(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
                          .copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(sub, style: AppTypography.captionSmall(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReturnCard extends ConsumerStatefulWidget {
  final ReturnRequestModel r;
  final bool isDark;
  final String orderId;
  const _ReturnCard({required this.r, required this.isDark, required this.orderId});

  @override
  ConsumerState<_ReturnCard> createState() => _ReturnCardState();
}

class _ReturnCardState extends ConsumerState<_ReturnCard> {
  bool _history = false;
  bool _busy = false;

  Future<void> _cancel() async {
    final ok = await AppModal.confirm(
      context,
      title: 'Cancel this request?',
      message: 'You can raise a new one while the return window is open.',
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep it',
      destructive: true,
      icon: Icons.cancel_outlined,
    );
    if (!ok || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiServiceProvider).cancelReturn(widget.r.returnId);
      AppToast.success('Request cancelled');
      ref.invalidate(orderReturnsProvider(widget.orderId));
    } on ApiException catch (e) {
      AppToast.error(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.r;
    final isDark = widget.isDark;
    final copy = returnStatusCopy(r);
    final primary = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final secondary = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final (bg, fg) = switch (copy.tone) {
      ReturnTone.info => (const Color(0xFFE0F2FE), const Color(0xFF075985)),
      ReturnTone.progress => (const Color(0xFFFEF3C7), AppColors.warningText),
      ReturnTone.success => (const Color(0xFFDCFCE7), AppColors.primaryText),
      ReturnTone.muted => (const Color(0xFFF3F4F6), const Color(0xFF4B5563)),
      ReturnTone.danger => (const Color(0xFFFFE4E6), AppColors.errorText),
    };
    final refund = r.refund;

    return Container(
      decoration: _card(isDark),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: r.isExchange ? const Color(0xFFEEF2FF) : const Color(0xFFFFF7ED),
                child: Icon(
                  r.isExchange ? Icons.swap_horiz_rounded : Icons.assignment_return_outlined,
                  size: 17,
                  color: r.isExchange ? const Color(0xFF4F46E5) : const Color(0xFFEA580C),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${r.isExchange ? 'Exchange' : 'Return'} · ${r.returnId}',
                        style: AppTypography.labelLarge(primary).copyWith(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text('${r.itemCount} item${r.itemCount == 1 ? '' : 's'} · ${r.reasonLabel}',
                        maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.captionSmall(secondary)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
                child: Text(copy.title.toUpperCase(),
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, letterSpacing: 0.4, color: fg)),
              ),
            ],
          ),

          if (r.pickupOtp.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2922) : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_outline_rounded, size: 18, color: AppColors.primaryText),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('PICKUP CODE',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: AppColors.primaryText)),
                        Text(
                          r.partnerName.isNotEmpty ? 'Share with ${r.partnerName} after handing over' : 'Share with the partner after handing over',
                          style: TextStyle(fontSize: 11, color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563)),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    r.pickupOtp.split('').join(' '),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryText,
                      letterSpacing: 2,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 10),
          for (final it in r.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text((it['name'] ?? '').toString(),
                        maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.bodySmall(primary)),
                  ),
                  Text('× ${it['quantity']}', style: AppTypography.bodySmall(secondary).copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
            ),

          if (!r.isExchange && refund != null && refund.amount > 0) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF242426) : const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(refund.toWallet ? Icons.account_balance_wallet_outlined : Icons.credit_card_rounded, size: 17, color: secondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${inr(refund.amount)} refund to ${refund.toWallet ? 'FreshCart wallet' : 'original payment method'}',
                          style: AppTypography.labelMedium(primary).copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          switch (refund.status) {
                            'processed' => 'Transferred on ${fmtReturnDate(refund.processedAt)}',
                            'scheduled' || 'processing' => 'Will be transferred by ${fmtReturnDate(refund.dueAt)}',
                            'failed' => 'Transfer delayed — our team is on it',
                            _ => 'Starts once the item is picked up · transferred within 24 hours',
                          },
                          style: AppTypography.captionSmall(secondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          if (r.rejectionReason.isNotEmpty || (r.status == 'Pickup Failed' && r.failureReason.isNotEmpty)) ...[
            const SizedBox(height: 8),
            Text(
              r.rejectionReason.isNotEmpty ? r.rejectionReason : r.failureReason,
              style: AppTypography.captionSmall(AppColors.errorText).copyWith(fontWeight: FontWeight.w700),
            ),
          ],

          const SizedBox(height: 4),
          Row(
            children: [
              TextButton(
                onPressed: () => setState(() => _history = !_history),
                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(44, 36), foregroundColor: secondary),
                child: Text(_history ? 'Hide updates' : 'View updates (${r.timeline.length})',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              ),
              const Spacer(),
              if (r.canCancel)
                TextButton(
                  onPressed: _busy ? null : _cancel,
                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(44, 36), foregroundColor: AppColors.error),
                  child: Text(_busy ? 'Cancelling…' : 'Cancel request', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                ),
            ],
          ),
          if (_history)
            for (var i = 0; i < r.timeline.length; i++)
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      width: 14,
                      child: Column(
                        children: [
                          const SizedBox(height: 5),
                          Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
                          if (i != r.timeline.length - 1)
                            Expanded(child: Container(width: 2, color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(r.timeline[i].status, style: AppTypography.labelMedium(primary).copyWith(fontWeight: FontWeight.w800)),
                            if (r.timeline[i].note.isNotEmpty)
                              Text(r.timeline[i].note, style: AppTypography.captionSmall(secondary)),
                            if (r.timeline[i].at != null)
                              Text(fmtReturnDate(r.timeline[i].at), style: AppTypography.captionSmall(secondary).copyWith(fontSize: 10)),
                          ],
                        ),
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
