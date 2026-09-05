import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/home/presentation/screens/main_shell.dart';
import 'package:freshcart/features/home/presentation/screens/home_screen.dart';
import 'package:freshcart/features/splash/presentation/screens/splash_screen.dart';
import 'package:freshcart/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/login_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/otp_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/password_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/register_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/location_select_screen.dart';
import 'package:freshcart/features/categories/presentation/screens/categories_screen.dart';
import 'package:freshcart/features/categories/presentation/screens/category_catalog_screen.dart';
import 'package:freshcart/features/products/presentation/screens/product_details_screen.dart';
import 'package:freshcart/features/cart/presentation/screens/cart_screen.dart';
import 'package:freshcart/features/checkout/presentation/screens/checkout_screen.dart';
import 'package:freshcart/features/tracking/presentation/screens/tracking_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/profile_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/wallet_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/membership_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/support_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/addresses_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/stores_screen.dart';
import 'package:freshcart/features/orders/presentation/screens/orders_list_screen.dart';
import 'package:freshcart/features/orders/presentation/screens/order_placed_screen.dart';
import 'package:freshcart/features/orders/presentation/screens/order_detail_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/notifications_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/profile_edit_screen.dart';
import 'package:freshcart/features/search/presentation/screens/search_screen.dart';
import 'package:freshcart/features/wishlist/presentation/screens/wishlist_screen.dart';
import 'package:freshcart/features/legal/presentation/screens/legal_screen.dart';
import 'package:freshcart/features/app_gate/presentation/screens/app_gate_screens.dart';

/// Global key to access the root navigator outside the StatefulShellRoute.
final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

/// Slide-in-from-the-right page, matching the web storefront's sign-in
/// drawer (which slides in from the right edge) for the auth flow screens.
CustomTransitionPage<void> _slideFromRight(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 320),
    reverseTransitionDuration: const Duration(milliseconds: 260),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return SlideTransition(
        position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
            .chain(CurveTween(curve: Curves.easeOutCubic))
            .animate(animation),
        child: child,
      );
    },
  );
}

/// Bridges Riverpod auth changes to go_router's [GoRouter.refreshListenable].
class _AuthRouterRefresh extends ChangeNotifier {
  _AuthRouterRefresh(Ref ref) {
    ref.listen(authProvider, (prev, next) => notifyListeners());
  }
}

/// Routes reachable while signed out.
const _publicRoutes = {
  '/splash', '/onboarding', '/login', '/otp', '/password', '/register', '/legal',
  '/maintenance', '/force_update',
};

/// Reachable while browsing as a guest, but not without a *real* account — a
/// guest hitting one of these is sent to `/login` to sign in first.
const _authOnlyPrefixes = [
  '/checkout', '/order-placed', '/order/', '/tracking/',
  '/wallet', '/membership', '/addresses', '/notifications',
  '/account/edit', '/orders',
];

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRouterRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loc = state.matchedLocation;

      // Still resolving a stored token — let the splash screen decide.
      if (auth.isHydrating) return null;

      final canBrowse = auth.isAuthenticated || auth.isGuest;
      if (!canBrowse) {
        return _publicRoutes.contains(loc) ? null : '/login';
      }
      // A guest can browse the shell (Home/Categories/Search/Account) and shop,
      // but needs a real account for checkout, orders, wallet and settings.
      if (!auth.isAuthenticated &&
          _authOnlyPrefixes.any((p) => loc.startsWith(p))) {
        return '/login';
      }
      if (auth.isAuthenticated && (loc == '/login' || loc == '/otp' || loc == '/password' || loc == '/register')) {
        return '/';
      }
      return null;
    },
    routes: [
      // ---- Full-screen routes (pushed to root navigator, completely outside the tab shell) ----
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/splash',
        builder: (c, s) => const SplashScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/maintenance',
        builder: (c, s) => const MaintenanceScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/force_update',
        builder: (c, s) => const ForceUpdateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/onboarding',
        builder: (c, s) => const OnboardingScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/login',
        pageBuilder: (c, s) => _slideFromRight(s, const LoginScreen()),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/otp',
        pageBuilder: (c, s) => _slideFromRight(s, OtpScreen(phone: s.uri.queryParameters['phone'] ?? '')),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/password',
        pageBuilder: (c, s) => _slideFromRight(s, PasswordScreen(email: s.uri.queryParameters['email'] ?? '')),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/register',
        pageBuilder: (c, s) => _slideFromRight(s, RegisterScreen(email: s.uri.queryParameters['email'] ?? '')),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/location_select',
        builder: (c, s) => const LocationSelectScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/category/:id',
        builder: (c, s) => CategoryCatalogScreen(
          categoryId: s.pathParameters['id'] ?? '',
          initialSubCategory: s.uri.queryParameters['sub'],
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/product/:id',
        builder: (c, s) => ProductDetailsScreen(productId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/wishlist',
        builder: (c, s) => const WishlistScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/cart',
        builder: (c, s) => const CartScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/checkout',
        builder: (c, s) => const CheckoutScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/order-placed/:id',
        builder: (c, s) => OrderPlacedScreen(orderId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/order/:id',
        builder: (c, s) => OrderDetailScreen(orderId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/tracking/:orderId',
        builder: (c, s) => TrackingScreen(orderId: s.pathParameters['orderId'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/wallet',
        builder: (c, s) => const WalletScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/membership',
        builder: (c, s) => const MembershipScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/support',
        builder: (c, s) => const SupportScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/addresses',
        builder: (c, s) => const AddressesScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/stores',
        builder: (c, s) => const StoresScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/notifications',
        builder: (c, s) => const NotificationsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/account/edit',
        builder: (c, s) => const ProfileEditScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/search_detail',
        builder: (c, s) => const SearchDetailScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/legal',
        builder: (c, s) => LegalScreen(initialTab: s.uri.queryParameters['tab'] ?? 'terms'),
      ),
      // Legacy alias — Profile is the Account tab now.
      GoRoute(path: '/profile', redirect: (c, s) => '/account'),

      // ---- Bottom-nav tab shell: strictly wraps ONLY the 5 main tab routes ----
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainScaffold(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (c, s) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/categories', builder: (c, s) => const CategoriesScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/search', builder: (c, s) => const SearchScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/orders', builder: (c, s) => const OrdersListScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/account', builder: (c, s) => const ProfileScreen())],
          ),
        ],
      ),
    ],
  );
});
