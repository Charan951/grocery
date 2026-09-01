import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/widgets/bottom_nav.dart';
import 'package:freshcart/core/widgets/floating_cart.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

/// Hosts the five bottom-nav branches ([StatefulNavigationShell]). The bottom
/// nav is always visible (a persistent full-width bar). The cart bar, when the
/// cart is non-empty, sits directly above it.
class MainScaffold extends ConsumerStatefulWidget {
  final StatefulNavigationShell navigationShell;
  const MainScaffold({super.key, required this.navigationShell});

  @override
  ConsumerState<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends ConsumerState<MainScaffold> {
  DateTime? _lastBackPress;

  void _onTabTap(int index) {
    // Tapping the active tab again pops it to its root.
    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  /// Returns true when the app should actually be allowed to exit.
  bool _handleBack() {
    if (widget.navigationShell.currentIndex != 0) {
      widget.navigationShell.goBranch(0);
      return false;
    }
    final now = DateTime.now();
    if (_lastBackPress == null || now.difference(_lastBackPress!) > const Duration(seconds: 2)) {
      _lastBackPress = now;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Press back again to exit')));
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartProvider.select((c) => c.totalItemsCount));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_handleBack()) {
          Navigator.of(context).maybePop();
        }
      },
      child: Scaffold(
        body: widget.navigationShell,
        bottomNavigationBar: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (cartCount > 0) FloatingCart(onTap: () => context.push('/cart')),
            CustomBottomNavBar(
              currentIndex: widget.navigationShell.currentIndex,
              onTap: _onTabTap,
            ),
          ],
        ),
      ),
    );
  }
}
