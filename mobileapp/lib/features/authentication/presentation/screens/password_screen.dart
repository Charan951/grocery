import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/features/authentication/presentation/auth_routing.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';
import 'package:freshcart/features/authentication/presentation/widgets/auth_scaffold.dart';

/// Step 2 of the email sign-in path: password entry. A 404 "no account"
/// result routes onward to registration instead of a dead end.
class PasswordScreen extends ConsumerStatefulWidget {
  final String email;
  const PasswordScreen({super.key, required this.email});

  @override
  ConsumerState<PasswordScreen> createState() => _PasswordScreenState();
}

class _PasswordScreenState extends ConsumerState<PasswordScreen> {
  final _password = TextEditingController();
  String? _error;
  bool _obscure = true;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_password.text.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters');
      return;
    }
    setState(() => _error = null);

    final result = await ref.read(authProvider.notifier).loginEmail(widget.email, _password.text);
    if (!mounted) return;

    switch (result) {
      case 'ok':
        AppToast.success('Signed in successfully');
        routeAfterLogin(context, ref.read(authProvider));
        break;
      case 'not_found':
        context.pushReplacement('/register?email=${Uri.encodeComponent(widget.email)}');
        break;
      default:
        final msg = ref.read(authProvider).error ?? 'Incorrect password. Please try again.';
        setState(() => _error = msg);
        AppToast.error(msg);
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AuthScaffold(
      onBack: _back,
      title: 'Enter your password',
      subtitle: 'Signing in as ${widget.email}',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppTextField(
            controller: _password,
            label: 'Password',
            hintText: 'Your password',
            obscureText: _obscure,
            autofocus: true,
            errorText: _error,
            keyboardType: TextInputType.visiblePassword,
            textInputAction: TextInputAction.done,
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
            onSubmitted: (_) => _submit(),
            suffix: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            "Forgot it? Contact support to reset your password.",
            style: AppTypography.bodySmall(
              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
            ),
          ),
        ],
      ),
      cta: PrimaryButton(
        text: 'Sign in',
        isLoading: loading,
        onPressed: _submit,
      ),
    );
  }
}
