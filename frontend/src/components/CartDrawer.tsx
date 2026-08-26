import React, { useState } from 'react';
import { useCartWishlist, getProductStockQuantity } from '../context/CartWishlistContext';
import { useCMS } from '../context/CMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, Tag, MapPin, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CheckoutModal } from './CheckoutModal';
import { getProductImage } from '../utils/imageUtils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { cart, updateCartQuantity, removeFromCart, cartSubtotal, clearCart, showLimitToast } = useCartWishlist();
  const { coupons } = useCMS();

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[1050]"
            onClick={onClose}
          />

          {/* Drawer container */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-surface z-[1060] shadow-premium flex flex-col p-6"
          >
            <div className="flex justify-between items-center pb-4 border-b border-divider mb-4">
              <h3 className="text-lg font-extrabold text-text-primary">Shopping Cart ({cart.length})</h3>
              <button onClick={onClose} className="text-text-secondary hover:text-primary transition-colors" aria-label="Close cart">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <ShoppingBag size={48} className="text-text-tertiary mb-4 animate-pulse" />
                  <div className="text-base font-bold text-text-primary mb-2">Your Basket is Empty</div>
                  <p className="text-sm text-text-secondary mb-6 leading-relaxed">Fill it up with fresh fruits, farm vegetables, sourdough loaves, and dairy milk.</p>
                  <button onClick={onClose} className="bg-primary text-white font-bold py-2.5 px-6 rounded-full text-sm transition-all hover:bg-secondary active:scale-[0.98]">Start Shopping</button>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <motion.div 
                    layout
                    key={`${item.product.id || 'item'}-${item.selectedWeight || 'w'}-${idx}`}
                    className="flex gap-4 p-3 border border-divider rounded-xl bg-background relative overflow-hidden transition-all hover:shadow-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                  >
                    <img src={getProductImage(item.product)} alt={item.product.name} className="w-20 h-20 object-cover rounded-md border border-divider" />
                    <div className="flex-1 flex flex-col">
                      <h4 className="text-sm font-bold text-text-primary mb-0.5 line-clamp-1">{item.product.name}</h4>
                      <span className="text-xs text-text-secondary font-medium mb-2">{item.selectedWeight}</span>
                      
                      <div className="flex justify-between items-center mt-auto">
                        <span className="text-sm font-extrabold text-text-primary">₹{item.product.price * item.quantity}</span>
                        
                        <div className="flex items-center">
                          <div className="flex items-center border border-divider rounded-full bg-surface overflow-hidden mr-2">
                            <button 
                              onClick={() => updateCartQuantity(item.product.id, item.selectedWeight, item.quantity - 1)} 
                              className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-text-primary">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                if (item.quantity >= 3) {
                                  showLimitToast();
                                } else {
                                  updateCartQuantity(item.product.id, item.selectedWeight, item.quantity + 1);
                                }
                              }} 
                              disabled={item.quantity >= getProductStockQuantity(item.product)}
                              className={`p-1.5 transition-colors ${item.quantity >= getProductStockQuantity(item.product) ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-text-secondary hover:text-primary'}`}
                              title={item.quantity >= 3 ? 'Seller has limited to 3 units' : 'Increase'}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => removeFromCart(item.product.id, item.selectedWeight)}
                            className="flex items-center justify-center p-2 rounded-full text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                            title="Remove product"
                            aria-label={`Remove ${item.product.name} from cart`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Bottom Checkout Card */}
            {cart.length > 0 && (
              <div className="border-t border-divider pt-4 mt-4 flex flex-col gap-3 bg-surface">
                {/* Coupon Code Section */}
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter promo code (e.g. FRESH50)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={!!appliedCoupon}
                      className="flex-1 px-3 py-2 border border-divider rounded-md text-xs bg-background focus:outline-none focus:border-primary"
                    />
                    {appliedCoupon ? (
                      <button onClick={handleRemoveCoupon} className="px-4 py-2 bg-error text-white text-xs font-bold rounded-md transition-colors hover:bg-error/90">
                        Remove
                      </button>
                    ) : (
                      <button onClick={handleApplyCoupon} className="px-4 py-2 bg-text-primary text-white text-xs font-bold rounded-md transition-colors hover:bg-black">
                        Apply
                      </button>
                    )}
                  </div>
                  {couponError && <span className="text-error text-[10px] font-semibold">{couponError}</span>}
                  {appliedCoupon && (
                    <span className="text-success text-[10px] font-semibold flex items-center">
                      <Tag size={10} className="mr-1 inline" />
                      Coupon applied: <strong>{appliedCoupon.code}</strong> (₹{discount} saved!)
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-success font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Delivery Charges</span>
                  <span className="text-success font-semibold">FREE</span>
                </div>
                
                <div className="flex justify-between text-base font-extrabold text-text-primary border-t border-divider pt-3">
                  <span>Total Amount</span>
                  <span>₹{total}</span>
                </div>

                {addressError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-rose-600" />
                    <span>{addressError}</span>
                  </div>
                )}

                <button onClick={handleCheckout} className="w-full bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold py-3.5 rounded-2xl text-sm mt-2 transition-all shadow-md active:scale-[0.98] flex items-center justify-center cursor-pointer">
                  <span>Proceed to Checkout - ₹{total}</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Zepto-Style Checkout Modal matching image copy 20.png */}
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
