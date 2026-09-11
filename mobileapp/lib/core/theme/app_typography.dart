import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ============================================================
/// FRESHCART — PREMIUM TYPOGRAPHY & VISUAL LANGUAGE SYSTEM
/// ============================================================
///
/// Primary Brand & Display: MANROPE (300, 400, 500, 600, 700, 800)
/// Secondary UI & Content: INTER (400, 500, 600, 700)
///
/// Scale tokens: 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 40
/// Tabular numerical presentation enabled on all prices & numeric styles.
class AppTypography {
  AppTypography._();

  // ------------------------------------------------------------
  // CORE FONT ENGINES
  // ------------------------------------------------------------

  /// Primary display font — Manrope
  static TextStyle manrope({
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    double letterSpacing = 0.0,
    required Color color,
    List<FontFeature>? fontFeatures,
    TextDecoration? decoration,
  }) =>
      GoogleFonts.manrope(
        fontSize: fontSize,
        fontWeight: fontWeight,
        height: height,
        letterSpacing: letterSpacing,
        color: color,
        fontFeatures: fontFeatures,
        decoration: decoration,
      );

  /// Secondary UI & content font — Inter
  static TextStyle inter({
    required double fontSize,
    required FontWeight fontWeight,
    required double height,
    double letterSpacing = 0.0,
    required Color color,
    List<FontFeature>? fontFeatures,
    TextDecoration? decoration,
  }) =>
      GoogleFonts.inter(
        fontSize: fontSize,
        fontWeight: fontWeight,
        height: height,
        letterSpacing: letterSpacing,
        color: color,
        fontFeatures: fontFeatures,
        decoration: decoration,
      );

  // Tabular figures feature for numbers & currency
  static const List<FontFeature> tabularNums = [FontFeature.tabularFigures()];

  // ------------------------------------------------------------
  // SECTION 4: FONT HIERARCHY — DISPLAY STYLES
  // ------------------------------------------------------------

  /// Display Large: 40px, Weight 800, Line Height 48px (1.20), Letter Spacing -1.0
  static TextStyle displayLarge(Color color) => manrope(
        fontSize: 40.0,
        fontWeight: FontWeight.w800,
        height: 48.0 / 40.0,
        letterSpacing: -1.0,
        color: color,
      );

  /// Display Medium: 36px, Weight 800, Line Height 44px (1.22), Letter Spacing -0.8
  static TextStyle displayMedium(Color color) => manrope(
        fontSize: 36.0,
        fontWeight: FontWeight.w800,
        height: 44.0 / 36.0,
        letterSpacing: -0.8,
        color: color,
      );

