import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/features/orders/presentation/controllers/orders_controller.dart';

const double _kRevealWidth = 56;
const double _kPillWidth = 260;

/// Floating "your order is on the way" pill shown above the bottom nav,
/// mirroring [FloatingCart]'s look. Swipe left reveals a red X behind the
/// pill; only tapping that X dismisses it — releasing the drag anywhere
/// else just snaps the pill back open or closed.
class ActiveOrderPill extends ConsumerStatefulWidget {
  final ValueChanged<String> onTap;
  const ActiveOrderPill({super.key, required this.onTap});

  @override
  ConsumerState<ActiveOrderPill> createState() => _ActiveOrderPillState();
}

class _ActiveOrderPillState extends ConsumerState<ActiveOrderPill> {
  String? _dismissedOrderId;
  bool _revealed = false;
  bool _dragging = false;
  double _offset = 0; // 0 (closed) .. -_kRevealWidth (open)

  void _snapTo(bool revealed) {
    setState(() {
      _revealed = revealed;
      _offset = revealed ? -_kRevealWidth : 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(ordersProvider);
    final order = ref.read(ordersProvider.notifier).activeOrder;
    if (order == null || order.id == _dismissedOrderId) return const SizedBox.shrink();

    final title = order.statusRaw.toLowerCase() == 'out for delivery'
        ? 'Your order is on the way'
        : 'Order ${order.statusText}';
    final subtitle = 'Arriving in ${order.eta} · tap to track';

    return Align(
      alignment: Alignment.bottomCenter,
      heightFactor: 1.0,
      child: SizedBox(
        width: _kPillWidth,
        height: 52,
        child: Stack(
          alignment: Alignment.centerRight,
          children: [
            // Dismiss button, sits behind the pill and is revealed on swipe.
            SizedBox(
              width: _kRevealWidth,
              height: 44,
              child: Material(
                color: Colors.red.shade500,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: _revealed ? () => setState(() => _dismissedOrderId = order.id) : null,
                  child: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                ),
              ),
            ),

            AnimatedPositioned(
              duration: _dragging ? Duration.zero : const Duration(milliseconds: 220),
              curve: Curves.easeOut,
              left: _offset,
              right: -_offset,
              top: 0,
              bottom: 0,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onHorizontalDragStart: (_) => _dragging = true,
                onHorizontalDragUpdate: (details) {
                  setState(() {
                    _offset = (_offset + details.delta.dx).clamp(-_kRevealWidth, 0.0);
                  });
                },
                onHorizontalDragEnd: (_) {
                  _dragging = false;
                  _snapTo(_offset < -_kRevealWidth / 2);
                },
                onTap: () {
                  if (_revealed) {
                    _snapTo(false);
                  } else {
                    widget.onTap(order.id);
                  }
                },
                child: Material(
                  color: const Color(0xFF2E7D32),
                  borderRadius: BorderRadius.circular(26),
                  elevation: 6,
                  shadowColor: const Color(0xFF2E7D32).withOpacity(0.4),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  height: 1.1,
                                ),
                              ),
                              const SizedBox(height: 1),
                              Text(
                                subtitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right_rounded, color: Colors.white70, size: 18),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
