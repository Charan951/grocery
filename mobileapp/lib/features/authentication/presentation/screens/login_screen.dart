import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/authentication/presentation/widgets/auth_scaffold.dart';

enum _Detected { none, phone, email }

_Detected _detect(String raw) {
  final v = raw.trim();
  if (v.isEmpty) return _Detected.none;
  if (RegExp(r'^\S+@\S+\.\S+$').hasMatch(v)) return _Detected.email;
  final digits = v.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 10 && !v.contains('@')) return _Detected.phone;
  return _Detected.none;
}

/// Step 1 of sign-in: a single "phone or email" field. No manual method
/// toggle — the next screen (OTP for a phone, password for an email) is
/// inferred from what was typed, mirroring the web storefront's sign-in.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifier = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final kind = _detect(_identifier.text);
    if (kind == _Detected.none) {
      setState(() => _error = 'Enter a valid 10-digit phone number or email address');
      return;
    }
    setState(() => _error = null);

    if (kind == _Detected.email) {
      context.push('/password?email=${Uri.encodeComponent(_identifier.text.trim().toLowerCase())}');
      return;
    }

    final digits = _identifier.text.replaceAll(RegExp(r'\D'), '');
    final ok = await ref.read(authProvider.notifier).sendOtp(digits);
    if (!mounted) return;
    if (ok) {
      context.push('/otp?phone=$digits');
    } else {
      final msg = ref.read(authProvider).error ?? 'Could not send the code. Please try again.';
      setState(() => _error = msg);
      AppToast.error(msg);
    }
  }

  void _continueAsGuest() {
    ref.read(authProvider.notifier).continueAsGuest();
    // Setting isGuest also flips the router's `refreshListenable`, which
    // re-runs `redirect` for the *current* location on this same frame.
    // Calling `go` synchronously right alongside that can race go_router's
    // internal route-match bookkeeping (a `'index != -1'` assertion); wait a
    // frame so the redirect pass settles before we navigate explicitly.
    //
    // Straight to Home (not a location-picker screen) — HomeScreen's own
    // `_maybeAskLocation()` prompts for the real OS permission in place, the
    // same as it does for a signed-in user.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.go('/');
    });
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
      onGuest: _continueAsGuest,
      title: "India's 10 minute app",
      subtitle: 'Log in or Sign up',
      body: AppTextField(
        controller: _identifier,
        label: 'Phone number or email',
        autofocus: true,
        errorText: _error,
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.done,
        onChanged: (_) {
          if (_error != null) setState(() => _error = null);
        },
        onSubmitted: (_) => _submit(),
      ),
      cta: Column(
        children: [
          PrimaryButton(
            text: 'Continue',
            isLoading: loading,
            onPressed: _submit,
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              if (_detect(_identifier.text) == _Detected.email) {
                setState(() => _error = '');
                context.push('/register?email=${Uri.encodeComponent(_identifier.text.trim().toLowerCase())}');
              } else {
                setState(() => _error = 'Enter your email above, then tap Create account');
              }
            },
            child: Text(
              'New here? Create an account',
              style: AppTypography.labelMedium(AppColors.primaryText).copyWith(decoration: TextDecoration.underline),
            ),
          ),
          const SizedBox(height: 4),
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
