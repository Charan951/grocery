import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Send, X, MessageCircle } from 'lucide-react';
import { apiUrl } from '../config/api';

interface ChatMessage {
  from: 'customer' | 'partner';
  text: string;
  at: string;
}

interface OrderChatProps {
  orderId: string;
  socket: Socket | null;
  customerPhone: string;
  partnerName: string;
  onClose: () => void;
}

/**
 * Chat drawer between the customer and their assigned delivery partner for
 * this order. Backed by POST/GET /orders/:id/chat (persistence) and the
 * `order_chat_message` socket event on the order room (live push) — the
 * same room both sides already join for status/location updates.
 */
export const OrderChat: React.FC<OrderChatProps> = ({
  orderId,
  socket,
  customerPhone,
  partnerName,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}/chat`), {
          headers: { Authorization: `Bearer ${localStorage.getItem('customer_token') || ''}` },
        });
        const data = await res.json();
        if (!cancelled && data.success) setMessages(data.messages || []);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (p: any) => {
      if (String(p?.orderId) !== String(orderId) || !p?.message) return;
      setMessages((cur) => [...cur, p.message]);
    };
    socket.on('order_chat_message', handler);
    return () => {
      socket.off('order_chat_message', handler);
    };
  }, [socket, orderId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loaded]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}/chat`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: trimmed, phone: customerPhone }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((cur) => [...cur, data.message]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[70vh] sm:h-[560px] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-emerald-700 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle size={18} />
            <div className="truncate">
              <div className="text-sm font-extrabold truncate">{partnerName || 'Delivery Partner'}</div>
              <div className="text-[10px] font-medium text-emerald-100">Chat about this order</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-gray-50">
          {!loaded ? (
            <div className="text-xs text-gray-400 text-center mt-6">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-gray-400 text-center mt-6">
              Say hello to your delivery partner — e.g. gate code, landmark, or a special request.
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs font-medium leading-relaxed ${
                  m.from === 'customer'
                    ? 'self-end bg-emerald-600 text-white rounded-br-md'
                    : 'self-start bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}
              >
                {m.text}
                <div
                  className={`text-[9px] mt-1 font-semibold ${
                    m.from === 'customer' ? 'text-emerald-100' : 'text-gray-400'
                  }`}
                >
                  {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="Type a message…"
            maxLength={1000}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-600"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-emerald-700 transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderChat;
