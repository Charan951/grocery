import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/home/presentation/screens/main_shell.dart';
import 'package:freshcart/features/home/presentation/screens/home_screen.dart';
import 'package:freshcart/features/splash/presentation/screens/splash_screen.dart';
import 'package:freshcart/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/login_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/otp_screen.dart';
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

/// Bridges Riverpod auth changes to go_router's [GoRouter.refreshListenable].
class _AuthRouterRefresh extends ChangeNotifier {
  _AuthRouterRefresh(Ref ref) {
    ref.listen(authProvider, (prev, next) => notifyListeners());
  }
}

/// Routes reachable while signed out.
const _publicRoutes = {'/splash', '/onboarding', '/login', '/otp'};

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRouterRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loc = state.matchedLocation;

      // Still resolving a stored token — let the splash screen decide.
      if (auth.isHydrating) return null;

      if (!auth.isAuthenticated) {
        return _publicRoutes.contains(loc) ? null : '/login';
      }
      if (loc == '/login' || loc == '/otp') return '/';
      return null;
    },
    routes: [
      // ---- Full-screen routes (above the tab shell, no bottom nav) ----
      GoRoute(path: '/splash', builder: (c, s) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (c, s) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(
        path: '/otp',
        builder: (c, s) => OtpScreen(phone: s.uri.queryParameters['phone'] ?? ''),
      ),
      GoRoute(path: '/location_select', builder: (c, s) => const LocationSelectScreen()),
      GoRoute(
        path: '/category/:id',
        builder: (c, s) => CategoryCatalogScreen(
          categoryId: s.pathParameters['id'] ?? '',
          initialSubCategory: s.uri.queryParameters['sub'],
        ),
      ),
      GoRoute(
        path: '/product/:id',
        builder: (c, s) => ProductDetailsScreen(productId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(path: '/wishlist', builder: (c, s) => const WishlistScreen()),
      GoRoute(path: '/cart', builder: (c, s) => const CartScreen()),
      GoRoute(path: '/checkout', builder: (c, s) => const CheckoutScreen()),
      GoRoute(
        path: '/order-placed/:id',
        builder: (c, s) => OrderPlacedScreen(orderId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/order/:id',
        builder: (c, s) => OrderDetailScreen(orderId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/tracking/:orderId',
        builder: (c, s) => TrackingScreen(orderId: s.pathParameters['orderId'] ?? ''),
      ),
      GoRoute(path: '/wallet', builder: (c, s) => const WalletScreen()),
      GoRoute(path: '/membership', builder: (c, s) => const MembershipScreen()),
      GoRoute(path: '/support', builder: (c, s) => const SupportScreen()),
      GoRoute(path: '/addresses', builder: (c, s) => const AddressesScreen()),
      GoRoute(path: '/stores', builder: (c, s) => const StoresScreen()),
      GoRoute(path: '/notifications', builder: (c, s) => const NotificationsScreen()),
      GoRoute(path: '/account/edit', builder: (c, s) => const ProfileEditScreen()),
      GoRoute(path: '/search_detail', builder: (c, s) => const SearchDetailScreen()),
      // Legacy alias — Profile is the Account tab now.
      GoRoute(path: '/profile', redirect: (c, s) => '/account'),

      // ---- Bottom-nav tab shell: each branch keeps its own stack ----
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
