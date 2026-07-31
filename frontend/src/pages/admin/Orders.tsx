import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Eye, Printer, UserPlus, Clock, ArrowRight, CheckCircle2, 
  XCircle, Truck, FileText, ChevronRight, X, AlertCircle
} from 'lucide-react';

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
  status: 'Pending' | 'Accepted' | 'Packed' | 'Ready' | 'Assigned' | 'Out For Delivery' | 'Delivered' | 'Cancelled' | 'Returned' | 'Refunded' | 'Exchange';
  deliveryPartnerName?: string;
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
  const { activeHub, warehouses } = useCMS();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // Selection / Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState('');
  
  // MERN API Connection
  const API_URL = 'http://localhost:5000/api';
  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };


  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      // Mock Data fallback
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
        },
        {
          orderId: 'ORD-20412',
          customerId: 'cust_02',
          customerName: 'Priya Nair',
          customerPhone: '8765432109',
          items: [
            { productId: 'prod_org_3', name: 'Organic Raw Honey', quantity: 1, price: 199, weight: '250g' }
          ],
          subTotal: 199,
          discount: 0,
          deliveryCharges: 40,
          grandTotal: 239,
          paymentStatus: 'Paid',
          paymentMethod: 'Card',
          status: 'Accepted',
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          deliveryAddress: { type: 'Office', street: '4th Floor, Tech Park, Whitefield', city: 'Bengaluru', pincode: '560066' },
          trackingTimeline: [
            { status: 'Pending', note: 'Order placed.', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
            { status: 'Accepted', note: 'Order accepted by Dark Store.', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() }
          ]
        },
        {
          orderId: 'ORD-10924',
          customerId: 'cust_03',
          customerName: 'Rohan Deshmukh',
          customerPhone: '7654321098',
          items: [
            { productId: 'prod_veg_1', name: 'Fresh Cherry Tomatoes', quantity: 3, price: 59, weight: '250g' },
            { productId: 'prod_veg_2', name: 'Organic Broccoli Crowns', quantity: 1, price: 89, weight: '250g' }
          ],
          subTotal: 266,
          discount: 0,
          deliveryCharges: 40,
          grandTotal: 306,
          paymentStatus: 'Paid',
          paymentMethod: 'Wallet',
          status: 'Delivered',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          deliveryAddress: { type: 'Home', street: 'Building 12, Indiranagar', city: 'Bengaluru', pincode: '560038' },
          trackingTimeline: [
            { status: 'Pending', note: 'Order placed.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
            { status: 'Accepted', note: 'Accepted.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.8).toISOString() },
            { status: 'Packed', note: 'Packed.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString() },
            { status: 'Out For Delivery', note: 'Out for delivery.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
            { status: 'Delivered', note: 'Order delivered successfully.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.8).toISOString() }
          ]
        }
      ];
      setOrders(mockOrders);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const handleAssignRider = async () => {
    if (!selectedOrder || !selectedRider) return;
    try {
      const res = await fetch(`${API_URL}/orders/${selectedOrder.orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ 
          status: 'Assigned', 
          deliveryPartnerId: 'dr_' + selectedRider.toLowerCase(),
          deliveryPartnerName: selectedRider,
          note: `Assigned order to delivery rider: ${selectedRider}.` 
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? { ...o, ...data.order } : o));
        setSelectedOrder({ ...selectedOrder, ...data.order });
      }
    } catch (e) {
      setOrders(prev => prev.map(o => {
        if (o.orderId === selectedOrder.orderId) {
          const updatedTimeline = [...o.trackingTimeline, { status: 'Assigned', note: `Assigned to rider ${selectedRider}`, timestamp: new Date().toISOString() }];
          const updated: Order = { 
            ...o, 
            status: 'Assigned',
            deliveryPartnerName: selectedRider,
            trackingTimeline: updatedTimeline 
          };
          setSelectedOrder(updated);
          return updated;
        }
        return o;
      }));
    }
    setShowRiderModal(false);
    alert(`Delivery rider '${selectedRider}' assigned to order!`);
  };

  const printInvoice = () => {
    window.print();
  };

  const tabs = ['All', 'Pending', 'Accepted', 'Packed', 'Ready', 'Assigned', 'Out For Delivery', 'Delivered', 'Cancelled'];

  const activeWarehouseObj = warehouses.find(w => w.id === activeHub);
  const activePincodes = activeWarehouseObj ? activeWarehouseObj.pincodes : [];

  const filteredOrders = orders.filter(o => {
    const matchStatus = activeTab === 'All' || o.status === activeTab;
    const matchHub = activePincodes.length === 0 || 
                     (o.deliveryAddress?.pincode && activePincodes.includes(o.deliveryAddress.pincode));
    return matchStatus && matchHub;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-text-primary">Order Management</h1>
        <p className="text-xs text-text-secondary font-medium font-sans">Dispatch orders, update delivery progress timelines, print invoices, and allocate riders.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-surface p-1 rounded-2xl border border-divider shadow-sm max-w-fit">
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-surface border border-divider rounded-[28px] overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">ID</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">Customer</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">Total Items</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">Grand Total</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">Payment</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">Rider</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary">Status</th>
                <th className="p-4 bg-background border-b border-divider font-bold text-text-primary text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const totalItems = o.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={o.orderId} className="hover:bg-background/20 transition-all border-b border-divider">
                    <td className="p-4 font-extrabold text-primary">{o.orderId}</td>
                    <td className="p-4">
                      <div className="font-extrabold text-text-primary">{o.customerName}</div>
                      <div className="text-[10px] text-text-secondary font-medium">{o.customerPhone}</div>
                    </td>
                    <td className="p-4 font-semibold text-text-secondary">{totalItems} items</td>
                    <td className="p-4 font-extrabold text-text-primary">₹{o.grandTotal}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary">{o.paymentMethod}</span>
                        <span className={`text-[9px] font-extrabold uppercase ${o.paymentStatus === 'Paid' ? 'text-success' : 'text-warning'}`}>{o.paymentStatus}</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary font-semibold">
                      {o.deliveryPartnerName ? `🚴 ${o.deliveryPartnerName}` : 'Unassigned'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                        o.status === 'Delivered' ? 'text-success bg-success/10' :
                        o.status === 'Cancelled' ? 'text-error bg-error/10' :
                        o.status === 'Pending' ? 'text-warning bg-warning/10' : 'text-primary bg-primary/10'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(o)}
                        className="p-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye size={15} />
                        <span className="text-[10px] font-bold">Process</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-secondary font-semibold">
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
                  {selectedOrder.status === 'Ready' && (
                    <button 
                      onClick={() => {
                        setSelectedRider('Ramesh Kumar');
                        setShowRiderModal(true);
                      }}
                      className="bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-secondary cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={14} /> Assign Rider
                    </button>
                  )}
                  {selectedOrder.status === 'Assigned' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.orderId, 'Out For Delivery')}
                      className="bg-primary text-white font-bold py-2 rounded-xl text-xs hover:bg-secondary cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Truck size={14} /> Send Out For Delivery
                    </button>
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

      {/* RIDER ASSIGNMENT MODAL OVERLAY */}
      {showRiderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowRiderModal(false)} />
          <div className="bg-surface rounded-[28px] border border-divider p-6 max-w-sm w-full relative z-10 shadow-premium flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-text-primary uppercase">Assign Delivery Partner</h3>
            <p className="text-[11px] text-text-secondary leading-normal">Choose an active rider to dispatch ORD-74912 from the South Bengaluru store location.</p>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Select Partner</label>
              <select 
                value={selectedRider} 
                onChange={(e) => setSelectedRider(e.target.value)}
                className="px-3 py-2 border border-divider rounded-xl text-xs bg-background focus:outline-none focus:border-primary text-text-primary"
              >
                <option value="">-- Choose Rider --</option>
                <option value="Ramesh Kumar">🚴 Ramesh Kumar (Active • 0.8 km away)</option>
                <option value="Sumit Sharma">🚴 Sumit Sharma (Active • 1.2 km away)</option>
                <option value="Vijay Singh">🚴 Vijay Singh (Active • 2.5 km away)</option>
              </select>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button 
                onClick={handleAssignRider}
                disabled={!selectedRider}
                className="flex-1 bg-primary text-white font-bold py-2 rounded-full text-xs hover:bg-secondary cursor-pointer disabled:opacity-50"
              >
                Confirm Allocation
              </button>
              <button 
                onClick={() => setShowRiderModal(false)}
                className="flex-1 bg-background text-text-secondary border border-divider font-bold py-2 rounded-full text-xs hover:bg-surface cursor-pointer"
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
