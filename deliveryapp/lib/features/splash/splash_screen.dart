import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    // Run the branding hold and the token -> profile hydration in parallel,
    // then send the partner on: Home if signed in, Login otherwise. A hard cap
    // guarantees we always leave the splash even if hydration stalls.
    await Future.any([
      Future.wait([
        Future.delayed(const Duration(milliseconds: 1400)),
        ref.read(authProvider.notifier).ensureHydrated(),
      ]),
      Future.delayed(const Duration(seconds: 6)),
    ]);
    if (!mounted) return;
    final auth = ref.read(authProvider);
    context.go(auth.isAuthenticated ? '/' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBrand,
      body: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.delivery_dining, size: 64, color: Colors.white),
            SizedBox(height: 16),
            Text('FreshCart Delivery',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
            SizedBox(height: 24),
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
