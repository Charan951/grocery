import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';
import 'package:freshcart/features/authentication/presentation/controllers/auth_controller.dart';

class LocationSelectScreen extends ConsumerStatefulWidget {
  const LocationSelectScreen({super.key});

  @override
  ConsumerState<LocationSelectScreen> createState() => _LocationSelectScreenState();
}

class _LocationSelectScreenState extends ConsumerState<LocationSelectScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authState = ref.read(authProvider);
      if (!authState.locationPermissionGranted || authState.user?.selectedAddress == null) {
        _handleUseCurrentLocation();
      }
    });
  }

  Future<void> _handleUseCurrentLocation() async {
    if (!mounted) return;
    context.push('/map_selection?autoLocate=true');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final addresses = authState.user?.addresses ?? [];
    final selectedAddressId = authState.user?.selectedAddress?['id'];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: Text(
          'Select Your Location',
          style: AppTypography.title(isDark ? Colors.white : AppColors.textPrimary).copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: Stack(
        children: [
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  
                  // Search Bar
                  GlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    height: 52,
                    borderRadius: 16,
                    color: isDark ? Colors.white.withOpacity(0.04) : Colors.white,
                    borderColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            style: AppTypography.bodyMedium(
                              isDark ? Colors.white : AppColors.textPrimary,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Search an area or address',
                              hintStyle: AppTypography.bodyMedium(
                                isDark ? Colors.white30 : Colors.black38,
                              ),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        Icon(
                          Icons.search_rounded,
                          color: isDark ? Colors.white54 : Colors.black45,
                          size: 22,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Action Cards Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Use Current Location
                      _buildActionCard(
                        context,
                        isDark,
                        icon: Icons.my_location_rounded,
                        iconColor: Colors.deepOrangeAccent,
                        title: 'Use Current Location',
                        onTap: _handleUseCurrentLocation,
                      ),
                      // Add New Address
                      _buildActionCard(
                        context,
                        isDark,
                        icon: Icons.add_box_outlined,
                        iconColor: AppColors.primary,
                        title: 'Add New Address',
                        onTap: () {
                          context.push('/map_selection');
                        },
                      ),
                      // Request Address
                      _buildActionCard(
                        context,
                        isDark,
                        icon: Icons.chat_bubble_outline_rounded,
                        iconColor: Colors.green,
                        title: 'Request Address',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Address request link copied to clipboard!'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Saved Addresses Section Header
                  Text(
                    'SAVED ADDRESSES',
                    style: AppTypography.labelSmall(
                      isDark ? Colors.white38 : Colors.black45,
                    ).copyWith(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                  ),
                  const SizedBox(height: 12),

                  // Saved Addresses List
                  Expanded(
                    child: addresses.isEmpty
                        ? Center(
                            child: Text(
                              'No saved addresses yet.',
                              style: AppTypography.bodyMedium(
                                isDark ? Colors.white30 : Colors.black38,
                              ),
                            ),
                          )
                        : ListView.builder(
                            itemCount: addresses.length,
                            physics: const BouncingScrollPhysics(),
                            itemBuilder: (context, index) {
                              final addr = addresses[index];
                              final id = addr['id'] as String;
                              final isSelected = selectedAddressId == id;

                              return GestureDetector(
                                onTap: () {
                                  ref.read(authProvider.notifier).selectAddress(id);
                                  context.pop();
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
                                        // Address Type Icon
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: isSelected
                                                ? AppColors.primary.withOpacity(0.12)
                                                : (isDark ? Colors.white10 : Colors.black.withOpacity(0.04)),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            addr['tag'] == 'Home' 
                                                ? Icons.home_rounded 
                                                : (addr['tag'] == 'Work' ? Icons.work_rounded : Icons.location_on_rounded),
                                            color: isSelected ? AppColors.primary : (isDark ? Colors.white70 : AppColors.textPrimary),
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        
                                        // Address Details Text
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Text(
                                                    addr['tag'] as String,
                                                    style: AppTypography.labelLarge(
                                                      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                                    ).copyWith(fontWeight: FontWeight.bold),
                                                  ),
                                                  if (isSelected) ...[
                                                    const SizedBox(width: 8),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: AppColors.primary.withOpacity(0.15),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: Text(
                                                        'SELECTED',
                                                        style: AppTypography.bodySmall(AppColors.primary).copyWith(
                                                          fontSize: 8,
                                                          fontWeight: FontWeight.bold,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                addr['addressLine'] as String,
                                                style: AppTypography.bodySmall(
                                                  isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                                ).copyWith(height: 1.3),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),
                                        
                                        // Options dots
                                        IconButton(
                                          icon: const Icon(Icons.more_vert_rounded),
                                          color: isDark ? Colors.white54 : Colors.black38,
                                          onPressed: () {
                                            // Mock Action
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context,
    bool isDark, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required VoidCallback onTap,
  }) {
    final cardWidth = (MediaQuery.of(context).size.width - 64) / 3;
    return GestureDetector(
      onTap: onTap,
      child: GlassCard(
        width: cardWidth,
        height: 104,
        padding: const EdgeInsets.all(12),
        color: isDark ? Colors.white.withOpacity(0.02) : Colors.white,
        borderColor: isDark ? Colors.white10 : Colors.black.withOpacity(0.04),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: iconColor,
              size: 26,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.bodySmall(
                isDark ? Colors.white70 : AppColors.textPrimary,
              ).copyWith(fontWeight: FontWeight.w600, fontSize: 11, height: 1.2),
            ),
          ],
        ),
      ),
    );
  }
}
