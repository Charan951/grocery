import 'package:get_it/get_it.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/socket_service.dart';

final getIt = GetIt.instance;

Future<void> setupInjection() async {
  final storageService = StorageService();
  await storageService.init();
  getIt.registerSingleton<StorageService>(storageService);
  getIt.registerLazySingleton<ApiService>(() => ApiService());
  getIt.registerLazySingleton<SocketService>(() => SocketService());
}
