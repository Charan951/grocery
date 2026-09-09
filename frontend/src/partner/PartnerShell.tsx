import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Wallet, UserRound, Bell, Power, Loader2 } from 'lucide-react';
import { usePartner } from './PartnerContext';
import { SwipeOnline } from './SwipeOnline';

/**
 * Phone-first rider shell — no sidebar, at any width. A centred app column
 * (top bar · scrollable content · bottom tab bar) that reads the same on a
 * handset and on a desktop browser, matching the Flutter delivery app.
 */

const tabs = [
  { to: '/partner/dashboard', label: 'Home', Icon: Home },
  { to: '/partner/orders', label: 'Orders', Icon: Package },
  { to: '/partner/earnings', label: 'Earnings', Icon: Wallet },
  { to: '/partner/profile', label: 'Profile', Icon: UserRound },
];

interface Props {
  children: React.ReactNode;
  onLogout?: () => void;
}

const titleFor = (path: string) => {
  if (path.startsWith('/partner/orders/')) return 'Delivery';
  const t = tabs.find((x) => path === x.to || path.startsWith(x.to + '/'));
  if (t) return t.label;
  if (path.startsWith('/partner/notifications')) return 'Notifications';
  return 'Rider';
};

export const PartnerShell: React.FC<Props> = ({ children }) => {
  const { partner, loading, error, unreadNotifications, setOnline } = usePartner();
  const navigate = useNavigate();
  const location = useLocation();
  const [toggling, setToggling] = React.useState(false);

  const online = !!partner?.isOnline;
  const isOrderDetail = location.pathname.startsWith('/partner/orders/');
  const title = titleFor(location.pathname);

  const toggleOnline = async () => {
    if (!partner || toggling) return;
    setToggling(true);
    try {
      await setOnline(!partner.isOnline);
    } catch (e: any) {
      alert(e.message || 'Could not change your status');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-paper font-admin-body text-admin-text flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-admin-paper flex flex-col relative border-x border-admin-ledger-line">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-admin-surface/95 backdrop-blur-sm border-b border-admin-ledger-line flex items-center justify-between px-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded bg-admin-green text-white font-admin-display font-bold text-[11px] flex items-center justify-center shrink-0">
              F
            </span>
            <span className="font-admin-display font-semibold text-[14px] text-admin-text truncate">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleOnline}
              disabled={toggling || !partner}
              className={`flex items-center gap-1.5 font-admin-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-md transition-all disabled:opacity-50 cursor-pointer ${
                online
                  ? 'bg-admin-green-soft text-admin-green'
                  : 'bg-admin-ink text-white'
              }`}
            >
              {toggling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Power size={12} />
              )}
              {online ? 'Online' : 'Go online'}
            </button>

            <button
              onClick={() => navigate('/partner/notifications')}
              className="relative p-2 rounded-md text-admin-text-muted hover:text-admin-text hover:bg-admin-paper transition-colors"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-admin-red" />
              )}
            </button>

            <button
              onClick={() => navigate('/partner/profile')}
              className="w-7 h-7 rounded-md bg-admin-green text-white font-admin-display font-bold text-[11px] flex items-center justify-center shrink-0"
              aria-label="Profile"
            >
              {(partner?.name || 'P').slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Content */}
        <main
          className={`flex-1 px-4 py-4 ${isOrderDetail ? 'pb-8' : 'pb-32'}`}
        >
          {loading ? (
            <div className="flex items-center justify-center py-24 text-admin-text-faint">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-dashed border-admin-ledger-line py-14 text-center text-[13px] text-admin-red font-semibold">
              {error}
            </div>
          ) : (
            children
          )}
        </main>

        {/* Slide-to-go-online — sits above the tab bar, every route except order detail */}
        {!isOrderDetail && <SwipeOnline />}

        {/* Bottom tab bar */}
        {!isOrderDetail && (
          <nav className="fixed bottom-0 z-30 w-full max-w-[480px] h-14 bg-admin-surface border-t border-admin-ledger-line grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
            {tabs.map(({ to, label, Icon }) => {
              const active =
                location.pathname === to || location.pathname.startsWith(to + '/');
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`flex flex-col items-center justify-center gap-0.5 font-admin-mono text-[9px] font-bold uppercase tracking-[0.08em] transition-colors ${
                    active ? 'text-admin-green' : 'text-admin-text-faint'
                  }`}
                >
                  <Icon size={19} />
                  {label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
};
