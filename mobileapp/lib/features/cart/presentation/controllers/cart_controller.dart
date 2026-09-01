import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/pricing.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/cart/presentation/controllers/commerce_providers.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

/// Seller limit — one customer may buy at most this many of a single item
/// (parity with the web storefront's MAX_CUSTOMER_QTY_LIMIT).
const int kMaxQtyPerItem = 3;

class CartState {
  final List<CartItemModel> items;

  /// Server-validated coupon: `{ code, discount }` or null.
  final Map<String, dynamic>? appliedCoupon;
  final String selectedDeliverySlot;
  final PricingConfig pricing;

  CartState({
    required this.items,
    this.appliedCoupon,
    this.selectedDeliverySlot = 'Instant (10-15 mins)',
    this.pricing = const PricingConfig(),
  });

  double get _couponDiscount => (appliedCoupon?['discount'] as num?)?.toDouble() ?? 0.0;

  PriceBreakdown get breakdown => PricingService.compute(
        lines: items
            .map((i) => PriceLine(i.product.price, i.product.mrp, i.quantity))
            .toList(),
        config: pricing,
        couponDiscount: _couponDiscount,
      );

  int get totalItemsCount => items.fold(0, (sum, i) => sum + i.quantity);

  // Names kept stable for existing screens.
  double get subtotal => breakdown.subtotal;
  double get totalMrp => breakdown.itemTotalMrp;
  double get itemSavings => breakdown.itemSavings;
  double get couponDiscount => breakdown.couponDiscount;
  double get platformFee => breakdown.platformFee;
  double get deliveryFee => breakdown.deliveryFee;
  double get taxAmount => breakdown.tax;
  double get totalPayableAmount => breakdown.total;
  double get totalSavings => breakdown.totalSavings;

  CartState copyWith({
    List<CartItemModel>? items,
    Map<String, dynamic>? appliedCoupon,
    bool clearCoupon = false,
    String? selectedDeliverySlot,
    PricingConfig? pricing,
  }) {
    return CartState(
      items: items ?? this.items,
      appliedCoupon: clearCoupon ? null : (appliedCoupon ?? this.appliedCoupon),
      selectedDeliverySlot: selectedDeliverySlot ?? this.selectedDeliverySlot,
      pricing: pricing ?? this.pricing,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  final StorageService _storage;

  CartNotifier(this._storage, Ref ref) : super(CartState(items: [])) {
    _loadCart();
    // Keep pricing in sync with backend settings.
    state = state.copyWith(pricing: ref.read(pricingConfigProvider));
    ref.listen<PricingConfig>(pricingConfigProvider, (_, config) {
      setPricingConfig(config);
    });
  }

  void _loadCart() {
    final loaded = <CartItemModel>[];
    for (final raw in _storage.getCartItems()) {
      try {
        loaded.add(CartItemModel.fromJson(Map<String, dynamic>.from(raw as Map)));
      } catch (_) {}
    }
    state = state.copyWith(items: loaded);
  }

  void _persistCart() {
    _storage.saveCartItems(state.items.map((i) => i.toJson()).toList());
  }

  void setPricingConfig(PricingConfig config) {
    state = state.copyWith(pricing: config);
  }

  /// Adds one unit. Returns false (and does nothing) if the per-item cap is hit.
  bool addToCart(ProductModel product, {String? weight}) {
    final w = weight ?? product.defaultWeight;
    final index = state.items.indexWhere(
      (i) => i.product.id == product.id && i.selectedWeight == w,
    );

    List<CartItemModel> next;
    if (index >= 0) {
      final existing = state.items[index];
      if (existing.quantity >= kMaxQtyPerItem) return false;
      next = List.of(state.items)..[index] = existing.copyWith(quantity: existing.quantity + 1);
    } else {
      next = List.of(state.items)
        ..add(CartItemModel(product: product, quantity: 1, selectedWeight: w));
    }
    state = state.copyWith(items: next);
    _persistCart();
    return true;
  }

  void removeFromCart(ProductModel product, {String? weight}) {
    final w = weight ?? product.defaultWeight;
    final index = state.items.indexWhere(
      (i) => i.product.id == product.id && i.selectedWeight == w,
    );
    if (index < 0) return;

    final existing = state.items[index];
    final next = List.of(state.items);
    if (existing.quantity > 1) {
      next[index] = existing.copyWith(quantity: existing.quantity - 1);
    } else {
      next.removeAt(index);
    }
    state = state.copyWith(items: next, clearCoupon: next.isEmpty);
    _persistCart();
  }

  void deleteItem(CartItemModel item) {
    final next = List.of(state.items)
      ..removeWhere((i) => i.product.id == item.product.id && i.selectedWeight == item.selectedWeight);
    state = state.copyWith(items: next, clearCoupon: next.isEmpty);
    _persistCart();
  }

  /// Applies a discount that has already been validated by the backend.
  void applyValidatedCoupon(String code, double discount) {
    state = state.copyWith(appliedCoupon: {'code': code, 'discount': discount});
  }

  void removeCoupon() => state = state.copyWith(clearCoupon: true);

  void setDeliverySlot(String slot) => state = state.copyWith(selectedDeliverySlot: slot);

  void clearCart() {
    state = state.copyWith(items: [], clearCoupon: true);
    _persistCart();
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier(getIt<StorageService>(), ref);
});
