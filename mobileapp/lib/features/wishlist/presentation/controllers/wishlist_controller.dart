import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/storage_service.dart';

class WishlistNotifier extends StateNotifier<List<String>> {
  final StorageService _storage;

  WishlistNotifier(this._storage) : super(_storage.getFavoriteIds());

  void toggleWishlist(String productId) {
    if (state.contains(productId)) {
      state = List<String>.from(state)..remove(productId);
    } else {
      state = List<String>.from(state)..add(productId);
    }
    _storage.toggleFavorite(productId);
  }

  bool isFavorite(String productId) {
    return state.contains(productId);
  }
}

final wishlistProvider = StateNotifierProvider<WishlistNotifier, List<String>>((ref) {
  return WishlistNotifier(getIt<StorageService>());
});
