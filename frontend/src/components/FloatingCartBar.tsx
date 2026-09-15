import React, { useState, useEffect, useRef } from 'react';
import { useCartWishlist } from '../context/CartWishlistContext';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingCartBarProps {
  onCartOpen: () => void;
  /** Extra px to lift the mobile pill above a page's own sticky bottom bar
   *  (e.g. the PDP "Add to Cart" bar), so the two never overlap. */
  raiseBy?: number;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onCartOpen, raiseBy = 0 }) => {
  const { cart, cartCount, cartSubtotal } = useCartWishlist();
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-move cart pill down when bottom nav hides on scroll down
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

  if (cartCount === 0) return null;

  const firstItem = cart[0]?.product;
  const firstImg = firstItem?.image || firstItem?.imageUrl || '';

  // Bottom offset matching Flutter layout (70px above bottom nav when visible, 16px when nav hidden)
  const targetY = isMobile && isNavHidden ? 54 : 0;

  return (
    <AnimatePresence>
      {/* Mobile: centered pill above the bottom nav (or a page's own sticky bar) */}
      <motion.div
        key="floating-cart-bar"
        initial={{ y: 80, opacity: 0, scale: 0.9 }}
        animate={{ y: targetY, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        style={{ bottom: 70 + raiseBy }}
        className="fixed left-1/2 -translate-x-1/2 z-[999] pointer-events-auto sm:hidden w-[220px]"
      >
        <button
          onClick={onCartOpen}
          className="w-full bg-[#0C831F] hover:bg-emerald-800 text-white rounded-[26px] shadow-xl px-2.5 py-1.5 flex items-center justify-between border border-white/20 active:scale-95 transition-all duration-200 cursor-pointer group"
        >
          {/* First Product Thumbnail / Bag Icon */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/30 shrink-0">
            {firstImg ? (
              <img src={firstImg} alt="cart item" className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={16} className="text-[#0C831F]" />
            )}
          </div>

          {/* Title & Count / Total */}
          <div className="flex flex-col text-left leading-tight mx-2 min-w-0 flex-1">
            <span className="text-[12.5px] font-extrabold text-white tracking-tight truncate">
              View cart
            </span>
            <span className="text-[10px] font-semibold text-white/80 truncate">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} · ₹{cartSubtotal.toFixed(0)}
            </span>
          </div>

          {/* Right Arrow Badge */}
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
            <ChevronRight size={14} className="text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </motion.div>

      {/* Desktop: floating card, bottom-right of the viewport */}
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="fixed bottom-6 right-6 z-[999] pointer-events-auto hidden sm:block w-[260px]"
      >
        <button
          onClick={onCartOpen}
          className="w-full bg-[#0C831F] hover:bg-emerald-800 text-white rounded-2xl shadow-xl px-3.5 py-3 flex items-center justify-between border border-white/20 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/30 shrink-0">
            {firstImg ? (
              <img src={firstImg} alt="cart item" className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag size={18} className="text-[#0C831F]" />
            )}
          </div>

          <div className="flex flex-col text-left leading-tight mx-3 min-w-0 flex-1">
            <span className="text-sm font-extrabold text-white tracking-tight truncate">
              View cart
            </span>
            <span className="text-xs font-semibold text-white/80 truncate">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} · ₹{cartSubtotal.toFixed(0)}
            </span>
          </div>

          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
            <ChevronRight size={16} className="text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
