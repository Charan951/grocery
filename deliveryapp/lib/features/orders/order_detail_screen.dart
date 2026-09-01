import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/orders/order_controller.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(orderProvider(orderId));
    return Scaffold(
      appBar: AppBar(title: Text('Order $orderId')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorBox(message: '$e', onRetry: () => ref.read(orderProvider(orderId).notifier).load()),
        data: (o) => _Body(order: o),
      ),
    );
  }
}

class _Body extends ConsumerStatefulWidget {
  final DeliveryOrder order;
  const _Body({required this.order});
  @override
  ConsumerState<_Body> createState() => _BodyState();
}

class _BodyState extends ConsumerState<_Body> {
  bool _busy = false;

  DeliveryOrder get o => widget.order;

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  Future<void> _do(Future<void> Function() f) async {
    setState(() => _busy = true);
    try {
      await f();
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _navigateTo(Map<String, dynamic>? loc, String fallbackQuery) async {
    Uri uri;
    if (loc != null && loc['lat'] != null && loc['lng'] != null) {
      uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${loc['lat']},${loc['lng']}');
    } else {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(fallbackQuery)}');
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) _snack('Could not open Maps');
  }

  Future<void> _call() async {
    final digits = o.customerPhone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.contains('•') || digits.length < 6) return _snack('Number available once out for delivery');
    await launchUrl(Uri.parse('tel:$digits'));
  }

