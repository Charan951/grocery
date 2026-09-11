import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textPrimary,
        onError: Colors.white,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1.0,
        space: 1.0,
      ),
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge(AppColors.textPrimary),
        displayMedium: AppTypography.displayMedium(AppColors.textPrimary),
        displaySmall: AppTypography.displaySmall(AppColors.textPrimary),
        headlineLarge: AppTypography.headlineLarge(AppColors.textPrimary),
        headlineMedium: AppTypography.headlineMedium(AppColors.textPrimary),
        headlineSmall: AppTypography.headlineSmall(AppColors.textPrimary),
        titleLarge: AppTypography.sectionLarge(AppColors.textPrimary),
        titleMedium: AppTypography.sectionMedium(AppColors.textPrimary),
        titleSmall: AppTypography.sectionSmall(AppColors.textPrimary),
        bodyLarge: AppTypography.bodyLarge(AppColors.textPrimary),
        bodyMedium: AppTypography.bodyMedium(AppColors.textPrimary),
        bodySmall: AppTypography.bodySmall(AppColors.textPrimary),
        labelLarge: AppTypography.labelLarge(AppColors.textPrimary),
        labelMedium: AppTypography.labelMedium(AppColors.textPrimary),
        labelSmall: AppTypography.labelSmall(AppColors.textPrimary),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0.0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        // Screen titles share the app's display voice (Manrope),
        // not the platform system font.
        titleTextStyle: AppTypography.h3(AppColors.textPrimary),
      ),
      cardTheme: const CardThemeData(
        color: AppColors.surface,
        elevation: 0.0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16.0)),
          side: BorderSide(color: AppColors.divider, width: 1.0),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surfaceDark,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textPrimaryDark,
        onError: Colors.white,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.dividerDark,
        thickness: 1.0,
        space: 1.0,
      ),
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge(AppColors.textPrimaryDark),
        displayMedium: AppTypography.displayMedium(AppColors.textPrimaryDark),
        displaySmall: AppTypography.displaySmall(AppColors.textPrimaryDark),
        headlineLarge: AppTypography.headlineLarge(AppColors.textPrimaryDark),
        headlineMedium: AppTypography.headlineMedium(AppColors.textPrimaryDark),
        headlineSmall: AppTypography.headlineSmall(AppColors.textPrimaryDark),
        titleLarge: AppTypography.sectionLarge(AppColors.textPrimaryDark),
        titleMedium: AppTypography.sectionMedium(AppColors.textPrimaryDark),
        titleSmall: AppTypography.sectionSmall(AppColors.textPrimaryDark),
        bodyLarge: AppTypography.bodyLarge(AppColors.textPrimaryDark),
        bodyMedium: AppTypography.bodyMedium(AppColors.textPrimaryDark),
        bodySmall: AppTypography.bodySmall(AppColors.textPrimaryDark),
        labelLarge: AppTypography.labelLarge(AppColors.textPrimaryDark),
        labelMedium: AppTypography.labelMedium(AppColors.textPrimaryDark),
        labelSmall: AppTypography.labelSmall(AppColors.textPrimaryDark),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0.0,
        iconTheme: const IconThemeData(color: AppColors.textPrimaryDark),
        titleTextStyle: AppTypography.h3(AppColors.textPrimaryDark),
      ),
      cardTheme: const CardThemeData(
        color: AppColors.surfaceDark,
        elevation: 0.0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16.0)),
          side: BorderSide(color: AppColors.dividerDark, width: 1.0),
        ),
      ),
    );
  }
}
