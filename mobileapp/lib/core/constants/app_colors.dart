import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary brand palette
  static const Color primary = Color(0xFF4CAF50);
  static const Color secondary = Color(0xFF66BB6A);
  static const Color accent = Color(0xFF81C784);

  // Status indicators
  static const Color success = Color(0xFF34C759);
  static const Color warning = Color(0xFFFFB800);
  static const Color error = Color(0xFFFF3B30);

  // Core background & surfaces (Light Mode)
  static const Color background = Color(0xFFF8FAF7);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color glass = Color(0xB8FFFFFF); // 72% Opacity
  static const Color card = Color(0xF5FFFFFF);  // 96% Opacity

  // Text colors (Light Mode)
  static const Color textPrimary = Color(0xFF1C1C1E);
  static const Color textSecondary = Color(0xFF7A7A7A);
  static const Color textTertiary = Color(0xFFC7C7CC);

  // Core background & surfaces (Dark Mode)
  static const Color backgroundDark = Color(0xFF121214);
  static const Color surfaceDark = Color(0xFF1C1C1E);
  static const Color glassDark = Color(0x991C1C1E); // 60% Opacity
  static const Color cardDark = Color(0xF21C1C1E);  // 95% Opacity

  // Text colors (Dark Mode)
  static const Color textPrimaryDark = Color(0xFFF2F2F7);
  static const Color textSecondaryDark = Color(0xFFAEB2B8);

  // Utility colors
  static const Color divider = Color(0xFFECECEC);
  static const Color dividerDark = Color(0xFF2C2C2E);
  static const Color shadow = Color(0x14000000); // 8% opacity shadow

  // Premium Gradient
  static const Gradient primaryGradient = LinearGradient(
    colors: [primary, accent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const Gradient goldGradient = LinearGradient(
    colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
