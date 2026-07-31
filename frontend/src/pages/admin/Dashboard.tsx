import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, IndianRupee, ShoppingBag, Percent, Users2, 
  RotateCcw, Activity, HardDrive, CreditCard, ChevronRight, PackageOpen, Plus, 
  Ticket, ArrowRight, Eye, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

export const Dashboard: React.FC = () => {
  const { products, activeHub, warehouses } = useCMS();
  const activeWarehouse = warehouses.find(w => w.id === activeHub);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    aov: 0,
    conversionRate: 0,
    customerGrowth: 0,
    returningCustomers: 0
  });

  const [system, setSystem] = useState({
    server: 'Offline',
    database: 'Disconnected',
    gateway: 'Offline',
    latency: 'N/A'
  });

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const API_URL = 'http://localhost:5000/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchDashboardData = async () => {
    setIsSyncing(true);
    try {
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/dashboard/stats`, { headers: getAuthHeader() });
      const statsData = await statsRes.json();
      if (statsData.success && statsData.stats) {
        const s = statsData.stats;
        setStats({
          todayRevenue: s.todayRevenue || 0,
          todayOrders: s.todayOrders || 0,
          monthlyRevenue: s.monthlyRevenue || 0,
          yearlyRevenue: s.yearlyRevenue || 0,
          aov: s.averageOrderValue || 0,
          conversionRate: s.conversionRate || 0,
          customerGrowth: s.customerGrowth || 0,
          returningCustomers: s.returningCustomers || 0
        });
      }

      // Fetch system status
      const statusRes = await fetch(`${API_URL}/dashboard/status`, { headers: getAuthHeader() });
      const statusData = await statusRes.json();
      if (statusData.success) {
        setSystem({
          server: statusData.server || 'Online',
          database: statusData.database || 'Connected',
          gateway: statusData.paymentGateway || 'Active',
          latency: '12ms'
        });
      }

      // Fetch pending orders
      const ordersRes = await fetch(`${API_URL}/orders`, { headers: getAuthHeader() });
      const ordersData = await ordersRes.json();
      if (ordersData.success && ordersData.orders) {
        const pending = ordersData.orders
          .filter((o: any) => o.status === 'Pending')
          .slice(0, 5)
          .map((o: any) => ({
            id: o.orderId,
            name: o.customerName || 'Anonymous',
            amount: o.grandTotal,
            time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: o.status
          }));
        setPendingOrders(pending);
      }
    } catch (err) {
      console.warn('Dashboard API sync failed. Using local state.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [products]);

  const handleRefreshStats = () => {
    fetchDashboardData();
  };

  const lowStockItems = products
    .filter(p => {
      const q = typeof p.stock === 'number' ? p.stock : (p.stock?.quantity ?? 50);
      return q < 15;
    })
    .slice(0, 3)
    .map(p => ({
      id: p.id,
      name: p.name,
      stock: typeof p.stock === 'number' ? p.stock : (p.stock?.quantity ?? 0),
      imageUrl: p.imageUrl || (p.images && p.images[0]) || ''
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Card & Real-time Sync */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Welcome, Rohan Murthy</h1>
          <p className="text-xs text-text-secondary font-medium">Enterprise administrator • Central Management</p>
        </div>
        <button 
          onClick={handleRefreshStats}
          className="flex items-center gap-2 px-4 py-2 border border-divider rounded-full text-xs font-bold bg-surface hover:bg-background shadow-sm hover:text-primary transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin text-primary' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
        </button>
      </div>

      {/* 2x4 Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Revenue */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Today's Revenue</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <IndianRupee size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">₹{stats.todayRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>+18.4% from yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Orders */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Today's Orders</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">{stats.todayOrders}</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>+4 new in last hour</span>
            </div>
          </div>
        </div>

        {/* Card 3: Monthly Revenue */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Monthly Revenue</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">₹{stats.monthlyRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>+12.2% vs target</span>
            </div>
          </div>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Avg. Order Value</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Percent size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">₹{stats.aov}</div>
            <div className="flex items-center gap-1 text-[10px] text-error font-bold mt-1">
              <TrendingDown size={12} />
              <span>-1.2% this week</span>
            </div>
          </div>
        </div>

        {/* Card 5: Conversion Rate */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Conversion Rate</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Activity size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">{stats.conversionRate}%</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>+0.2% organic lift</span>
            </div>
          </div>
        </div>

        {/* Card 6: Customer Growth */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Customer Growth</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Users2 size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">+{stats.customerGrowth}%</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>+1,420 new registrations</span>
            </div>
          </div>
        </div>

        {/* Card 7: Returning Customers */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Retention Rate</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <RotateCcw size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">{stats.returningCustomers}%</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>+2.1% VIP loyalty lift</span>
            </div>
          </div>
        </div>

        {/* Card 8: Yearly Revenue */}
        <div className="bg-surface border border-divider p-5 rounded-[28px] shadow-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Yearly Revenue</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <IndianRupee size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-extrabold text-text-primary">₹{(stats.yearlyRevenue / 10000000).toFixed(2)} Cr</div>
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <TrendingUp size={12} />
              <span>National retail forecast met</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* SVG Revenue Chart */}
        <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-text-primary">Revenue Trend</h2>
              <p className="text-[10px] text-text-secondary font-medium">Real-time daily transaction volume</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">Weekly View</span>
          </div>

          <div className="h-[200px] w-full flex items-end relative pt-4">
            {/* Custom SVG Chart Grid & Path */}
            <svg className="w-full h-full" viewBox="0 0 600 200">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="600" y2="50" stroke="#ECECEC" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#ECECEC" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="#ECECEC" strokeWidth="0.5" strokeDasharray="4 4" />

              {/* Area Path */}
              <path 
                d="M0,170 C80,140 120,90 200,110 C280,130 320,60 400,80 C480,100 520,30 600,45 L600,200 L0,200 Z" 
                fill="url(#chartGradient)"
              />

              {/* Line Path */}
              <path 
                d="M0,170 C80,140 120,90 200,110 C280,130 320,60 400,80 C480,100 520,30 600,45" 
                fill="none" 
                stroke="#4CAF50" 
                strokeWidth="2.5" 
              />
            </svg>
            <div className="absolute bottom-0 w-full flex justify-between px-1 text-[9px] font-bold text-text-secondary pt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* Category donut distribution chart */}
        <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-sm text-text-primary">Top Category Shares</h2>
            <p className="text-[10px] text-text-secondary font-medium">Sales breakdown by product line</p>
          </div>

          <div className="flex justify-center items-center py-2">
            {/* Visual HTML Ring representing Shares */}
            <div className="relative w-32 h-32 rounded-full border-[14px] border-primary/10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[14px] border-primary border-t-transparent border-l-transparent" />
              <div className="text-center">
                <span className="text-xl font-extrabold text-text-primary">35%</span>
                <div className="text-[8px] font-bold text-text-secondary uppercase">Organic</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-text-secondary">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Organic (35%)</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary" /> Veg (25%)</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> Fruits (20%)</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Dairy (15%)</div>
          </div>
        </div>
      </div>

      {/* Status, Pending Orders & Low Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: System diagnostics */}
        <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-4">
          <h3 className="font-extrabold text-xs text-text-primary border-b border-divider pb-2 uppercase">System Health</h3>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium flex items-center gap-2">
                <Activity size={14} className="text-primary" /> Web API Engine
              </span>
              <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-full text-[10px]">Online</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium flex items-center gap-2">
                <HardDrive size={14} className="text-primary" /> MongoDB Atlas
              </span>
              <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-full text-[10px]">{system.database}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium flex items-center gap-2">
                <CreditCard size={14} className="text-primary" /> Razorpay PG
              </span>
              <span className="font-bold text-success bg-success/10 px-2 py-0.5 rounded-full text-[10px]">{system.gateway}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium flex items-center gap-2">
                <Activity size={14} className="text-primary" /> Latency Rate
              </span>
              <span className="font-bold text-text-primary text-[10px]">{system.latency}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Low Stock Alerts */}
        <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-4">
          <h3 className="font-extrabold text-xs text-text-primary border-b border-divider pb-2 uppercase flex items-center gap-1.5">
            <AlertTriangle className="text-warning" size={14} /> Low Stock Alerts
          </h3>
          <div className="flex flex-col gap-2.5">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs bg-background p-2 rounded-xl border border-divider">
                <div className="flex items-center gap-2">
                  <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded bg-white object-contain border border-divider" />
                  <span className="font-bold truncate max-w-[120px] text-text-primary">{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-error bg-error/10 px-2.5 py-1 rounded-full">{item.stock} left</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Recent Pending Orders */}
        <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-4">
          <h3 className="font-extrabold text-xs text-text-primary border-b border-divider pb-2 uppercase">Recent Orders</h3>
          <div className="flex flex-col gap-2.5">
            {pendingOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-text-primary">{order.id}</div>
                  <div className="text-[10px] text-text-secondary">{order.name} • {order.time}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-text-primary">₹{order.amount}</div>
                  <span className="text-[9px] font-bold text-warning uppercase">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="bg-surface border border-divider p-6 rounded-[28px] shadow-card flex flex-col gap-4">
        <h3 className="font-extrabold text-xs text-text-primary uppercase">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button className="flex items-center gap-2 p-3 bg-background border border-divider rounded-xl hover:bg-primary/5 transition-all text-xs font-bold text-text-primary cursor-pointer hover:border-primary/20">
            <Plus size={16} className="text-primary" /> Add Product
          </button>
          <button className="flex items-center gap-2 p-3 bg-background border border-divider rounded-xl hover:bg-primary/5 transition-all text-xs font-bold text-text-primary cursor-pointer hover:border-primary/20">
            <Ticket size={16} className="text-primary" /> Create Coupon
          </button>
          <button className="flex items-center gap-2 p-3 bg-background border border-divider rounded-xl hover:bg-primary/5 transition-all text-xs font-bold text-text-primary cursor-pointer hover:border-primary/20">
            <RotateCcw size={16} className="text-primary" /> Issue Refund
          </button>
          <button className="flex items-center gap-2 p-3 bg-background border border-divider rounded-xl hover:bg-primary/5 transition-all text-xs font-bold text-text-primary cursor-pointer hover:border-primary/20">
            <Activity size={16} className="text-primary" /> Server Status
          </button>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
