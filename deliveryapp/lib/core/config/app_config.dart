import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Override with --dart-define API_BASE_URL=... SOCKET_URL=... ENV=...
class AppConfig {
  const AppConfig._();

  static const _api = String.fromEnvironment('API_BASE_URL');
  static const _socket = String.fromEnvironment('SOCKET_URL');
  static const env = String.fromEnvironment('ENV', defaultValue: 'development');

  static String get _host {
    if (!kIsWeb && Platform.isAndroid) return '10.0.2.2';
    return 'localhost';
  }

  static String get apiBaseUrl => _api.isNotEmpty ? _api : 'http://$_host:5000/api';
  static String get socketUrl => _socket.isNotEmpty ? _socket : 'http://$_host:5000';
}
