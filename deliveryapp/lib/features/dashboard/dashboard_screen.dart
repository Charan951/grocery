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

final recentHistoryProvider = FutureProvider.autoDispose<List<DeliveryOrder>>((ref) async {
  try {
    return await ref.read(apiProvider).history();
  } catch (_) {
    return [];
  }
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
      ref.invalidate(recentHistoryProvider);
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
        // Automatically fetch and push location as soon as status is switched ON
        await loc.fetchAndPushCurrentPosition();
      }
      final res = await ref.read(apiProvider).setOnline(value);
      await ref.read(authProvider.notifier).refreshProfile();
      if (res['isOnline'] == true) {
        loc.start(interval: const Duration(seconds: 12));
      } else {
        loc.stop();
      }
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(authProvider.select((s) => s.profile));
    final online = p?.isOnline ?? false;
    final active = ref.watch(activeOrdersProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    final partnerName = p?.name.isNotEmpty == true
        ? p!.name.split(' ').first
        : 'Partner';

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 18,
        title: RichText(
          text: const TextSpan(
            children: [
              TextSpan(
                text: 'FreshCart ',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  color: kGreen,
                  letterSpacing: -0.4,
                ),
              ),
              TextSpan(
                text: 'Delivery',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 20,
                  color: kText,
                  letterSpacing: -0.4,
                ),
              ),
            ],
          ),
        ),
        actions: [
          if (_toggling)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: Center(
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: kGreen),
                  ),
                ),
              ),
            )
          else
            Row(
              children: [
                Text(
                  online ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                    color: online ? kGreen : kTextMuted,
                  ),
                ),
                Transform.scale(
                  scale: 0.85,
                  child: Switch(
                    value: online,
                    onChanged: _toggle,
                  ),
                ),
              ],
            ),
          GestureDetector(
            onTap: () async {
              await context.push('/notifications');
              ref.invalidate(unreadCountProvider);
            },
            child: Padding(
              padding: const EdgeInsets.only(right: 16, left: 4),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const Icon(
                    Icons.notifications_none_rounded,
                    color: kText,
                    size: 26,
                  ),
                  if (unread > 0)
                    Positioned(
                      top: 1,
                      right: 1,
                      child: Container(
                        width: 9,
                        height: 9,
                        decoration: BoxDecoration(
                          color: kRed,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(authProvider.notifier).refreshProfile();
            ref.invalidate(activeOrdersProvider);
            ref.invalidate(recentHistoryProvider);
          },
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            children: [
              // ── 1. Greeting (below app bar) ─────────────────────────────
              Text(
                '${_getGreeting()} $partnerName!',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  color: kText,
                ),
              ),
              const SizedBox(height: 3),
              const Text(
                'Stay active, deliver more, earn more.',
                style: TextStyle(
                  fontSize: 12.5,
                  color: kTextMuted,
                ),
              ),

              const SizedBox(height: 20),

              // ── 2. Active Delivery Section ───────────────────────────────
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: const BoxDecoration(
                      color: kGreen,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.location_on_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Active Delivery',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: kText),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => context.go('/orders'),
                    child: const Row(
                      children: [
                        Text(
                          'View all',
                          style: TextStyle(
                            color: kGreen,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(Icons.chevron_right_rounded, color: kGreen, size: 18),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              active.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator(color: kGreen)),
                ),
                error: (e, _) => _emptyActiveState("Couldn't load orders", '$e'),
                data: (orders) {
                  if (orders.isEmpty) {
                    return _emptyActiveState(
                      online ? 'No active delivery' : 'You are offline',
                      online ? 'New orders will pop up here.' : 'Go online to start receiving orders.',
                    );
                  }
                  return Column(children: orders.map(_activeCard).toList());
                },
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyActiveState(String title, String subtitle) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F9F5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: kGreen.withValues(alpha: 0.12)),
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: Color(0xFFD1F2E2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.inventory_2_rounded,
              size: 32,
              color: kGreen,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 15.5,
              color: kText,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: kTextMuted, fontSize: 12.5),
          ),
        ],
      ),
    );
  }

  Widget _activeCard(DeliveryOrder o) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Row(
          children: [
            Text(o.orderId, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: kGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                o.status.toUpperCase(),
                style: const TextStyle(color: kGreen, fontWeight: FontWeight.w700, fontSize: 11),
              ),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            '₹${o.totalAmount.toStringAsFixed(0)}${o.isCOD ? ' · COD' : ''}\n${o.deliveryAddress}',
            style: const TextStyle(color: kTextMuted, fontSize: 12.5, height: 1.3),
          ),
        ),
        isThreeLine: true,
        trailing: const Icon(Icons.chevron_right_rounded, color: kTextFaint),
        onTap: () => context.push('/order/${o.orderId}'),
      ),
    );
  }

}
