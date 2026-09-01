import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/SEO';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS } from '../context/CMSContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
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
  FileText
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
  trackingTimeline?: TimelineEntry[];
  createdAt?: string;
}

/** Collapse the backend's 11-value status enum onto the 3 UI buckets. */
type StatusBucket = 'In Transit' | 'Delivered' | 'Cancelled';
const bucketOf = (raw?: string): StatusBucket => {
  const s = (raw || '').toLowerCase();
  if (s === 'delivered') return 'Delivered';
  if (['cancelled', 'canceled', 'returned', 'refunded'].includes(s)) return 'Cancelled';
  return 'In Transit';
};


export const CustomerOrders: React.FC = () => {
  const customerUser = (() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  })();
  const userPhoneKey = customerUser?.phone ? customerUser.phone.replace(/\D/g, '') : 'default';

  const [filter, setFilter] = useState<'All' | 'In Transit' | 'Delivered' | 'Cancelled'>('All');
  const [orders, setOrders] = useState<MockOrder[]>(() => {
    const cached = localStorage.getItem(`customer_orders_${userPhoneKey}`);
    if (cached) return JSON.parse(cached);
    return [];
  });
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);
  const [copied, setCopied] = useState(false);
  // Only show the loading skeleton on a genuine first fetch (no cached
  // orders to render yet) — avoids a jarring "No orders found" flash
  // before the real orders arrive for a customer opening this on a new device.
  const [isLoadingOrders, setIsLoadingOrders] = useState(() => orders.length === 0);

  const { addToCart } = useCartWishlist();
  const { products } = useCMS();
  const navigate = useNavigate();
  const goBack = useSmartBack('/');

  React.useEffect(() => {
    if (customerUser?.phone) {
      const cleanPhone = customerUser.phone.replace(/\D/g, '').slice(-10);
      fetch(`/api/orders/customer/${cleanPhone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.orders && data.orders.length > 0) {
            setOrders(data.orders);
            localStorage.setItem(`customer_orders_${userPhoneKey}`, JSON.stringify(data.orders));
          }
        })
        .catch(() => null)
        .finally(() => setIsLoadingOrders(false));
    } else {
      setIsLoadingOrders(false);
    }
  }, [userPhoneKey]);

  const filteredOrders = orders.filter(
    (o) => filter === 'All' || bucketOf(o.status) === filter
  );

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // IF AN ORDER IS SELECTED: RENDER EXACT ORDER DETAILS PAGE MATCHING SCREENSHOT
  if (selectedOrder) {
    const totalUnitsCount = selectedOrder.items.reduce((sum, item) => sum + item.qty, 0);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-screen bg-white text-gray-900 pb-16 font-sans"
      >
        <SEO 
          title={`Order #${selectedOrder.orderNumber} | FreshCart`}
          description={`Order details for order #${selectedOrder.orderNumber}`}
        />

        {/* Top Sticky Header */}
        <header className="bg-white border-b border-gray-200 py-3.5 px-4 md:px-12 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-black text-gray-900 font-display leading-tight">
                Order #{selectedOrder.orderNumber}
              </h1>
              <span className="text-xs text-gray-500 font-semibold">
                {selectedOrder.items.length} {selectedOrder.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/help')}
            className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <MessageSquare size={14} className="text-rose-500" />
            <span>Get Help</span>
          </button>
        </header>

        {/* Status Banner */}
        <div className="px-4 md:px-12 py-5 bg-white border-b border-gray-100">
          {bucketOf(selectedOrder.status) === 'Delivered' ? (
            <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-900 p-4 rounded-2xl flex items-center gap-3 font-extrabold text-lg shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-[#00E676]/20 text-[#00E676] flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <span className="font-display tracking-tight text-emerald-950">Delivered</span>
            </div>
          ) : bucketOf(selectedOrder.status) === 'In Transit' ? (
            <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-900 p-4 rounded-2xl flex items-center gap-3 font-extrabold text-lg shadow-2xs animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Zap size={20} className="fill-white" />
              </div>
              <span className="font-display tracking-tight text-emerald-950">
                {selectedOrder.status === 'Out For Delivery'
                  ? `Arriving in ${selectedOrder.estimatedDelivery || '8 minutes'}`
                  : selectedOrder.status}
              </span>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 font-extrabold text-lg">
              <span>{selectedOrder.status || 'Cancelled'}</span>
            </div>
          )}
        </div>

        {/* Status Timeline (real trackingTimeline from the order document) */}
        {Array.isArray(selectedOrder.trackingTimeline) && selectedOrder.trackingTimeline.length > 0 && (
          <div className="px-4 md:px-12 py-6 border-b border-gray-100">
            <h2 className="text-sm font-extrabold text-gray-900 mb-4">Order progress</h2>
            <ol className="flex flex-col">
              {selectedOrder.trackingTimeline.map((t, i, arr) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] shrink-0 mt-1" />
                    {i !== arr.length - 1 && <span className="w-0.5 flex-1 min-h-[28px] bg-gray-200" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-900">{t.status || '—'}</p>
                    {t.note && <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">{t.note}</p>}
                    {t.at && (
                      <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
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

        {/* Items Section */}
        <div className="px-4 md:px-12 py-6 border-b border-gray-100">
          <h2 className="text-sm font-extrabold text-gray-900 mb-4">
            {selectedOrder.items.length} {selectedOrder.items.length === 1 ? 'item' : 'items'} in order
          </h2>

          <div className="flex flex-col gap-5">
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
                <div key={item.id || `ord_item_${idx}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200/80 p-1 shrink-0 flex items-center justify-center">
                      <img 
                        src={imgVal} 
                        alt={nameVal} 
                        className="w-full h-full object-contain" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop'; }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                        {nameVal}
                      </h3>
                      <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        {weightVal} • {qtyVal} {qtyVal === 1 ? 'unit' : 'units'} (₹{priceVal} / unit)
                      </span>
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

        {/* Bill Summary Section */}
        <div className="px-4 md:px-12 py-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-gray-700" />
            <h2 className="text-base font-extrabold text-gray-900 font-display">
              Bill Summary
            </h2>
          </div>

          {(() => {
            const calcItemTotal = selectedOrder.items.reduce((sum: number, it: any) => sum + (Number(it.price || it.unitPrice || 0) * Number(it.qty || it.quantity || 1)), 0);
            const calcItemMrpTotal = selectedOrder.items.reduce((sum: number, it: any) => sum + (Number(it.mrp || it.originalPrice || (Number(it.price || 0) + 20)) * Number(it.qty || it.quantity || 1)), 0);
            const displayItemTotal = Number(selectedOrder.itemTotal || (selectedOrder as any).subTotal || calcItemTotal);
            const displayItemMrpTotal = Number(selectedOrder.itemTotalMrp || calcItemMrpTotal);
            const displayTotalAmount = Number(selectedOrder.totalAmount || (selectedOrder as any).totalPrice || displayItemTotal);

            return (
              <div className="flex flex-col gap-2.5 text-xs md:text-sm">
                <div className="flex items-center justify-between text-gray-600 font-medium">
                  <span>Item Total</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₹{displayItemMrpTotal}</span>
                    <span className="font-bold text-gray-900">₹{displayItemTotal}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-gray-600 font-medium">
                  <span>Delivery Fee</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₹30</span>
                    <span className="font-extrabold text-[#2E7D32]">FREE</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-gray-600 font-medium">
                  <span>Handling Fee</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">₹10</span>
                    <span className="font-extrabold text-[#2E7D32]">FREE</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-2" />

                <div className="flex items-center justify-between font-black text-sm md:text-base text-gray-900">
                  <span className="font-display">Total Bill</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-xs font-normal text-gray-400">₹{displayItemMrpTotal + 40}</span>
                    <span className="text-base font-black text-gray-900 font-display">₹{displayTotalAmount}</span>
                  </div>
                </div>

                {/* Download Invoice Button */}
                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => alert(`Downloading Invoice for Order #${selectedOrder.orderNumber}...`)}
                    className="bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#8E24AA] font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    Download Invoice / Credit Note
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Order Details Section */}
        <div className="px-4 md:px-12 py-6 flex flex-col gap-4 text-xs md:text-sm">
          <h2 className="text-base font-extrabold text-gray-900 font-display">
            Order Details
          </h2>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-semibold">Order ID</span>
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <span>#{selectedOrder.orderNumber}</span>
              <button
                type="button"
                onClick={() => handleCopyOrderId(selectedOrder.orderNumber)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-0.5"
                title="Copy Order ID"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-semibold">Delivery Address</span>
            <p className="text-xs md:text-sm font-medium text-gray-800 leading-relaxed max-w-2xl">
              {selectedOrder.deliveryAddress}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-semibold">Order Placed at</span>
            <span className="font-semibold text-gray-900">{selectedOrder.orderPlacedAt}</span>
          </div>

          {selectedOrder.orderArrivedAt && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500 font-semibold">Order Arrived at</span>
              <span className="font-semibold text-gray-900">{selectedOrder.orderArrivedAt}</span>
            </div>
          )}
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

        {/* Category Filter Tabs */}
        <div className="w-full max-w-[900px] mx-auto flex items-center gap-2 overflow-x-auto pt-3 scrollbar-none">
          {(['All', 'In Transit', 'Delivered', 'Cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                filter === tab
                  ? 'bg-gray-900 text-white shadow-2xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {tab === 'All' ? 'All Orders' : tab}
            </button>
          ))}
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
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">•</span>
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                      <Clock size={13} className="text-gray-400" />
                      {order.date}, {order.time}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {bucketOf(order.status) === 'In Transit' ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 animate-pulse">
                      <Zap size={14} className="fill-emerald-600 text-emerald-600" />
                      <span>Arriving in {order.estimatedDelivery}</span>
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
                      onClick={() => alert(`Downloading Invoice for ${order.orderNumber}...`)}
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
