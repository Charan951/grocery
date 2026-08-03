import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';

class StoresScreen extends StatelessWidget {
  const StoresScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final stores = [
      {
        'name': 'FreshCart Dark Store #101 - Kukatpally',
        'address': 'Plot 45, Phase 3, KPHB Colony, Kukatpally, Hyderabad, 500072',
        'hours': '6:00 AM - 11:30 PM (Daily)',
        'phone': '+91 40 6789 1234',
        'eta': '8-10 mins',
      },
      {
        'name': 'FreshCart Dark Store #102 - HITEC City',
        'address': 'Level 1, Mindspace IT Park, Madhapur, Hyderabad, 500081',
        'hours': '6:00 AM - 12:00 AM (Daily)',
        'phone': '+91 40 6789 5678',
        'eta': '10-12 mins',
      },
      {
        'name': 'FreshCart Hub #201 - Indiranagar',
        'address': '100 Feet Road, 12th Main, Indiranagar, Bengaluru, 560038',
        'hours': '6:00 AM - 11:30 PM (Daily)',
        'phone': '+91 80 4567 8901',
        'eta': '10-15 mins',
      },
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Store & Dark Store Locations'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: stores.length,
          itemBuilder: (context, index) {
            final store = stores[index];
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              child: GlassCard(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 22),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            store['name']!,
                            style: AppTypography.title(isDark ? Colors.white : AppColors.textPrimary).copyWith(fontSize: 15),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(store['address']!, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.access_time_rounded, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(store['hours']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                          child: Text('ETA: ${store['eta']}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF00A86B))),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
