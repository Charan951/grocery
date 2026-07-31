import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/storage_service.dart';

class UserProfile {
  final String name;
  final String phone;
  final String? email;
  final double walletBalance;
  final bool isVip;
  final Map<String, dynamic>? selectedAddress;
  final List<Map<String, dynamic>> addresses;

  UserProfile({
    required this.name,
    required this.phone,
    this.email,
    required this.walletBalance,
    required this.isVip,
    this.selectedAddress,
    required this.addresses,
  });

  UserProfile copyWith({
    String? name,
    String? phone,
    String? email,
    double? walletBalance,
    bool? isVip,
    Map<String, dynamic>? selectedAddress,
    List<Map<String, dynamic>>? addresses,
  }) {
    return UserProfile(
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      walletBalance: walletBalance ?? this.walletBalance,
      isVip: isVip ?? this.isVip,
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

  AuthState({
    required this.isAuthenticated,
    required this.isOnboardingCompleted,
    required this.locationPermissionGranted,
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isOnboardingCompleted,
    bool? locationPermissionGranted,
    UserProfile? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isOnboardingCompleted: isOnboardingCompleted ?? this.isOnboardingCompleted,
      locationPermissionGranted: locationPermissionGranted ?? this.locationPermissionGranted,
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final StorageService _storage;

  AuthNotifier(this._storage)
      : super(AuthState(
          isAuthenticated: true,
          isOnboardingCompleted: true,
          locationPermissionGranted: true,
          user: UserProfile(
            name: 'John Doe',
            phone: '9876543210',
            email: 'john.doe@freshcart.com',
            walletBalance: 250.0,
            isVip: true,
            addresses: const [
              {
                'id': 'addr_1',
                'name': 'Home',
                'addressLine': '123, Green Meadows, Sector 4, HSR Layout, Bengaluru, Karnataka 560102',
                'latitude': 12.9141,
                'longitude': 77.6413,
              }
            ],
            selectedAddress: {
              'id': 'addr_1',
              'name': 'Home',
              'addressLine': '123, Green Meadows, Sector 4, HSR Layout, Bengaluru, Karnataka 560102',
              'latitude': 12.9141,
              'longitude': 77.6413,
            },
          ),
        ));

  void completeOnboarding() {
    _storage.completeOnboarding();
    state = state.copyWith(isOnboardingCompleted: true);
  }

  Future<void> sendOtp(String phone) async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 1500)); // Mock network
    state = state.copyWith(isLoading: false);
  }

  Future<bool> verifyOtp(String phone, String code) async {
    state = state.copyWith(isLoading: true, error: null);
    await Future.delayed(const Duration(milliseconds: 1500)); // Mock validation
    
    final mockUser = UserProfile(
      name: 'John Doe',
      phone: phone,
      email: 'john.doe@freshcart.com',
      walletBalance: 250.0,
      isVip: true,
      addresses: const [],
      selectedAddress: null,
    );

    state = state.copyWith(
      isLoading: false,
      isAuthenticated: true,
      user: mockUser,
    );
    return true;
  }

  void grantLocationPermission() {
    state = state.copyWith(locationPermissionGranted: true);
  }

  void selectAddress(String addressId) {
    if (state.user == null) return;
    final address = state.user!.addresses.firstWhere((a) => a['id'] == addressId);
    state = state.copyWith(
      user: state.user!.copyWith(selectedAddress: address),
    );
  }

  void addAddress(Map<String, dynamic> newAddress) {
    if (state.user == null) return;
    final list = List<Map<String, dynamic>>.from(state.user!.addresses)..add(newAddress);
    state = state.copyWith(
      user: state.user!.copyWith(addresses: list),
    );
  }

  void deductWallet(double amount) {
    if (state.user == null) return;
    state = state.copyWith(
      user: state.user!.copyWith(
        walletBalance: state.user!.walletBalance - amount,
      ),
    );
  }

  void logout() {
    state = AuthState(
      isAuthenticated: false,
      isOnboardingCompleted: true,
      locationPermissionGranted: state.locationPermissionGranted,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(getIt<StorageService>());
});
