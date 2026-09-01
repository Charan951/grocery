import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/otp_field.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/authentication/presentation/widgets/auth_scaffold.dart';

/// Step 2 of sign-in: verify the 6-digit code. Auto-submits on the last digit;
/// on success routes to location selection.
class OtpScreen extends ConsumerStatefulWidget {
  final String phone;
  const OtpScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpKey = GlobalKey<OtpFieldState>();
  String _code = '';
  String? _error;
  bool _submitting = false;

  Timer? _timer;
  int _secondsLeft = 45;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _secondsLeft = 45);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      if (_secondsLeft <= 1) {
        t.cancel();
        setState(() => _secondsLeft = 0);
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  Future<void> _verify() async {
    if (_submitting) return;
    FocusScope.of(context).unfocus();
    if (_code.length < 6) {
      setState(() => _error = 'Enter all 6 digits');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });

    final ok = await ref.read(authProvider.notifier).verifyOtp(widget.phone, _code);
    if (!mounted) return;
    setState(() => _submitting = false);

    if (ok) {
      AppToast.success('Signed in successfully');
      // Returning customer with a saved address skips location setup.
      final hasAddress = ref.read(authProvider).user?.selectedAddress != null;
      context.go(hasAddress ? '/' : '/location_select');
    } else {
      setState(() => _error = ref.read(authProvider).error ?? 'Invalid code. Please try again.');
      _otpKey.currentState?.reset();
    }
  }

  Future<void> _resend() async {
    if (_secondsLeft > 0 || _submitting) return;
    setState(() => _error = null);
    final ok = await ref.read(authProvider.notifier).resendOtp(widget.phone);
    if (!mounted) return;
    if (ok) {
      _otpKey.currentState?.reset();
      _startCountdown();
      AppToast.success('A new code is on its way');
    } else {
      final msg = ref.read(authProvider).error ?? 'Could not resend the code';
      setState(() => _error = msg);
      AppToast.error(msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final busy = _submitting || auth.isLoading;

    return AuthScaffold(
      title: 'Verify your number',
      subtitle: 'Enter the code sent to +91 ${_pretty(widget.phone)}.',
      belowTitle: auth.otpTestMode
          ? _TestModeBanner(code: auth.otpDevCode ?? '000000')
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          OtpField(
            key: _otpKey,
            enabled: !busy,
            errorText: _error,
            onChanged: (v) {
              _code = v;
              if (_error != null) setState(() => _error = null);
            },
            onCompleted: (v) {
              _code = v;
              _verify();
            },
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Text(
                "Didn't get it? ",
                style: AppTypography.bodySmall(
                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                ),
              ),
              GestureDetector(
                onTap: _secondsLeft == 0 ? _resend : null,
                child: Text(
                  _secondsLeft > 0 ? 'Resend in ${_secondsLeft}s' : 'Resend code',
                  style: AppTypography.labelMedium(
                    _secondsLeft > 0 ? AppColors.textSecondary : AppColors.primaryText,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      cta: PrimaryButton(
        text: 'Verify & continue',
        isLoading: busy,
        onPressed: _verify,
      ),
    );
  }

  String _pretty(String p) {
    final d = p.replaceAll(RegExp(r'\D'), '');
    return d.length == 10 ? '${d.substring(0, 5)} ${d.substring(5)}' : p;
  }
}

class _TestModeBanner extends StatelessWidget {
  final String code;
  const _TestModeBanner({required this.code});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.warning.withOpacity(0.14),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.warning.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          const Icon(Icons.science_rounded, size: 16, color: AppColors.warningText),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Test mode — use code $code',
              style: AppTypography.bodySmall(AppColors.warningText).copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
