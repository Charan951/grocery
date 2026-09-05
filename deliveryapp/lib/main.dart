import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/config/app_config.dart';
import 'package:freshcart_delivery/core/routes/app_router.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/firebase_options.dart';

@pragma('vm:entry-point')
Future<void> _fcmBackgroundHandler(RemoteMessage message) async {
  // A data-only wake — nothing to do here; the OS shows the notification and
  // the tap is handled by PushService when the app resumes.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Figure out which of emulator/USB-reverse/LAN-WiFi actually reaches the
  // dev backend before anything builds an API/socket client off of
  // AppConfig's URLs — a no-op in production or with an explicit override.
  await AppConfig.autoDetectDevHost();
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    FirebaseMessaging.onBackgroundMessage(_fcmBackgroundHandler);
  } catch (_) {
    // Firebase not available on this build — push stays disabled, app still runs.
  }
  runApp(const ProviderScope(child: FreshCartDeliveryApp()));
}

class FreshCartDeliveryApp extends ConsumerStatefulWidget {
  const FreshCartDeliveryApp({super.key});
  @override
  ConsumerState<FreshCartDeliveryApp> createState() => _FreshCartDeliveryAppState();
}

class _FreshCartDeliveryAppState extends ConsumerState<FreshCartDeliveryApp> {
  @override
  void initState() {
    super.initState();
    final push = ref.read(pushServiceProvider);
    push.onOfferTapped = (_) {
      // The offer sheet is socket-driven; a push tap just brings the partner to
      // the dashboard where a live offer (if any) is presented.
      ref.read(routerProvider).go('/');
    };
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await push.init();
      if (ref.read(authProvider).isAuthenticated) push.registerCurrentToken();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'FreshCart Delivery',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      routerConfig: router,
    );
  }
}
