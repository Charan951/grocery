import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Delivery-partner app theme: the FreshCart "control tower" identity —
/// Rubik display / Nunito Sans body (matching the admin console type
/// scale), deep-forest ink chrome on warm ledger paper, one emerald
/// signal green.

// ── Ink chrome (dark) ────────────────────────────────────────────────────
const kInk = Color(0xFF0F2A1B); // sidebar / slide-control ground
const kInkSoft = Color(0xFF17402A); // hover / active on ink
const kInkLine = Color(0xFF234F35); // hairline on ink

// ── Paper surfaces (light) ───────────────────────────────────────────────
const kPaper = Color(0xFFF7FAF8); // scaffold canvas (matches Home)
const kSurface = Color(0xFFFFFFFF); // cards / sheets
const kLedgerLine = Color(0xFFE4E1D5); // hairline divider on paper
const kText = Color(0xFF171B16); // primary ink text
const kTextMuted = Color(0xFF6E6C5F); // secondary
const kTextFaint = Color(0xFFA6A392); // meta / labels / disabled

// ── Signal colours (functional only) ─────────────────────────────────────
const kGreen = Color(0xFF059669);
const kGreenSoft = Color(0xFFE3F3EC);
const kAmber = Color(0xFFB8860A);
const kAmberSoft = Color(0xFFFBF0D9);
const kRed = Color(0xFFC0392B);
const kRedSoft = Color(0xFFFBE4E1);

/// Legacy aliases so existing screens re-skin without edits.
const kBrand = kGreen;
const kBg = kPaper;

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: kGreen,
    primary: kGreen,
    surface: kSurface,
    error: kRed,
  ).copyWith(surfaceTint: Colors.transparent);

  final display = GoogleFonts.rubik();
  final body = GoogleFonts.nunitoSansTextTheme(
    ThemeData(brightness: Brightness.light).textTheme,
  ).apply(bodyColor: kText, displayColor: kText);

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: kPaper,
    splashFactory: InkSparkle.splashFactory,
    textTheme: body.copyWith(
      headlineSmall: display.copyWith(fontWeight: FontWeight.w700, fontSize: 20, color: kText, letterSpacing: -0.2),
      titleLarge: display.copyWith(fontWeight: FontWeight.w700, fontSize: 17, color: kText, letterSpacing: -0.1),
      titleMedium: display.copyWith(fontWeight: FontWeight.w600, fontSize: 15, color: kText),
      labelLarge: body.labelLarge?.copyWith(fontWeight: FontWeight.w700),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: kSurface,
      surfaceTintColor: kSurface,
      foregroundColor: kText,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: display.copyWith(fontWeight: FontWeight.w700, fontSize: 18, color: kText, letterSpacing: -0.2),
      shape: const Border(bottom: BorderSide(color: kLedgerLine)),
    ),
    cardTheme: CardThemeData(
      color: kSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: kLedgerLine),
      ),
    ),
    dividerTheme: const DividerThemeData(color: kLedgerLine, thickness: 1, space: 1),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kGreen,
        foregroundColor: Colors.white,
        disabledBackgroundColor: kGreen.withValues(alpha: 0.4),
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.nunitoSans(fontWeight: FontWeight.w700, fontSize: 14),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kText,
        minimumSize: const Size.fromHeight(50),
        side: const BorderSide(color: kLedgerLine),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.nunitoSans(fontWeight: FontWeight.w700, fontSize: 14),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: kGreen, textStyle: GoogleFonts.nunitoSans(fontWeight: FontWeight.w600)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kSurface,
      hintStyle: const TextStyle(color: kTextFaint),
      labelStyle: const TextStyle(color: kTextMuted, fontWeight: FontWeight.w600),
      floatingLabelStyle: const TextStyle(color: kGreen, fontWeight: FontWeight.w600),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kLedgerLine),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kLedgerLine),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: kGreen, width: 1.5),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: kTextFaint,
      textColor: kText,
      titleTextStyle: TextStyle(color: kText, fontSize: 14, fontWeight: FontWeight.w600),
      subtitleTextStyle: TextStyle(color: kTextMuted, fontSize: 12.5),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kSurface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: kGreenSoft,
      height: 64,
      elevation: 0,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(size: 22, color: s.contains(WidgetState.selected) ? kGreen : kTextFaint),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => GoogleFonts.nunitoSans(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: s.contains(WidgetState.selected) ? kGreen : kTextFaint,
        ),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: kInk,
      contentTextStyle: GoogleFonts.nunitoSans(color: Colors.white, fontSize: 13),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? Colors.white : kTextFaint,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? kGreen : kLedgerLine,
      ),
      trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
    ),
  );
}
