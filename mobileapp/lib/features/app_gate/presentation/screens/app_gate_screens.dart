import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/services/app_config.dart';
import 'package:freshcart/core/utils/launch.dart';
import 'package:freshcart/core/widgets/buttons.dart';

class _GateShell extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;
  final Widget primary;
  final Widget? secondary;
  const _GateShell({
    required this.icon,
    required this.title,
    required this.body,
    required this.primary,
    this.secondary,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
    final subColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 40, color: AppColors.primaryText),
                ),
                const SizedBox(height: 24),
                Text(title, textAlign: TextAlign.center, style: AppTypography.h2(textColor)),
                const SizedBox(height: 12),
                Text(body,
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyMedium(subColor).copyWith(height: 1.55)),
                const SizedBox(height: 28),
                primary,
                if (secondary != null) ...[const SizedBox(height: 8), secondary!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shown when `appConfig.maintenance` is true. Retry re-checks the gate.
class MaintenanceScreen extends ConsumerWidget {
  const MaintenanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cfg = ref.watch(appConfigProvider).valueOrNull ?? AppConfig.permissive;
    final msg = cfg.maintenanceMessage.isNotEmpty
        ? cfg.maintenanceMessage
        : 'FreshCart is briefly down for maintenance. Please try again shortly.';
    return _GateShell(
      icon: Icons.build_rounded,
      title: 'Down for maintenance',
      body: msg,
      primary: PrimaryButton(
        text: 'Try again',
        onPressed: () async {
          ref.invalidate(appConfigProvider);
          final gate = await ref.read(appGateProvider.future);
          if (!context.mounted) return;
          if (gate == AppGate.ok) {
            context.go('/');
          } else if (gate == AppGate.forceUpdate) {
            context.go('/force_update');
          }
        },
      ),
      secondary: cfg.supportEmail.isNotEmpty
          ? TextButton(
              onPressed: () => openUrl('mailto:${cfg.supportEmail}'),
              child: Text('Contact support', style: AppTypography.labelMedium(AppColors.primaryText)),
            )
          : null,
    );
  }
}

/// Shown when the running version is below `appConfig.minSupportedVersion`.
class ForceUpdateScreen extends ConsumerWidget {
  const ForceUpdateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cfg = ref.watch(appConfigProvider).valueOrNull ?? AppConfig.permissive;
    return _GateShell(
      icon: Icons.system_update_rounded,
      title: 'Update required',
      body: 'This version of FreshCart is no longer supported. Please update to '
          'the latest version to keep ordering.',
      primary: PrimaryButton(
        text: 'Update now',
        onPressed: () {
          if (cfg.updateUrl.isNotEmpty) {
            openUrl(cfg.updateUrl);
          } else {
            openUrl('https://play.google.com/store/apps/details?id=com.freshcart.app');
          }
        },
      ),
      secondary: TextButton(
        onPressed: () async {
          ref.invalidate(appConfigProvider);
          final gate = await ref.read(appGateProvider.future);
          if (context.mounted && gate == AppGate.ok) context.go('/');
        },
        child: Text('I have updated', style: AppTypography.labelMedium(AppColors.primaryText)),
      ),
    );
  }
}
