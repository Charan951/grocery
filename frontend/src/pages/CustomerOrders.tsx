import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/SEO';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS } from '../context/CMSContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import { downloadInvoice } from '../utils/invoice';
import { apiUrl } from '../config/api';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  MapPin, 
  RotateCcw, 
  Download, 
  Zap,
  ShoppingBag,
  MessageSquare,
  Copy,
  Check,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  CreditCard,
  Navigation
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  weightSpec: string;
  price: number;
  mrp: number;
  qty: number;
  image: string;
}

interface TimelineEntry {
  status?: string;
  note?: string;
  at?: string;
}

interface MockOrder {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  status: string; // raw backend status (Pending / Packed / Out For Delivery / …)
  estimatedDelivery?: string;
  orderPlacedAt: string;
  orderArrivedAt?: string;
  items: OrderItem[];
  itemTotal: number;
  itemTotalMrp: number;
  deliveryFee: number;
  handlingFee: number;
  totalAmount: number;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus?: string;
  orderId?: string;
  trackingTimeline?: TimelineEntry[];
  createdAt?: string;
}

/** Collapse the backend's 11-value status enum onto the 3 UI buckets. */
type StatusBucket = 'In Progress' | 'Delivered' | 'Cancelled';
const bucketOf = (raw?: string): StatusBucket => {
  const s = (raw || '').toLowerCase();
  if (s === 'delivered') return 'Delivered';
  if (['cancelled', 'canceled', 'returned', 'refunded'].includes(s)) return 'Cancelled';
  return 'In Progress';
};

/** Statuses at which a customer may still cancel (before the order leaves the store). */
const CANCELLABLE_STATUSES = ['pending', 'in progress', 'in transit', 'accepted', 'packed', 'ready'];
const canCancelOrder = (raw?: string) => CANCELLABLE_STATUSES.includes((raw || '').toLowerCase());

const normalizeStatus = (raw?: string): string => {
  const s = (raw || '').trim();
  if (s.toLowerCase() === 'in transit') return 'In Progress';
  return s || 'In Progress';
};

const getStepIndex = (status?: string): number => {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return 3;
  if (s === 'in progress' || s === 'in transit' || s === 'out for delivery' || s === 'assigned' || s === 'arrived') return 2;
  if (s === 'packed' || s === 'ready' || s === 'arrived at store' || s === 'processing') return 1;
  return 0; // Placed / Pending / Accepted
};


