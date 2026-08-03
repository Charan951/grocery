import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/socket_service.dart';

class TrackingState {
  final String orderId;
  final String status;
  final int etaMinutes;
  final LatLng riderLocation;
  final String riderName;
  final String riderPhone;

  TrackingState({
    required this.orderId,
    required this.status,
    required this.etaMinutes,
    required this.riderLocation,
    required this.riderName,
    required this.riderPhone,
  });

  TrackingState copyWith({
    String? status,
    int? etaMinutes,
    LatLng? riderLocation,
    String? riderName,
    String? riderPhone,
  }) {
    return TrackingState(
      orderId: orderId,
      status: status ?? this.status,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      riderLocation: riderLocation ?? this.riderLocation,
      riderName: riderName ?? this.riderName,
      riderPhone: riderPhone ?? this.riderPhone,
    );
  }
}

class TrackingNotifier extends StateNotifier<TrackingState> {
  final SocketService _socket;
  final String orderId;

  TrackingNotifier(this._socket, this.orderId)
      : super(TrackingState(
          orderId: orderId,
          status: 'Out for Delivery',
          etaMinutes: 8,
          riderLocation: const LatLng(17.4474, 78.3762),
          riderName: 'Ramesh Kumar (KPHB Express Rider)',
          riderPhone: '+91 98765 43210',
        )) {
    _initSocket();
  }

  void _initSocket() {
    _socket.joinOrderRoom(orderId);

    _socket.riderLocationStream.listen((data) {
      if (data['orderId'] == orderId || data['orderId'] == null) {
        final lat = (data['lat'] as num?)?.toDouble() ?? state.riderLocation.latitude;
        final lng = (data['lng'] as num?)?.toDouble() ?? state.riderLocation.longitude;
        final eta = (data['etaMinutes'] as num?)?.toInt() ?? state.etaMinutes;

        state = state.copyWith(
          riderLocation: LatLng(lat, lng),
          etaMinutes: eta,
        );
      }
    });

    _socket.orderStatusStream.listen((data) {
      if (data['orderId'] == orderId || data['orderId'] == null) {
        final newStatus = data['status'] as String? ?? state.status;
        state = state.copyWith(status: newStatus);
      }
    });
  }
}

final trackingProvider = StateNotifierProvider.family<TrackingNotifier, TrackingState, String>((ref, orderId) {
  return TrackingNotifier(getIt<SocketService>(), orderId);
});
