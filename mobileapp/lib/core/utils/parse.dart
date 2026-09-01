import 'package:flutter/material.dart';

/// Lenient parsers for backend JSON whose field types drift (numbers arrive as
/// strings, colors as `#RRGGBB`, stock as a number or a `{status, quantity}`
/// object, etc.). The web storefront tolerates the same shapes.

double asDouble(dynamic v, {double fallback = 0}) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v.replaceAll(RegExp(r'[^0-9.\-]'), '')) ?? fallback;
  return fallback;
}

int asInt(dynamic v, {int fallback = 0}) {
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v.replaceAll(RegExp(r'[^0-9\-]'), '')) ?? fallback;
  return fallback;
}

bool asBool(dynamic v, {bool fallback = false}) {
  if (v is bool) return v;
  if (v is String) return v.toLowerCase() == 'true';
  if (v is num) return v != 0;
  return fallback;
}

String asString(dynamic v, {String fallback = ''}) {
  if (v == null) return fallback;
  if (v is String) return v;
  return v.toString();
}

List<String> asStringList(dynamic v) {
  if (v is List) {
    return v.where((e) => e != null).map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
  }
  return const [];
}

Map<String, String> asStringMap(dynamic v) {
  if (v is Map) {
    return v.map((k, value) => MapEntry(k.toString(), value?.toString() ?? ''));
  }
  return const {};
}

/// Accepts an int ARGB, `#RGB`, `#RRGGBB`, `#AARRGGBB`, or `rgb(...)`.
Color asColor(dynamic v, {Color fallback = const Color(0xFF4CAF50)}) {
  if (v is int) return Color(v);
  if (v is String) {
    var s = v.trim();
    if (s.startsWith('#')) s = s.substring(1);
    if (s.length == 3) s = s.split('').map((c) => '$c$c').join();
    if (s.length == 6) s = 'FF$s';
    if (s.length == 8) {
      final val = int.tryParse(s, radix: 16);
      if (val != null) return Color(val);
    }
  }
  return fallback;
}

/// Reads a stock quantity whether the field is a bare number, a
/// `{status, quantity}` object, or one of the legacy aliases.
int stockQuantityOf(Map<String, dynamic> json) {
  final s = json['stock'];
  if (s is num) return s.toInt();
  if (s is Map) return asInt(s['quantity'], fallback: 0);
  if (json['stockQuantity'] != null) return asInt(json['stockQuantity']);
  if (json['countInStock'] != null) return asInt(json['countInStock']);
  if (json['stockQty'] != null) return asInt(json['stockQty']);
  return 50; // unknown -> assume available, matches web getProductStockQuantity
}
