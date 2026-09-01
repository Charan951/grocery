import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/api_service.dart';
import 'package:freshcart/core/services/socket_service.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;
import 'package:freshcart/features/orders/data/models/order_model.dart';

class TrackingState {
  final String orderId;
  final String status; // human label
  final OrderStatus statusBucket;
  final int etaMinutes;
  final LatLng riderLocation;
  final String riderName;
  final String riderPhone;       // dialable number, only once the reveal window opens
  final String riderPhoneMasked; // e.g. "98••••10" — always safe to show
  final bool canContact;         // reveal window (Out For Delivery / Arrived) + a real number
  final bool hasRider;
  final bool connected;
  final List<OrderTimelineEntry> timeline;

  const TrackingState({
    required this.orderId,
    required this.status,
    this.statusBucket = OrderStatus.placed,
    required this.etaMinutes,
    required this.riderLocation,
    required this.riderName,
    required this.riderPhone,
    this.riderPhoneMasked = '',
    this.canContact = false,
    this.hasRider = false,
    this.connected = false,
    this.timeline = const [],
  });

  TrackingState copyWith({
    String? status,
    OrderStatus? statusBucket,
    int? etaMinutes,
    LatLng? riderLocation,
    String? riderName,
    String? riderPhone,
    String? riderPhoneMasked,
    bool? canContact,
    bool? hasRider,
    bool? connected,
    List<OrderTimelineEntry>? timeline,
  }) {
    return TrackingState(
      orderId: orderId,
      status: status ?? this.status,
      statusBucket: statusBucket ?? this.statusBucket,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      riderLocation: riderLocation ?? this.riderLocation,
      riderName: riderName ?? this.riderName,
      riderPhone: riderPhone ?? this.riderPhone,
      riderPhoneMasked: riderPhoneMasked ?? this.riderPhoneMasked,
      canContact: canContact ?? this.canContact,
      hasRider: hasRider ?? this.hasRider,
      connected: connected ?? this.connected,
      timeline: timeline ?? this.timeline,
    );
  }
}

class TrackingNotifier extends StateNotifier<TrackingState> {
  final ApiService _api;
  final SocketService _socket;
  final String orderId;

  final _subs = <StreamSubscription>[];
  Timer? _poll;

  TrackingNotifier(this._api, this._socket, this.orderId)
      : super(TrackingState(
          orderId: orderId,
          status: 'Fetching status…',
          etaMinutes: 10,
          // Store/dark-store location as the map origin until a rider reports in.
          riderLocation: const LatLng(17.4474, 78.3762),
          riderName: 'Delivery partner',
          riderPhone: '',
        )) {
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _refreshFromApi();

    _socket.joinOrderRoom(orderId);
    state = state.copyWith(connected: _socket.isConnected);

    _subs.add(_socket.connectionStream.listen((up) {
      state = state.copyWith(connected: up);
      if (up) _socket.joinOrderRoom(orderId);
    }));

    _subs.add(_socket.orderStatusStream.listen((d) {
      if (d['orderId'] != null && d['orderId'] != orderId) return;
      final raw = (d['status'] as String?) ?? state.status;
      state = state.copyWith(
        status: raw,
        statusBucket: orderStatusFrom(raw),
        etaMinutes: _minsFrom(d['eta']) ?? state.etaMinutes,
        timeline: _parseTimeline(d['timeline']) ?? state.timeline,
      );
    }));

    _subs.add(_socket.riderLocationStream.listen((d) {
      if (d['orderId'] != null && d['orderId'] != orderId) return;
      final lat = (d['lat'] as num?)?.toDouble();
      final lng = (d['lng'] as num?)?.toDouble();
      state = state.copyWith(
        riderLocation: (lat != null && lng != null) ? LatLng(lat, lng) : state.riderLocation,
        hasRider: true,
        etaMinutes: (d['etaMinutes'] as num?)?.toInt() ?? state.etaMinutes,
        riderName: (d['riderName'] as String?) ?? state.riderName,
        riderPhone: (d['riderPhone'] as String?) ?? state.riderPhone,
      );
    }));

    // Fallback: while the socket is down, poll the order every 15s.
    _poll = Timer.periodic(const Duration(seconds: 15), (_) {
      if (!_socket.isConnected) _refreshFromApi();
    });
  }

  Future<void> _refreshFromApi() async {
    try {
      final raw = await _api.fetchOrder(orderId);
      final o = OrderModel.fromServerJson(raw);
      state = state.copyWith(
        status: o.statusRaw.isEmpty ? o.statusText : o.statusRaw,
        statusBucket: o.status,
        etaMinutes: _minsFrom(o.eta) ?? state.etaMinutes,
        timeline: o.timeline.isNotEmpty ? o.timeline : state.timeline,
      );

      // Server-side rider block (masked until Out For Delivery / Arrived).
      final d = raw['delivery'];
      if (d is Map) {
        final loc = d['location'];
        final name = (d['partnerName'] as String?)?.trim() ?? '';
        final real = (d['phone'] as String?)?.trim() ?? '';
        final masked = (d['phoneMasked'] as String?)?.trim() ?? '';
        state = state.copyWith(
          riderName: name.isNotEmpty ? name : state.riderName,
          riderPhone: real.isNotEmpty ? real : state.riderPhone,
          riderPhoneMasked: masked.isNotEmpty ? masked : state.riderPhoneMasked,
          canContact: d['canContact'] == true && real.isNotEmpty,
          hasRider: state.hasRider || loc is Map,
          riderLocation: (loc is Map && loc['lat'] is num && loc['lng'] is num)
              ? LatLng((loc['lat'] as num).toDouble(), (loc['lng'] as num).toDouble())
              : state.riderLocation,
        );
      }
    } catch (_) {
      // keep last-known state
    }
  }

  int? _minsFrom(dynamic v) {
    if (v is num) return v.toInt();
    final s = v?.toString() ?? '';
    final m = RegExp(r'\d+').firstMatch(s);
    return m == null ? null : int.tryParse(m.group(0)!);
  }

  List<OrderTimelineEntry>? _parseTimeline(dynamic v) {
    if (v is! List) return null;
    return v
        .whereType<Map>()
        .map((e) => OrderTimelineEntry.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  @override
  void dispose() {
    _poll?.cancel();
    for (final s in _subs) {
      s.cancel();
    }
    _socket.leaveOrderRoom(orderId);
    super.dispose();
  }
}

final trackingProvider =
    StateNotifierProvider.family<TrackingNotifier, TrackingState, String>((ref, orderId) {
  return TrackingNotifier(ref.read(apiServiceProvider), getIt<SocketService>(), orderId);
});
