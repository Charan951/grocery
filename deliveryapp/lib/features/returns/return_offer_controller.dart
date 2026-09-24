import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/features/auth/auth_controller.dart';
import 'package:freshcart_delivery/models/return_models.dart';

/// Pickups this partner is working on (Assigned / Arrived / Picked Up).
final activeReturnsProvider = FutureProvider.autoDispose<List<PartnerReturn>>((ref) {
  ref.watch(authProvider.select((s) => s.profile?.activeOrderIds.length));
  return ref.read(apiProvider).activeReturns();
});

/// The live return/exchange pickup offer, if any. Mirrors [OfferController].
class ReturnOfferController extends StateNotifier<ReturnOffer?> {
  final Ref _ref;
  final List<StreamSubscription> _subs = [];
  Timer? _poll;

  ReturnOfferController(this._ref) : super(null) {
    final s = _ref.read(socketProvider);
    _subs.add(s.returnOffers.listen((j) => state = ReturnOffer.fromJson(j)));
    _subs.add(s.returnRevoked.listen((j) {
      if (j['returnId'] == state?.returnId) state = null;
    }));
    _subs.add(s.returnChanged.listen((_) {
      _ref.read(authProvider.notifier).refreshProfile();
      _ref.invalidate(activeReturnsProvider);
    }));
    // A missed socket event (reconnect, backgrounded tab, a socket opened by
    // an older build) must not lose the pickup: re-check on every reconnect
    // and poll as a fallback while signed in. Pickup offers live 60s, so a
    // 15s poll always surfaces one in time.
    _subs.add(s.connection.listen((up) {
      if (up) checkPending();
    }));
    _poll = Timer.periodic(const Duration(seconds: 15), (_) => checkPending());
    checkPending();
  }

  void dismiss() => state = null;

  /// Pulls the live pickup offer from the API. Returns true when one is showing.
  Future<bool> checkPending() async {
    if (state != null) return true;
    // Never poll signed-out — a 401 here would trigger a logout.
    final token = _ref.read(tokenStoreProvider).token;
    if (token == null || token.isEmpty) return false;
    try {
      final list = await _ref.read(apiProvider).returnOffers();
      final live = list.where((o) => o.secondsLeft() > 0).toList();
      if (live.isNotEmpty && state == null) state = live.first;
    } on ApiException {
      /* socket remains the primary channel */
    }
    return state != null;
  }

  Future<String?> accept() async {
    final o = state;
    if (o == null) return null;
    try {
      await _ref.read(apiProvider).acceptReturn(o.returnId);
      state = null;
      _ref.read(authProvider.notifier).refreshProfile();
      _ref.invalidate(activeReturnsProvider);
      return o.returnId;
    } on ApiException {
      state = null;
      rethrow;
    }
  }

  Future<void> reject() async {
    final o = state;
    if (o == null) return;
    state = null;
    try {
      await _ref.read(apiProvider).rejectReturn(o.returnId, reason: 'declined');
    } on ApiException {
      /* already gone */
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}

final returnOfferProvider = StateNotifierProvider<ReturnOfferController, ReturnOffer?>(
  (ref) => ReturnOfferController(ref),
);
