import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

/// Blinkit-style floating green active cart pill button shown above bottom nav.
class FloatingCart extends ConsumerWidget {
  final VoidCallback onTap;
  const FloatingCart({super.key, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final count = cart.totalItemsCount;
    if (count == 0) return const SizedBox.shrink();

    final firstItem = cart.items.isNotEmpty ? cart.items.first.product : null;
    final firstImg = firstItem?.imageUrl ?? '';

    return Align(
      alignment: Alignment.bottomCenter,
      heightFactor: 1.0,
      child: SizedBox(
        width: 210,
        child: Material(
          color: const Color(0xFF0C831F),
          borderRadius: BorderRadius.circular(26),
          elevation: 6,
          shadowColor: const Color(0xFF0C831F).withOpacity(0.4),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(26),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              child: Row(
                children: [
                  // Item Image Preview / Bag Icon Badge
                  Container(
                    width: 32,
                    height: 32,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white24, width: 1.2),
                    ),
                    child: firstImg.startsWith('http')
                        ? CachedNetworkImage(
                            imageUrl: firstImg,
                            fit: BoxFit.cover,
                            errorWidget: (context, url, error) => const Icon(
                              Icons.shopping_bag_rounded,
                              color: Color(0xFF0C831F),
                              size: 16,
                            ),
                          )
                        : const Icon(
                            Icons.shopping_bag_rounded,
                            color: Color(0xFF0C831F),
                            size: 16,
                          ),
                  ),
                  const SizedBox(width: 8),
                  // Title & Count Info
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'View cart',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          '$count ${count == 1 ? 'item' : 'items'} · ₹${cart.totalPayableAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Right arrow badge
                  Container(
                    padding: const EdgeInsets.all(5),
                    decoration: const BoxDecoration(
                      color: Colors.white24,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.white,
                      size: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
