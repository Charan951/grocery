import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/services/api_client.dart';
import 'package:freshcart_delivery/core/services/location_service.dart';
import 'package:freshcart_delivery/core/services/push_service.dart';
import 'package:freshcart_delivery/core/services/socket_service.dart';
import 'package:freshcart_delivery/core/services/token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiProvider = Provider<ApiClient>((ref) => ApiClient(ref.read(tokenStoreProvider)));

final pushServiceProvider = Provider<PushService>((ref) => PushService(ref.read(apiProvider)));

final socketProvider = Provider<SocketService>((ref) {
  final s = SocketService();
  ref.onDispose(s.disconnect);
  return s;
});

final locationServiceProvider = Provider<LocationService>((ref) {
  final api = ref.read(apiProvider);
  final svc = LocationService((lat, lng) => api.pushLocation(lat, lng).catchError((_) {}));
  ref.onDispose(svc.stop);
  return svc;
});
