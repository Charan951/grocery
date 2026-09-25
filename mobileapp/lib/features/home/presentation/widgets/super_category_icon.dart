import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Lucide super-category icons as raw SVG so the active one can be drawn
/// filled and the rest as outlines (the Lucide icon font is outline-only).
/// Mirrors frontend/src/components/SuperCategoryIcon.tsx — keep in sync.
///
/// Each element is `(svgElement, fillable)`. Open strokes (headphone band,
/// leaf stem) are never filled, otherwise the fill would close them into blobs.
const Map<String, List<(String, bool)>> _superCatIconElements = {
  'grid': [
    ('<rect width="7" height="7" x="3" y="3" rx="1"/>', true),
    ('<rect width="7" height="7" x="14" y="3" rx="1"/>', true),
    ('<rect width="7" height="7" x="14" y="14" rx="1"/>', true),
    ('<rect width="7" height="7" x="3" y="14" rx="1"/>', true),
  ],
  'coffee': [
    ('<path d="M10 2v2"/>', false),
    ('<path d="M14 2v2"/>', false),
    ('<path d="M6 2v2"/>', false),
    ('<path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>', true),
  ],
  'armchair': [
    ('<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/>', true),
    ('<path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/>', true),
    ('<path d="M5 18v2"/>', false),
    ('<path d="M19 18v2"/>', false),
  ],
  'shapes': [
    ('<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/>', true),
    ('<rect x="3" y="14" width="7" height="7" rx="1"/>', true),
    ('<circle cx="17.5" cy="17.5" r="3.5"/>', true),
  ],
  'leaf': [
    ('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>', true),
    ('<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>', false),
  ],
  'headphones': [
    ('<path d="M3 19v-7a9 9 0 0 1 18 0v7"/>', false),
    ('<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', true),
    ('<path d="M21 14h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2z"/>', true),
  ],
  'smartphone': [
    ('<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>', true),
    ('<path d="M12 18h.01"/>', false),
  ],
  'sparkles': [
    ('<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>', true),
    ('<path d="M20 2v4"/>', false),
    ('<path d="M22 4h-4"/>', false),
    ('<circle cx="4" cy="20" r="2"/>', true),
  ],
  'shirt': [
    ('<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>', true),
  ],
};

/// Same keyword mapping as the web `superCatIconKey`.
String superCatIconKey(String? name, String? iconKey) {
  final k = '${iconKey ?? ''} ${name ?? ''}'.toLowerCase();
  bool has(List<String> words) => words.any(k.contains);
  if (has(['grid', 'all'])) return 'grid';
  if (has(['coffee', 'cafe'])) return 'coffee';
  if (has(['decor', 'chair', 'home', 'furniture', 'sofa'])) return 'armchair';
  if (has(['toy', 'shape', 'game'])) return 'shapes';
  if (has(['leaf', 'fresh', 'eco'])) return 'leaf';
  if (has(['headphone', 'electronic'])) return 'headphones';
  if (has(['mobile', 'phone', 'smartphone'])) return 'smartphone';
  if (has(['sparkle', 'beauty'])) return 'sparkles';
  if (has(['shirt', 'fashion', 'hanger', 'cloth'])) return 'shirt';
  return 'grid';
}

class SuperCategoryIcon extends StatelessWidget {
  final String iconKey;
  final bool filled;
  final Color color;
  final double size;

  const SuperCategoryIcon({
    super.key,
    required this.iconKey,
    required this.filled,
    required this.color,
    this.size = 20,
  });

  @override
  Widget build(BuildContext context) {
    final elements =
        _superCatIconElements[iconKey] ?? _superCatIconElements['grid']!;
    final body = elements
        .map((e) => filled && e.$2
            ? e.$1.replaceFirst('/>', ' fill="currentColor"/>')
            : e.$1)
        .join();
    return SvgPicture.string(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
      'stroke-linejoin="round">$body</svg>',
      width: size,
      height: size,
      theme: SvgTheme(currentColor: color),
    );
  }
}
