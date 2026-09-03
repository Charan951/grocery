import 'package:flutter/material.dart';
import '../../data/models/festival_campaign_model.dart';

class ResolvedFestivalTheme {
  final String key;
  final String emoji;
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
      'gStart': Color(0xFFE0F2FE),
      'gEnd': Color(0xFFCFFAFE),
      'cardBg': Color(0xFFFFFBEB),
      'cardBorder': Color(0xFFBAE6FD),
      'accent': Color(0xFFF59E0B),
      'btn': Color(0xFF0EA5E9),
      'text': Color(0xFF0C4A6E),
    },
    'diwali': {
      'emoji': '🪔',
      'gStart': Color(0xFFFFF7ED),
      'gEnd': Color(0xFFFFEDD5),
      'cardBg': Color(0xFFFEF3C7),
      'cardBorder': Color(0xFFFDBA74),
      'accent': Color(0xFFD97706),
      'btn': Color(0xFFB91C1C),
      'text': Color(0xFF78350F),
    },
    'onam': {
      'emoji': '🌸',
      'gStart': Color(0xFFF7FEE7),
      'gEnd': Color(0xFFECFDF5),
      'cardBg': Color(0xFFFAFAF9),
      'cardBorder': Color(0xFFA3E635),
      'accent': Color(0xFFD97706),
      'btn': Color(0xFF15803D),
      'text': Color(0xFF14532D),
    },
    'raksha_bandhan': {
      'emoji': '🧿',
      'gStart': Color(0xFFFFF1F2),
      'gEnd': Color(0xFFF3E8FF),
      'cardBg': Color(0xFFFFF1F2),
      'cardBorder': Color(0xFFF472B6),
      'accent': Color(0xFFEC4899),
      'btn': Color(0xFF9333EA),
      'text': Color(0xFF701A75),
    },
    'ganesh_chaturthi': {
      'emoji': '🌺',
      'gStart': Color(0xFFFEF3C7),
      'gEnd': Color(0xFFFFEDD5),
      'cardBg': Color(0xFFFFFBEB),
      'cardBorder': Color(0xFFFCD34D),
      'accent': Color(0xFFEA580C),
      'btn': Color(0xFFD97706),
      'text': Color(0xFF7C2D12),
    },
    'holi': {
      'emoji': '🎨',
      'gStart': Color(0xFFFFF1F2),
      'gEnd': Color(0xFFF0FDF4),
      'cardBg': Color(0xFFFFFFFF),
      'cardBorder': Color(0xFFF472B6),
      'accent': Color(0xFFE11D48),
      'btn': Color(0xFF2563EB),
      'text': Color(0xFF1E3A8A),
    },
    'navratri': {
      'emoji': '🪷',
      'gStart': Color(0xFFFEF9C3),
      'gEnd': Color(0xFFFAF5FF),
      'cardBg': Color(0xFFFFFBEB),
      'cardBorder': Color(0xFFE9D5FF),
      'accent': Color(0xFF9333EA),
      'btn': Color(0xFF7E22CE),
      'text': Color(0xFF581C87),
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

    return ResolvedFestivalTheme(
      key: key,
      emoji: preset['emoji'],
      backgroundGradient: LinearGradient(
        colors: [gStart, gEnd],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ),
      backgroundColor: solid,
      cardBackground: styling.cardBackground,
      cardBorder: styling.cardBorder,
      accentColor: styling.accentColor,
      buttonColor: styling.buttonColor,
      textColor: styling.textColor,
    );
  }
}
