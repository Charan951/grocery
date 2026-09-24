import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/returns/return_offer_controller.dart';
import 'package:freshcart_delivery/models/return_models.dart';

/// Full-screen return/exchange pickup offer with a countdown — same layout as
/// the delivery [OfferSheet], amber instead of green so the two read apart.
class ReturnOfferSheet extends ConsumerStatefulWidget {
  final ReturnOffer offer;
  const ReturnOfferSheet({super.key, required this.offer});
  @override
  ConsumerState<ReturnOfferSheet> createState() => _ReturnOfferSheetState();
}

class _ReturnOfferSheetState extends ConsumerState<ReturnOfferSheet> {
  Timer? _t;
  int _left = 0;
  int _total = 60;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _left = widget.offer.secondsLeft();
    _total = _left > 0 ? _left : 60;
    _t = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final s = widget.offer.secondsLeft();
      setState(() => _left = s);
      if (s <= 0) {
        _t?.cancel();
        ref.read(returnOfferProvider.notifier).dismiss();
      }
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  Future<void> _accept() async {
    setState(() => _busy = true);
    try {
      final id = await ref.read(returnOfferProvider.notifier).accept();
      if (!mounted) return;
      if (id != null) context.push('/return/$id');
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.offer;
    final frac = _total == 0 ? 0.0 : (_left / _total).clamp(0.0, 1.0);
    final km = o.distanceMeters == null ? null : (o.distanceMeters! / 1000).toStringAsFixed(1);

    return Material(
      color: Colors.black.withValues(alpha: 0.55),
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(20),
          padding: const EdgeInsets.all(22),
          constraints: const BoxConstraints(maxWidth: 420),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 88,
                    height: 88,
                    child: CircularProgressIndicator(value: frac, strokeWidth: 7, color: kAmber, backgroundColor: const Color(0xFFE6E6E6)),
                  ),
                  Text('$_left', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                ],
              ),
              const SizedBox(height: 14),
              Text(o.isExchange ? 'Exchange pickup' : 'Return pickup',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(o.returnId, style: const TextStyle(color: kTextMuted)),
              const SizedBox(height: 16),
              _row(Icons.shopping_bag_rounded, o.items.map((i) => '${i.name} ×${i.quantity}').join(', '), maxLines: 2),
              if (o.reason.isNotEmpty) _row(Icons.report_gmailerrorred_rounded, o.reason),
              if (km != null) _row(Icons.route_rounded, '$km km away'),
              if (o.isExchange && o.storeName.isNotEmpty) _row(Icons.storefront_rounded, 'Collect replacement at ${o.storeName} first'),
              _row(Icons.location_on_rounded, o.pickupAddress, maxLines: 2),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => ref.read(returnOfferProvider.notifier).reject(),
                      child: const Text('Decline'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _busy || _left <= 0 ? null : _accept,
                      child: _busy
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                          : const Text('Accept pickup'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(IconData i, String t, {int maxLines = 1}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(i, size: 18, color: kTextFaint),
            const SizedBox(width: 10),
            Expanded(child: Text(t, maxLines: maxLines, overflow: TextOverflow.ellipsis)),
          ],
        ),
      );
}
