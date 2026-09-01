import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, ChevronRight } from 'lucide-react';

const TERMINAL = ['delivered', 'cancelled', 'canceled', 'returned', 'refunded'];

interface ActiveOrder {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
}

/** A slim "your order is on the way" strip shown on Home while an order is live. */
export const ActiveOrderBanner: React.FC = () => {
  const [order, setOrder] = useState<ActiveOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    const raw = localStorage.getItem('customer_user');
    const phone = raw ? (JSON.parse(raw)?.phone as string | undefined) : undefined;
    if (!phone) return;
    const clean = phone.replace(/\D/g, '').slice(-10);

    const load = async () => {
      try {
        const res = await fetch(`/api/orders/customer/${clean}`);
        const data = await res.json();
        if (cancelled || !data?.success || !Array.isArray(data.orders)) return;
        const live = data.orders.find(
          (o: any) => !TERMINAL.includes(String(o.status || '').toLowerCase()),
        );
        setOrder(live ? { orderId: (live.orderId || live.id), status: live.status, estimatedDelivery: live.estimatedDelivery } : null);
      } catch {
        /* silent — banner just doesn't show */
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!order) return null;

  return (
    <Link
      to={`/track/${encodeURIComponent(order.orderId)}`}
      className="flex items-center gap-3 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 hover:bg-emerald-100 transition-colors"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2E7D32] text-white">
        <Bike size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-gray-900">
          {order.status === 'Out For Delivery' ? 'Your order is on the way' : `Order ${order.status}`}
        </span>
        <span className="block truncate text-xs font-semibold text-gray-600">
          #{order.orderId}
          {order.estimatedDelivery ? ` · arriving in ${order.estimatedDelivery}` : ''} · tap to track
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-[#2E7D32]" />
    </Link>
  );
};

export default ActiveOrderBanner;
