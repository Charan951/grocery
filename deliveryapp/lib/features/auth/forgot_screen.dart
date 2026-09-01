import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';

class ForgotScreen extends ConsumerStatefulWidget {
  const ForgotScreen({super.key});
  @override
  ConsumerState<ForgotScreen> createState() => _ForgotScreenState();
}

class _ForgotScreenState extends ConsumerState<ForgotScreen> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _pass = TextEditingController();
  bool _sent = false;
  bool _busy = false;
  String? _devCode;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _pass.dispose();
    super.dispose();
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  Future<void> _send() async {
    if (!_email.text.contains('@')) return _snack('Enter a valid email');
    setState(() => _busy = true);
    try {
      final r = await ref.read(apiProvider).forgot(_email.text.trim());
      setState(() {
        _sent = true;
        _devCode = r['devCode']?.toString();
      });
      _snack(_devCode != null ? 'Test mode — code: $_devCode' : 'If that account exists, a code was sent.');
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    if (_code.text.trim().isEmpty || _pass.text.length < 6) return _snack('Enter the code and a 6+ char password');
    setState(() => _busy = true);
    try {
      await ref.read(apiProvider).reset(_email.text.trim(), _code.text.trim(), _pass.text);
      if (!mounted) return;
      _snack('Password updated. Please sign in.');
      context.go('/login');
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                  enabled: !_sent,
                ),
                const SizedBox(height: 12),
                if (!_sent)
                  FilledButton(onPressed: _busy ? null : _send, child: const Text('Send reset code'))
                else ...[
                  TextField(controller: _code, decoration: const InputDecoration(labelText: 'Reset code')),
                  const SizedBox(height: 12),
                  TextField(controller: _pass, obscureText: true, decoration: const InputDecoration(labelText: 'New password')),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _busy ? null : _reset, child: const Text('Set new password')),
                  TextButton(onPressed: _busy ? null : _send, child: const Text('Resend code')),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
