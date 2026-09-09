import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/features/offer/offer_controller.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

final activeOrdersProvider = FutureProvider.autoDispose<List<DeliveryOrder>>((ref) {
  // refresh when auth profile changes (e.g. after accept)
  ref.watch(authProvider.select((s) => s.profile?.activeOrderIds.length));
  return ref.read(apiProvider).activeOrders();
});

final unreadCountProvider = FutureProvider.autoDispose<int>((ref) async {
  try {
    final r = await ref.read(apiProvider).notifications(unreadOnly: true);
    return r.unread;
  } catch (_) {
    return 0;
  }
});

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> with WidgetsBindingObserver {
  bool _toggling = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // The socket may have dropped a `delivery_offer` while backgrounded.
      ref.read(offerProvider.notifier).checkPending();
      ref.read(authProvider.notifier).refreshProfile();
      ref.invalidate(activeOrdersProvider);
    }
  }

  Future<void> _toggle(bool value) async {
    if (_toggling) return;
    setState(() => _toggling = true);
    try {
      final loc = ref.read(locationServiceProvider);
      if (value) {
        final ok = await loc.ensurePermission();
        if (!ok) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission is required to go online.')),
            );
          }
          return;
        }
      }
      // The API call is the source of truth for online state; it must not be
      // blocked by the (sometimes slow / hanging) location stream startup.
      final res = await ref.read(apiProvider).setOnline(value);
      await ref.read(authProvider.notifier).refreshProfile();
      if (res['isOnline'] == true) {
        loc.start(interval: const Duration(seconds: 12)); // fire-and-forget
      } else {
        loc.stop();
      }
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(authProvider.select((s) => s.profile));
    final online = p?.isOnline ?? false;
    final active = ref.watch(activeOrdersProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/notifications');
              ref.invalidate(unreadCountProvider);
            },
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.notifications_none_rounded),
            ),
          ),
          // App-bar toggle: flips status both ways (the body slide bar is the
          // friendlier "go online" affordance while offline).
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: _toggling
                ? const SizedBox(
                    width: 46,
                    child: Center(
                      child: SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.4),
                      ),
                    ),
                  )
                : Row(
                    children: [
                      Text(online ? 'On' : 'Off',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: online ? kBrand : kTextFaint)),
                      Switch(value: online, onChanged: _toggle),
                    ],
                  ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authProvider.notifier).refreshProfile();
          ref.invalidate(activeOrdersProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (!online) ...[
              _SlideToGoOnline(busy: _toggling, onConfirm: () => _toggle(true)),
              const SizedBox(height: 14),
            ],
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: (online ? kBrand : kTextFaint).withValues(alpha: 0.14),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(online ? Icons.bolt_rounded : Icons.power_settings_new_rounded,
                          color: online ? kBrand : kTextFaint),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(online ? "You're online" : "You're offline",
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          Text(
                            online
                                ? 'Availability: ${p?.availability ?? 'unknown'}'
                                : 'Slide below or use the switch above to start',
                            style: const TextStyle(color: kTextMuted, fontSize: 12.5),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: online ? kBrand : kTextFaint,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _stat("Today", '₹${(p?.todayEarnings ?? 0).toStringAsFixed(0)}', Icons.account_balance_wallet_rounded),
                const SizedBox(width: 12),
                _stat('Delivered', '${p?.completedCount ?? 0}', Icons.check_circle_rounded),
                const SizedBox(width: 12),
                _stat(
                  (p?.ratingCount ?? 0) > 0 ? 'Rating (${p!.ratingCount})' : 'Rating',
                  (p?.rating ?? 5).toStringAsFixed(1),
                  Icons.star_rounded,
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Active delivery', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 10),
            active.when(
              loading: () => const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
              error: (e, _) => _empty("Couldn't load orders", '$e'),
              data: (orders) {
                if (orders.isEmpty) {
                  return _empty(online ? 'No active delivery' : 'You are offline',
                      online ? 'New orders will pop up here.' : 'Go online to start.');
                }
                return Column(children: orders.map(_activeCard).toList());
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon) => Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            child: Column(
              children: [
                Icon(icon, color: kBrand, size: 22),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                Text(label, style: const TextStyle(color: kTextMuted, fontSize: 11.5)),
              ],
            ),
          ),
        ),
      );

  Widget _activeCard(DeliveryOrder o) => Card(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          title: Text(o.orderId, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('${o.status}  ·  ₹${o.totalAmount.toStringAsFixed(0)}${o.isCOD ? ' COD' : ''}\n${o.deliveryAddress}'),
          isThreeLine: true,
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: () => context.push('/order/${o.orderId}'),
        ),
      );

  Widget _empty(String t, String s) => Card(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            children: [
              const Icon(Icons.inbox_rounded, size: 40, color: kTextFaint),
              const SizedBox(height: 10),
              Text(t, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(s, textAlign: TextAlign.center, style: const TextStyle(color: kTextMuted, fontSize: 12.5)),
            ],
          ),
        ),
      );
}

