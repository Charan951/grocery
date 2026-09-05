import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/phone_field.dart';
import 'package:freshcart/features/authentication/presentation/auth_routing.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/authentication/presentation/widgets/auth_scaffold.dart';

/// Reached when an email typed on the login screen has no account yet:
/// name, password and phone — same fields as the web registration form.
class RegisterScreen extends ConsumerStatefulWidget {
  final String email;
  const RegisterScreen({super.key, required this.email});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _password = TextEditingController();
  final _phone = PhoneFieldController();
  String? _nameError;
  String? _passwordError;
  bool _obscure = true;

  @override
  void dispose() {
    _name.dispose();
    _password.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _nameError = _name.text.trim().isEmpty ? 'Enter your name' : null;
      _passwordError = _password.text.length < 6 ? 'Password must be at least 6 characters' : null;
    });
    if (_nameError != null || _passwordError != null) return;
    if (!_phone.isValid) {
      AppToast.error('Enter a valid 10-digit mobile number');
      return;
    }

    final ok = await ref.read(authProvider.notifier).register(
          name: _name.text.trim(),
          email: widget.email,
          password: _password.text,
          phone: _phone.digits,
        );
    if (!mounted) return;
    if (ok) {
      AppToast.success('Account created');
      routeAfterLogin(context, ref.read(authProvider));
    } else {
      AppToast.error(ref.read(authProvider).error ?? 'Could not create your account.');
    }
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider.select((s) => s.isLoading));

    return AuthScaffold(
      onBack: _back,
      title: 'Create your account',
      subtitle: 'No account found for ${widget.email} — let\'s set one up.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            controller: _name,
            label: 'Full name',
            hintText: 'Your name',
            autofocus: true,
            errorText: _nameError,
            textInputAction: TextInputAction.next,
            onChanged: (_) {
              if (_nameError != null) setState(() => _nameError = null);
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _password,
            label: 'Password',
            hintText: 'Create a password (min 6 characters)',
            obscureText: _obscure,
            errorText: _passwordError,
            keyboardType: TextInputType.visiblePassword,
            textInputAction: TextInputAction.next,
            onChanged: (_) {
              if (_passwordError != null) setState(() => _passwordError = null);
            },
            suffix: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          const SizedBox(height: 16),
          PhoneField(
            controller: _phone,
            onSubmitted: _submit,
          ),
        ],
      ),
      cta: Column(
        children: [
          PrimaryButton(
            text: 'Create account',
            isLoading: loading,
            onPressed: _submit,
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: loading
                ? null
                : () => context.pushReplacement('/password?email=${Uri.encodeComponent(widget.email)}'),
            child: Text(
              'Already have an account? Sign in',
              style: AppTypography.labelMedium(AppColors.primaryText).copyWith(decoration: TextDecoration.underline),
            ),
          ),
        ],
      ),
    );
  }
}
