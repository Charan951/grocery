import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Visible back arrow for a bottom-nav tab root (Orders/Earnings/Profile),
/// which has no natural Navigator history to pop. Tapping it always
/// returns to Home, mirroring the hardware-back/swipe behavior in
/// [MainShell]'s `PopScope`.
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
