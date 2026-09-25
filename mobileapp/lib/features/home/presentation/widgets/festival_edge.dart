import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Per-theme bottom edge of the festival section. Each predefined theme has
/// its own repeating tile (16px tall, painted in `currentColor` with evenodd so
/// a sub-path can punch a hole). The tile is repeated a whole number of times
/// and stretched horizontally to fit exactly — no clipped half-tile at the end.
/// Mirrors frontend/src/components/FestivalEdge.tsx — keep the tile markup
/// identical on both.
const double kFestivalEdgeHeight = 16;

const Map<String, (double, String)> _edgeTiles = {
  // Flowing Yamuna waves + peacock-eye dots over the troughs.
  'krishna': (
    40,
    '<path d="M0 16V8C3.3 4.7 6.7 3 10 3S16.7 4.7 20 8S26.7 13 30 13S36.7 11.3 40 8V16Z"/><circle cx="30" cy="6.5" r="1.6"/>',
  ),
  // Round modak scallops, each with a dot punched through.
  'ganesh_chaturthi': (
    24,
    '<path d="M0 16V13C0 6.4 5.4 3 12 3S24 6.4 24 13V16Z M10 9.5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z"/>',
  ),
  // Diya flame points with a spark between each flame.
  'diwali': (
    24,
    '<path d="M0 16V14C5 14 9 11 10.5 7C11.3 4.8 11.7 2.5 12 1C12.3 2.5 12.7 4.8 13.5 7C15 11 19 14 24 14V16Z"/><circle cx="0" cy="8" r="1.3"/><circle cx="24" cy="8" r="1.3"/>',
  ),
  // Pookalam petals — alternating big (with a flower centre) and small.
  'onam': (
    32,
    '<path d="M0 16V14C1.5 5 6 2 8 2S14.5 5 16 14C17.5 9 20.5 7 24 7S30.5 9 32 14V16Z M6.5 9a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0Z"/>',
  ),
  // Rakhi thread strung with pearls and small beads.
  'raksha_bandhan': (
    16,
    '<path d="M0 16V12H16V16Z"/><circle cx="8" cy="8.5" r="4"/><circle cx="0" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/>',
  ),
  // Soft colour wave with scattered splash dots of varying sizes.
  'holi': (
    48,
    '<path d="M0 16V12Q6 9 12 12T24 12T36 12T48 12V16Z"/><circle cx="6" cy="5" r="2"/><circle cx="17" cy="7" r="1.2"/><circle cx="27" cy="3" r="1.6"/><circle cx="38" cy="6" r="2.4"/><circle cx="45" cy="2" r="1"/>',
  ),
  // Garba zigzag with a dot above every peak.
  'navratri': (
    20,
    '<path d="M0 16V14L10 6L20 14V16Z"/><circle cx="10" cy="2.6" r="1.6"/>',
  ),
  // Classic scallop for unknown / custom theme keys.
  'scallop': (15, '<path d="M0 16Q7.5 0 15 16Z"/>'),
};

/// Full SVG for a given width. Same algorithm as the web `buildFestivalEdgeSvgBody`.
String buildFestivalEdgeSvg(String themeKey, double width) {
  final (tileW, tileSvg) = _edgeTiles[themeKey] ?? _edgeTiles['scallop']!;
  final n = math.max(1, (width / tileW).round());
  final sx = width / (n * tileW);
  final body = StringBuffer();
  for (var i = 0; i < n; i++) {
    body.write(
      '<g transform="translate(${(i * tileW * sx).toStringAsFixed(2)},0) '
      'scale(${sx.toStringAsFixed(4)},1)">$tileSvg</g>',
    );
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" '
      'viewBox="0 0 ${width.toStringAsFixed(2)} $kFestivalEdgeHeight">'
      '<g fill="currentColor" fill-rule="evenodd">$body</g></svg>';
}

class FestivalEdge extends StatelessWidget {
  final String themeKey;
  final Color color;

  const FestivalEdge({super.key, required this.themeKey, required this.color});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        if (!width.isFinite || width <= 0) {
          return const SizedBox(height: kFestivalEdgeHeight);
        }
        return SvgPicture.string(
          buildFestivalEdgeSvg(themeKey, width),
          width: width,
          height: kFestivalEdgeHeight,
          theme: SvgTheme(currentColor: color),
          excludeFromSemantics: true,
        );
      },
    );
  }
}
