import React, { useState, useEffect, useRef } from 'react';
import { useCartWishlist } from '../context/CartWishlistContext';
import { ShoppingCart, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingCartBarProps {
  onCartOpen: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onCartOpen }) => {
  const { cartCount } = useCartWishlist();
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-move cart button down when bottom bar hides on scroll down, move back up when bottom bar reveals
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

  const targetY = isMobile && isNavHidden ? 68 : 0;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 80, opacity: 0, scale: 0.9 }}
        animate={{ y: targetY, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="fcb-pos fixed left-1/2 -translate-x-1/2 z-[999] pointer-events-auto"
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
