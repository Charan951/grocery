import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;
  ApiException(this.message, {this.statusCode, this.code});

  bool get isUnauthorized => statusCode == 401 || statusCode == 403;

  factory ApiException.fromDio(DioException e) {
    final res = e.response;
    if (res != null) {
      final data = res.data;
      final msg = data is Map && data['message'] is String ? data['message'] as String : null;
      final code = data is Map && data['code'] is String ? data['code'] as String : null;
      return ApiException(msg ?? 'Request failed (${res.statusCode})', statusCode: res.statusCode, code: code);
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('The server took too long. Try again.');
      case DioExceptionType.connectionError:
        return ApiException('Cannot reach the server. Check your connection.');
      default:
        return ApiException(e.message ?? 'Something went wrong.');
    }
  }

  @override
  String toString() => message;
}
