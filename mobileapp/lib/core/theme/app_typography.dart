import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Two registers, matching the web design system (DESIGN.md):
///   - Display / headings  -> Plus Jakarta Sans (strong weight)
///   - Body / titles / labels -> Inter
class AppTypography {
  AppTypography._();

  static TextStyle _display({
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    required double letterSpacing,
    required Color color,
  }) =>
      GoogleFonts.plusJakartaSans(
        fontSize: fontSize,
        fontWeight: fontWeight,
        height: height,
        letterSpacing: letterSpacing,
        color: color,
      );

  static TextStyle _body({
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    required double letterSpacing,
    required Color color,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize,
        fontWeight: fontWeight,
        height: height,
        letterSpacing: letterSpacing,
        color: color,
      );

  // Headings — Plus Jakarta Sans
  static TextStyle display(Color color) => _display(
        fontSize: 32.0, fontWeight: FontWeight.w800, height: 1.15, letterSpacing: -0.5, color: color);

  static TextStyle h1(Color color) => _display(
        fontSize: 26.0, fontWeight: FontWeight.w800, height: 1.2, letterSpacing: -0.4, color: color);

  static TextStyle h2(Color color) => _display(
        fontSize: 21.0, fontWeight: FontWeight.w700, height: 1.3, letterSpacing: -0.2, color: color);

  static TextStyle h3(Color color) => _display(
        fontSize: 18.0, fontWeight: FontWeight.w700, height: 1.35, letterSpacing: -0.1, color: color);

  // Titles / body / labels — Inter
  static TextStyle title(Color color) => _body(
        fontSize: 16.0, fontWeight: FontWeight.w600, height: 1.4, letterSpacing: 0.0, color: color);

  static TextStyle bodyLarge(Color color) => _body(
        fontSize: 16.0, fontWeight: FontWeight.w400, height: 1.45, letterSpacing: -0.1, color: color);

  static TextStyle bodyMedium(Color color) => _body(
        fontSize: 14.0, fontWeight: FontWeight.w400, height: 1.5, letterSpacing: 0.0, color: color);

  static TextStyle bodySmall(Color color) => _body(
        fontSize: 12.5, fontWeight: FontWeight.w400, height: 1.5, letterSpacing: 0.0, color: color);

  static TextStyle labelLarge(Color color) => _body(
        fontSize: 14.0, fontWeight: FontWeight.w600, height: 1.2, letterSpacing: 0.1, color: color);

  static TextStyle labelMedium(Color color) => _body(
        fontSize: 13.0, fontWeight: FontWeight.w600, height: 1.2, letterSpacing: 0.15, color: color);

  static TextStyle labelSmall(Color color) => _body(
        fontSize: 11.0, fontWeight: FontWeight.w600, height: 1.2, letterSpacing: 0.3, color: color);

  /// Calligraphy typography for festival campaign names
  static TextStyle festivalCalligraphy(
    Color color, {
    double fontSize = 30.0,
    FontWeight fontWeight = FontWeight.w700,
    String fontPreset = 'greatVibes',
  }) {
    final baseStyle = TextStyle(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: 1.2,
      shadows: const [
        Shadow(
          color: Color(0x2E000000),
          offset: Offset(0, 2),
          blurRadius: 5,
        ),
      ],
    );

    switch (fontPreset.toLowerCase()) {
      case 'rozhaone':
      case 'diwali':
      case 'ganesh_chaturthi':
        return GoogleFonts.rozhaOne(textStyle: baseStyle.copyWith(fontSize: fontSize < 26 ? 26 : fontSize));
      case 'cinzeldecorative':
      case 'cinzel':
      case 'navratri':
      case 'onam':
        return GoogleFonts.cinzelDecorative(textStyle: baseStyle.copyWith(fontSize: fontSize < 24 ? 24 : fontSize));
      case 'satisfy':
      case 'raksha_bandhan':
        return GoogleFonts.satisfy(textStyle: baseStyle.copyWith(fontSize: fontSize < 28 ? 28 : fontSize));
      case 'kalam':
        return GoogleFonts.kalam(textStyle: baseStyle.copyWith(fontSize: fontSize < 26 ? 26 : fontSize));
      case 'pacifico':
      case 'holi':
        return GoogleFonts.pacifico(textStyle: baseStyle.copyWith(fontSize: fontSize < 26 ? 26 : fontSize));
      case 'greatvibes':
      case 'krishna':
      default:
        return GoogleFonts.greatVibes(textStyle: baseStyle.copyWith(fontSize: fontSize < 32 ? 34 : fontSize + 2));
    }
  }
}
