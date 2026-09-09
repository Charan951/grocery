import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/features/auth/forgot_screen.dart';
import 'package:freshcart_delivery/features/auth/login_screen.dart';
import 'package:freshcart_delivery/features/dashboard/dashboard_screen.dart';
import 'package:freshcart_delivery/features/earnings/earnings_screen.dart';
import 'package:freshcart_delivery/features/main/main_shell.dart';
import 'package:freshcart_delivery/features/notifications/notifications_screen.dart';
import 'package:freshcart_delivery/features/orders/orders_screen.dart';
import 'package:freshcart_delivery/features/orders/order_detail_screen.dart';
import 'package:freshcart_delivery/features/profile/profile_screen.dart';
import 'package:freshcart_delivery/features/splash/splash_screen.dart';

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authProvider, (_, _) => notifyListeners());
  }
}

const _public = {'/splash', '/login', '/forgot'};

final _rootKey = GlobalKey<NavigatorState>();
final _homeKey = GlobalKey<NavigatorState>();
final _ordersKey = GlobalKey<NavigatorState>();
final _earningsKey = GlobalKey<NavigatorState>();
final _profileKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loc = state.matchedLocation;
      if (auth.isHydrating) return null;
      if (!auth.isAuthenticated) return _public.contains(loc) ? null : '/login';
      if (loc == '/login' || loc == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (c, s) => const SplashScreen()),
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/forgot', builder: (c, s) => const ForgotScreen()),

      // Full-screen authed routes (no bottom nav).
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/order/:id',
        builder: (c, s) => OrderDetailScreen(orderId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootKey,
        path: '/notifications',
        builder: (c, s) => const NotificationsScreen(),
      ),

      // Bottom-nav shell: Home · Orders · Earnings · Profile. An offer overlay
      // sits above every tab (see MainShell).
      StatefulShellRoute.indexedStack(
        builder: (c, s, navigationShell) => MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            navigatorKey: _homeKey,
            routes: [GoRoute(path: '/', builder: (c, s) => const DashboardScreen())],
          ),
          StatefulShellBranch(
            navigatorKey: _ordersKey,
            routes: [GoRoute(path: '/orders', builder: (c, s) => const OrdersScreen())],
          ),
          StatefulShellBranch(
            navigatorKey: _earningsKey,
            routes: [GoRoute(path: '/earnings', builder: (c, s) => const EarningsScreen())],
          ),
          StatefulShellBranch(
            navigatorKey: _profileKey,
            routes: [GoRoute(path: '/profile', builder: (c, s) => const ProfileScreen())],
          ),
        ],
      ),
    ],
  );
});
