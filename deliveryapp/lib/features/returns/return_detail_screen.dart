import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/features/returns/return_offer_controller.dart';
import 'package:freshcart_delivery/models/return_models.dart';

final _returnProvider = FutureProvider.autoDispose.family<PartnerReturn, String>(
  (ref, id) => ref.read(apiProvider).getReturn(id),
);

const _failReasons = [
  'Customer not reachable / phone switched off',
  'Customer not available at location',
  'Wrong / incomplete address',
];
const _refuseReasons = [
  'Item does not match the request',
  'Item used / not in returnable condition',
  'Customer changed their mind',
];

/// Renders an http(s) URL or a `data:image/...;base64,` URI (customer
/// photos fall back to inline data when the CDN isn't configured).
Widget _photo(String src, {double size = 64}) {
  Widget img;
  if (src.startsWith('data:image')) {
    final i = src.indexOf(',');
    try {
      img = Image.memory(base64Decode(src.substring(i + 1)), width: size, height: size, fit: BoxFit.cover);
    } catch (_) {
      img = const SizedBox.shrink();
    }
  } else {
    img = Image.network(src, width: size, height: size, fit: BoxFit.cover,
        errorBuilder: (_, _, _) => Container(width: size, height: size, color: kLedgerLine));
  }
  return ClipRRect(borderRadius: BorderRadius.circular(10), child: img);
}

/// Partner's pickup flow: reach customer → collect with proof → drop at store.
class ReturnDetailScreen extends ConsumerStatefulWidget {
  final String returnId;
  const ReturnDetailScreen({super.key, required this.returnId});
  @override
  ConsumerState<ReturnDetailScreen> createState() => _ReturnDetailScreenState();
}