export const CustomerOrders: React.FC = () => {
  const customerUser = (() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  })();
  const userPhoneKey = customerUser?.phone ? customerUser.phone.replace(/\D/g, '') : 'default';

  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Delivered' | 'Cancelled'>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  const [orders, setOrders] = useState<MockOrder[]>(() => {
    const cached = localStorage.getItem(`customer_orders_${userPhoneKey}`);
    if (cached) return JSON.parse(cached);
    return [];
  });
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [switchingPayment, setSwitchingPayment] = useState(false);
  const [switchPaymentError, setSwitchPaymentError] = useState<string | null>(null);
  // Only show the loading skeleton on a genuine first fetch (no cached
  // orders to render yet) — avoids a jarring "No orders found" flash
  // before the real orders arrive for a customer opening this on a new device.
  const [isLoadingOrders, setIsLoadingOrders] = useState(() => orders.length === 0);

  const { addToCart } = useCartWishlist();
  const { products } = useCMS();
  const navigate = useNavigate();
  const goBack = useSmartBack('/');

  // Lazy-load the Razorpay SDK — only "Switch to UPI / Card" needs it, and it
  // may not have been loaded yet if the customer didn't check out on this tab.
  React.useEffect(() => {
    if (!window.Razorpay && !document.getElementById('rzp-checkout-js')) {
      const script = document.createElement('script');
      script.id = 'rzp-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  React.useEffect(() => {
    if (customerUser?.phone) {
      const cleanPhone = customerUser.phone.replace(/\D/g, '').slice(-10);
      fetch(apiUrl(`/orders/customer/${cleanPhone}`))
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.orders && data.orders.length > 0) {
            const normalized = data.orders.map((o: any) => ({
              ...o,
              status: String(o.status || '').toLowerCase() === 'in transit' ? 'In Progress' : (o.status || 'Pending'),
            }));
            setOrders(normalized);
            localStorage.setItem(`customer_orders_${userPhoneKey}`, JSON.stringify(normalized));
          }
        })
        .catch(() => null)
        .finally(() => setIsLoadingOrders(false));
    } else {
      setIsLoadingOrders(false);
    }
  }, [userPhoneKey]);

  // Default the filter to whatever's most relevant once orders are known:
  // prefer "In Progress" (something to track), else "Delivered", else leave
  // "All". Only runs once so it never stomps a manual filter change.
  const defaultFilterSet = useRef(false);
  useEffect(() => {
    if (defaultFilterSet.current || orders.length === 0) return;
    defaultFilterSet.current = true;
    if (orders.some((o) => bucketOf(o.status) === 'In Progress')) setFilter('In Progress');
    else if (orders.some((o) => bucketOf(o.status) === 'Delivered')) setFilter('Delivered');
  }, [orders]);

  const filteredOrders = orders.filter(
    (o) => filter === 'All' || bucketOf(o.status) === filter
  );

  // Stable per-customer order numbers (#1 = this customer's very first
  // order), shown instead of the raw DB order id. Derived from the full
  // unfiltered order list, which the backend returns newest-first.
  const orderKey = (o: any): string => o.orderId || o.orderNumber || o.id || '';
  const orderNumberByKey = React.useMemo(() => {
    const total = orders.length;
    const map: Record<string, number> = {};
    orders.forEach((o, i) => {
      const key = orderKey(o);
      if (key) map[key] = total - i;
    });
    return map;
  }, [orders]);
  const orderLabel = (o: any): string => {
    const n = orderNumberByKey[orderKey(o)];
    return n != null ? `Order #${n}` : orderKey(o) || 'Order';
  };

  // Ticks every 30s so the ETA badge counts down live instead of freezing at
  // whatever the estimate was when the order was placed.
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const liveEtaMinutes = React.useMemo(() => {
    if (!selectedOrder || !selectedOrder.createdAt) return null;
    const placedAt = new Date(selectedOrder.createdAt).getTime();
    if (Number.isNaN(placedAt)) return null;
    const totalMinutes = parseInt(selectedOrder.estimatedDelivery || '10', 10) || 10;
    const elapsedMinutes = (Date.now() - placedAt) / 60000;
    return Math.max(0, Math.round(totalMinutes - elapsedMinutes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder, nowTick]);
  const liveEtaLabel = liveEtaMinutes == null
    ? null
    : liveEtaMinutes <= 0
    ? 'Any moment'
    : `${liveEtaMinutes} min${liveEtaMinutes === 1 ? '' : 's'}`;

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = (order: MockOrder) => {
    downloadInvoice({
      orderNumber: order.orderNumber,
      orderPlacedAt: order.orderPlacedAt,
      createdAt: order.createdAt,
      items: order.items.map((it: any) => ({
        name: it.name,
        weightSpec: it.weightSpec,
        price: Number(it.price || it.unitPrice || 0),
        mrp: Number(it.mrp || it.originalPrice || 0),
        qty: Number(it.qty || it.quantity || 1),
      })),
      itemTotal: Number(order.itemTotal || 0),
      itemTotalMrp: Number(order.itemTotalMrp || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      handlingFee: Number(order.handlingFee || 0),
      totalAmount: Number(order.totalAmount || 0),
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
    });
  };

  /** A still-unpaid COD order (not yet Delivered/Cancelled) can switch to a
   * prepaid method. Mirrors the same gating in the mobile app. */
  const canSwitchToPrepaid = (order: MockOrder) => {
    const isCod = /cod|cash/i.test(order.paymentMethod || '');
    const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
    return isCod && !isPaid && bucketOf(order.status) !== 'Delivered' && bucketOf(order.status) !== 'Cancelled';
  };

  /** Runs the same Razorpay create-order → checkout → verify flow as
   * CheckoutModal, but against an *existing* order — `paymentMethod` on the
   * verify call switches the order's stored payment method server-side, so
   * the admin console (which reads the same Order document) reflects it too. */
  const handleSwitchToPrepaid = async (order: MockOrder) => {
    if (switchingPayment) return;
    const id = order.orderId || order.orderNumber || order.id;
    setSwitchingPayment(true);
    setSwitchPaymentError(null);
    try {
      const co = await fetch(apiUrl('/payment/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: order.totalAmount, receipt: id }),
      }).then((r) => r.json());
      if (!co?.success) throw new Error(co?.message || 'Could not start the payment.');
      const { key, orderId: rzpOrderId, amount, currency, testMode } = co;

      const applyPaid = (order: MockOrder): MockOrder => ({
        ...order,
        paymentMethod: 'Razorpay UPI/Card',
        paymentStatus: 'Paid',
      });
      const onVerified = () => {
        setOrders((prev) => {
          const next = prev.map((o) => (o.id === order.id ? applyPaid(o) : o));
          localStorage.setItem(`customer_orders_${userPhoneKey}`, JSON.stringify(next));
          return next;
        });
        setSelectedOrder((prev) => (prev && prev.id === order.id ? applyPaid(prev) : prev));
        setSwitchingPayment(false);
      };

      // Local-dev path: backend in test mode with no usable key — skip the sheet.
      if (testMode && !key) {
        await fetch(apiUrl('/payment/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: 'simulated',
            orderId: id,
            paymentMethod: 'Razorpay UPI/Card',
          }),
        });
        onVerified();
        return;
      }

      let waited = 0;
      while (!window.Razorpay && waited < 5000) {
        await new Promise((res) => setTimeout(res, 150));
        waited += 150;
      }
      if (!window.Razorpay) throw new Error('Payment could not load. Check your connection and retry.');

      const rzp = new window.Razorpay({
        key,
        order_id: rzpOrderId,
        amount,
        currency: currency || 'INR',
        name: 'FreshCart',
        description: `Order ${id}`,
        image: '/logo.png',
        prefill: {
          name: customerUser?.name || '',
          contact: userPhoneKey,
          email: customerUser?.email || '',
        },
        theme: { color: '#2E7D32' },
        handler: async (resp: any) => {
          try {
            const v = await fetch(apiUrl('/payment/verify'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                orderId: id,
                paymentMethod: 'Razorpay UPI/Card',
              }),
            }).then((r) => r.json());
            if (!v?.verified) throw new Error('Could not verify your payment.');
            onVerified();
          } catch (e: any) {
            setSwitchingPayment(false);
            setSwitchPaymentError(e?.message || 'Could not verify your payment.');
          }
        },
        modal: { ondismiss: () => setSwitchingPayment(false) },
      });
      rzp.open();
    } catch (e: any) {
      setSwitchingPayment(false);
      setSwitchPaymentError(e?.message || 'Could not start the payment. Please try again.');
    }
  };

  const handleCancelOrder = async (order: MockOrder) => {
    const id = (order as any).orderId || order.orderNumber || order.id;
    if (!id || cancelling) return;
    if (!window.confirm(
      'Cancel this order? If you paid online, the amount is refunded to your FreshCart wallet.'
    )) return;
    setCancelling(true);
    try {
      const phone = customerUser?.phone ? customerUser.phone.replace(/\D/g, '').slice(-10) : '';
      const res = await fetch(apiUrl(`/orders/${encodeURIComponent(id)}/cancel`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, reason: 'Cancelled by customer' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        alert(data?.message || 'Could not cancel this order.');
        return;
      }
      const patch = (o: MockOrder) =>
        ((o as any).orderId || o.orderNumber || o.id) === id
          ? { ...o, status: 'Cancelled', paymentStatus: data.refunded ? 'Refunded' : (o as any).paymentStatus }
          : o;
      const updated = orders.map(patch);
      setOrders(updated);
      localStorage.setItem(`customer_orders_${userPhoneKey}`, JSON.stringify(updated));
      setSelectedOrder({ ...order, status: 'Cancelled' });
      alert(data.refunded
        ? 'Order cancelled — refund added to your FreshCart wallet.'
        : 'Order cancelled.');
    } catch {
      alert('Could not cancel this order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = (order: MockOrder) => {
    order.items.forEach((item) => {
      const existingProduct = products.find((p) => p.id === item.id);
      if (existingProduct) {
        addToCart(existingProduct, item.qty);
      } else {
        addToCart(
          {
            id: item.id,
            name: item.name,
            price: item.price,
            mrp: item.mrp || item.price + 20,
            netQuantity: item.weightSpec || '1 pack',
            category: 'Grocery',
            categoryId: 'c1',
            subCategory: 'General',
            brand: 'FreshCart',
            stock: 50,
            rating: 4.8,
            reviewsCount: 12,
            description: item.name,
            imageUrl: item.image,
          },
          item.qty
        );
      }
    });
    alert('All items added back to your cart!');
  };

  // IF AN ORDER IS SELECTED: RENDER EXACT ORDER DETAILS PAGE MATCHING MOBILE APP DESIGN
  if (selectedOrder) {
    const orderStatusNormalized = normalizeStatus(selectedOrder.status);
    const bucket = bucketOf(orderStatusNormalized);
    const isActive = bucket === 'In Progress';
    const isDelivered = bucket === 'Delivered';
    const isCancelled = bucket === 'Cancelled';
    const isOutForDelivery = (selectedOrder.status || '').toLowerCase() === 'out for delivery';
    const stepIdx = getStepIndex(selectedOrder.status);
    const STEPS = ['Placed', 'Packed', 'In Progress', 'Delivered'];

    const calcItemTotal = selectedOrder.items.reduce(
      (sum: number, it: any) => sum + Number(it.price || it.unitPrice || 0) * Number(it.qty || it.quantity || 1),
      0
    );
    const calcItemMrpTotal = selectedOrder.items.reduce(
      (sum: number, it: any) =>
        sum + Number(it.mrp || it.originalPrice || Number(it.price || 0) + 20) * Number(it.qty || it.quantity || 1),
      0
    );
    const displayItemTotal = Number(selectedOrder.itemTotal || (selectedOrder as any).subTotal || calcItemTotal);
    const displayItemMrpTotal = Number(selectedOrder.itemTotalMrp || calcItemMrpTotal);
    const displayTotalAmount = Number(selectedOrder.totalAmount || (selectedOrder as any).totalPrice || displayItemTotal);
    const deliveryFee = Number(selectedOrder.deliveryFee || 0);
    const handlingFee = Number(selectedOrder.handlingFee || 0);
    const totalSavings = Math.max(0, displayItemMrpTotal - displayItemTotal) + (deliveryFee === 0 ? 30 : 0);

    const isPaid = (selectedOrder.paymentStatus || '').toLowerCase() === 'paid';
    const isCod = /cod|cash/i.test(selectedOrder.paymentMethod || '');
    const deliveryOtp = (selectedOrder as any).deliveryOtp || '';

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-screen bg-gray-50/70 text-gray-900 pb-28 font-sans"
      >
        <SEO
          title={`${orderLabel(selectedOrder)} | FreshCart`}
          description={`Order details for ${orderLabel(selectedOrder)}`}
        />

        {/* Top Sticky Header */}
        <header className="bg-white border-b border-gray-200 py-3.5 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black text-gray-900 font-display leading-tight">
                  {orderLabel(selectedOrder)}
                </h1>
                <button
                  type="button"
                  onClick={() => handleCopyOrderId(orderKey(selectedOrder))}
                  className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5"
                  title="Copy Order ID"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                {selectedOrder.items.length} {selectedOrder.items.length === 1 ? 'item' : 'items'} · Placed on {selectedOrder.orderPlacedAt || selectedOrder.date}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadInvoice(selectedOrder)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#8E24AA] font-extrabold text-xs px-3.5 py-1.5 rounded-full transition-colors cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>Invoice</span>
            </button>
            <button
              onClick={() => navigate('/help')}
              className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <MessageSquare size={13} className="text-rose-500" />
              <span>Get Help</span>
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-4 md:py-6 flex flex-col gap-4">
          {/* 1. HERO STATUS CARD */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
                  isCancelled
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : isDelivered
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isCancelled ? (
                  <CheckCircle2 size={13} className="text-rose-600" />
                ) : isDelivered ? (
                  <CheckCircle2 size={13} className="text-emerald-600" />
                ) : (
                  <Zap size={13} className="fill-emerald-600 text-emerald-600" />
                )}
                <span>
                  {isCancelled
                    ? 'CANCELLED'
                    : isDelivered
                    ? 'DELIVERED'
                    : isOutForDelivery
                    ? `ARRIVING IN ${(liveEtaLabel || selectedOrder.estimatedDelivery || '8 mins').toUpperCase()}`
                    : 'IN PROGRESS'}
                </span>
              </span>

              {isActive && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200/80">
                  <Clock size={12} className="text-emerald-700" />
                  <span>{liveEtaLabel || selectedOrder.estimatedDelivery || '10 mins'}</span>
                </div>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-gray-900 font-display">
              {isCancelled
                ? 'Order Cancelled'
                : isDelivered
                ? 'Delivered to your doorstep'
                : isOutForDelivery
                ? 'Delivery partner is on the way!'
                : 'Your order is in progress'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
              {isCancelled
                ? 'This order has been cancelled and refunded if prepaid.'
                : isDelivered
                ? 'Delivered with care from your local FreshCart dark store.'
                : 'Fresh grocery items handpicked and packed from FreshCart dark store.'}
            </p>

            {/* 4-Step Stepper */}
            {!isCancelled && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between relative">
                  {STEPS.map((step, idx) => {
                    const isDone = idx < stepIdx;
                    const isCurrent = idx === stepIdx;

                    return (
                      <div key={step} className="flex-1 flex flex-col items-center relative">
                        {/* Connecting bar */}
                        {idx > 0 && (
                          <div
                            className={`absolute top-2.5 right-1/2 w-full h-[2.5px] -z-0 ${
                              idx <= stepIdx ? 'bg-[#00A86B]' : 'bg-gray-200'
                            }`}
                          />
                        )}
                        {/* Circle node */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold relative z-10 transition-all ${
                            isDone
                              ? 'bg-[#00A86B] text-white'
                              : isCurrent
                              ? 'bg-[#00A86B] text-white ring-4 ring-emerald-100'
                              : 'bg-gray-100 border border-gray-300 text-gray-400'
                          }`}
                        >
                          {isDone ? <Check size={13} /> : isCurrent ? <div className="w-2 h-2 rounded-full bg-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                        </div>
                        <span
                          className={`text-[10px] sm:text-[11px] mt-1.5 text-center font-bold truncate max-w-[70px] ${
                            isCurrent
                              ? 'text-[#00A86B] font-black'
                              : isDone
                              ? 'text-gray-800'
                              : 'text-gray-400 font-medium'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Map Tracker Link */}
            {isActive && (
              <Link
                to={`/track/${encodeURIComponent(selectedOrder.orderNumber || selectedOrder.id)}`}
                className="mt-4 flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-emerald-50/70 hover:border-emerald-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#00A86B] text-white flex items-center justify-center shadow-2xs">
                    <Navigation size={13} className="fill-white" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-gray-900 group-hover:text-emerald-900">
                      Live tracking is active
                    </p>
                    <p className="text-[11px] text-gray-500">Tap to see rider on live map</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-emerald-600" />
              </Link>
            )}
          </div>

          {/* 2. DOORSTEP OTP CARD */}
          {deliveryOtp && isActive && (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00A86B]/20 text-[#00A86B] flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-[#00A86B]" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider uppercase text-emerald-900 block">
                    DOORSTEP CODE
                  </span>
                  <span className="text-xs text-gray-600 font-medium">
                    Share with delivery partner at door
                  </span>
                </div>
              </div>
              <div className="bg-white border border-emerald-300 rounded-xl px-3.5 py-1.5 shadow-2xs font-mono font-black text-lg text-[#00A86B] tracking-widest">
                {deliveryOtp.split('').join(' ')}
              </div>
            </div>
          )}

          {/* 3. ITEMS IN ORDER */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-extrabold text-gray-900 mb-3">
              Items in Order ({selectedOrder.items.length})
            </h3>
            <div className="flex flex-col divide-y divide-gray-100">
              {selectedOrder.items.map((item: any, idx: number) => {
                const nameVal = item.name || item.productName || item.title || 'Grocery Product';
                const weightVal = item.weightSpec || item.weight || item.selectedWeight || '1 unit';
                const qtyVal = Number(item.qty || item.quantity || item.units || 1);
                const priceVal = Number(item.price || item.unitPrice || item.productPrice || 0);
                const mrpVal = Number(item.mrp || item.originalPrice || (priceVal ? priceVal + 20 : 0));
                const imgVal = item.image || item.imageUrl || item.productImage || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop';
                const lineTotal = priceVal * qtyVal;
                const lineTotalMrp = mrpVal * qtyVal;

                return (
                  <div key={item.id || `ord_item_${idx}`} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 p-1 shrink-0 flex items-center justify-center">
                        <img
                          src={imgVal}
                          alt={nameVal}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop'; }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                          {nameVal}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {weightVal}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            × {qtyVal}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black text-gray-900 block font-display">
                        ₹{lineTotal}
                      </span>
                      {mrpVal > priceVal && (
                        <span className="text-[11px] text-gray-400 line-through font-medium block">
                          ₹{lineTotalMrp}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. BILL SUMMARY */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-gray-700" />
              <h3 className="text-sm font-extrabold text-gray-900 font-display">
                Bill Summary
              </h3>
            </div>

            <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-gray-600 font-medium">
                <span>Item Total</span>
                <div className="flex items-center gap-2">
                  {displayItemMrpTotal > displayItemTotal && (
                    <span className="line-through text-gray-400 text-xs">₹{displayItemMrpTotal}</span>
                  )}
                  <span className="font-bold text-gray-900">₹{displayItemTotal}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-gray-600 font-medium">
                <span>Delivery Fee</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-gray-400 text-xs">₹30</span>
                  <span className="font-extrabold text-[#00A86B]">FREE</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-gray-600 font-medium">
                <span>Handling Fee</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-gray-400 text-xs">₹10</span>
                  <span className="font-extrabold text-[#00A86B]">FREE</span>
                </div>
              </div>

              <div className="border-t border-gray-100 my-1" />

              <div className="flex items-center justify-between font-black text-sm sm:text-base text-gray-900">
                <span className="font-display">Total Bill</span>
                <span className="text-base font-black text-gray-900 font-display">₹{displayTotalAmount}</span>
              </div>

              {totalSavings > 0 && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">🎉</span>
                  <span className="text-xs font-bold text-[#00A86B]">
                    You saved ₹{totalSavings} on this order!
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedOrder)}
                  className="inline-flex items-center gap-1.5 bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#8E24AA] font-extrabold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  <Download size={13} />
                  <span>Download Invoice / Credit Note</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. DELIVERY & PAYMENT DETAILS */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00A86B] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-bold">Delivery Address</span>
                <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed mt-0.5">
                  {selectedOrder.deliveryAddress}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard size={16} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs text-gray-500 font-bold">Payment Method</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-gray-900">
                    {selectedOrder.paymentMethod || 'Payment'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isCod
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isPaid ? 'PAID' : (selectedOrder.paymentStatus || 'PENDING')}
                  </span>
                </div>

                {canSwitchToPrepaid(selectedOrder) && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={switchingPayment}
                      onClick={() => handleSwitchToPrepaid(selectedOrder)}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00A86B] disabled:opacity-60 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer border border-emerald-200"
                    >
                      {switchingPayment ? 'Processing…' : 'Switch to UPI / Card'}
                    </button>
                    {switchPaymentError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5">{switchPaymentError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. STATUS TIMELINE (if present) */}
          {Array.isArray(selectedOrder.trackingTimeline) && selectedOrder.trackingTimeline.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-extrabold text-gray-900 mb-3">Order History</h3>
              <ol className="flex flex-col">
                {selectedOrder.trackingTimeline.map((t, i, arr) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full bg-[#00A86B] shrink-0 mt-1.5" />
                      {i !== arr.length - 1 && <span className="w-0.5 flex-1 min-h-[22px] bg-gray-200" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs font-bold text-gray-900">{normalizeStatus(t.status)}</p>
                      {t.note && <p className="text-[11px] text-gray-500 leading-relaxed">{t.note}</p>}
                      {t.at && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(t.at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </main>

        {/* STICKY BOTTOM ACTION BAR (MOBILE RESPONSIVE) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3 px-4 z-40 shadow-lg">
          <div className="max-w-xl mx-auto flex flex-col items-center gap-2">
            {isActive ? (
              <button
                type="button"
                onClick={() => navigate(`/track/${encodeURIComponent(selectedOrder.orderNumber || selectedOrder.id)}`)}
                className="w-full bg-[#00A86B] hover:bg-[#00915c] text-white py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                <Navigation size={18} className="fill-white" />
                <span>Track Live Order 📍</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleReorder(selectedOrder)}
                className="w-full bg-[#00A86B] hover:bg-[#00915c] text-white py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                <RotateCcw size={16} />
                <span>Reorder These Items</span>
              </button>
            )}

            {canCancelOrder(selectedOrder.status) && (
              <button
                type="button"
                disabled={cancelling}
                onClick={() => handleCancelOrder(selectedOrder)}
                className="text-xs font-extrabold text-rose-600 hover:text-rose-700 disabled:opacity-60 cursor-pointer pt-1"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // DEFAULT VIEW: LIST OF ALL ORDERS
  return (
    <div className="w-full min-h-screen bg-gray-50/70 pb-16 font-sans">
      <SEO 
        title="Your Orders | FreshCart 10-Minute Delivery"
        description="Track active orders, view past grocery purchase invoices, and repeat orders in 1-click."
      />

      {/* Top Banner Header */}
      <header className="w-full bg-white border-b border-gray-200 py-4 px-6 md:px-12 sticky top-0 z-40 shadow-2xs">
        <div className="w-full max-w-[900px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight font-display">
                Your Orders
              </h1>
              <p className="text-xs text-gray-500 font-semibold">
                Track live 10-minute deliveries & view past purchases
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/products')}
            className="hidden sm:flex items-center gap-2 bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <ShoppingBag size={14} />
            <span>Shop More</span>
          </button>
        </div>

        {/* Status filter */}
        <div className="w-full max-w-[900px] mx-auto pt-3 flex justify-end">
          <div className="relative inline-block" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs px-4 py-2 rounded-full transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              <span>{filter === 'All' ? 'All Orders' : filter}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-20"
                >
                  {(['In Progress', 'Delivered', 'Cancelled'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setFilter(tab); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                        filter === tab ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={() => { setFilter('All'); setFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                      filter === 'All' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Orders
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="w-full max-w-[900px] mx-auto px-4 md:px-8 py-6">
        {isLoadingOrders ? (
          <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading your orders">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-6 flex flex-col gap-4 animate-pulse">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-6 w-24 bg-gray-200 rounded-full" />
                </div>
                <div className="h-14 w-full bg-gray-100 rounded-xl" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="w-full bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-200/80 shadow-2xs flex flex-col items-center justify-center gap-4 my-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#00A86B] flex items-center justify-center shrink-0 shadow-2xs">
              <Package size={32} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 font-display">
              No orders found
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-500 font-semibold text-center w-full max-w-2xl mx-auto leading-normal px-2">
              You haven't placed any orders in this category yet. Explore 30,000+ products delivered in 10 minutes!
            </p>
            <Link 
              to="/products" 
              className="mt-2 inline-flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#00915c] text-white font-black text-xs sm:text-sm px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer shrink-0"
            >
              <ShoppingBag size={16} />
              <span>Start Shopping</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredOrders.map((order, idx) => (
              <motion.div
                key={order.id || order.orderNumber || `order_${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedOrder(order)}
                className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-6 shadow-2xs flex flex-col gap-4 transition-all hover:border-gray-300 cursor-pointer group"
              >
                {/* Card Header (Order ID + Status Badge + Date) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-gray-900 font-display group-hover:text-[#4CAF50] transition-colors">
                      {orderLabel(order)}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">•</span>
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                      <Clock size={13} className="text-gray-400" />
                      {order.date}, {order.time}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {bucketOf(order.status) === 'In Progress' ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/track/${encodeURIComponent((order as any).orderId || order.orderNumber || order.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#2E7D32] text-white px-3 py-1 rounded-full text-xs font-black hover:bg-[#256628]"
                      >
                        Track live
                      </Link>
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 animate-pulse">
                        <Zap size={14} className="fill-emerald-600 text-emerald-600" />
                        <span>{order.status || 'In Progress'}</span>
                      </div>
                    </div>
                  ) : bucketOf(order.status) === 'Delivered' ? (
                    <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Delivered</span>
                    </div>
                  ) : (
                    <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-extrabold">
                      Cancelled
                    </div>
                  )}
                </div>

                {/* Items Thumbnails Row */}
                <div className="flex items-center justify-between gap-4 overflow-x-auto py-1 scrollbar-none">
                  <div className="flex items-center gap-3 shrink-0">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="relative group shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200/70 p-1.5 flex items-center justify-center">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                        {item.qty > 1 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                            x{item.qty}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block">Total Amount</span>
                      <span className="text-lg font-black text-gray-900 font-display">
                        ₹{order.totalAmount}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-800 transition-colors" />
                  </div>
                </div>

                {/* Delivery Address & Payment Summary */}
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2 border border-gray-100">
                  <div className="flex items-center gap-1.5 truncate max-w-md">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate font-medium">{order.deliveryAddress}</span>
                  </div>
                  <span className="font-bold text-gray-700 shrink-0">
                    Paid via {order.paymentMethod}
                  </span>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDownloadInvoice(order)}
                      className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Invoice</span>
                    </button>

                    <button
                      onClick={() => handleReorder(order)}
                      className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      <RotateCcw size={13} />
                      <span>Repeat Order</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
