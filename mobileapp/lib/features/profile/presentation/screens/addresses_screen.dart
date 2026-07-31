import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/core/widgets/buttons.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class AddressesScreen extends ConsumerWidget {
  const AddressesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final authState = ref.watch(authProvider);
    final addresses = authState.user?.addresses ?? [];
    final selectedAddressId = authState.user?.selectedAddress?['id'];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Saved Addresses'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              Expanded(
                child: addresses.isEmpty
                    ? Center(
                        child: Text(
                          'No saved addresses. Add one below!',
                          style: TextStyle(color: isDark ? Colors.white30 : Colors.black38),
                        ),
                      )
                    : ListView.builder(
                        itemCount: addresses.length,
                        itemBuilder: (context, index) {
                          final addr = addresses[index];
                          final id = addr['id'] as String;
                          final isSelected = selectedAddressId == id;

                          return GestureDetector(
                            onTap: () {
                              ref.read(authProvider.notifier).selectAddress(id);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Delivery address changed to ${addr['tag']}'),
                                  duration: const Duration(seconds: 1),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: GlassCard(
                                padding: const EdgeInsets.all(16),
                                color: isSelected
                                    ? AppColors.primary.withOpacity(0.08)
                                    : (isDark ? Colors.white.withOpacity(0.02) : Colors.white),
                                borderColor: isSelected
                                    ? AppColors.primary
                                    : (isDark ? Colors.white10 : Colors.black.withOpacity(0.04)),
                                child: Row(
                                  children: [
                                    Icon(
                                      addr['tag'] == 'Home' ? Icons.home_rounded : Icons.work_rounded,
                                      color: isSelected ? AppColors.primary : (isDark ? Colors.white70 : AppColors.textPrimary),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            addr['tag'] as String,
                                            style: AppTypography.labelLarge(
                                              isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            addr['addressLine'] as String,
                                            style: AppTypography.bodySmall(
                                              isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      isSelected ? Icons.check_circle_rounded : Icons.circle_outlined,
                                      color: isSelected ? AppColors.primary : (isDark ? Colors.white30 : Colors.black26),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
              
              PrimaryButton(
                text: 'Add New Address',
                onPressed: () {
                  // Simulate adding a mock address
                  ref.read(authProvider.notifier).addAddress({
                    'id': 'addr_${addresses.length + 1}',
                    'tag': 'Other',
                    'receiverName': 'John Doe',
                    'addressLine': 'Flat 801, Emerald Towers, Block C',
                    'city': 'Bengaluru',
                    'pincode': '560103',
                    'phone': '+91 9876543210',
                    'isDefault': false,
                  });
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
