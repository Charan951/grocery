import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, History, Grid3x3 } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Home', path: '/', icon: Home, match: (p: string) => p === '/' },
  { label: 'Order Again', path: '/orders', icon: History, match: (p: string) => p.startsWith('/orders') || p.startsWith('/account/orders') },
  { label: 'Categories', path: '/categories', icon: Grid3x3, match: (p: string) => p.startsWith('/categories') || p.startsWith('/products') },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide on scroll down, reveal on scroll up — rAF-throttled so it does at
  // most one cheap read per frame (raw scroll events fire far more often).
  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const diff = y - lastScrollY.current;
        if (diff > 8 && y > 60) setHidden(true);
        else if (diff < -8 || y <= 20) setHidden(false);
        lastScrollY.current = y;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Always reset visibility on route change
  useEffect(() => {
    setHidden(false);
  }, [location.pathname]);

  // Hide BottomNav on product details and subcategories routes
  if (location.pathname.startsWith('/product/') || location.pathname.startsWith('/products')) {
    return null;
  }

  return (
    <motion.nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[998] bg-surface border-t border-divider shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      initial={false}
      animate={{ y: hidden ? '100%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="flex items-center justify-around px-2 py-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isActive ? 'bg-primary/10 rounded-full px-4 py-2' : 'p-2'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-primary' : 'text-text-tertiary'}
              />
              {isActive && (
                <span className="text-xs font-black text-primary leading-none whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};
