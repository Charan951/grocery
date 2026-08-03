import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/routes/app_router.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/core/services/mock_data_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set up dependency injection containers (Hive initialization inside setupInjection)
  await setupInjection();

  // Determine host URL dynamically (Android Emulator loopback 10.0.2.2 vs localhost)
  final String hostUrl = (!kIsWeb && Platform.isAndroid)
      ? "http://10.0.2.2:5000/api"
      : "http://localhost:5000/api";

  // Sync background catalog with live Express server API (using non-blocking async call)
  MockDataService.syncWithServer(hostUrl);

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

    return ScreenUtilInit(
      designSize: const Size(390, 844),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp.router(
          title: 'FreshCart',
          debugShowCheckedModeBanner: false,
          themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          routerConfig: appRouter,
        );
      },
    );
  }
}
