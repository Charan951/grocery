import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/phone_field.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/authentication/presentation/widgets/auth_scaffold.dart';

/// Step 1 of sign-in: collect the phone number and request an OTP.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = PhoneFieldController();
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_phone.isValid) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    setState(() => _error = null);

    final ok = await ref.read(authProvider.notifier).sendOtp(_phone.digits);
    if (!mounted) return;
    if (ok) {
      context.push('/otp?phone=${_phone.digits}');
    } else {
      final msg = ref.read(authProvider).error ?? 'Could not send the code. Please try again.';
      setState(() => _error = msg);
      AppToast.error(msg);
    }
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider.select((s) => s.isLoading));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AuthScaffold(
      onBack: _back,
      title: 'Enter your number',
      subtitle: "We'll send a 6-digit verification code to confirm it's you.",
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PhoneField(
            controller: _phone,
            autofocus: true,
            errorText: _error,
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
            onSubmitted: _submit,
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Icon(Icons.lock_outline_rounded,
                  size: 15, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Your number stays private and is only used to secure your account.',
                  style: AppTypography.bodySmall(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      cta: Column(
        children: [
          PrimaryButton(
            text: 'Send code',
            isLoading: loading,
            onPressed: _submit,
          ),
          const SizedBox(height: 12),
          _TermsLine(isDark: isDark),
        ],
      ),
    );
  }
}

class _TermsLine extends StatelessWidget {
  final bool isDark;
  const _TermsLine({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final sub = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    final base = AppTypography.labelSmall(sub).copyWith(fontWeight: FontWeight.w400, height: 1.4);
    final link = base.copyWith(color: AppColors.primaryText, decoration: TextDecoration.underline);
    TapGestureRecognizer rec(String tab) => TapGestureRecognizer()
      ..onTap = () => context.push('/legal?tab=$tab');
    return Text.rich(
      TextSpan(
        style: base,
        children: [
          const TextSpan(text: 'By continuing you agree to our '),
          TextSpan(text: 'Terms of Service', style: link, recognizer: rec('terms')),
          const TextSpan(text: ' and '),
          TextSpan(text: 'Privacy Policy', style: link, recognizer: rec('privacy')),
          const TextSpan(text: '.'),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}
