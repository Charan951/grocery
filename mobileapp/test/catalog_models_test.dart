import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/features/categories/data/models/category_model.dart';
import 'package:freshcart/features/products/data/models/product_model.dart';

void main() {
  group('CategoryModel.fromJson', () {
    test('parses the real backend shape (hex color string, displayName, subs)', () {
      final c = CategoryModel.fromJson({
        'id': 'fruits-vegetables',
        'name': 'Fruits & Vegetables',
        'displayName': 'Fruits',
        'color': '#a0f3a9',
        'productCount': 36,
        'subCategories': [
          {'name': 'Fresh Vegetables'},
          {'name': 'Fresh Fruits'},
          {'name': ''},
        ],
      });
      expect(c.id, 'fruits-vegetables');
      expect(c.name, 'Fruits'); // displayName wins
      expect(c.color, const Color(0xFFA0F3A9));
      expect(c.productCount, 36);
      expect(c.subCategories, ['Fresh Vegetables', 'Fresh Fruits']);
    });

    test('falls back when fields are missing / color is an int', () {
      final c = CategoryModel.fromJson({'slug': 'dairy', 'color': 0xFF112233});
      expect(c.id, 'dairy');
      expect(c.name, 'dairy');
      expect(c.color, const Color(0xFF112233));
      expect(c.subCategories, isEmpty);
    });
  });

  group('ProductModel.fromJson', () {
    test('parses the real backend shape with object stock', () {
      final p = ProductModel.fromJson({
        'id': 'prod_1',
        'name': 'Sweet chocolates',
        'brand': 'FreshCart',
        'categoryId': 'sweets',
        'subCategory': 'Sweets',
        'price': 79,
        'mrp': 89,
        'rating': 4.8,
        'reviewsCount': 12,
        'isOrganic': false,
        'imageUrl': 'https://x/y.png',
        'defaultWeight': '500 g',
        'weightOptions': ['500 g'],
        'stock': {'status': 'In Stock', 'quantity': 50},
      });
      expect(p.id, 'prod_1');
      expect(p.price, 79.0);
      expect(p.mrp, 89.0);
      expect(p.hasDiscount, isTrue);
      expect(p.stockQuantity, 50);
      expect(p.inStock, isTrue);
    });

    test('tolerates bare-number stock, string prices, missing arrays/images', () {
      final p = ProductModel.fromJson({
        'id': 'p2',
        'name': 'Loose Item',
        'price': '45.5',
        'stock': 0,
        // no brand, mrp, weightOptions, images, nutritionFacts, ingredients
      });
      expect(p.price, 45.5);
      expect(p.mrp, 45.5); // falls back to price, never below price
      expect(p.hasDiscount, isFalse);
      expect(p.stockQuantity, 0);
      expect(p.inStock, isFalse);
      expect(p.weightOptions, ['1 pc']);
      expect(p.imageUrl, startsWith('http'));
      expect(p.nutritionFacts, isEmpty);
      expect(p.brand, '');
    });

    test('derives imageUrl from images[] and keeps mrp >= price', () {
      final p = ProductModel.fromJson({
        'id': 'p3',
        'name': 'X',
        'price': 100,
        'mrp': 80, // lower than price -> clamped up
        'images': ['https://a/1.jpg', 'https://a/2.jpg'],
      });
      expect(p.imageUrl, 'https://a/1.jpg');
      expect(p.mrp, 100.0);
    });

    test('round-trips through toJson for Hive cart persistence', () {
      final p = ProductModel.fromJson({
        'id': 'p4', 'name': 'Y', 'price': 10, 'mrp': 12, 'stock': 7,
      });
      final again = ProductModel.fromJson(p.toJson());
      expect(again.id, 'p4');
      expect(again.price, 10.0);
      expect(again.stockQuantity, 7);
    });
  });
}
