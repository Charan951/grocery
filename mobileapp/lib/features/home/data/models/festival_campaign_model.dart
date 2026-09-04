import 'package:flutter/material.dart';

class CardStylingModel {
  final Color cardBackground;
  final Color cardBorder;
  final Color accentColor;
  final Color buttonColor;
  final Color textColor;

  const CardStylingModel({
    required this.cardBackground,
    required this.cardBorder,
    required this.accentColor,
    required this.buttonColor,
    required this.textColor,
  });

  factory CardStylingModel.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const CardStylingModel(
        cardBackground: Color(0xFFFFFBEB),
        cardBorder: Color(0xFFBAE6FD),
        accentColor: Color(0xFFF59E0B),
        buttonColor: Color(0xFF0EA5E9),
        textColor: Color(0xFF0C4A6E),
      );
    }
    return CardStylingModel(
      cardBackground: _parseColor(json['cardBackground'], const Color(0xFFFFFBEB)),
      cardBorder: _parseColor(json['cardBorder'], const Color(0xFFBAE6FD)),
      accentColor: _parseColor(json['accentColor'], const Color(0xFFF59E0B)),
      buttonColor: _parseColor(json['buttonColor'], const Color(0xFF0EA5E9)),
      textColor: _parseColor(json['textColor'], const Color(0xFF0C4A6E)),
    );
  }

  static Color _parseColor(dynamic val, Color fallback) {
    if (val is String && val.startsWith('#')) {
      final buffer = StringBuffer();
      if (val.length == 7 || val.length == 9) {
        buffer.write(val.replaceFirst('#', val.length == 7 ? 'ff' : ''));
        try {
          return Color(int.parse(buffer.toString(), radix: 16));
        } catch (_) {}
      }
    }
    return fallback;
  }
}

class FestivalGroupModel {
  final String id;
  final String displayName;
  final String? imageUrl;
  final List<String> products;
  final double discountPercent;
  final int displayOrder;
  final bool isActive;

  const FestivalGroupModel({
    required this.id,
    required this.displayName,
    this.imageUrl,
    required this.products,
    required this.discountPercent,
    required this.displayOrder,
    required this.isActive,
  });

  factory FestivalGroupModel.fromJson(Map<String, dynamic> json) {
    final rawProds = json['products'];
    final prodList = (rawProds is List)
        ? rawProds.map((e) => e.toString()).toList()
        : <String>[];

    final img = (json['imageUrl'] ?? json['image'] ?? json['bannerImage'] ?? '').toString();

    return FestivalGroupModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      displayName: (json['displayName'] ?? json['title'] ?? '').toString(),
      imageUrl: img.isNotEmpty ? img : null,
      products: prodList,
      discountPercent: (json['discountPercent'] as num?)?.toDouble() ?? 0.0,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 1,
      isActive: (json['isActive'] as bool?) ?? true,
    );
  }
}

class FestivalCampaignModel {
  final String id;
  final String name;
  final DateTime? startDate;
  final DateTime? endDate;
  final String themeKey;
  final String backgroundType;
  final Color backgroundColor;
  final Color gradientStart;
  final Color gradientEnd;
  final String gradientDirection;
  final bool enableBanner;
  final String bannerImage;
  final String bannerLink;
  final List<FestivalGroupModel> festivalGroups;
  final CardStylingModel cardStyling;
  final List<String> applicableSuperCategories;
  final bool isActive;
  final String status;

  const FestivalCampaignModel({
    required this.id,
    required this.name,
    this.startDate,
    this.endDate,
    required this.themeKey,
    required this.backgroundType,
    required this.backgroundColor,
    required this.gradientStart,
    required this.gradientEnd,
    required this.gradientDirection,
    required this.enableBanner,
    required this.bannerImage,
    required this.bannerLink,
    required this.festivalGroups,
    required this.cardStyling,
    required this.applicableSuperCategories,
    required this.isActive,
    required this.status,
  });

  factory FestivalCampaignModel.fromJson(Map<String, dynamic> json) {
    final rawGroups = json['festivalGroups'];
    final groupsList = (rawGroups is List)
        ? rawGroups
            .whereType<Map<String, dynamic>>()
            .map((g) => FestivalGroupModel.fromJson(g))
            .where((g) => g.isActive)
            .toList()
        : <FestivalGroupModel>[];

    final rawScopes = json['applicableSuperCategories'];
    final scopeList = (rawScopes is List)
        ? rawScopes.map((e) => e.toString()).toList()
        : <String>['all'];

    DateTime? parseDate(dynamic val) {
      if (val == null) return null;
      try {
        return DateTime.parse(val.toString());
      } catch (_) {
        return null;
      }
    }

    return FestivalCampaignModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? json['title'] ?? 'Festival Campaign').toString(),
      startDate: parseDate(json['startDate']),
      endDate: parseDate(json['endDate']),
      themeKey: (json['themeKey'] ?? 'krishna').toString(),
      backgroundType: (json['backgroundType'] ?? 'gradient').toString(),
      backgroundColor: CardStylingModel._parseColor(json['backgroundColor'], const Color(0xFFE0F2FE)),
      gradientStart: CardStylingModel._parseColor(json['gradientStart'], const Color(0xFFE0F2FE)),
      gradientEnd: CardStylingModel._parseColor(json['gradientEnd'], const Color(0xFFCFFAFE)),
      gradientDirection: (json['gradientDirection'] ?? 'to bottom').toString(),
      enableBanner: (json['enableBanner'] as bool?) ?? false,
      bannerImage: (json['bannerImage'] ?? '').toString(),
      bannerLink: (json['bannerLink'] ?? '').toString(),
      festivalGroups: groupsList,
      cardStyling: CardStylingModel.fromJson(json['cardStyling'] as Map<String, dynamic>?),
      applicableSuperCategories: scopeList.isEmpty ? <String>['all'] : scopeList,
      isActive: (json['isActive'] as bool?) ?? true,
      status: (json['status'] ?? 'published').toString(),
    );
  }

  /// STEP 3: Strict Active Check (isActive == true AND status == 'published' AND startDate <= now <= endDate)
  bool get isCurrentlyActive {
    if (!isActive || status == 'draft') return false;
    final now = DateTime.now();
    if (startDate != null && now.isBefore(startDate!)) return false;
    if (endDate != null && now.isAfter(endDate!)) return false;
    return true;
  }

  /// STEP 4: Scope Check (Checks if applicable to current super category slug)
  bool appliesToSuperCategory(String? superCategorySlug) {
    final currentSlug = (superCategorySlug == null || superCategorySlug.isEmpty)
        ? 'all'
        : superCategorySlug.toLowerCase().trim();

    // 1. If campaign scope includes 'all_super_categories' or 'all super categories' -> applies EVERYWHERE
    final containsAllSuper = applicableSuperCategories.any((s) {
      final l = s.toLowerCase().trim();
      return l == 'all_super_categories' || l == 'all super categories' || l == 'all_categories';
    });
    if (containsAllSuper) return true;

    // 2. Exact or normalized slug matching for the current active page/tab
    return applicableSuperCategories.any((s) {
      final scope = s.toLowerCase().trim();
      if (scope == currentSlug) return true;
      if (scope == 'sc_$currentSlug') return true;
      if (currentSlug == 'all' && (scope == 'all' || scope == 'sc_all')) return true;
      return false;
    });
  }
}
