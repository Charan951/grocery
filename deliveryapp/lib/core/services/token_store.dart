import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  static const _k = 'partner_jwt';
  final FlutterSecureStorage _s;
  String? _cached;

  TokenStore([FlutterSecureStorage? s])
      : _s = s ?? const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  String? get token => _cached;
  bool get hasToken => _cached != null && _cached!.isNotEmpty;

  Future<String?> load() async {
    try {
      _cached = await _s.read(key: _k);
    } catch (_) {
      _cached = null;
    }
    return _cached;
  }

  Future<void> save(String t) async {
    _cached = t;
    try {
      await _s.write(key: _k, value: t);
    } catch (_) {}
  }

  Future<void> clear() async {
    _cached = null;
    try {
      await _s.delete(key: _k);
    } catch (_) {}
  }
}
