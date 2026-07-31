import 'package:flutter/material.dart';

class AppTypography {
  AppTypography._();

  static const String fontName = 'SF Pro Display';
  static const String fallbackFontName = 'Inter';

  static TextStyle getTextStyle({
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    required double letterSpacing,
    required Color color,
  }) {
    return TextStyle(
      fontFamily: fontName,
      fontFamilyFallback: const [fallbackFontName],
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      letterSpacing: letterSpacing,
      color: color,
    );
  }

  // Headings
  static TextStyle display(Color color) => getTextStyle(
        fontSize: 34.0,
        fontWeight: FontWeight.bold,
        height: 1.2,
        letterSpacing: -0.5,
        color: color,
      );

  static TextStyle h1(Color color) => getTextStyle(
        fontSize: 28.0,
        fontWeight: FontWeight.bold,
        height: 1.25,
        letterSpacing: -0.4,
        color: color,
      );

  static TextStyle h2(Color color) => getTextStyle(
        fontSize: 22.0,
        fontWeight: FontWeight.bold,
        height: 1.3,
        letterSpacing: -0.2,
        color: color,
      );

  static TextStyle h3(Color color) => getTextStyle(
        fontSize: 20.0,
        fontWeight: FontWeight.w600,
        height: 1.35,
        letterSpacing: -0.1,
        color: color,
      );

  static TextStyle title(Color color) => getTextStyle(
        fontSize: 17.0,
        fontWeight: FontWeight.w600,
        height: 1.4,
        letterSpacing: 0.0,
        color: color,
      );

  // Body & Subtitles
  static TextStyle bodyLarge(Color color) => getTextStyle(
        fontSize: 17.0,
        fontWeight: FontWeight.normal,
        height: 1.4,
        letterSpacing: -0.2,
        color: color,
      );

  static TextStyle bodyMedium(Color color) => getTextStyle(
        fontSize: 15.0,
        fontWeight: FontWeight.normal,
        height: 1.45,
        letterSpacing: -0.1,
        color: color,
      );

  static TextStyle bodySmall(Color color) => getTextStyle(
        fontSize: 13.0,
        fontWeight: FontWeight.normal,
        height: 1.5,
        letterSpacing: 0.0,
        color: color,
      );

  // Buttons & Badges
  static TextStyle labelLarge(Color color) => getTextStyle(
        fontSize: 15.0,
        fontWeight: FontWeight.w600,
        height: 1.2,
        letterSpacing: 0.1,
        color: color,
      );

  static TextStyle labelMedium(Color color) => getTextStyle(
        fontSize: 13.0,
        fontWeight: FontWeight.w600,
        height: 1.2,
        letterSpacing: 0.2,
        color: color,
      );

  static TextStyle labelSmall(Color color) => getTextStyle(
        fontSize: 11.0,
        fontWeight: FontWeight.w600,
        height: 1.2,
        letterSpacing: 0.3,
        color: color,
      );
}
