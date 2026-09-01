import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/push_service.dart';
import 'package:freshcart/core/services/storage_service.dart';
import 'package:freshcart/core/services/token_store.dart';

class UserProfile {
  final String name;
  final String phone;
  final String? email;
  final double walletBalance;
  final bool isVip;
  final String? referralCode;
  final Map<String, dynamic>? selectedAddress;
  final List<Map<String, dynamic>> addresses;

  UserProfile({
    required this.name,
    required this.phone,
    this.email,
    required this.walletBalance,
    required this.isVip,
    this.referralCode,
    this.selectedAddress,
    required this.addresses,
  });

  /// Maps the backend `Customer` document onto the shape the app's screens use.
  factory UserProfile.fromCustomerJson(Map<String, dynamic> json) {
    final rawAddresses = (json['addresses'] as List?) ?? const [];
    final addresses = rawAddresses
        .whereType<Map>()
        .map((a) => _normalizeAddress(Map<String, dynamic>.from(a)))
        .toList();

    Map<String, dynamic>? selected;
    for (final a in addresses) {
      if (a['isDefault'] == true) {
        selected = a;
        break;
      }
    }
    selected ??= addresses.isNotEmpty ? addresses.first : null;

    return UserProfile(
      name: (json['name'] as String?)?.trim().isNotEmpty == true
          ? json['name'] as String
          : 'FreshCart Customer',
      phone: (json['phone'] as String?) ?? '',
      email: json['email'] as String?,
      walletBalance: ((json['walletBalance'] as num?) ?? 0).toDouble(),
      isVip: (json['membershipType'] as String?) == 'VIP',
      referralCode: (json['referralCode'] as String?)?.trim().isNotEmpty == true
          ? json['referralCode'] as String
          : null,
      addresses: addresses,
      selectedAddress: selected,
    );
  }

  static Map<String, dynamic> _normalizeAddress(Map<String, dynamic> a) {
    return {
      ...a,
      'id': a['id'] ?? a['_id'] ?? DateTime.now().microsecondsSinceEpoch.toString(),
      'name': a['name'] ?? a['label'] ?? 'Address',
      'addressLine': a['addressLine'] ?? a['fullAddress'] ?? '',
      'latitude': (a['latitude'] ?? a['lat'] ?? 0).toDouble(),
      'longitude': (a['longitude'] ?? a['lng'] ?? 0).toDouble(),
      'isDefault': a['isDefault'] ?? false,
    };
  }

  UserProfile copyWith({
    String? name,
    String? phone,
    String? email,
    double? walletBalance,
    bool? isVip,
    String? referralCode,
    Map<String, dynamic>? selectedAddress,
    List<Map<String, dynamic>>? addresses,
  }) {
    return UserProfile(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      walletBalance: walletBalance ?? this.walletBalance,
      isVip: isVip ?? this.isVip,
      referralCode: referralCode ?? this.referralCode,
      selectedAddress: selectedAddress ?? this.selectedAddress,
      addresses: addresses ?? this.addresses,
    );
  }
}

class AuthState {
  final bool isAuthenticated;
  final bool isOnboardingCompleted;
  final bool locationPermissionGranted;
  final UserProfile? user;
  final bool isLoading;
  final String? error;

  /// True while the initial token -> profile hydration is still running.
  final bool isHydrating;

  /// OTP send diagnostics (test mode fills [otpDevCode]).
  final bool otpTestMode;
  final String? otpDevCode;

  AuthState({
    required this.isAuthenticated,
    required this.isOnboardingCompleted,
    required this.locationPermissionGranted,
    this.user,
    this.isLoading = false,
    this.error,
    this.isHydrating = false,
    this.otpTestMode = false,
    this.otpDevCode,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isOnboardingCompleted,
    bool? locationPermissionGranted,
    UserProfile? user,
    bool clearUser = false,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool? isHydrating,
    bool? otpTestMode,
    String? otpDevCode,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isOnboardingCompleted: isOnboardingCompleted ?? this.isOnboardingCompleted,
      locationPermissionGranted:
          locationPermissionGranted ?? this.locationPermissionGranted,
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      isHydrating: isHydrating ?? this.isHydrating,
      otpTestMode: otpTestMode ?? this.otpTestMode,
      otpDevCode: otpDevCode ?? this.otpDevCode,
    );
  }
}

/// The push service is optional in tests (getIt may not have it registered).
PushService? get _push => getIt.isRegistered<PushService>() ? getIt<PushService>() : null;

class AuthNotifier extends StateNotifier<AuthState> {
  final StorageService _storage;
  final ApiService _api;
  final TokenStore _tokenStore;

  AuthNotifier(this._storage, this._api, this._tokenStore)
      : super(AuthState(
          isAuthenticated: _tokenStore.hasToken,
          isOnboardingCompleted: _storage.isOnboardingCompleted,
          locationPermissionGranted: true,
          isHydrating: _tokenStore.hasToken,
        )) {
    // Any 401 on an authenticated call logs the user out.
    _api.onUnauthorized = _forceLogout;
    if (_tokenStore.hasToken) {
      _hydrate();
    }
  }

  Future<void>? _hydrateFuture;

  /// Completes once the initial profile load (if any) has finished — used by the
  /// splash screen so it routes on real state.
  Future<void> ensureHydrated() => _hydrateFuture ?? Future.value();

  Future<void> _hydrate() {
    return _hydrateFuture ??= () async {
      try {
        final customer = await _api.fetchMe();
        state = state.copyWith(
          isAuthenticated: true,
          isHydrating: false,
          user: UserProfile.fromCustomerJson(customer),
        );
        _push?.registerCurrentToken();
      } on ApiException catch (e) {
        if (e.isUnauthorized) {
          await _tokenStore.clear();
          state = state.copyWith(
            isAuthenticated: false,
            isHydrating: false,
            clearUser: true,
          );
        } else {
          // Network/other error: keep the session, drop the spinner. A retry
          // happens on the next authenticated screen.
          state = state.copyWith(isHydrating: false);
        }
      } finally {
        _hydrateFuture = null;
      }
    }();
  }

