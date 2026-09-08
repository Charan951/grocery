import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { House, Grid3x3, Package, CircleUser } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  {
    label: 'Categories',
    path: '/categories',
    icon: Grid3x3,
    match: (p: string) => p.startsWith('/categories') || p.startsWith('/category/')
  },
  {
    label: 'Home',
    path: '/',
    icon: House,
    match: (p: string) => p === '/'
  },
  {
    label: 'Orders',
    path: '/orders',
    icon: Package,
    match: (p: string) => p.startsWith('/orders') || p.startsWith('/account/orders') || p.startsWith('/track/')
  },
  {
    label: 'Account',
    path: '/profile',
    icon: CircleUser,
    match: (p: string) => p.startsWith('/profile') || p.startsWith('/account/profile') || p.startsWith('/account/edit')
  },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide on scroll down, reveal on scroll up
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

  // Hide BottomNav on detail routes (PDP, Products catalog, Checkout, Locations)
  if (
    location.pathname.startsWith('/product/') ||
    location.pathname.startsWith('/prn/') ||
    location.pathname.startsWith('/products') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/locations') ||
    location.pathname.startsWith('/saved-addresses') ||
    location.pathname.startsWith('/account/addresses')
  ) {
    return null;
  }

  return (
    <motion.nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[998] bg-white border-t border-gray-200/80 shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
      initial={false}
      animate={{ y: hidden ? '100%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="grid grid-cols-4 items-center px-1 py-1.5 min-h-[58px]">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center py-1 px-0.5 cursor-pointer transition-colors border-none bg-transparent"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                fill="none"
                className="text-gray-700"
              />
              <span
                className={`text-[11px] leading-tight mt-1 transition-[font-weight] ${
                  isActive ? 'font-extrabold text-gray-900' : 'font-medium text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};
