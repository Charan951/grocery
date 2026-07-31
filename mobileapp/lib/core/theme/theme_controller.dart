import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/storage_service.dart';

class ThemeNotifier extends StateNotifier<bool> {
  final StorageService _storageService;

  ThemeNotifier(this._storageService) : super(_storageService.isDarkMode);

  void toggleTheme() {
    state = !state;
    _storageService.setDarkMode(state);
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, bool>((ref) {
  return ThemeNotifier(getIt<StorageService>());
});
