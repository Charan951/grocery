import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart_delivery/core/error/api_exception.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/models/delivery_models.dart';

/// Holds the current in-flight offer (if any). Emits null when there's none.
class OfferController extends StateNotifier<DeliveryOffer?> {
  final Ref _ref;
  final List<StreamSubscription> _subs = [];

  OfferController(this._ref) : super(null) {
    final s = _ref.read(socketProvider);
    _subs.add(s.offers.listen((j) => state = DeliveryOffer.fromJson(j)));
    _subs.add(s.revoked.listen((j) {
      if (state?.assignmentId == j['assignmentId'] || j['orderId'] == state?.orderId) state = null;
    }));
  }

  void dismiss() => state = null;

  Future<DeliveryOrder?> accept() async {
    final o = state;
    if (o == null) return null;
    try {
      final order = await _ref.read(apiProvider).acceptAssignment(o.assignmentId);
      state = null;
      return order;
    } on ApiException {
      state = null; // offer gone / taken
      rethrow;
    }
  }

  Future<void> reject({String? reason}) async {
    final o = state;
    if (o == null) return;
    state = null;
    try {
      await _ref.read(apiProvider).rejectAssignment(o.assignmentId, reason: reason);
    } on ApiException {/* already gone */}
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}

final offerProvider = StateNotifierProvider<OfferController, DeliveryOffer?>((ref) => OfferController(ref));
