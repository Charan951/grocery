import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ShoppingBag, Package, FolderTree, Award, Boxes, Warehouse, 
  Users, Truck, UserCheck, Ticket, Tag, Megaphone, Layers, DollarSign, FileText, 
  LineChart, Star, LifeBuoy, Bell, Settings, ShieldAlert, ChevronLeft, ChevronRight, 
  Search, Sun, Moon, LogOut, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';

import { useCMS } from '../context/CMSContext';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { name: 'Products', path: '/admin/products', icon: Package },
  { name: 'Categories', path: '/admin/categories', icon: FolderTree },
  { name: 'Inventory', path: '/admin/inventory', icon: Boxes },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Delivery Partners', path: '/admin/delivery', icon: Truck },
  { name: 'Employees', path: '/admin/employees', icon: UserCheck },
  { name: 'CMS Pages', path: '/admin/cms', icon: Layers },
  { name: 'Finance', path: '/admin/finance', icon: DollarSign },
  { name: 'Analytics', path: '/admin/analytics', icon: LineChart },
  { name: 'Reviews', path: '/admin/reviews', icon: Star },
  { name: 'Support', path: '/admin/support', icon: LifeBuoy },
  { name: 'Notifications', path: '/admin/notifications', icon: Bell },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert }
];

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample notifications
  const notifications = [
    { id: 1, title: 'Low Stock Alert', body: 'Organic Avocados stock is below threshold (4 units).', type: 'warning', time: '10m ago' },
    { id: 2, title: 'New Order Received', body: 'Order ORD-74912 has been placed.', type: 'info', time: '30m ago' },
    { id: 3, title: 'Server Status Check', body: 'Daily automated backup completed successfully.', type: 'success', time: '1h ago' }
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of the admin panel?')) {
      onLogout();
      navigate('/admin');
    }
  };


  return (
    <div className="min-h-screen bg-admin-paper flex font-admin-body text-admin-text">
      {/* SIDEBAR — control tower */}
      <aside
        className={`bg-admin-ink flex flex-col transition-all duration-300 z-30 sticky top-0 h-screen ${collapsed ? 'w-[72px]' : 'w-[248px]'}`}
      >
        {/* LOGO AREA */}
        <div className="h-[72px] flex items-center justify-between px-4 border-b border-admin-ink-line">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded bg-admin-green flex items-center justify-center text-white font-admin-display font-bold text-xs">F</div>
              <div>
                <div className="font-admin-display font-bold text-[11px] tracking-wide text-white leading-none">FRESHCART</div>
                <div className="font-admin-mono text-[9px] font-medium text-white/40 tracking-[0.12em] uppercase mt-1">Ops Console</div>
              </div>
            </motion.div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded bg-admin-green flex items-center justify-center text-white font-admin-display font-bold text-xs mx-auto">F</div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded text-white/40 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer hidden md:block transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* SIDEBAR SCROLLABLE LINK LIST */}
        <nav className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-0.5 no-scrollbar">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[12px] font-medium transition-all ${
                  isActive
                    ? 'bg-admin-ink-soft text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                }`}
                title={collapsed ? item.name : undefined}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r bg-admin-green" />}
                <Icon size={16} className={isActive ? 'text-admin-green' : 'text-white/40'} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-2.5 border-t border-admin-ink-line">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[11px] font-semibold text-admin-red bg-admin-red/10 hover:bg-admin-red/15 cursor-pointer transition-colors"
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* HEADER */}
        <header className="h-[72px] sticky top-0 z-20 bg-admin-paper/95 backdrop-blur-sm border-b border-admin-ledger-line flex items-center justify-between px-6">
          {/* Breadcrumbs / Page Title */}
          <div className="flex items-center gap-2 font-admin-mono">
            <span className="text-[11px] font-medium text-admin-text-faint uppercase tracking-wide">Enterprise</span>
            <span className="text-admin-text-faint">/</span>
            <span className="text-[11px] font-semibold text-admin-text uppercase tracking-wide">
              {sidebarItems.find(item => item.path === location.pathname)?.name || 'Control Panel'}
            </span>
          </div>

          {/* Search / Tool Bar */}
          <div className="flex items-center gap-3">
            {/* Global Search Bar */}
            <div className="relative max-w-[260px] hidden sm:block">
              <Search className="absolute left-3 top-2.5 text-admin-text-faint" size={14} />
              <input
                type="text"
                placeholder="Search orders, SKUs, customers…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-admin-ledger-line rounded-md text-[12px] bg-admin-surface focus:outline-none focus:border-admin-green text-admin-text font-admin-body font-medium placeholder:text-admin-text-faint"
              />
            </div>

            {/* Notification center */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-md border border-admin-ledger-line text-admin-text-muted hover:text-admin-text bg-admin-surface cursor-pointer relative transition-colors"
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-admin-red" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-[320px] bg-admin-surface border border-admin-ledger-line rounded-lg p-3.5 shadow-lg z-50 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-admin-ledger-line pb-2">
                        <span className="font-admin-display font-semibold text-[12px] text-admin-text">Alerts</span>
                        <span className="font-admin-mono text-[10px] text-admin-green font-semibold cursor-pointer hover:underline uppercase tracking-wide">Mark all read</span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto no-scrollbar">
                        {notifications.map(n => (
                          <div key={n.id} className="p-2.5 rounded-md bg-admin-paper border border-admin-ledger-line flex items-start gap-2.5 text-[11px] leading-relaxed">
                            {n.type === 'warning' && <AlertTriangle className="text-admin-amber mt-0.5 shrink-0" size={14} />}
                            {n.type === 'success' && <CheckCircle2 className="text-admin-green mt-0.5 shrink-0" size={14} />}
                            {n.type === 'info' && <Info className="text-admin-blue mt-0.5 shrink-0" size={14} />}
                            <div className="flex-1">
                              <div className="font-semibold text-admin-text">{n.title}</div>
                              <div className="text-admin-text-muted font-medium">{n.body}</div>
                              <div className="font-admin-mono text-[9px] text-admin-text-faint font-medium mt-1 uppercase tracking-wide">{n.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Trigger */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-md border border-admin-ledger-line overflow-hidden cursor-pointer"
              >
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop" alt="avatar" />
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
                        <div className="font-semibold text-[12px] text-admin-text">Rohan Murthy</div>
                        <div className="font-admin-mono text-[10px] text-admin-text-muted">admin@freshcart.com</div>
                      </div>
                      <div className="p-1 flex flex-col gap-0.5">
                        <Link
                          to="/admin/settings"
                          onClick={() => setProfileOpen(false)}
                          className="px-3 py-2 rounded-md text-[12px] font-medium text-admin-text-muted hover:text-admin-text hover:bg-admin-paper flex items-center gap-2.5"
                        >
                          <Settings size={14} /> Settings
                        </Link>
                        <button
                          onClick={() => { setProfileOpen(false); handleLogout(); }}
                          className="w-full text-left px-3 py-2 rounded-md text-[12px] font-semibold text-admin-red hover:bg-admin-red/5 flex items-center gap-2.5 cursor-pointer"
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

        {/* VIEW PORT CONTENT */}
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
