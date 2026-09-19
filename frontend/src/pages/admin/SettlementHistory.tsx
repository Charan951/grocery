import React, { useEffect, useState } from 'react';
import { API_URL } from '../../config/api';
import { ShelfTag } from '../../components/admin/ShelfTag';
import { CheckCircle, Clock, Eye, Layers, Search, RefreshCw, X, Receipt } from 'lucide-react';

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface SettlementItem {
  _id: string;
  settlementId: string;
  deliveryPartner: { _id: string; name: string; email: string } | null;
  amount: number;
  orderCount: number;
  orderIds: string[];
  status: string;
  settledAt: string;
  settledBy: string;
}

export const SettlementHistory: React.FC = () => {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/delivery/settlements`, {
        headers: authHeader(),
      }).then((r) => r.json());
      if (res.success) {
        setSettlements(res.settlements || []);
      }
    } catch {
      /* ignore error */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/delivery/settlements/${id}`, {
        headers: authHeader(),
      }).then((r) => r.json());
      if (res.success) {
        setSelectedSettlement(res);
      }
    } catch {
      alert('Could not load settlement details');
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = settlements.filter(
    (s) =>
      s.settlementId.toLowerCase().includes(search.toLowerCase()) ||
      (s.deliveryPartner?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.deliveryPartner?.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
            <Receipt className="text-primary" size={20} />
            Partner Settlement History
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Review completed delivery partner payout settlements
          </p>
        </div>
        <button
          onClick={loadSettlements}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-divider text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 bg-surface border border-divider rounded-2xl px-3.5 py-2">
        <Search size={16} className="text-text-tertiary" />
        <input
          type="text"
          placeholder="Search by settlement ID, partner name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-text-primary focus:outline-none placeholder:text-text-tertiary"
        />
      </div>

      <div className="bg-surface border border-divider rounded-[28px] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-text-tertiary border-b border-divider">
                <th className="px-5 py-3 font-bold uppercase text-[11px] tracking-wide">Settlement ID</th>
                <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wide">Partner</th>
                <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wide text-right">Amount</th>
                <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wide text-center">Orders</th>
                <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wide">Date</th>
                <th className="px-4 py-3 font-bold uppercase text-[11px] tracking-wide">Status</th>
                <th className="px-5 py-3 font-bold uppercase text-[11px] tracking-wide text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary font-semibold">
                    Loading settlements...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary font-semibold">
                    No settlement records found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id} className="border-b border-divider last:border-0 hover:bg-background/60">
                    <td className="px-5 py-3 font-bold text-text-primary whitespace-nowrap">{s.settlementId}</td>
                    <td className="px-4 py-3 font-bold text-text-primary whitespace-nowrap">
                      {s.deliveryPartner?.name || 'Partner'}
                      {s.deliveryPartner?.email && (
                        <span className="block text-[11px] font-medium text-text-tertiary">{s.deliveryPartner.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-extrabold text-success text-right whitespace-nowrap">
                      ₹{s.amount}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-text-secondary">
                      {s.orderCount} orders
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {new Date(s.settledAt).toLocaleString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ShelfTag tone="green">
                        <CheckCircle size={10} className="inline mr-1" />
                        {s.status}
                      </ShelfTag>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openDetail(s.settlementId)}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-[11px] hover:bg-primary/20 transition-colors"
                      >
                        <Eye size={12} /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-divider rounded-[28px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-divider flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-text-primary flex items-center gap-2">
                  Settlement Details: <span className="text-primary">{selectedSettlement.settlement.settlementId}</span>
                </h3>
                <p className="text-xs text-text-secondary font-medium">
                  Processed on {new Date(selectedSettlement.settlement.settledAt).toLocaleString()} by{' '}
                  <b>{selectedSettlement.settlement.settledBy}</b>
                </p>
              </div>
              <button
                onClick={() => setSelectedSettlement(null)}
                className="p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-background"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-background rounded-2xl border border-divider">
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-tertiary">Partner</span>
                  <p className="text-xs font-bold text-text-primary truncate">
                    {selectedSettlement.settlement.deliveryPartner?.name || 'Partner'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-tertiary">Amount</span>
                  <p className="text-xs font-extrabold text-success tabular-nums">
                    ₹{selectedSettlement.settlement.amount}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-tertiary">Orders</span>
                  <p className="text-xs font-bold text-text-primary">{selectedSettlement.settlement.orderCount}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-tertiary">Status</span>
                  <div className="mt-0.5">
                    <ShelfTag tone="green">{selectedSettlement.settlement.status}</ShelfTag>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-xs text-text-secondary uppercase tracking-wider mb-2">
                  Included Orders & Earnings Breakdown
                </h4>
                <div className="border border-divider rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-background text-text-tertiary border-b border-divider">
                        <th className="px-3 py-2 font-bold uppercase text-[10px]">Order ID</th>
                        <th className="px-3 py-2 font-bold uppercase text-[10px] text-right">Base Pay</th>
                        <th className="px-3 py-2 font-bold uppercase text-[10px] text-right">Distance Pay</th>
                        <th className="px-3 py-2 font-bold uppercase text-[10px] text-right">Bonus</th>
                        <th className="px-3 py-2 font-bold uppercase text-[10px] text-right">Total</th>
                        <th className="px-3 py-2 font-bold uppercase text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSettlement.earnings || []).map((e: any) => (
                        <tr key={e._id} className="border-b border-divider last:border-0 hover:bg-background/40">
                          <td className="px-3 py-2 font-bold text-text-primary">{e.orderId}</td>
                          <td className="px-3 py-2 tabular-nums text-right text-text-secondary">₹{e.baseFee}</td>
                          <td className="px-3 py-2 tabular-nums text-right text-text-secondary">
                            {e.distanceKm} km (₹{e.distanceFee})
                          </td>
                          <td className="px-3 py-2 tabular-nums text-right text-text-secondary">₹{e.bonus || 0}</td>
                          <td className="px-3 py-2 tabular-nums font-extrabold text-right text-text-primary">
                            ₹{e.total}
                          </td>
                          <td className="px-3 py-2">
                            <ShelfTag tone="green">{e.status}</ShelfTag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementHistory;
