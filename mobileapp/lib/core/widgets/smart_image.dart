import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Renders an admin-supplied image that may be a normal http(s) URL, or a
/// raw `data:image/...;base64,` URI (the web admin falls back to storing the
/// picked file inline when a CDN upload fails). `CachedNetworkImage` can't
/// render a data URI, so this picks the right widget for whichever it is,
/// and falls back to [errorBuilder] for anything unusable.
Widget smartImage({
  required String url,
  BoxFit fit = BoxFit.cover,
  required WidgetBuilder errorBuilder,
}) {
  final trimmed = url.trim();

  if (trimmed.startsWith('data:image')) {
    final commaIdx = trimmed.indexOf(',');
    if (commaIdx != -1) {
      try {
        return Image.memory(
          base64Decode(trimmed.substring(commaIdx + 1)),
          fit: fit,
          errorBuilder: (context, _, _) => errorBuilder(context),
        );
      } catch (_) {
        return Builder(builder: errorBuilder);
      }
    }
    return Builder(builder: errorBuilder);
  }

  if (trimmed.startsWith('http')) {
    return CachedNetworkImage(
      imageUrl: trimmed,
      fit: fit,
      errorWidget: (context, _, _) => errorBuilder(context),
    );
  }

  return Builder(builder: errorBuilder);
}
