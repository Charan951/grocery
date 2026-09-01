import 'package:get_it/get_it.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/socket_service.dart';
import 'package:freshcart/core/services/push_service.dart';
import 'package:freshcart/core/services/token_store.dart';

final getIt = GetIt.instance;

Future<void> setupInjection() async {
  final storageService = StorageService();
  await storageService.init();
  getIt.registerSingleton<StorageService>(storageService);

  // Load the persisted auth token before anything reads it.
  final tokenStore = TokenStore();
  await tokenStore.load();
  getIt.registerSingleton<TokenStore>(tokenStore);

  getIt.registerLazySingleton<ApiService>(
    () => ApiService(tokenStore: getIt<TokenStore>()),
  );
  getIt.registerLazySingleton<SocketService>(() => SocketService());
  getIt.registerLazySingleton<PushService>(() => PushService(getIt<ApiService>()));
}
