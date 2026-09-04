import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/profile/presentation/screens/profile_screen.dart';

class _TestToken extends TokenStore {
  @override
  String? get token => 'fake-token';
  @override
  bool get hasToken => true;
  @override
  Future<String?> load() async => 'fake-token';
  @override
  Future<void> save(String t) async {}
  @override
  Future<void> clear() async {}
}

class _Storage extends StorageService {
  @override
  bool get isOnboardingCompleted => true;
  @override
  bool get isDarkMode => false;
}

class _Api extends ApiService {
  @override
  Future<Map<String, dynamic>> fetchMe() async => {
        'name': 'Asha',
        'phone': '+91 9876500011',
        'email': 'a@b.com',
        'walletBalance': 250,
        'referralCode': 'ASHA50',
        'addresses': [],
      };
}

class _TestAuthNotifier extends AuthNotifier {
  _TestAuthNotifier(StorageService s, ApiService api, TokenStore t) : super(s, api, t) {
    state = AuthState(
      isAuthenticated: true,
      isOnboardingCompleted: true,
      locationPermissionGranted: true,
      user: UserProfile(
        name: 'Asha',
        phone: '+91 9876500011',
        email: 'a@b.com',
        walletBalance: 250,
        isVip: false,
        referralCode: 'ASHA50',
        addresses: const [],
      ),
    );
  }
}

Widget _host() => ProviderScope(
      overrides: [
        authProvider.overrideWith((ref) => _TestAuthNotifier(_Storage(), _Api(), _TestToken())),
        themeProvider.overrideWith((ref) => ThemeNotifier(_Storage())),
      ],
      child: const MaterialApp(
        home: ProfileScreen(),
      ),
    );

void main() {
  testWidgets('renders ProfileScreen menu tiles without ListTile background assertion errors', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(_host());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.byType(ProfileScreen), findsOneWidget);
    expect(find.text('Order history'), findsOneWidget);
    expect(find.text('Wishlist'), findsOneWidget);
    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Dark mode'), findsOneWidget);
  });
}
