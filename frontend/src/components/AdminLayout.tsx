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
  { name: 'Warehouses', path: '/admin/warehouses', icon: Warehouse },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Delivery Partners', path: '/admin/delivery', icon: Truck },
  { name: 'Employees', path: '/admin/employees', icon: UserCheck },
  { name: 'Coupons', path: '/admin/coupons', icon: Ticket },
  { name: 'Offers', path: '/admin/offers', icon: Tag },
  { name: 'Marketing', path: '/admin/marketing', icon: Megaphone },
  { name: 'CMS Pages', path: '/admin/cms', icon: Layers },
  { name: 'Finance', path: '/admin/finance', icon: DollarSign },
  { name: 'Reports', path: '/admin/reports', icon: FileText },
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
  const { activeHub, setActiveHub, warehouses } = useCMS();
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
    <div className="min-h-screen bg-background flex text-text-primary">
      {/* SIDEBAR */}
      <aside 
        className={`bg-surface border-r border-divider flex flex-col transition-all duration-300 z-30 sticky top-0 h-screen ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* LOGO AREA */}
        <div className="h-[80px] flex items-center justify-between px-4 border-b border-divider">
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-sm">F</div>
              <div>
                <div className="font-extrabold text-xs tracking-wider text-text-primary">FRESHCART</div>
                <div className="text-[10px] font-bold text-primary tracking-widest uppercase">Admin Panel</div>
              </div>
            </motion.div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-sm mx-auto">F</div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg border border-divider text-text-secondary hover:text-text-primary bg-background hover:bg-surface cursor-pointer hidden md:block"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>



        {/* SIDEBAR SCROLLABLE LINK LIST */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 custom-scrollbar">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.name} 
                to={item.path}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-primary/10 border border-primary/20 text-primary shadow-sm' 
                    : 'text-text-primary hover:bg-background/80 hover:text-text-primary'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={18} className={isActive ? 'text-primary' : 'text-text-secondary'} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="p-3 border-t border-divider">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-error border border-error/20 bg-error/5 hover:bg-error/10 cursor-pointer"
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* HEADER */}
        <header className="h-[80px] sticky top-0 z-20 glass-effect border-b border-divider flex items-center justify-between px-6">
          {/* Breadcrumbs / Page Title */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">Enterprise</span>
            <span className="text-text-tertiary">/</span>
            <span className="text-xs font-bold text-text-primary">
              {sidebarItems.find(item => item.path === location.pathname)?.name || 'Control Panel'}
            </span>
          </div>

          {/* Search / Tool Bar */}
          <div className="flex items-center gap-4">
            {/* Global Search Bar */}
            <div className="relative max-w-[280px] hidden sm:block">
              <Search className="absolute left-3 top-2.5 text-text-secondary" size={15} />
              <input 
                type="text" 
                placeholder="Global command search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-divider rounded-full text-xs bg-background focus:outline-none focus:border-primary text-text-primary font-medium"
              />
            </div>

            {/* Notification center */}
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-full border border-divider text-text-secondary hover:text-text-primary bg-surface cursor-pointer shadow-sm relative"
              >
                <Bell size={15} />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-error border border-white" />
              </button>
              
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="absolute right-0 mt-2.5 w-[320px] bg-surface border border-divider rounded-2xl p-4 shadow-premium z-50 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between border-b border-divider pb-2">
                        <span className="font-bold text-xs">Alert Notifications</span>
                        <span className="text-[10px] text-primary font-bold cursor-pointer hover:underline">Mark all read</span>
                      </div>
                      <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id} className="p-2.5 rounded-xl bg-background border border-divider flex items-start gap-2.5 text-[11px] leading-relaxed">
                            {n.type === 'warning' && <AlertTriangle className="text-warning mt-0.5" size={14} />}
                            {n.type === 'success' && <CheckCircle2 className="text-success mt-0.5" size={14} />}
                            {n.type === 'info' && <Info className="text-primary mt-0.5" size={14} />}
                            <div className="flex-1">
                              <div className="font-bold text-text-primary">{n.title}</div>
                              <div className="text-text-secondary font-medium">{n.body}</div>
                              <div className="text-[9px] text-text-tertiary font-semibold mt-1">{n.time}</div>
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
                className="w-9 h-9 rounded-full border border-divider overflow-hidden cursor-pointer shadow-sm"
              >
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop" alt="avatar" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="absolute right-0 mt-2.5 w-[200px] bg-surface border border-divider rounded-2xl p-2 shadow-premium z-50"
                    >
                      <div className="px-3.5 py-2.5 border-b border-divider">
                        <div className="font-bold text-xs text-text-primary">Rohan Murthy</div>
                        <div className="text-[10px] text-text-secondary">admin@freshcart.com</div>
                      </div>
                      <div className="p-1 flex flex-col gap-0.5">
                        <Link 
                          to="/admin/settings" 
                          onClick={() => setProfileOpen(false)} 
                          className="px-3.5 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-background flex items-center gap-2.5"
                        >
                          <Settings size={14} /> Settings
                        </Link>
                        <button 
                          onClick={() => { setProfileOpen(false); handleLogout(); }} 
                          className="w-full text-left px-3.5 py-2 rounded-lg text-xs font-bold text-error hover:bg-error/5 flex items-center gap-2.5 cursor-pointer"
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
