import React, { useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { X, CheckCheck, PackageCheck, Truck, Home as HomeIcon, FileText, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrderPlacedState {
  orderId: string;
  totalAmount: number;
  addressText?: string;
  itemCount?: number;
}

/** Same stable per-customer order number ("#1" = the customer's very first
 * order) shown on the Your Orders list, read from the cache CheckoutModal
 * just wrote to (newest-first) — falls back to the raw order id if the
 * cache lookup fails for any reason. */
function friendlyOrderNumber(orderId: string): string {
  try {
    const phone = JSON.parse(localStorage.getItem('customer_user') || '{}')?.phone || '';
    const key = phone ? `customer_orders_${String(phone).replace(/\D/g, '')}` : '';
    const cached = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
    if (Array.isArray(cached) && cached.length > 0) {
      const total = cached.length;
      const idx = cached.findIndex((o: any) => (o.orderId || o.id) === orderId);
      if (idx !== -1) return `${total - idx}`;
    }
  } catch {
    /* fall through */
  }
  return orderId;
}

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: CheckCheck },
  { key: 'processing', label: 'Processing', icon: PackageCheck },
  { key: 'out', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: HomeIcon },
];

/** Full-page "order placed" confirmation. Deliberately plain block layout
 * (percentage width + margin auto, no nested flex-stretch containers) —
 * simpler to reason about and immune to any flexbox cross-axis surprises. */
const OrderPlaced: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as OrderPlacedState | null;

  useEffect(() => {
    if (!state?.orderId) return;
    confetti({ particleCount: 160, spread: 75, origin: { y: 0.35 } });
  }, [state?.orderId]);

  // Direct hit / refresh with no order context — nothing to confirm.
  if (!state?.orderId) return <Navigate to="/" replace />;

  const placedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const placedTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#fff' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '20px 24px 32px', boxSizing: 'border-box' }}>
        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/')}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Illustration */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 24px' }}>
          <div
            style={{
              position: 'relative', width: 144, height: 144,
              borderRadius: '9999px', background: '#ECFDF5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div className="bg-[#00A86B] shadow-lg shadow-emerald-200" style={{ width: 80, height: 80, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCheck size={40} color="#fff" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display" style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
          Order Placed!
        </h1>
        <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 500, color: '#6B7280', marginTop: 8, lineHeight: 1.6 }}>
          Thank you for shopping with us. Your order has been placed successfully.
        </p>

        {/* Order number card */}
        <div style={{
          marginTop: 24, background: 'rgba(236,253,245,0.7)', border: '1px solid #D1FAE5',
          borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            width: 40, height: 40, borderRadius: '9999px', background: '#D1FAE5', color: '#00A86B',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(4,120,87,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Order Number
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginTop: 2 }}>Order #{friendlyOrderNumber(state.orderId)}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', marginTop: 2 }}>{placedDate}, {placedTime}</div>
          </div>
        </div>

        {/* Step tracker */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 28 }}>
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const active = idx === 0;
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 72 }}>
                <span style={{
                  width: 44, height: 44, borderRadius: '9999px',
                  background: active ? '#00A86B' : '#F3F4F6',
                  color: active ? '#fff' : '#9CA3AF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, textAlign: 'center', marginTop: 6, lineHeight: 1.3,
                  color: active ? '#111827' : '#9CA3AF',
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => navigate('/account/orders')}
            className="bg-[#00A86B] hover:bg-[#00915c] shadow-md active:scale-[0.99]"
            style={{
              width: '100%', color: '#fff', fontWeight: 800, fontSize: 14, padding: '14px 0',
              borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: 'none', cursor: 'pointer', transition: 'transform 0.15s',
            }}
          >
            <FileText size={16} />
            <span>Go to Orders</span>
          </button>
          <button
            onClick={() => navigate(`/track/${encodeURIComponent(state.orderId)}`)}
            className="text-[#00A86B] hover:bg-emerald-50 active:scale-[0.99]"
            style={{
              width: '100%', fontWeight: 800, fontSize: 14, padding: '13px 0',
              borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: '2px solid #00A86B', background: 'transparent', cursor: 'pointer', transition: 'transform 0.15s',
            }}
          >
            <Truck size={16} />
            <span>Track Your Order</span>
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#9CA3AF', marginTop: 8 }}>
            We'll keep you updated with notifications.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Heart size={12} className="text-rose-400 fill-rose-400" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>Happy Shopping!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPlaced;
