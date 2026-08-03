import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return getIt<ApiService>();
});

final bannersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.fetchBanners();
});

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.fetchCategories();
});

final specialGroupsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.fetchSpecialGroups();
});

final productsProvider = FutureProvider.family<List<ProductModel>, Map<String, String?>>((ref, params) async {
  final api = ref.watch(apiServiceProvider);
  return api.fetchProducts(
    categoryId: params['categoryId'],
    subCategory: params['subCategory'],
  );
});
