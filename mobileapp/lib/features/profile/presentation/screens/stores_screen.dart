import 'package:flutter/material.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/constants/app_radius.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/core/widgets/app_scaffold.dart';

/// Store directory. This list is static on both the web app and here (web's
/// `useCMS().stores` is a hardcoded `defaultStores` — there is no backend
/// endpoint). Phone and directions are now actionable via the OS.
class StoresScreen extends StatelessWidget {
  const StoresScreen({super.key});

  static const _stores = [
    {
      'name': 'FreshCart Dark Store #101 — Kukatpally',
      'address': 'Plot 45, Phase 3, KPHB Colony, Kukatpally, Hyderabad, 500072',
      'hours': '6:00 AM – 11:30 PM daily',
      'phone': '+91 40 6789 1234',
      'eta': '8–10 min',
    },
    {
      'name': 'FreshCart Dark Store #102 — HITEC City',
      'address': 'Level 1, Mindspace IT Park, Madhapur, Hyderabad, 500081',
      'hours': '6:00 AM – 12:00 AM daily',
      'phone': '+91 40 6789 5678',
      'eta': '10–12 min',
    },
    {
      'name': 'FreshCart Hub #201 — Indiranagar',
      'address': '100 Feet Road, 12th Main, Indiranagar, Bengaluru, 560038',
      'hours': '6:00 AM – 11:30 PM daily',
      'phone': '+91 80 4567 8901',
      'eta': '10–15 min',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

    return AppScaffold(
      title: 'Store locations',
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: _stores.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final s = _stores[i];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surface,
              borderRadius: AppRadius.brLg,
              border: Border.all(color: isDark ? AppColors.dividerDark : AppColors.divider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.storefront_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(s['name']!, style: AppTypography.title(textColor))),
                  ],
                ),
                const SizedBox(height: 8),
                Text(s['address']!, style: AppTypography.bodySmall(subColor)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.access_time_rounded, size: 14, color: subColor),
                    const SizedBox(width: 4),
                    Text(s['hours']!, style: AppTypography.bodySmall(subColor)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: AppRadius.brXs,
                      ),
                      child: Text('ETA ${s['eta']}', style: AppTypography.labelSmall(AppColors.primaryText)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => dialPhone(s['phone']!),
                        icon: const Icon(Icons.call_rounded, size: 16),
                        label: const Text('Call'),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => openMaps(query: s['address']),
                        icon: const Icon(Icons.directions_rounded, size: 16),
                        label: const Text('Directions'),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: AppRadius.brSm),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
