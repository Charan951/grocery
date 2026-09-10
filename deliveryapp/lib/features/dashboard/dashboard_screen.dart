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
    final historyAsync = ref.watch(recentHistoryProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    final partnerName = p?.name.isNotEmpty == true
        ? p!.name.split(' ').first
        : 'Partner';

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF8),
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
              // ── 1. Top Header: Single Line Greeting + Notifications Bell ───────
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Partner avatar
                  Container(
                    width: 46,
                    height: 46,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1F2E2),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        partnerName.isNotEmpty ? partnerName[0].toUpperCase() : 'P',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                          color: kGreen,
                        ),
                      ),
                    ),
                  ),
                  // Greeting & Subtitle
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
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
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Notification bell floating button
                  GestureDetector(
                    onTap: () async {
                      await context.push('/notifications');
                      ref.invalidate(unreadCountProvider);
                    },
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                        border: Border.all(color: const Color(0xFFECEBE4)),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(
                            Icons.notifications_none_rounded,
                            color: kText,
                            size: 24,
                          ),
                          if (unread > 0)
                            Positioned(
                              top: 10,
                              right: 10,
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

              const SizedBox(height: 18),

              // ── 2. Online Status Switch Card (Toggle Only) ───────────────
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(color: const Color(0xFFEAE8DE)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: online
                            ? kGreen.withValues(alpha: 0.15)
                            : kTextFaint.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: online ? kGreen : kTextFaint,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            online ? "You're online" : "You're offline",
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15.5,
                              color: kText,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            online
                                ? 'Ready to receive orders'
                                : 'Go online to receive orders',
                            style: const TextStyle(
                              color: kTextMuted,
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_toggling)
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: kGreen),
                      )
                    else
                      Transform.scale(
                        scale: 0.9,
                        child: Switch(
                          value: online,
                          onChanged: _toggle,
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ── 3. Promo / next-delivery banner ─────────────────────────
              _promoBanner(context),

              const SizedBox(height: 16),

              // ── 4. Stats card (4 columns in one surface) ────────────────
              Container(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(color: const Color(0xFFEAE8DE)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _statCol(
                      iconBgColor: const Color(0xFFD1F2E2),
                      iconColor: kGreen,
                      icon: Icons.currency_rupee_rounded,
                      value: '₹${(p?.todayEarnings ?? 0).toStringAsFixed(0)}',
                      label: "Today's Earnings",
                    ),
                    _statDivider(),
                    _statCol(
                      iconBgColor: const Color(0xFFD6E6FE),
                      iconColor: const Color(0xFF2563EB),
                      icon: Icons.check_rounded,
                      value: '${p?.completedCount ?? 0}',
                      label: 'Delivered',
                    ),
                    _statDivider(),
                    _statCol(
                      iconBgColor: const Color(0xFFFFE5D0),
                      iconColor: const Color(0xFFF97316),
                      icon: Icons.star_rounded,
                      value: (p?.rating ?? 5.0).toStringAsFixed(1),
                      label: 'Rating',
                    ),
                    _statDivider(),
                    _statCol(
                      iconBgColor: const Color(0xFFE3DCFF),
                      iconColor: const Color(0xFF7C3AED),
                      icon: Icons.calendar_today_rounded,
                      value: '0',
                      label: 'This Week',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // ── 4. Active Delivery Section ───────────────────────────────
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

              const SizedBox(height: 22),

              // ── 5. Recent Activity Section (Real History) ────────────────
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
                      Icons.sensors_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Recent Activity',
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

              _recentActivityCard(online: online, historyAsync: historyAsync),

              const SizedBox(height: 16),

              // ── 6. Important Notice Banner ───────────────────────────────
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F6F0),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: kGreen.withValues(alpha: 0.15)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFFD1F2E2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.campaign_rounded, color: kGreen, size: 22),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Important',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: kText,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Keep your app active and be on time to get more deliveries and better earnings.',
                            style: TextStyle(
                              color: kTextMuted,
                              fontSize: 12,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.chevron_right_rounded, color: kTextMuted, size: 20),
                  ],
                ),
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _promoBanner(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFDDF3E4), Color(0xFFBEE7CE)],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -6,
            top: 0,
            child: Opacity(
              opacity: 0.9,
              child: Image.asset(
                'assets/images/partner_delivery.jpg',
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => const SizedBox(width: 120),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  "Let's get you\nyour next delivery!",
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 17,
                    height: 1.2,
                    color: kText,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Accept orders, deliver smiles.',
                  style: TextStyle(fontSize: 12.5, color: kTextMuted),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: () => context.go('/orders'),
                  style: FilledButton.styleFrom(
                    backgroundColor: kGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('View Orders',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statDivider() => Container(
        width: 1,
        height: 44,
        color: const Color(0xFFEEECE2),
      );

  Widget _statCol({
    required Color iconBgColor,
    required Color iconColor,
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: iconBgColor, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 16,
              color: kText,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: kTextMuted,
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
              height: 1.2,
            ),
          ),
        ],
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

  Widget _recentActivityCard({
    required bool online,
    required AsyncValue<List<DeliveryOrder>> historyAsync,
  }) {
    return historyAsync.when(
      loading: () => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFEAE8DE)),
        ),
        child: const Center(child: CircularProgressIndicator(color: kGreen)),
      ),
      error: (err, stack) => _recentActivityEmpty(online),
      data: (historyOrders) {
        if (historyOrders.isEmpty) {
          return _recentActivityEmpty(online);
        }

        final displayOrders = historyOrders.take(3).toList();

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
            border: Border.all(color: const Color(0xFFEAE8DE)),
          ),
          child: Column(
            children: List.generate(displayOrders.length, (index) {
              final o = displayOrders[index];
              final isLast = index == displayOrders.length - 1;

              return InkWell(
                onTap: () => context.push('/order/${o.orderId}'),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        width: 28,
                        child: Column(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              margin: const EdgeInsets.only(top: 3),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: kGreen,
                              ),
                            ),
                            if (!isLast)
                              Expanded(
                                child: Container(
                                  width: 2,
                                  margin: const EdgeInsets.symmetric(vertical: 4),
                                  color: kGreen.withValues(alpha: 0.35),
                                ),
                              ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Order #${o.orderId} · ${o.status.toUpperCase()}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13.5,
                                        color: kText,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '₹${o.totalAmount.toStringAsFixed(0)} · ${o.deliveryAddress}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: kTextMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right_rounded,
                                color: kTextFaint,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        );
      },
    );
  }

  Widget _recentActivityEmpty(bool online) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: const Color(0xFFEAE8DE)),
      ),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: online ? kGreen : kTextFaint,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  online ? 'You are online' : 'You are offline',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    color: kText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  online ? 'Ready to receive orders' : 'Go online to start receiving orders',
                  style: const TextStyle(
                    color: kTextMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
