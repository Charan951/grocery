import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isHydrating;
  final bool isLoading;
  final String? error;
  final PartnerProfile? profile;

  const AuthState({
    this.isAuthenticated = false,
    this.isHydrating = false,
    this.isLoading = false,
    this.error,
    this.profile,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isHydrating,
    bool? isLoading,
    String? error,
    bool clearError = false,
    PartnerProfile? profile,
    bool clearProfile = false,
  }) =>
      AuthState(
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        isHydrating: isHydrating ?? this.isHydrating,
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        profile: clearProfile ? null : (profile ?? this.profile),
      );
}

class AuthController extends StateNotifier<AuthState> {
  final Ref _ref;

  AuthController(this._ref) : super(const AuthState()) {
    final tokens = _ref.read(tokenStoreProvider);
    _ref.read(apiProvider).onUnauthorized = _forceLogout;
    state = AuthState(isAuthenticated: tokens.hasToken, isHydrating: tokens.hasToken);
    if (tokens.hasToken) _hydrate();
  }

  Future<void>? _hydrating;
  Future<void> ensureHydrated() => _hydrating ?? Future.value();

  Future<void> _hydrate() {
    return _hydrating ??= () async {
      try {
        final me = await _ref.read(apiProvider).me();
        state = state.copyWith(isAuthenticated: true, isHydrating: false, profile: me);
        _ref.read(socketProvider).connect(_ref.read(tokenStoreProvider).token!);
        _ref.read(pushServiceProvider).registerCurrentToken();
      } on ApiException catch (e) {
        if (e.isUnauthorized) {
          await _ref.read(tokenStoreProvider).clear();
          state = state.copyWith(isAuthenticated: false, isHydrating: false, clearProfile: true, error: e.message);
        } else {
          state = state.copyWith(isHydrating: false);
        }
      } finally {
        _hydrating = null;
      }
    }();
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final token = await _ref.read(apiProvider).login(email.trim(), password);
      await _ref.read(tokenStoreProvider).save(token);
      final me = await _ref.read(apiProvider).me();
      _ref.read(socketProvider).connect(token);
      _ref.read(pushServiceProvider).registerCurrentToken();
      state = state.copyWith(isLoading: false, isAuthenticated: true, isHydrating: false, profile: me);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    }
  }

  Future<void> refreshProfile() async {
    try {
      state = state.copyWith(profile: await _ref.read(apiProvider).me());
    } on ApiException {/* keep */}
  }

  void setProfile(PartnerProfile p) => state = state.copyWith(profile: p);

  Future<void> logout() async {
    await _ref.read(pushServiceProvider).unregister();
    await _ref.read(tokenStoreProvider).clear();
    _ref.read(socketProvider).disconnect();
    state = const AuthState();
  }

  void _forceLogout() {
    if (!mounted) return;
    _ref.read(tokenStoreProvider).clear();
    _ref.read(socketProvider).disconnect();
    state = const AuthState(error: 'Your session ended. Please sign in again.');
  }
}

final authProvider = StateNotifierProvider<AuthController, AuthState>((ref) => AuthController(ref));
