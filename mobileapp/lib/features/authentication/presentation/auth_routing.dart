import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

/// Shared post-login destination — used by the OTP, password and register
/// screens so every sign-in path lands on Home, never back on whichever tab
/// (e.g. Account) the login flow was pushed from. HomeScreen's own
/// `_maybeAskLocation()` prompts for location/address in place, same as for a
/// guest, so there's no separate location-setup detour.
///
/// Navigates on the next frame: signing in flips the router's
/// `refreshListenable`, and a synchronous `go` alongside that redirect pass can
/// race go_router's route-match bookkeeping (see LoginScreen._continueAsGuest).
void routeAfterLogin(BuildContext context, AuthState state) {
  final router = GoRouter.of(context);
  WidgetsBinding.instance.addPostFrameCallback((_) => router.go('/'));
}
