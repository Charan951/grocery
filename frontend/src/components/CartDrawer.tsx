import React, { useState } from 'react';
import { useCartWishlist, getProductStockQuantity } from '../context/CartWishlistContext';
import { useCMS } from '../context/CMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, Tag, AlertCircle, Heart, PiggyBank, Zap, Clock, ShieldCheck, ArrowRight, Home, MapPin, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CheckoutModal } from './CheckoutModal';
import { getProductImage } from '../utils/imageUtils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cart, updateCartQuantity, removeFromCart, cartSubtotal, clearCart, showLimitToast, toggleWishlist, wishlist, addToCart } = useCartWishlist();
  const { coupons, products } = useCMS();

  const mrpTotal = cart.reduce(
    (s, it) => s + ((it.product as any).mrp || (it.product as any).originalPrice || it.product.price) * it.quantity,
    0,
  );
  const itemSavings = Math.max(mrpTotal - cartSubtotal, 0);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    const match = coupons.find((c) => c.code === code);

    if (!match) {
      setCouponError('Invalid coupon code.');
      return;
    }

    if (cartSubtotal < match.minOrder) {
      setCouponError(`Min order value to apply is ₹${match.minOrder}`);
      return;
    }

    setAppliedCoupon(match);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.isPercent) {
      const calc = (cartSubtotal * appliedCoupon.value) / 100;
      return Math.min(calc, 100);
    }
    return appliedCoupon.value;
  };

  const discount = calculateDiscount();
  const total = Math.max(cartSubtotal - discount, 0);

  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [addressError, setAddressError] = useState('');

  const customerUser = (() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  })();
  const userPhoneKey = customerUser?.phone ? customerUser.phone.replace(/\D/g, '') : 'default';

  const savedAddresses = (() => {
    const cached = localStorage.getItem(`saved_addresses_${userPhoneKey}`);
    if (cached) return JSON.parse(cached);
    if (customerUser?.addresses && customerUser.addresses.length > 0) return customerUser.addresses;
    return [];
  })();

  const activeAddress = savedAddresses.length > 0 ? savedAddresses[0] : null;

  const handleCheckout = () => {
    setAddressError('');

    if (!savedAddresses || savedAddresses.length === 0) {
      setAddressError('Please select or add a delivery address before proceeding to checkout.');
      setTimeout(() => {
        onClose();
        navigate('/account/addresses');
      }, 1400);
      return;
    }

    setIsCheckoutOpen(true);
  };

  // Recommendations for "You might also like" shelf
  const recommendations = (products || [])
    .filter((p) => !cart.some((ci) => ci.product.id === p.id))
    .slice(0, 6);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[1050]"
            onClick={onClose}
          />

          {/* Drawer container */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[430px] bg-gray-50 z-[1060] shadow-2xl flex flex-col p-0"
          >
            {/* Top Bar Header */}
            <div className="bg-white px-4 py-3 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-1 text-gray-700 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
                <h3 className="text-base font-black text-gray-900">Checkout</h3>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                    <ShoppingBag size={32} />
                  </div>
                  <div className="text-base font-bold text-gray-900 mb-1">Your Basket is Empty</div>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">Fill it up with fresh fruits, farm vegetables, sourdough loaves, and dairy milk.</p>
                  <button onClick={onClose} className="bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold py-3 px-8 rounded-full text-sm transition-all shadow-md active:scale-[0.98]">
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. Delivery ETA Banner */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900">Delivery in 8 minutes</h4>
                      <p className="text-xs text-gray-500 font-medium">Shipment of {cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>

                  {/* 2. Cart Items List */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-xs flex flex-col gap-3">
                    {cart.map((item, idx) => (
                      <div 
                        key={`${item.product.id || 'item'}-${item.selectedWeight || 'w'}-${idx}`}
                        className="flex gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0"
                      >
                        <img src={getProductImage(item.product)} alt={item.product.name} className="w-16 h-16 object-cover rounded-xl border border-gray-100 shrink-0 bg-gray-50" />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.product.name}</h4>
                            <span className="text-[11px] text-gray-500 font-medium">{item.selectedWeight}</span>
                            <div>
                              <button
                                onClick={() => { toggleWishlist(item.product); removeFromCart(item.product.id, item.selectedWeight); }}
                                className="text-[11px] font-bold text-gray-500 underline hover:text-emerald-700 mt-0.5 inline-block"
                              >
                                Move to wishlist
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between">
                          <div className="flex items-center border border-emerald-600 bg-emerald-700 rounded-lg text-white font-extrabold px-1 text-xs">
                            <button onClick={() => updateCartQuantity(item.product.id, item.selectedWeight, item.quantity - 1)} className="p-1 hover:bg-emerald-800 rounded">
                              <Minus size={10} />
                            </button>
                            <span className="px-2 text-xs">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                if (item.quantity >= 3) {
                                  showLimitToast();
                                } else {
                                  updateCartQuantity(item.product.id, item.selectedWeight, item.quantity + 1);
                                }
                              }} 
                              className="p-1 hover:bg-emerald-800 rounded"
                            >
                              <Plus size={10} />
                            </button>
                          </div>

                          <div className="flex items-baseline gap-1 mt-1">
                            {(() => {
                              const mrp = (item.product as any).mrp || (item.product as any).originalPrice || 0;
                              return mrp > item.product.price ? (
                                <span className="text-[10px] text-gray-400 line-through">₹{mrp * item.quantity}</span>
                              ) : null;
                            })()}
                            <span className="text-xs font-black text-gray-900">₹{item.product.price * item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. "You might also like" Shelf */}
                  {recommendations.length > 0 && (
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
                      <h4 className="text-xs font-black text-gray-900 mb-2.5">You might also like</h4>
                      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                        {recommendations.map((p) => {
                          const mrp = (p as any).mrp || (p as any).originalPrice || p.price;
                          const off = mrp > p.price ? Math.round(((mrp - p.price) / mrp) * 100) : 0;
                          return (
                            <div key={p.id} className="w-28 shrink-0 p-2 border border-gray-100 rounded-xl bg-gray-50 flex flex-col justify-between">
                              <div className="relative mb-1">
                                <img src={getProductImage(p)} alt={p.name} className="w-full h-16 object-cover rounded-lg bg-white" />
                                <button 
                                  onClick={() => addToCart(p)}
                                  className="absolute bottom-1 right-1 bg-white text-emerald-700 border border-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs hover:bg-emerald-50"
                                >
                                  ADD
                                </button>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-black text-gray-900">₹{p.price}</span>
                                  {mrp > p.price && <span className="text-[9px] text-gray-400 line-through">₹{mrp}</span>}
                                </div>
                                {off > 0 && <span className="text-[9px] font-bold text-blue-600 block">{off}% OFF on MRP</span>}
                                <span className="text-[10px] font-bold text-gray-800 line-clamp-1 mt-0.5">{p.name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Bill Details Breakdown */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-2 text-xs">
                    <h4 className="text-xs font-black text-gray-900 pb-1 border-b border-gray-100 mb-2">Bill details</h4>
                    <div className="flex justify-between text-gray-600">
                      <span>Items Total (MRP)</span>
                      <span>₹{mrpTotal}</span>
                    </div>

                    {itemSavings > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Product Discount</span>
                        <span>-₹{Math.round(itemSavings)}</span>
                      </div>
                    )}
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Coupon Discount</span>
                        <span>-₹{discount}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Charges</span>
                      <span className="text-emerald-700 font-extrabold">FREE</span>
                    </div>

                    <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-100 pt-2.5 mt-1">
                      <span>To Pay</span>
                      <span className="text-emerald-700">₹{total}</span>
                    </div>
                  </div>

                  {/* 5. Coupons & Offers */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
                    <div className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Tag size={14} className="text-emerald-600" />
                      Coupons & Offers
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter promo code (e.g. FRESH50)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={!!appliedCoupon}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all uppercase font-semibold"
                      />
                      {appliedCoupon ? (
                        <button onClick={handleRemoveCoupon} className="px-3.5 py-2 bg-rose-600 text-white text-xs font-extrabold rounded-xl transition-colors hover:bg-rose-700">
                          Remove
                        </button>
                      ) : (
                        <button onClick={handleApplyCoupon} className="px-4 py-2 bg-gray-900 text-white text-xs font-extrabold rounded-xl transition-colors hover:bg-black">
                          Apply
                        </button>
                      )}
                    </div>
                    {couponError && <span className="text-rose-600 text-[10px] font-bold mt-1 block">{couponError}</span>}
                    {appliedCoupon && (
                      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                        <span>Coupon applied: <strong>{appliedCoupon.code}</strong></span>
                        <span className="text-emerald-700 font-black">₹{discount} OFF</span>
                      </div>
                    )}
                  </div>

                  {/* 6. Cancellation Policy */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShieldCheck size={17} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 mb-1">Cancellation policy</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Once placed, cancelling may attract a fee. If we delay or fail to deliver, you get a full refund.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 10. Bottom Sticky Address & Action Bar */}
            {cart.length > 0 && (
              <div className="bg-white border-t border-gray-100 p-3 flex flex-col gap-2 shrink-0 shadow-lg">
                {/* Address Bar */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Home size={16} className="text-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-gray-900">Delivering to {activeAddress?.name || 'Work'}</span>
                      <p className="text-[10px] text-gray-500 truncate">{activeAddress?.addressLine || activeAddress?.address || 'Select address'}</p>
                    </div>
                  </div>
                  <button onClick={() => { onClose(); navigate('/account/addresses'); }} className="text-xs font-black text-emerald-700 hover:underline shrink-0 ml-2">
                    Change
                  </button>
                </div>

                {addressError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>{addressError}</span>
                  </div>
                )}

                {/* Big Green Checkout Button */}
                <button 
                  onClick={handleCheckout} 
                  className="w-full bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold py-3.5 rounded-2xl text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-between px-5 cursor-pointer"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] opacity-80 uppercase tracking-wider font-bold">Total Payable</span>
                    <span className="text-base font-black leading-tight">₹{total}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span>Select Payment Method</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedAddress={activeAddress}
        onOpenAddressSelector={() => {
          setIsCheckoutOpen(false);
          onClose();
          navigate('/account/addresses');
        }}
      />
    </AnimatePresence>
  );
};


