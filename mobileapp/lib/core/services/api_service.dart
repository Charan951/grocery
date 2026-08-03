import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode;
import 'package:freshcart/core/services/mock_data_service.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class ApiService {
  late final Dio _dio;

  static String get baseUrl {
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
  }

  // 1. Fetch Dynamic Banners
  Future<List<Map<String, dynamic>>> fetchBanners() async {
    try {
      final response = await _dio.get('/banners');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['banners'] is List) {
          final list = data['banners'] as List;
          return list.map((item) => Map<String, dynamic>.from(item as Map)).toList();
        }
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.fetchBanners fallback: $e');
    }
    return [
      {
        'id': 'banner_1',
        'title': 'Weekend Organic Freshness',
        'subtitle': 'Up to 30% OFF on Fresh Greens & Vegetables',
        'tag': 'FLASH SALE',
        'imageUrl': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
        'linkUrl': '/category/cat_veg',
        'positionIndex': 1,
      },
      {
        'id': 'banner_2',
        'title': 'Farm Fresh Milk & Dairy Basket',
        'subtitle': 'Free Express 15-min delivery on daily orders',
        'tag': 'EXPRESS DELIVERY',
        'imageUrl': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop',
        'linkUrl': '/category/cat_dairy',
        'positionIndex': 2,
      },
      {
        'id': 'banner_3',
        'title': 'Exotic Seasonal Fruits',
        'subtitle': 'Handpicked organic Hass avocados & berries',
        'tag': 'FARM DIRECT',
        'imageUrl': 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=800&auto=format&fit=crop',
        'linkUrl': '/category/cat_fruits',
        'positionIndex': 3,
      },
    ];
  }

  // 2. Fetch Dynamic Categories
  Future<List<CategoryModel>> fetchCategories() async {
    try {
      final response = await _dio.get('/categories');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['categories'] is List && (data['categories'] as List).isNotEmpty) {
          final list = data['categories'] as List;
          return list.map((item) => CategoryModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
        }
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.fetchCategories fallback: $e');
    }
    return MockDataService.categories;
  }

  // 3. Fetch Special Subcategory Groups
  Future<List<Map<String, dynamic>>> fetchSpecialGroups() async {
    try {
      final response = await _dio.get('/special-groups');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['groups'] is List) {
          final list = data['groups'] as List;
          return list.map((item) => Map<String, dynamic>.from(item as Map)).toList();
        }
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.fetchSpecialGroups fallback: $e');
    }
    return [
      {
        'id': 'group_1',
        'title': 'Explore Special Subcategories',
        'items': [
          {'name': 'Fresh Vegetables', 'image': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop', 'link': '/category/cat_veg'},
          {'name': 'Fresh Fruits', 'image': 'https://images.unsplash.com/photo-1610398022800-14cf586dcde5?w=300&auto=format&fit=crop', 'link': '/category/cat_fruits'},
          {'name': 'Organic Greens', 'image': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop', 'link': '/category/cat_organic'},
          {'name': 'Dairy & Eggs', 'image': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop', 'link': '/category/cat_dairy'},
        ]
      }
    ];
  }

  // 4. Fetch Dynamic Products
  Future<List<ProductModel>> fetchProducts({String? categoryId, String? subCategory}) async {
    try {
      final response = await _dio.get(
        '/products',
        queryParameters: {
          if (categoryId != null && categoryId.isNotEmpty && categoryId != 'All') 'categoryId': categoryId,
          if (subCategory != null && subCategory.isNotEmpty && subCategory != 'All') 'subCategory': subCategory,
        },
      );
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['products'] is List && (data['products'] as List).isNotEmpty) {
          final list = data['products'] as List;
          return list.map((item) => ProductModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
        }
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.fetchProducts fallback: $e');
    }
    return MockDataService.products;
  }

  // 5. Validate Coupon
  Future<Map<String, dynamic>?> validateCoupon(String code) async {
    try {
      final response = await _dio.get('/coupons');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['coupons'] is List) {
          final list = data['coupons'] as List;
          final match = list.firstWhere(
            (c) => (c['code'] ?? '').toString().toUpperCase() == code.toUpperCase(),
            orElse: () => null,
          );
          if (match != null) return Map<String, dynamic>.from(match as Map);
        }
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.validateCoupon fallback: $e');
    }
    return null;
  }

  // 6. Create Order
  Future<Map<String, dynamic>?> createOrder(Map<String, dynamic> orderPayload) async {
    try {
      final response = await _dio.post('/orders', data: orderPayload);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Map<String, dynamic>.from(response.data as Map);
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.createOrder error: $e');
    }
    return {
      'success': true,
      'offlineMode': true,
      'order': {
        'id': 'ORD-${DateTime.now().millisecondsSinceEpoch}',
        'status': 'Processing',
        ...orderPayload,
      }
    };
  }

  // 7. Fetch Customer Orders
  Future<List<Map<String, dynamic>>> fetchCustomerOrders(String phone) async {
    try {
      final response = await _dio.get('/orders/customer/$phone');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        if (data is Map && data['orders'] is List) {
          final list = data['orders'] as List;
          return list.map((item) => Map<String, dynamic>.from(item as Map)).toList();
        }
      }
    } catch (e) {
      if (kDebugMode) print('ApiService.fetchCustomerOrders fallback: $e');
    }
    return [];
  }
}
