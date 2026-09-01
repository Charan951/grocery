import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/firebase_options.dart';

/// FCM wiring for the customer app. Every method degrades to a no-op if Firebase
/// init fails, so the app never depends on push being available.
class PushService {
  PushService(this._api);
  final ApiService _api;

  bool _ready = false;
  String? _token;

  /// Called with an orderId when the customer taps an order notification.
  void Function(String orderId)? onOrderTapped;

  Future<void> init() async {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      final m = FirebaseMessaging.instance;
      await m.requestPermission(alert: true, badge: true, sound: true);
      _token = await m.getToken();
      _ready = true;

      m.onTokenRefresh.listen((t) {
        _token = t;
        registerCurrentToken();
      });
      FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
      final initial = await m.getInitialMessage();
      if (initial != null) _handleTap(initial);
    } catch (e) {
      if (kDebugMode) debugPrint('[push] init skipped: $e');
    }
  }

  void _handleTap(RemoteMessage msg) {
    final id = msg.data['orderId']?.toString() ?? '';
    if (id.isNotEmpty) onOrderTapped?.call(id);
  }

  Future<void> registerCurrentToken() async {
    if (!_ready || _token == null) return;
    try {
      await _api.registerDevice(_token!, platform: defaultTargetPlatform.name);
    } catch (_) {/* retried on next login / refresh */}
  }

  Future<void> unregister() async {
    if (_token == null) return;
    try {
      await _api.removeDevice(_token!);
    } catch (_) {}
  }
}
