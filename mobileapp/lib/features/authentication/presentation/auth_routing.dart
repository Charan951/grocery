import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

/// Shared post-login destination logic — used by the OTP, password and
/// register screens so all three sign-in paths land the same way: straight to
/// Home if the customer already has an address, otherwise address/location
/// setup first.
void routeAfterLogin(BuildContext context, AuthState state) {
  final ready = state.user?.selectedAddress != null && state.locationPermissionGranted;
  context.go(ready ? '/' : '/location_select');
}
