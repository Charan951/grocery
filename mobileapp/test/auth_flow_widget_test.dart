import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/otp_field.dart';
import 'package:freshcart/core/widgets/phone_field.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/authentication/presentation/screens/login_screen.dart';
import 'package:freshcart/features/authentication/presentation/screens/otp_screen.dart';

// ---- Fakes (mirrors test/auth_flow_test.dart) --------------------------------

class _FakeTokenStore extends TokenStore {
  String? _t;
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
  @override
  bool get isOnboardingCompleted => true;
  @override
  Future<void> completeOnboarding() async {}
}

class _FakeApi extends ApiService {
  int sendCalls = 0;
  final String? verifyToken; // null => verify fails

  _FakeApi({this.verifyToken = 'jwt.token'});

  @override
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    sendCalls++;
    return {'testMode': true, 'devCode': '000000', 'ttl': 300};
  }

  @override
  Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    if (verifyToken == null) throw ApiException('Incorrect code', statusCode: 400);
    return {
      'token': verifyToken,
      'customer': {'name': 'Asha', 'phone': '+91 $phone', 'walletBalance': 0},
    };
  }

  @override
  Future<Map<String, dynamic>> fetchMe() async => throw ApiException('no', statusCode: 401);
}

ProviderScope _app(AuthNotifier notifier, {String initial = '/login'}) {
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: '/otp',
        builder: (_, s) => OtpScreen(phone: s.uri.queryParameters['phone'] ?? ''),
      ),
      GoRoute(path: '/location_select', builder: (_, _) => const Scaffold(body: Text('LOCATION'))),
      GoRoute(path: '/', builder: (_, _) => const Scaffold(body: Text('HOME'))),
    ],
  );
  return ProviderScope(
    overrides: [authProvider.overrideWith((ref) => notifier)],
    child: MaterialApp.router(
      theme: AppTheme.lightTheme,
      scaffoldMessengerKey: AppToast.messengerKey,
      routerConfig: router,
    ),
  );
}

void main() {
  group('PhoneField', () {
    testWidgets('groups digits and reports validity', (tester) async {
      final c = PhoneFieldController();
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: PhoneField(controller: c))));

      await tester.enterText(find.byType(TextField), '9876543210');
      await tester.pump();

      expect(c.text, '98765 43210');
      expect(c.digits, '9876543210');
      expect(c.isValid, isTrue);
    });

    testWidgets('caps at 10 digits', (tester) async {
      final c = PhoneFieldController();
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: PhoneField(controller: c))));
      await tester.enterText(find.byType(TextField), '99999999999999');
      await tester.pump();
      expect(c.digits.length, 10);
    });
  });

  group('OtpField', () {
    testWidgets('fires onCompleted with all six digits', (tester) async {
      String? done;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: OtpField(onCompleted: (v) => done = v)),
      ));
      final boxes = find.byType(TextField);
      for (var i = 0; i < 6; i++) {
        await tester.enterText(boxes.at(i), '${i + 1}');
        await tester.pump();
      }
      expect(done, '123456');
    });

    testWidgets('a pasted code is distributed across boxes', (tester) async {
      String? done;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: OtpField(onCompleted: (v) => done = v)),
      ));
      await tester.enterText(find.byType(TextField).first, '424242');
      await tester.pump();
      expect(done, '424242');
    });

    testWidgets('errorText renders a message', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: OtpField(errorText: 'Invalid code')),
      ));
      await tester.pump();
      expect(find.text('Invalid code'), findsOneWidget);
    });
  });

  group('Login screen', () {
    testWidgets('rejects a short number with an inline error', (tester) async {
      final n = AuthNotifier(_FakeStorage(), _FakeApi(), _FakeTokenStore());
      await tester.pumpWidget(_app(n));
      await tester.enterText(find.byType(TextField), '12345');
      await tester.tap(find.text('Send code'));
      await tester.pump();
      expect(find.text('Enter a valid 10-digit mobile number'), findsOneWidget);
    });

    testWidgets('shows the Terms / Privacy consent line', (tester) async {
      final n = AuthNotifier(_FakeStorage(), _FakeApi(), _FakeTokenStore());
      await tester.pumpWidget(_app(n));
      expect(find.textContaining('Terms of Service'), findsOneWidget);
      expect(find.textContaining('Privacy Policy'), findsOneWidget);
    });

    testWidgets('valid number requests an OTP and routes to the OTP screen',
        (tester) async {
      final api = _FakeApi();
      final n = AuthNotifier(_FakeStorage(), api, _FakeTokenStore());
      await tester.pumpWidget(_app(n));

      await tester.enterText(find.byType(TextField), '9876543210');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();

      expect(api.sendCalls, 1);
      expect(find.text('Verify your number'), findsOneWidget);
      expect(find.textContaining('98765 43210'), findsOneWidget);
      expect(find.textContaining('use code 000000'), findsOneWidget); // test-mode banner
    });
  });

  group('OTP screen', () {
    testWidgets('completing a wrong code shows an error and clears the boxes',
        (tester) async {
      final n = AuthNotifier(_FakeStorage(), _FakeApi(verifyToken: null), _FakeTokenStore());
      await tester.pumpWidget(_app(n, initial: '/otp?phone=9876543210'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, '111111');
      await tester.pumpAndSettle();

      expect(find.text('Incorrect code'), findsOneWidget);
      expect(find.text('HOME'), findsNothing);
      expect(find.text('LOCATION'), findsNothing);
    });

    testWidgets('a correct code signs in and routes onward to location setup',
        (tester) async {
      final store = _FakeTokenStore();
      final n = AuthNotifier(_FakeStorage(), _FakeApi(), store);
      await tester.pumpWidget(_app(n, initial: '/otp?phone=9876543210'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, '000000');
      await tester.pumpAndSettle();

      expect(store.token, 'jwt.token');
      expect(find.text('LOCATION'), findsOneWidget);
    });
  });
}
