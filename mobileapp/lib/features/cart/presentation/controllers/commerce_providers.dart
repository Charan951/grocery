import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/services/pricing.dart';
import 'package:freshcart/features/cart/presentation/controllers/cart_controller.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart';

/// Raw `GET /api/settings` payload.
final settingsProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.watch(apiServiceProvider).fetchSettings();
});

/// Pricing rules derived from settings (defaults until loaded / on error).
final pricingConfigProvider = Provider<PricingConfig>((ref) {
  return ref.watch(settingsProvider).maybeWhen(
        data: PricingConfig.fromSettings,
        orElse: () => const PricingConfig(),
      );
});

/// Coupons shown in the cart.
final couponsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(apiServiceProvider).fetchCoupons();
});

/// Coupons for the current cart value (refetched as the subtotal changes, so
/// a coupon shows as unlocked the moment its minimum order is reached).
final availableCouponsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  final subtotal = ref.watch(cartProvider.select((c) => c.subtotal));
  if (subtotal <= 0) return const {'coupons': [], 'autoApplyCode': null};
  return ref.watch(apiServiceProvider).availableCoupons(subtotal);
});

/// Set once the shopper removes an auto-applied first-order coupon, so it
/// isn't forced back on.
final autoCouponDismissedProvider = StateProvider<bool>((ref) => false);
