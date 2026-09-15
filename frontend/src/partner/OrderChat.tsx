import React, { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Send, X, MessageCircle } from 'lucide-react';
import { SOCKET_URL } from '../config/api';
import { partnerApi } from './partnerApi';

interface ChatMessage {
  from: 'customer' | 'partner';
  text: string;
  at: string;
}

interface PartnerOrderChatProps {
  orderId: string;
  customerName?: string;
  onClose: () => void;
}

/**
 * Delivery-partner side of the same order chat thread the customer's
 * TrackOrder page uses (see components/OrderChat.tsx) — backed by
 * GET/POST /api/delivery/orders/:id/chat (partner-authed) and the
 * `order_chat_message` socket event on the order room. Bubble alignment is
 * flipped from the customer's view: the partner's own messages sit on the
 * right here.
 */
export const OrderChat: React.FC<PartnerOrderChatProps> = ({ orderId, customerName, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await partnerApi.getChat(orderId);
        if (!cancelled) setMessages(data.messages || []);
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'] });
    socket.emit('join_order_room', orderId);
    socket.on('order_chat_message', (p: any) => {
      if (String(p?.orderId) !== String(orderId) || !p?.message) return;
      setMessages((cur) => [...cur, p.message]);
    });
    return () => {
      socket.emit('leave_order_room', orderId);
      socket.removeAllListeners();
      socket.close();
    };
  }, [orderId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loaded]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      const data = await partnerApi.sendChat(orderId, trimmed);
      if (data.message) setMessages((cur) => [...cur, data.message]);
    } catch {
      /* leave input cleared; partner can retry */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm bg-admin-surface rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[70vh] sm:h-[560px] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-admin-ledger-line bg-admin-green text-white">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle size={18} />
            <div className="truncate">
              <div className="text-sm font-extrabold truncate">{customerName || 'Customer'}</div>
              <div className="text-[10px] font-medium text-white/80">Chat about this order</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-admin-paper">
          {!loaded ? (
            <div className="text-xs text-admin-text-faint text-center mt-6">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-admin-text-faint text-center mt-6">
              Say hello to the customer — e.g. gate code, landmark, or an ETA update.
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs font-medium leading-relaxed ${
                  m.from === 'partner'
                    ? 'self-end bg-admin-green text-white rounded-br-md'
                    : 'self-start bg-admin-surface border border-admin-ledger-line text-admin-text rounded-bl-md'
                }`}
              >
                {m.text}
                <div
                  className={`text-[9px] mt-1 font-semibold ${
                    m.from === 'partner' ? 'text-white/80' : 'text-admin-text-faint'
                  }`}
                >
                  {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-admin-ledger-line bg-admin-surface">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="Type a message…"
            maxLength={1000}
            className="flex-1 rounded-full border border-admin-ledger-line px-4 py-2.5 text-xs focus:outline-none focus:border-admin-green bg-admin-paper text-admin-text"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-admin-green text-white flex items-center justify-center disabled:opacity-40 hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderChat;
