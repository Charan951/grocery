import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Streams the device position while "online" and pushes it to the backend at
/// most once per [interval]. Works across both Web and Mobile.
class LocationService {
  StreamSubscription<Position>? _sub;
  DateTime _lastPush = DateTime.fromMillisecondsSinceEpoch(0);
  Duration _interval = const Duration(seconds: 12);
  final void Function(double lat, double lng) onPush;

  LocationService(this.onPush);

  Future<bool> ensurePermission() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
        return false;
      }
      // On Web browsers, checkPermission/requestPermission is the single source of truth;
      // hardware isLocationServiceEnabled() check is only applicable on native mobile.
      if (kIsWeb) return true;
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return false;
    }
  }

  /// Automatically fetches the current device location (high accuracy, falling back to low accuracy)
  /// and immediately sends it to the backend.
  Future<Position?> fetchAndPushCurrentPosition() async {
    if (!await ensurePermission()) return null;
    try {
      final p = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 8));
      _lastPush = DateTime.now();
      onPush(p.latitude, p.longitude);
      return p;
    } catch (_) {
      try {
        final p = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.low,
        ).timeout(const Duration(seconds: 5));
        _lastPush = DateTime.now();
        onPush(p.latitude, p.longitude);
        return p;
      } catch (_) {
        return null;
      }
    }
  }

  Future<bool> start({Duration interval = const Duration(seconds: 12)}) async {
    _interval = interval;
    if (_sub != null) return true;
    if (!await ensurePermission()) return false;

    // Immediately fetch & push location on start
    await fetchAndPushCurrentPosition();

    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 15),
    ).listen(
      (pos) {
        final now = DateTime.now();
        if (now.difference(_lastPush) < _interval) return;
        _lastPush = now;
        onPush(pos.latitude, pos.longitude);
      },
      onError: (_) {},
    );

    return true;
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
  }
}
