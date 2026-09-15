import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freshcart/core/constants/app_colors.dart';
import 'package:freshcart/core/di/injection.dart';
import 'package:freshcart/core/services/socket_service.dart';
import 'package:freshcart/features/home/presentation/controllers/catalog_providers.dart' show apiServiceProvider;

/// Chat between the customer and their assigned delivery partner for one
/// order — persisted via GET/POST /orders/:id/chat, pushed live over the
/// same order-room socket the tracking screen already joins.
Future<void> showOrderChatSheet(
  BuildContext context, {
  required String orderId,
  required String partnerName,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _OrderChatSheet(orderId: orderId, partnerName: partnerName),
  );
}

class _ChatMessage {
  final String from;
  final String text;
  final DateTime at;
  _ChatMessage({required this.from, required this.text, required this.at});
  factory _ChatMessage.fromJson(Map<String, dynamic> j) => _ChatMessage(
        from: (j['from'] as String?) ?? 'partner',
        text: (j['text'] as String?) ?? '',
        at: DateTime.tryParse(j['at']?.toString() ?? '') ?? DateTime.now(),
      );
}

class _OrderChatSheet extends ConsumerStatefulWidget {
  final String orderId;
  final String partnerName;
  const _OrderChatSheet({required this.orderId, required this.partnerName});

  @override
  ConsumerState<_OrderChatSheet> createState() => _OrderChatSheetState();
}

class _OrderChatSheetState extends ConsumerState<_OrderChatSheet> {
  final _messages = <_ChatMessage>[];
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  StreamSubscription? _sub;
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = getIt<SocketService>().orderChatStream.listen((p) {
      if (p['orderId'] != widget.orderId) return;
      final m = p['message'];
      if (m is Map) {
        setState(() => _messages.add(_ChatMessage.fromJson(Map<String, dynamic>.from(m))));
        _scrollToEnd();
      }
    });
  }

  Future<void> _load() async {
    try {
      final list = await ref.read(apiServiceProvider).fetchOrderChat(widget.orderId);
      if (mounted) {
        setState(() {
          _messages.addAll(list.map(_ChatMessage.fromJson));
          _loading = false;
        });
        _scrollToEnd();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    try {
      final msg = await ref.read(apiServiceProvider).sendOrderChat(widget.orderId, text);
      if (mounted) {
        setState(() => _messages.add(_ChatMessage.fromJson(msg)));
        _scrollToEnd();
      }
    } catch (_) {
      // best-effort — the socket push (if the send actually landed) still arrives
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: FractionallySizedBox(
        heightFactor: 0.75,
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.chat_bubble_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.partnerName,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _messages.isEmpty
                        ? Center(
                            child: Text(
                              'Say hello to your delivery partner.',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.textSecondaryDark : const Color(0xFF9CA3AF),
                              ),
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(12),
                            itemCount: _messages.length,
                            itemBuilder: (context, i) {
                              final m = _messages[i];
                              final mine = m.from == 'customer';
                              return Align(
                                alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                  decoration: BoxDecoration(
                                    color: mine
                                        ? AppColors.primary
                                        : (isDark ? const Color(0xFF2A2A2C) : const Color(0xFFF3F4F6)),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Text(
                                    m.text,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: mine
                                          ? Colors.white
                                          : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimary),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          maxLength: 1000,
                          decoration: InputDecoration(
                            hintText: 'Type a message…',
                            counterText: '',
                            filled: true,
                            fillColor: isDark ? const Color(0xFF2A2A2C) : const Color(0xFFF3F4F6),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: _send,
                        child: Container(
                          padding: const EdgeInsets.all(11),
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                          child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
