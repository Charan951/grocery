import 'package:dio/dio.dart';

/// A user-presentable error raised by [ApiService] for calls that must surface
/// failure (auth, checkout) rather than silently fall back to demo data.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  bool get isUnauthorized => statusCode == 401;
  bool get isNotFound => statusCode == 404;
  bool get isNetwork => statusCode == null;

  factory ApiException.fromDio(DioException e) {
    final res = e.response;
    if (res != null) {
      final data = res.data;
      final serverMsg = data is Map && data['message'] is String
          ? data['message'] as String
          : null;
      return ApiException(
        serverMsg ?? 'Request failed (${res.statusCode})',
        statusCode: res.statusCode,
      );
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('The server took too long to respond. Please try again.');
      case DioExceptionType.connectionError:
        return ApiException('Cannot reach the server. Check your connection.');
      default:
        return ApiException(e.message ?? 'Something went wrong. Please try again.');
    }
  }

  @override
  String toString() => message;
}
