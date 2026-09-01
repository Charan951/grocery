import 'package:freshcart/core/utils/parse.dart';

class ProductModel {
  final String id;
  final String name;
  final String brand;
  final String categoryId;
  final String? subCategory;
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
  final String imageUrl;
  final List<String> gallery;
  final bool isBestSeller;
  final bool isFreshPick;
  final int stockQuantity;

  const ProductModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.categoryId,
    this.subCategory,
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
    this.gallery = const [],
    this.isBestSeller = false,
    this.isFreshPick = false,
    this.stockQuantity = 50,
  });

  bool get hasDiscount => mrp > price;
  double get discountPercent => hasDiscount ? (((mrp - price) / mrp) * 100) : 0.0;
  bool get inStock => stockQuantity > 0;

  static const _placeholderImage =
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600';

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final images = asStringList(json['images']);
    final image = asString(json['imageUrl']).isNotEmpty
        ? asString(json['imageUrl'])
        : asString(json['image']).isNotEmpty
            ? asString(json['image'])
            : (images.isNotEmpty ? images.first : _placeholderImage);
    // Gallery: every http image we can find, de-duped, main image first.
    final gallery = <String>{
      if (image.startsWith('http')) image,
      ...images.where((u) => u.startsWith('http')),
    }.toList();

    final price = asDouble(json['price']);
    // Backend guarantees `mrp` but be defensive.
    var mrp = asDouble(json['mrp'], fallback: asDouble(json['originalPrice'], fallback: price));
    if (mrp < price) mrp = price;

    final defaultWeight = asString(
      json['defaultWeight'],
      fallback: asString(json['netQuantity'], fallback: '1 pc'),
    );
    var weightOptions = asStringList(json['weightOptions']);
    if (weightOptions.isEmpty) weightOptions = [defaultWeight];

    return ProductModel(
      id: asString(json['id'], fallback: asString(json['_id'])),
      name: asString(json['name'], fallback: 'Product'),
      brand: asString(json['brand']),
      categoryId: asString(json['categoryId'], fallback: asString(json['category'])),
      subCategory: asString(json['subCategory']).isEmpty ? null : asString(json['subCategory']),
      rating: asDouble(json['rating'], fallback: 4.5),
      reviewsCount: asInt(json['reviewsCount'], fallback: 0),
      price: price,
      mrp: mrp,
      discountText: asString(json['discount']).isEmpty ? null : asString(json['discount']),
      weightOptions: weightOptions,
      defaultWeight: defaultWeight,
      description: asString(json['description']),
      nutritionFacts: asStringMap(json['nutritionFacts']),
      ingredients: asStringList(json['ingredients']),
      isOrganic: asBool(json['isOrganic']),
      imageUrl: image,
      gallery: gallery,
      isBestSeller: asBool(json['isBestSeller']),
      isFreshPick: asBool(json['isFreshPick']),
      stockQuantity: stockQuantityOf(json),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'brand': brand,
        'categoryId': categoryId,
        'subCategory': subCategory,
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
        'stockQuantity': stockQuantity,
      };

  ProductModel copyWith({
    double? price,
    double? mrp,
    String? defaultWeight,
    String? subCategory,
    int? stockQuantity,
  }) {
    return ProductModel(
      id: id,
      name: name,
      brand: brand,
      categoryId: categoryId,
      subCategory: subCategory ?? this.subCategory,
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
      stockQuantity: stockQuantity ?? this.stockQuantity,
    );
  }
}
