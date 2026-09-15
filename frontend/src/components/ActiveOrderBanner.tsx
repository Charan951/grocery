import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiUrl } from '../config/api';

const TERMINAL = ['delivered', 'cancelled', 'canceled', 'returned', 'refunded'];

interface ActiveOrder {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
}

/** A slim "your order is on the way" strip shown on Home while an order is live. */
export const ActiveOrderBanner: React.FC = () => {
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const lastScrollY = useRef(0);
  const navigate = useNavigate();
  const REVEAL_WIDTH = 56;

  // Auto-move the floating pill down when the bottom nav hides on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;

      if (scrollDiff > 8 && currentScrollY > 60) {
        setIsNavHidden(true);
      } else if (scrollDiff < -8 || currentScrollY <= 20) {
        setIsNavHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const raw = localStorage.getItem('customer_user');
    const phone = raw ? (JSON.parse(raw)?.phone as string | undefined) : undefined;
    if (!phone) return;
    const clean = phone.replace(/\D/g, '').slice(-10);

    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/orders/customer/${clean}`));
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

  if (!order || order.orderId === dismissedId) return null;
  const displayStatus = String(order.status || '').toLowerCase() === 'in transit' ? 'In Progress' : order.status;
  const title = order.status === 'Out For Delivery' ? 'Your order is on the way' : `Order ${displayStatus}`;
  const subtitle = order.estimatedDelivery ? `Arriving in ${order.estimatedDelivery} · tap to track` : 'Tap to track';

  // Bottom offset matches FloatingCartBar: 70px above bottom nav when visible, 16px when nav hidden
  const targetY = isNavHidden ? 54 : 0;

  return (
    <>
      {/* Tablet / desktop — inline strip in normal document flow */}
      <Link
        to={`/track/${encodeURIComponent(order.orderId)}`}
        className="hidden sm:flex items-center justify-between gap-3 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 hover:bg-emerald-100 transition-colors"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-gray-900">{title}</span>
          <span className="block truncate text-xs font-semibold text-gray-600">{subtitle}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[#2E7D32]" />
      </Link>

      {/* Mobile — floating pill anchored above the bottom nav. Swipe left reveals
          the X; only tapping the X dismisses it — releasing the drag elsewhere
          just snaps it back open or closed. */}
      <AnimatePresence>
        <motion.div
          key={order.orderId}
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: targetY, opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="fixed bottom-[70px] left-1/2 -translate-x-1/2 z-[999] w-[calc(100vw-32px)] max-w-[380px] sm:hidden"
        >
          <div className="relative">
            {/* Dismiss button, revealed as the pill slides left */}
            <button
              type="button"
              aria-label="Dismiss"
              tabIndex={revealed ? 0 : -1}
              onClick={() => setDismissedId(order.orderId)}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white"
              style={{ pointerEvents: revealed ? 'auto' : 'none' }}
            >
              <X size={16} />
            </button>

            <motion.div
              role="button"
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
              dragElastic={{ left: 0.15, right: 0.15 }}
              dragMomentum={false}
              animate={{ x: revealed ? -REVEAL_WIDTH : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              onDragEnd={(_, info) => {
                setRevealed(info.offset.x < -REVEAL_WIDTH / 2);
              }}
              onClick={() => {
                if (revealed) {
                  setRevealed(false);
                } else {
                  navigate(`/track/${encodeURIComponent(order.orderId)}`);
                }
              }}
              className="relative z-10 flex items-center gap-2.5 rounded-full bg-[#2E7D32] text-white shadow-xl pl-4 pr-3 py-2.5 border border-white/20 cursor-pointer touch-pan-y"
            >
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[12.5px] font-extrabold truncate">{title}</span>
                <span className="block truncate text-[10px] font-semibold text-white/80">{subtitle}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-white/80" />
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default ActiveOrderBanner;
