import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';

void main() {
  testWidgets('GlassCard renders flat — no BackdropFilter / blur', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: GlassCard(child: SizedBox(width: 40, height: 40))),
    ));

    expect(find.byType(BackdropFilter), findsNothing);

    final container = tester.widget<Container>(
      find.descendant(of: find.byType(GlassCard), matching: find.byType(Container)).first,
    );
    final deco = container.decoration as BoxDecoration;
    expect(deco.color, AppColors.surface); // solid white, not translucent
    expect((deco.border as Border).top.width, 1.0); // hairline
    // Fully flat: no shadow — the hairline carries separation.
    expect(deco.boxShadow ?? const [], isEmpty);
  });

  testWidgets('PrimaryButton is a full pill', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: PrimaryButton(text: 'Go', onPressed: () {})),
    ));
    final container = tester.widget<Container>(
      find.descendant(of: find.byType(PrimaryButton), matching: find.byType(Container)).first,
    );
    final deco = container.decoration as BoxDecoration;
    final radius = (deco.borderRadius as BorderRadius).topLeft.x;
    expect(radius, greaterThanOrEqualTo(28)); // pill, not a soft 12-20 rect
  });

  test('brand background is the warm off-white from DESIGN.md', () {
    expect(AppColors.background, const ui.Color(0xFFF8FAF7));
    expect(AppColors.divider, const ui.Color(0xFFECECEC));
    expect(AppColors.card, AppColors.surface); // no translucent card
  });
}
