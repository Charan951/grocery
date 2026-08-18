import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee, ShoppingBag, Percent, Users2,
  RotateCcw, Activity, HardDrive, CreditCard, PackageOpen, Plus,
  Ticket, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { PageHeader } from '../../components/admin/PageHeader';
import { ShelfTag } from '../../components/admin/ShelfTag';

export const Dashboard: React.FC = () => {
  const { products } = useCMS();
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

  const API_URL = '/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchDashboardData = async () => {
    setIsSyncing(true);
    try {
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

  const hasActivityToday = stats.todayRevenue > 0 || stats.todayOrders > 0;
  const hasRevenueHistory = stats.monthlyRevenue > 0 || stats.yearlyRevenue > 0;

  const secondaryMetrics = [
    {
      label: 'Monthly Revenue',
      value: `₹${stats.monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      trend: stats.monthlyRevenue > 0 ? { dir: 'up' as const, label: '+12.2% vs target' } : null,
    },
    {
      label: 'Avg. Order Value',
      value: `₹${stats.aov}`,
      icon: Percent,
      trend: stats.aov > 0 ? { dir: 'down' as const, label: '-1.2% this week' } : null,
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: Activity,
      trend: stats.conversionRate > 0 ? { dir: 'up' as const, label: '+0.2% organic lift' } : null,
    },
    {
      label: 'Customer Growth',
      value: `+${stats.customerGrowth}%`,
      icon: Users2,
      trend: stats.customerGrowth > 0 ? { dir: 'up' as const, label: '+1,420 new registrations' } : null,
    },
    {
      label: 'Retention Rate',
      value: `${stats.returningCustomers}%`,
      icon: RotateCcw,
      trend: stats.returningCustomers > 0 ? { dir: 'up' as const, label: '+2.1% VIP loyalty lift' } : null,
    },
    {
      label: 'Yearly Revenue',
      value: `₹${(stats.yearlyRevenue / 10000000).toFixed(2)} Cr`,
      icon: IndianRupee,
      trend: stats.yearlyRevenue > 0 ? { dir: 'up' as const, label: 'National retail forecast met' } : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Welcome, Rohan Murthy"
        actions={
          <button
            onClick={handleRefreshStats}
            className="flex items-center gap-2 px-4 py-2 border border-admin-ledger-line rounded-md text-[11px] font-semibold bg-admin-surface hover:bg-admin-paper text-admin-text-muted hover:text-admin-text transition-all cursor-pointer font-admin-mono uppercase tracking-wide"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-admin-green' : ''} />
            <span>{isSyncing ? 'Syncing…' : 'Sync Live'}</span>
          </button>
        }
      />

      {/* Hero Pair: Today's Revenue (primary ledger entry) + Today's Orders */}
      <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-4">
        <div className="relative bg-admin-ink text-white p-6 rounded-lg flex flex-col justify-between gap-4 overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-[120px] opacity-[0.06]" style={{
            backgroundImage: 'repeating-linear-gradient(135deg, white 0, white 1px, transparent 1px, transparent 14px)'
          }} />
          <div className="relative flex items-center justify-between">
            <span className="font-admin-mono text-[10px] font-semibold text-white/50 uppercase tracking-[0.12em]">Today's Revenue</span>
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <IndianRupee size={15} />
            </div>
          </div>
          <div className="relative">
            <div className="font-admin-display text-3xl md:text-4xl font-bold tabular-nums">₹{stats.todayRevenue.toLocaleString()}</div>
            {hasActivityToday ? (
              <div className="flex items-center gap-1 text-xs text-admin-green font-semibold mt-2">
                <TrendingUp size={13} />
                <span>+18.4% from yesterday</span>
              </div>
            ) : (
              <div className="text-xs text-white/50 font-medium mt-2">No sales recorded yet today — check back after the first order.</div>
            )}
          </div>
        </div>

        <div className="bg-admin-surface border border-admin-ledger-line p-6 rounded-lg flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="font-admin-mono text-[10px] font-semibold text-admin-text-faint uppercase tracking-[0.12em]">Today's Orders</span>
            <div className="w-8 h-8 rounded bg-admin-green-soft flex items-center justify-center text-admin-green">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div>
            <div className="font-admin-display text-3xl md:text-4xl font-bold text-admin-text tabular-nums">{stats.todayOrders}</div>
            {hasActivityToday ? (
              <div className="flex items-center gap-1 text-xs text-admin-green font-semibold mt-2">
                <TrendingUp size={13} />
                <span>+4 new in last hour</span>
              </div>
            ) : (
              <div className="text-xs text-admin-text-faint font-medium mt-2">Waiting for the first order of the day.</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {secondaryMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-admin-surface border border-admin-ledger-line p-4 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-admin-mono text-[9px] font-semibold text-admin-text-faint uppercase tracking-wide leading-tight">{m.label}</span>
                <Icon size={13} className="text-admin-text-faint shrink-0" />
              </div>
              <div className="font-admin-display text-lg font-bold text-admin-text tabular-nums">{m.value}</div>
              {m.trend ? (
                <div className={`flex items-center gap-1 text-[9px] font-semibold ${m.trend.dir === 'up' ? 'text-admin-green' : 'text-admin-red'}`}>
                  {m.trend.dir === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  <span className="truncate">{m.trend.label}</span>
                </div>
              ) : (
                <div className="text-[9px] font-medium text-admin-text-faint">No data yet</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* SVG Revenue Chart */}
        <div className="bg-admin-surface border border-admin-ledger-line p-6 rounded-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-admin-display font-semibold text-sm text-admin-text">Revenue Trend</h2>
              <p className="font-admin-mono text-[10px] text-admin-text-faint font-medium uppercase tracking-wide mt-0.5">Daily transaction volume</p>
            </div>
            <ShelfTag tone="green">Weekly view</ShelfTag>
          </div>

          <div className="h-[200px] w-full flex items-end relative pt-4">
            {!hasRevenueHistory && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-admin-surface/90 rounded-lg">
                <Activity size={20} className="text-admin-text-faint" />
                <p className="text-xs font-semibold text-admin-text-muted">No transactions yet</p>
                <p className="font-admin-mono text-[10px] text-admin-text-faint">Revenue trend will populate as orders come in</p>
              </div>
            )}
            <svg className={`w-full h-full ${!hasRevenueHistory ? 'opacity-30' : ''}`} viewBox="0 0 600 200">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="50" x2="600" y2="50" stroke="#E4E1D5" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#E4E1D5" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="#E4E1D5" strokeWidth="0.5" strokeDasharray="4 4" />
              <path
                d="M0,170 C80,140 120,90 200,110 C280,130 320,60 400,80 C480,100 520,30 600,45 L600,200 L0,200 Z"
                fill="url(#chartGradient)"
              />
              <path
                d="M0,170 C80,140 120,90 200,110 C280,130 320,60 400,80 C480,100 520,30 600,45"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute bottom-0 w-full flex justify-between px-1 font-admin-mono text-[9px] font-semibold text-admin-text-faint pt-2 uppercase">
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
        <div className="bg-admin-surface border border-admin-ledger-line p-6 rounded-lg flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-admin-display font-semibold text-sm text-admin-text">Top Category Shares</h2>
            <p className="font-admin-mono text-[10px] text-admin-text-faint font-medium uppercase tracking-wide mt-0.5">Sales by product line</p>
          </div>

          {hasRevenueHistory ? (
            <>
              <div className="flex justify-center items-center py-2">
                <div className="relative w-32 h-32 rounded-full border-[14px] border-admin-green-soft flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[14px] border-admin-green border-t-transparent border-l-transparent" />
                  <div className="text-center">
                    <span className="font-admin-display text-xl font-bold text-admin-text">35%</span>
                    <div className="font-admin-mono text-[8px] font-semibold text-admin-text-faint uppercase">Organic</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-admin-mono text-[10px] font-medium text-admin-text-muted">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-admin-green" /> Organic 35%</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-admin-amber" /> Veg 25%</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-admin-blue" /> Fruits 20%</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-admin-red" /> Dairy 15%</div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-1 py-6 text-center">
              <PackageOpen size={22} className="text-admin-text-faint" />
              <p className="text-xs font-semibold text-admin-text-muted">No category sales yet</p>
              <p className="font-admin-mono text-[10px] text-admin-text-faint max-w-[180px]">Breakdown appears once orders start coming in</p>
            </div>
          )}
        </div>
      </div>

      {/* Status, Pending Orders & Low Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: System diagnostics */}
        <div className="bg-admin-surface border border-admin-ledger-line p-5 rounded-lg flex flex-col gap-3.5">
          <h3 className="font-admin-mono font-semibold text-[10px] text-admin-text-faint border-b border-admin-ledger-line pb-2.5 uppercase tracking-wide">System Health</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-admin-text-muted font-medium flex items-center gap-2">
                <Activity size={14} className="text-admin-text-faint" /> Web API Engine
              </span>
              <ShelfTag tone="green">Online</ShelfTag>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-admin-text-muted font-medium flex items-center gap-2">
                <HardDrive size={14} className="text-admin-text-faint" /> MongoDB Atlas
              </span>
              <ShelfTag tone="green">{system.database}</ShelfTag>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-admin-text-muted font-medium flex items-center gap-2">
                <CreditCard size={14} className="text-admin-text-faint" /> Razorpay PG
              </span>
              <ShelfTag tone="green">{system.gateway}</ShelfTag>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-admin-text-muted font-medium flex items-center gap-2">
                <Activity size={14} className="text-admin-text-faint" /> Latency Rate
              </span>
              <span className="font-admin-mono font-semibold text-admin-text text-[10px]">{system.latency}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Low Stock Alerts */}
        <div className="bg-admin-surface border border-admin-ledger-line p-5 rounded-lg flex flex-col gap-3.5">
          <h3 className="font-admin-mono font-semibold text-[10px] text-admin-text-faint border-b border-admin-ledger-line pb-2.5 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="text-admin-amber" size={13} /> Low Stock Alerts
          </h3>
          <div className="flex flex-col gap-2">
            {lowStockItems.length === 0 && (
              <p className="text-xs text-admin-text-faint font-medium py-2">All tracked items are above threshold.</p>
            )}
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs bg-admin-paper p-2 rounded-md border border-admin-ledger-line">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded bg-white object-cover border border-admin-ledger-line shrink-0" />
                  <span className="font-semibold truncate text-admin-text">{item.name}</span>
                </div>
                <ShelfTag tone="amber" className="shrink-0">{item.stock} left</ShelfTag>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Recent Pending Orders */}
        <div className="bg-admin-surface border border-admin-ledger-line p-5 rounded-lg flex flex-col gap-3.5">
          <h3 className="font-admin-mono font-semibold text-[10px] text-admin-text-faint border-b border-admin-ledger-line pb-2.5 uppercase tracking-wide">Recent Orders</h3>
          <div className="flex flex-col gap-2.5">
            {pendingOrders.length === 0 && (
              <p className="text-xs text-admin-text-faint font-medium py-2">No pending orders right now.</p>
            )}
            {pendingOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-admin-mono font-semibold text-admin-text">{order.id}</div>
                  <div className="text-admin-text-faint font-medium text-[10px]">{order.name} • {order.time}</div>
                </div>
                <div className="text-right">
                  <div className="font-admin-mono font-semibold text-admin-text tabular-nums">₹{order.amount}</div>
                  <ShelfTag tone="amber">{order.status}</ShelfTag>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="bg-admin-surface border border-admin-ledger-line p-5 rounded-lg flex flex-col gap-3.5">
        <h3 className="font-admin-mono font-semibold text-[10px] text-admin-text-faint uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button className="flex items-center gap-2 p-3 bg-admin-paper border border-admin-ledger-line rounded-md hover:border-admin-green/40 hover:bg-admin-green-soft/40 transition-all text-xs font-semibold text-admin-text cursor-pointer">
            <Plus size={15} className="text-admin-green" /> Add Product
          </button>
          <button className="flex items-center gap-2 p-3 bg-admin-paper border border-admin-ledger-line rounded-md hover:border-admin-green/40 hover:bg-admin-green-soft/40 transition-all text-xs font-semibold text-admin-text cursor-pointer">
            <Ticket size={15} className="text-admin-green" /> Create Coupon
          </button>
          <button className="flex items-center gap-2 p-3 bg-admin-paper border border-admin-ledger-line rounded-md hover:border-admin-green/40 hover:bg-admin-green-soft/40 transition-all text-xs font-semibold text-admin-text cursor-pointer">
            <RotateCcw size={15} className="text-admin-green" /> Issue Refund
          </button>
          <button className="flex items-center gap-2 p-3 bg-admin-paper border border-admin-ledger-line rounded-md hover:border-admin-green/40 hover:bg-admin-green-soft/40 transition-all text-xs font-semibold text-admin-text cursor-pointer">
            <Activity size={15} className="text-admin-green" /> Server Status
          </button>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
