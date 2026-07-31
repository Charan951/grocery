import 'package:freshcart/features/products/data/models/product_model.dart';

class CartItemModel {
  final ProductModel product;
  final int quantity;
  final String selectedWeight;

  const CartItemModel({
    required this.product,
    required this.quantity,
    required this.selectedWeight,
  });

  double get totalPrice => product.price * quantity;

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    return CartItemModel(
      product: ProductModel.fromJson(json['product'] as Map<String, dynamic>),
      quantity: json['quantity'] as int,
      selectedWeight: json['selectedWeight'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'product': product.toJson(),
      'quantity': quantity,
      'selectedWeight': selectedWeight,
    };
  }

  CartItemModel copyWith({
    int? quantity,
    String? selectedWeight,
  }) {
    return CartItemModel(
      product: product,
      quantity: quantity ?? this.quantity,
      selectedWeight: selectedWeight ?? this.selectedWeight,
    );
  }
}
