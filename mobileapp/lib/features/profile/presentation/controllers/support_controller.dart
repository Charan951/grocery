import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/socket_service.dart';

class SupportMessage {
  final String id;
  final String text;
  final bool isUser;
  final DateTime time;

  SupportMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.time,
  });
}

class SupportNotifier extends StateNotifier<List<SupportMessage>> {
  final SocketService _socket;

  SupportNotifier(this._socket)
      : super([
          SupportMessage(
            id: 'msg_1',
            text: 'Hello! Welcome to FreshCart Live Support. How can we help your 10-minute order today?',
            isUser: false,
            time: DateTime.now().subtract(const Duration(minutes: 5)),
          )
        ]) {
    _listenSocket();
  }

  void _listenSocket() {
    _socket.initSocket();
    _socket.supportMessageStream.listen((data) {
      if (data['text'] != null && (data['isUser'] == false || data['sender'] == 'Agent')) {
        final newMsg = SupportMessage(
          id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
          text: data['text'] as String,
          isUser: false,
          time: DateTime.now(),
        );
        state = [...state, newMsg];
      }
    });
  }

  void sendMessage(String text) {
    if (text.trim().isEmpty) return;

    final userMsg = SupportMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      text: text.trim(),
      isUser: true,
      time: DateTime.now(),
    );

    state = [...state, userMsg];

    _socket.sendSupportMessage({
      'text': text.trim(),
      'sender': 'Customer',
      'timestamp': DateTime.now().toIso8601String(),
    });

    // Auto-reply mock if offline
    if (!_socket.isConnected) {
      Future.delayed(const Duration(seconds: 1), () {
        final autoReply = SupportMessage(
          id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
          text: 'Thank you for reaching out! Our live agent is reviewing your message.',
          isUser: false,
          time: DateTime.now(),
        );
        state = [...state, autoReply];
      });
    }
  }
}

final supportProvider = StateNotifierProvider<SupportNotifier, List<SupportMessage>>((ref) {
  return SupportNotifier(getIt<SocketService>());
});
