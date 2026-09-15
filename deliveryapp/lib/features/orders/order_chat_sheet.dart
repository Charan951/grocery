import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:freshcart_delivery/core/providers.dart';
import 'package:freshcart_delivery/core/theme.dart';

/// Chat between this delivery partner and the customer for one order —
/// persisted via GET/POST /delivery/orders/:id/chat, pushed live over the
/// same order-room socket event the customer apps use.
Future<void> showOrderChatSheet(
  BuildContext context, {
  required WidgetRef ref,
  required String orderId,
  required String customerName,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _OrderChatSheet(ref: ref, orderId: orderId, customerName: customerName),
  );
}

class _ChatMessage {
  final String from;
  final String text;
  final DateTime at;
  _ChatMessage({required this.from, required this.text, required this.at});
  factory _ChatMessage.fromJson(Map<String, dynamic> j) => _ChatMessage(
        from: (j['from'] as String?) ?? 'customer',
        text: (j['text'] as String?) ?? '',
        at: DateTime.tryParse(j['at']?.toString() ?? '') ?? DateTime.now(),
      );
}

class _OrderChatSheet extends StatefulWidget {
  final WidgetRef ref;
  final String orderId;
  final String customerName;
  const _OrderChatSheet({required this.ref, required this.orderId, required this.customerName});

  @override
  State<_OrderChatSheet> createState() => _OrderChatSheetState();
}

class _OrderChatSheetState extends State<_OrderChatSheet> {
  final _messages = <_ChatMessage>[];
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  StreamSubscription? _sub;
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    widget.ref.read(socketProvider).joinOrderRoom(widget.orderId);
    _load();
    _sub = widget.ref.read(socketProvider).orderChat.listen((p) {
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
      final list = await widget.ref.read(apiProvider).orderChat(widget.orderId);
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
      final msg = await widget.ref.read(apiProvider).sendOrderChat(widget.orderId, text);
      if (mounted) {
        setState(() => _messages.add(_ChatMessage.fromJson(msg)));
        _scrollToEnd();
      }
    } catch (_) {
      // best-effort — the socket push (if it landed) still arrives
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    widget.ref.read(socketProvider).leaveOrderRoom(widget.orderId);
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: FractionallySizedBox(
        heightFactor: 0.75,
        child: Container(
          decoration: const BoxDecoration(
            color: kSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
                decoration: const BoxDecoration(
                  color: kGreen,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.chat_bubble_rounded, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        widget.customerName.isEmpty ? 'Customer' : widget.customerName,
                        style: GoogleFonts.rubik(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
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
                    ? const Center(child: CircularProgressIndicator(color: kGreen))
                    : _messages.isEmpty
                        ? Center(
                            child: Text(
                              'Say hello to the customer — e.g. gate code or landmark.',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.nunitoSans(fontSize: 12, color: kTextMuted),
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(12),
                            itemCount: _messages.length,
                            itemBuilder: (context, i) {
                              final m = _messages[i];
                              final mine = m.from == 'partner';
                              return Align(
                                alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                  decoration: BoxDecoration(
                                    color: mine ? kGreen : kPaper,
                                    borderRadius: BorderRadius.circular(14),
                                    border: mine ? null : Border.all(color: kLedgerLine),
                                  ),
                                  child: Text(
                                    m.text,
                                    style: GoogleFonts.nunitoSans(
                                      fontSize: 13,
                                      color: mine ? Colors.white : kText,
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
                            fillColor: kPaper,
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
                          decoration: const BoxDecoration(color: kGreen, shape: BoxShape.circle),
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
