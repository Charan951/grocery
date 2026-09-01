import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary brand palette
  static const Color primary = Color(0xFF4CAF50);
  static const Color secondary = Color(0xFF66BB6A);
  static const Color accent = Color(0xFF81C784);

  /// Green for TEXT / ICONS on a light surface. `primary` (#4CAF50) only hits
  /// ~2.8:1 on white; this darker green clears WCAG AA (~4.6:1). Use for links,
  /// inline actions ("See all", "Apply"), and small green labels. Keep
  /// `primary` for fills / large solid shapes.
  static const Color primaryText = Color(0xFF2E7D32);

  // Status indicators
  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFFFB800);
  static const Color error = Color(0xFFE53935);

  /// Amber for TEXT on a light surface (the fill `warning` #FFB800 is ~1.9:1).
  static const Color warningText = Color(0xFF8A5A00);
  /// Red for TEXT / small labels on a light surface.
  static const Color errorText = Color(0xFFC62828);

  // Core background & surfaces (Light Mode)
  static const Color background = Color(0xFFF8FAF7); // warm off-white (DESIGN.md)
  static const Color surface = Color(0xFFFFFFFF);
  static const Color glass = Color(0xFFFFFFFF);      // legacy alias -> solid surface
  static const Color card = Color(0xFFFFFFFF);       // flat: solid white

  // Text colors (Light Mode)
  static const Color textPrimary = Color(0xFF1C1C1E);
  static const Color textSecondary = Color(0xFF7A7A7A);
  static const Color textTertiary = Color(0xFFC7C7CC);

  // Core background & surfaces (Dark Mode)
  static const Color backgroundDark = Color(0xFF121214);
  static const Color surfaceDark = Color(0xFF1C1C1E);
  static const Color glassDark = Color(0xFF1C1C1E); // legacy alias -> solid surface
  static const Color cardDark = Color(0xFF1C1C1E);  // flat: solid

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
