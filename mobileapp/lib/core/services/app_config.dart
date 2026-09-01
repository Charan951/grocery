import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart'
    show apiServiceProvider;

/// Customer-app runtime config from `GET /api/app/config`.
class AppConfig {
  final String minSupportedVersion;
  final String latestVersion;
  final bool maintenance;
  final String maintenanceMessage;
  final String updateUrl;
  final String supportEmail;
  final String supportPhone;

  const AppConfig({
    this.minSupportedVersion = '0.0.0',
    this.latestVersion = '0.0.0',
    this.maintenance = false,
    this.maintenanceMessage = '',
    this.updateUrl = '',
    this.supportEmail = 'support@freshcart.com',
    this.supportPhone = '',
  });

  /// Permissive fallback — used whenever the config can't be fetched or parsed
  /// so a network blip never hard-blocks the app.
  static const permissive = AppConfig();

  factory AppConfig.fromJson(Map<String, dynamic> j) => AppConfig(
        minSupportedVersion: (j['minSupportedVersion'] ?? '0.0.0').toString(),
        latestVersion: (j['latestVersion'] ?? j['minSupportedVersion'] ?? '0.0.0').toString(),
        maintenance: j['maintenance'] == true,
        maintenanceMessage: (j['maintenanceMessage'] ?? '').toString(),
        updateUrl: (j['updateUrl'] ?? '').toString(),
        supportEmail: (j['supportEmail'] ?? 'support@freshcart.com').toString(),
        supportPhone: (j['supportPhone'] ?? '').toString(),
      );
}

/// `1.2.3` → `[1, 2, 3]`; missing/garbled parts read as 0.
List<int> _semver(String v) {
  final parts = v.trim().split('.');
  return List<int>.generate(3, (i) {
    if (i >= parts.length) return 0;
    return int.tryParse(parts[i].replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
  });
}

/// True when [current] is strictly older than [minimum] (both dotted semver).
bool isVersionBelow(String current, String minimum) {
  final c = _semver(current);
  final m = _semver(minimum);
  for (var i = 0; i < 3; i++) {
    if (c[i] != m[i]) return c[i] < m[i];
  }
  return false;
}

/// Fetches the app config once per launch. Never throws — falls back to
/// [AppConfig.permissive] so callers can always read `.valueOrNull`.
final appConfigProvider = FutureProvider<AppConfig>((ref) async {
  try {
    final raw = await ref
        .watch(apiServiceProvider)
        .fetchAppConfig()
        .timeout(const Duration(seconds: 4));
    return AppConfig.fromJson(Map<String, dynamic>.from(raw));
  } catch (_) {
    return AppConfig.permissive;
  }
});

/// The running app's version string (e.g. `1.0.0`).
final appVersionProvider = FutureProvider<String>((ref) async {
  try {
    final info = await PackageInfo.fromPlatform();
    return info.version;
  } catch (_) {
    return '0.0.0';
  }
});

enum AppGate { ok, maintenance, forceUpdate }

/// Resolves the boot gate: maintenance wins, then the version floor.
final appGateProvider = FutureProvider<AppGate>((ref) async {
  final cfg = await ref.watch(appConfigProvider.future);
  if (cfg.maintenance) return AppGate.maintenance;
  final version = await ref.watch(appVersionProvider.future);
  if (isVersionBelow(version, cfg.minSupportedVersion)) return AppGate.forceUpdate;
  return AppGate.ok;
});
