import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:freshcart_delivery/core/config/app_config.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(authProvider.select((s) => s.profile));
    return Scaffold(
      appBar: AppBar(title: const Text('Profile & settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(children: [
                CircleAvatar(radius: 28, backgroundColor: kBrand.withValues(alpha: 0.15),
                    child: const Icon(Icons.person, color: kBrand)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(p?.name ?? '—', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    Text(p?.email ?? '', style: const TextStyle(color: Colors.black54, fontSize: 12.5)),
                    Text('${p?.vehicleType ?? 'bike'}  ·  ⭐ ${(p?.rating ?? 5).toStringAsFixed(1)}',
                        style: const TextStyle(color: Colors.black54, fontSize: 12.5)),
                  ]),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.check_circle_outline),
                title: const Text('Completed deliveries'),
                trailing: Text('${p?.completedCount ?? 0}'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.cancel_outlined),
                title: const Text('Failed deliveries'),
                trailing: Text('${p?.failedCount ?? 0}'),
              ),
            ]),
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.my_location_outlined),
                title: const Text('Location permission'),
                subtitle: const Text('Required to go online'),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () => launchUrl(Uri.parse('app-settings:'), mode: LaunchMode.externalApplication),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.support_agent_outlined),
                title: const Text('Help & support'),
                onTap: () => launchUrl(Uri.parse('tel:+918049123456')),
              ),
              const Divider(height: 1),
              const ListTile(
                leading: Icon(Icons.info_outline),
                title: Text('App'),
                trailing: Text('v1.0.0'),
              ),
              ListTile(
                dense: true,
                title: Text('Env: ${AppConfig.env}', style: const TextStyle(color: Colors.black45, fontSize: 11)),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}
