import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/storage_service.dart';

/// Persisted recent-search terms, most recent first.
class RecentSearchesNotifier extends StateNotifier<List<String>> {
  final StorageService _storage;
  RecentSearchesNotifier(this._storage) : super(_storage.getRecentSearches());

  Future<void> add(String term) async {
    await _storage.addRecentSearch(term);
    state = _storage.getRecentSearches();
  }

  Future<void> clear() async {
    await _storage.clearRecentSearches();
    state = const [];
  }
}

final recentSearchesProvider =
    StateNotifierProvider<RecentSearchesNotifier, List<String>>((ref) {
  return RecentSearchesNotifier(getIt<StorageService>());
});
