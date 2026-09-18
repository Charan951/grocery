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

  @override
  Widget build(BuildContext context) {
    final p = ref.watch(authProvider.select((s) => s.profile));
    final online = p?.isOnline ?? false;
    final active = ref.watch(activeOrdersProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: FittedBox(
          fit: BoxFit.scaleDown,
          child: RichText(
            text: const TextSpan(
              children: [
                TextSpan(
                  text: 'FreshCart ',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 19,
                    color: kGreen,
                    letterSpacing: -0.4,
                  ),
                ),
                TextSpan(
                  text: 'Delivery',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 19,
                    color: kText,
                    letterSpacing: -0.4,
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          if (_toggling)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
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
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  online ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: online ? kGreen : kTextMuted,
                  ),
                ),
                Transform.scale(
                  scale: 0.8,
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
              // ── 1. Performance Overview Header ───────────────────────────
              const Text(
                'Delivery Performance',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: kText,
                ),
              ),
              const SizedBox(height: 3),
              const Text(
                "Overview of today's performance",
                style: TextStyle(
                  fontSize: 12.5,
                  color: kTextMuted,
                ),
              ),

              const SizedBox(height: 14),

              // ── 2. KPI Performance Cards ─────────────────────────────────
              Row(
                children: [
                  _kpiCard('Completed', p?.completedCount ?? 0),
                  const SizedBox(width: 12),
                  _kpiCard('Pending', active.valueOrNull?.length ?? 0),
                ],
              ),

              const SizedBox(height: 24),

              // ── 3. Assigned Deliveries Section Header ───────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Assigned Deliveries',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: kText,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => context.go('/orders'),
                    child: const Text(
                      'View All',
                      style: TextStyle(
                        color: Color(0xFFD97706),
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // ── 4. Active Deliveries List ────────────────────────────────
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

  Widget _kpiCard(String label, int value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: const Color(0xFFFDE68A),
            width: 1.2,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: kText,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$value',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: kText,
              ),
            ),
          ],
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
    final totalItems = o.items.fold(0, (sum, i) => sum + i.quantity);
    final itemsDisplay = totalItems > 0 ? totalItems : (o.items.isNotEmpty ? o.items.length : 1);

    Color statusBgColor = const Color(0xFFDCFCE7);
    Color statusTextColor = const Color(0xFF16A34A);
    String statusText = 'In Transit';

    final st = o.status.toLowerCase();
    if (st.contains('assign') || st == 'pending') {
      statusBgColor = const Color(0xFFDCFCE7);
      statusTextColor = const Color(0xFF16A34A);
      statusText = 'ASSIGNED';
    } else if (st.contains('transit') || st.contains('picked') || st.contains('out')) {
      statusBgColor = const Color(0xFFDCFCE7);
      statusTextColor = const Color(0xFF16A34A);
      statusText = 'In Transit';
    } else if (st.contains('partial')) {
      statusBgColor = const Color(0xFFFFEDD5);
      statusTextColor = const Color(0xFFEA580C);
      statusText = 'Partial';
    } else if (st.contains('fail') || st.contains('cancel')) {
      statusBgColor = const Color(0xFFFEE2E2);
      statusTextColor = const Color(0xFFDC2626);
      statusText = o.status.toUpperCase();
    } else {
      statusText = o.status.toUpperCase();
    }

    String timeStr = '2:30 PM';
    if (o.timeline.isNotEmpty) {
      final firstTime = o.timeline.first['timestamp'] ?? o.timeline.first['time'];
      if (firstTime != null) {
        final dt = DateTime.tryParse(firstTime.toString());
        if (dt != null) {
          final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
          final minute = dt.minute.toString().padLeft(2, '0');
          final ampm = dt.hour >= 12 ? 'PM' : 'AM';
          timeStr = '$hour:$minute $ampm';
        }
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE68A), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/order/${o.orderId}'),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFF1E293B),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.inventory_2_outlined,
                          color: Color(0xFF22C55E),
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order : #${o.orderId}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: kText,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            timeStr,
                            style: const TextStyle(
                              fontSize: 12,
                              color: kTextMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusBgColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(
                          color: statusTextColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 11.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        o.customerName.isNotEmpty ? o.customerName : 'Customer',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: kText,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        o.deliveryAddress,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF4B5563),
                          height: 1.35,
                        ),
                      ),
                      if (o.customerPhone.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          o.customerPhone,
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: kTextMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(
                      Icons.assignment_outlined,
                      size: 17,
                      color: kTextMuted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '$itemsDisplay items ',
                      style: const TextStyle(
                        fontSize: 13,
                        color: kText,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '₹${o.totalAmount.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: kText,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

}
