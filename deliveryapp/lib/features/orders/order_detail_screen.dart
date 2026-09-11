import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/core/widgets/delivery_map.dart';
import 'package:freshcart_delivery/features/orders/order_controller.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(orderProvider(orderId));
    return Scaffold(
      backgroundColor: kPaper,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Details',
              style: GoogleFonts.rubik(fontWeight: FontWeight.w700, fontSize: 17, color: kText),
            ),
            Text(
              '#$orderId',
              style: GoogleFonts.nunitoSans(fontSize: 12, fontWeight: FontWeight.w600, color: kTextMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Copy Order ID',
            icon: const Icon(Icons.copy_rounded, size: 19),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: orderId));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  content: Text('Order ID #$orderId copied to clipboard'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: async.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: kGreen, strokeWidth: 2.5),
        ),
        error: (e, _) => _ErrorBox(
          message: '$e',
          onRetry: () => ref.read(orderProvider(orderId).notifier).load(),
        ),
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
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        content: Text(m),
      ),
    );

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

  LatLng? _latLngFrom(Map<String, dynamic>? loc) {
    final lat = loc?['lat'];
    final lng = loc?['lng'];
    if (lat is num && lng is num) return LatLng(lat.toDouble(), lng.toDouble());
    return null;
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
    if (digits.contains('•') || digits.length < 6) return _snack('Customer phone is available once out for delivery');
    await launchUrl(Uri.parse('tel:$digits'));
  }

  Future<void> _whatsapp() async {
    final digits = o.customerPhone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 10) return _snack('Customer phone is available once out for delivery');
    final waNumber = digits.length == 10 ? '91$digits' : digits;
    await launchUrl(Uri.parse('https://wa.me/$waNumber'), mode: LaunchMode.externalApplication);
  }

  Future<void> _completeFlow() async {
    final ctl = ref.read(orderProvider(o.orderId).notifier);
    final otpCtrl = TextEditingController();
    String? photoB64;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: kSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(color: kLedgerLine, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: kGreenSoft, borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.verified_user_rounded, color: kGreen, size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Confirm Delivery', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: kText)),
                          Text('Ask customer for their 4-digit code', style: TextStyle(color: kTextMuted, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: otpCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.rubik(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 8),
                  decoration: InputDecoration(
                    hintText: '• • • •',
                    hintStyle: const TextStyle(color: kTextFaint, letterSpacing: 8),
                    filled: true,
                    fillColor: kPaper,
                    counterText: '',
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kLedgerLine)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kLedgerLine)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kGreen, width: 2)),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    backgroundColor: photoB64 != null ? kGreenSoft : Colors.transparent,
                    side: BorderSide(color: photoB64 != null ? kGreen : kLedgerLine),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () async {
                    final XFile? img = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 55, maxWidth: 1280);
                    if (img != null) {
                      final bytes = await img.readAsBytes();
                      setSt(() => photoB64 = 'data:image/jpeg;base64,${base64Encode(bytes)}');
                    }
                  },
                  icon: Icon(photoB64 == null ? Icons.photo_camera_outlined : Icons.check_circle_rounded, color: photoB64 != null ? kGreen : kTextMuted),
                  label: Text(
                    photoB64 == null ? 'Take Proof Photo (Optional)' : 'Proof Photo Attached',
                    style: TextStyle(color: photoB64 != null ? kGreen : kText, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: kGreen,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Complete & Handover', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
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
      'Customer not reachable / phone switched off',
      'Wrong / incomplete address',
      'Customer refused the order',
      'Customer not available at location',
      'Damaged items / packaging issue',
      'Other reason',
    ];
    final noteCtrl = TextEditingController();
    final picked = ValueNotifier<String?>(null);
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: kSurface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: ValueListenableBuilder<String?>(
            valueListenable: picked,
            builder: (ctx, sel, _) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(color: kLedgerLine, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: kRedSoft, borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.report_problem_rounded, color: kRed, size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Report Delivery Issue', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: kText)),
                          Text('Select reason why order cannot be delivered', style: TextStyle(color: kTextMuted, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ...reasons.map((r) {
                  final isSelected = sel == r;
                  return InkWell(
                    onTap: () => picked.value = r,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected ? kRedSoft.withValues(alpha: 0.6) : kPaper,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isSelected ? kRed : kLedgerLine, width: isSelected ? 1.4 : 1),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                            color: isSelected ? kRed : kTextFaint,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              r,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? kRed : kText,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                if (sel == 'Other reason') ...[
                  const SizedBox(height: 6),
                  TextField(
                    controller: noteCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'Explain the issue in detail...',
                      filled: true,
                      fillColor: kPaper,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kLedgerLine)),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: kRed,
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: sel == null ? null : () => Navigator.pop(ctx, true),
                  child: const Text('Confirm Delivery Failed', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    final sel = picked.value;
    if (ok == true && sel != null) {
      final reason = sel == 'Other reason' && noteCtrl.text.trim().isNotEmpty ? noteCtrl.text.trim() : sel;
      await _do(() => ref.read(orderProvider(o.orderId).notifier).fail(reason));
    }
  }

  ({String label, IconData icon, Future<void> Function() run})? _primaryAction() {
    final ctl = ref.read(orderProvider(o.orderId).notifier);
    switch (o.status) {
      case 'Assigned':
      case 'Ready':
        return (label: 'Arrived at Store', icon: Icons.storefront_rounded, run: () => _do(ctl.pickupArrived));
      case 'Arrived At Store':
        return (label: 'Pickup Done — Start Delivery', icon: Icons.moped_rounded, run: () => _do(ctl.pickedUp));
      case 'Out For Delivery':
        return (label: 'I Have Arrived at Doorstep', icon: Icons.pin_drop_rounded, run: () => _do(ctl.arrived));
      case 'Arrived':
        return (label: 'Collect OTP & Complete', icon: Icons.task_alt_rounded, run: _completeFlow);
      case 'Failed':
        if (o.needsReturn) {
          return (label: 'Returned Order to Store', icon: Icons.store_mall_directory_rounded, run: () => _do(ctl.markReturned));
        }
        return null;
      default:
        return null;
    }
  }

  static const _pickupStatuses = ['Assigned', 'Ready', 'Arrived At Store'];

  ({Color fg, IconData icon, String title, String next}) _statusMeta() {
    switch (o.status) {
      case 'Assigned':
        return (
          fg: kAmber,
          icon: Icons.assignment_ind_rounded,
          title: 'Order Assigned',
          next: 'Head to the store to collect this parcel.',
        );
      case 'Ready':
        return (
          fg: kAmber,
          icon: Icons.inventory_2_rounded,
          title: 'Packed & Ready',
          next: 'Order is ready at counter. Pick it up now.',
        );
      case 'Arrived At Store':
        return (
          fg: kAmber,
          icon: Icons.storefront_rounded,
          title: 'At Store',
          next: 'Confirm items in bag and tap "Pickup Done".',
        );
      case 'Out For Delivery':
        return (
          fg: kGreen,
          icon: Icons.delivery_dining_rounded,
          title: 'Out for Delivery',
          next: 'On the way to customer doorstep.',
        );
      case 'Arrived':
        return (
          fg: kGreen,
          icon: Icons.location_on_rounded,
          title: 'Arrived at Location',
          next: 'At drop-off. Ask customer for delivery code.',
        );
      case 'Delivered':
        return (
          fg: kGreen,
          icon: Icons.task_alt_rounded,
          title: 'Delivered Successfully',
          next: 'Order delivered and payment verified.',
        );
      case 'Failed':
      case 'Cancelled':
        return (
          fg: kRed,
          icon: Icons.report_problem_rounded,
          title: 'Delivery Not Completed',
          next: o.needsReturn ? 'Please return this parcel back to the store.' : 'This delivery was marked as cancelled or failed.',
        );
      default:
        return (
          fg: kTextMuted,
          icon: Icons.local_shipping_rounded,
          title: o.status,
          next: '',
        );
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
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
              children: [
                // 1. Status Hero Card
                _statusHeader(),
                const SizedBox(height: 14),

                // 2. Cash on Delivery / Payment Banner
                _paymentCallout(),
                const SizedBox(height: 14),

                // 3. Customer & Drop-off Destination Card
                _customerDestinationCard(isPickupLeg),
                const SizedBox(height: 14),

                // 4. Items in Order Card
                _itemsCard(),
                const SizedBox(height: 14),

                // 5. Activity Timeline
                if (o.timeline.isNotEmpty) ...[
                  _timelineCard(),
                  const SizedBox(height: 14),
                ],

                // 6. Failure Reason Card (if applicable)
                if (o.status == 'Failed' && o.failureReason.isNotEmpty) ...[
                  _failureCard(),
                ],
              ],
            ),
          ),
        ),

        // 7. Ergonomic Sticky Bottom Action Bar
        if (action != null || canFail) _bottomBar(action, canFail),
      ],
    );
  }

  Widget _statusHeader() {
    final meta = _statusMeta();
    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kLedgerLine),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: meta.fg.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(meta.icon, color: meta.fg, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: meta.fg.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            o.status.toUpperCase(),
                            style: GoogleFonts.rubik(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: meta.fg,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const Spacer(),
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: o.orderId));
                            _snack('Order ID copied');
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: kPaper,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: kLedgerLine),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  o.orderId.length > 12 ? '#${o.orderId.substring(0, 12)}…' : '#${o.orderId}',
                                  style: GoogleFonts.nunitoSans(fontSize: 11, fontWeight: FontWeight.w700, color: kTextMuted),
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.copy_rounded, size: 12, color: kTextFaint),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      meta.title,
                      style: GoogleFonts.rubik(
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                        color: kText,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (meta.next.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.info_outline_rounded, size: 15, color: kTextMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    meta.next,
                    style: GoogleFonts.nunitoSans(
                      fontSize: 12.5,
                      color: kTextMuted,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _paymentCallout() {
    if (o.isCOD) {
      return Container(
        decoration: BoxDecoration(
          color: kSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kLedgerLine),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: kAmberSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.payments_rounded, color: kAmber, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: kAmberSoft,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'COLLECT CASH',
                          style: GoogleFonts.rubik(fontSize: 10, fontWeight: FontWeight.w800, color: kAmber, letterSpacing: 0.5),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '₹${o.totalAmount.toStringAsFixed(0)}',
                        style: GoogleFonts.rubik(fontSize: 16, fontWeight: FontWeight.w800, color: kText),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Collect exact cash from customer before handing over the parcel.',
                    style: GoogleFonts.nunitoSans(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kLedgerLine),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: kGreenSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.check_circle_rounded, color: kGreen, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'PREPAID ONLINE',
                      style: GoogleFonts.rubik(fontSize: 11, fontWeight: FontWeight.w800, color: kGreen, letterSpacing: 0.5),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '₹${o.totalAmount.toStringAsFixed(0)}',
                      style: GoogleFonts.rubik(fontSize: 15, fontWeight: FontWeight.w800, color: kText),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Payment confirmed. Do NOT collect any cash from customer.',
                  style: GoogleFonts.nunitoSans(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _customerDestinationCard(bool isPickupLeg) {
    final phone = o.customerPhone;
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final canContact = !phone.contains('•') && digits.length >= 10;
    final destinationTitle = isPickupLeg ? 'Store Pickup Location' : 'Customer Drop-off';
    final destinationAddress = isPickupLeg ? (o.pickup?['name'] ?? 'Store counter').toString() : o.deliveryAddress;

    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: kLedgerLine),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Title
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isPickupLeg ? kAmberSoft : kGreenSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isPickupLeg ? Icons.storefront_rounded : Icons.location_on_rounded,
                  size: 16,
                  color: isPickupLeg ? kAmber : kGreen,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                destinationTitle.toUpperCase(),
                style: GoogleFonts.rubik(
                  fontWeight: FontWeight.w800,
                  fontSize: 11.5,
                  color: kTextMuted,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: kPaper,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: kLedgerLine),
                ),
                child: Text(
                  isPickupLeg ? 'STORE' : 'DROP-OFF',
                  style: GoogleFonts.nunitoSans(fontSize: 10.5, fontWeight: FontWeight.w800, color: kTextMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Customer Profile Info
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF10B981), Color(0xFF059669)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Text(
                  (o.customerName.isEmpty ? 'C' : o.customerName.trim()[0]).toUpperCase(),
                  style: GoogleFonts.rubik(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      o.customerName.isEmpty ? 'Customer' : o.customerName,
                      style: GoogleFonts.rubik(fontWeight: FontWeight.w800, fontSize: 16, color: kText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      canContact ? phone : 'Phone active when out for delivery',
                      style: GoogleFonts.nunitoSans(
                        fontSize: 12.5,
                        color: canContact ? kText : kTextFaint,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Address Container
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: kPaper,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: kLedgerLine),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(Icons.place_outlined, size: 18, color: kGreen),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    destinationAddress.isEmpty ? 'No address specified' : destinationAddress,
                    style: GoogleFonts.nunitoSans(
                      fontSize: 13.5,
                      color: kText,
                      fontWeight: FontWeight.w600,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          if (_latLngFrom(o.pickup) != null && _latLngFrom(o.deliveryLocation) != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: 160,
                child: DeliveryMap(
                  origin: _latLngFrom(o.pickup)!,
                  destination: _latLngFrom(o.deliveryLocation)!,
                  originLabel: 'Store',
                  destinationLabel: 'Drop',
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Integrated Navigation CTA (Google Maps)
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: kInk,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => _navigateTo(
                isPickupLeg ? o.pickup : o.deliveryLocation,
                destinationAddress,
              ),
              icon: const Icon(Icons.directions_rounded, size: 19, color: Color(0xFF34D399)),
              label: Text(
                isPickupLeg ? 'Navigate to Store (Google Maps)' : 'Navigate to Customer (Google Maps)',
                style: GoogleFonts.nunitoSans(fontWeight: FontWeight.w800, fontSize: 13.5),
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Call & WhatsApp Actions
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 42,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: canContact ? kText : kTextFaint,
                      side: BorderSide(color: canContact ? kLedgerLine : kLedgerLine.withValues(alpha: 0.5)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: canContact ? _call : null,
                    icon: Icon(Icons.call_rounded, size: 17, color: canContact ? kGreen : kTextFaint),
                    label: Text(
                      'Call',
                      style: GoogleFonts.nunitoSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 42,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: canContact ? const Color(0xFF075E54) : kTextFaint,
                      backgroundColor: canContact ? const Color(0xFFE8F5E9) : Colors.transparent,
                      side: BorderSide(color: canContact ? const Color(0xFF25D366).withValues(alpha: 0.4) : kLedgerLine),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: canContact ? _whatsapp : null,
                    icon: Icon(Icons.chat_bubble_rounded, size: 16, color: canContact ? const Color(0xFF25D366) : kTextFaint),
                    label: Text(
                      'WhatsApp',
                      style: GoogleFonts.nunitoSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _itemsCard() {
    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: kLedgerLine),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: kGreenSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.shopping_bag_outlined, size: 16, color: kGreen),
              ),
              const SizedBox(width: 10),
              Text(
                'ORDER ITEMS (${o.items.length})',
                style: GoogleFonts.rubik(
                  fontWeight: FontWeight.w800,
                  fontSize: 11.5,
                  color: kTextMuted,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: kPaper,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${o.items.fold<int>(0, (sum, it) => sum + it.quantity)} units',
                  style: GoogleFonts.nunitoSans(fontSize: 11, fontWeight: FontWeight.w700, color: kTextMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 8),
          ...o.items.map((i) => _itemRow(i)),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order Total Bill',
                style: GoogleFonts.rubik(fontWeight: FontWeight.w700, fontSize: 14, color: kText),
              ),
              Text(
                '₹${o.totalAmount.toStringAsFixed(0)}',
                style: GoogleFonts.rubik(fontWeight: FontWeight.w800, fontSize: 16, color: kText),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _itemRow(OrderItemLine i) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: kPaper,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: kLedgerLine),
            ),
            child: const Icon(Icons.eco_rounded, size: 20, color: kGreen),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  i.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.nunitoSans(fontSize: 13.5, fontWeight: FontWeight.w700, color: kText),
                ),
                if (i.weightSpec.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    i.weightSpec,
                    style: GoogleFonts.nunitoSans(fontSize: 12, color: kTextMuted, fontWeight: FontWeight.w600),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: kGreenSoft,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '×${i.quantity}',
              style: GoogleFonts.rubik(fontSize: 12, fontWeight: FontWeight.w800, color: kGreen),
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineCard() {
    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: kLedgerLine),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: kGreenSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.timeline_rounded, size: 16, color: kGreen),
              ),
              const SizedBox(width: 10),
              Text(
                'DELIVERY TIMELINE',
                style: GoogleFonts.rubik(
                  fontWeight: FontWeight.w800,
                  fontSize: 11.5,
                  color: kTextMuted,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ..._timelineRows(),
        ],
      ),
    );
  }

  List<Widget> _timelineRows() {
    final events = o.timeline.reversed.toList();
    return [
      for (var idx = 0; idx < events.length; idx++)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: idx == 0 ? kGreen : const Color(0xFFD1FAE5),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: idx == 0 ? const Color(0xFF34D399) : Colors.transparent,
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      Icons.check_rounded,
                      size: 14,
                      color: idx == 0 ? Colors.white : kGreen,
                    ),
                  ),
                  if (idx != events.length - 1)
                    Container(
                      width: 2,
                      height: 26,
                      color: kLedgerLine,
                      margin: const EdgeInsets.symmetric(vertical: 2),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${events[idx]['status']}',
                        style: GoogleFonts.rubik(
                          fontSize: 14,
                          fontWeight: idx == 0 ? FontWeight.w800 : FontWeight.w600,
                          color: idx == 0 ? kText : kTextMuted,
                        ),
                      ),
                      if ((events[idx]['note'] ?? '').toString().isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          '${events[idx]['note']}',
                          style: GoogleFonts.nunitoSans(fontSize: 12.5, color: kTextMuted, height: 1.3),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
    ];
  }

  Widget _failureCard() {
    return Container(
      decoration: BoxDecoration(
        color: kRedSoft,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kRed.withValues(alpha: 0.3)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.error_outline_rounded, size: 20, color: kRed),
              const SizedBox(width: 8),
              Text(
                'Failure Reason',
                style: GoogleFonts.rubik(fontWeight: FontWeight.w800, color: kRed, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            o.failureReason,
            style: GoogleFonts.nunitoSans(fontSize: 13.5, color: kText, height: 1.4, fontWeight: FontWeight.w600),
          ),
          if (o.needsReturn) ...[
            const SizedBox(height: 8),
            Text(
              'Please bring this order back to the store, then tap "Returned Order to Store".',
              style: GoogleFonts.nunitoSans(fontSize: 12.5, color: kTextMuted, height: 1.3),
            ),
          ],
        ],
      ),
    );
  }

  Widget _bottomBar(dynamic action, bool canFail) {
    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        border: const Border(top: BorderSide(color: kLedgerLine)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (action != null)
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: kGreen,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _busy ? null : action.run,
                    icon: _busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                          )
                        : Icon(action.icon, size: 20),
                    label: Text(
                      action.label,
                      style: GoogleFonts.nunitoSans(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ),
              if (canFail) ...[
                const SizedBox(height: 6),
                TextButton.icon(
                  onPressed: _busy ? null : _failFlow,
                  icon: Icon(Icons.flag_outlined, size: 16, color: Colors.red.shade700),
                  label: Text(
                    'Report a problem / Can\'t deliver',
                    style: GoogleFonts.nunitoSans(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 48, color: kTextFaint),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.nunitoSans(fontSize: 14, color: kTextMuted),
              ),
              const SizedBox(height: 16),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: kGreen,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
}
