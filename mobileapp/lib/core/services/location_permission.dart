import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:freshcart/core/constants/app_colors.dart';

/// Outcome of a location permission check / request.
enum LocationPermState {
  granted,
  serviceDisabled, // GPS / location services turned off on the device
  denied, // can ask again
  deniedForever, // must go to app settings
}

extension LocationPermStateX on LocationPermState {
  bool get ok => this == LocationPermState.granted;

  String get message => switch (this) {
        LocationPermState.granted => 'Location access granted',
        LocationPermState.serviceDisabled =>
          'Location services are off. Turn on GPS to detect your address.',
        LocationPermState.denied =>
          'Allow location access so we can find your delivery address.',
        LocationPermState.deniedForever =>
          'Location permission is blocked. Enable it in Settings to auto-detect your address.',
      };
}

/// Thin wrapper over `geolocator` with a rationale sheet and a settings escape
/// hatch — the app has no `permission_handler`, so this centralises the flow.
class LocationPermissionService {
  const LocationPermissionService._();

  static Future<LocationPermState> _classify(LocationPermission p) async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return LocationPermState.serviceDisabled;
    }
    return switch (p) {
      LocationPermission.always ||
      LocationPermission.whileInUse =>
        LocationPermState.granted,
      LocationPermission.deniedForever => LocationPermState.deniedForever,
      _ => LocationPermState.denied,
    };
  }

  /// Non-intrusive check — never shows a system dialog.
  static Future<LocationPermState> check() async =>
      _classify(await Geolocator.checkPermission());

  /// Requests permission (system dialog if still askable).
  static Future<LocationPermState> request() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      return LocationPermState.serviceDisabled;
    }
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) {
      p = await Geolocator.requestPermission();
    }
    return _classify(p);
  }

  static Future<void> openAppSettings() => Geolocator.openAppSettings();
  static Future<void> openLocationSettings() => Geolocator.openLocationSettings();

  /// Full flow with UI: rationale → request → (deniedForever) offer Settings.
  /// Returns the final state. Safe to call with a possibly-unmounted context —
  /// the caller should re-check `context.mounted` after.
  static Future<LocationPermState> ensureWithUi(BuildContext context) async {
    var state = await check();
    if (state.ok || !context.mounted) return state;

    if (state == LocationPermState.denied) {
      final proceed = await _rationaleSheet(context);
      if (proceed != true) return state;
      if (!context.mounted) return state;
      state = await request();
    }

    if (state == LocationPermState.serviceDisabled && context.mounted) {
      final go = await _actionDialog(
        context,
        title: 'Turn on location',
        body: LocationPermState.serviceDisabled.message,
        action: 'Open location settings',
      );
      if (go == true) await openLocationSettings();
      state = await check();
    }

    if (state == LocationPermState.deniedForever && context.mounted) {
      final go = await _actionDialog(
        context,
        title: 'Location is blocked',
        body: LocationPermState.deniedForever.message,
        action: 'Open Settings',
      );
      if (go == true) await openAppSettings();
      state = await check();
    }

    return state;
  }

  static Future<bool?> _rationaleSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.my_location_rounded, color: AppColors.primary, size: 28),
            const SizedBox(height: 12),
            Text(
              'Use your location',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'FreshCart uses your location once to detect your delivery address and '
              'show nearby stock and slots. You can also enter the address manually.',
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Not now'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                    child: const Text('Allow'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static Future<bool?> _actionDialog(
    BuildContext context, {
    required String title,
    required String body,
    required String action,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            child: Text(action),
          ),
        ],
      ),
    );
  }
}
