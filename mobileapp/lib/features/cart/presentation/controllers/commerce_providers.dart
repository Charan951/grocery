import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/services/pricing.dart';
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
