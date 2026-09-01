import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';

/// Flat, reusable text input aligned to the web design system: white surface,
/// 1px hairline border that turns green on focus / red on error, optional
/// label, helper and error text, prefix/suffix slots.
///
/// Use this everywhere instead of a raw [TextField]/[TextFormField] so form
/// styling stays consistent. For the home/search entry point use
/// `CustomSearchBar` instead.
class AppTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hintText;
  final String? helperText;
  final String? errorText;
  final bool obscureText;
  final bool enabled;
  final bool readOnly;
  final bool autofocus;
  final int maxLines;
  final int? maxLength;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final List<TextInputFormatter>? inputFormatters;
  final Widget? prefix;
  final Widget? suffix;
  final String? initialValue;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onTap;
  final FormFieldValidator<String>? validator;
  final AutovalidateMode? autovalidateMode;
  final FocusNode? focusNode;

  const AppTextField({
    super.key,
    this.controller,
    this.label,
    this.hintText,
    this.helperText,
    this.errorText,
    this.obscureText = false,
    this.enabled = true,
    this.readOnly = false,
    this.autofocus = false,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType,
    this.textInputAction,
    this.inputFormatters,
    this.prefix,
    this.suffix,
    this.initialValue,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.validator,
    this.autovalidateMode,
    this.focusNode,
  });

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late bool _obscured = widget.obscureText;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final hintColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final fill = isDark ? AppColors.surfaceDark : AppColors.surface;
    final baseBorder = isDark ? AppColors.dividerDark : AppColors.divider;

    OutlineInputBorder border(Color c, [double w = 1.0]) => OutlineInputBorder(
          borderRadius: AppRadius.brMd,
          borderSide: BorderSide(color: c, width: w),
        );

    Widget? suffixIcon = widget.suffix;
    if (widget.obscureText) {
      suffixIcon = IconButton(
        icon: Icon(_obscured ? Icons.visibility_off_rounded : Icons.visibility_rounded,
            size: 20, color: hintColor),
        onPressed: () => setState(() => _obscured = !_obscured),
        splashRadius: 20,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(widget.label!, style: AppTypography.labelMedium(textColor)),
          const SizedBox(height: 6),
        ],
        TextFormField(
          controller: widget.controller,
          initialValue: widget.controller == null ? widget.initialValue : null,
          focusNode: widget.focusNode,
          obscureText: _obscured,
          enabled: widget.enabled,
          readOnly: widget.readOnly,
          autofocus: widget.autofocus,
          maxLines: widget.obscureText ? 1 : widget.maxLines,
          maxLength: widget.maxLength,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          inputFormatters: widget.inputFormatters,
          onChanged: widget.onChanged,
          onFieldSubmitted: widget.onSubmitted,
          onTap: widget.onTap,
          validator: widget.validator,
          autovalidateMode: widget.autovalidateMode,
          style: AppTypography.bodyMedium(textColor),
          cursorColor: AppColors.primary,
          decoration: InputDecoration(
            hintText: widget.hintText,
            hintStyle: AppTypography.bodyMedium(hintColor),
            helperText: widget.helperText,
            helperStyle: AppTypography.bodySmall(hintColor),
            errorText: widget.errorText,
            errorStyle: AppTypography.bodySmall(AppColors.error),
            counterText: '',
            filled: true,
            fillColor: widget.enabled ? fill : baseBorder.withOpacity(0.4),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            prefixIcon: widget.prefix,
            suffixIcon: suffixIcon,
            border: border(baseBorder),
            enabledBorder: border(baseBorder),
            focusedBorder: border(AppColors.primary, 1.5),
            errorBorder: border(AppColors.error),
            focusedErrorBorder: border(AppColors.error, 1.5),
            disabledBorder: border(baseBorder.withOpacity(0.5)),
          ),
        ),
      ],
    );
  }
}