class _ReturnDetailScreenState extends ConsumerState<ReturnDetailScreen> {
  bool _busy = false;

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _run(Future<PartnerReturn?> Function() action, {bool popAfter = false}) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(_returnProvider(widget.returnId));
      ref.invalidate(activeReturnsProvider);
      ref.read(authProvider.notifier).refreshProfile();
      if (popAfter && mounted) context.pop();
    } on ApiException catch (e) {
      if (mounted) _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openMaps(({double lat, double lng})? loc, String address) async {
    final uri = loc != null
        ? Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}')
        : Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) _snack('Could not open Maps');
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_returnProvider(widget.returnId));
    return Scaffold(
      appBar: AppBar(title: Text(widget.returnId)),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: kGreen)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(e is ApiException ? e.message : 'Could not load this pickup', textAlign: TextAlign.center),
          ),
        ),
        data: (rr) => Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async => ref.invalidate(_returnProvider(widget.returnId)),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
                  children: [
                    Wrap(
                      spacing: 8,
                      children: [
                        _chip(rr.isExchange ? 'EXCHANGE' : 'RETURN', kAmberSoft, kAmber),
                        _chip(rr.status.toUpperCase(),
                            rr.status == 'Completed' ? kGreenSoft : rr.isDone ? kRedSoft : kPaper,
                            rr.status == 'Completed' ? kGreen : rr.isDone ? kRed : kTextMuted),
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (rr.isExchange && (rr.status == 'Assigned' || rr.status == 'Arrived'))
                      _card(
                        color: kAmberSoft,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.storefront_rounded, color: kAmber),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Collect the replacement first at ${rr.storeName}',
                                      style: const TextStyle(fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 2),
                                  const Text('Hand it over when you pick up the old item.',
                                      style: TextStyle(color: kTextMuted, fontSize: 12.5)),
                                  if (rr.storeLocation != null)
                                    TextButton(
                                      style: TextButton.styleFrom(padding: EdgeInsets.zero, foregroundColor: kGreen),
                                      onPressed: () => _openMaps(rr.storeLocation, rr.storeName),
                                      child: const Text('Navigate to store →'),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    _card(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('CUSTOMER'),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(rr.customerName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                                    const SizedBox(height: 4),
                                    Text(rr.pickupAddress, style: const TextStyle(color: kTextMuted, fontSize: 12.5)),
                                  ],
                                ),
                              ),
                              if (!rr.isDone) ...[
                                IconButton.filledTonal(
                                  tooltip: 'Call customer',
                                  onPressed: rr.customerPhone.isEmpty
                                      ? null
                                      : () => launchUrl(Uri.parse('tel:${rr.customerPhone.replaceAll(RegExp(r'[^\d+]'), '')}')),
                                  icon: const Icon(Icons.phone_rounded),
                                ),
                                IconButton.filled(
                                  tooltip: 'Navigate',
                                  onPressed: () => _openMaps(rr.pickupLocation, rr.pickupAddress),
                                  icon: const Icon(Icons.navigation_rounded),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    _card(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _label('COLLECT THESE ITEMS'),
                          const SizedBox(height: 6),
                          for (final i in rr.items)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Row(
                                children: [
                                  if (i.image.isNotEmpty) _photo(i.image, size: 42) else const Icon(Icons.inventory_2_outlined, color: kTextFaint),
                                  const SizedBox(width: 12),
                                  Expanded(child: Text(i.name, style: const TextStyle(fontWeight: FontWeight.w700))),
                                  Text('×${i.quantity}', style: const TextStyle(fontWeight: FontWeight.w800)),
                                ],
                              ),
                            ),
                          const Divider(height: 18),
                          Text.rich(TextSpan(children: [
                            TextSpan(text: rr.reasonLabel, style: const TextStyle(fontWeight: FontWeight.w800)),
                            if (rr.comment.isNotEmpty) TextSpan(text: ' — “${rr.comment}”', style: const TextStyle(color: kTextMuted)),
                          ])),
                          if (rr.photos.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(spacing: 8, runSpacing: 8, children: [for (final p in rr.photos) _photo(p)]),
                          ],
                        ],
                      ),
                    ),
                    if (rr.proofPhotos.isNotEmpty)
                      _card(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _label('YOUR PICKUP PROOF'),
                            const SizedBox(height: 8),
                            Wrap(spacing: 8, runSpacing: 8, children: [for (final p in rr.proofPhotos) _photo(p)]),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (!rr.isDone) _actions(rr),
          ],
        ),
      ),
    );
  }

  Widget _actions(PartnerReturn rr) {
    final big = FilledButton.styleFrom(
      backgroundColor: kGreen,
      minimumSize: const Size.fromHeight(52),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    );
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: kLedgerLine))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (rr.status == 'Assigned')
              FilledButton(
                style: big,
                onPressed: _busy ? null : () => _run(() => ref.read(apiProvider).returnArrived(rr.returnId)),
                child: const Text("I've arrived at the customer"),
              ),
            if (rr.status == 'Arrived')
              FilledButton(
                style: big,
                onPressed: _busy ? null : () => _collect(rr),
                child: Text(rr.isExchange ? 'Collect item & hand over replacement' : 'Collect item with proof'),
              ),
            if (rr.status == 'Assigned' || rr.status == 'Arrived') ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => _reason(rr, refuse: true),
                      child: const Text("Item doesn't match"),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(foregroundColor: kRed),
                      onPressed: _busy ? null : () => _reason(rr, refuse: false),
                      child: const Text("Can't collect"),
                    ),
                  ),
                ],
              ),
            ],
            if (rr.status == 'Picked Up')
              FilledButton(
                style: big,
                onPressed: _busy ? null : () => _run(() => ref.read(apiProvider).completeReturn(rr.returnId), popAfter: true),
                child: const Text('Dropped at store'),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _collect(PartnerReturn rr) async {
    final otpCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    final photos = <String>[];
    var verified = false;

    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) {
          final ready = otpCtrl.text.length == 4 && photos.isNotEmpty && verified;
          return Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(rr.isExchange ? 'Collect & exchange' : 'Collect return',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 14),
                  _label("CUSTOMER'S PICKUP CODE"),
                  const SizedBox(height: 6),
                  TextField(
                    controller: otpCtrl,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    textAlign: TextAlign.center,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    onChanged: (_) => setSt(() {}),
                    style: const TextStyle(fontSize: 24, letterSpacing: 10, fontWeight: FontWeight.w800),
                    decoration: const InputDecoration(hintText: '• • • •', counterText: ''),
                  ),
                  const SizedBox(height: 12),
                  _label('PROOF PHOTOS (REQUIRED)'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (var i = 0; i < photos.length; i++)
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            _photo(photos[i]),
                            Positioned(
                              top: -10,
                              right: -10,
                              child: IconButton(
                                tooltip: 'Remove photo',
                                iconSize: 14,
                                style: IconButton.styleFrom(backgroundColor: kInk, foregroundColor: Colors.white, minimumSize: const Size(26, 26)),
                                onPressed: () => setSt(() => photos.removeAt(i)),
                                icon: const Icon(Icons.close_rounded),
                              ),
                            ),
                          ],
                        ),
                      if (photos.length < 4)
                        InkWell(
                          borderRadius: BorderRadius.circular(10),
                          onTap: () async {
                            final img = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 55, maxWidth: 1280);
                            if (img == null) return;
                            final bytes = await img.readAsBytes();
                            setSt(() => photos.add('data:image/jpeg;base64,${base64Encode(bytes)}'));
                          },
                          child: Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: kLedgerLine, width: 1.5),
                            ),
                            child: const Icon(Icons.add_a_photo_outlined, color: kTextMuted),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    value: verified,
                    activeColor: kGreen,
                    onChanged: (v) => setSt(() => verified = v ?? false),
                    title: Text(
                      'I checked the item(s) and quantities match the request${rr.isExchange ? ' and handed over the replacement' : ''}.',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  TextField(
                    controller: noteCtrl,
                    maxLines: 2,
                    maxLength: 300,
                    decoration: const InputDecoration(hintText: 'Note for ops (optional)'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: kGreen, minimumSize: const Size.fromHeight(50)),
                    onPressed: ready ? () => Navigator.pop(ctx, true) : null,
                    child: const Text('Confirm pickup'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );

    if (submitted == true) {
      await _run(() => ref.read(apiProvider).collectReturn(
            rr.returnId,
            otp: otpCtrl.text,
            photos: photos,
            note: noteCtrl.text.trim().isEmpty ? null : noteCtrl.text.trim(),
          ));
    }
    otpCtrl.dispose();
    noteCtrl.dispose();
  }

  Future<void> _reason(PartnerReturn rr, {required bool refuse}) async {
    final options = [...(refuse ? _refuseReasons : _failReasons), 'Other'];
    final otherCtrl = TextEditingController();
    String choice = '';
    final reason = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) {
          final value = choice == 'Other' ? otherCtrl.text.trim() : choice;
          return Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(refuse ? "What doesn't match?" : "Why couldn't you collect?",
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
                RadioGroup<String>(
                  groupValue: choice,
                  onChanged: (v) => setSt(() => choice = v ?? ''),
                  child: Column(
                    children: [
                      for (final o in options)
                        RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          value: o,
                          activeColor: kRed,
                          title: Text(o, style: const TextStyle(fontSize: 13.5)),
                        ),
                    ],
                  ),
                ),
                if (choice == 'Other')
                  TextField(
                    controller: otherCtrl,
                    onChanged: (_) => setSt(() {}),
                    decoration: const InputDecoration(hintText: 'Describe the issue…'),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: kRed, minimumSize: const Size.fromHeight(50)),
                  onPressed: value.isEmpty ? null : () => Navigator.pop(ctx, value),
                  child: Text(refuse ? 'Refuse pickup' : 'Mark pickup failed'),
                ),
              ],
            ),
          );
        },
      ),
    );
    otherCtrl.dispose();
    if (reason == null || reason.isEmpty) return;
    await _run(
      () => refuse
          ? ref.read(apiProvider).refuseReturn(rr.returnId, reason)
          : ref.read(apiProvider).failReturn(rr.returnId, reason),
      popAfter: true,
    );
  }

  Widget _card({required Widget child, Color color = Colors.white}) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: kLedgerLine),
        ),
        child: child,
      );

  Widget _label(String t) => Text(t,
      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 1.1, color: kTextFaint));

  Widget _chip(String t, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
        child: Text(t, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.6, color: fg)),
      );
}
