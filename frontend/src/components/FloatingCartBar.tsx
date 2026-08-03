import React from 'react';
import { useCartWishlist } from '../context/CartWishlistContext';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingCartBarProps {
  onCartOpen: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onCartOpen }) => {
  const { cartCount, cartSubtotal } = useCartWishlist();

  if (cartCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 80, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto"
      >
        <button
          onClick={onCartOpen}
          className="bg-[#e60067] hover:bg-pink-700 text-white font-extrabold px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 border border-white/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center">
            <ShoppingCart size={15} className="text-white" />
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="text-xs sm:text-sm font-black tracking-tight">
              Cart
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold opacity-90 mt-0.5">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <ChevronRight size={18} strokeWidth={3} className="text-white group-hover:translate-x-0.5 transition-transform ml-0.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
