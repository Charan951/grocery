import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/app_config.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart'
    show apiServiceProvider;

class _Api extends ApiService {
  final Map<String, dynamic> cfg;
  final bool fail;
  _Api(this.cfg, {this.fail = false});
  @override
  Future<Map<String, dynamic>> fetchAppConfig() async {
    if (fail) throw ApiException('offline');
    return cfg;
  }
}

void main() {
  group('isVersionBelow', () {
    test('older is below newer', () {
      expect(isVersionBelow('1.0.0', '1.2.0'), isTrue);
      expect(isVersionBelow('1.1.9', '1.2.0'), isTrue);
      expect(isVersionBelow('0.9.0', '1.0.0'), isTrue);
    });
    test('equal or newer is not below', () {
      expect(isVersionBelow('1.2.0', '1.2.0'), isFalse);
      expect(isVersionBelow('2.0.0', '1.9.9'), isFalse);
      expect(isVersionBelow('1.2.3', '1.2.0'), isFalse);
    });
    test('tolerates missing / noisy parts', () {
      expect(isVersionBelow('1.0', '1.0.1'), isTrue);
      expect(isVersionBelow('1.0.0+42', '1.0.0'), isFalse);
    });
  });

  test('AppConfig.fromJson maps fields and falls back cleanly', () {
    final c = AppConfig.fromJson({
      'minSupportedVersion': '2.1.0',
      'maintenance': true,
      'maintenanceMessage': 'brb',
    });
    expect(c.minSupportedVersion, '2.1.0');
    expect(c.maintenance, isTrue);
    expect(c.maintenanceMessage, 'brb');
    expect(c.supportEmail, 'support@freshcart.com'); // default
  });

  group('appGateProvider', () {
    test('maintenance flag wins', () async {
      final c = ProviderContainer(overrides: [
        apiServiceProvider.overrideWithValue(_Api({'maintenance': true, 'minSupportedVersion': '0.0.0'})),
        appVersionProvider.overrideWith((ref) async => '1.0.0'),
      ]);
      addTearDown(c.dispose);
      expect(await c.read(appGateProvider.future), AppGate.maintenance);
    });

    test('version below the floor forces an update', () async {
      final c = ProviderContainer(overrides: [
        apiServiceProvider.overrideWithValue(_Api({'maintenance': false, 'minSupportedVersion': '9.9.9'})),
        appVersionProvider.overrideWith((ref) async => '1.0.0'),
      ]);
      addTearDown(c.dispose);
      expect(await c.read(appGateProvider.future), AppGate.forceUpdate);
    });

    test('a failed config fetch is permissive (ok)', () async {
      final c = ProviderContainer(overrides: [
        apiServiceProvider.overrideWithValue(_Api(const {}, fail: true)),
        appVersionProvider.overrideWith((ref) async => '1.0.0'),
      ]);
      addTearDown(c.dispose);
      expect(await c.read(appGateProvider.future), AppGate.ok);
    });
  });
}
