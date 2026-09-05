import 'dart:async';
import 'dart:io' show HttpClient, Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Override with --dart-define API_BASE_URL=... SOCKET_URL=... ENV=...
class AppConfig {
  const AppConfig._();

  // ── Production switch ──────────────────────────────────────────────────
  // Flip this to true to point the app at your deployed backend instead of
  // your local dev machine; false always uses the local-dev detection below.
  // Can also be set at build time without editing this file:
  //   flutter run --dart-define USE_PRODUCTION_BACKEND=true
  static const bool useProductionBackend =
      bool.fromEnvironment('USE_PRODUCTION_BACKEND', defaultValue: false);

  // Fill these in once you deploy the backend. Only read when
  // [useProductionBackend] is true.
  static const String productionApiBaseUrl = String.fromEnvironment(
    'PRODUCTION_API_BASE_URL',
    defaultValue: 'https://api.freshcart.example.com/api',
  );
  static const String productionSocketUrl = String.fromEnvironment(
    'PRODUCTION_SOCKET_URL',
    defaultValue: 'https://api.freshcart.example.com',
  );

  // Explicit --dart-define overrides win over everything else, in either mode.
  static const _api = String.fromEnvironment('API_BASE_URL');
  static const _socket = String.fromEnvironment('SOCKET_URL');
  static const env = String.fromEnvironment('ENV', defaultValue: 'development');

  /// Your dev machine's LAN IP, for a physical device on the same WiFi. Only
  /// used as one candidate in [autoDetectDevHost] — update it (or pass
  /// --dart-define DEV_LAN_IP=...) if your machine's IP changes.
  static const String _devLanIp = String.fromEnvironment('DEV_LAN_IP', defaultValue: '192.168.29.245');

  static String? _detectedHost;

  /// Probes every way a device might reach the local dev backend — emulator
  /// loopback (10.0.2.2), USB via `adb reverse tcp:5000 tcp:5000` (localhost),
  /// and the dev machine's LAN IP (WiFi) — in parallel, and remembers
  /// whichever answers first. Call once at startup, before anything
  /// constructs an API/socket client. A no-op when an explicit override or
  /// production mode is already in play.
  static Future<void> autoDetectDevHost({
    Duration timeout = const Duration(milliseconds: 1200),
  }) async {
    if (kIsWeb || useProductionBackend || _api.isNotEmpty) return;

    final candidates = <String>{
      if (Platform.isAndroid) '10.0.2.2',
      'localhost',
      _devLanIp,
    };

    final client = HttpClient()..connectionTimeout = timeout;
    try {
      Future<String?> probe(String host) async {
        try {
          final req = await client.getUrl(Uri.parse('http://$host:5000/')).timeout(timeout);
          final res = await req.close().timeout(timeout);
          await res.drain<void>();
          return res.statusCode == 200 ? host : null;
        } catch (_) {
          return null;
        }
      }

      final results = await Future.wait(candidates.map(probe));
      _detectedHost = results.firstWhere((h) => h != null, orElse: () => null);
    } finally {
      client.close(force: true);
    }
  }

  /// Android emulator reaches the host machine on 10.0.2.2; everything else on
  /// localhost. Overridden by whatever [autoDetectDevHost] found reachable.
  static String get _host {
    if (_detectedHost != null) return _detectedHost!;
    if (!kIsWeb && Platform.isAndroid) return '10.0.2.2';
    return 'localhost';
  }

  static String get apiBaseUrl {
    if (_api.isNotEmpty) return _api;
    if (useProductionBackend) return productionApiBaseUrl;
    return 'http://$_host:5000/api';
  }

  static String get socketUrl {
    if (_socket.isNotEmpty) return _socket;
    if (useProductionBackend) return productionSocketUrl;
    return 'http://$_host:5000';
  }
}
