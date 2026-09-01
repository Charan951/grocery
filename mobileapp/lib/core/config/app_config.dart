import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Single source of truth for environment-dependent configuration.
///
/// Override at build/run time with:
///   flutter run --dart-define API_BASE_URL=https://api.example.com/api \
///               --dart-define SOCKET_URL=https://api.example.com
class AppConfig {
  const AppConfig._();

  static const String _apiOverride = String.fromEnvironment('API_BASE_URL');
  static const String _socketOverride = String.fromEnvironment('SOCKET_URL');

  /// 'development' | 'staging' | 'production' (via --dart-define ENV=...).
  static const String env = String.fromEnvironment('ENV', defaultValue: 'development');
  static bool get isProduction => env == 'production';

  /// Android emulator reaches the host machine on 10.0.2.2; everything else on localhost.
  static String get _defaultHost {
    if (!kIsWeb && Platform.isAndroid) return '10.0.2.2';
    return 'localhost';
  }

  static String get apiBaseUrl =>
      _apiOverride.isNotEmpty ? _apiOverride : 'http://$_defaultHost:5000/api';

  static String get socketUrl =>
      _socketOverride.isNotEmpty ? _socketOverride : 'http://$_defaultHost:5000';
}
