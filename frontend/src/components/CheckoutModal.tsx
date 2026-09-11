import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Clock, ShieldCheck, Plus, Minus, CreditCard, Wallet,
  Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useCartWishlist } from '../context/CartWishlistContext';
import { OrderSuccessModal } from './OrderSuccessModal';
import { apiUrl } from '../config/api';

interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  houseNo?: string;
  landmark?: string;
  area: string;
  fullAddress: string;
  pincode: string;
  receiverName?: string;
  receiverPhone?: string;
  lat?: number;
  lng?: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAddress: SavedAddress | null;
  onOpenAddressSelector: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PayMethod = 'razorpay' | 'cod';

const RZP_THEME = '#2E7D32'; // --primary-strong

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedAddress,
  onOpenAddressSelector,
}) => {
  const { cart, updateCartQuantity, cartSubtotal, clearCart } = useCartWishlist();

  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('razorpay');
  const [payError, setPayError] = useState<string | null>(null);
  const [successModalData, setSuccessModalData] = useState({
    isOpen: false,
    orderNumber: '',
    totalAmount: 0,
    addressText: '',
    itemCount: 0,
  });

  const customerUser = (() => {
    try {
      const cached = localStorage.getItem('customer_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  })();

  // Delivery-fee rules from Settings (same source the mobile app uses). The
  // backend recomputes the fee authoritatively on order create — this is just
  // so the bill the customer sees matches what they're charged.
  const [feeRule, setFeeRule] = useState(40);
  const [freeThreshold, setFreeThreshold] = useState(499);

  const deliveryFee = cartSubtotal >= freeThreshold ? 0 : feeRule;
  const finalPayable = Math.max(cartSubtotal + deliveryFee, 0);
  const savedOnDelivery = cartSubtotal >= freeThreshold ? feeRule : 0;

  // Load Razorpay Checkout SDK (only needed for the online path).
  useEffect(() => {
    if (!window.Razorpay && !document.getElementById('rzp-checkout-js')) {
      const script = document.createElement('script');
      script.id = 'rzp-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setPayError(null);
    fetch(apiUrl('/settings'))
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings;
        if (!s) return;
        if (s.deliveryFeeRule != null) setFeeRule(Number(s.deliveryFeeRule));
        if (s.freeDeliveryThreshold != null) setFreeThreshold(Number(s.freeDeliveryThreshold));
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const addressString = selectedAddress
    ? `${selectedAddress.label} - ${selectedAddress.houseNo ? selectedAddress.houseNo + ', ' : ''}${selectedAddress.fullAddress}`
    : 'Selected Delivery Address';
  const addressFormatted = selectedAddress
    ? `${selectedAddress.houseNo ? selectedAddress.houseNo + ', ' : ''}${selectedAddress.fullAddress}`
    : 'No delivery address selected';

  const userPhoneKey = customerUser?.phone
    ? String(customerUser.phone).replace(/\D/g, '')
    : '9626626626';

  /** Create our Order server-side. Never sets paymentStatus for COD (backend
   * derives Pending); online orders are placed Pending, then flipped by verify
   * / the Razorpay webhook. Returns the orderId. */
  const placeOrder = async (opts: {
    orderId: string;
    paymentMethod: string;
    paymentStatus?: 'Pending' | 'Paid';
    paymentRef?: string;
    paymentId?: string;
  }): Promise<void> => {
    const res = await fetch(apiUrl('/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: opts.orderId,
        customerId: 'cust_' + userPhoneKey,
        customerPhone: userPhoneKey,
        customerName: customerUser?.name || 'Valued Customer',
        items: cart.map((item) => ({
          id: item.product.id || 'p_1',
          productId: item.product.id || 'p_1',
          name: item.product.name,
          weightSpec: item.selectedWeight || '500g',
          quantity: item.quantity,
          qty: item.quantity,
          price: item.product.price,
          image: item.product.imageUrl || (item.product as any).image || '',
        })),
        itemTotal: cartSubtotal,
        deliveryFee,
        totalAmount: finalPayable,
        ...(opts.paymentStatus ? { paymentStatus: opts.paymentStatus } : {}),
        paymentMethod: opts.paymentMethod,
        ...(opts.paymentRef ? { paymentRef: opts.paymentRef } : {}),
        ...(opts.paymentId ? { paymentId: opts.paymentId } : {}),
        deliveryAddress: addressString,
        // Without these the order never gets a `deliveryLocation`, which is
        // what the live tracking map keys off — the customer would place an
        // order and never see a map until (if ever) a rider's live position
        // happened to come through.
        ...(Number.isFinite(selectedAddress?.lat) && Number.isFinite(selectedAddress?.lng)
          ? { deliveryLat: selectedAddress!.lat, deliveryLng: selectedAddress!.lng }
          : {}),
      }),
    });
    // A payment can succeed while the order write fails (DB blip, validation
    // error, offline-mode fallback) — never treat that as a placed order, or
    // the customer sees a success screen for an order that never reaches the
    // admin console. Surface it as a real failure so the caller's catch block
    // shows an error instead of calling finish().
    let data: any = null;
    try { data = await res.json(); } catch { /* non-JSON error body */ }
    if (!res.ok || !data?.success || !data?.order?.orderId) {
      throw new Error(data?.message || 'Could not place your order. Please try again.');
    }
  };

  const cacheOrderLocally = (orderId: string, paymentStatus: 'Paid' | 'Pending') => {
    try {
      const newOrder = {
        id: `ord_${Date.now()}`,
        orderId,            // real server orderId — used for tracking + admin lookups
        orderNumber: orderId,
        date:
          new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ` at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        status: 'In Transit',
        paymentStatus,
        deliveryTime: '10 mins',
        totalAmount: finalPayable,
        address: addressString,
        itemsCount: cart.length,
        items: cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          weight: item.selectedWeight || (item.product as any).weight || '500g',
          quantity: item.quantity,
          price: item.product.price,
          image: item.product.imageUrl || (item.product as any).image || '',
        })),
      };
      const cached = JSON.parse(localStorage.getItem(`customer_orders_${userPhoneKey}`) || '[]');
      localStorage.setItem(
        `customer_orders_${userPhoneKey}`,
        JSON.stringify([newOrder, ...cached]),
      );
    } catch {
      /* non-fatal */
    }
  };

  const finish = (orderId: string, paymentStatus: 'Paid' | 'Pending') => {
    const itemCount = cart.length;
    cacheOrderLocally(orderId, paymentStatus);
    clearCart();
    setIsProcessing(false);
    setStage('');
    onClose();
    setSuccessModalData({
      isOpen: true,
      orderNumber: orderId,
      totalAmount: finalPayable,
      addressText: addressFormatted,
      itemCount,
    });
  };

  const newOrderId = () => `FC${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 90)}`;

  const runCod = async () => {
    setIsProcessing(true);
    setPayError(null);
    setStage('Placing your order…');
    try {
      const orderId = newOrderId();
      await placeOrder({ orderId, paymentMethod: 'Cash on Delivery' });
      finish(orderId, 'Pending');
    } catch {
      setIsProcessing(false);
      setStage('');
      setPayError('Could not place your order. Please try again.');
    }
  };

  const runRazorpay = async () => {
    setIsProcessing(true);
    setPayError(null);
    const orderId = newOrderId();

    try {
      setStage('Creating payment order…');
      const co = await fetch(apiUrl('/payment/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalPayable, receipt: orderId }),
      }).then((r) => r.json());

      if (!co?.success) throw new Error(co?.message || 'Could not start the payment.');
      const { key, orderId: rzpOrderId, amount, currency, testMode } = co;

      setStage('Placing your order…');
      await placeOrder({
        orderId,
        paymentMethod: 'Razorpay',
        paymentStatus: 'Pending',
        paymentRef: rzpOrderId,
      });

      // Local-dev path: backend in test mode with no usable key — skip the sheet.
      if (testMode && !key) {
        setStage('Confirming…');
        await fetch(apiUrl('/payment/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: 'simulated',
            orderId,
          }),
        });
        finish(orderId, 'Paid');
        return;
      }

      // Wait for the SDK if it's still loading.
      let waited = 0;
      while (!window.Razorpay && waited < 5000) {
        await new Promise((res) => setTimeout(res, 150));
        waited += 150;
      }
      if (!window.Razorpay) throw new Error('Payment could not load. Check your connection and retry.');

      setStage('Opening secure payment…');
      const rzp = new window.Razorpay({
        key,
        order_id: rzpOrderId,
        amount,
        currency: currency || 'INR',
        name: 'FreshCart',
        description: `Order ${orderId}`,
        image: '/logo.png',
        prefill: {
          name: customerUser?.name || '',
          contact: userPhoneKey,
          email: customerUser?.email || '',
        },
        theme: { color: RZP_THEME },
        handler: async (resp: any) => {
          setStage('Verifying payment…');
          try {
            const v = await fetch(apiUrl('/payment/verify'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                orderId,
              }),
            }).then((r) => r.json());

            if (v?.verified) {
              finish(orderId, 'Paid');
            } else {
              setIsProcessing(false);
              setStage('');
              setPayError(
                'We could not verify your payment. If money was deducted it will be auto-refunded; your order is on hold.',
              );
            }
          } catch {
            setIsProcessing(false);
            setStage('');
            setPayError('Payment verification failed. Your order is on hold — please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setStage('');
            setPayError('Payment cancelled. Your order is saved — tap Pay to try again.');
          },
        },
      });

      rzp.on('payment.failed', (resp: any) => {
        setIsProcessing(false);
        setStage('');
        setPayError(resp?.error?.description || 'Payment failed. Please try again.');
      });

      rzp.open();
    } catch (e: any) {
      setIsProcessing(false);
      setStage('');
      setPayError(e?.message || 'Something went wrong. Please try again.');
    }
  };

  const onPay = () => {
    if (isProcessing || cart.length === 0) return;
    if (payMethod === 'cod') runCod();
    else runRazorpay();
  };

  const ctaLabel = isProcessing
    ? stage || 'Processing…'
    : payMethod === 'cod'
    ? `Place order · ₹${finalPayable}`
    : `Pay ₹${finalPayable}`;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[1100] flex justify-end bg-black/50 backdrop-blur-2xs">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-full sm:max-w-[440px] bg-background h-full flex flex-col shadow-2xl relative overflow-hidden"
          >
            {/* Header — deliver-to */}
            <div className="bg-surface border-b border-divider p-4 sticky top-0 z-20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-background hover:bg-divider/60 flex items-center justify-center text-text-secondary shrink-0 cursor-pointer transition-colors"
                    aria-label="Back"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 font-extrabold text-sm text-text-primary font-display">
                      <MapPin size={13} className="text-primary shrink-0" />
                      <span>Deliver to {selectedAddress?.label || 'Home'}</span>
                    </div>
                    <p className="text-xs text-text-secondary truncate font-medium max-w-[260px]">
                      {addressFormatted}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenAddressSelector}
                  className="text-xs font-bold text-primary-strong hover:opacity-80 shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
              {savedOnDelivery > 0 && (
                <div className="bg-primary/10 border border-primary/25 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-primary-strong">
                  <span>Free delivery applied</span>
                  <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                    ₹{savedOnDelivery} saved
                  </span>
                </div>
              )}

              {/* Order summary */}
              <div className="bg-surface rounded-lg p-4 border border-divider shadow-card flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-divider pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-primary" />
                    <span className="text-xs font-extrabold text-text-primary">Delivery in ~10 mins</span>
                  </div>
                  <span className="text-xs font-semibold text-text-secondary">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-divider">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.product.id || 'item'}-${idx}`}
                      className="py-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.product.image || (item.product as any).imageUrl}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-lg object-contain bg-background p-1 border border-divider shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-text-primary line-clamp-1">{item.product.name}</span>
                          <span className="text-[11px] text-text-tertiary">
                            {item.selectedWeight || (item.product as any).weight || '500g'}
                          </span>
                          <span className="font-extrabold text-text-primary mt-0.5">
                            ₹{item.product.price * item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-lg px-2 py-1 text-primary-strong font-extrabold shrink-0">
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.selectedWeight || '500g', item.quantity - 1)
                          }
                          className="hover:opacity-70 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.selectedWeight || '500g', item.quantity + 1)
                          }
                          className="hover:opacity-70 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-divider flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
                  <div className="flex justify-between">
                    <span>Item total</span>
                    <span className="font-bold text-text-primary">₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery fee</span>
                    {deliveryFee > 0 ? (
                      <span className="font-bold text-text-primary">₹{deliveryFee}</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="line-through text-text-tertiary text-[11px]">₹{feeRule}</span>
                        <span className="text-primary font-extrabold uppercase">Free</span>
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-divider text-sm font-extrabold text-text-primary">
                    <span>To pay</span>
                    <span>₹{finalPayable}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-surface rounded-lg p-4 border border-divider shadow-card flex flex-col gap-2.5">
                <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">
                  Payment method
                </h4>
                {(
                  [
                    { id: 'razorpay', Icon: CreditCard, title: 'Pay online', sub: 'UPI · Cards · Netbanking · Wallets' },
                    { id: 'cod', Icon: Wallet, title: 'Cash on delivery', sub: 'Pay the rider when it arrives' },
                  ] as const
                ).map(({ id, Icon, title, sub }) => {
                  const active = payMethod === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setPayMethod(id)}
                      disabled={isProcessing}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer disabled:opacity-60 ${
                        active
                          ? 'border-primary bg-primary/[0.06]'
                          : 'border-divider hover:border-primary/40'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          active ? 'bg-primary text-white' : 'bg-background text-text-secondary'
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold text-text-primary">{title}</span>
                        <span className="block text-[11px] text-text-secondary">{sub}</span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                          active ? 'border-primary bg-primary' : 'border-divider'
                        }`}
                      >
                        {active && <CheckCircle2 size={12} className="text-white -m-0.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {payError && (
                <div className="flex items-start gap-2 rounded-lg bg-error/10 border border-error/25 px-3 py-2.5 text-xs font-semibold text-error">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary font-medium pt-1">
                <ShieldCheck size={13} className="text-primary" />
                Payments are processed securely by Razorpay
              </p>
            </div>

            {/* Sticky CTA */}
            <div className="bg-surface border-t border-divider p-4 sticky bottom-0 z-20 shadow-[0_-4px_16px_-6px_rgba(0,0,0,0.08)]">
              <button
                onClick={onPay}
                disabled={isProcessing || cart.length === 0 || !selectedAddress}
                className="w-full bg-primary hover:bg-primary-strong text-white font-extrabold text-[15px] py-3.5 rounded-xl transition-colors active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                <span>{!selectedAddress ? 'Select a delivery address' : ctaLabel}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <OrderSuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData((prev) => ({ ...prev, isOpen: false }))}
        orderNumber={successModalData.orderNumber}
        totalAmount={successModalData.totalAmount}
        deliveryAddress={successModalData.addressText}
        itemCount={successModalData.itemCount}
      />
    </>
  );
};
