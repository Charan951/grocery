import 'package:hive_flutter/hive_flutter.dart';

class StorageService {
  late Box _settingsBox;
  late Box _cartBox;
  late Box _favoritesBox;

  StorageService();

  Future<void> init() async {
    await Hive.initFlutter();
    _settingsBox = await Hive.openBox('freshcart_settings');
    _cartBox = await Hive.openBox('freshcart_cart');
    _favoritesBox = await Hive.openBox('freshcart_favorites');
  }

  // Onboarding status
  bool get isOnboardingCompleted => _settingsBox.get('onboarding_completed', defaultValue: false) as bool;
  
  Future<void> completeOnboarding() async {
    await _settingsBox.put('onboarding_completed', true);
  }

  // Theme settings
  bool get isDarkMode => _settingsBox.get('dark_mode', defaultValue: false) as bool;

  Future<void> setDarkMode(bool value) async {
    await _settingsBox.put('dark_mode', value);
  }

  // Cart operations
  List<dynamic> getCartItems() {
    return _cartBox.values.toList();
  }

  Future<void> saveCartItems(List<Map<String, dynamic>> items) async {
    await _cartBox.clear();
    for (int i = 0; i < items.length; i++) {
      await _cartBox.put(i, items[i]);
    }
  }

  // Favorite product IDs
  List<String> getFavoriteIds() {
    return List<String>.from(_favoritesBox.get('favorite_ids', defaultValue: <String>[]) as List);
  }

  Future<void> toggleFavorite(String id) async {
    final list = getFavoriteIds();
    if (list.contains(id)) {
      list.remove(id);
    } else {
      list.add(id);
    }
    await _favoritesBox.put('favorite_ids', list);
  }

  Future<void> clearAll() async {
    await _cartBox.clear();
    await _favoritesBox.clear();
  }
}
