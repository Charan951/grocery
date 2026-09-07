import 'package:flutter/material.dart';
import '../../data/models/festival_campaign_model.dart';

class ResolvedFestivalTheme {
  final String key;
  final String emoji;
  final String fontPreset;
  final LinearGradient backgroundGradient;
  final Color backgroundColor;
  final Color cardBackground;
  final Color cardBorder;
  final Color accentColor;
  final Color buttonColor;
  final Color textColor;

  const ResolvedFestivalTheme({
    required this.key,
    required this.emoji,
    required this.fontPreset,
    required this.backgroundGradient,
    required this.backgroundColor,
    required this.cardBackground,
    required this.cardBorder,
    required this.accentColor,
    required this.buttonColor,
    required this.textColor,
  });
}

class FestivalThemeResolver {
  static const Map<String, Map<String, dynamic>> _presets = {
    'krishna': {
      'emoji': '🦚',
      'fontPreset': 'greatVibes',
      'gStart': Color(0xFF8DC9F7), // Soft sky blue at location level (Image 2)
      'gEnd': Color(0xFFD6F0FE),   // Soft light pastel body blue
      'cardBg': Color(0xFF8DC9F7), // Matches location section background color!
      'cardBorder': Color(0xFFBAE6FD),
      'accent': Color(0xFFD97706),
      'btn': Color(0xFF0284C7),
      'text': Color(0xFF0F4C75),
    },
    'ganesh_chaturthi': {
      'emoji': '🌺',
      'fontPreset': 'rozhaOne',
      'gStart': Color(0xFFFCDAA8), // Soft warm peach at location level (Image 3)
      'gEnd': Color(0xFFFEF3E2),   // Soft light warm cream body
      'cardBg': Color(0xFFFCDAA8), // Matches location section background color!
      'cardBorder': Color(0xFFFDE68A),
      'accent': Color(0xFFD97706),
      'btn': Color(0xFFEA580C),
      'text': Color(0xFF68380D),
    },
    'diwali': {
      'emoji': '🪔',
      'fontPreset': 'rozhaOne',
      'gStart': Color(0xFFFCD39D),
      'gEnd': Color(0xFFFEF4E6),
      'cardBg': Color(0xFFFCD39D), // Matches location section background color!
      'cardBorder': Color(0xFFFDE68A),
      'accent': Color(0xFFD97706),
      'btn': Color(0xFFC2410C),
      'text': Color(0xFF663000),
    },
    'onam': {
      'emoji': '🌸',
      'fontPreset': 'cinzelDecorative',
      'gStart': Color(0xFFBBEB9B),
      'gEnd': Color(0xFFEBFADF),
      'cardBg': Color(0xFFBBEB9B), // Matches location section background color!
      'cardBorder': Color(0xFFC0F289),
      'accent': Color(0xFFD97706),
      'btn': Color(0xFF16A34A),
      'text': Color(0xFF1B4D20),
    },
    'raksha_bandhan': {
      'emoji': '🧿',
      'fontPreset': 'satisfy',
      'gStart': Color(0xFFF8A6D2),
      'gEnd': Color(0xFFFCE6F2),
      'cardBg': Color(0xFFF8A6D2), // Matches location section background color!
      'cardBorder': Color(0xFFFBCFE8),
      'accent': Color(0xFFEC4899),
      'btn': Color(0xFF9333EA),
      'text': Color(0xFF701A75),
    },
    'holi': {
      'emoji': '🎨',
      'fontPreset': 'pacifico',
      'gStart': Color(0xFFA5B4FC),
      'gEnd': Color(0xFFE0E7FF),
      'cardBg': Color(0xFFA5B4FC), // Matches location section background color!
      'cardBorder': Color(0xFFC7D2FE),
      'accent': Color(0xFFE11D48),
      'btn': Color(0xFF4F46E5),
      'text': Color(0xFF1E1B4B),
    },
    'navratri': {
      'emoji': '🪷',
      'fontPreset': 'cinzelDecorative',
      'gStart': Color(0xFFD8B4FE),
      'gEnd': Color(0xFFF3E8FF),
      'cardBg': Color(0xFFD8B4FE), // Matches location section background color!
      'cardBorder': Color(0xFFE9D5FF),
      'accent': Color(0xFF9333EA),
      'btn': Color(0xFF7E22CE),
      'text': Color(0xFF4C1D95),
    },
  };

  static ResolvedFestivalTheme resolve(FestivalCampaignModel campaign) {
    final key = campaign.themeKey.toLowerCase();
    final preset = _presets[key] ?? _presets['krishna']!;

    Color gStart = preset['gStart'];
    Color gEnd = preset['gEnd'];
    Color solid = preset['gStart'];

    if (campaign.backgroundType == 'solid') {
      solid = campaign.backgroundColor;
      gStart = solid;
      gEnd = solid;
    } else if (campaign.backgroundType == 'gradient') {
      gStart = campaign.gradientStart;
      gEnd = campaign.gradientEnd;
      solid = gStart;
    }

    final styling = campaign.cardStyling;

    Alignment begin = Alignment.topCenter;
    Alignment end = Alignment.bottomCenter;
    final dir = campaign.gradientDirection.toLowerCase();
    if (dir.contains('diagonal') || dir.contains('top left') || dir.contains('135') || dir.contains('\\')) {
      begin = Alignment.topLeft;
      end = Alignment.bottomRight;
    } else if (dir.contains('right') || dir.contains('horizontal')) {
      begin = Alignment.centerLeft;
      end = Alignment.centerRight;
    }

    final cardBg = gStart;

    return ResolvedFestivalTheme(
      key: key,
      emoji: preset['emoji'],
      fontPreset: preset['fontPreset'] ?? 'greatVibes',
      backgroundGradient: LinearGradient(
        colors: [gStart, gEnd],
        begin: begin,
        end: end,
      ),
      backgroundColor: solid,
      cardBackground: cardBg,
      cardBorder: styling.cardBorder,
      accentColor: styling.accentColor,
      buttonColor: styling.buttonColor,
      textColor: styling.textColor,
    );
  }
}
