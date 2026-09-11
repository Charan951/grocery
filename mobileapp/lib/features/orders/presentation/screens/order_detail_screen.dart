import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/checkout/presentation/controllers/checkout_controller.dart' show paymentGatewayProvider;
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/orders/data/models/order_model.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';
import 'package:freshcart/features/orders/presentation/screens/orders_list_screen.dart' show reorder;

/// Stable per-customer order number (#1 = this customer's very first order),
/// derived from the full orders list (newest-first from the backend) instead
/// of the raw DB order id — falls back to the raw id while the list hasn't
/// loaded yet (e.g. this screen opened directly, before Orders was visited).
String _customerOrderLabel(String orderId, List<OrderModel>? orders) {
  if (orders != null) {
    final total = orders.length;
    final idx = orders.indexWhere((o) => o.id == orderId);
    if (idx != -1) return 'Order #${total - idx}';
  }
  return 'Order #$orderId';
}

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  static bool canCancel(OrderStatus s) =>
      s == OrderStatus.placed || s == OrderStatus.processing;

  static bool canSwitchToPrepaid(OrderModel o) {
    final isCod = RegExp('cod|cash', caseSensitive: false).hasMatch(o.paymentMethod);
    return o.isActive && isCod && o.paymentStatus.toLowerCase() != 'paid';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final async = ref.watch(orderDetailProvider(orderId));

    return AppScaffold(
      title: _customerOrderLabel(orderId, ref.watch(ordersProvider).valueOrNull),
      actions: async.maybeWhen(
        data: (order) => [
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: _CopyOrderButton(orderId: order.id),
          ),
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
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
            children: [
              _StatusHeader(order: order, isDark: isDark),
              if (order.timeline.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionTitle('Status', isDark),
                const SizedBox(height: 8),
                _Timeline(entries: order.timeline, isDark: isDark),
              ],
              if (order.deliveryOtp.isNotEmpty && order.isActive) ...[
                const SizedBox(height: 16),
                _DeliveryOtpCard(otp: order.deliveryOtp, isDark: isDark),
              ],
              const SizedBox(height: 16),
              _sectionTitle('Items in Order (${order.items.length})', isDark),
              const SizedBox(height: 8),
              _ItemsCard(items: order.items, isDark: isDark),
              const SizedBox(height: 16),
              _sectionTitle('Bill Summary', isDark),
              const SizedBox(height: 8),
              _BillCard(order: order, isDark: isDark),
              const SizedBox(height: 16),
              _sectionTitle('Delivery & Payment', isDark),
              const SizedBox(height: 8),
              _DeliveryAndPaymentCard(
                order: order,
                isDark: isDark,
                onPaymentMethodChanged: () => ref.invalidate(orderDetailProvider(orderId)),
              ),
              if (order.status == OrderStatus.delivered && order.deliveryPartnerName.isNotEmpty) ...[
                const SizedBox(height: 16),
                _sectionTitle('Rate your delivery', isDark),
                const SizedBox(height: 8),
                _RatePartnerCard(
                  orderId: order.id,
                  partnerName: order.deliveryPartnerName,
                  initialStars: order.deliveryRatingStars,
                  isDark: isDark,
                  onRated: () => ref.invalidate(orderDetailProvider(orderId)),
                ),
              ],
              const SizedBox(height: 20),
              if (order.isActive)
                PrimaryButton(
                  text: 'Track this order',
                  onPressed: () => context.push('/tracking/${order.id}'),
                )
              else
                Consumer(
                  builder: (context, ref, _) => PrimaryButton(
                    text: 'Reorder these items',
                    onPressed: () {
                      reorder(ref, order);
                      context.push('/cart');
                    },
                  ),
                ),
              if (OrderDetailScreen.canCancel(order.status)) ...[
                const SizedBox(height: 8),
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

  Widget _sectionTitle(String title, bool isDark) {
    return Text(
      title,
      style: AppTypography.title(
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
      ),
    );
  }
}

int _currentStepIndex(OrderStatus status, String statusRaw) {
  if (status == OrderStatus.delivered) return 3;
  final raw = statusRaw.toLowerCase();
  if (status == OrderStatus.dispatched ||
      raw == 'in progress' ||
      raw == 'in transit' ||
      raw == 'out for delivery' ||
      raw == 'assigned' ||
      raw == 'arrived') {
    return 2;
  }
  if (status == OrderStatus.processing ||
      raw == 'packed' ||
      raw == 'ready' ||
      raw == 'arrived at store') {
    return 1;
  }
  return 0; // Placed / Pending / Accepted
}

class _MilestoneStepper extends StatelessWidget {
  final int currentStep;
  final bool isDark;
  const _MilestoneStepper({required this.currentStep, required this.isDark});

  static const _steps = ['Order Placed', 'Packed', 'In Progress', 'Delivered'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < _steps.length; i++) ...[
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 2.5,
                        color: i == 0
                            ? Colors.transparent
                            : (i <= currentStep
                                ? AppColors.primary
                                : (isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB))),
                      ),
                    ),
                    _stepCircle(i),
                    Expanded(
                      child: Container(
                        height: 2.5,
                        color: i == _steps.length - 1
                            ? Colors.transparent
                            : (i < currentStep
                                ? AppColors.primary
                                : (isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB))),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _steps[i],
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: i == currentStep
                        ? FontWeight.w800
                        : (i < currentStep ? FontWeight.w600 : FontWeight.w500),
                    color: i == currentStep
                        ? AppColors.primaryText
                        : (i < currentStep
                            ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary)
                            : (isDark ? AppColors.textSecondaryDark : const Color(0xFF9CA3AF))),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _stepCircle(int index) {
    final isDone = index < currentStep;
    final isCurrent = index == currentStep;
    if (isDone) {
      return Container(
        width: 22,
        height: 22,
        decoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.check_rounded, color: Colors.white, size: 14),
      );
    }
    if (isCurrent) {
      return Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.35),
              blurRadius: 6,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Center(
          child: Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
        ),
      );
    }
    return Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : const Color(0xFFF3F4F6),
        shape: BoxShape.circle,
        border: Border.all(
          color: isDark ? AppColors.dividerDark : const Color(0xFFD1D5DB),
          width: 1.5,
        ),
      ),
    );
  }
}

