import 'package:dio/dio.dart';
import 'package:freshcart_delivery/core/config/app_config.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/services/token_store.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

class ApiClient {
  late final Dio _dio;
  final TokenStore _tokens;
  void Function()? onUnauthorized;

  ApiClient(this._tokens) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (o, h) {
        final t = _tokens.token;
        if (t != null && t.isNotEmpty) o.headers['Authorization'] = 'Bearer $t';
        h.next(o);
      },
      onError: (e, h) {
        final sc = e.response?.statusCode;
        // 403 on a delivery route == deactivated / wrong role -> treat as logout.
        if (sc == 401) onUnauthorized?.call();
        h.next(e);
      },
    ));
  }

  Never _rethrow(DioException e) => throw ApiException.fromDio(e);

  // ---- auth ----
  Future<String> login(String email, String password) async {
    try {
      final r = await _dio.post('/auth/login', data: {'email': email, 'password': password});
      final data = Map<String, dynamic>.from(r.data as Map);
      final role = (data['user']?['role'] ?? '').toString();
      if (role != 'Delivery') {
        throw ApiException('This app is for delivery partners only.', statusCode: 403);
      }
      return data['token'] as String;
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<Map<String, dynamic>> forgot(String email) async {
    try {
      final r = await _dio.post('/delivery/auth/forgot', data: {'email': email});
      return Map<String, dynamic>.from(r.data as Map);
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<void> reset(String email, String code, String password) async {
    try {
      await _dio.post('/delivery/auth/reset', data: {'email': email, 'code': code, 'password': password});
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  // ---- profile / status / location ----
  Future<PartnerProfile> me() async {
    try {
      final r = await _dio.get('/delivery/me');
      return PartnerProfile.fromJson(Map<String, dynamic>.from((r.data as Map)['partner'] as Map));
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<Map<String, dynamic>> setOnline(bool online) async {
    try {
      final r = await _dio.put('/delivery/status', data: {'isOnline': online});
      return Map<String, dynamic>.from(r.data as Map);
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<void> pushLocation(double lat, double lng) async {
    try {
      await _dio.post('/delivery/location', data: {'lat': lat, 'lng': lng});
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  // ---- assignments ----
  Future<DeliveryOrder> acceptAssignment(String id) async {
    try {
      final r = await _dio.post('/delivery/assignments/$id/accept');
      return DeliveryOrder.fromJson(Map<String, dynamic>.from((r.data as Map)['order'] as Map));
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<void> rejectAssignment(String id, {String? reason}) async {
    try {
      await _dio.post('/delivery/assignments/$id/reject', data: {'reason': reason});
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  // ---- orders ----
  Future<List<DeliveryOrder>> activeOrders() async {
    try {
      final r = await _dio.get('/delivery/orders/active');
      final list = ((r.data as Map)['orders'] as List?) ?? const [];
      return list.map((e) => DeliveryOrder.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<List<DeliveryOrder>> history({String? status}) async {
    try {
      final qp = <String, dynamic>{};
      if (status != null) qp['status'] = status;
      final r = await _dio.get('/delivery/orders/history', queryParameters: qp);
      final list = ((r.data as Map)['orders'] as List?) ?? const [];
      return list.map((e) => DeliveryOrder.fromJson(Map<String, dynamic>.from(e as Map))).toList();
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<DeliveryOrder> order(String orderId) async {
    try {
      final r = await _dio.get('/delivery/orders/${Uri.encodeComponent(orderId)}');
      return DeliveryOrder.fromJson(Map<String, dynamic>.from((r.data as Map)['order'] as Map));
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<DeliveryOrder> _step(String orderId, String path, [Map<String, dynamic>? body]) async {
    try {
      final r = await _dio.post('/delivery/orders/${Uri.encodeComponent(orderId)}/$path', data: body ?? {});
      return DeliveryOrder.fromJson(Map<String, dynamic>.from((r.data as Map)['order'] as Map));
    } on DioException catch (e) {
      _rethrow(e);
    }
  }

  Future<DeliveryOrder> pickupArrived(String o) => _step(o, 'pickup-arrived');
  Future<DeliveryOrder> pickedUp(String o) => _step(o, 'picked-up');
  Future<DeliveryOrder> arrived(String o) => _step(o, 'arrived');
  Future<DeliveryOrder> complete(String o, {String? otp, String? podPhotoBase64}) {
    final body = <String, dynamic>{};
    if (otp != null) body['otp'] = otp;
    if (podPhotoBase64 != null) body['podPhoto'] = podPhotoBase64;
    return _step(o, 'complete', body);
  }

  Future<DeliveryOrder> fail(String o, String reason) => _step(o, 'fail', {'reason': reason});
}
