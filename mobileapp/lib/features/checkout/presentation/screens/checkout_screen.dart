import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/loading_overlay.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/cart/presentation/widgets/billing_summary.dart';
import 'package:freshcart/features/cart/presentation/widgets/checkout_bar.dart';
import 'package:freshcart/features/checkout/presentation/controllers/checkout_controller.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _method = 'UPI'; // UPI | Card | Wallet | COD

  PaymentMethod get _paymentMethod => switch (_method) {
        'Wallet' => PaymentMethod.wallet,
        'COD' => PaymentMethod.cod,
        _ => PaymentMethod.razorpay,
      };

  void _placeOrder() {
    final address = (ref.read(authProvider).user?.selectedAddress?['addressLine'] ??
            ref.read(authProvider).user?.selectedAddress?['fullAddress'] ??
            '')
        .toString();
    if (address.isEmpty) {
      AppToast.error('Add a delivery address to continue');
      return;
    }
    ref.read(checkoutControllerProvider.notifier).submit(method: _paymentMethod, address: address);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cart = ref.watch(cartProvider);
    final auth = ref.watch(authProvider);
    final checkout = ref.watch(checkoutControllerProvider);

    ref.listen(checkoutControllerProvider, (prev, next) {
      if (next.status == CheckoutStatus.success && next.placedOrderId != null) {
        ref.read(checkoutControllerProvider.notifier).reset();
        context.go('/order-placed/${next.placedOrderId}');
      } else if (next.status == CheckoutStatus.failed && next.error != null) {
        AppToast.error(next.error!);
        ref.read(checkoutControllerProvider.notifier).reset();
      }
    });

    final addr = auth.user?.selectedAddress;
    final wallet = auth.user?.walletBalance ?? 0.0;
    final walletShort = wallet < cart.totalPayableAmount;

    return LoadingOverlay(
      isLoading: checkout.isProcessing,
      message: checkout.stage.isEmpty ? 'Processing…' : checkout.stage,
      child: AppScaffold(
        title: 'Checkout',
        bottomNavigationBar: CheckoutBar(
          label: 'Paying',
          amount: cart.totalPayableAmount,
          cta: 'Place order',
          isLoading: checkout.isProcessing,
          onPressed: cart.items.isEmpty ? null : _placeOrder,
        ),
        body: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            _sectionTitle('Delivery address', isDark),
            const SizedBox(height: 10),
            _AddressCard(address: addr, isDark: isDark, onChange: () => context.push('/addresses')),
            const SizedBox(height: 24),

            _sectionTitle('Delivery', isDark),
            const SizedBox(height: 10),
            _tile(
              isDark,
              icon: Icons.bolt_rounded,
              title: cart.selectedDeliverySlot,
              subtitle: 'Dropped at your door by our rider',
            ),
            const SizedBox(height: 24),

            _sectionTitle('Payment method', isDark),
            const SizedBox(height: 10),
            _PayTile(label: 'UPI / Google Pay', value: 'UPI', icon: Icons.qr_code_rounded, group: _method, onTap: _set),
            _PayTile(label: 'Credit / Debit card', value: 'Card', icon: Icons.credit_card_rounded, group: _method, onTap: _set),
            _PayTile(
              label: 'Wallet · ₹${wallet.toStringAsFixed(0)}',
              value: 'Wallet',
              icon: Icons.account_balance_wallet_rounded,
              group: _method,
              onTap: _set,
              disabled: walletShort,
              disabledNote: 'Low balance',
            ),
            _PayTile(label: 'Cash on delivery', value: 'COD', icon: Icons.payments_outlined, group: _method, onTap: _set),
            const SizedBox(height: 24),

            _sectionTitle('Bill details', isDark),
            const SizedBox(height: 10),
            BillingSummary(cart: cart),
          ],
        ),
      ),
    );
  }

  void _set(String v) => setState(() => _method = v);

  Widget _sectionTitle(String t, bool isDark) => Text(t, style: AppTypography.title(
        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
      ));

  Widget _tile(bool isDark, {required IconData icon, required String title, required String subtitle}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.labelLarge(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                )),
                Text(subtitle, style: AppTypography.bodySmall(
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

class _AddressCard extends StatelessWidget {
  final Map<String, dynamic>? address;
  final bool isDark;
  final VoidCallback onChange;
  const _AddressCard({required this.address, required this.isDark, required this.onChange});

  @override
  Widget build(BuildContext context) {
    if (address == null) {
      return OutlinedButton.icon(
        onPressed: onChange,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Add a delivery address'),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.brMd),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on_rounded, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text((address!['name'] ?? address!['label'] ?? 'Address').toString(),
                    style: AppTypography.labelLarge(
                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    )),
                const SizedBox(height: 2),
                Text((address!['addressLine'] ?? '').toString(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodySmall(
                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                    )),
              ],
            ),
          ),
          TextButton(onPressed: onChange, child: const Text('Change')),
        ],
      ),
    );
  }
}

class _PayTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final String group;
  final ValueChanged<String> onTap;
  final bool disabled;
  final String? disabledNote;

  const _PayTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.group,
    required this.onTap,
    this.disabled = false,
    this.disabledNote,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selected = group == value;
    return Opacity(
      opacity: disabled ? 0.45 : 1,
      child: GestureDetector(
        onTap: disabled ? null : () => onTap(value),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withOpacity(0.08) : (isDark ? AppColors.surfaceDark : AppColors.surface),
            borderRadius: AppRadius.brMd,
            border: Border.all(color: selected ? AppColors.primary : (isDark ? AppColors.dividerDark : AppColors.divider)),
          ),
          child: Row(
            children: [
              Icon(icon, color: selected ? AppColors.primary : AppColors.textSecondary),
              const SizedBox(width: 14),
              Expanded(
                child: Text(label, style: AppTypography.labelLarge(
                  isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                )),
              ),
              if (disabled && disabledNote != null)
                Text(disabledNote!, style: AppTypography.labelSmall(AppColors.error))
              else
                Icon(
                  selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                  color: selected ? AppColors.primary : AppColors.textSecondary,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
