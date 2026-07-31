import 'package:go_router/go_router.dart';
import 'package:freshcart/features/home/presentation/screens/main_shell.dart';
import 'package:freshcart/features/splash/presentation/screens/splash_screen.dart';
import 'package:freshcart/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/login_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/otp_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/location_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/location_select_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/map_selection_screen.dart';
import 'package:freshcart/features/categories/presentation/screens/category_catalog_screen.dart';
import 'package:freshcart/features/products/presentation/screens/product_details_screen.dart';
import 'package:freshcart/features/cart/presentation/screens/cart_screen.dart';
import 'package:freshcart/features/checkout/presentation/screens/checkout_screen.dart';
import 'package:freshcart/features/tracking/presentation/screens/tracking_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/wallet_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/membership_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/support_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/addresses_screen.dart';
import 'package:freshcart/features/orders/presentation/screens/orders_list_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/notifications_screen.dart';
import 'package:freshcart/features/search/presentation/screens/search_screen.dart';
import 'package:freshcart/features/wishlist/presentation/screens/wishlist_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/otp',
      builder: (context, state) {
        final phone = state.uri.queryParameters['phone'] ?? '';
        return OtpScreen(phone: phone);
      },
    ),
    GoRoute(
      path: '/location',
      builder: (context, state) => const LocationScreen(),
    ),
    GoRoute(
      path: '/location_select',
      builder: (context, state) => const LocationSelectScreen(),
    ),
    GoRoute(
      path: '/map_selection',
      builder: (context, state) {
        final autoLocate = state.uri.queryParameters['autoLocate'] == 'true';
        return MapSelectionScreen(autoLocate: autoLocate);
      },
    ),
    GoRoute(
      path: '/',
      builder: (context, state) => const MainNavigationShell(),
    ),
    GoRoute(
      path: '/category/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return CategoryCatalogScreen(categoryId: id);
      },
    ),
    GoRoute(
      path: '/product/:id',
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return ProductDetailsScreen(productId: id);
      },
    ),
    GoRoute(
      path: '/wishlist',
      builder: (context, state) => const WishlistScreen(),
    ),
    GoRoute(
      path: '/cart',
      builder: (context, state) => const CartScreen(),
    ),
    GoRoute(
      path: '/checkout',
      builder: (context, state) => const CheckoutScreen(),
    ),
    GoRoute(
      path: '/tracking/:orderId',
      builder: (context, state) {
        final id = state.pathParameters['orderId'] ?? '';
        return TrackingScreen(orderId: id);
      },
    ),
    GoRoute(
      path: '/wallet',
      builder: (context, state) => const WalletScreen(),
    ),
    GoRoute(
      path: '/membership',
      builder: (context, state) => const MembershipScreen(),
    ),
    GoRoute(
      path: '/support',
      builder: (context, state) => const SupportScreen(),
    ),
    GoRoute(
      path: '/addresses',
      builder: (context, state) => const AddressesScreen(),
    ),
    GoRoute(
      path: '/orders',
      builder: (context, state) => const OrdersListScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/search_detail',
      builder: (context, state) => const SearchDetailScreen(),
    ),
  ],
);
