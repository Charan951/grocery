import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/widgets/bottom_nav.dart';
import 'package:freshcart/core/widgets/floating_cart.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';

/// Hosts the five main tab branches ([StatefulNavigationShell]).
/// The bottom navigation bar and floating cart are rendered persistent and static
/// ONLY for the 5 main tab pages (Home, Categories, Search, Orders, Account).
/// Detail routes are pushed to the root navigator outside this shell.
class MainScaffold extends ConsumerStatefulWidget {
  final StatefulNavigationShell navigationShell;
  const MainScaffold({super.key, required this.navigationShell});

  @override
  ConsumerState<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends ConsumerState<MainScaffold> {
  DateTime? _lastBackPress;

  void _onTabTap(int index) {
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
    if (_lastBackPress == null ||
        now.difference(_lastBackPress!) > const Duration(seconds: 2)) {
      _lastBackPress = now;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Press back again to exit')),
        );
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
        resizeToAvoidBottomInset: false,
        body: Stack(
          children: [
            widget.navigationShell,

            // Floating Cart: Visible ONLY on 5 main tabs when cart has items
            if (cartCount > 0)
              Positioned(
                left: 0,
                right: 0,
                bottom: 70.0,
                child: FloatingCart(onTap: () => context.push('/cart')),
              ),

            // Bottom Navigation Bar: Static & persistent on the 5 main tabs
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: CustomBottomNavBar(
                currentIndex: widget.navigationShell.currentIndex,
                onTap: _onTabTap,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
