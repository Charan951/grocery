import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode;
import 'package:socket_io_client/socket_io_client.dart' as io;

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;

  static String get socketUrl {
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:5000';
    }
    return 'http://localhost:5000';
  }

  final StreamController<Map<String, dynamic>> _orderStatusController = StreamController.broadcast();
  final StreamController<Map<String, dynamic>> _riderLocationController = StreamController.broadcast();
  final StreamController<Map<String, dynamic>> _supportMessageController = StreamController.broadcast();

  Stream<Map<String, dynamic>> get orderStatusStream => _orderStatusController.stream;
  Stream<Map<String, dynamic>> get riderLocationStream => _riderLocationController.stream;
  Stream<Map<String, dynamic>> get supportMessageStream => _supportMessageController.stream;

  bool get isConnected => _socket?.connected ?? false;

  void initSocket() {
    if (_socket != null && _socket!.connected) return;

    try {
      _socket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .setReconnectionAttempts(5)
            .build(),
      );

      _socket!.connect();

      _socket!.onConnect((_) {
        if (kDebugMode) print('⚡ Socket.io connected successfully to $socketUrl');
      });

      _socket!.onDisconnect((_) {
        if (kDebugMode) print('⚡ Socket.io disconnected');
      });

      _socket!.on('order_status_update', (data) {
        if (data is Map) {
          _orderStatusController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on('rider_location_update', (data) {
        if (data is Map) {
          _riderLocationController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket!.on('support_message_received', (data) {
        if (data is Map) {
          _supportMessageController.add(Map<String, dynamic>.from(data));
        }
      });
    } catch (e) {
      if (kDebugMode) print('SocketService.initSocket exception: $e');
    }
  }

  void joinOrderRoom(String orderId) {
    initSocket();
    _socket?.emit('join_order_room', orderId);
    if (kDebugMode) print('⚡ Joined Socket order room: $orderId');
  }

  void sendSupportMessage(Map<String, dynamic> data) {
    initSocket();
    _socket?.emit('support_message_send', data);
  }

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }
}
