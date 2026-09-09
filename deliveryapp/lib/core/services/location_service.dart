import 'dart:async';
import 'package:geolocator/geolocator.dart';

/// Streams the device position while "online" and pushes it to the backend at
/// most once per [interval].
class LocationService {
  StreamSubscription<Position>? _sub;
  DateTime _lastPush = DateTime.fromMillisecondsSinceEpoch(0);
  Duration _interval = const Duration(seconds: 12);
  final void Function(double lat, double lng) onPush;

  LocationService(this.onPush);

  Future<bool> ensurePermission() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
      return false;
    }
    return Geolocator.isLocationServiceEnabled();
  }

  Future<bool> start({Duration interval = const Duration(seconds: 12)}) async {
    _interval = interval;
    if (_sub != null) return true;
    if (!await ensurePermission()) return false;

    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 15),
    ).listen((pos) {
      final now = DateTime.now();
      if (now.difference(_lastPush) < _interval) return;
      _lastPush = now;
      onPush(pos.latitude, pos.longitude);
    });

    try {
      // Timeboxed — on web / a blocked sensor `getCurrentPosition` can otherwise
      // hang forever and freeze whatever awaited `start()`.
      final p = await Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 8));
      _lastPush = DateTime.now();
      onPush(p.latitude, p.longitude);
    } catch (_) {}
    return true;
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
  }
}