  void completeOnboarding() {
    _storage.completeOnboarding();
    state = state.copyWith(isOnboardingCompleted: true);
  }

  /// Requests an OTP for [phone]. Returns true on success.
  Future<bool> sendOtp(String phone) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _api.sendOtp(_digits(phone));
      state = state.copyWith(
        isLoading: false,
        otpTestMode: res['testMode'] == true,
        otpDevCode: res['devCode'] as String?,
      );
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    }
  }

  Future<bool> resendOtp(String phone) => sendOtp(phone);

  /// Verifies [code] for [phone]. On success stores the token and loads the
  /// profile. Returns true on success.
  Future<bool> verifyOtp(String phone, String code) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _api.verifyOtp(_digits(phone), code.trim());
      final token = res['token'] as String?;
      if (token == null || token.isEmpty) {
        state = state.copyWith(isLoading: false, error: 'Verification failed. Please try again.');
        return false;
      }
      await _tokenStore.save(token);
      final customer = Map<String, dynamic>.from(res['customer'] as Map);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        isHydrating: false,
        user: UserProfile.fromCustomerJson(customer),
      );
      _push?.registerCurrentToken();
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    }
  }

  Future<void> refreshProfile() async {
    if (!_tokenStore.hasToken) return;
    try {
      final customer = await _api.fetchMe();
      state = state.copyWith(user: UserProfile.fromCustomerJson(customer));
    } on ApiException {
      /* keep current profile */
    }
  }

  void grantLocationPermission() {
    state = state.copyWith(locationPermissionGranted: true);
  }

  void selectAddress(String addressId) {
    final u = state.user;
    if (u == null) return;
    final address = u.addresses.firstWhere(
      (a) => a['id'] == addressId,
      orElse: () => u.addresses.isNotEmpty ? u.addresses.first : <String, dynamic>{},
    );
    if (address.isEmpty) return;
    state = state.copyWith(user: u.copyWith(selectedAddress: address));
  }

  /// Local-only insert (used as an offline fallback during first-run location
  /// setup). Prefer [addAddressRemote] everywhere else.
  void addAddress(Map<String, dynamic> newAddress) {
    final u = state.user;
    if (u == null) return;
    final list = List<Map<String, dynamic>>.from(u.addresses)..add(newAddress);
    state = state.copyWith(
      user: u.copyWith(addresses: list, selectedAddress: newAddress),
    );
  }

  /// Persists a new address via `POST /customers/me/addresses`, then re-hydrates
  /// the profile from the server and selects the new address. Throws on failure.
  Future<void> addAddressRemote(Map<String, dynamic> body) async {
    await _api.addAddress(body);
    final customer = await _api.fetchMe();
    final profile = UserProfile.fromCustomerJson(customer);
    // The freshly-added address is the newest one server-side.
    final selected = profile.addresses.isNotEmpty ? profile.addresses.last : null;
    state = state.copyWith(
      user: profile.copyWith(selectedAddress: selected ?? profile.selectedAddress),
    );
  }

  /// Deletes a saved address via the real API, then re-hydrates. Throws on failure.
  Future<void> removeAddress(String addressId) async {
    await _api.deleteAddress(addressId);
    final customer = await _api.fetchMe();
    state = state.copyWith(user: UserProfile.fromCustomerJson(customer));
  }

  /// Updates name / email via `PUT /customers/me/profile`. Throws on failure.
  Future<void> updateProfile({String? name, String? email}) async {
    final customer = await _api.updateMyProfile(name: name, email: email);
    state = state.copyWith(user: UserProfile.fromCustomerJson(customer));
  }

  void deductWallet(double amount) {
    final u = state.user;
    if (u == null) return;
    state = state.copyWith(
      user: u.copyWith(walletBalance: (u.walletBalance - amount).clamp(0, double.infinity)),
    );
  }

  /// Set the wallet balance to a server-authoritative value.
  void setWalletBalance(double balance) {
    final u = state.user;
    if (u == null) return;
    state = state.copyWith(user: u.copyWith(walletBalance: balance));
  }

  /// Permanently deletes the signed-in customer's account server-side, then
  /// clears the local session (same teardown as [logout]). Throws [ApiException]
  /// if the server call fails — the local session is left intact so the user can
  /// retry.
  Future<void> deleteAccount() async {
    await _api.deleteAccount();
    await logout();
  }

  Future<void> logout() async {
    try {
      await _push?.unregister();
    } catch (_) {/* best effort */}
    await _tokenStore.clear();
    // Clear per-user local caches so the next sign-in starts clean. Never let a
    // storage hiccup block the logout itself.
    try {
      await _storage.clearAll(); // cart + favourites
      await _storage.clearRecentSearches();
    } catch (_) {/* best effort */}
    state = AuthState(
      isAuthenticated: false,
      isOnboardingCompleted: true,
      locationPermissionGranted: state.locationPermissionGranted,
    );
  }

  void _forceLogout() {
    if (!mounted) return;
    _tokenStore.clear();
    state = AuthState(
      isAuthenticated: false,
      isOnboardingCompleted: true,
      locationPermissionGranted: state.locationPermissionGranted,
      error: 'Your session expired. Please sign in again.',
    );
  }

  String _digits(String s) => s.replaceAll(RegExp(r'\D'), '');
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    getIt<StorageService>(),
    getIt<ApiService>(),
    getIt<TokenStore>(),
  );
});
