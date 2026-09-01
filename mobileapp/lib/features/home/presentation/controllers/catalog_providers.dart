import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

final apiServiceProvider = Provider<ApiService>((ref) => getIt<ApiService>());

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
final bannersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(apiServiceProvider).fetchBanners();
});

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) {
  return ref.watch(apiServiceProvider).fetchCategories();
});

final specialGroupsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(apiServiceProvider).fetchSpecialGroups();
});

/// The running festival campaign (or null). Server already applies the date
/// window + isActive flag on `/festival-campaigns/active`.
final activeFestivalCampaignProvider = FutureProvider<Map<String, dynamic>?>((ref) {
  return ref.watch(apiServiceProvider).fetchActiveFestivalCampaign();
});

/// The whole catalog — used by Home rails and the Wishlist (which needs to
/// resolve favourite ids to products).
final allProductsProvider = FutureProvider<List<ProductModel>>((ref) {
  return ref.watch(apiServiceProvider).fetchProducts();
});

// ---------------------------------------------------------------------------
// Category catalog
// ---------------------------------------------------------------------------
class CatalogQuery {
  final String categoryId;
  final String subCategory; // 'All' = no filter
  final bool organicOnly;
  final bool inStockOnly;
  final bool onSaleOnly;
  final String sort; // 'popular' | 'price-low' | 'price-high' | 'rating'

  const CatalogQuery({
    required this.categoryId,
    this.subCategory = 'All',
    this.organicOnly = false,
    this.inStockOnly = false,
    this.onSaleOnly = false,
    this.sort = 'popular',
  });

  @override
  bool operator ==(Object other) =>
      other is CatalogQuery &&
      other.categoryId == categoryId &&
      other.subCategory == subCategory &&
      other.organicOnly == organicOnly &&
      other.inStockOnly == inStockOnly &&
      other.onSaleOnly == onSaleOnly &&
      other.sort == sort;

  @override
  int get hashCode =>
      Object.hash(categoryId, subCategory, organicOnly, inStockOnly, onSaleOnly, sort);
}

final categoryProductsProvider =
    FutureProvider.family<List<ProductModel>, CatalogQuery>((ref, q) async {
  final api = ref.watch(apiServiceProvider);
  return api.fetchProducts(
    categoryId: q.categoryId,
    subCategory: q.subCategory == 'All' ? null : q.subCategory,
    isOrganic: q.organicOnly ? true : null,
    inStock: q.inStockOnly ? true : null,
    onSale: q.onSaleOnly ? true : null,
    sort: q.sort == 'popular' ? null : q.sort,
  );
});

// ---------------------------------------------------------------------------
// Product details
// ---------------------------------------------------------------------------
final productDetailProvider =
    FutureProvider.family<ProductModel, String>((ref, id) {
  return ref.watch(apiServiceProvider).fetchProduct(id);
});

final similarProductsProvider =
    FutureProvider.family<List<ProductModel>, ProductModel>((ref, product) async {
  final api = ref.watch(apiServiceProvider);
  final list = await api.fetchProducts(categoryId: product.categoryId);
  return list.where((p) => p.id != product.id).take(12).toList();
});

// ---------------------------------------------------------------------------
// Search (server-side)
// ---------------------------------------------------------------------------
final searchProductsProvider =
    FutureProvider.family<List<ProductModel>, String>((ref, query) async {
  final q = query.trim();
  if (q.isEmpty) return const [];
  return ref.watch(apiServiceProvider).fetchProducts(search: q);
});
