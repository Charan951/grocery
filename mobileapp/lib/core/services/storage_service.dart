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

  // Scope cart/favourites/recent-searches to whichever customer they belong
  // to. Local data is only ever written for the "current owner"; if a
  // different customer becomes the current session (a fresh login, or an
  // app restart that silently drops an expired token and then logs a
  // different person in) whatever was left behind by the previous owner is
  // wiped first, so one customer's cart/wishlist/searches can never leak
  // into another's session on a shared device.
  static const _ownerKey = 'local_data_owner';

  Future<void> syncOwner(String? userKey) async {
    // Best-effort: a test double or a StorageService used before init() has
    // no live Hive boxes yet — never let that take down auth/hydrate.
    try {
      final current = _settingsBox.get(_ownerKey) as String?;
      if (current == userKey) return;
      // Only wipe when handing off between two *different* real identities —
      // a guest's cart (current == null) is allowed to carry into their first
      // login. Logout already clears local data itself (see AuthNotifier.logout),
      // so this just needs to stop a stale owner's leftovers from surviving
      // into someone else's fresh login.
      if (current != null && userKey != null) {
        await clearAll();
        await clearRecentSearches();
      }
      await _settingsBox.put(_ownerKey, userKey);
    } catch (_) {/* best effort */}
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

  // Recent searches (most-recent first, capped)
  List<String> getRecentSearches() =>
      List<String>.from(_settingsBox.get('recent_searches', defaultValue: <String>[]) as List);

  Future<void> addRecentSearch(String term) async {
    final t = term.trim();
    if (t.isEmpty) return;
    final list = getRecentSearches()..removeWhere((e) => e.toLowerCase() == t.toLowerCase());
    list.insert(0, t);
    await _settingsBox.put('recent_searches', list.take(8).toList());
  }

  Future<void> clearRecentSearches() async =>
      _settingsBox.put('recent_searches', <String>[]);

  Future<void> clearAll() async {
    await _cartBox.clear();
    await _favoritesBox.clear();
  }
}
