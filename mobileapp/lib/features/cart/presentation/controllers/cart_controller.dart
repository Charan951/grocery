import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/features/cart/data/models/cart_item_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class CartState {
  final List<CartItemModel> items;
  final Map<String, dynamic>? appliedCoupon;
  final String selectedDeliverySlot;
  final double platformFee;
  final double taxRate;

  CartState({
    required this.items,
    this.appliedCoupon,
    this.selectedDeliverySlot = 'Instant (10-15 mins)',
    this.platformFee = 5.0,
    this.taxRate = 0.05, // 5% GST
  });

  int get totalItemsCount => items.fold(0, (sum, item) => sum + item.quantity);
  
  double get subtotal => items.fold(0.0, (sum, item) => sum + item.totalPrice);
  
  double get totalMrp => items.fold(0.0, (sum, item) => sum + (item.product.mrp * item.quantity));

  double get itemSavings => totalMrp - subtotal;

  double get couponDiscount {
    if (appliedCoupon == null) return 0.0;
    final val = appliedCoupon!['value'] as double;
    final min = appliedCoupon!['minOrder'] as double;
    
    if (subtotal < min) return 0.0;
    
    if (val < 1.0) {
      // Percentage coupon
      double discount = subtotal * val;
      return discount > 100.0 ? 100.0 : discount; // Cap at 100
    } else {
      // Fixed value coupon
      return val;
    }
  }

  double get deliveryFee {
    if (subtotal >= 400.0 || subtotal == 0.0) return 0.0;
    return 29.0;
  }

  double get taxAmount => (subtotal - couponDiscount) * taxRate;

  double get totalPayableAmount {
    if (subtotal == 0.0) return 0.0;
    final val = (subtotal - couponDiscount) + deliveryFee + platformFee + taxAmount;
    return val < 0.0 ? 0.0 : val;
  }

  double get totalSavings => itemSavings + couponDiscount;

  CartState copyWith({
    List<CartItemModel>? items,
    Map<String, dynamic>? appliedCoupon,
    bool clearCoupon = false,
    String? selectedDeliverySlot,
  }) {
    return CartState(
      items: items ?? this.items,
      appliedCoupon: clearCoupon ? null : (appliedCoupon ?? this.appliedCoupon),
      selectedDeliverySlot: selectedDeliverySlot ?? this.selectedDeliverySlot,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  final StorageService _storage;

  CartNotifier(this._storage) : super(CartState(items: [])) {
    _loadCart();
  }

  void _loadCart() {
    final list = _storage.getCartItems();
    final List<CartItemModel> loadedItems = [];
    for (final raw in list) {
      try {
        final item = CartItemModel.fromJson(Map<String, dynamic>.from(raw as Map));
        loadedItems.add(item);
      } catch (_) {}
    }
    state = state.copyWith(items: loadedItems);
  }

  void _persistCart() {
    final rawList = state.items.map((item) => item.toJson()).toList();
    _storage.saveCartItems(rawList);
  }

  void addToCart(ProductModel product, {String? weight}) {
    final selectedW = weight ?? product.defaultWeight;
    final index = state.items.indexWhere(
      (item) => item.product.id == product.id && item.selectedWeight == selectedW,
    );

    List<CartItemModel> newList;
    if (index >= 0) {
      final existing = state.items[index];
      final updated = existing.copyWith(quantity: existing.quantity + 1);
      newList = List<CartItemModel>.from(state.items)..[index] = updated;
    } else {
      newList = List<CartItemModel>.from(state.items)
        ..add(CartItemModel(product: product, quantity: 1, selectedWeight: selectedW));
    }

    state = state.copyWith(items: newList);
    _persistCart();
  }

  void removeFromCart(ProductModel product, {String? weight}) {
    final selectedW = weight ?? product.defaultWeight;
    final index = state.items.indexWhere(
      (item) => item.product.id == product.id && item.selectedWeight == selectedW,
    );

    if (index < 0) return;

    final existing = state.items[index];
    List<CartItemModel> newList = List<CartItemModel>.from(state.items);

    if (existing.quantity > 1) {
      newList[index] = existing.copyWith(quantity: existing.quantity - 1);
    } else {
      newList.removeAt(index);
    }

    state = state.copyWith(items: newList);
    _persistCart();
  }

  void deleteItem(CartItemModel item) {
    final newList = List<CartItemModel>.from(state.items)
      ..removeWhere((i) => i.product.id == item.product.id && i.selectedWeight == item.selectedWeight);
    state = state.copyWith(items: newList);
    _persistCart();
  }

  bool applyCoupon(Map<String, dynamic> coupon) {
    if (state.subtotal >= (coupon['minOrder'] as double)) {
      state = state.copyWith(appliedCoupon: coupon);
      return true;
    }
    return false;
  }

  void removeCoupon() {
    state = state.copyWith(clearCoupon: true);
  }

  void setDeliverySlot(String slot) {
    state = state.copyWith(selectedDeliverySlot: slot);
  }

  void clearCart() {
    state = CartState(items: []);
    _persistCart();
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier(getIt<StorageService>());
});
