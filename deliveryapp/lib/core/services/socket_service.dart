import 'dart:async';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:freshcart_delivery/core/config/app_config.dart';

/// Listens on the partner's personal room (server joins it from the JWT).
class SocketService {
  io.Socket? _socket;

  final _offer = StreamController<Map<String, dynamic>>.broadcast();
  final _revoked = StreamController<Map<String, dynamic>>.broadcast();
  final _confirmed = StreamController<Map<String, dynamic>>.broadcast();
  final _cancelled = StreamController<Map<String, dynamic>>.broadcast();
  final _connection = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get offers => _offer.stream;
  Stream<Map<String, dynamic>> get revoked => _revoked.stream;
  Stream<Map<String, dynamic>> get confirmed => _confirmed.stream;
  Stream<Map<String, dynamic>> get cancelled => _cancelled.stream;
  Stream<bool> get connection => _connection.stream;
  bool get isConnected => _socket?.connected ?? false;

  void connect(String token) {
    if (_socket != null && _socket!.connected) return;
    _socket?.dispose();
    _socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(20)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(8000)
          .setAuth({'token': token})
          .build(),
    );
    final s = _socket!;
    s.connect();
    s.onConnect((_) {
      if (kDebugMode) print('⚡ partner socket connected');
      _connection.add(true);
    });
    s.onDisconnect((_) => _connection.add(false));
    s.onConnectError((_) => _connection.add(false));
    s.on('delivery_offer', (d) => d is Map ? _offer.add(Map<String, dynamic>.from(d)) : null);
    s.on('delivery_offer_revoked', (d) => d is Map ? _revoked.add(Map<String, dynamic>.from(d)) : null);
    s.on('assignment_confirmed', (d) => d is Map ? _confirmed.add(Map<String, dynamic>.from(d)) : null);
    s.on('order_cancelled', (d) => d is Map ? _cancelled.add(Map<String, dynamic>.from(d)) : null);
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
