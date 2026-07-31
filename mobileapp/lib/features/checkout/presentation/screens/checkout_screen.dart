import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _selectedPaymentMethod = 'UPI'; // UPI, Wallet, Card, COD
  bool _isPlacingOrder = false;

  void _onPlaceOrder(CartState cartState, AuthState authState) async {
    setState(() {
      _isPlacingOrder = true;
    });

    // Simulate payment processing
    await Future.delayed(const Duration(milliseconds: 2000));

    final selectedAddr = authState.user?.selectedAddress?['addressLine'] ?? 'Flat 402, Apple Heights';
    
    // Deduct wallet if selected
    if (_selectedPaymentMethod == 'Wallet') {
      final balance = authState.user?.walletBalance ?? 0.0;
      if (balance >= cartState.totalPayableAmount) {
        ref.read(authProvider.notifier).deductWallet(cartState.totalPayableAmount);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Insufficient wallet balance. Please pick another payment method.')),
        );
        setState(() {
          _isPlacingOrder = false;
        });
        return;
      }
    }

    final orderId = ref.read(ordersProvider.notifier).placeOrder(
          items: cartState.items,
          subtotal: cartState.subtotal,
          deliveryFee: cartState.deliveryFee,
          platformFee: cartState.platformFee,
          discount: cartState.couponDiscount,
          tax: cartState.taxAmount,
          total: cartState.totalPayableAmount,
          address: selectedAddr,
        );

    // Clear cart
    ref.read(cartProvider.notifier).clearCart();

    setState(() {
      _isPlacingOrder = false;
    });

    if (mounted) {
      context.go('/tracking/$orderId');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cartState = ref.watch(cartProvider);
    final authState = ref.watch(authProvider);

    final selectedAddress = authState.user?.selectedAddress;
    final walletBalance = authState.user?.walletBalance ?? 0.0;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Checkout Details'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 12),
                      
                      // Delivery Address Section
                      Text(
                        'Delivery Address',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (selectedAddress != null)
                        GlassCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.location_on_rounded, color: AppColors.primary),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      selectedAddress['tag'] as String,
                                      style: AppTypography.labelLarge(
                                        isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      selectedAddress['addressLine'] as String,
                                      style: AppTypography.bodySmall(
                                        isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              TextButton(
                                onPressed: () {
                                  context.push('/addresses');
                                },
                                child: const Text('Change'),
                              ),
                            ],
                          ),
                        )
                      else
                        ElevatedButton(
                          onPressed: () => context.push('/addresses'),
                          child: const Text('Add Address'),
                        ),
                      const SizedBox(height: 24),

                      // Delivery Speed Section
                      Text(
                        'Delivery Mode',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            const Icon(Icons.electric_bolt_rounded, color: AppColors.primary),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cartState.selectedDeliverySlot,
                                    style: AppTypography.labelLarge(
                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    'Delivery partner will drop it off at your door.',
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
                      const SizedBox(height: 24),

                      // Payment Method Section
                      Text(
                        'Payment Method',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _buildPaymentTile('UPI / Google Pay', 'UPI', Icons.account_balance_wallet_rounded, isDark),
                      const SizedBox(height: 8),
                      _buildPaymentTile('Wallet (Balance: ₹$walletBalance)', 'Wallet', Icons.wallet_rounded, isDark, disabled: walletBalance < cartState.totalPayableAmount),
                      const SizedBox(height: 8),
                      _buildPaymentTile('Credit / Debit Card', 'Card', Icons.credit_card_rounded, isDark),
                      const SizedBox(height: 8),
                      _buildPaymentTile('Cash on Delivery', 'COD', Icons.handshake_rounded, isDark),
                      const SizedBox(height: 24),

                      // Final Billing Summary
                      Text(
                        'Billing Summary',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      GlassCard(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            _buildSummaryRow('Item Total (MRP)', '₹${cartState.totalMrp.toStringAsFixed(2)}', isDark),
                            _buildSummaryRow('Product Discount', '- ₹${cartState.itemSavings.toStringAsFixed(2)}', isDark, isGreen: true),
                            if (cartState.couponDiscount > 0)
                              _buildSummaryRow('Coupon Discount', '- ₹${cartState.couponDiscount.toStringAsFixed(2)}', isDark, isGreen: true),
                            _buildSummaryRow('Platform Fee', '₹${cartState.platformFee.toStringAsFixed(2)}', isDark),
                            _buildSummaryRow('Delivery Charges', cartState.deliveryFee == 0.0 ? 'FREE' : '₹${cartState.deliveryFee.toStringAsFixed(2)}', isDark, isGreen: cartState.deliveryFee == 0.0),
                            _buildSummaryRow('Taxes & GST (5%)', '₹${cartState.taxAmount.toStringAsFixed(2)}', isDark),
                            const Divider(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Total Payable',
                                  style: AppTypography.labelLarge(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  ).copyWith(fontSize: 16),
                                ),
                                Text(
                                  '₹${cartState.totalPayableAmount.toStringAsFixed(2)}',
                                  style: AppTypography.h2(
                                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                  ).copyWith(fontSize: 18),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 120), // bottom spacer
                    ],
                  ),
                ),
              ),
            ),
            
            // Place Order Sticky Bar
            Positioned(
              child: GlassCard(
                borderRadius: 32,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                color: isDark ? const Color(0xE01C1C1E) : const Color(0xE6FFFFFF),
                borderColor: isDark ? Colors.white12 : Colors.black.withOpacity(0.04),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Paying',
                          style: AppTypography.bodySmall(
                            isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                          ),
                        ),
                        Text(
                          '₹${cartState.totalPayableAmount.toStringAsFixed(0)}',
                          style: AppTypography.h1(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ).copyWith(fontSize: 22),
                        ),
                      ],
                    ),
                    SizedBox(
                      width: 170,
                      child: PrimaryButton(
                        text: 'Place Order',
                        isLoading: _isPlacingOrder,
                        onPressed: () => _onPlaceOrder(cartState, authState),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentTile(String name, String key, IconData icon, bool isDark, {bool disabled = false}) {
    final isSelected = _selectedPaymentMethod == key;

    return GestureDetector(
      onTap: disabled ? null : () {
        setState(() {
          _selectedPaymentMethod = key;
        });
      },
      child: Opacity(
        opacity: disabled ? 0.4 : 1.0,
        child: GlassCard(
          padding: const EdgeInsets.all(16),
          color: isSelected
              ? AppColors.primary.withOpacity(0.08)
              : (isDark ? Colors.white.withOpacity(0.02) : Colors.white),
          borderColor: isSelected
              ? AppColors.primary
              : (isDark ? Colors.white12 : Colors.black.withOpacity(0.04)),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, color: isSelected ? AppColors.primary : (isDark ? Colors.white70 : AppColors.textPrimary)),
                  const SizedBox(width: 16),
                  Text(
                    name,
                    style: AppTypography.labelLarge(
                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                    ).copyWith(fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500),
                  ),
                ],
              ),
              Icon(
                isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                color: isSelected ? AppColors.primary : (isDark ? Colors.white30 : Colors.black26),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String title, String val, bool isDark, {bool isGreen = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: AppTypography.bodyMedium(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ),
          ),
          Text(
            val,
            style: AppTypography.labelMedium(
              isGreen
                  ? AppColors.primary
                  : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
