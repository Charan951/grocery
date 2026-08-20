import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, History, Grid3x3, CircleUserRound } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', path: '/', icon: Home, match: (p: string) => p === '/' },
  { label: 'Order Again', path: '/orders', icon: History, match: (p: string) => p.startsWith('/orders') || p.startsWith('/account/orders') },
  { label: 'Categories', path: '/categories', icon: Grid3x3, match: (p: string) => p.startsWith('/categories') || p.startsWith('/products') },
  { label: 'Profile', path: '/profile', icon: CircleUserRound, match: (p: string) => p.startsWith('/profile') || p.startsWith('/account/profile') },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[998] bg-surface border-t border-divider"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      <div className="flex items-center justify-around px-2 py-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
    </nav>
  );
};
