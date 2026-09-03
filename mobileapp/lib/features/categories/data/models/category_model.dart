import 'package:flutter/material.dart';
import 'package:freshcart/core/utils/parse.dart';

class CategoryModel {
  final String id;
  final String name;
  final String icon; // Icon asset or keyword for drawing
  final String imageUrl;
  final Color color;
  final int productCount;
  final List<String> subCategories;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.icon,
    this.imageUrl = '',
    required this.color,
    required this.productCount,
    this.subCategories = const [],
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    final subs = (json['subCategories'] as List?)
            ?.whereType<Map>()
            .map((s) => asString(s['name']))
            .where((s) => s.isNotEmpty)
            .toList() ??
        const <String>[];

    final id = asString(json['id'], fallback: asString(json['slug'], fallback: asString(json['_id'])));
    final display = asString(json['displayName']).isNotEmpty
        ? asString(json['displayName'])
        : asString(json['name'], fallback: id.isNotEmpty ? id : 'Category');

    final img = (json['image'] is Map)
        ? asString(json['image']['url'])
        : asString(json['imageUrl'], fallback: asString(json['image']));

    return CategoryModel(
      id: id,
      name: display,
      icon: asString(json['icon'], fallback: 'basket'),
      imageUrl: img,
      color: asColor(json['color']),
      productCount: asInt(json['productCount']),
      subCategories: subs,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'icon': icon,
        'color': '#${(color.value & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}',
        'productCount': productCount,
        'subCategories': subCategories,
      };
}
