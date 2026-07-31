import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/widgets/glass_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final List<Map<String, String>> notifications = [
      {
        'title': 'Order Dispatched!',
        'body': 'Your order has been dispatched from the local hub. ETA: 10 mins.',
        'time': '10 mins ago',
        'type': 'delivery',
      },
      {
        'title': 'VIP Cashback Credited',
        'body': '₹25.00 cash back added to wallet for your last grocery purchase.',
        'time': '2 hours ago',
        'type': 'wallet',
      },
      {
        'title': 'Weekend Organic Sale Live',
        'body': 'Get up to 30% discount on farm fresh organic spinach, avocados, berries.',
        'time': '1 day ago',
        'type': 'offer',
      }
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
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
            children: [
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  physics: const BouncingScrollPhysics(),
                  itemCount: notifications.length,
                  itemBuilder: (context, index) {
                    final item = notifications[index];
                    IconData icon;
                    if (item['type'] == 'delivery') {
                      icon = Icons.local_shipping_rounded;
                    } else if (item['type'] == 'wallet') {
                      icon = Icons.wallet_rounded;
                    } else {
                      icon = Icons.discount_rounded;
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(icon, color: AppColors.primary, size: 20),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        item['title']!,
                                        style: AppTypography.labelLarge(
                                          isDark ? AppColors.textPrimaryDark : AppColors.textPrimary,
                                        ),
                                      ),
                                      Text(
                                        item['time']!,
                                        style: AppTypography.bodySmall(
                                          isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                        ).copyWith(fontSize: 11),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item['body']!,
                                    style: AppTypography.bodySmall(
                                      isDark ? AppColors.textSecondaryDark : AppColors.textSecondary,
                                    ).copyWith(height: 1.3),
                                  ),
                                ],
                              ),
                            ),
                          ],
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
    );
  }
}
