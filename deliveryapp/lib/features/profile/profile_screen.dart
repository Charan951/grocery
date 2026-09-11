import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:freshcart_delivery/core/config/app_config.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/core/widgets/tab_back_button.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';

const _vehicles = <String, String>{
  'bike': 'Bike',
  'scooter': 'Scooter',
  'bicycle': 'Bicycle',
  'car': 'Car',
  'on_foot': 'On foot',
};
String _vehicleLabel(String? v) => _vehicles[v] ?? 'Not set';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(authProvider.select((s) => s.profile));
    final available = p?.availability == 'available';
    final busy = p?.availability == 'busy';
    final statusText = available ? 'Online' : busy ? 'On a delivery' : 'Offline';
    final statusColor = available ? kGreen : busy ? kAmber : kTextFaint;

    return Scaffold(
      appBar: AppBar(
        leading: const TabBackButton(),
        title: const Text('Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Identity
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text(p?.name ?? 'Partner',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                        overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(statusText,
                        style: TextStyle(
                            color: statusColor, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.3)),
                  ),
                  if (p != null) ...[
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: () => _openEdit(context, ref, p),
                      borderRadius: BorderRadius.circular(8),
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(Icons.edit_outlined, size: 18, color: kTextFaint),
                      ),
                    ),
                  ],
                ]),
                const SizedBox(height: 6),
                Row(children: [
                  const Icon(Icons.star_rounded, size: 14, color: kAmber),
                  Text(
                    p?.ratingCount != null && p!.ratingCount > 0
                        ? ' ${p.rating.toStringAsFixed(1)} · ${p.ratingCount} rating${p.ratingCount == 1 ? '' : 's'}'
                        : ' No ratings yet',
                    style: const TextStyle(color: kTextMuted, fontSize: 12.5, fontWeight: FontWeight.w600),
                  ),
                ]),
              ]),
            ),
          ),
          const SizedBox(height: 12),

          // Stats
          Row(children: [
            _stat('Delivered', '${p?.completedCount ?? 0}', kGreen),
            const SizedBox(width: 10),
            _stat('Failed', '${p?.failedCount ?? 0}', kRed),
            const SizedBox(width: 10),
            _stat('Today', '₹${(p?.todayEarnings ?? 0).toStringAsFixed(0)}', kText),
          ]),
          const SizedBox(height: 20),

          _sectionLabel('Details'),
          Card(
            child: Column(children: [
              _detailRow(Icons.phone_outlined, 'Phone', p?.phone.isNotEmpty == true ? p!.phone : 'Not set'),
              const Divider(height: 1),
              _detailRow(Icons.mail_outline, 'Email', p?.email.isNotEmpty == true ? p!.email : 'Not set'),
              const Divider(height: 1),
              _detailRow(Icons.two_wheeler_outlined, 'Vehicle', _vehicleLabel(p?.vehicleType)),
            ]),
          ),
          const SizedBox(height: 20),

          _sectionLabel('Shortcuts'),
          Card(
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.account_balance_wallet_outlined),
                title: const Text('Earnings'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.go('/earnings'),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.notifications_none_rounded),
                title: const Text('Notifications'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.push('/notifications'),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          _sectionLabel('Support'),
          Card(
            child: Column(children: [
              ListTile(
                leading: const Icon(Icons.my_location_outlined),
                title: const Text('Location permission'),
                subtitle: const Text('Required to go online'),
                trailing: const Icon(Icons.open_in_new, size: 18),
                onTap: () =>
                    launchUrl(Uri.parse('app-settings:'), mode: LaunchMode.externalApplication),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.support_agent_outlined),
                title: const Text('Help & support'),
                onTap: () => launchUrl(Uri.parse('tel:+918049123456')),
              ),
              const Divider(height: 1),
              ListTile(
                dense: true,
                leading: const Icon(Icons.info_outline),
                title: const Text('App'),
                trailing: Text('v1.0.0 · ${AppConfig.env}',
                    style: const TextStyle(color: kTextFaint, fontSize: 11)),
              ),
            ]),
          ),
          const SizedBox(height: 20),

          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: kRed,
              backgroundColor: kRedSoft,
              side: const BorderSide(color: kRed),
            ),
            icon: const Icon(Icons.logout),
            label: const Text('Log out'),
          ),
        ],
      ),
    );
  }

  static Widget _stat(String label, String value, Color color) => Expanded(
        child: Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
            child: Column(children: [
              Text(value,
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: color)),
              const SizedBox(height: 3),
              Text(label,
                  style: const TextStyle(color: kTextFaint, fontSize: 10.5, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
      );

  static Widget _sectionLabel(String s) => Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 6),
        child: Text(s.toUpperCase(),
            style: const TextStyle(
                color: kTextFaint, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
      );

  static Widget _detailRow(IconData icon, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(children: [
          Icon(icon, size: 16, color: kTextFaint),
          const SizedBox(width: 12),
          Text(label.toUpperCase(),
              style: const TextStyle(
                  color: kTextFaint, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.8)),
          const Spacer(),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.right,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: kText)),
          ),
        ]),
      );

  void _openEdit(BuildContext context, WidgetRef ref, dynamic profile) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _EditProfileSheet(
        initialName: profile.name as String,
        initialPhone: profile.phone as String,
        initialVehicle: profile.vehicleType as String,
        onSave: (name, phone, vehicle) => ref
            .read(authProvider.notifier)
            .updateProfile(name: name, phone: phone, vehicleType: vehicle),
      ),
    );
  }
}

class _EditProfileSheet extends StatefulWidget {
  const _EditProfileSheet({
    required this.initialName,
    required this.initialPhone,
    required this.initialVehicle,
    required this.onSave,
  });
  final String initialName;
  final String initialPhone;
  final String initialVehicle;
  final Future<void> Function(String name, String phone, String vehicle) onSave;

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final TextEditingController _name = TextEditingController(text: widget.initialName);
  late final TextEditingController _phone = TextEditingController(text: widget.initialPhone);
  late String _vehicle = _vehicles.containsKey(widget.initialVehicle) ? widget.initialVehicle : 'bike';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    final phone = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (name.length < 2) {
      setState(() => _error = 'Enter your full name.');
      return;
    }
    if (phone.isNotEmpty && !RegExp(r'^[6-9]\d{9}$').hasMatch(phone)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.onSave(name, phone, _vehicle);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 4, 20, bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Edit profile', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          maxLength: 60,
          decoration: const InputDecoration(labelText: 'Full name', counterText: ''),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
          decoration: const InputDecoration(labelText: 'Phone', hintText: '10-digit mobile number'),
        ),
        const SizedBox(height: 16),
        const Text('VEHICLE',
            style: TextStyle(
                color: kTextMuted, fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _vehicles.entries.map((e) {
            final sel = _vehicle == e.key;
            return ChoiceChip(
              label: Text(e.value),
              selected: sel,
              onSelected: (_) => setState(() => _vehicle = e.key),
            );
          }).toList(),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: _saving ? null : _submit,
            child: _saving
                ? const SizedBox(
                    height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Save changes'),
          ),
        ),
      ]),
    );
  }
}
