import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/widgets/bottom_nav.dart';
import 'package:freshcart/core/widgets/floating_cart.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/home/presentation/screens/home_screen.dart';
import 'package:freshcart/features/categories/presentation/screens/categories_screen.dart';
import 'package:freshcart/features/search/presentation/screens/search_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/profile_screen.dart';

class MainNavigationShell extends ConsumerStatefulWidget {
  const MainNavigationShell({super.key});

  @override
  ConsumerState<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends ConsumerState<MainNavigationShell> {
  int _currentIndex = 0;
  bool _isNavbarVisible = true;

  final List<Widget> _tabs = [
    const HomeScreen(),
    const CategoriesScreen(),
    const SearchScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);

    return Scaffold(
      body: Stack(
        children: [
          // Content Shell wrapped with Scroll Notification listener
          NotificationListener<UserScrollNotification>(
            onNotification: (notification) {
              if (notification.direction == ScrollDirection.forward) {
                if (!_isNavbarVisible) {
                  setState(() {
                    _isNavbarVisible = true;
                  });
                }
              } else if (notification.direction == ScrollDirection.reverse) {
                if (_isNavbarVisible) {
                  setState(() {
                    _isNavbarVisible = false;
                  });
                }
              }
              return true;
            },
            child: IndexedStack(
              index: _currentIndex,
              children: _tabs,
            ),
          ),
          
          // Floating Cart (displayed if items in cart)
          if (cartState.totalItemsCount > 0)
            AnimatedPositioned(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              left: 0,
              right: 0,
              bottom: _isNavbarVisible ? 84.0 : 0.0,
              child: FloatingCart(
                itemCount: cartState.totalItemsCount,
                totalPrice: cartState.totalPayableAmount,
                applySafeAreaBottom: !_isNavbarVisible,
                onTap: () {
                  context.push('/cart');
                },
              ),
            ),

          // Floating Bottom Navbar wrapped with slide animation
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: AnimatedSlide(
              offset: _isNavbarVisible ? Offset.zero : const Offset(0, 1.2),
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              child: CustomBottomNavBar(
                currentIndex: _currentIndex,
                onTap: (index) {
                  setState(() {
                    _currentIndex = index;
                  });
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
