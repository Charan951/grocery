import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// Indian mobile-number entry: fixed `+91` prefix, 10 digits, grouped display
/// (`98765 43210`), numeric keyboard, live validity via [onChanged]. Read the
/// raw digits with [PhoneFieldController.digits].
class PhoneFieldController extends TextEditingController {
  String get digits => text.replaceAll(RegExp(r'\D'), '');
  bool get isValid => digits.length == 10;
}

class _GroupFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final trimmed = digits.length > 10 ? digits.substring(0, 10) : digits;
    final buf = StringBuffer();
    for (var i = 0; i < trimmed.length; i++) {
      if (i == 5) buf.write(' ');
      buf.write(trimmed[i]);
    }
    final formatted = buf.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class PhoneField extends StatelessWidget {
  final PhoneFieldController controller;
  final bool enabled;
  final bool autofocus;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSubmitted;

  const PhoneField({
    super.key,
    required this.controller,
    this.enabled = true,
    this.autofocus = false,
    this.errorText,
    this.onChanged,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final hasError = errorText != null;

    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: AppRadius.brMd,
          borderSide: BorderSide(color: c, width: w),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          enabled: enabled,
          autofocus: autofocus,
          keyboardType: TextInputType.phone,
          inputFormatters: [_GroupFormatter()],
          onChanged: onChanged,
          onSubmitted: (_) => onSubmitted?.call(),
          style: AppTypography.bodyLarge(textColor)
              .copyWith(fontWeight: FontWeight.w600, letterSpacing: 1.2),
          decoration: InputDecoration(
            hintText: '98765 43210',
            hintStyle: AppTypography.bodyLarge(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ).copyWith(letterSpacing: 1.2),
            prefixIcon: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 8, 0),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('+91', style: AppTypography.bodyLarge(textColor).copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  Container(width: 1, height: 20, color: isDark ? AppColors.dividerDark : AppColors.divider),
                ],
              ),
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : AppColors.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            enabledBorder: border(isDark ? AppColors.dividerDark : AppColors.divider),
            focusedBorder: border(hasError ? AppColors.error : AppColors.primary, 1.5),
            errorBorder: border(AppColors.error),
            disabledBorder: border((isDark ? AppColors.dividerDark : AppColors.divider).withOpacity(0.5)),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 8),
          Text(errorText!, style: AppTypography.bodySmall(AppColors.error)),
        ],
      ],
    );
  }
}
