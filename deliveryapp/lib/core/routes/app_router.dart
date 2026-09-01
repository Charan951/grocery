import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/features/auth/forgot_screen.dart';
import 'package:freshcart_delivery/features/auth/login_screen.dart';
import 'package:freshcart_delivery/features/dashboard/dashboard_screen.dart';
import 'package:freshcart_delivery/features/history/history_screen.dart';
import 'package:freshcart_delivery/features/offer/offer_controller.dart';
import 'package:freshcart_delivery/features/offer/offer_sheet.dart';
import 'package:freshcart_delivery/features/orders/order_detail_screen.dart';
import 'package:freshcart_delivery/features/profile/profile_screen.dart';
import 'package:freshcart_delivery/features/splash/splash_screen.dart';

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authProvider, (_, _) => notifyListeners());
  }
}

const _public = {'/splash', '/login', '/forgot'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
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
      // Authenticated area — an offer overlay sits above every page.
      ShellRoute(
        builder: (c, s, child) => _OfferShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (c, s) => const DashboardScreen()),
          GoRoute(path: '/history', builder: (c, s) => const HistoryScreen()),
          GoRoute(path: '/profile', builder: (c, s) => const ProfileScreen()),
          GoRoute(
            path: '/order/:id',
            builder: (c, s) => OrderDetailScreen(orderId: s.pathParameters['id'] ?? ''),
          ),
        ],
      ),
    ],
  );
});

class _OfferShell extends ConsumerWidget {
  final Widget child;
  const _OfferShell({required this.child});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offer = ref.watch(offerProvider);
    return Stack(children: [
      child,
      if (offer != null) Positioned.fill(child: OfferSheet(offer: offer)),
    ]);
  }
}
