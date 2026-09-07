import 'package:flutter/material.dart';
import 'package:freshcart/core/utils/parse.dart';

class SubCategoryModel {
  final String id;
  final String name;
  final String imageUrl;
  final String icon;

  const SubCategoryModel({
    required this.id,
    required this.name,
    this.imageUrl = '',
    this.icon = '',
  });

  factory SubCategoryModel.fromJson(dynamic json) {
    if (json is String) {
      return SubCategoryModel(id: json, name: json);
    }
    if (json is Map) {
      final map = Map<String, dynamic>.from(json);
      final id = asString(map['id'], fallback: asString(map['_id'], fallback: asString(map['name'])));
      final name = asString(map['name']);
      final img = asString(map['image'], fallback: asString(map['imageUrl']));
      final icon = asString(map['icon']);
      return SubCategoryModel(id: id, name: name, imageUrl: img, icon: icon);
    }
    return const SubCategoryModel(id: '', name: '');
  }
}

class CategoryModel {
  final String id;
  final String name;
  final String icon; // Icon asset or keyword for drawing
  final String imageUrl;
  final Color color;
  final int productCount;
  final List<String> subCategories;
  final List<SubCategoryModel> subCategoryItems;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.icon,
    this.imageUrl = '',
    required this.color,
    required this.productCount,
    this.subCategories = const [],
    this.subCategoryItems = const [],
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    final rawSubs = (json['subCategories'] as List?) ?? const [];
    final subItems = rawSubs
        .map((s) => SubCategoryModel.fromJson(s))
        .where((s) => s.name.isNotEmpty)
        .toList();
    final subNames = subItems.map((s) => s.name).toList();

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
      subCategories: subNames,
      subCategoryItems: subItems,
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
