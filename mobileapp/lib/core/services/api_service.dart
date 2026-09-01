import 'package:dio/dio.dart';
import 'package:freshcart/core/config/app_config.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

class ApiService {
  late final Dio _dio;
  final TokenStore? _tokenStore;

  /// Invoked when any authenticated call comes back 401 so the app can log out.
  /// Set by the auth controller after construction.
  void Function()? onUnauthorized;

  static String get baseUrl => AppConfig.apiBaseUrl;

  ApiService({TokenStore? tokenStore}) : _tokenStore = tokenStore {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = _tokenStore?.token;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) {
        if (e.response?.statusCode == 401) {
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ));
  }

  // ==========================================================================
  // AUTH — these must surface real errors (no demo fallback).
  // ==========================================================================

  /// Requests an OTP. Returns `{ testMode: bool, devCode?: String, ttl: int }`.
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    try {
      final res = await _dio.post('/customers/otp/send', data: {'phone': phone});
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Verifies an OTP. Returns `{ token: String, customer: Map }` on success.
  Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    try {
      final res = await _dio.post(
        '/customers/otp/verify',
        data: {'phone': phone, 'code': code},
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Loads the signed-in customer (requires a stored token).
  Future<Map<String, dynamic>> fetchMe() async {
    try {
      final res = await _dio.get('/customers/me');
      return Map<String, dynamic>.from((res.data as Map)['customer'] as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Updates the signed-in customer's name / email.
  Future<Map<String, dynamic>> updateMyProfile({String? name, String? email}) async {
    try {
      final payload = <String, dynamic>{};
      if (name != null) payload['name'] = name;
      if (email != null) payload['email'] = email;
      final res = await _dio.put('/customers/me/profile', data: payload);
      return Map<String, dynamic>.from((res.data as Map)['customer'] as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Adds a delivery address for the signed-in customer.
  /// `POST /customers/me/addresses` — body: label, houseNo, landmark, area,
  /// fullAddress, pincode, lat, lng, name, receiverPhone.
  Future<void> addAddress(Map<String, dynamic> body) async {
    try {
      await _dio.post('/customers/me/addresses', data: body);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Removes one of the signed-in customer's saved addresses.
  Future<void> deleteAddress(String addressId) async {
    try {
      await _dio.delete('/customers/me/addresses/$addressId');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  // ==========================================================================
  // CATALOG — live data only. On failure these throw ApiException so the UI can
  // show a real loading / error / retry state (no demo fallback in the app).
  // ==========================================================================

  Future<List<Map<String, dynamic>>> fetchBanners() async {
    try {
      final res = await _dio.get('/banners');
      final data = res.data;
      final list = (data is Map && data['banners'] is List) ? data['banners'] as List : const [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<CategoryModel>> fetchCategories() async {
    try {
      final res = await _dio.get('/categories');
      final data = res.data;
      final list = (data is Map && data['categories'] is List) ? data['categories'] as List : const [];
      return list.map((e) => CategoryModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<Map<String, dynamic>>> fetchSpecialGroups() async {
    try {
      final res = await _dio.get('/special-groups');
      final data = res.data;
      final list = (data is Map && data['groups'] is List) ? data['groups'] as List : const [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// [sort] maps to the backend: `price-low` | `price-high` | `rating`.
  Future<List<ProductModel>> fetchProducts({
    String? categoryId,
    String? subCategory,
    String? search,
    bool? isOrganic,
    String? sort,
  }) async {
    try {
      final qp = <String, dynamic>{};
      if (categoryId != null && categoryId.isNotEmpty && categoryId != 'All') qp['categoryId'] = categoryId;
      if (subCategory != null && subCategory.isNotEmpty && subCategory != 'All') qp['subCategory'] = subCategory;
      if (search != null && search.trim().isNotEmpty) qp['search'] = search.trim();
      if (isOrganic == true) qp['isOrganic'] = 'true';
      if (sort != null && sort.isNotEmpty) qp['sort'] = sort;

      final res = await _dio.get('/products', queryParameters: qp);
      final data = res.data;
      final list = (data is Map && data['products'] is List) ? data['products'] as List : const [];
      return list.map((e) => ProductModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<ProductModel> fetchProduct(String id) async {
    try {
      final res = await _dio.get('/products/${Uri.encodeComponent(id)}');
      final data = res.data;
      if (data is Map && data['product'] is Map) {
        return ProductModel.fromJson(Map<String, dynamic>.from(data['product'] as Map));
      }
      throw ApiException('Product not found', statusCode: 404);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  // ---- Commerce (settings-driven pricing, coupons, orders) ----

  /// `GET /api/settings` -> `{ taxPercent, deliveryFeeRule, ... }`.
  Future<Map<String, dynamic>> fetchSettings() async {
    try {
      final res = await _dio.get('/settings');
      final data = res.data;
      if (data is Map && data['settings'] is Map) {
        return Map<String, dynamic>.from(data['settings'] as Map);
      }
      return {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<List<Map<String, dynamic>>> fetchCoupons() async {
    try {
      final res = await _dio.get('/coupons');
      final data = res.data;
      final list = (data is Map && data['coupons'] is List) ? data['coupons'] as List : const [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/coupons/validate` — server computes the discount.
  /// Returns `{ valid: bool, discount: num, code?, message }`.
  Future<Map<String, dynamic>> validateCoupon(String code, num subtotal) async {
    try {
      final res = await _dio.post('/coupons/validate', data: {'code': code, 'subtotal': subtotal});
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/orders` — the customer token (if present) is attached by the
  /// interceptor and trusted server-side. Throws on failure.
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderPayload) async {
    try {
      final res = await _dio.post('/orders', data: orderPayload);
      final data = res.data;
      if (data is Map && data['order'] is Map) {
        return Map<String, dynamic>.from(data['order'] as Map);
      }
      throw ApiException('Order could not be placed. Please try again.');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  // ---- Payments ----

  /// `POST /api/payment/create-order` → `{ orderId, amount, currency, key, testMode }`.
  Future<Map<String, dynamic>> createRazorpayOrder({required double amount, String? receipt}) async {
    try {
      final body = <String, dynamic>{'amount': amount};
      if (receipt != null) body['receipt'] = receipt;
      final res = await _dio.post('/payment/create-order', data: body);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/payment/verify` → `{ verified: bool, testMode: bool }`.
  Future<Map<String, dynamic>> verifyPayment({
    String? razorpayOrderId,
    String? paymentId,
    String? signature,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (razorpayOrderId != null) body['razorpay_order_id'] = razorpayOrderId;
      if (paymentId != null) body['razorpay_payment_id'] = paymentId;
      if (signature != null) body['razorpay_signature'] = signature;
      final res = await _dio.post('/payment/verify', data: body);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/customers/me/wallet/debit` → `{ walletBalance }`. Throws on
  /// insufficient balance (400).
  Future<double> walletDebit({required double amount, String? orderId}) async {
    try {
      final body = <String, dynamic>{'amount': amount};
      if (orderId != null) body['orderId'] = orderId;
      final res = await _dio.post('/customers/me/wallet/debit', data: body);
      return ((res.data as Map)['walletBalance'] as num).toDouble();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /api/orders/mine` — the signed-in customer's orders (needs a token).
  Future<List<Map<String, dynamic>>> fetchMyOrders() async {
    try {
      final res = await _dio.get('/orders/mine');
      final data = res.data;
      final list = (data is Map && data['orders'] is List) ? data['orders'] as List : const [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /api/orders/:id` — single order detail.
  Future<Map<String, dynamic>> fetchOrder(String orderId) async {
    try {
      final res = await _dio.get('/orders/${Uri.encodeComponent(orderId)}');
      final data = res.data;
      if (data is Map && data['order'] is Map) {
        return Map<String, dynamic>.from(data['order'] as Map);
      }
      throw ApiException('Order not found', statusCode: 404);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/orders/:id/cancel` — customer self-service cancel. A prepaid
  /// order is refunded to the wallet server-side. Returns the updated order +
  /// `{ refunded, walletBalance }`. Throws 409 when the order is past the
  /// cancellable window.
  Future<Map<String, dynamic>> cancelOrder(String orderId, {String? reason}) async {
    try {
      final res = await _dio.post(
        '/orders/${Uri.encodeComponent(orderId)}/cancel',
        data: {if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim()},
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /api/customers/me/wallet/transactions` → `{ walletBalance, transactions[] }`.
  Future<Map<String, dynamic>> fetchWalletTransactions({int limit = 50}) async {
    try {
      final res = await _dio.get(
        '/customers/me/wallet/transactions',
        queryParameters: {'limit': limit},
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /api/app/config` → `{ minSupportedVersion, latestVersion, maintenance,
  /// maintenanceMessage, updateUrl, supportEmail, supportPhone }`.
  Future<Map<String, dynamic>> fetchAppConfig() async {
    try {
      final res = await _dio.get('/app/config');
      final data = res.data;
      if (data is Map && data['config'] is Map) {
        return Map<String, dynamic>.from(data['config'] as Map);
      }
      return const {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/customers/me/devices` — register this device's FCM token.
  Future<void> registerDevice(String token, {String platform = 'android'}) async {
    try {
      await _dio.post('/customers/me/devices', data: {'token': token, 'platform': platform});
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `DELETE /api/customers/me/devices/:token` — unregister on logout.
  Future<void> removeDevice(String token) async {
    try {
      await _dio.delete('/customers/me/devices/${Uri.encodeComponent(token)}');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `DELETE /api/customers/me` — permanent account deletion for the signed-in
  /// customer (token attached by the interceptor). Throws on failure.
  Future<void> deleteAccount() async {
    try {
      await _dio.delete('/customers/me');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /api/products/:id/reviews` → `{ summary: {average, count, distribution}, reviews[] }`.
  Future<Map<String, dynamic>> fetchProductReviews(String productId) async {
    try {
      final res = await _dio.get('/products/${Uri.encodeComponent(productId)}/reviews');
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /api/products/:id/reviews` (customer token). Verified-purchase only;
  /// the review enters moderation. Returns `{ review, updated? }`. Throws 403
  /// when the customer has not received the product.
  Future<Map<String, dynamic>> submitProductReview(
    String productId, {
    required int rating,
    String? comment,
  }) async {
    try {
      final res = await _dio.post(
        '/products/${Uri.encodeComponent(productId)}/reviews',
        data: {
          'rating': rating,
          if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
        },
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
