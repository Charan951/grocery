import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/payment_service.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_modal.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/skeletons.dart';
import 'package:freshcart/core/utils/invoice.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/checkout/presentation/controllers/checkout_controller.dart' show paymentGatewayProvider;
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';
import 'package:freshcart/features/orders/presentation/screens/orders_list_screen.dart' show reorder, statusColor, statusIcon;

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final async = ref.watch(orderDetailProvider(orderId));

    return AppScaffold(
      title: 'Order #$orderId',
      actions: async.maybeWhen(
        data: (order) => [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: _DownloadInvoiceButton(order: order),
          ),
        ],
        orElse: () => null,
      ),
      body: async.when(
        loading: () => const _DetailSkeleton(),
        error: (e, _) => ErrorState(onRetry: () => ref.invalidate(orderDetailProvider(orderId))),
        data: (order) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async => ref.invalidate(orderDetailProvider(orderId)),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
            children: [
              // The generic "In Transit" bucket label is redundant once the
              // step-by-step timeline below shows the real status — only
              // show this banner for a final, unambiguous outcome.
              if (!order.isActive) ...[
                _StatusHeader(order: order, isDark: isDark),
                const SizedBox(height: 20),
              ],
              if (order.timeline.isNotEmpty) ...[
                _title('Status', isDark),
                const SizedBox(height: 8),
                _Timeline(entries: order.timeline, isDark: isDark),
                const SizedBox(height: 20),
              ],
              if (order.deliveryOtp.isNotEmpty) ...[
                _DeliveryOtpCard(otp: order.deliveryOtp, isDark: isDark),
                const SizedBox(height: 20),
              ],
              _title('Items (${order.items.length})', isDark),
              const SizedBox(height: 8),
              GlassCard(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    for (final it in order.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: AppRadius.brSm,
                              child: SizedBox(
                                width: 40,
                                height: 40,
                                child: it.product.imageUrl.startsWith('http')
                                    ? CachedNetworkImage(
                                        imageUrl: it.product.imageUrl,
                                        fit: BoxFit.cover,
                                        errorWidget: (_, _, _) => const Icon(Icons.shopping_bag_outlined, size: 16),
                                      )
                                    : const Icon(Icons.shopping_bag_outlined, size: 16),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '${it.product.name}  ·  ${it.selectedWeight}  ×${it.quantity}',
                                style: AppTypography.bodyMedium(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                ),
                              ),
                            ),
                            Text('₹${(it.product.price * it.quantity).toStringAsFixed(0)}',
                                style: AppTypography.labelMedium(
                                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                )),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _title('Bill', isDark),
              const SizedBox(height: 8),
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _row('Item total', '₹${order.subtotal.toStringAsFixed(2)}', isDark),
                    if (order.discount > 0)
                      _row('Discount', '- ₹${order.discount.toStringAsFixed(2)}', isDark, green: true),
                    _row('Delivery', order.deliveryFee == 0 ? 'FREE' : '₹${order.deliveryFee.toStringAsFixed(2)}',
                        isDark, green: order.deliveryFee == 0),
                    _row('Handling fee', '₹${order.platformFee.toStringAsFixed(2)}', isDark),
                    if (order.tax > 0) _row('Taxes', '₹${order.tax.toStringAsFixed(2)}', isDark),
                    Divider(height: 20, color: isDark ? AppColors.dividerDark : AppColors.divider),
                    _row('Total', '₹${order.total.toStringAsFixed(2)}', isDark, bold: true),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _title('Delivery & payment', isDark),
              const SizedBox(height: 8),
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(order.deliveryAddress, style: AppTypography.bodyMedium(
                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    )),
                    const SizedBox(height: 6),
                    Text(
                      '${order.paymentMethod.isEmpty ? 'Payment' : order.paymentMethod} · '
                      '${order.paymentStatus.isEmpty ? '—' : order.paymentStatus}',
                      style: AppTypography.bodySmall(
                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                      ),
                    ),
                    if (_canSwitchToPrepaid(order)) ...[
                      const SizedBox(height: 10),
                      _ChangePaymentMethodButton(
                        order: order,
                        onChanged: () => ref.invalidate(orderDetailProvider(orderId)),
                      ),
                    ],
                  ],
                ),
              ),
              if (order.status == OrderStatus.delivered && order.deliveryPartnerName.isNotEmpty) ...[
                const SizedBox(height: 20),
                _title('Rate your delivery', isDark),
                const SizedBox(height: 8),
                _RatePartnerCard(
                  orderId: order.id,
                  partnerName: order.deliveryPartnerName,
                  initialStars: order.deliveryRatingStars,
                  isDark: isDark,
                  onRated: () => ref.invalidate(orderDetailProvider(orderId)),
                ),
              ],
              const SizedBox(height: 24),
              if (order.isActive)
                PrimaryButton(text: 'Track this order', onPressed: () => context.push('/tracking/${order.id}'))
              else
                SecondaryButton(
                  text: 'Reorder these items',
                  onPressed: () {
                    reorder(ref, order);
                    context.push('/cart');
                  },
                ),
              if (_canCancel(order.status)) ...[
                const SizedBox(height: 12),
                _CancelOrderButton(
                  orderId: order.id,
                  onCancelled: () => ref.invalidate(orderDetailProvider(orderId)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static bool _canCancel(OrderStatus s) =>
      s == OrderStatus.placed || s == OrderStatus.processing;

  /// A COD order still awaiting payment (i.e. not delivered/cancelled and
  /// never paid online) can be switched to a prepaid method — mirrors the
  /// admin console reading the same `paymentMethod`/`paymentStatus` fields.
  static bool _canSwitchToPrepaid(OrderModel o) {
    final isCod = RegExp('cod|cash', caseSensitive: false).hasMatch(o.paymentMethod);
    return o.isActive && isCod && o.paymentStatus.toLowerCase() != 'paid';
  }

  Widget _title(String t, bool isDark) => Text(t, style: AppTypography.title(
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
      ));

  Widget _row(String k, String v, bool isDark, {bool green = false, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: bold
              ? AppTypography.labelLarge(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
              : AppTypography.bodyMedium(isDark ? AppColors.textSecondaryDark : AppColors.textSecondary)),
          Text(v, style: green
              ? AppTypography.labelMedium(AppColors.primaryText)
              : (bold
                  ? AppTypography.labelLarge(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
                  : AppTypography.labelMedium(isDark ? AppColors.textPrimaryDark : AppColors.textPrimary))),
        ],
      ),
    );
  }
}

/// Lets the customer switch a still-unpaid COD order to a prepaid method
/// (Razorpay UPI/Card). On success the order document's `paymentMethod` /
/// `paymentStatus` are updated server-side — the same fields the admin
/// console's Orders list reads, so the change shows up there immediately.
class _ChangePaymentMethodButton extends ConsumerStatefulWidget {
  final OrderModel order;
  final VoidCallback onChanged;
  const _ChangePaymentMethodButton({required this.order, required this.onChanged});

  @override
  ConsumerState<_ChangePaymentMethodButton> createState() => _ChangePaymentMethodButtonState();
}

class _ChangePaymentMethodButtonState extends ConsumerState<_ChangePaymentMethodButton> {
  bool _busy = false;

  Future<void> _pay() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(apiServiceProvider);
      final order = widget.order;

      final rzp = await api.createRazorpayOrder(amount: order.total, receipt: order.id);
      final key = (rzp['key'] ?? '').toString();
      final rzpOrderId = (rzp['orderId'] ?? '').toString();
      final testMode = rzp['testMode'] == true;
      final gateway = (testMode && key.isEmpty) || kIsWeb
          ? SimulatedGateway()
          : ref.read(paymentGatewayProvider);

      final user = ref.read(authProvider).user;
      final result = await gateway.pay(PaymentRequest(
        keyId: key,
        razorpayOrderId: rzpOrderId,
        amountPaise: (order.total * 100).round(),
        name: 'FreshCart',
        description: 'Order ${order.id}',
        contact: user?.phone ?? '',
        email: user?.email ?? '',
      ));

      if (result is PaymentFailure) {
        if (mounted) AppToast.error(result.cancelled ? 'Payment cancelled.' : result.message);
        return;
      }
      final ok = result as PaymentSuccess;

      final verify = await api.verifyPayment(
        razorpayOrderId: ok.razorpayOrderId,
        paymentId: ok.paymentId,
        signature: ok.signature,
        orderId: order.id,
        paymentMethod: 'Razorpay UPI/Card',
      );
      if (verify['verified'] != true) {
        if (mounted) AppToast.error('Could not verify your payment. Your order is still Cash on Delivery.');
        return;
      }

      if (mounted) AppToast.success('Payment method updated — paid via UPI/Card.');
      widget.onChanged();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(e.message);
    } catch (_) {
      if (mounted) AppToast.error('Could not update the payment method. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: _busy ? null : _pay,
      icon: _busy
          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(Icons.sync_alt_rounded, size: 16),
      label: Text(_busy ? 'Processing…' : 'Switch to UPI / Card'),
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primaryText,
        backgroundColor: AppColors.primary.withOpacity(0.10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

class _DownloadInvoiceButton extends StatefulWidget {
  final OrderModel order;
  const _DownloadInvoiceButton({required this.order});

  @override
  State<_DownloadInvoiceButton> createState() => _DownloadInvoiceButtonState();
}

class _DownloadInvoiceButtonState extends State<_DownloadInvoiceButton> {
  bool _busy = false;

  Future<void> _run() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await downloadInvoice(widget.order);
    } catch (_) {
      if (mounted) AppToast.error('Could not generate the invoice. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: _busy ? null : _run,
      tooltip: 'Download Invoice / Credit Note',
      icon: _busy
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF8E24AA)),
            )
          : const Icon(Icons.download_rounded, size: 20),
      style: IconButton.styleFrom(
        foregroundColor: const Color(0xFF8E24AA),
        backgroundColor: const Color(0xFFF3E8FF),
        shape: const CircleBorder(),
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  const _StatusHeader({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final c = statusColor(order.status);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.withOpacity(0.08),
        borderRadius: AppRadius.brLg,
        border: Border.all(color: c.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Icon(statusIcon(order.status), color: c),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(order.statusText, style: AppTypography.labelLarge(c)),
                if (order.eta.isNotEmpty)
                  Text('ETA ${order.eta}', style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DeliveryOtpCard extends StatelessWidget {
  final String otp;
  final bool isDark;
  const _DeliveryOtpCard({required this.otp, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.08),
        borderRadius: AppRadius.brLg,
        border: Border.all(color: AppColors.primary.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('DELIVERY CODE', style: AppTypography.labelSmall(AppColors.primaryText)
                    .copyWith(letterSpacing: 0.4, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text('Share this with your delivery partner at the door', style: AppTypography.bodySmall(
                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                )),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(otp, style: AppTypography.title(AppColors.primaryText).copyWith(
            letterSpacing: 6,
            fontWeight: FontWeight.w800,
            fontFeatures: const [FontFeature.tabularFigures()],
          )),
        ],
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  final List<OrderTimelineEntry> entries;
  final bool isDark;
  const _Timeline({required this.entries, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          for (var i = 0; i < entries.length; i++)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                    ),
                    if (i != entries.length - 1)
                      Container(width: 2, height: 32, color: isDark ? AppColors.dividerDark : AppColors.divider),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(entries[i].status, style: AppTypography.labelMedium(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        )),
                        if (entries[i].note.isNotEmpty)
                          Text(entries[i].note, style: AppTypography.bodySmall(
                            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          )),
                      ],
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _CancelOrderButton extends ConsumerStatefulWidget {
  final String orderId;
  final VoidCallback onCancelled;
  const _CancelOrderButton({required this.orderId, required this.onCancelled});

  @override
  ConsumerState<_CancelOrderButton> createState() => _CancelOrderButtonState();
}

class _CancelOrderButtonState extends ConsumerState<_CancelOrderButton> {
  bool _busy = false;

  Future<void> _run() async {
    final ok = await AppModal.confirm(
      context,
      title: 'Cancel this order?',
      message: 'If you paid online, the amount is refunded to your FreshCart wallet.',
      confirmLabel: 'Yes, cancel order',
      cancelLabel: 'Keep order',
      destructive: true,
      icon: Icons.cancel_outlined,
    );
    if (!ok || _busy) return;
    setState(() => _busy = true);
    try {
      final refunded = await ref
          .read(ordersProvider.notifier)
          .cancelOrder(widget.orderId, reason: 'Cancelled by customer');
      if (!mounted) return;
      AppToast.success(refunded
          ? 'Order cancelled · refund added to your wallet'
          : 'Order cancelled');
      widget.onCancelled();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(e.message);
    } catch (_) {
      if (mounted) AppToast.error('Could not cancel the order. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: _busy ? null : _run,
      icon: _busy
          ? const SizedBox(
              width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(Icons.cancel_outlined, size: 18),
      label: Text(_busy ? 'Cancelling…' : 'Cancel order'),
      style: TextButton.styleFrom(
        foregroundColor: AppColors.error,
        minimumSize: const Size.fromHeight(44),
      ),
    );
  }
}

class _RatePartnerCard extends ConsumerStatefulWidget {
  final String orderId;
  final String partnerName;
  final int initialStars;
  final bool isDark;
  final VoidCallback onRated;
  const _RatePartnerCard({
    required this.orderId,
    required this.partnerName,
    required this.initialStars,
    required this.isDark,
    required this.onRated,
  });

  @override
  ConsumerState<_RatePartnerCard> createState() => _RatePartnerCardState();
}

class _RatePartnerCardState extends ConsumerState<_RatePartnerCard> {
  late int _stars = widget.initialStars;
  final _comment = TextEditingController();
  bool _busy = false;
  bool _editing = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_stars < 1 || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiServiceProvider).ratePartner(
            widget.orderId,
            stars: _stars,
            comment: _comment.text,
          );
      if (!mounted) return;
      setState(() => _editing = false);
      AppToast.success('Thanks for rating your delivery');
      widget.onRated();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(e.message);
    } catch (_) {
      if (mounted) AppToast.error('Could not save your rating. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textColor = widget.isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = widget.isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final rated = widget.initialStars > 0;
    final showForm = _editing || !rated;

    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            rated ? 'You rated this delivery' : 'How was the delivery by ${widget.partnerName}?',
            style: AppTypography.bodyMedium(textColor),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              for (var n = 1; n <= 5; n++)
                Semantics(
                  button: true,
                  label: '$n star${n > 1 ? 's' : ''}',
                  child: IconButton(
                    onPressed: _busy ? null : () => setState(() => _stars = n),
                    visualDensity: VisualDensity.compact,
                    icon: Icon(
                      n <= _stars ? Icons.star_rounded : Icons.star_border_rounded,
                      color: n <= _stars ? AppColors.warning : subColor,
                      size: 30,
                    ),
                  ),
                ),
            ],
          ),
          if (showForm) ...[
            const SizedBox(height: 8),
            TextField(
              controller: _comment,
              maxLength: 500,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Add a note (optional)',
                counterText: '',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 10),
            PrimaryButton(
              text: _busy ? 'Saving…' : 'Submit rating',
              onPressed: (_stars >= 1 && !_busy) ? _submit : null,
            ),
          ] else
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () => setState(() {
                  _editing = true;
                  _stars = widget.initialStars;
                }),
                child: const Text('Change rating'),
              ),
            ),
        ],
      ),
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonGroup(
      child: ListView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBox(height: 64, borderRadius: AppRadius.brLg),
          SizedBox(height: 20),
          SkeletonLine(widthFactor: 0.3, height: 16),
          SizedBox(height: 10),
          SkeletonBox(height: 120, borderRadius: AppRadius.brLg),
          SizedBox(height: 20),
          SkeletonLine(widthFactor: 0.3, height: 16),
          SizedBox(height: 10),
          SkeletonBox(height: 160, borderRadius: AppRadius.brLg),
        ],
      ),
    );
  }
}