/// One-way slide-to-confirm: drag the knob left → right to go online. Shown only
/// while offline. Going offline is the app-bar switch.
class _SlideToGoOnline extends StatefulWidget {
  final bool busy;
  final VoidCallback onConfirm;
  const _SlideToGoOnline({required this.busy, required this.onConfirm});

  @override
  State<_SlideToGoOnline> createState() => _SlideToGoOnlineState();
}

class _SlideToGoOnlineState extends State<_SlideToGoOnline> {
  static const double _knob = 52;
  static const double _pad = 5;
  static const double _threshold = 0.85;

  double _t = 0; // 0..1
  bool _dragging = false;
  bool _fired = false;

  @override
  void didUpdateWidget(covariant _SlideToGoOnline old) {
    super.didUpdateWidget(old);
    if (old.busy && !widget.busy) {
      // toggle finished (success or failure) — snap the knob back.
      setState(() {
        _t = 0;
        _fired = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final travel = (c.maxWidth - _knob - _pad * 2).clamp(1.0, double.infinity);
        void onUpdate(DragUpdateDetails d) {
          if (widget.busy || _fired) return;
          setState(() {
            _dragging = true;
            _t = (_t + d.primaryDelta! / travel).clamp(0.0, 1.0);
          });
        }

        void onEnd(DragEndDetails _) {
          setState(() => _dragging = false);
          if (_t >= _threshold && !widget.busy) {
            setState(() {
              _t = 1;
              _fired = true;
            });
            widget.onConfirm();
          } else {
            setState(() => _t = 0);
          }
        }

        return Container(
          height: _knob + _pad * 2,
          decoration: BoxDecoration(
            color: kInk,
            borderRadius: BorderRadius.circular((_knob + _pad * 2) / 2),
            boxShadow: const [
              BoxShadow(color: Color(0x33000000), blurRadius: 20, offset: Offset(0, 8)),
            ],
          ),
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // travelled trail
              FractionallySizedBox(
                widthFactor: (_t).clamp(0.0, 1.0),
                child: Container(
                  decoration: BoxDecoration(
                    color: kBrand.withValues(alpha: 0.28),
                    borderRadius: BorderRadius.circular((_knob + _pad * 2) / 2),
                  ),
                ),
              ),
              Center(
                child: Opacity(
                  opacity: (1 - _t * 2).clamp(0.0, 1.0),
                  child: Text(
                    widget.busy ? 'GOING ONLINE…' : 'SLIDE TO GO ONLINE',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.6,
                    ),
                  ),
                ),
              ),
              AnimatedPositioned(
                duration: _dragging ? Duration.zero : const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                left: _pad + _t * travel,
                top: _pad,
                child: GestureDetector(
                  onHorizontalDragStart: (_) {},
                  onHorizontalDragUpdate: onUpdate,
                  onHorizontalDragEnd: onEnd,
                  child: Container(
                    width: _knob,
                    height: _knob,
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                    child: widget.busy
                        ? const Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(strokeWidth: 2.6, color: kBrand),
                          )
                        : const Icon(Icons.keyboard_double_arrow_right_rounded,
                            color: kInk, size: 24),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