/// Computes a live "N mins" / "Any moment" label from the order's placed
/// time + its estimated-delivery minutes, instead of freezing at whatever
/// the estimate was when the order was first placed.
String? _liveEtaLabel(OrderModel order) {
  final totalMinutes = int.tryParse(RegExp(r'\d+').firstMatch(order.eta)?.group(0) ?? '') ?? 10;
  final elapsedMinutes = DateTime.now().difference(order.date).inSeconds / 60;
  final remaining = (totalMinutes - elapsedMinutes).round();
  if (remaining <= 0) return 'Any moment';
  return '$remaining min${remaining == 1 ? '' : 's'}';
}

class _StatusHeader extends StatefulWidget {
  final OrderModel order;
  final bool isDark;
  const _StatusHeader({required this.order, required this.isDark});

  @override
  State<_StatusHeader> createState() => _StatusHeaderState();
}

class _StatusHeaderState extends State<_StatusHeader> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final isDark = widget.isDark;
    final isArriving = order.isActive;
    final isOutForDelivery = order.statusRaw.toLowerCase() == 'out for delivery';
    final isDelivered = order.status == OrderStatus.delivered;
    final isCancelled = order.status == OrderStatus.cancelled;
    final liveEta = _liveEtaLabel(order);

    final badgeTextColor = isCancelled ? AppColors.errorText : AppColors.primaryText;
    final badgeBg = isCancelled ? const Color(0xFFFFEBEE) : const Color(0xFFE8F5E9);

    final statusTitle = isCancelled
        ? 'Cancelled'
        : (isDelivered
            ? 'Delivered'
            : (isOutForDelivery
                ? 'Arriving in ${liveEta ?? (order.eta.isNotEmpty ? order.eta : "8 mins")}'
                : 'In Progress'));

    final headline = isCancelled
        ? 'Order Cancelled'
        : (isDelivered
            ? 'Delivered to your doorstep'
            : (isOutForDelivery
                ? 'Delivery partner is on the way!'
                : 'Your order is in progress'));

    final subtitle = isCancelled
        ? 'This order has been cancelled and refunded if prepaid.'
        : (isDelivered
            ? 'Delivered with care from your local FreshCart dark store.'
            : 'Fresh grocery items handpicked from your local FreshCart store.');

    final stepIdx = _currentStepIndex(order.status, order.statusRaw);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isCancelled
                          ? Icons.cancel_rounded
                          : (isDelivered ? Icons.check_circle_rounded : Icons.bolt_rounded),
                      size: 15,
                      color: badgeTextColor,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      statusTitle.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: badgeTextColor,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
              if (isArriving)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.timer_outlined, size: 13, color: AppColors.primaryText),
                      const SizedBox(width: 4),
                      Text(
                        liveEta ?? (order.eta.isNotEmpty ? order.eta : '10 mins'),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryText,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            headline,
            style: AppTypography.titleLarge(
              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
            ).copyWith(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: AppTypography.bodySmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ).copyWith(height: 1.3),
          ),
          if (!isCancelled) ...[
            const SizedBox(height: 18),
            Divider(height: 1, color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6)),
            const SizedBox(height: 16),
            _MilestoneStepper(currentStep: stepIdx, isDark: isDark),
          ],
          if (isArriving) ...[
            const SizedBox(height: 16),
            InkWell(
              onTap: () => context.push('/tracking/${order.id}'),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF242426) : const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 16),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Live tracking is active',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                            ),
                          ),
                          Text(
                            'Tap to see rider on live map',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 20),
                  ],
                ),
              ),
            ),
          ],
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2922) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF86EFAC)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lock_outline_rounded, color: AppColors.primaryText, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'DOORSTEP CODE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                    color: AppColors.primaryText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Share with delivery partner at door',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: Text(
              otp.split('').join(' '),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: AppColors.primaryText,
                letterSpacing: 2,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemsCard extends StatelessWidget {
  final List<CartItemModel> items;
  final bool isDark;
  const _ItemsCard({required this.items, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Divider(
                  height: 1,
                  color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6),
                ),
              ),
            _itemRow(items[i]),
          ],
        ],
      ),
    );
  }

  Widget _itemRow(CartItemModel it) {
    final price = it.product.price * it.quantity;
    final mrp = it.product.mrp * it.quantity;

    return Row(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF242426) : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB),
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: it.product.imageUrl.startsWith('http')
              ? CachedNetworkImage(
                  imageUrl: it.product.imageUrl,
                  fit: BoxFit.contain,
                  errorWidget: (_, _, _) => const Icon(
                    Icons.shopping_bag_outlined,
                    size: 20,
                    color: Color(0xFF9CA3AF),
                  ),
                )
              : const Icon(
                  Icons.shopping_bag_outlined,
                  size: 20,
                  color: Color(0xFF9CA3AF),
                ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                it.product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      it.selectedWeight,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '× ${it.quantity}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '₹${price.toStringAsFixed(0)}',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            if (mrp > price)
              Text(
                '₹${mrp.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF9CA3AF),
                  decoration: TextDecoration.lineThrough,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _BillCard extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  const _BillCard({required this.order, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final savedOnDelivery = order.deliveryFee == 0 ? 30.0 : 0.0;
    final totalSavings = order.discount + savedOnDelivery;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _row('Item total', '₹${order.subtotal.toStringAsFixed(2)}', isDark),
          if (order.discount > 0)
            _row('Discount', '- ₹${order.discount.toStringAsFixed(2)}', isDark, green: true),
          _row(
            'Delivery fee',
            order.deliveryFee == 0 ? 'FREE' : '₹${order.deliveryFee.toStringAsFixed(2)}',
            isDark,
            green: order.deliveryFee == 0,
            originalStrikethrough: order.deliveryFee == 0 ? '₹30.00' : null,
          ),
          _row('Handling fee', '₹${order.platformFee.toStringAsFixed(2)}', isDark),
          if (order.tax > 0)
            _row('Taxes', '₹${order.tax.toStringAsFixed(2)}', isDark),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Divider(
              height: 1,
              color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Bill',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                ),
              ),
              Text(
                '₹${order.total.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          if (totalSavings > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2922) : const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                children: [
                  const Text('🎉 ', style: TextStyle(fontSize: 14)),
                  Expanded(
                    child: Text(
                      'You saved ₹${totalSavings.toStringAsFixed(0)} on this order!',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _row(
    String label,
    String value,
    bool isDark, {
    bool green = false,
    String? originalStrikethrough,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.textSecondaryDark : const Color(0xFF4B5563),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (originalStrikethrough != null) ...[
                Text(
                  originalStrikethrough,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF9CA3AF),
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                value,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: green
                      ? AppColors.primaryText
                      : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DeliveryAndPaymentCard extends StatelessWidget {
  final OrderModel order;
  final bool isDark;
  final VoidCallback onPaymentMethodChanged;
  const _DeliveryAndPaymentCard({
    required this.order,
    required this.isDark,
    required this.onPaymentMethodChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isPaid = order.paymentStatus.toLowerCase() == 'paid';
    final isCod = RegExp('cod|cash', caseSensitive: false).hasMatch(order.paymentMethod);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Address section
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.location_on_rounded, color: AppColors.primaryText, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Delivery Address',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      order.deliveryAddress,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Divider(
              height: 1,
              color: isDark ? AppColors.dividerDark : const Color(0xFFF3F4F6),
            ),
          ),
          // Payment section
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFF8E24AA).withOpacity(0.10),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF8E24AA), size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Payment Method',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.textSecondaryDark : const Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Text(
                          order.paymentMethod.isEmpty ? 'Payment' : order.paymentMethod,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: isPaid
                                ? const Color(0xFFE8F5E9)
                                : (isCod ? const Color(0xFFFFF3E0) : const Color(0xFFF3F4F6)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isPaid
                                ? 'PAID'
                                : (order.paymentStatus.isNotEmpty
                                    ? order.paymentStatus.toUpperCase()
                                    : 'PENDING'),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: isPaid
                                  ? AppColors.primaryText
                                  : (isCod ? const Color(0xFFE65100) : const Color(0xFF6B7280)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (OrderDetailScreen.canSwitchToPrepaid(order)) ...[
                      const SizedBox(height: 8),
                      _ChangePaymentMethodButton(
                        order: order,
                        onChanged: onPaymentMethodChanged,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CopyOrderButton extends StatelessWidget {
  final String orderId;
  const _CopyOrderButton({required this.orderId});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Copy Order ID',
      icon: const Icon(Icons.copy_rounded, size: 18),
      onPressed: () {
        Clipboard.setData(ClipboardData(text: orderId));
        AppToast.success('Order ID copied: #$orderId');
      },
    );
  }
}

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

class _Timeline extends StatelessWidget {
  final List<OrderTimelineEntry> entries;
  final bool isDark;
  const _Timeline({required this.entries, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
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

    return Container(
      decoration: BoxDecoration(
        color: widget.isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: widget.isDark ? AppColors.dividerDark : const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(widget.isDark ? 0.2 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            rated ? 'You rated this delivery' : 'How was the delivery by ${widget.partnerName}?',
            style: AppTypography.bodyMedium(textColor).copyWith(fontWeight: FontWeight.w700),
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
          SkeletonBox(height: 160, borderRadius: AppRadius.brLg),
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
