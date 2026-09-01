import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// The one quantity stepper for the whole app (cart rows, PDP sticky bar).
/// Solid green track, white glyphs, ≥ 40 dp per control (48 dp `large`).
class QtyStepper extends StatelessWidget {
  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final bool large;

  const QtyStepper({
    super.key,
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
    this.large = false,
  });

  @override
  Widget build(BuildContext context) {
    final side = large ? 48.0 : 40.0;
    final glyph = large ? 20.0 : 16.0;
    return Material(
      color: AppColors.primary,
      borderRadius: large ? AppRadius.brPill : AppRadius.brSm,
      clipBehavior: Clip.antiAlias,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _btn(Icons.remove_rounded, onDecrement, side, glyph, 'Decrease quantity'),
          Container(
            constraints: BoxConstraints(minWidth: large ? 28 : 22),
            alignment: Alignment.center,
            child: Text(
              '$quantity',
              style: AppTypography.labelLarge(Colors.white).copyWith(fontSize: large ? 16 : 14),
            ),
          ),
          _btn(Icons.add_rounded, onIncrement, side, glyph, 'Increase quantity'),
        ],
      ),
    );
  }

  Widget _btn(IconData icon, VoidCallback onTap, double side, double glyph, String label) {
    return Semantics(
      button: true,
      label: label,
      child: InkResponse(
        onTap: onTap,
        radius: side / 2,
        child: SizedBox(
          width: side,
          height: side,
          child: Icon(icon, size: glyph, color: Colors.white),
        ),
      ),
    );
  }
}
