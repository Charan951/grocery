import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the customer auth JWT in the platform secure store (Keystore /
/// Keychain). Keeps an in-memory copy so the Dio interceptor can attach it
/// synchronously on every request.
class TokenStore {
  static const _kToken = 'customer_jwt';

  final FlutterSecureStorage _storage;
  String? _cached;

  TokenStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  String? get token => _cached;
  bool get hasToken => _cached != null && _cached!.isNotEmpty;

  /// Load the persisted token into memory. Call once at startup.
  Future<String?> load() async {
    try {
      _cached = await _storage.read(key: _kToken);
    } catch (_) {
      _cached = null;
    }
    return _cached;
  }

  Future<void> save(String token) async {
    _cached = token;
    try {
      await _storage.write(key: _kToken, value: token);
    } catch (_) {/* in-memory copy still lets the session continue */}
  }

  Future<void> clear() async {
    _cached = null;
    try {
      await _storage.delete(key: _kToken);
    } catch (_) {}
  }
}
