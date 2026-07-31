class ProductModel {
  final String id;
  final String name;
  final String brand;
  final String categoryId;
  final double rating;
  final int reviewsCount;
  final double price;
  final double mrp;
  final String? discountText;
  final List<String> weightOptions;
  final String defaultWeight;
  final String description;
  final Map<String, String> nutritionFacts;
  final List<String> ingredients;
  final bool isOrganic;
  final String imageUrl; // Keyword or mock image asset path
  final bool isBestSeller;
  final bool isFreshPick;

  const ProductModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.categoryId,
    required this.rating,
    required this.reviewsCount,
    required this.price,
    required this.mrp,
    this.discountText,
    required this.weightOptions,
    required this.defaultWeight,
    required this.description,
    required this.nutritionFacts,
    required this.ingredients,
    this.isOrganic = false,
    required this.imageUrl,
    this.isBestSeller = false,
    this.isFreshPick = false,
  });

  bool get hasDiscount => mrp > price;
  double get discountPercent => hasDiscount ? (((mrp - price) / mrp) * 100) : 0.0;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      brand: json['brand'] as String,
      categoryId: json['categoryId'] as String,
      rating: (json['rating'] as num).toDouble(),
      reviewsCount: json['reviewsCount'] as int,
      price: (json['price'] as num).toDouble(),
      mrp: (json['mrp'] as num).toDouble(),
      discountText: json['discountText'] as String?,
      weightOptions: List<String>.from(json['weightOptions'] as List),
      defaultWeight: json['defaultWeight'] as String,
      description: json['description'] as String,
      nutritionFacts: Map<String, String>.from(json['nutritionFacts'] as Map),
      ingredients: List<String>.from(json['ingredients'] as List),
      isOrganic: json['isOrganic'] as bool? ?? false,
      imageUrl: json['imageUrl'] as String,
      isBestSeller: json['isBestSeller'] as bool? ?? false,
      isFreshPick: json['isFreshPick'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'brand': brand,
      'categoryId': categoryId,
      'rating': rating,
      'reviewsCount': reviewsCount,
      'price': price,
      'mrp': mrp,
      'discountText': discountText,
      'weightOptions': weightOptions,
      'defaultWeight': defaultWeight,
      'description': description,
      'nutritionFacts': nutritionFacts,
      'ingredients': ingredients,
      'isOrganic': isOrganic,
      'imageUrl': imageUrl,
      'isBestSeller': isBestSeller,
      'isFreshPick': isFreshPick,
    };
  }

  ProductModel copyWith({
    double? price,
    double? mrp,
    String? defaultWeight,
  }) {
    return ProductModel(
      id: id,
      name: name,
      brand: brand,
      categoryId: categoryId,
      rating: rating,
      reviewsCount: reviewsCount,
      price: price ?? this.price,
      mrp: mrp ?? this.mrp,
      discountText: discountText,
      weightOptions: weightOptions,
      defaultWeight: defaultWeight ?? this.defaultWeight,
      description: description,
      nutritionFacts: nutritionFacts,
      ingredients: ingredients,
      isOrganic: isOrganic,
      imageUrl: imageUrl,
      isBestSeller: isBestSeller,
      isFreshPick: isFreshPick,
    );
  }
}