  Future<void> _whatsapp() async {
    final digits = o.customerPhone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 10) return _snack('Number available once out for delivery');
    await launchUrl(Uri.parse('https://wa.me/$digits'), mode: LaunchMode.externalApplication);
  }

  Future<void> _completeFlow() async {
    final ctl = ref.read(orderProvider(o.orderId).notifier);
    final otpCtrl = TextEditingController();
    String? photoB64;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Confirm delivery', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                const SizedBox(height: 4),
                const Text('Ask the customer for their 4-digit code.', style: TextStyle(color: Colors.black54)),
                const SizedBox(height: 14),
                TextField(
                  controller: otpCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  decoration: const InputDecoration(labelText: 'Delivery code', counterText: ''),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    final XFile? img = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 55, maxWidth: 1280);
                    if (img != null) {
                      final bytes = await img.readAsBytes();
                      setSt(() => photoB64 = 'data:image/jpeg;base64,${base64Encode(bytes)}');
                    }
                  },
                  icon: Icon(photoB64 == null ? Icons.photo_camera_outlined : Icons.check_circle),
                  label: Text(photoB64 == null ? 'Add proof photo (optional)' : 'Photo attached'),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Mark delivered'),
                ),
              ],
            ),
          ),
        ),
      ),
    ).then((confirmed) async {
      if (confirmed == true) {
        await _do(() => ctl.complete(otp: otpCtrl.text.trim().isEmpty ? null : otpCtrl.text.trim(), photoBase64: photoB64));
      }
    });
  }

  Future<void> _failFlow() async {
    const reasons = [
      'Customer not reachable',
      'Wrong / incomplete address',
      'Customer refused the order',
      'Customer not available',
      'Other',
    ];
    final noteCtrl = TextEditingController();
    final picked = ValueNotifier<String?>(null);
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ValueListenableBuilder<String?>(
            valueListenable: picked,
            builder: (ctx, sel, _) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Mark as failed', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                const SizedBox(height: 8),
                ...reasons.map((r) => ListTile(
                      leading: Icon(sel == r ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: sel == r ? kBrand : Colors.black38),
                      title: Text(r),
                      onTap: () => picked.value = r,
                    )),
                if (sel == 'Other')
                  TextField(controller: noteCtrl, decoration: const InputDecoration(labelText: 'Describe')),
                const SizedBox(height: 12),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
                  onPressed: sel == null ? null : () => Navigator.pop(ctx, true),
                  child: const Text('Confirm failed delivery'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    final sel = picked.value;
    if (ok == true && sel != null) {
      final reason = sel == 'Other' && noteCtrl.text.trim().isNotEmpty ? noteCtrl.text.trim() : sel;
      await _do(() => ref.read(orderProvider(o.orderId).notifier).fail(reason));
    }
  }

  ({String label, IconData icon, Future<void> Function() run})? _primaryAction() {
    final ctl = ref.read(orderProvider(o.orderId).notifier);
    switch (o.status) {
      case 'Assigned':
      case 'Ready':
        return (label: 'Arrived at store', icon: Icons.store_rounded, run: () => _do(ctl.pickupArrived));
      case 'Arrived At Store':
        return (label: 'Picked up — start delivery', icon: Icons.check_rounded, run: () => _do(ctl.pickedUp));
      case 'Out For Delivery':
        return (label: 'I have arrived', icon: Icons.pin_drop_rounded, run: () => _do(ctl.arrived));
      case 'Arrived':
        return (label: 'Complete delivery', icon: Icons.done_all_rounded, run: _completeFlow);
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctl = ref.read(orderProvider(o.orderId).notifier);
    final action = _primaryAction();
    final canFail = !['Delivered', 'Failed', 'Cancelled'].contains(o.status);

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: ctl.load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                _statusHeader(),
                const SizedBox(height: 14),
                _section('Customer', [
                  _kv(Icons.person_outline, o.customerName.isEmpty ? 'Customer' : o.customerName),
                  _kv(Icons.location_on_outlined, o.deliveryAddress, maxLines: 3),
                  _kv(Icons.payments_outlined,
                      '₹${o.totalAmount.toStringAsFixed(0)}  ·  ${o.isCOD ? 'COLLECT CASH' : o.paymentStatus}'),
                  const SizedBox(height: 6),
                  Row(children: [
                    Expanded(child: OutlinedButton.icon(onPressed: _call, icon: const Icon(Icons.call, size: 18), label: const Text('Call'))),
                    const SizedBox(width: 10),
                    Expanded(child: OutlinedButton.icon(onPressed: _whatsapp, icon: const Icon(Icons.chat, size: 18), label: const Text('WhatsApp'))),
                  ]),
                ]),
                const SizedBox(height: 12),
                _section('Navigate', [
                  OutlinedButton.icon(
                    onPressed: () => _navigateTo(
                      ['Assigned', 'Ready', 'Arrived At Store'].contains(o.status) ? o.pickup : o.deliveryLocation,
                      ['Assigned', 'Ready', 'Arrived At Store'].contains(o.status)
                          ? (o.pickup?['name'] ?? 'store').toString()
                          : o.deliveryAddress,
                    ),
                    icon: const Icon(Icons.navigation_rounded, size: 18),
                    label: Text(['Assigned', 'Ready', 'Arrived At Store'].contains(o.status)
                        ? 'Navigate to store'
                        : 'Navigate to customer'),
                  ),
                ]),
                const SizedBox(height: 12),
                _section('Items (${o.items.length})',
                    o.items.map((i) => _kv(Icons.circle, '${i.name}  ·  ${i.weightSpec}  ×${i.quantity}', small: true)).toList()),
                if (o.timeline.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _section('Timeline',
                      o.timeline.reversed.map((t) => _kv(Icons.check, '${t['status']}  —  ${t['note'] ?? ''}', small: true)).toList()),
                ],
                if (o.status == 'Failed' && o.failureReason.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _section('Failure reason', [_kv(Icons.error_outline, o.failureReason)]),
                ],
              ],
            ),
          ),
        ),
        if (action != null || canFail)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (action != null)
                    FilledButton.icon(
                      onPressed: _busy ? null : action.run,
                      icon: Icon(action.icon),
                      label: Text(action.label),
                    ),
                  if (canFail) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _busy ? null : _failFlow,
                      child: Text('Report a problem', style: TextStyle(color: Colors.red.shade700)),
                    ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _statusHeader() {
    final color = o.status == 'Delivered'
        ? kBrand
        : o.status == 'Failed' || o.status == 'Cancelled'
            ? Colors.red.shade700
            : Colors.orange.shade800;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Icon(Icons.local_shipping_rounded, color: color),
          const SizedBox(width: 12),
          Text(o.status, style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 16)),
        ]),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              ...children,
            ],
          ),
        ),
      );

  Widget _kv(IconData i, String t, {int maxLines = 1, bool small = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(i, size: small ? 8 : 16, color: Colors.black38),
          const SizedBox(width: 10),
          Expanded(child: Text(t, maxLines: maxLines, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: small ? 13 : 14))),
        ]),
      );
}

class _ErrorBox extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorBox({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded, size: 44, color: Colors.black26),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ]),
        ),
      );
}
