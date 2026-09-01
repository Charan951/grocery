import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/routes/app_router.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/core/theme/theme_controller.dart';
import 'package:freshcart/core/widgets/app_toast.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set up dependency injection containers (Hive initialization inside setupInjection)
  await setupInjection();

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
        );
      },
    );
  }
}
