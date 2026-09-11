import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Visible back arrow for a bottom-nav tab root (Categories/Orders/Account),
/// which has no natural Navigator history to pop — the hardware back
/// gesture already routes to Home first via [MainScaffold]'s `PopScope`;
/// this just gives that same behavior a tappable, always-visible affordance
/// in the AppBar, mirroring the delivery-partner app's `TabBackButton`.
class TabBackButton extends StatelessWidget {
  const TabBackButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: () => context.go('/'),
      icon: const Icon(Icons.arrow_back_rounded),
      tooltip: 'Home',
    );
  }
}
