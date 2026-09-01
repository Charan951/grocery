import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { ShelfTag } from '../../components/admin/ShelfTag';

const API_URL = '/api';
const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-background border border-divider rounded-2xl p-3.5 flex flex-col gap-1">
    <span className="text-[9px] font-bold uppercase tracking-wide text-text-secondary">{label}</span>
    <span className="text-lg font-extrabold text-text-primary tabular-nums">{value}</span>
  </div>
);

export const PartnerDetail: React.FC = () => {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any | null>(null);
  const [settling, setSettling] = useState(false);
  const [err, setErr] = useState('');

  const loadEarnings = async () => {
    try {
      const e = await fetch(`${API_URL}/admin/delivery/partners/${userId}/earnings`, { headers: authHeader() }).then(r => r.json());
      if (e.success) setEarnings(e);
    } catch { /* keep last */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, d] = await Promise.all([
          fetch(`${API_URL}/admin/delivery/partners/${userId}/performance`, { headers: authHeader() }).then(r => r.json()),
          fetch(`${API_URL}/admin/delivery/partners/${userId}/deliveries?limit=50`, { headers: authHeader() }).then(r => r.json()),
        ]);
        if (!p.success) { setErr(p.message || 'Failed to load partner'); return; }
        setData(p);
        setDeliveries(d.success ? d.deliveries : []);
        loadEarnings();
      } catch {
        setErr('Network error');
      }
    })();
  }, [userId]);

  const settleAll = async () => {
    if (!window.confirm('Mark all pending earnings as settled (paid out)?')) return;
    setSettling(true);
    try {
      const r = await fetch(`${API_URL}/admin/delivery/partners/${userId}/earnings/settle`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: '{}',
      }).then(r => r.json());
      if (!r.success) alert(r.message || 'Settle failed');
      await loadEarnings();
    } catch {
      alert('Settle failed');
    } finally {
      setSettling(false);
    }
  };

  if (err) return <div className="p-6 text-error font-semibold text-sm">{err}</div>;
  if (!data) return <div className="p-6 text-text-secondary text-sm font-semibold">Loading…</div>;

  const { partner, performance } = data;
  const tone = (s: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' =>
    s === 'Delivered' ? 'green' : s === 'Failed' || s === 'Cancelled' ? 'red' : s === 'Ready' || s === 'Pending' ? 'amber' : 'blue';

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/admin/delivery')} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-bold w-fit cursor-pointer">
        <ArrowLeft size={14} /> Back to partners
      </button>

      <div className="bg-surface border border-divider rounded-[28px] shadow-card p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-extrabold text-base text-text-primary">{partner.name}</h2>
            <p className="text-[11px] text-text-secondary font-medium">{partner.email} • {partner.phone || '—'} • {partner.vehicleType}</p>
          </div>
          <div className="flex items-center gap-2">
            <ShelfTag tone={partner.accountStatus === 'Active' ? 'green' : 'red'}>{partner.accountStatus}</ShelfTag>
            <ShelfTag tone={partner.accountStatus === 'Suspended' ? 'red' : !partner.isOnline ? 'neutral' : partner.availability === 'busy' ? 'amber' : 'green'}>
              {partner.accountStatus === 'Suspended' ? 'Suspended' : !partner.isOnline ? 'Offline' : partner.availability === 'busy' ? 'On delivery' : 'Available'}
            </ShelfTag>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Rating" value={<span className="flex items-center gap-1"><Star size={14} className="text-warning" /> {Number(partner.rating).toFixed(1)}{partner.ratingCount ? ` (${partner.ratingCount})` : ''}</span>} />
          <Stat label="Lifetime done" value={performance.lifetimeCompleted} />
          <Stat label="Lifetime failed" value={performance.lifetimeFailed} />
          <Stat label="Acceptance" value={performance.acceptanceRate == null ? '—' : `${performance.acceptanceRate}%`} />
          <Stat label="Avg pickup" value={performance.avgPickupMins == null ? '—' : `${performance.avgPickupMins}m`} />
          <Stat label="Avg delivery" value={performance.avgDeliveryMins == null ? '—' : `${performance.avgDeliveryMins}m`} />
          <Stat label="Distance" value={partner.distanceKm == null ? '—' : `${partner.distanceKm} km`} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Offers received" value={performance.offered} />
          <Stat label="Accepted" value={performance.accepted} />
          <Stat label="Rejected" value={performance.rejected} />
          <Stat label="Expired" value={performance.expired} />
        </div>
      </div>

      {earnings && (
        <div className="bg-surface border border-divider rounded-[28px] shadow-card p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-text-primary">Earnings</h3>
            <button
              onClick={settleAll}
              disabled={settling || (earnings.summary.pendingTotal || 0) <= 0}
              className="bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] hover:bg-secondary disabled:opacity-40 cursor-pointer"
            >
              {settling ? 'Settling…' : 'Settle pending'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Lifetime" value={`₹${earnings.summary.lifetimeTotal}`} />
            <Stat label="Pending payout" value={<span className="text-warning">₹{earnings.summary.pendingTotal}</span>} />
            <Stat label="Settled" value={`₹${earnings.summary.settledTotal}`} />
            <Stat label="Deliveries paid" value={earnings.summary.count} />
          </div>
          {earnings.earnings.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-text-tertiary">
                    {['Order', 'Base', 'Distance', 'Total', 'Status', 'Earned'].map(h => (
                      <th key={h} className="p-2 border-b border-divider font-bold uppercase text-[9px] tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {earnings.earnings.slice(0, 30).map((e: any) => (
                    <tr key={e._id} className="border-b border-divider last:border-0">
                      <td className="p-2 font-bold text-text-primary">{e.orderId}</td>
                      <td className="p-2 tabular-nums text-text-secondary">₹{e.baseFee}</td>
                      <td className="p-2 tabular-nums text-text-secondary">{e.distanceKm} km · ₹{e.distanceFee}</td>
                      <td className="p-2 tabular-nums font-bold">₹{e.total}</td>
                      <td className="p-2"><ShelfTag tone={e.status === 'settled' ? 'green' : 'amber'}>{e.status}</ShelfTag></td>
                      <td className="p-2 text-text-secondary">{e.earnedAt ? new Date(e.earnedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-surface border border-divider rounded-[28px] shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-divider">
          <h3 className="font-extrabold text-sm text-text-primary">Delivery history ({deliveries.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-text-tertiary">
                {['Order', 'Status', 'Amount', 'Payment', 'Picked up', 'Delivered'].map(h => (
                  <th key={h} className="p-2.5 border-b border-divider font-bold uppercase text-[9px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliveries.map(o => (
                <tr key={o.orderId} className="border-b border-divider last:border-0 hover:bg-background/60">
                  <td className="p-2.5 font-bold text-text-primary">{o.orderId}</td>
                  <td className="p-2.5"><ShelfTag tone={tone(o.status)}>{o.status}</ShelfTag></td>
                  <td className="p-2.5 tabular-nums">₹{o.totalAmount}</td>
                  <td className="p-2.5 text-text-secondary">{o.paymentMethod} · {o.paymentStatus}</td>
                  <td className="p-2.5 text-text-secondary">{o.pickedUpAt ? new Date(o.pickedUpAt).toLocaleString() : '—'}</td>
                  <td className="p-2.5 text-text-secondary">{o.deliveredAt ? new Date(o.deliveredAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-text-secondary font-semibold">No deliveries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetail;
