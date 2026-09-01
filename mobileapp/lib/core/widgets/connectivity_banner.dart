import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/theme/app_typography.dart';
import 'package:freshcart/core/services/connectivity.dart';

/// Wraps the whole app (via `MaterialApp.router`'s `builder`) and slides a thin
/// strip down from the top whenever the device loses its network route. When it
/// comes back it briefly shows a green "Back online" confirmation, then hides.
class ConnectivityBanner extends ConsumerStatefulWidget {
  final Widget child;
  const ConnectivityBanner({super.key, required this.child});

  @override
  ConsumerState<ConnectivityBanner> createState() => _ConnectivityBannerState();
}

class _ConnectivityBannerState extends ConsumerState<ConnectivityBanner> {
  bool? _lastOnline;
  bool _showBackOnline = false;

  @override
  Widget build(BuildContext context) {
    final online = ref.watch(connectivityProvider).maybeWhen(
          data: (v) => v,
          orElse: () => true,
        );

    if (_lastOnline == false && online) {
      _showBackOnline = true;
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _showBackOnline = false);
      });
    }
    _lastOnline = online;

    final showStrip = !online || _showBackOnline;
    final offline = !online;

    return Material(
      color: Colors.transparent,
      child: Column(
        children: [
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOut,
            child: showStrip
                ? SafeArea(
                    bottom: false,
                    child: Container(
                      width: double.infinity,
                      color: offline ? AppColors.errorText : AppColors.success,
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            offline ? Icons.wifi_off_rounded : Icons.wifi_rounded,
                            size: 14,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              offline
                                  ? "You're offline — some things may not work"
                                  : 'Back online',
                              style: AppTypography.labelSmall(Colors.white)
                                  .copyWith(fontWeight: FontWeight.w600),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
          Expanded(child: widget.child),
        ],
      ),
    );
  }
}
