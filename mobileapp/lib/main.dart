import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/routes/app_router.dart';
import 'package:freshcart/core/services/push_service.dart';
import 'package:freshcart/firebase_options.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/connectivity_banner.dart';

@pragma('vm:entry-point')
Future<void> _fcmBackgroundHandler(RemoteMessage message) async {
  // Data-only wake — the OS renders the notification; the tap is handled on resume.
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set up dependency injection containers (Hive initialization inside setupInjection)
  await setupInjection();

  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    FirebaseMessaging.onBackgroundMessage(_fcmBackgroundHandler);
    // Fire-and-forget: request permission, read the token, register if signed in.
    unawaited(getIt<PushService>().init());
  } catch (_) {
    // Firebase unavailable on this build — push stays disabled, app still runs.
  }

  runApp(
    const ProviderScope(
      child: FreshCartApp(),
    ),
  );
}

class FreshCartApp extends ConsumerWidget {
  const FreshCartApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDarkMode = ref.watch(themeProvider);
    final router = ref.watch(routerProvider);

    return ScreenUtilInit(
      designSize: const Size(390, 844),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp.router(
          title: 'FreshCart',
          debugShowCheckedModeBanner: false,
          scaffoldMessengerKey: AppToast.messengerKey,
          themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          routerConfig: router,
          builder: (context, child) => ConnectivityBanner(child: child ?? const SizedBox.shrink()),
        );
      },
    );
  }
}
