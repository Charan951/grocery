import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:freshcart_delivery/core/delivery_numbering.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';
import 'package:freshcart_delivery/core/widgets/filter_sheet.dart';
import 'package:freshcart_delivery/core/widgets/tab_back_button.dart';

final _rangeProvider = StateProvider.autoDispose<String>((ref) => 'today');

final earningsProvider = FutureProvider.autoDispose<
    ({
      Map<String, num> summary,
      Map<String, dynamic> bonus,
      List<Map<String, dynamic>> items
    })>((ref) async {
  final range = ref.watch(_rangeProvider);
  return ref.read(apiProvider).earnings(range: range);
});

final settlementsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final range = ref.watch(_rangeProvider);
  return ref.read(apiProvider).settlements(range: range);
});

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final range = ref.watch(_rangeProvider);
    final async = ref.watch(earningsProvider);
    final numberByOrderId = ref.watch(deliveryNumberingProvider).valueOrNull ?? const <String, int>{};

    return Scaffold(
      backgroundColor: kPaper,
      appBar: AppBar(
        leading: const TabBackButton(),
        title: Text('${_rangeTitle(range)} earnings', style: GoogleFonts.rubik(fontWeight: FontWeight.w700, fontSize: 18)),
        actions: [
          FilterAction<String>(
            title: 'Time range',
            selected: range,
            options: const [
              FilterOption('today', 'Today'),
              FilterOption('week', 'This week'),
              FilterOption('month', 'This month'),
            ],
            onChanged: (v) => ref.read(_rangeProvider.notifier).state = v,
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator(color: kGreen)),
        error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: kRed))),
        data: (data) {
          final s = data.summary;
          final bonusData = data.bonus;
          final items = data.items;

          final totalEarned = s['totalEarned'] ?? s['total'] ?? 0;
          final pendingAmount = s['pendingAmount'] ?? s['pending'] ?? 0;
          final settledAmount = s['settledAmount'] ?? s['settled'] ?? 0;

          final todayBonus = (bonusData['todayBonus'] ?? 0).toInt();
          // Bonus milestones reset daily, so the card always tracks today.
          final todayCount = (bonusData['completedCount'] ?? s['todayCount'] ?? 0).toInt();
          final completedCount = (s['count'] ?? items.length).toInt();

          return RefreshIndicator(
            color: kGreen,
            onRefresh: () async {
              ref.invalidate(earningsProvider);
              ref.invalidate(settlementsProvider);
            },
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              children: [
                // 1. Top Header Cards (Total Earned, Pending Settlement, Settled)
                Row(
                  children: [
                    Expanded(
                      child: _HeaderSummaryCard(
                        title: 'Total Earned',
                        value: '₹${totalEarned.toStringAsFixed(0)}',
                        icon: Icons.account_balance_wallet_rounded,
                        bgColor: kInk,
                        textColor: Colors.white,
                        accentColor: kGreen,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _HeaderSummaryCard(
                        title: 'Pending Settlement',
                        value: '₹${pendingAmount.toStringAsFixed(0)}',
                        icon: Icons.hourglass_top_rounded,
                        bgColor: kSurface,
                        textColor: Colors.orange.shade800,
                        accentColor: Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _HeaderSummaryCard(
                        title: 'Settled',
                        value: '₹${settledAmount.toStringAsFixed(0)}',
                        icon: Icons.check_circle_rounded,
                        bgColor: kSurface,
                        textColor: kGreen,
                        accentColor: kGreen,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 2. Today's Bonus Pay (24h Order Milestone Progress)
                _BonusPayCard(
                  completedCount: todayCount,
                  todayBonus: todayBonus,
                ),
                const SizedBox(height: 20),

                // 3. Completed Orders Section Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$completedCount ${completedCount == 1 ? 'Delivery' : 'Deliveries'} completed',
                          style: GoogleFonts.rubik(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: kText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          items.isNotEmpty
                              ? 'last delivery ${_getTimeAgo(items.first['earnedAt'])}'
                              : 'no deliveries ${_rangePhrase(range)} yet',
                          style: const TextStyle(fontSize: 12, color: kTextMuted),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: kGreenSoft,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_rounded, size: 14, color: kGreen),
                          const SizedBox(width: 4),
                          Text(
                            'Active',
                            style: GoogleFonts.nunitoSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: kGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 4. Completed Orders List
                if (items.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: kSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: kLedgerLine),
                    ),
                    child: const Center(
                      child: Text(
                        'No completed deliveries in this period',
                        style: TextStyle(color: kTextMuted, fontWeight: FontWeight.w600),
                      ),
                    ),
                  )
                else
                  ...items.map((e) {
                    final status = (e['status'] ?? 'pending').toString();
                    final label = deliveryLabel(numberByOrderId, e['orderId']?.toString());
                    final earnedAt = e['earnedAt'];
                    final timeStr = range == 'today'
                        ? _formatTime(earnedAt)
                        : '${_SettlementHistorySection._formatDate(earnedAt)}, ${_formatTime(earnedAt)}';

                    return _OrderItemCard(
                      label: label,
                      timeStr: timeStr,
                      total: (e['total'] ?? 0).toDouble(),
                      baseFee: (e['baseFee'] ?? 0).toDouble(),
                      distanceKm: (e['distanceKm'] ?? 0).toDouble(),
                      distanceFee: (e['distanceFee'] ?? 0).toDouble(),
                      tips: (e['tips'] ?? 0).toDouble(),
                      status: status,
                      settledAt: e['settledAt'],
                    );
                  }),

                const SizedBox(height: 20),

                // 5. Detailed Pay Breakdown (Expandable Summary)
                _DetailedBreakdownExpansionTile(s: s),
                const SizedBox(height: 16),

                // 6. Settlement History
                _SettlementHistorySection(periodLabel: _rangePhrase(range)),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  static String _rangeTitle(String range) => switch (range) {
        'week' => "This week's",
        'month' => "This month's",
        _ => "Today's",
      };

  static String _rangePhrase(String range) => switch (range) {
        'week' => 'this week',
        'month' => 'this month',
        _ => 'today',
      };

  static String _formatTime(dynamic dateRaw) {
    if (dateRaw == null) return 'Recent';
    try {
      final dt = DateTime.parse(dateRaw.toString()).toLocal();
      final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$hour:$minute $period';
    } catch (_) {
      return 'Recent';
    }
  }

  static String _getTimeAgo(dynamic dateRaw) {
    if (dateRaw == null) return 'recently';
    try {
      final dt = DateTime.parse(dateRaw.toString());
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}mins ago';
      if (diff.inHours < 24) return '${diff.inHours}hrs ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'recently';
    }
  }
}

class _HeaderSummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color bgColor;
  final Color textColor;
  final Color accentColor;

  const _HeaderSummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.bgColor,
    required this.textColor,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: bgColor == kSurface ? kLedgerLine : Colors.transparent),
        boxShadow: bgColor == kSurface
            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: bgColor == kInk ? kInkSoft : kGreenSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: accentColor),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: GoogleFonts.rubik(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: textColor,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: bgColor == kInk ? Colors.white70 : kTextMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _BonusPayCard extends StatelessWidget {
  final int completedCount;
  final int todayBonus;

  const _BonusPayCard({
    required this.completedCount,
    required this.todayBonus,
  });

  @override
  Widget build(BuildContext context) {
    final tiers = [
      {'orders': 5, 'bonus': 20},
      {'orders': 10, 'bonus': 50},
      {'orders': 15, 'bonus': 100},
      {'orders': 20, 'bonus': 180},
    ];

    int nextTarget = 5;
    int nextBonus = 20;
    for (final t in tiers) {
      if (completedCount < (t['orders'] as int)) {
        nextTarget = t['orders'] as int;
        nextBonus = t['bonus'] as int;
        break;
      }
    }
    final remaining = nextTarget - completedCount;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kGreen.withValues(alpha: 0.3), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: kGreen.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Today\'s Bonus Pay',
                    style: GoogleFonts.rubik(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: kText,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    '12am - 11:59pm (24 hrs)',
                    style: TextStyle(fontSize: 12, color: kTextMuted),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: kGreenSoft,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: kGreen.withValues(alpha: 0.4)),
                ),
                child: Text(
                  '₹$todayBonus Bonus',
                  style: GoogleFonts.rubik(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: kGreen,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Milestone horizontal step progress tracker
          LayoutBuilder(
            builder: (context, constraints) {
              return Column(
                children: [
                  // Top Row: Bonus values
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: tiers.map((t) {
                      final targetOrders = t['orders'] as int;
                      final isUnlocked = completedCount >= targetOrders;
                      return SizedBox(
                        width: constraints.maxWidth / 4,
                        child: Text(
                          '₹${t['bonus']}',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.rubik(
                            fontSize: 13,
                            fontWeight: isUnlocked ? FontWeight.w800 : FontWeight.w600,
                            color: isUnlocked ? kGreen : kTextMuted,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),

                  // Middle Row: Line & Step Nodes
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      // Track background line
                      Container(
                        height: 4,
                        width: constraints.maxWidth - 40,
                        decoration: BoxDecoration(
                          color: kLedgerLine,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Progress filled line
                      Positioned(
                        left: 20,
                        child: Container(
                          height: 4,
                          width: (constraints.maxWidth - 40) *
                              (completedCount / 20).clamp(0.0, 1.0),
                          decoration: BoxDecoration(
                            color: kGreen,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      // Step Nodes
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: tiers.map((t) {
                          final targetOrders = t['orders'] as int;
                          final isDone = completedCount >= targetOrders;
                          final isCurrent = !isDone && (completedCount < targetOrders) &&
                              (targetOrders == nextTarget);

                          return Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDone
                                  ? kGreen
                                  : (isCurrent ? kSurface : kSurface),
                              border: Border.all(
                                color: isDone || isCurrent ? kGreen : kTextFaint,
                                width: isCurrent ? 3 : 2,
                              ),
                              boxShadow: isCurrent
                                  ? [BoxShadow(color: kGreen.withValues(alpha: 0.3), blurRadius: 6)]
                                  : null,
                            ),
                            child: isDone
                                ? const Icon(Icons.check, size: 14, color: Colors.white)
                                : (isCurrent
                                    ? Center(
                                        child: Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: kGreen,
                                          ),
                                        ),
                                      )
                                    : null),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Bottom Row: Orders labels
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: tiers.map((t) {
                      final targetOrders = t['orders'] as int;
                      final isUnlocked = completedCount >= targetOrders;
                      return SizedBox(
                        width: constraints.maxWidth / 4,
                        child: Text(
                          '${t['orders']} Orders',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isUnlocked ? FontWeight.w700 : FontWeight.w500,
                            color: isUnlocked ? kText : kTextFaint,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 16),

          // Goal progress message banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: kGreenSoft.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.stars_rounded, size: 18, color: kGreen),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    completedCount >= 20
                        ? '🏆 Maximum daily bonus achieved! Great effort today!'
                        : 'Complete $remaining more order${remaining > 1 ? 's' : ''} to unlock ₹$nextBonus bonus pay!',
                    style: GoogleFonts.nunitoSans(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: kInk,
                    ),
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

class _OrderItemCard extends StatefulWidget {
  final String label;
  final String timeStr;
  final double total;
  final double baseFee;
  final double distanceKm;
  final double distanceFee;
  final double tips;
  final String status; // pending | eligible | settled
  final dynamic settledAt;

  const _OrderItemCard({
    required this.label,
    required this.timeStr,
    required this.total,
    required this.baseFee,
    required this.distanceKm,
    required this.distanceFee,
    required this.tips,
    required this.status,
    this.settledAt,
  });

  @override
  State<_OrderItemCard> createState() => _OrderItemCardState();
}

class _OrderItemCardState extends State<_OrderItemCard> {
  bool _expanded = false;

  String get _statusLabel => switch (widget.status) {
        'settled' => 'Settled',
        'eligible' => 'Eligible',
        _ => 'Pending',
      };

  Color get _statusColor => switch (widget.status) {
        'settled' => kGreen,
        'eligible' => Colors.blue,
        _ => Colors.orange,
      };

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: kLedgerLine),
      ),
      child: InkWell(
        onTap: () => setState(() => _expanded = !_expanded),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: kGreenSoft,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.local_shipping_rounded, size: 20, color: kGreen),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.label,
                          style: GoogleFonts.rubik(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: kText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.timeStr,
                          style: const TextStyle(fontSize: 12, color: kTextMuted),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹${widget.total.toStringAsFixed(0)}',
                        style: GoogleFonts.rubik(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: kText,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            _statusLabel,
                            style: GoogleFonts.nunitoSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _statusColor,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            _expanded
                                ? Icons.keyboard_arrow_up_rounded
                                : Icons.keyboard_arrow_right_rounded,
                            size: 16,
                            color: kTextFaint,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),

              // Expanded breakdown
              if (_expanded) ...[
                const Divider(height: 20),
                _breakdownLine('Base Pay', '₹${widget.baseFee.toStringAsFixed(0)}'),
                _breakdownLine(
                  'Distance Pay (${widget.distanceKm.toStringAsFixed(1)} km)',
                  '₹${widget.distanceFee.toStringAsFixed(0)}',
                ),
                if (widget.tips > 0)
                  _breakdownLine('Customer Tip', '₹${widget.tips.toStringAsFixed(0)}'),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Payout Status',
                      style: TextStyle(fontSize: 12, color: kTextMuted),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.status == 'settled'
                            ? 'Settled to Bank'
                            : widget.status == 'eligible'
                                ? 'Eligible for Settlement'
                                : 'Awaiting Eligibility',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                if (widget.status == 'settled' && widget.settledAt != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Settled on ${EarningsScreen._formatTime(widget.settledAt)}',
                      style: const TextStyle(fontSize: 11, color: kTextMuted),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _breakdownLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12.5, color: kTextMuted)),
          Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: kText)),
        ],
      ),
    );
  }
}

class _DetailedBreakdownExpansionTile extends StatelessWidget {
  final Map<String, num> s;
  const _DetailedBreakdownExpansionTile({required this.s});

  @override
  Widget build(BuildContext context) {
    String money(num? v) => '₹${(v ?? 0).toStringAsFixed(0)}';

    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        backgroundColor: kSurface,
        collapsedBackgroundColor: kSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: kLedgerLine),
        ),
        collapsedShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: kLedgerLine),
        ),
        title: Text(
          'Total Earnings Summary Breakdown',
          style: GoogleFonts.rubik(fontSize: 14, fontWeight: FontWeight.w700, color: kText),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: [
                const Divider(height: 16),
                _line('Base Pay Total', money(s['base'])),
                _line('Distance Pay Total', money(s['distance'])),
                _line('Tips Total', money(s['tips'])),
                _line('Bonus Pay Total', money(s['bonusTotal'])),
                const Divider(height: 16),
                _line('Awaiting Payout', money(s['pendingAmount'] ?? s['pending']), strong: true),
                _line('Settled Payout', money(s['settledAmount'] ?? s['settled'])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _line(String k, String v, {bool strong = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              k,
              style: TextStyle(
                color: kTextMuted,
                fontSize: 13,
                fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
            Text(
              v,
              style: TextStyle(
                color: kText,
                fontSize: 13,
                fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      );
}

class _SettlementHistorySection extends ConsumerWidget {
  final String periodLabel;
  const _SettlementHistorySection({required this.periodLabel});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSettlements = ref.watch(settlementsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Settlement History',
          style: GoogleFonts.rubik(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: kText,
          ),
        ),
        const SizedBox(height: 10),
        asyncSettlements.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator(color: kGreen)),
          ),
          error: (e, _) => const SizedBox.shrink(),
          data: (items) {
            if (items.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: kSurface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: kLedgerLine),
                ),
                child: Center(
                  child: Text(
                    'No settlements $periodLabel',
                    style: const TextStyle(color: kTextMuted, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              );
            }
            return Column(
              children: items.map((s) {
                final amount = (s['amount'] ?? 0).toDouble();
                final orderCount = s['orderCount'] ?? (s['orderIds'] as List?)?.length ?? 0;
                final dateRaw = s['settledAt'];
                final dateStr = _formatDate(dateRaw);
                final payoutStatus = (s['status'] ?? 'PENDING').toString();
                final isSuccess = payoutStatus == 'SUCCESS';
                final isFailed = payoutStatus == 'FAILED';
                final statusColor = isSuccess ? kGreen : (isFailed ? kRed : Colors.orange);

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: kLedgerLine),
                  ),
                  child: ListTile(
                    onTap: () => _showSettlementDialog(context, s),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: kGreenSoft,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.receipt_long_rounded, color: kGreen, size: 22),
                    ),
                    title: Text(
                      'Settlement',
                      style: GoogleFonts.rubik(fontWeight: FontWeight.w700, fontSize: 14.5, color: kText),
                    ),
                    subtitle: Text(
                      '$orderCount Orders • $dateStr',
                      style: const TextStyle(fontSize: 12, color: kTextMuted),
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${amount.toStringAsFixed(0)}',
                          style: GoogleFonts.rubik(fontWeight: FontWeight.w800, fontSize: 15, color: statusColor),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            payoutStatus,
                            style: GoogleFonts.nunitoSans(fontSize: 10, fontWeight: FontWeight.w700, color: statusColor),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }

  static String _formatDate(dynamic dateRaw) {
    if (dateRaw == null) return '';
    try {
      final dt = DateTime.parse(dateRaw.toString()).toLocal();
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return '';
    }
  }

  static void _showSettlementDialog(BuildContext context, Map<String, dynamic> s) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Settlement details',
                  style: GoogleFonts.rubik(fontWeight: FontWeight.w700, fontSize: 18),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 8),
            _infoRow('Amount', '₹${(s['amount'] ?? 0)}'),
            _infoRow('Orders Included', '${s['orderCount'] ?? 0} Orders'),
            _infoRow('Date', _formatDate(s['settledAt'])),
            _infoRow('Status', (s['status'] ?? 'PENDING').toString()),
            if ((s['paymentReference'] ?? '').toString().isNotEmpty)
              _infoRow('Reference', s['paymentReference'].toString()),
            if ((s['failureReason'] ?? '').toString().isNotEmpty)
              _infoRow('Reason', s['failureReason'].toString()),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  static Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: kTextMuted)),
          Text(value, style: GoogleFonts.rubik(fontSize: 14, fontWeight: FontWeight.w700, color: kText)),
        ],
      ),
    );
  }
}

