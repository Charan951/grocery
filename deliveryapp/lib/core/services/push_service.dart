import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:freshcart_delivery/core/services/api_client.dart';
import 'package:freshcart_delivery/firebase_options.dart';

/// FCM wiring for the delivery partner app. Safe to call even if Firebase
/// init fails — every method then degrades to a no-op.
class PushService {
  PushService(this._api);
  final ApiClient _api;

  bool _ready = false;
  String? _token;
  String? get token => _token;

  /// Called with the orderId when the partner taps a `delivery_offer` push.
  void Function(String orderId)? onOfferTapped;

  Future<void> init() async {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      _token = await messaging.getToken();
      _ready = true;

      messaging.onTokenRefresh.listen((t) {
        _token = t;
        registerCurrentToken();
      });

      FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
      final initial = await messaging.getInitialMessage();
      if (initial != null) _handleTap(initial);
    } catch (e) {
      if (kDebugMode) debugPrint('[push] init skipped: $e');
    }
  }

  void _handleTap(RemoteMessage m) {
    if (m.data['type'] == 'delivery_offer') {
      final id = m.data['orderId']?.toString() ?? '';
      if (id.isNotEmpty) onOfferTapped?.call(id);
    }
  }

  /// Register the current device token with the backend. No-op without a token.
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
