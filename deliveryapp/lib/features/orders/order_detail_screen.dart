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
                const Text('Ask the customer for their 4-digit code.', style: TextStyle(color: kTextMuted)),
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
                          color: sel == r ? kBrand : kTextFaint),
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
      case 'Failed':
        if (o.needsReturn) {
          return (label: 'Returned to store', icon: Icons.store_mall_directory_rounded, run: () => _do(ctl.markReturned));
        }
        return null;
      default:
        return null;
    }
  }

  static const _pickupStatuses = ['Assigned', 'Ready', 'Arrived At Store'];

  ({Color fg, Color bg, IconData icon, String next})? _statusMeta() {
    switch (o.status) {
      case 'Assigned':
        return (fg: kAmber, bg: kAmberSoft, icon: Icons.inventory_2_rounded, next: 'Head to the store to pick up this order.');
      case 'Ready':
        return (fg: kAmber, bg: kAmberSoft, icon: Icons.inventory_2_rounded, next: 'Order is packed — go pick it up.');
      case 'Arrived At Store':
        return (fg: kAmber, bg: kAmberSoft, icon: Icons.storefront_rounded, next: 'Confirm pickup once you have the bag.');
      case 'Out For Delivery':
        return (fg: kGreen, bg: kGreenSoft, icon: Icons.local_shipping_rounded, next: 'On the way to the customer.');
      case 'Arrived':
        return (fg: kGreen, bg: kGreenSoft, icon: Icons.pin_drop_rounded, next: 'At the drop-off — collect code & complete.');
      case 'Delivered':
        return (fg: kGreen, bg: kGreenSoft, icon: Icons.task_alt_rounded, next: 'Delivered successfully.');
      case 'Failed':
      case 'Cancelled':
        return (fg: kRed, bg: kRedSoft, icon: Icons.report_problem_rounded, next: o.needsReturn ? 'Return this order to the store.' : 'This delivery was not completed.');
      default:
        return (fg: kTextMuted, bg: kLedgerLine, icon: Icons.local_shipping_rounded, next: '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final ctl = ref.read(orderProvider(o.orderId).notifier);
    final action = _primaryAction();
    final canFail = !['Delivered', 'Failed', 'Cancelled'].contains(o.status);
    final isPickupLeg = _pickupStatuses.contains(o.status);

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: ctl.load,
            color: kGreen,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                _statusHeader(),
                const SizedBox(height: 12),
                _section('Customer', [
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: kGreenSoft,
                      child: Text(
                        (o.customerName.isEmpty ? 'C' : o.customerName.trim()[0]).toUpperCase(),
                        style: const TextStyle(color: kGreen, fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(o.customerName.isEmpty ? 'Customer' : o.customerName,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kText)),
                        const SizedBox(height: 2),
                        Text(o.deliveryAddress, maxLines: 2, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, color: kTextMuted, height: 1.35)),
                      ]),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  Row(children: [
                    Icon(o.isCOD ? Icons.payments_rounded : Icons.check_circle_rounded,
                        size: 16, color: o.isCOD ? kAmber : kGreen),
                    const SizedBox(width: 8),
                    Text('₹${o.totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: kText)),
                    const SizedBox(width: 8),
                    _pill(o.isCOD ? 'COLLECT CASH' : o.paymentStatus, o.isCOD ? kAmber : kGreen, o.isCOD ? kAmberSoft : kGreenSoft),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: OutlinedButton.icon(onPressed: _call, icon: const Icon(Icons.call_rounded, size: 18), label: const Text('Call'))),
                    const SizedBox(width: 10),
                    Expanded(child: OutlinedButton.icon(onPressed: _whatsapp, icon: const Icon(Icons.chat_rounded, size: 18), label: const Text('WhatsApp'))),
                  ]),
                ]),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    backgroundColor: kSurface,
                    foregroundColor: kGreen,
                    side: const BorderSide(color: kGreen, width: 1.4),
                  ),
                  onPressed: () => _navigateTo(
                    isPickupLeg ? o.pickup : o.deliveryLocation,
                    isPickupLeg ? (o.pickup?['name'] ?? 'store').toString() : o.deliveryAddress,
                  ),
                  icon: const Icon(Icons.navigation_rounded, size: 18),
                  label: Text(isPickupLeg ? 'Navigate to store' : 'Navigate to customer'),
                ),
                const SizedBox(height: 12),
                _section('Items · ${o.items.length}',
                    [for (final i in o.items) _itemRow(i)], tight: true),
                if (o.timeline.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _section('Timeline', _timelineRows(), tight: true),
                ],
                if (o.status == 'Failed' && o.failureReason.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Card(
                    color: kRedSoft,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: kRed.withValues(alpha: 0.25))),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          const Icon(Icons.error_outline_rounded, size: 18, color: kRed),
                          const SizedBox(width: 8),
                          const Text('Failure reason', style: TextStyle(fontWeight: FontWeight.w800, color: kRed)),
                        ]),
                        const SizedBox(height: 8),
                        Text(o.failureReason, style: const TextStyle(fontSize: 13.5, color: kText, height: 1.4)),
                        if (o.needsReturn) ...[
                          const SizedBox(height: 8),
                          const Text('Bring this order back to the store, then tap "Returned to store".',
                              style: TextStyle(fontSize: 13, color: kTextMuted, height: 1.4)),
                        ],
                      ]),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        if (action != null || canFail)
          DecoratedBox(
            decoration: const BoxDecoration(
              color: kSurface,
              border: Border(top: BorderSide(color: kLedgerLine)),
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (action != null)
                      FilledButton.icon(
                        onPressed: _busy ? null : action.run,
                        icon: _busy
                            ? const SizedBox(
                                width: 18, height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Icon(action.icon),
                        label: Text(action.label),
                      ),
                    if (canFail) ...[
                      const SizedBox(height: 4),
                      TextButton.icon(
                        onPressed: _busy ? null : _failFlow,
                        icon: Icon(Icons.flag_outlined, size: 16, color: Colors.red.shade700),
                        label: Text('Report a problem', style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _statusHeader() {
    final meta = _statusMeta()!;
    return Card(
      color: meta.bg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: meta.fg.withValues(alpha: 0.2))),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: Icon(meta.icon, color: meta.fg, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(o.status, style: TextStyle(fontWeight: FontWeight.w800, color: meta.fg, fontSize: 16, letterSpacing: -0.1)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(o.orderId, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600)),
                ),
              ]),
              if (meta.next.isNotEmpty) ...[
                const SizedBox(height: 3),
                Text(meta.next, style: const TextStyle(fontSize: 12.5, color: kTextMuted, height: 1.3)),
              ],
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _pill(String label, Color fg, Color bg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(label,
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: fg, letterSpacing: 0.3)),
      );

  Widget _section(String title, List<Widget> children, {bool tight = false}) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title.toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5, color: kTextMuted, letterSpacing: 0.4)),
              SizedBox(height: tight ? 10 : 8),
              ...children,
            ],
          ),
        ),
      );

  Widget _itemRow(OrderItemLine i) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Container(
            width: 24, height: 24,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: kGreenSoft, borderRadius: BorderRadius.circular(7)),
            child: Text('${i.quantity}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: kGreen)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text('${i.name}  ·  ${i.weightSpec}',
                maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5, color: kText, fontWeight: FontWeight.w600)),
          ),
        ]),
      );

  List<Widget> _timelineRows() {
    final events = o.timeline.reversed.toList();
    return [
      for (var idx = 0; idx < events.length; idx++)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Column(children: [
              Container(
                width: 20, height: 20,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: idx == 0 ? kGreen : kGreenSoft,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.check_rounded, size: 13, color: idx == 0 ? Colors.white : kGreen),
              ),
              if (idx != events.length - 1)
                Container(width: 1.5, height: 22, color: kLedgerLine, margin: const EdgeInsets.symmetric(vertical: 2)),
            ]),
            const SizedBox(width: 10),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 1),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${events[idx]['status']}',
                      style: TextStyle(fontSize: 13.5, fontWeight: idx == 0 ? FontWeight.w800 : FontWeight.w600, color: kText)),
                  if ((events[idx]['note'] ?? '').toString().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text('${events[idx]['note']}', style: const TextStyle(fontSize: 12.5, color: kTextMuted, height: 1.3)),
                    ),
                ]),
              ),
            ),
          ]),
        ),
    ];
  }
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
            const Icon(Icons.wifi_off_rounded, size: 44, color: kTextFaint),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ]),
        ),
      );
}
