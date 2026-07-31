import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

class FloatingCart extends ConsumerWidget {
  final int itemCount;
  final double totalPrice;
  final VoidCallback onTap;
  final bool applySafeAreaBottom;

  const FloatingCart({
    super.key,
    required this.itemCount,
    required this.totalPrice,
    required this.onTap,
    this.applySafeAreaBottom = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartState = ref.watch(cartProvider);
    final subtotal = cartState.subtotal;
    final totalCount = cartState.totalItemsCount;

    if (totalCount == 0) return const SizedBox.shrink();

    // Threshold for free delivery is 400.0
    const threshold = 400.0;
    final remainingForFree = threshold - subtotal;
    final hasFreeDelivery = remainingForFree <= 0;

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return SafeArea(
      bottom: applySafeAreaBottom,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            height: 60,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1B2E24) : const Color(0xFFE8F6EE),
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.4 : 0.08),
                  blurRadius: 15,
                  offset: const Offset(0, 6),
                ),
              ],
              border: Border.all(
                color: isDark ? Colors.white10 : const Color(0xFFC8E6C9),
                width: 1.2,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(
              children: [
                // Delivery Icon inside white circle with border
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF2E7D32),
                      width: 1.5,
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.motorcycle_rounded,
                      color: Color(0xFF2E7D32),
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                
                // Delivery texts
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Unlock FREE Delivery',
                        style: TextStyle(
                          color: Color(0xFF1B5E20),
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                          letterSpacing: -0.1,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        hasFreeDelivery
                            ? 'Free delivery unlocked!'
                            : 'Shop for ₹${remainingForFree.toStringAsFixed(0)} more',
                        style: TextStyle(
                          color: const Color(0xFF2E7D32).withOpacity(0.85),
                          fontWeight: FontWeight.bold,
                          fontSize: 10.5,
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Right Pill Button: Shopping Bag icon + Count + Arrow
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F3E21), // Dark green pill background
                    borderRadius: BorderRadius.circular(22),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Shopping bag icon (colored light green)
                      const Icon(
                        Icons.shopping_bag_rounded,
                        color: Color(0xFFC0FF00), // Lime green/yellow color
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      // Cart count
                      Text(
                        '$totalCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Arrow
                      const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 16,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
