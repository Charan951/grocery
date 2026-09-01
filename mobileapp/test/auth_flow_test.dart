import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class _FakeTokenStore extends TokenStore {
  String? _t;
  _FakeTokenStore([this._t]);
  @override
  String? get token => _t;
  @override
  bool get hasToken => _t != null && _t!.isNotEmpty;
  @override
  Future<String?> load() async => _t;
  @override
  Future<void> save(String token) async => _t = token;
  @override
  Future<void> clear() async => _t = null;
}

class _FakeStorage extends StorageService {
  bool _onboard;
  _FakeStorage({bool onboardingCompleted = true}) : _onboard = onboardingCompleted;
  @override
  bool get isOnboardingCompleted => _onboard;
  @override
  Future<void> completeOnboarding() async => _onboard = true;
}

class _FakeApi extends ApiService {
  final Map<String, dynamic> Function(String phone)? onSend;
  final Map<String, dynamic> Function(String phone, String code)? onVerify;
  final Map<String, dynamic> Function()? onMe;
  _FakeApi({this.onSend, this.onVerify, this.onMe});

  @override
  Future<Map<String, dynamic>> sendOtp(String phone) async =>
      onSend?.call(phone) ?? {'testMode': true, 'devCode': '000000', 'ttl': 300};

  @override
  Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    final r = onVerify?.call(phone, code);
    if (r == null) throw ApiException('Incorrect code', statusCode: 400);
    return r;
  }

  @override
  Future<Map<String, dynamic>> fetchMe() async =>
      onMe?.call() ?? (throw ApiException('unauthorized', statusCode: 401));
}

void main() {
  group('UserProfile.fromCustomerJson', () {
    test('maps core fields and picks the default address', () {
      final u = UserProfile.fromCustomerJson({
        'name': 'Asha',
        'phone': '+91 9876500011',
        'email': 'a@b.com',
        'membershipType': 'VIP',
        'walletBalance': 250,
        'addresses': [
          {'id': 'a1', 'fullAddress': 'Line 1', 'lat': 12.9, 'lng': 77.6, 'isDefault': false},
          {'id': 'a2', 'fullAddress': 'Line 2', 'lat': 13.0, 'lng': 77.7, 'isDefault': true},
        ],
      });
      expect(u.name, 'Asha');
      expect(u.isVip, isTrue);
      expect(u.walletBalance, 250.0);
      expect(u.selectedAddress?['id'], 'a2');
      expect(u.selectedAddress?['addressLine'], 'Line 2');
      expect(u.selectedAddress?['latitude'], 13.0);
    });

    test('tolerates a minimal / empty customer', () {
      final u = UserProfile.fromCustomerJson({'phone': '+91 9000000000'});
      expect(u.addresses, isEmpty);
      expect(u.selectedAddress, isNull);
      expect(u.isVip, isFalse);
      expect(u.walletBalance, 0.0);
    });
  });

  group('AuthNotifier', () {
    test('starts unauthenticated with no token', () {
      final n = AuthNotifier(_FakeStorage(), _FakeApi(), _FakeTokenStore());
      expect(n.state.isAuthenticated, isFalse);
      expect(n.state.isHydrating, isFalse);
    });

    test('sendOtp surfaces test-mode code', () async {
      final api = _FakeApi(onSend: (p) => {'testMode': true, 'devCode': '000000', 'ttl': 300});
      final n = AuthNotifier(_FakeStorage(), api, _FakeTokenStore());
      final ok = await n.sendOtp('98765 00011');
      expect(ok, isTrue);
      expect(n.state.otpTestMode, isTrue);
      expect(n.state.otpDevCode, '000000');
      expect(n.state.isLoading, isFalse);
    });

    test('verifyOtp success stores token, authenticates, loads profile', () async {
      final store = _FakeTokenStore();
      final api = _FakeApi(onVerify: (p, c) => {
            'token': 'jwt.token.value',
            'customer': {'name': 'Asha', 'phone': '+91 9876500011', 'walletBalance': 10},
          });
      final n = AuthNotifier(_FakeStorage(), api, store);
      final ok = await n.verifyOtp('9876500011', '000000');
      expect(ok, isTrue);
      expect(store.token, 'jwt.token.value');
      expect(n.state.isAuthenticated, isTrue);
      expect(n.state.user?.name, 'Asha');
    });

    test('verifyOtp failure keeps user signed out and sets error', () async {
      final n = AuthNotifier(_FakeStorage(), _FakeApi(), _FakeTokenStore());
      final ok = await n.verifyOtp('9876500011', '123456');
      expect(ok, isFalse);
      expect(n.state.isAuthenticated, isFalse);
      expect(n.state.error, contains('Incorrect'));
    });

    test('logout clears the token', () async {
      final store = _FakeTokenStore('existing.jwt');
      final api = _FakeApi(onMe: () => {'name': 'X', 'phone': '+91 9', 'walletBalance': 0});
      final n = AuthNotifier(_FakeStorage(), api, store);
      await n.ensureHydrated();
      expect(n.state.isAuthenticated, isTrue);
      await n.logout();
      expect(store.token, isNull);
      expect(n.state.isAuthenticated, isFalse);
    });
  });
}
