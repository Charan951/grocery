import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final ok = await ref.read(authProvider.notifier).login(_email.text, _pass.text);
    if (!mounted) return;
    if (ok) {
      context.go('/');
    } else {
      final msg = ref.read(authProvider).error ?? 'Login failed';
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider.select((s) => s.isLoading));
    final size = MediaQuery.of(context).size;
    final topInset = MediaQuery.of(context).padding.top;
    final heroHeight = (size.height * 0.42).clamp(240.0, 420.0);

    return Scaffold(
      backgroundColor: kPaper,
      resizeToAvoidBottomInset: false,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // ── Full-bleed hero illustration ──────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: heroHeight,
            child: Image.asset(
              'assets/images/partner_delivery.jpg',
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
              errorBuilder: (_, _, _) => Container(
                color: kGreenSoft,
                alignment: Alignment.center,
                child: const Icon(Icons.delivery_dining_rounded, size: 120, color: kGreen),
              ),
            ),
          ),

          // ── White sheet overlapping the hero ─────────────────────────
          Positioned.fill(
            top: heroHeight - 40,
            child: Container(
              decoration: const BoxDecoration(
                color: kSurface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(34)),
                boxShadow: [
                  BoxShadow(color: Color(0x14000000), blurRadius: 24, offset: Offset(0, -6)),
                ],
              ),
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                    26, 26, 26, 18 + MediaQuery.of(context).padding.bottom),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: Form(
                      key: _form,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Welcome back',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 20,
                                  color: kText,
                                ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Login to delivery',
                            textAlign: TextAlign.center,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: kTextMuted),
                          ),
                          const SizedBox(height: 20),
                          _IconField(
                            controller: _email,
                            hint: 'Username or email',
                            icon: Icons.person_outline,
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.username],
                            validator: (v) =>
                                (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                          ),
                          const SizedBox(height: 12),
                          _IconField(
                            controller: _pass,
                            hint: 'Password',
                            icon: Icons.lock_outline,
                            obscureText: _obscure,
                            autofillHints: const [AutofillHints.password],
                            onSubmitted: (_) => _submit(),
                            validator: (v) =>
                                (v == null || v.length < 4) ? 'Enter your password' : null,
                            trailing: IconButton(
                              icon: Icon(
                                _obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                color: kTextFaint,
                                size: 20,
                              ),
                              onPressed: () => setState(() => _obscure = !_obscure),
                            ),
                          ),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: () => context.push('/forgot'),
                              child: const Text('Forgot password?'),
                            ),
                          ),
                          const SizedBox(height: 4),
                          SizedBox(
                            height: 50,
                            child: FilledButton(
                              onPressed: loading ? null : _submit,
                              style: FilledButton.styleFrom(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              child: loading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2.5, color: Colors.white),
                                    )
                                  : const Text('Login',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'By continuing, you agree to our Terms & Conditions\nand Privacy Policy.',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: kTextFaint,
                                  height: 1.4,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Status-bar scrim so the time/icons stay legible over the art.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: topInset,
            child: const ColoredBox(color: Color(0x22000000)),
          ),
        ],
      ),
    );
  }
}

/// Rounded field with a tinted icon chip, matching the login mockup.
class _IconField extends StatelessWidget {
  const _IconField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscureText = false,
    this.keyboardType,
    this.autofillHints,
    this.validator,
    this.onSubmitted,
    this.trailing,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final String? Function(String?)? validator;
  final void Function(String)? onSubmitted;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      validator: validator,
      onFieldSubmitted: onSubmitted,
      style: const TextStyle(color: kText, fontSize: 15),
      decoration: InputDecoration(
        hintText: hint,
        isDense: true,
        filled: true,
        fillColor: kPaper,
        hintStyle: const TextStyle(color: kTextFaint, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(vertical: 13, horizontal: 6),
        prefixIcon: Container(
          margin: const EdgeInsets.fromLTRB(8, 7, 8, 7),
          width: 34,
          decoration: BoxDecoration(
            color: kGreen.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: kGreen, size: 18),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 50, minHeight: 34),
        suffixIcon: trailing,
        suffixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 34),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kLedgerLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kGreen, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kRed),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: kRed, width: 1.5),
        ),
      ),
    );
  }
}
