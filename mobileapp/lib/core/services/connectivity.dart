import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// `true` while the device has a network route (wifi / mobile / ethernet / vpn),
/// `false` only when connectivity reports `none`. This is reachability, not a
/// guarantee the API is up — pair it with request-level error handling.
///
/// connectivity_plus 5.x reports a single [ConnectivityResult].
final connectivityProvider = StreamProvider<bool>((ref) async* {
  final conn = Connectivity();

  bool online(ConnectivityResult r) => r != ConnectivityResult.none;

  try {
    yield online(await conn.checkConnectivity());
  } catch (_) {
    yield true; // assume online if the platform check fails
  }

  yield* conn.onConnectivityChanged.map(online);
});
