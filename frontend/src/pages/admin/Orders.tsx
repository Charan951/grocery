import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Eye, Printer, UserPlus, UserMinus, Clock, ArrowRight, CheckCircle2,
  XCircle, Truck, FileText, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { ShelfTag } from '../../components/admin/ShelfTag';

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
  const API_URL = '/api';
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

    // Merge any customer orders saved in local storage
    let localOrders: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('customer_orders_')) {
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed)) localOrders.push(...parsed);
        }
      }
    } catch (_) {}

    const allRaw = [...apiOrders];
    localOrders.forEach(loc => {
      if (!allRaw.some(o => o.orderId === loc.orderId)) {
        allRaw.push(loc);
      }
    });

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
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, ...data.order } : o));
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder({ ...selectedOrder, ...data.order });
        }
      }
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
    alert(`Order ORD status updated to ${newStatus}!`);
  };


  const printInvoice = () => {
    window.print();
  };

  const tabs = ['All', 'Pending', 'Accepted', 'Packed', 'Ready', 'Assigned', 'Out For Delivery', 'Delivered', 'Cancelled'];

  const filteredOrders = orders.filter(o => {
    return activeTab === 'All' || o.status === activeTab;
  });

  const statusTone = (status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' => {
    if (status === 'Delivered') return 'green';
    if (status === 'Cancelled' || status === 'Returned') return 'red';
    if (status === 'Pending') return 'amber';
    return 'blue';
  };

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
            className={`px-3.5 py-2 rounded text-[10px] font-semibold uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === tab ? 'bg-admin-ink text-white' : 'text-admin-text-muted hover:text-admin-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders Ledger Table */}
      <div className="bg-admin-surface border border-admin-ledger-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="font-admin-mono">
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">ID</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">Customer</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">Items</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">Total</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">Payment</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">Rider</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide">Status</th>
                <th className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[10px] tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const totalItems = o.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={o.orderId} className="hover:bg-admin-paper/70 transition-colors border-b border-admin-ledger-line last:border-b-0">
                    <td className="p-3.5 font-admin-mono font-semibold text-admin-text">{o.orderId}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-admin-text">{o.customerName}</div>
                      <div className="font-admin-mono text-[10px] text-admin-text-faint font-medium">{o.customerPhone}</div>
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
                        <span className="ml-1 text-[9px] font-bold uppercase text-error">• offer declined</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <ShelfTag tone={statusTone(o.status)}>{o.status}</ShelfTag>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-2.5 py-1.5 rounded text-admin-text-muted hover:text-admin-green hover:bg-admin-green-soft transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide font-admin-mono">Process</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-admin-text-faint font-medium">
                    No orders found matching status tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL INVOICE & TIMELINE PROCESS DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-[600px] bg-surface h-full shadow-premium flex flex-col p-6 overflow-y-auto z-10 border-l border-divider printable-area">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-divider pb-4 mb-4 dont-print">
              <h2 className="text-base font-extrabold text-text-primary">Order dispatch cockpit</h2>
              <div className="flex gap-2">
                <button onClick={printInvoice} className="p-1.5 rounded-lg border border-divider hover:bg-background cursor-pointer text-text-secondary hover:text-primary"><Printer size={15} /></button>
                <button onClick={() => setSelectedOrder(null)} className="p-1.5 rounded-lg border border-divider hover:bg-background cursor-pointer"><X size={15} /></button>
              </div>
            </div>

            {/* INVOICE BILL LAYOUT */}
            <div className="flex flex-col gap-6 font-sans">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-divider pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-primary tracking-wide">FRESHCART</h3>
                  <p className="text-[10px] text-text-secondary font-medium">South Hub • Bangalore, India</p>
                  <p className="text-[10px] text-text-secondary font-medium">GSTIN: 29AAAAA1111A1Z1</p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-extrabold text-text-primary">{selectedOrder.orderId}</h4>
                  <p className="text-[9px] text-text-secondary font-semibold">Date: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p className="text-[9px] text-text-secondary font-semibold">Payment: {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})</p>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-divider pb-4">
                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Customer Info</span>
                  <div className="font-extrabold text-text-primary mt-1">{selectedOrder.customerName}</div>
                  <div className="text-text-secondary font-medium mt-0.5">{selectedOrder.customerPhone}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Shipping Address</span>
                  <div className="font-semibold text-text-primary mt-1">{selectedOrder.deliveryAddress.street}</div>
                  <div className="text-text-secondary font-medium mt-0.5">{selectedOrder.deliveryAddress.city} - {selectedOrder.deliveryAddress.pincode}</div>
                </div>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Bill Items</span>
                <div className="border border-divider rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-background">
                        <th className="p-2 border-b border-divider font-bold text-text-primary">Item Description</th>
                        <th className="p-2 border-b border-divider font-bold text-text-primary text-center">Qty</th>
                        <th className="p-2 border-b border-divider font-bold text-text-primary text-right">Price</th>
                        <th className="p-2 border-b border-divider font-bold text-text-primary text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-divider">
                          <td className="p-2 font-medium text-text-primary">{item.name} <span className="text-[9px] text-text-secondary">({item.weight})</span></td>
                          <td className="p-2 text-center text-text-secondary font-bold">{item.quantity}</td>
                          <td className="p-2 text-right text-text-secondary font-semibold">₹{item.price}</td>
                          <td className="p-2 text-right text-text-primary font-bold">₹{item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end text-xs border-b border-divider pb-4">
                <div className="w-[200px] flex flex-col gap-1.5">
                  <div className="flex justify-between text-text-secondary font-medium"><span>Subtotal:</span> <span>₹{selectedOrder.subTotal}</span></div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-error font-bold"><span>Discount:</span> <span>-₹{selectedOrder.discount}</span></div>
                  )}
                  <div className="flex justify-between text-text-secondary font-medium"><span>Delivery:</span> <span>₹{selectedOrder.deliveryCharges}</span></div>
                  <div className="flex justify-between text-text-primary font-extrabold text-sm border-t border-divider pt-1.5"><span>Total Due:</span> <span>₹{selectedOrder.grandTotal}</span></div>
                </div>
              </div>

              {/* ACTION: Shift Status / Assign Rider */}
              <div className="flex flex-col gap-3 dont-print">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Dispatch Action Panel</span>
                {selectedOrder.deliveryPartnerName && (
                  <div className={`text-[11px] font-semibold rounded-lg px-3 py-2 ${selectedOrder.assignmentStalled ? 'bg-error/10 text-error' : 'bg-background text-text-secondary'}`}>
                    Partner: <b className="text-text-primary">{selectedOrder.deliveryPartnerName}</b>
                    {selectedOrder.assignmentStalled && ' — last offer was declined/expired. Reassign.'}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {selectedOrder.status === 'Pending' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Accepted')}
                      className="bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-secondary cursor-pointer"
                    >
                      Accept Order
                    </button>
                  )}
                  {selectedOrder.status === 'Accepted' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Packed')}
                      className="bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-secondary cursor-pointer"
                    >
                      Order Packed
                    </button>
                  )}
                  {selectedOrder.status === 'Packed' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Ready')}
                      className="bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-secondary cursor-pointer"
                    >
                      Ready for Dispatch
                    </button>
                  )}
                  {(selectedOrder.status === 'Ready' || selectedOrder.status === 'Packed') && !selectedOrder.deliveryPartnerUserId && (
                    <button
                      onClick={() => openAssign(false)}
                      className="bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-secondary cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={14} /> Assign Partner
                    </button>
                  )}
                  {selectedOrder.deliveryPartnerUserId && !['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(selectedOrder.status) && (
                    <>
                      <button
                        onClick={() => openAssign(true)}
                        className="border border-primary text-primary bg-primary/5 font-bold py-2 rounded-xl text-xs hover:bg-primary/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserPlus size={14} /> Reassign
                      </button>
                      <button
                        onClick={handleUnassign}
                        className="border border-error text-error bg-error/5 font-bold py-2 rounded-xl text-xs hover:bg-error/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserMinus size={14} /> Unassign
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'Out For Delivery' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Delivered')}
                      className="bg-success text-white font-bold py-2 rounded-xl text-xs hover:bg-success/90 cursor-pointer"
                    >
                      Mark Delivered
                    </button>
                  )}
                  {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Cancelled')}
                      className="border border-error text-error bg-error/5 font-bold py-2 rounded-xl text-xs hover:bg-error/10 cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {/* TIMELINE PROGRESS TRACKER */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Order Progress Timeline</span>
                <div className="flex flex-col gap-3 pl-3.5 border-l border-divider relative">
                  {selectedOrder.trackingTimeline.map((t, idx) => (
                    <div key={idx} className="relative text-xs">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-sm" />
                      <div className="font-bold text-text-primary">{t.status}</div>
                      <div className="text-text-secondary font-medium text-[10px] mt-0.5">{t.note}</div>
                      <div className="text-[9px] text-text-tertiary font-semibold mt-0.5">{new Date(t.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PARTNER ASSIGNMENT MODAL OVERLAY */}
      {showRiderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !assignBusy && setShowRiderModal(false)} />
          <div className="bg-surface rounded-[28px] border border-divider p-6 max-w-sm w-full relative z-10 shadow-premium flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-text-primary uppercase">
              {reassignMode ? 'Reassign' : 'Assign'} delivery partner
            </h3>
            <p className="text-[11px] text-text-secondary leading-normal">
              Order <b>{selectedOrder.orderId}</b>. An offer is sent to the partner's app; they must accept it.
              Force-assign skips the offer.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Select partner (online first)</label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary"
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
                <span className="text-[10px] text-error font-semibold">No delivery partners found. Add one in Modules → Delivery.</span>
              )}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-text-secondary font-semibold cursor-pointer">
              <input type="checkbox" checked={forceAssign} onChange={(e) => setForceAssign(e.target.checked)} />
              Force-assign (skip offer / partner acceptance)
            </label>

            {assignMsg && <div className="text-[11px] font-semibold text-primary">{assignMsg}</div>}

            <div className="flex gap-2.5 mt-1">
              <button
                onClick={handleAssign}
                disabled={!selectedPartnerId || assignBusy}
                className="flex-1 bg-primary text-white font-bold py-2 rounded-full text-xs hover:bg-secondary cursor-pointer disabled:opacity-50"
              >
                {assignBusy ? 'Working…' : reassignMode ? 'Confirm reassign' : forceAssign ? 'Force-assign' : 'Send offer'}
              </button>
              <button
                onClick={() => setShowRiderModal(false)}
                disabled={assignBusy}
                className="flex-1 bg-background text-text-secondary border border-divider font-bold py-2 rounded-full text-xs hover:bg-surface cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Orders;
