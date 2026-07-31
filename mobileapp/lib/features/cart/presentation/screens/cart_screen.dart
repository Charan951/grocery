import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/feedback_states.dart';
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cartState = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);
    final authState = ref.watch(authProvider);

    final isVip = authState.user?.isVip ?? false;

    if (cartState.items.isEmpty) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        appBar: AppBar(
          title: const Text('My Cart'),
          centerTitle: true,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: () => context.pop(),
          ),
        ),
        body: EmptyState(
          title: 'Your Cart is Empty',
          description: 'Looks like you haven\'t added any items to your cart yet. Let\'s explore some fresh groceries!',
          actionText: 'Shop Now',
          onAction: () => context.go('/'),
        ),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('My Cart'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            onPressed: () {
              cartNotifier.clearCart();
            },
            child: const Text('Clear All', style: TextStyle(color: AppColors.error)),
          )
        ],
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
                      
                      // VIP banner if member
                      if (isVip) ...[
                        GlassCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          color: AppColors.primary.withOpacity(0.08),
                          borderColor: AppColors.primary.withOpacity(0.2),
                          child: Row(
                            children: [
                              const Icon(Icons.workspace_premium_rounded, color: AppColors.primary),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'You saved ₹29.00 Delivery Fee as VIP Member!',
                                  style: AppTypography.labelMedium(AppColors.primary),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Cart Items List
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: cartState.items.length,
                        itemBuilder: (context, index) {
                          final item = cartState.items[index];
                          return Dismissible(
                            key: ValueKey('${item.product.id}_${item.selectedWeight}'),
                            direction: DismissDirection.endToStart,
                            onDismissed: (_) {
                              cartNotifier.deleteItem(item);
                            },
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: 20),
                              decoration: BoxDecoration(
                                color: AppColors.error,
                                borderRadius: BorderRadius.circular(28),
                              ),
                              child: const Icon(Icons.delete_sweep_rounded, color: Colors.white, size: 28),
                            ),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: GlassCard(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    // Image/Icon mockup
                                    Container(
                                      width: 64,
                                      height: 64,
                                      decoration: BoxDecoration(
                                        color: isDark ? Colors.white10 : Colors.black.withOpacity(0.02),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Icon(
                                        _getProductIcon(item.product.imageUrl),
                                        color: item.product.isOrganic ? AppColors.primary : AppColors.accent,
                                        size: 32,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    
                                    // Info
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item.product.name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: AppTypography.title(
                                              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${item.selectedWeight} • ₹${item.product.price.toStringAsFixed(0)}',
                                            style: AppTypography.bodySmall(
                                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    
                                    // Quantity Stepper
                                    Row(
                                      children: [
                                        GestureDetector(
                                          onTap: () {
                                            cartNotifier.removeFromCart(item.product, weight: item.selectedWeight);
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: BoxDecoration(
                                              color: isDark ? Colors.white10 : Colors.black.withOpacity(0.04),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(Icons.remove_rounded, size: 16, color: isDark ? Colors.white : AppColors.textPrimary),
                                          ),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 10.0),
                                          child: Text(
                                            '${item.quantity}',
                                            style: AppTypography.labelLarge(
                                              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                            ),
                                          ),
                                        ),
                                        GestureDetector(
                                          onTap: () {
                                            cartNotifier.addToCart(item.product, weight: item.selectedWeight);
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: const BoxDecoration(
                                              color: AppColors.primary,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 20),

                      // Delivery Slots Selector
                      Text(
                        'Select Delivery Speed',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _buildSlotTile(context, 'Instant (10-15 mins)', 'Delivered from nearest store', cartState.selectedDeliverySlot, cartNotifier),
                      const SizedBox(height: 8),
                      _buildSlotTile(context, 'Evening (5 PM - 7 PM)', 'Scheduled delivery today', cartState.selectedDeliverySlot, cartNotifier),
                      const SizedBox(height: 24),

                      // Coupons / Vouchers Section
                      Text(
                        'Apply Coupon Vouchers',
                        style: AppTypography.title(
                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: MockDataService.mockCoupons.length,
                        itemBuilder: (context, index) {
                          final coupon = MockDataService.mockCoupons[index];
                          final isApplied = cartState.appliedCoupon?['code'] == coupon['code'];

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: GlassCard(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              color: isApplied
                                  ? AppColors.primary.withOpacity(0.08)
                                  : (isDark ? Colors.white.withOpacity(0.02) : Colors.white),
                              borderColor: isApplied
                                  ? AppColors.primary
                                  : (isDark ? Colors.white10 : Colors.black.withOpacity(0.04)),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        coupon['code'] as String,
                                        style: AppTypography.labelLarge(
                                          isApplied ? AppColors.primary : (isDark ? Colors.white : AppColors.textPrimary),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        coupon['description'] as String,
                                        style: AppTypography.bodySmall(
                                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      if (isApplied) {
                                        cartNotifier.removeCoupon();
                                      } else {
                                        final ok = cartNotifier.applyCoupon(coupon);
                                        if (!ok) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text('Minimum order of ₹${coupon['minOrder']} required.'),
                                              behavior: SnackBarBehavior.floating,
                                            ),
                                          );
                                        }
                                      }
                                    },
                                    child: Text(
                                      isApplied ? 'REMOVE' : 'APPLY',
                                      style: TextStyle(
                                        color: isApplied ? AppColors.error : AppColors.primary,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),

                      // Price Summary Details
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
            
            // Sticky Checkout Bar
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
                          'Payable Total',
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
                        text: 'Checkout',
                        onPressed: () {
                          context.push('/checkout');
                        },
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

  Widget _buildSlotTile(BuildContext context, String title, String subtitle, String currentSlot, CartNotifier notifier) {
    final isSelected = currentSlot == title;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => notifier.setDeliverySlot(title),
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
            Column(
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
                  ),
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

  IconData _getProductIcon(String type) {
    switch (type.toLowerCase()) {
      case 'apple':
      case 'fruits':
        return Icons.apple_rounded;
      case 'vegetables':
      case 'carrot':
      case 'broccoli':
        return Icons.grass_rounded;
      case 'milk':
      case 'dairy':
        return Icons.water_drop_rounded;
      case 'bread':
      case 'bakery':
        return Icons.bakery_dining_rounded;
      case 'chicken':
      case 'meat':
        return Icons.kebab_dining_rounded;
      case 'pizza':
        return Icons.local_pizza_rounded;
      case 'burger':
        return Icons.lunch_dining_rounded;
      case 'beverages':
      case 'soda':
        return Icons.local_drink_rounded;
      case 'snacks':
      case 'chips':
        return Icons.cookie_rounded;
      default:
        return Icons.shopping_bag_rounded;
    }
  }
}
