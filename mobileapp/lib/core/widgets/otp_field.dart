import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// A segmented one-time-code input.
///
/// Native-feeling behaviour: auto-advance on entry, backspace jumps to the
/// previous box and clears it, an OS autofill / clipboard paste distributes
/// across all boxes, `onCompleted` fires when the last digit lands, and an
/// [errorText] drives a red border + a short shake.
class OtpField extends StatefulWidget {
  final int length;
  final bool enabled;
  final bool autofocus;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onCompleted;

  const OtpField({
    super.key,
    this.length = 6,
    this.enabled = true,
    this.autofocus = true,
    this.errorText,
    this.onChanged,
    this.onCompleted,
  });

  @override
  State<OtpField> createState() => OtpFieldState();
}

class OtpFieldState extends State<OtpField> with SingleTickerProviderStateMixin {
  late final List<TextEditingController> _controllers =
      List.generate(widget.length, (_) => TextEditingController());
  late final List<FocusNode> _nodes = List.generate(widget.length, (_) => FocusNode());
  late final AnimationController _shake = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 400),
  );

  String get _value => _controllers.map((c) => c.text).join();

  /// Clears every box and returns focus to the first — call after a failed verify.
  void reset() {
    for (final c in _controllers) {
      c.clear();
    }
    if (mounted) {
      _nodes.first.requestFocus();
      setState(() {});
    }
  }

  @override
  void didUpdateWidget(covariant OtpField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.errorText != null && oldWidget.errorText != widget.errorText) {
      _shake.forward(from: 0);
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final n in _nodes) {
      n.dispose();
    }
    _shake.dispose();
    super.dispose();
  }

  void _distribute(String raw, int startIndex) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return;
    for (var i = 0; i < digits.length && startIndex + i < widget.length; i++) {
      _controllers[startIndex + i].text = digits[i];
    }
    final next = (startIndex + digits.length).clamp(0, widget.length - 1);
    _nodes[next].requestFocus();
    _afterChange();
  }

  void _onChanged(String v, int i) {
    if (v.length > 1) {
      _distribute(v, i);
      return;
    }
    if (v.isNotEmpty && i < widget.length - 1) {
      _nodes[i + 1].requestFocus();
    }
    _afterChange();
  }

  void _onKey(KeyEvent e, int i) {
    if (e is KeyDownEvent &&
        e.logicalKey == LogicalKeyboardKey.backspace &&
        _controllers[i].text.isEmpty &&
        i > 0) {
      _controllers[i - 1].clear();
      _nodes[i - 1].requestFocus();
      _afterChange();
    }
  }

  void _afterChange() {
    setState(() {});
    widget.onChanged?.call(_value);
    if (_value.length == widget.length && !_value.contains(' ')) {
      _nodes.last.unfocus();
      widget.onCompleted?.call(_value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasError = widget.errorText != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedBuilder(
          animation: _shake,
          builder: (context, child) {
            // Decaying sine wobble; zero when not animating.
            final dx = _shake.isAnimating
                ? math.sin(_shake.value * math.pi * 4) * 8 * (1 - _shake.value)
                : 0.0;
            return Transform.translate(offset: Offset(dx, 0), child: child);
          },
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              for (var i = 0; i < widget.length; i++)
                _Box(
                  controller: _controllers[i],
                  node: _nodes[i],
                  filled: _controllers[i].text.isNotEmpty,
                  hasError: hasError,
                  isDark: isDark,
                  enabled: widget.enabled,
                  autofocus: widget.autofocus && i == 0,
                  onChanged: (v) => _onChanged(v, i),
                  onKey: (e) => _onKey(e, i),
                ),
            ],
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 10),
          Text(widget.errorText!, style: AppTypography.bodySmall(AppColors.error)),
        ],
      ],
    );
  }
}

class _Box extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode node;
  final bool filled;
  final bool hasError;
  final bool isDark;
  final bool enabled;
  final bool autofocus;
  final ValueChanged<String> onChanged;
  final ValueChanged<KeyEvent> onKey;

  const _Box({
    required this.controller,
    required this.node,
    required this.filled,
    required this.hasError,
    required this.isDark,
    required this.enabled,
    required this.autofocus,
    required this.onChanged,
    required this.onKey,
  });

  @override
  Widget build(BuildContext context) {
    final border = hasError
        ? AppColors.error
        : filled
            ? AppColors.primary
            : (isDark ? AppColors.dividerDark : AppColors.divider);

    return SizedBox(
      width: 48,
      height: 56,
      child: KeyboardListener(
        focusNode: FocusNode(skipTraversal: true),
        onKeyEvent: onKey,
        child: TextField(
          controller: controller,
          focusNode: node,
          enabled: enabled,
          autofocus: autofocus,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6, // allow paste; _distribute trims
          showCursor: true,
          cursorColor: AppColors.primary,
          style: AppTypography.h2(
            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
          ).copyWith(fontWeight: FontWeight.w700),
          decoration: InputDecoration(
            counterText: '',
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : AppColors.surface,
            contentPadding: EdgeInsets.zero,
            enabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.brSm,
              borderSide: BorderSide(color: border, width: filled || hasError ? 1.5 : 1),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: AppRadius.brSm,
              borderSide: BorderSide(
                color: hasError ? AppColors.error : AppColors.primary,
                width: 1.5,
              ),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: AppRadius.brSm,
              borderSide: BorderSide(color: border),
            ),
          ),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
