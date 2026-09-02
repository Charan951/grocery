import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, History, Grid3x3, CircleUserRound } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Home', path: '/', icon: Home, match: (p: string) => p === '/' },
  { label: 'Order Again', path: '/orders', icon: History, match: (p: string) => p.startsWith('/orders') || p.startsWith('/account/orders') },
  { label: 'Categories', path: '/categories', icon: Grid3x3, match: (p: string) => p.startsWith('/categories') || p.startsWith('/products') },
  { label: 'Profile', path: '/profile', icon: CircleUserRound, match: (p: string) => p.startsWith('/profile') || p.startsWith('/account'), account: true },
];

const isSignedIn = () => {
  try { return !!localStorage.getItem('customer_user'); } catch { return false; }
};

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide bottom bar on scroll down, reveal on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;

      // Only hide when scrolling down past 60px threshold
      if (scrollDiff > 8 && currentScrollY > 60) {
        setHidden(true);
      } else if (scrollDiff < -8 || currentScrollY <= 20) {
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
              onClick={() => {
                if ((item as { account?: boolean }).account) {
                  // Signed in → open the account/profile; guest → open the sign-in modal.
                  if (isSignedIn()) navigate('/profile');
                  else window.dispatchEvent(new Event('freshcart:open-auth'));
                  return;
                }
                navigate(item.path);
              }}
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
