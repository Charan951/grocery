import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/features/offer/offer_controller.dart';
import 'package:freshcart_delivery/features/offer/offer_sheet.dart';

/// Bottom-nav scaffold for the authed area (Home · Orders · Earnings · Profile),
/// with the live delivery-offer sheet layered above every tab.
class MainShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;
  const MainShell({super.key, required this.navigationShell});

  void _go(int i) => navigationShell.goBranch(
        i,
        initialLocation: i == navigationShell.currentIndex,
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offer = ref.watch(offerProvider);

    return Scaffold(
      body: Stack(
        children: [
          navigationShell,
          if (offer != null) Positioned.fill(child: OfferSheet(offer: offer)),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: _go,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2_rounded),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet_rounded),
            label: 'Earnings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
