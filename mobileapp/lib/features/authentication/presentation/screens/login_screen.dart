import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  int _activeTab = 0; // 0 = Phone OTP, 1 = Email

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _onSubmit() async {
    if (_formKey.currentState!.validate()) {
      if (_activeTab == 0) {
        final phone = _phoneController.text;
        await ref.read(authProvider.notifier).sendOtp(phone);
        if (mounted) {
          context.push('/otp?phone=$phone');
        }
      } else {
        final email = _emailController.text;
        await ref.read(authProvider.notifier).loginWithDemo();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Logged in with $email')),
          );
          context.go('/');
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 30),
                
                // Back button
                GestureDetector(
                  onTap: () => context.go('/onboarding'),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white10 : Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 15,
                        )
                      ],
                    ),
                    child: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 16,
                      color: isDark ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Headers
                Text(
                  'Welcome to FreshCart',
                  style: AppTypography.display(
                    isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                  ).copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Log in using Phone Number OTP or Email Address.',
                  style: AppTypography.bodyMedium(
                    isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                  ).copyWith(height: 1.45),
                ),
                const SizedBox(height: 24),

                // Auth Method Tabs (Phone OTP vs Email Login - matching Web CustomerAuthModal)
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white10 : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _activeTab = 0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _activeTab == 0 ? (isDark ? const Color(0xFF1C1C1E) : Colors.white) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: _activeTab == 0 ? [const BoxShadow(color: Colors.black12, blurRadius: 4)] : [],
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '📱 Phone OTP',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: _activeTab == 0 ? AppColors.primary : (isDark ? Colors.white70 : Colors.black87),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _activeTab = 1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _activeTab == 1 ? (isDark ? const Color(0xFF1C1C1E) : Colors.white) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: _activeTab == 1 ? [const BoxShadow(color: Colors.black12, blurRadius: 4)] : [],
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '✉️ Email Login',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: _activeTab == 1 ? AppColors.primary : (isDark ? Colors.white70 : Colors.black87),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                
                // Form Input Card
                GlassCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      if (_activeTab == 0)
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          style: AppTypography.bodyLarge(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ).copyWith(letterSpacing: 1.5, fontWeight: FontWeight.w600),
                          decoration: InputDecoration(
                            hintText: '98765 43210',
                            hintStyle: AppTypography.bodyLarge(
                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                            ).copyWith(letterSpacing: 1.5),
                            prefixText: '+91 ',
                            prefixStyle: AppTypography.bodyLarge(
                              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                            ).copyWith(fontWeight: FontWeight.w600),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(
                                color: isDark ? Colors.white24 : AppColors.divider,
                              ),
                            ),
                            counterText: '',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          ),
                          validator: (value) {
                            if (value == null || value.length < 10) {
                              return 'Please enter a valid 10-digit phone number';
                            }
                            return null;
                          },
                        )
                      else
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          style: AppTypography.bodyLarge(
                            isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                          ).copyWith(fontWeight: FontWeight.w600),
                          decoration: InputDecoration(
                            hintText: 'customer@example.com',
                            prefixIcon: const Icon(Icons.email_outlined, color: AppColors.primary),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(
                                color: isDark ? Colors.white24 : AppColors.divider,
                              ),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          ),
                          validator: (value) {
                            if (value == null || !value.contains('@')) {
                              return 'Please enter a valid email address';
                            }
                            return null;
                          },
                        ),
                    ],
                  ),
                ),
                const Spacer(),
                
                // CTA Action Button
                PrimaryButton(
                  text: _activeTab == 0 ? 'Send Verification Code' : 'Log In via Email',
                  isLoading: authState.isLoading,
                  onPressed: _onSubmit,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
