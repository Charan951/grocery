import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/widgets/floating_cart.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

/// A slim "N items · ₹total · View cart" bar for full-screen catalog routes
/// (which sit above the tab shell and so don't get the shell's floating cart).
/// Renders nothing when the cart is empty.
class CatalogCartBar extends ConsumerWidget {
  const CatalogCartBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final count = cart.totalItemsCount;
    if (count == 0) return const SizedBox.shrink();

    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 12),
      child: FloatingCart(onTap: () => context.push('/cart')),
    );
  }
}
