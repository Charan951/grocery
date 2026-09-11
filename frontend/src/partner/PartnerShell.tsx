import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  Package,
  Wallet,
  UserRound,
  Bell,
  Power,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
} from 'lucide-react';
import { usePartner } from './PartnerContext';

/**
 * Delivery-partner console shell — same fixed sidebar / topbar pattern as
 * AdminLayout (see components/AdminLayout.tsx), so the two staff consoles
 * read as one product on desktop.
 */

const navItems = [
  { name: 'Home', path: '/partner/dashboard', icon: Home },
  { name: 'Orders', path: '/partner/orders', icon: Package },
  { name: 'Earnings', path: '/partner/earnings', icon: Wallet },
  { name: 'Profile', path: '/partner/profile', icon: UserRound },
];

interface Props {
  children: React.ReactNode;
  onLogout?: () => void;
}

export const PartnerShell: React.FC<Props> = ({ children, onLogout }) => {
  const { partner, loading, error, unreadNotifications, setOnline } = usePartner();
  const navigate = useNavigate();
  const location = useLocation();
  const [toggling, setToggling] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const online = !!partner?.isOnline;

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

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      onLogout?.();
      navigate('/partner/login');
    }
  };

  const activeName =
    navItems.find(
      (i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'),
    )?.name ||
    (location.pathname.startsWith('/partner/orders/') ? 'Delivery' : 'Console');

  return (
    <div className="admin-shell min-h-screen bg-admin-paper flex font-admin-body text-admin-text">
      {/* SIDEBAR */}
      <aside
        className={`bg-admin-ink flex flex-col transition-all duration-300 z-30 fixed top-0 left-0 bottom-0 h-screen shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-[248px]'
        }`}
      >
        <div className="h-[72px] flex items-center justify-between px-4 border-b border-admin-ink-line">
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <div className="font-admin-display font-bold text-xs tracking-wide text-white leading-none truncate">
                FRESHCART
              </div>
              <div className="font-admin-mono text-[11px] font-medium text-admin-accent tracking-[0.12em] uppercase mt-1">
                Delivery
              </div>
            </motion.div>
          )}
          {collapsed && (
            <span className="w-8 h-8 rounded-md bg-admin-accent text-admin-ink font-admin-display font-bold text-[13px] flex items-center justify-center mx-auto">
              F
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded text-white/40 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer hidden md:block transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-0.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-admin-accent text-admin-ink shadow-[0_2px_10px_-2px_rgba(27,205,57,0.5)]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={16} className={isActive ? 'text-admin-ink' : 'text-white/40'} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2.5 border-t border-admin-ink-line flex flex-col gap-1.5">
          <button
            onClick={toggleOnline}
            disabled={toggling || !partner}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-bold uppercase tracking-[0.08em] transition-all disabled:opacity-50 cursor-pointer ${
              online ? 'bg-admin-green-soft text-admin-green' : 'bg-white/10 text-white'
            }`}
          >
            {toggling ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
            {!collapsed && (online ? 'Online' : 'Go online')}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold text-admin-red bg-admin-red/10 hover:bg-admin-red/15 cursor-pointer transition-colors"
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div
        className={`flex-1 flex flex-col overflow-x-hidden min-h-screen min-w-0 transition-all duration-300 ${
          collapsed ? 'ml-[72px]' : 'ml-[248px]'
        }`}
      >
        {/* HEADER */}
        <header className="h-[72px] sticky top-0 z-20 bg-admin-paper/95 backdrop-blur-sm border-b border-admin-ledger-line flex items-center justify-between px-6">
          <div className="flex items-center gap-2 font-admin-mono">
            <span className="text-xs font-medium text-admin-text-faint uppercase tracking-wide">
              Delivery Partner
            </span>
            <span className="text-admin-text-faint">/</span>
            <span className="text-xs font-semibold text-admin-text uppercase tracking-wide">
              {activeName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 font-admin-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-md ${
                online ? 'bg-admin-green-soft text-admin-green' : 'bg-admin-paper text-admin-text-faint border border-admin-ledger-line'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-admin-green' : 'bg-admin-text-faint'}`} />
              {online ? 'Online · accepting offers' : 'Offline'}
            </span>

            <button
              onClick={() => navigate('/partner/notifications')}
              className="p-2 rounded-md border border-admin-ledger-line text-admin-text-muted hover:text-admin-text bg-admin-surface cursor-pointer relative transition-colors"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-admin-red" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="w-8 h-8 rounded-md bg-admin-accent text-admin-ink font-admin-display font-bold text-[12px] flex items-center justify-center cursor-pointer"
                aria-label="Profile"
              >
                {(partner?.name || 'P').slice(0, 1).toUpperCase()}
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-[200px] bg-admin-surface border border-admin-ledger-line rounded-lg p-1.5 shadow-lg z-50"
                    >
                      <div className="px-3 py-2.5 border-b border-admin-ledger-line">
                        <div className="font-semibold text-xs text-admin-text truncate">
                          {partner?.name || 'Partner'}
                        </div>
                        <div className="font-admin-mono text-[11px] text-admin-text-muted truncate">
                          {partner?.phone || ''}
                        </div>
                      </div>
                      <div className="p-1 flex flex-col gap-0.5">
                        <Link
                          to="/partner/profile"
                          onClick={() => setProfileOpen(false)}
                          className="px-3 py-2 rounded-md text-xs font-medium text-admin-text-muted hover:text-admin-text hover:bg-admin-paper flex items-center gap-2.5"
                        >
                          <Settings size={14} /> Profile
                        </Link>
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-xs font-semibold text-admin-red hover:bg-admin-red/5 flex items-center gap-2.5 cursor-pointer"
                        >
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* VIEWPORT CONTENT */}
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] mx-auto w-full">
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
      </div>
    </div>
  );
};
