import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag, Printer, UserPlus, UserMinus, Clock, ArrowRight, CheckCircle2,
  XCircle, Truck, FileText, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { ShelfTag } from '../../components/admin/ShelfTag';
import { OrderRiderMap } from './OrderRiderMap';
import { API_URL } from '../../config/api';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  weight: string;
}

interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subTotal: number;
  discount: number;
  deliveryCharges: number;
  grandTotal: number;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  paymentMethod: 'COD' | 'UPI' | 'Card' | 'Wallet';
  status: 'Pending' | 'Accepted' | 'Packed' | 'Ready' | 'Assigned' | 'Arrived At Store' | 'Out For Delivery' | 'Arrived' | 'Delivered' | 'Failed' | 'Cancelled' | 'Returned' | 'Refunded' | 'Exchange';
  deliveryPartnerName?: string;
  deliveryPartnerUserId?: string;
  assignmentStalled?: boolean;
  createdAt: string;
  deliveryAddress: {
    type: string;
    street: string;
    city: string;
    pincode: string;
  };
  trackingTimeline: { status: string; note: string; timestamp: string }[];
}

import { useCMS } from '../../context/CMSContext';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  // Date filter: 'all' | 'today' | 'yesterday' | 'week' | 'custom'
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');
  
  // Selection / Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [reassignMode, setReassignMode] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [forceAssign, setForceAssign] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  
  // MERN API Connection
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('freshcart_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    let apiOrders: any[] = [];

    try {
      const res = await fetch(`${API_URL}/orders`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        apiOrders = data.orders;
      }
    } catch (e) {
      console.warn('Failed to fetch orders from API:', e);
    }

    // The admin dispatch view is a server view — the database is the single
    // source of truth. Browser localStorage ("customer_orders_*") holds only the
    // customer app's own cache and produces phantom, un-actionable rows here, so
    // it is deliberately NOT merged in.
    const allRaw = [...apiOrders];

    if (allRaw.length > 0) {
      const normalized: Order[] = allRaw.map((o: any) => ({
        orderId: o.orderId || o.id || 'ORD-' + Math.floor(10000 + Math.random() * 90000),
        customerId: o.customerId || 'cust_01',
        customerName: o.customerName || 'Valued Customer',
        customerPhone: o.customerPhone || 'N/A',
        items: Array.isArray(o.items) ? o.items.map((it: any) => ({
          productId: it.productId || it.id || 'p_1',
          name: it.name || 'Grocery Item',
          quantity: Number(it.quantity || it.qty || 1),
          price: Number(it.price || 0),
          weight: it.weight || it.weightSpec || '500g'
        })) : [],
        subTotal: Number(o.subTotal ?? o.itemTotal ?? o.totalAmount ?? 0),
        discount: Number(o.discount ?? 0),
        deliveryCharges: Number(o.deliveryCharges ?? o.deliveryFee ?? 0),
        grandTotal: Number(o.grandTotal ?? o.totalAmount ?? o.itemTotal ?? 0),
        paymentStatus: o.paymentStatus || 'Paid',
        paymentMethod: o.paymentMethod || 'UPI',
        status: o.status || 'Pending',
        deliveryPartnerName: o.deliveryPartnerName,
        deliveryPartnerUserId: o.deliveryPartnerUserId,
        assignmentStalled: o.assignmentStalled,
        createdAt: o.createdAt || new Date().toISOString(),
        deliveryAddress: typeof o.deliveryAddress === 'object' && o.deliveryAddress !== null
          ? o.deliveryAddress
          : { type: 'Home', street: String(o.deliveryAddress || o.address || 'Selected Delivery Address'), city: 'Bengaluru', pincode: '560001' },
        trackingTimeline: Array.isArray(o.trackingTimeline) ? o.trackingTimeline : [
          { status: o.status || 'Pending', note: 'Order placed by customer.', timestamp: o.createdAt || new Date().toISOString() }
        ]
      }));

      // Newest order first.
      normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(normalized);
    } else {
      // Mock Data fallback if no orders exist at all
      const mockOrders: Order[] = [
        {
          orderId: 'ORD-74912',
          customerId: 'cust_01',
          customerName: 'Aarav Sharma',
          customerPhone: '9876543210',
          items: [
            { productId: 'prod_org_1', name: 'Organic Baby Spinach', quantity: 2, price: 99, weight: '150g' },
            { productId: 'prod_org_2', name: 'Organic Hass Avocados', quantity: 1, price: 249, weight: '2 pcs' }
          ],
          subTotal: 447,
          discount: 50,
          deliveryCharges: 40,
          grandTotal: 437,
          paymentStatus: 'Paid',
          paymentMethod: 'UPI',
          status: 'Pending',
          createdAt: new Date().toISOString(),
          deliveryAddress: { type: 'Home', street: 'Fl 405, Block B, Green Heights, HSR Layout', city: 'Bengaluru', pincode: '560102' },
          trackingTimeline: [{ status: 'Pending', note: 'Order placed by customer.', timestamp: new Date().toISOString() }]
        }
      ];
      setOrders(mockOrders);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/delivery/partners`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && Array.isArray(data.partners)) {
        // online + active first, then by fewest active orders
        const sorted = [...data.partners].sort((a, b) => {
          const rank = (p: any) => (p.accountStatus === 'Suspended' ? 3 : !p.isOnline ? 2 : p.availability === 'busy' ? 1 : 0);
          return rank(a) - rank(b) || a.activeOrderIds.length - b.activeOrderIds.length;
        });
        setPartners(sorted);
      }
    } catch {
      /* modal will show empty list */
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPartners();
  }, []);

  const openAssign = (reassign: boolean) => {
    setReassignMode(reassign);
    setForceAssign(false);
    setSelectedPartnerId('');
    setAssignMsg('');
    fetchPartners();
    setShowRiderModal(true);
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedPartnerId) return;
    setAssignBusy(true);
    setAssignMsg('');
    try {
      const path = reassignMode ? 'reassign' : 'assign';
      const res = await fetch(`${API_URL}/admin/orders/${selectedOrder.orderId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ partnerUserId: selectedPartnerId, force: forceAssign }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAssignMsg(data.message || 'Assignment failed');
        return;
      }
      if (data.mode === 'offered') {
        setAssignMsg('Offer sent — waiting for the partner to accept.');
      } else {
        setAssignMsg('Partner assigned.');
      }
      if (data.order) {
        setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? { ...o, ...data.order } : o));
        setSelectedOrder(prev => prev ? { ...prev, ...data.order } : prev);
      }
      fetchOrders();
      setTimeout(() => setShowRiderModal(false), 900);
    } catch {
      setAssignMsg('Assignment failed — network error');
    } finally {
      setAssignBusy(false);
    }
  };

  const handleUnassign = async () => {
    if (!selectedOrder) return;
    const reason = window.prompt('Reason for unassigning (optional):') || '';
    try {
      const res = await fetch(`${API_URL}/admin/orders/${selectedOrder.orderId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Unassign failed');
        return;
      }
      if (data.order) {
        setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? { ...o, ...data.order } : o));
        setSelectedOrder(prev => prev ? { ...prev, ...data.order } : prev);
      }
      fetchOrders();
    } catch {
      alert('Unassign failed');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (res.status === 404) {
          alert(`Order ${orderId} is not on the server (local-only test order). Place a fresh order from the customer app so it is saved to the database, then update it here.`);
        } else {
          alert(data.message || `Failed to update status (HTTP ${res.status}).`);
        }
        return;
      }
      if (data.order) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, ...data.order } : o));
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder({ ...selectedOrder, ...data.order });
        }
      }
      fetchOrders();
      return;
    } catch (e) {
      // Local Sync in Offline Mode
      setOrders(prev => prev.map(o => {
        if (o.orderId === orderId) {
          const updatedTimeline = [...o.trackingTimeline, { status: newStatus, note: `Status updated to ${newStatus}`, timestamp: new Date().toISOString() }];
          const updated: Order = { 
            ...o, 
            status: newStatus as any, 
            trackingTimeline: updatedTimeline,
            paymentStatus: newStatus === 'Delivered' ? 'Paid' : o.paymentStatus
          };
          if (selectedOrder?.orderId === orderId) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      }));
    }
  };


  const printInvoice = () => {
    window.print();
  };

  const tabs = ['All', 'Pending', 'Accepted', 'Packed', 'Ready', 'Assigned', 'Out For Delivery', 'Delivered', 'Cancelled'];

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const matchesDate = (createdAt: string): boolean => {
    if (dateFilter === 'all') return true;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    if (dateFilter === 'today') return sameDay(d, now);
    if (dateFilter === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return sameDay(d, y);
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    if (dateFilter === 'custom') {
      if (!customDate) return true;
      const [yy, mm, dd] = customDate.split('-').map(Number);
      return sameDay(d, new Date(yy, mm - 1, dd));
    }
    return true;
  };

  const filteredOrders = orders
    .filter(o => activeTab === 'All' || o.status === activeTab)
    .filter(o => matchesDate(o.createdAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusTone = (status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' => {
    if (status === 'Delivered') return 'green';
    if (status === 'Cancelled' || status === 'Returned') return 'red';
    if (status === 'Pending') return 'amber';
    return 'blue';
  };

  const ALL_STATUSES = ['Pending', 'Accepted', 'Packed', 'Ready', 'Assigned', 'Out For Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'];

  const fmtDate = (v?: string) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (selectedOrder) {
    return (
      <OrderDetailView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onPrint={printInvoice}
        onUpdateStatus={handleUpdateStatus}
        onAssign={() => openAssign(false)}
        onReassign={() => openAssign(true)}
        onUnassign={handleUnassign}
        statusTone={statusTone}
        allStatuses={ALL_STATUSES}
        fmtDate={fmtDate}
        riderModal={showRiderModal && createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ width: '100vw', height: '100vh' }}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !assignBusy && setShowRiderModal(false)} />
            <div
              className="bg-admin-surface rounded-2xl border border-admin-ledger-line p-6 max-w-sm w-full relative z-10 shadow-2xl flex flex-col gap-4"
              style={{ width: '100%', maxWidth: '24rem', minWidth: '280px', boxSizing: 'border-box', flexShrink: 0 }}
            >
              <h3 className="font-bold text-sm text-admin-text uppercase font-admin-mono">
                {reassignMode ? 'Reassign' : 'Assign'} delivery partner
              </h3>
              <p className="text-xs text-admin-text-muted leading-normal">
                Order <b>{selectedOrder.orderId}</b>. An offer is sent to the partner's app; they must accept it. Force-assign skips the offer.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-admin-text-muted uppercase font-admin-mono">Select partner (online first)</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="px-3 py-2 border border-admin-ledger-line rounded-lg text-xs bg-admin-paper focus:outline-none focus:border-admin-green text-admin-text"
                >
                  <option value="">-- Choose partner --</option>
                  {partners.map((p) => {
                    const state = p.accountStatus === 'Suspended' ? 'suspended'
                      : !p.isOnline ? 'offline'
                      : p.availability === 'busy' ? 'on delivery' : 'available';
                    return (
                      <option key={p.userId} value={p.userId} disabled={p.accountStatus === 'Suspended'}>
                        {p.name} — {state} • {p.activeOrderIds.length}/{p.maxConcurrent} active • ★{Number(p.rating || 0).toFixed(1)}
                      </option>
                    );
                  })}
                </select>
                {partners.length === 0 && (
                  <span className="text-[11px] text-admin-red font-semibold">No delivery partners found. Add one in Modules → Delivery.</span>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-admin-text-muted font-semibold cursor-pointer">
                <input type="checkbox" checked={forceAssign} onChange={(e) => setForceAssign(e.target.checked)} />
                Force-assign (skip offer / partner acceptance)
              </label>
              {assignMsg && <div className="text-xs font-semibold text-admin-green">{assignMsg}</div>}
              <div className="flex gap-2.5 mt-1">
                <button
                  onClick={handleAssign}
                  disabled={!selectedPartnerId || assignBusy}
                  className="flex-1 bg-admin-ink text-white font-bold py-2 rounded-lg text-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {assignBusy ? 'Working…' : reassignMode ? 'Confirm reassign' : forceAssign ? 'Force-assign' : 'Send offer'}
                </button>
                <button
                  onClick={() => setShowRiderModal(false)}
                  disabled={assignBusy}
                  className="flex-1 bg-admin-paper text-admin-text-muted border border-admin-ledger-line font-bold py-2 rounded-lg text-xs hover:bg-admin-surface cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Order Management"
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-admin-surface p-1 rounded-md border border-admin-ledger-line max-w-fit font-admin-mono">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 rounded text-[11px] font-semibold uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === tab ? 'bg-admin-ink text-white' : 'text-admin-text-muted hover:text-admin-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-1 font-admin-mono -mt-2">
        {[
          { key: 'all', label: 'All dates' },
          { key: 'today', label: 'Today' },
          { key: 'yesterday', label: 'Yesterday' },
          { key: 'week', label: 'Last 7 days' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={`px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-all cursor-pointer border ${
              dateFilter === f.key
                ? 'bg-admin-ink text-white border-admin-ink'
                : 'text-admin-text-muted hover:text-admin-text border-admin-ledger-line'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="date"
          value={customDate}
          onChange={(e) => { setCustomDate(e.target.value); setDateFilter(e.target.value ? 'custom' : 'all'); }}
          className={`px-3 py-1.5 rounded text-[11px] font-semibold bg-admin-surface transition-all cursor-pointer border ${
            dateFilter === 'custom' ? 'border-admin-ink text-admin-text' : 'border-admin-ledger-line text-admin-text-muted'
          }`}
        />
      </div>

      {/* Orders Ledger Table */}
      <div className="bg-admin-surface border border-admin-ledger-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="font-admin-mono">
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">ID</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Customer</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Items</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Total</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Payment</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Rider</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const totalItems = o.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr
                    key={o.orderId}
                    onClick={() => setSelectedOrder(o)}
                    className="hover:bg-admin-paper/70 transition-colors border-b border-admin-ledger-line last:border-b-0 cursor-pointer"
                  >
                    <td className="p-3.5 font-admin-mono font-semibold text-admin-text">{o.orderId}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-admin-text">{o.customerName}</div>
                      <div className="font-admin-mono text-[11px] text-admin-text-faint font-medium">{o.customerPhone}</div>
                    </td>
                    <td className="p-3.5 font-medium text-admin-text-muted">{totalItems} items</td>
                    <td className="p-3.5 font-admin-mono font-semibold text-admin-text tabular-nums">₹{o.grandTotal}</td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-admin-text">{o.paymentMethod}</span>
                        <ShelfTag tone={o.paymentStatus === 'Paid' ? 'green' : 'amber'}>{o.paymentStatus}</ShelfTag>
                      </div>
                    </td>
                    <td className="p-3.5 text-admin-text-muted font-medium">
                      {o.deliveryPartnerName || 'Unassigned'}
                      {o.assignmentStalled && (
                        <span className="ml-1 text-[11px] font-bold uppercase text-error">• offer declined</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <ShelfTag tone={statusTone(o.status)}>{o.status}</ShelfTag>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-admin-text-faint font-medium">
                    No orders found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
  onPrint: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onAssign: () => void;
  onReassign: () => void;
  onUnassign: () => void;
  statusTone: (s: string) => 'green' | 'amber' | 'red' | 'blue' | 'neutral';
  allStatuses: string[];
  fmtDate: (v?: string) => string;
  riderModal: React.ReactNode;
}

const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order, onBack, onPrint, onUpdateStatus, onAssign, onReassign, onUnassign,
  statusTone, allStatuses, fmtDate, riderModal,
}) => {
  const hasRider = !!order.deliveryPartnerUserId;
  const closed = ['Delivered', 'Cancelled', 'Returned', 'Refunded', 'Failed'].includes(order.status);

  return (
    <div className="flex flex-col gap-6 printable-area">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-admin-ledger-line bg-admin-surface text-admin-text-muted hover:text-admin-text text-[11px] font-semibold uppercase tracking-wide font-admin-mono cursor-pointer dont-print"
          >
            <ChevronRight size={14} className="rotate-180" /> Back to orders
          </button>
          <div className="min-w-0">
            <div className="font-admin-mono text-lg font-bold text-admin-text truncate">{order.orderId}</div>
            <div className="text-xs text-admin-text-faint font-medium">Placed {fmtDate(order.createdAt)}</div>
          </div>
          <ShelfTag tone={statusTone(order.status)}>{order.status}</ShelfTag>
        </div>
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-admin-ledger-line bg-admin-surface text-admin-text-muted hover:text-admin-text text-[11px] font-semibold uppercase tracking-wide font-admin-mono cursor-pointer dont-print"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-admin-ledger-line border border-admin-ledger-line rounded-lg overflow-hidden">
        {[
          { k: 'Items', v: `${order.items.reduce((s, i) => s + i.quantity, 0)}` },
          { k: 'Payment', v: `${order.paymentMethod} · ${order.paymentStatus}` },
          { k: 'Rider', v: order.deliveryPartnerName || 'Unassigned' },
          { k: 'Order total', v: `₹${order.grandTotal}` },
        ].map(c => (
          <div key={c.k} className="bg-admin-surface px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wide font-bold text-admin-text-faint font-admin-mono">{c.k}</div>
            <div className="text-xs font-semibold text-admin-text mt-1 truncate">{c.v}</div>
          </div>
        ))}
      </div>

      {/* Timeline + status update, side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        {/* Order progress timeline — horizontal stepper */}
        <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-4 flex flex-col gap-3">
          <div className="text-[11px] uppercase tracking-wide font-bold text-admin-text-faint font-admin-mono">Order progress timeline</div>
          <div className="overflow-x-auto">
            <ol className="flex items-start min-w-max gap-0">
              {order.trackingTimeline.map((t, idx) => {
                const isLast = idx === order.trackingTimeline.length - 1;
                return (
                  <li key={idx} className="flex flex-col items-center relative px-4 first:pl-0 last:pr-0" style={{ minWidth: 132 }}>
                    <div className="flex items-center w-full">
                      <span className={`h-px flex-1 ${idx === 0 ? 'bg-transparent' : 'bg-admin-green'}`} />
                      <span className="w-3 h-3 rounded-full bg-admin-green border-2 border-admin-surface shrink-0 shadow-[0_0_0_1px_var(--color-admin-green)]" />
                      <span className={`h-px flex-1 ${isLast ? 'bg-transparent' : 'bg-admin-green'}`} />
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-admin-text leading-tight">{t.status}</div>
                      <div className="text-[11px] text-admin-text-faint font-admin-mono mt-0.5">{fmtDate(t.timestamp)}</div>
                      {t.note && <div className="text-[11px] text-admin-text-muted mt-0.5 max-w-[140px] leading-snug">{t.note}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Status update */}
        <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-4 flex flex-col gap-3 dont-print">
          <div className="text-[11px] uppercase tracking-wide font-bold text-admin-text-faint font-admin-mono">Update status</div>
          <div className="flex flex-wrap gap-2">
            {['Pending', 'In Transit', 'Accepted'].includes(order.status) && (
              <button onClick={() => onUpdateStatus(order.orderId, 'Packed')} className="bg-admin-ink text-white font-semibold px-3.5 py-2 rounded-md text-xs hover:opacity-90 cursor-pointer">Mark Packed</button>
            )}
            {order.status === 'Packed' && (
              <button onClick={() => onUpdateStatus(order.orderId, 'Ready')} className="bg-admin-ink text-white font-semibold px-3.5 py-2 rounded-md text-xs hover:opacity-90 cursor-pointer">Mark Ready for Pickup</button>
            )}
            {order.status === 'Out For Delivery' && (
              <button onClick={() => onUpdateStatus(order.orderId, 'Delivered')} className="bg-admin-green text-white font-semibold px-3.5 py-2 rounded-md text-xs hover:opacity-90 cursor-pointer">Mark Delivered</button>
            )}
            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
              <button onClick={() => onUpdateStatus(order.orderId, 'Cancelled')} className="border border-admin-red text-admin-red bg-admin-red-soft font-semibold px-3.5 py-2 rounded-md text-xs hover:opacity-90 cursor-pointer">Cancel Order</button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] font-bold text-admin-text-muted uppercase font-admin-mono">
            Set manually
            <select
              value={order.status}
              onChange={(e) => { if (e.target.value !== order.status) onUpdateStatus(order.orderId, e.target.value); }}
              className="px-2.5 py-1.5 border border-admin-ledger-line rounded-md text-xs bg-admin-paper text-admin-text font-admin-body normal-case font-medium cursor-pointer focus:outline-none focus:border-admin-green"
            >
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          {/* Delivery flow reference — which status the order moves through */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-admin-mono">
            {['Pending', 'Accepted', 'Packed', 'Ready', 'Assigned', 'Out For Delivery', 'Delivered'].map((s, i, arr) => (
              <React.Fragment key={s}>
                <span className={s === order.status ? 'text-admin-green font-bold' : 'text-admin-text-faint'}>{s}</span>
                {i < arr.length - 1 && <ChevronRight size={11} className="text-admin-text-faint" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Customer + Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wide font-bold text-admin-text-faint font-admin-mono">Customer</div>
          <div className="font-semibold text-admin-text mt-1.5 text-sm">{order.customerName}</div>
          <a href={`tel:${order.customerPhone}`} className="text-xs text-admin-green font-medium font-admin-mono hover:underline">{order.customerPhone}</a>
        </div>
        <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wide font-bold text-admin-text-faint font-admin-mono">Delivery location</div>
          <div className="text-xs font-semibold text-admin-text mt-1.5">{order.deliveryAddress.type}</div>
          <div className="text-xs text-admin-text-muted mt-0.5 leading-relaxed">{order.deliveryAddress.street}</div>
          <div className="text-xs text-admin-text-muted">{order.deliveryAddress.city} — {order.deliveryAddress.pincode}</div>
        </div>
      </div>

      {/* Dispatch / rider */}
      <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-4 flex flex-col gap-3 dont-print">
        <div className="text-[11px] uppercase tracking-wide font-bold text-admin-text-faint font-admin-mono">Dispatch &amp; rider</div>
        {(() => {
          const s = order.status;
          let label = '';
          let tone = 'bg-admin-paper text-admin-text-muted';
          if (['Pending', 'In Transit', 'Accepted', 'Packed'].includes(s)) {
            label = 'Preparing — rider assignment begins when the order is marked Ready for Pickup';
          } else if (s === 'Ready' && !hasRider && order.assignmentStalled) {
            label = 'No rider available nearby — waiting / retryable. Order stays Ready.';
            tone = 'bg-admin-red-soft text-admin-red';
          } else if (s === 'Ready' && !hasRider) {
            label = 'Ready for Pickup — searching for a nearby rider…';
            tone = 'bg-admin-blue-soft text-admin-blue';
          } else if (['Ready', 'Assigned', 'Arrived At Store', 'Out For Delivery', 'Arrived', 'Delivered'].includes(s)) {
            label = `Rider: ${order.deliveryPartnerName || 'assigned'}`;
            tone = 'bg-admin-green-soft text-admin-green';
          } else {
            label = order.deliveryPartnerName
              ? `Order ${s.toLowerCase()} — last rider was ${order.deliveryPartnerName}.`
              : `Order ${s.toLowerCase()} — no rider was assigned.`;
          }
          return (
            <div className={`text-xs font-semibold rounded-md px-3 py-2 ${tone}`}>
              <span className="uppercase text-[11px] font-bold opacity-70 mr-1.5">Rider assignment</span>
              {label}
            </div>
          );
        })()}
        {order.deliveryPartnerName && (
          <div className={`text-xs font-semibold rounded-md px-3 py-2 ${order.assignmentStalled ? 'bg-admin-red-soft text-admin-red' : 'bg-admin-paper text-admin-text-muted'}`}>
            Partner: <b className="text-admin-text">{order.deliveryPartnerName}</b>
            {order.assignmentStalled && ' — last offer was declined/expired. Reassign.'}
          </div>
        )}
        {order.deliveryPartnerUserId && !closed && (
          <OrderRiderMap key={order.orderId} orderId={order.orderId} partnerUserId={order.deliveryPartnerUserId} />
        )}
        <div className="flex flex-wrap gap-2">
          {order.status === 'Ready' && !order.deliveryPartnerUserId && (
            <button onClick={onAssign} className="bg-admin-ink text-white font-semibold px-3.5 py-2 rounded-md text-xs hover:opacity-90 cursor-pointer flex items-center gap-1.5">
              <UserPlus size={14} /> Assign Partner Manually
            </button>
          )}
          {order.deliveryPartnerUserId && !['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(order.status) && (
            <>
              <button onClick={onReassign} className="border border-admin-ink text-admin-text bg-admin-paper font-semibold px-3.5 py-2 rounded-md text-xs hover:bg-admin-ledger-line/40 cursor-pointer flex items-center gap-1.5">
                <UserPlus size={14} /> Reassign
              </button>
              <button onClick={onUnassign} className="border border-admin-red text-admin-red bg-admin-red-soft font-semibold px-3.5 py-2 rounded-md text-xs hover:opacity-90 cursor-pointer flex items-center gap-1.5">
                <UserMinus size={14} /> Unassign
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-admin-surface border border-admin-ledger-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="font-admin-mono">
                <th className="p-3 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide">Item</th>
                <th className="p-3 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide text-center">Qty</th>
                <th className="p-3 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide text-right">Price</th>
                <th className="p-3 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-admin-ledger-line last:border-b-0">
                  <td className="p-3 font-medium text-admin-text">{item.name} <span className="text-[11px] text-admin-text-faint">({item.weight})</span></td>
                  <td className="p-3 text-center text-admin-text-muted font-semibold tabular-nums">{item.quantity}</td>
                  <td className="p-3 text-right text-admin-text-muted font-admin-mono tabular-nums">₹{item.price}</td>
                  <td className="p-3 text-right text-admin-text font-admin-mono font-semibold tabular-nums">₹{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end p-3 border-t border-admin-ledger-line bg-admin-paper">
          <div className="w-56 flex flex-col gap-1.5 text-xs font-admin-mono tabular-nums">
            <div className="flex justify-between text-admin-text-muted"><span>Subtotal</span><span>₹{order.subTotal}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-admin-red"><span>Discount</span><span>-₹{order.discount}</span></div>
            )}
            <div className="flex justify-between text-admin-text-muted"><span>Delivery</span><span>₹{order.deliveryCharges}</span></div>
            <div className="flex justify-between text-admin-text font-bold text-sm border-t border-admin-ledger-line pt-1.5"><span>Total</span><span>₹{order.grandTotal}</span></div>
          </div>
        </div>
      </div>

      {riderModal}

      {/* PRINT-ONLY INVOICE (hidden on screen; the only thing window.print() outputs) */}
      <div className="print-invoice">
        <table style={{ marginBottom: 24 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top' }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.02em' }}>FRESHCART</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>South Hub · Bengaluru, Karnataka, India</div>
                <div style={{ fontSize: 11, color: '#555' }}>GSTIN: 29ABCDE1234F1Z5 · support@freshcart.example</div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>TAX INVOICE</div>
                <div style={{ fontSize: 12, marginTop: 4 }}><b>{order.orderId}</b></div>
                <div style={{ fontSize: 11, color: '#555' }}>Placed: {fmtDate(order.createdAt)}</div>
                <div style={{ fontSize: 11, color: '#555' }}>Printed: {fmtDate(new Date().toISOString())}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Status: <b>{order.status}</b></div>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginBottom: 20 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', width: '50%', paddingRight: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.08em' }}>Bill to</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{order.customerName}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{order.customerPhone}</div>
              </td>
              <td style={{ verticalAlign: 'top', width: '50%' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.08em' }}>Deliver to</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{order.deliveryAddress.type}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{order.deliveryAddress.street}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{order.deliveryAddress.city} — {order.deliveryAddress.pincode}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', borderBottom: '1.5px solid #111', padding: '6px 8px' }}>Item</th>
              <th style={{ textAlign: 'center', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', borderBottom: '1.5px solid #111', padding: '6px 8px' }}>Qty</th>
              <th style={{ textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', borderBottom: '1.5px solid #111', padding: '6px 8px' }}>Unit price</th>
              <th style={{ textAlign: 'right', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', borderBottom: '1.5px solid #111', padding: '6px 8px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid #ddd' }}>{item.name} <span style={{ color: '#888', fontSize: 10 }}>({item.weight})</span></td>
                <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>₹{item.price}</td>
                <td style={{ fontSize: 12, padding: '6px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' }}>₹{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ marginTop: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: '60%' }}></td>
              <td style={{ width: '40%' }}>
                <table>
                  <tbody>
                    <tr><td style={{ fontSize: 12, padding: '3px 8px', color: '#555' }}>Subtotal</td><td style={{ fontSize: 12, padding: '3px 8px', textAlign: 'right' }}>₹{order.subTotal}</td></tr>
                    {order.discount > 0 && (
                      <tr><td style={{ fontSize: 12, padding: '3px 8px', color: '#555' }}>Discount</td><td style={{ fontSize: 12, padding: '3px 8px', textAlign: 'right' }}>-₹{order.discount}</td></tr>
                    )}
                    <tr><td style={{ fontSize: 12, padding: '3px 8px', color: '#555' }}>Delivery</td><td style={{ fontSize: 12, padding: '3px 8px', textAlign: 'right' }}>₹{order.deliveryCharges}</td></tr>
                    <tr>
                      <td style={{ fontSize: 14, fontWeight: 800, padding: '6px 8px', borderTop: '1.5px solid #111' }}>Grand total</td>
                      <td style={{ fontSize: 14, fontWeight: 800, padding: '6px 8px', borderTop: '1.5px solid #111', textAlign: 'right' }}>₹{order.grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 11, marginTop: 16 }}>
          Payment: <b>{order.paymentMethod}</b> ({order.paymentStatus})
        </div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 24, borderTop: '1px solid #ddd', paddingTop: 8 }}>
          This is a computer-generated invoice and does not require a signature. Thank you for shopping with FreshCart.
        </div>
      </div>
    </div>
  );
};

export default Orders;