  /// Display Small: 32px, Weight 700, Line Height 40px (1.25), Letter Spacing -0.6
  static TextStyle displaySmall(Color color) => manrope(
        fontSize: 32.0,
        fontWeight: FontWeight.w700,
        height: 40.0 / 32.0,
        letterSpacing: -0.6,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 4: PAGE HEADINGS
  // ------------------------------------------------------------

  /// H1: 28px, Weight 700, Line Height 36px (1.28), Letter Spacing -0.5
  static TextStyle headlineLarge(Color color) => manrope(
        fontSize: 28.0,
        fontWeight: FontWeight.w700,
        height: 36.0 / 28.0,
        letterSpacing: -0.5,
        color: color,
      );

  /// H2: 24px, Weight 700, Line Height 32px (1.33), Letter Spacing -0.3
  static TextStyle headlineMedium(Color color) => manrope(
        fontSize: 24.0,
        fontWeight: FontWeight.w700,
        height: 32.0 / 24.0,
        letterSpacing: -0.3,
        color: color,
      );

  /// H3: 20px, Weight 700, Line Height 28px (1.40), Letter Spacing -0.2
  static TextStyle headlineSmall(Color color) => manrope(
        fontSize: 20.0,
        fontWeight: FontWeight.w700,
        height: 28.0 / 20.0,
        letterSpacing: -0.2,
        color: color,
      );

  /// H4: 18px, Weight 600, Line Height 24px (1.33), Letter Spacing -0.1
  static TextStyle headlineH4(Color color) => manrope(
        fontSize: 18.0,
        fontWeight: FontWeight.w600,
        height: 24.0 / 18.0,
        letterSpacing: -0.1,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 4: SECTION TYPOGRAPHY
  // ------------------------------------------------------------

  /// Section Large: 20px, Weight 700, Line Height 28px
  static TextStyle sectionLarge(Color color) => headlineSmall(color);

  /// Section Medium: 18px, Weight 600, Line Height 24px
  static TextStyle sectionMedium(Color color) => headlineH4(color);

  /// Section Small: 16px, Weight 600, Line Height 22px
  static TextStyle sectionSmall(Color color) => manrope(
        fontSize: 16.0,
        fontWeight: FontWeight.w600,
        height: 22.0 / 16.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 4: BODY TYPOGRAPHY (Inter)
  // ------------------------------------------------------------

  /// Body Large: 17px, Weight 400, Line Height 26px (1.53)
  static TextStyle bodyLarge(Color color) => inter(
        fontSize: 17.0,
        fontWeight: FontWeight.w400,
        height: 26.0 / 17.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Body Medium: 15px, Weight 400, Line Height 23px (1.53)
  static TextStyle bodyMedium(Color color) => inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w400,
        height: 23.0 / 15.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Body Small: 14px, Weight 400, Line Height 20px (1.43)
  static TextStyle bodySmall(Color color) => inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        height: 20.0 / 14.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 4: UI TYPOGRAPHY (Inter / Manrope)
  // ------------------------------------------------------------

  /// Label Large: 15px, Weight 600, Line Height 20px (1.33)
  static TextStyle labelLarge(Color color) => inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w600,
        height: 20.0 / 15.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Label Medium: 14px, Weight 600, Line Height 18px (1.28)
  static TextStyle labelMedium(Color color) => inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 14.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Label Small: 12px, Weight 600, Line Height 16px (1.33)
  static TextStyle labelSmall(Color color) => inter(
        fontSize: 12.0,
        fontWeight: FontWeight.w600,
        height: 16.0 / 12.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 4: CAPTION
  // ------------------------------------------------------------

  /// Caption Large: 13px, Weight 500, Line Height 18px (1.38)
  static TextStyle captionLarge(Color color) => inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 13.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Caption Small: 11px, Weight 500, Line Height 14px (1.27)
  static TextStyle captionSmall(Color color) => inter(
        fontSize: 11.0,
        fontWeight: FontWeight.w500,
        height: 14.0 / 11.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 5: PRODUCT TYPOGRAPHY
  // ------------------------------------------------------------

  /// Product Name: 16px, SemiBold (w600), Line Height 22px
  static TextStyle productTitle(Color color) => manrope(
        fontSize: 16.0,
        fontWeight: FontWeight.w600,
        height: 22.0 / 16.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Product Brand: 12px, Medium (w500), Line Height 16px
  static TextStyle productBrand(Color color) => inter(
        fontSize: 12.0,
        fontWeight: FontWeight.w500,
        height: 16.0 / 12.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Product Weight: 13px, Regular (w400), Line Height 18px
  static TextStyle productWeight(Color color) => inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w400,
        height: 18.0 / 13.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Product Rating: 13px, SemiBold (w600), Line Height 18px
  static TextStyle productRating(Color color) => manrope(
        fontSize: 13.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 13.0,
        letterSpacing: 0.0,
        color: color,
        fontFeatures: tabularNums,
      );

  /// Product Card CTA: 13px, SemiBold (w600), Line Height 18px
  static TextStyle productCardCTA(Color color) => manrope(
        fontSize: 13.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 13.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 6 & 7: PRICE TYPOGRAPHY (Tabular Figures)
  // ------------------------------------------------------------

  /// Current Price: 20px, Bold (w700), Line Height 24px, Tabular
  static TextStyle priceMedium(Color color) => manrope(
        fontSize: 20.0,
        fontWeight: FontWeight.w700,
        height: 24.0 / 20.0,
        letterSpacing: -0.3,
        color: color,
        fontFeatures: tabularNums,
      );

  /// Featured / Large Price: 24px, Bold (w700), Line Height 28px, Tabular
  static TextStyle priceLarge(Color color) => manrope(
        fontSize: 24.0,
        fontWeight: FontWeight.w700,
        height: 28.0 / 24.0,
        letterSpacing: -0.4,
        color: color,
        fontFeatures: tabularNums,
      );

  /// Product Card Price: 18px, Bold (w700), Line Height 24px, Tabular
  static TextStyle productPrice(Color color) => manrope(
        fontSize: 18.0,
        fontWeight: FontWeight.w700,
        height: 24.0 / 18.0,
        letterSpacing: -0.2,
        color: color,
        fontFeatures: tabularNums,
      );

  /// Product MRP: 13px, Regular/Medium, Line Height 18px, Strikethrough
  static TextStyle productMRP(Color color) => inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 13.0,
        letterSpacing: 0.0,
        color: color,
        decoration: TextDecoration.lineThrough,
        fontFeatures: tabularNums,
      );

  /// Discount Tag: 12px, SemiBold (w600), Line Height 16px
  static TextStyle priceDiscount(Color color) => manrope(
        fontSize: 12.0,
        fontWeight: FontWeight.w600,
        height: 16.0 / 12.0,
        letterSpacing: 0.0,
        color: color,
        fontFeatures: tabularNums,
      );

  /// Checkout Total Amount: 28px, Bold (w700), Line Height 34px, Tabular
  static TextStyle priceTotalAmount(Color color) => manrope(
        fontSize: 28.0,
        fontWeight: FontWeight.w700,
        height: 34.0 / 28.0,
        letterSpacing: -0.5,
        color: color,
        fontFeatures: tabularNums,
      );

  // ------------------------------------------------------------
  // SECTION 8: BUTTON TYPOGRAPHY
  // ------------------------------------------------------------

  /// Primary CTA: 15px, SemiBold (w600), Line Height 20px
  static TextStyle buttonPrimaryCTA(Color color) => manrope(
        fontSize: 15.0,
        fontWeight: FontWeight.w600,
        height: 20.0 / 15.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Secondary CTA: 15px, SemiBold (w600), Line Height 20px
  static TextStyle buttonSecondaryCTA(Color color) => manrope(
        fontSize: 15.0,
        fontWeight: FontWeight.w600,
        height: 20.0 / 15.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Text Button: 14px, SemiBold (w600), Line Height 18px
  static TextStyle buttonText(Color color) => manrope(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 14.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Small CTA: 13px, SemiBold (w600), Line Height 18px
  static TextStyle buttonSmallCTA(Color color) => manrope(
        fontSize: 13.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 13.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // SECTION 9: NAVIGATION TYPOGRAPHY
  // ------------------------------------------------------------

  /// Bottom Navigation (Inactive): 12px, Medium (w500)
  static TextStyle navBottom(Color color) => manrope(
        fontSize: 12.0,
        fontWeight: FontWeight.w500,
        height: 16.0 / 12.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Active Navigation: 12px, SemiBold (w600)
  static TextStyle navActiveBottom(Color color) => manrope(
        fontSize: 12.0,
        fontWeight: FontWeight.w600,
        height: 16.0 / 12.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Top Navigation Title: 17px, SemiBold (w600)
  static TextStyle navTopTitle(Color color) => manrope(
        fontSize: 17.0,
        fontWeight: FontWeight.w600,
        height: 22.0 / 17.0,
        letterSpacing: -0.2,
        color: color,
      );

  /// Tab: 14px, Medium (w500)
  static TextStyle navTab(Color color) => manrope(
        fontSize: 14.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 14.0,
        letterSpacing: 0.0,
        color: color,
      );

  /// Active Tab: 14px, SemiBold (w600)
  static TextStyle navActiveTab(Color color) => manrope(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 14.0,
        letterSpacing: 0.0,
        color: color,
      );

  // ------------------------------------------------------------
  // BACKWARD-COMPATIBILITY ALIASES (Preserves 100+ existing call sites)
  // ------------------------------------------------------------

  static TextStyle display(Color color) => displaySmall(color);
  static TextStyle h1(Color color) => headlineLarge(color);
  static TextStyle h2(Color color) => headlineMedium(color);
  static TextStyle h3(Color color) => headlineSmall(color);
  static TextStyle h4(Color color) => headlineH4(color);
  static TextStyle title(Color color) => productTitle(color);
  static TextStyle titleLarge(Color color) => sectionLarge(color);
  static TextStyle titleMedium(Color color) => sectionMedium(color);
  static TextStyle caption(Color color) => captionLarge(color);

  // ------------------------------------------------------------
  // SECTION 26: NAMESPACED STYLE CLASSES ARCHITECTURE
  // ------------------------------------------------------------

  static const displayStyles = DisplayStyles._();
  static const headingStyles = HeadingStyles._();
  static const sectionStyles = SectionStyles._();
  static const bodyStyles = BodyStyles._();
  static const labelStyles = LabelStyles._();
  static const captionStyles = CaptionStyles._();
  static const priceStyles = PriceStyles._();
  static const largePriceStyles = LargePriceStyles._();
  static const buttonStyles = ButtonStyles._();
  static const navigationStyles = NavigationStyles._();
  static const searchStyles = SearchStyles._();
  static const offerStyles = OfferStyles._();
  static const deliveryStyles = DeliveryStyles._();
  static const formStyles = FormStyles._();
  static const profileStyles = ProfileStyles._();
  static const productStyles = ProductStyles._();

  // ------------------------------------------------------------
  // CALLIGRAPHY PRESETS FOR FESTIVAL HEROES
  // ------------------------------------------------------------
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

// ============================================================
// NAMESPACED STYLE CLASSES (FLUTTER TYPOGRAPHY ARCHITECTURE)
// ============================================================

class DisplayStyles {
  const DisplayStyles._();
  TextStyle large(Color color) => AppTypography.displayLarge(color);
  TextStyle medium(Color color) => AppTypography.displayMedium(color);
  TextStyle small(Color color) => AppTypography.displaySmall(color);
}

class HeadingStyles {
  const HeadingStyles._();
  TextStyle h1(Color color) => AppTypography.headlineLarge(color);
  TextStyle h2(Color color) => AppTypography.headlineMedium(color);
  TextStyle h3(Color color) => AppTypography.headlineSmall(color);
  TextStyle h4(Color color) => AppTypography.headlineH4(color);
}

class SectionStyles {
  const SectionStyles._();
  TextStyle large(Color color) => AppTypography.sectionLarge(color);
  TextStyle medium(Color color) => AppTypography.sectionMedium(color);
  TextStyle small(Color color) => AppTypography.sectionSmall(color);
}

class BodyStyles {
  const BodyStyles._();
  TextStyle large(Color color) => AppTypography.bodyLarge(color);
  TextStyle medium(Color color) => AppTypography.bodyMedium(color);
  TextStyle small(Color color) => AppTypography.bodySmall(color);
}

class LabelStyles {
  const LabelStyles._();
  TextStyle large(Color color) => AppTypography.labelLarge(color);
  TextStyle medium(Color color) => AppTypography.labelMedium(color);
  TextStyle small(Color color) => AppTypography.labelSmall(color);
}

class CaptionStyles {
  const CaptionStyles._();
  TextStyle large(Color color) => AppTypography.captionLarge(color);
  TextStyle small(Color color) => AppTypography.captionSmall(color);
}

class PriceStyles {
  const PriceStyles._();
  TextStyle current(Color color) => AppTypography.priceMedium(color);
  TextStyle featured(Color color) => AppTypography.priceLarge(color);
  TextStyle mrp(Color color) => AppTypography.productMRP(color);
  TextStyle discount(Color color) => AppTypography.priceDiscount(color);
}

class LargePriceStyles {
  const LargePriceStyles._();
  TextStyle total(Color color) => AppTypography.priceTotalAmount(color);
  TextStyle subtotal(Color color) => AppTypography.inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w500,
        height: 22.0 / 15.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle discount(Color color) => AppTypography.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w500,
        height: 20.0 / 14.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle deliveryFee(Color color) => AppTypography.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        height: 20.0 / 14.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle tax(Color color) => AppTypography.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        height: 20.0 / 14.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle savings(Color color) => AppTypography.manrope(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        height: 20.0 / 14.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
}

class ButtonStyles {
  const ButtonStyles._();
  TextStyle primaryCTA(Color color) => AppTypography.buttonPrimaryCTA(color);
  TextStyle secondaryCTA(Color color) => AppTypography.buttonSecondaryCTA(color);
  TextStyle textButton(Color color) => AppTypography.buttonText(color);
  TextStyle smallCTA(Color color) => AppTypography.buttonSmallCTA(color);
}

class NavigationStyles {
  const NavigationStyles._();
  TextStyle bottomNav(Color color) => AppTypography.navBottom(color);
  TextStyle activeBottomNav(Color color) => AppTypography.navActiveBottom(color);
  TextStyle topNavTitle(Color color) => AppTypography.navTopTitle(color);
  TextStyle tab(Color color) => AppTypography.navTab(color);
  TextStyle activeTab(Color color) => AppTypography.navActiveTab(color);
}

class SearchStyles {
  const SearchStyles._();
  TextStyle placeholder(Color color) => AppTypography.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        height: 20.0 / 14.0,
        color: color,
      );
  TextStyle input(Color color) => AppTypography.inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w400,
        height: 22.0 / 15.0,
        color: color,
      );
  TextStyle suggestion(Color color) => AppTypography.inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w500,
        height: 22.0 / 15.0,
        color: color,
      );
  TextStyle category(Color color) => AppTypography.inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 13.0,
        color: color,
      );
}

class OfferStyles {
  const OfferStyles._();
  TextStyle heading(Color color) => AppTypography.manrope(
        fontSize: 20.0,
        fontWeight: FontWeight.w700,
        height: 26.0 / 20.0,
        letterSpacing: -0.2,
        color: color,
      );
  TextStyle supportingText(Color color) => AppTypography.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w500,
        height: 20.0 / 14.0,
        color: color,
      );
  TextStyle discount(Color color) => AppTypography.manrope(
        fontSize: 26.0,
        fontWeight: FontWeight.w800,
        height: 32.0 / 26.0,
        letterSpacing: -0.5,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle cta(Color color) => AppTypography.manrope(
        fontSize: 14.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 14.0,
        color: color,
      );
}

class DeliveryStyles {
  const DeliveryStyles._();
  TextStyle orderId(Color color) => AppTypography.manrope(
        fontSize: 13.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 13.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle orderStatus(Color color) => AppTypography.manrope(
        fontSize: 13.0,
        fontWeight: FontWeight.w600,
        height: 18.0 / 13.0,
        color: color,
      );
  TextStyle eta(Color color) => AppTypography.manrope(
        fontSize: 18.0,
        fontWeight: FontWeight.w700,
        height: 24.0 / 18.0,
        letterSpacing: -0.2,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle deliveryTime(Color color) => AppTypography.manrope(
        fontSize: 16.0,
        fontWeight: FontWeight.w600,
        height: 22.0 / 16.0,
        color: color,
        fontFeatures: AppTypography.tabularNums,
      );
  TextStyle driverName(Color color) => AppTypography.manrope(
        fontSize: 16.0,
        fontWeight: FontWeight.w600,
        height: 22.0 / 16.0,
        color: color,
      );
  TextStyle trackingInfo(Color color) => AppTypography.inter(
        fontSize: 14.0,
        fontWeight: FontWeight.w400,
        height: 20.0 / 14.0,
        color: color,
      );
}

class FormStyles {
  const FormStyles._();
  TextStyle inputLabel(Color color) => AppTypography.inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 13.0,
        color: color,
      );
  TextStyle inputText(Color color) => AppTypography.inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w400,
        height: 22.0 / 15.0,
        color: color,
      );
  TextStyle placeholder(Color color) => AppTypography.inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w400,
        height: 22.0 / 15.0,
        color: color,
      );
  TextStyle helperText(Color color) => AppTypography.inter(
        fontSize: 12.0,
        fontWeight: FontWeight.w400,
        height: 16.0 / 12.0,
        color: color,
      );
  TextStyle errorText(Color color) => AppTypography.inter(
        fontSize: 12.0,
        fontWeight: FontWeight.w500,
        height: 16.0 / 12.0,
        color: color,
      );
  TextStyle sectionHeading(Color color) => AppTypography.manrope(
        fontSize: 18.0,
        fontWeight: FontWeight.w600,
        height: 24.0 / 18.0,
        letterSpacing: -0.1,
        color: color,
      );
}

class ProfileStyles {
  const ProfileStyles._();
  TextStyle profileName(Color color) => AppTypography.manrope(
        fontSize: 22.0,
        fontWeight: FontWeight.w700,
        height: 28.0 / 22.0,
        letterSpacing: -0.3,
        color: color,
      );
  TextStyle membership(Color color) => AppTypography.manrope(
        fontSize: 13.0,
        fontWeight: FontWeight.w500,
        height: 18.0 / 13.0,
        color: color,
      );
  TextStyle menuItem(Color color) => AppTypography.inter(
        fontSize: 15.0,
        fontWeight: FontWeight.w500,
        height: 22.0 / 15.0,
        color: color,
      );
  TextStyle supportingText(Color color) => AppTypography.inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w400,
        height: 18.0 / 13.0,
        color: color,
      );
}

class ProductStyles {
  const ProductStyles._();
  TextStyle name(Color color) => AppTypography.productTitle(color);
  TextStyle brand(Color color) => AppTypography.productBrand(color);
  TextStyle weight(Color color) => AppTypography.productWeight(color);
  TextStyle rating(Color color) => AppTypography.productRating(color);
  TextStyle price(Color color) => AppTypography.productPrice(color);
  TextStyle mrp(Color color) => AppTypography.productMRP(color);
  TextStyle discount(Color color) => AppTypography.priceDiscount(color);
  TextStyle cta(Color color) => AppTypography.productCardCTA(color);
}
