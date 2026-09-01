import 'dart:async';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:freshcart/core/config/app_config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  final Set<String> _joinedRooms = {};

  static String get socketUrl => AppConfig.socketUrl;

  final _orderStatusController = StreamController<Map<String, dynamic>>.broadcast();
  final _riderLocationController = StreamController<Map<String, dynamic>>.broadcast();
  final _supportMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get orderStatusStream => _orderStatusController.stream;
  Stream<Map<String, dynamic>> get riderLocationStream => _riderLocationController.stream;
  Stream<Map<String, dynamic>> get supportMessageStream => _supportMessageController.stream;

  /// Emits `true`/`false` as the socket connects / drops.
  Stream<bool> get connectionStream => _connectionController.stream;
  bool get isConnected => _socket?.connected ?? false;

  void initSocket() {
    if (_socket != null && _socket!.connected) return;

    try {
      _socket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(20)
            .setReconnectionDelay(1000)
            .setReconnectionDelayMax(8000)
            .build(),
      );

      _socket!.connect();

      _socket!.onConnect((_) {
        if (kDebugMode) print('⚡ Socket connected → $socketUrl');
        _connectionController.add(true);
        // Re-join every room after a reconnect.
        for (final r in _joinedRooms) {
          _socket!.emit('join_order_room', r);
        }
      });

      _socket!.onDisconnect((_) {
        if (kDebugMode) print('⚡ Socket disconnected');
        _connectionController.add(false);
      });
      _socket!.onReconnect((_) => _connectionController.add(true));
      _socket!.onConnectError((_) => _connectionController.add(false));

      _socket!.on('order_status_update', (d) {
        if (d is Map) _orderStatusController.add(Map<String, dynamic>.from(d));
      });
      _socket!.on('rider_location_update', (d) {
        if (d is Map) _riderLocationController.add(Map<String, dynamic>.from(d));
      });
      _socket!.on('support_message_received', (d) {
        if (d is Map) _supportMessageController.add(Map<String, dynamic>.from(d));
      });
    } catch (e) {
      if (kDebugMode) print('SocketService.initSocket exception: $e');
    }
  }

  void joinOrderRoom(String orderId) {
    if (orderId.isEmpty) return;
    initSocket();
    _joinedRooms.add(orderId);
    _socket?.emit('join_order_room', orderId);
  }

  void leaveOrderRoom(String orderId) {
    _joinedRooms.remove(orderId);
    _socket?.emit('leave_order_room', orderId);
  }

  void sendSupportMessage(Map<String, dynamic> data) {
    initSocket();
    _socket?.emit('support_message_send', data);
  }

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _joinedRooms.clear();
  }
}
