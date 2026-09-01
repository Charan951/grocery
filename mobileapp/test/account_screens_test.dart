import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/utils/web_link.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/profile/presentation/screens/addresses_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/profile_edit_screen.dart';
import 'package:freshcart/features/profile/presentation/screens/wallet_screen.dart';

class _NoToken extends TokenStore {
  @override
  String? get token => null;
  @override
  bool get hasToken => false;
  @override
  Future<String?> load() async => null;
  @override
  Future<void> save(String t) async {}
  @override
  Future<void> clear() async {}
}

class _Storage extends StorageService {
  @override
  bool get isOnboardingCompleted => true;
}

class _Api extends ApiService {
  int addCalls = 0;
  int deleteCalls = 0;
  Map<String, dynamic>? lastProfile;
  List<Map<String, dynamic>> addresses;
  _Api({this.addresses = const []});

  @override
  Future<Map<String, dynamic>> fetchMe() async => {
        'name': 'Asha',
        'phone': '+91 9876500011',
        'email': 'a@b.com',
        'walletBalance': 250,
        'referralCode': 'ASHA50',
        'addresses': addresses,
      };

  @override
  Future<Map<String, dynamic>> updateMyProfile({String? name, String? email}) async {
    lastProfile = {'name': name, 'email': email};
    return {'name': name, 'phone': '+91 9876500011', 'email': email, 'walletBalance': 250};
  }

  @override
  Future<void> addAddress(Map<String, dynamic> body) async {
    addCalls++;
    addresses = [
      ...addresses,
      {'id': 'a${addresses.length + 1}', 'label': body['label'], 'fullAddress': body['fullAddress']},
    ];
  }

  @override
  Future<void> deleteAddress(String id) async {
    deleteCalls++;
    addresses = addresses.where((a) => a['id'] != id).toList();
  }
}

AuthNotifier _auth(_Api api, {List<Map<String, dynamic>> addresses = const []}) {
  final n = AuthNotifier(_Storage(), api, _NoToken());
  n.state = n.state.copyWith(
    isAuthenticated: true,
    user: UserProfile(
      name: 'Asha',
      phone: '+91 9876500011',
      email: 'a@b.com',
      walletBalance: 250,
      isVip: false,
      referralCode: 'ASHA50',
      addresses: addresses,
      selectedAddress: addresses.isNotEmpty ? addresses.first : null,
    ),
  );
  return n;
}

Widget _host(Widget screen, AuthNotifier auth) => ProviderScope(
      overrides: [authProvider.overrideWith((ref) => auth)],
      child: MaterialApp.router(
        theme: AppTheme.lightTheme,
        scaffoldMessengerKey: AppToast.messengerKey,
        routerConfig: GoRouter(routes: [
          GoRoute(path: '/', builder: (_, _) => screen),
          GoRoute(path: '/back', builder: (_, _) => const Scaffold(body: Text('BACK'))),
        ]),
      ),
    );

Future<void> _boot(WidgetTester t, Widget w) async {
  await t.pumpWidget(w);
  await t.pump();
  await t.pump(const Duration(milliseconds: 200));
}

void main() {
  group('resolveAppRoute', () {
    test('passes through product / category', () {
      expect(resolveAppRoute('/product/42'), '/product/42');
      expect(resolveAppRoute('/category/veg'), '/category/veg');
    });
    test('maps web /products query to /category', () {
      expect(resolveAppRoute('/products?category=veg'), '/category/veg');
      expect(resolveAppRoute('/products?category=veg&subCategory=Leafy%20greens'),
          '/category/veg?sub=Leafy%20greens');
      expect(resolveAppRoute('/products?subCategory=x'), isNull); // no category
    });
    test('returns null for pages the app lacks', () {
      expect(resolveAppRoute('/offers'), isNull);
      expect(resolveAppRoute('/brands'), isNull);
      expect(resolveAppRoute(''), isNull);
      expect(resolveAppRoute('https://x.com'), isNull);
    });
  });

  testWidgets('ProfileEditScreen saves name/email via updateProfile', (tester) async {
    final api = _Api();
    final auth = _auth(api);
    await _boot(tester, _host(const ProfileEditScreen(), auth));

    expect(find.text('Asha'), findsWidgets);
    await tester.enterText(find.byType(TextField).first, 'Asha K');
    await tester.tap(find.text('Save changes'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(api.lastProfile?['name'], 'Asha K');
    expect(find.text('Profile updated'), findsOneWidget);
  });

  testWidgets('WalletScreen shows real balance + referral, no fake txns / Add Money', (tester) async {
    final auth = _auth(_Api());
    await _boot(tester, _host(const WalletScreen(), auth));
    expect(find.text('₹250.00'), findsOneWidget);
    expect(find.text('ASHA50'), findsOneWidget);
    expect(find.text('Add Money'), findsNothing);
    expect(find.text('Transaction History'), findsNothing);
  });

  group('AddressesScreen', () {
    testWidgets('empty state', (tester) async {
      final auth = _auth(_Api());
      await _boot(tester, _host(const AddressesScreen(), auth));
      expect(find.text('No saved addresses'), findsOneWidget);
    });

    testWidgets('add flow posts a real address', (tester) async {
      final api = _Api();
      final auth = _auth(api);
      await _boot(tester, _host(const AddressesScreen(), auth));

      await tester.tap(find.text('Add new address').first);
      await tester.pumpAndSettle();
      final fields = find.byType(TextField); // house, area, city, pincode
      await tester.enterText(fields.at(1), '12th Main, Indiranagar');
      await tester.enterText(fields.at(3), '560038');
      await tester.tap(find.text('Save address'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(api.addCalls, 1);
      expect(find.text('Address saved'), findsOneWidget);
    });

    testWidgets('lists an existing address and deletes it via the API', (tester) async {
      final addr = {'id': 'a1', 'label': 'Home', 'name': 'Home', 'addressLine': '12 MG Road'};
      final api = _Api(addresses: [addr]);
      final auth = _auth(api, addresses: [
        {'id': 'a1', 'name': 'Home', 'label': 'Home', 'addressLine': '12 MG Road'}
      ]);
      await _boot(tester, _host(const AddressesScreen(), auth));

      expect(find.text('12 MG Road'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.delete_outline_rounded));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(api.deleteCalls, 1);
    });
  });
}
