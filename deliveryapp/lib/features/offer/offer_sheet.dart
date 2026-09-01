import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/offer/offer_controller.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

/// A full-screen offer with a live countdown. Shown by the shell when
/// `offerProvider` becomes non-null.
class OfferSheet extends ConsumerStatefulWidget {
  final DeliveryOffer offer;
  const OfferSheet({super.key, required this.offer});
  @override
  ConsumerState<OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends ConsumerState<OfferSheet> {
  Timer? _t;
  int _left = 0;
  int _total = 25;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _left = widget.offer.secondsLeft();
    _total = _left > 0 ? _left : 25;
    _t = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final s = widget.offer.secondsLeft();
      setState(() => _left = s);
      if (s <= 0) {
        _t?.cancel();
        ref.read(offerProvider.notifier).dismiss();
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
      final order = await ref.read(offerProvider.notifier).accept();
      if (!mounted) return;
      if (order != null) context.push('/order/${order.orderId}');
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject() async {
    setState(() => _busy = true);
    await ref.read(offerProvider.notifier).reject(reason: 'declined');
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
                    child: CircularProgressIndicator(value: frac, strokeWidth: 7, color: kBrand, backgroundColor: const Color(0xFFE6E6E6)),
                  ),
                  Text('$_left', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                ],
              ),
              const SizedBox(height: 14),
              const Text('New delivery', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Order ${o.orderId}', style: const TextStyle(color: Colors.black54)),
              const SizedBox(height: 16),
              _row(Icons.payments_rounded, '₹${o.amount.toStringAsFixed(0)}  ·  ${o.isCOD ? 'COLLECT CASH' : 'Prepaid'}'),
              _row(Icons.shopping_bag_rounded, '${o.itemCount} item${o.itemCount == 1 ? '' : 's'}'),
              if (km != null) _row(Icons.route_rounded, '$km km from store'),
              _row(Icons.location_on_rounded, o.deliveryAddress, maxLines: 2),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : _reject,
                      child: const Text('Reject'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _busy || _left <= 0 ? null : _accept,
                      child: _busy
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                          : const Text('Accept'),
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
            Icon(i, size: 18, color: Colors.black45),
            const SizedBox(width: 10),
            Expanded(child: Text(t, maxLines: maxLines, overflow: TextOverflow.ellipsis)),
          ],
        ),
      );
}
