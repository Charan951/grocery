import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/error/api_exception.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';
import 'package:freshcart/core/widgets/app_text_field.dart';
import 'package:freshcart/core/widgets/app_toast.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/loading_overlay.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

/// Edit name / email — `PUT /customers/me/profile`.
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final u = ref.read(authProvider).user;
    _name = TextEditingController(text: u?.name ?? '');
    _email = TextEditingController(text: u?.email ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _saving = true);
    try {
      await ref.read(authProvider.notifier).updateProfile(
            name: _name.text.trim(),
            email: _email.text.trim(),
          );
      if (!mounted) return;
      AppToast.success('Profile updated');
      if (context.canPop()) context.pop();
    } on ApiException catch (e) {
      if (mounted) AppToast.error(e.message);
    } catch (_) {
      if (mounted) AppToast.error('Could not save. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = ref.watch(authProvider.select((s) => s.user?.phone)) ?? '';
    return LoadingOverlay(
      isLoading: _saving,
      message: 'Saving…',
      child: AppScaffold(
        title: 'Edit profile',
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            children: [
              AppTextField(
                controller: _name,
                label: 'Full name',
                hintText: 'Your name',
                textInputAction: TextInputAction.next,
                validator: (v) =>
                    (v == null || v.trim().length < 2) ? 'Enter your name' : null,
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _email,
                label: 'Email',
                hintText: 'you@example.com',
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _save(),
                validator: (v) {
                  final s = (v ?? '').trim();
                  if (s.isEmpty) return null; // optional
                  final ok = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s);
                  return ok ? null : 'Enter a valid email';
                },
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Phone',
                initialValue: phone,
                enabled: false,
                helperText: 'Your number is used to sign in and cannot be changed here.',
              ),
              const SizedBox(height: 28),
              PrimaryButton(text: 'Save changes', isLoading: _saving, onPressed: _save),
            ],
          ),
        ),
      ),
    );
  }
}
