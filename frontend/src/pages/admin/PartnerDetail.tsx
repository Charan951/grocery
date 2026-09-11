import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Gauge,
  Layers,
  Wallet,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { ShelfTag } from '../../components/admin/ShelfTag';
import { API_URL } from '../../config/api';

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const initialsOf = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';

/** An em dash that recedes instead of shouting on a page full of new partners. */
const Blank = () => <span className="text-text-tertiary">—</span>;

/**
 * De-boxed metric cell. Sits in a shared hairline grid — no nested cards, no
 * per-cell border or fill. Hierarchy comes from weight and one larger value.
 */
const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  lead?: boolean;
}> = ({ label, value, hint, lead }) => (
  <div className="border-b border-r border-divider px-4 py-3.5 flex flex-col gap-1">
    <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-text-secondary">
      {label}
    </span>
    <span
      className={`tabular-nums font-extrabold text-text-primary leading-none ${
        lead ? 'text-2xl' : 'text-lg'
      }`}
    >
      {value}
    </span>
    {hint ? <span className="text-[11px] font-medium text-text-tertiary">{hint}</span> : null}
  </div>
);

const MetricGrid: React.FC<{ cols: string; children: React.ReactNode }> = ({ cols, children }) => (
  <div className={`grid ${cols} rounded-2xl border-t border-l border-divider bg-surface overflow-hidden`}>
    {children}
  </div>
);

const SectionHead: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="flex items-center justify-between gap-3">
    <h3 className="flex items-center gap-2 font-extrabold text-sm text-text-primary">
      <span className="text-primary">{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

/** Offer outcomes as one proportional bar — the funnel is the content here. */
const OfferFunnel: React.FC<{
  offered: number;
  accepted: number;
  rejected: number;
  expired: number;
}> = ({ offered, accepted, rejected, expired }) => {
  const total = Math.max(offered, accepted + rejected + expired, 0);
  if (total === 0) {
    return (
      <p className="text-xs text-text-tertiary font-medium">No offers routed to this partner yet.</p>
    );
  }
  const pct = (n: number) => `${(n / total) * 100}%`;
  const pending = Math.max(total - accepted - rejected - expired, 0);
  const legend: [string, number, string][] = [
    ['Accepted', accepted, 'bg-success'],
    ['Rejected', rejected, 'bg-error'],
    ['Expired', expired, 'bg-warning'],
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-background">
        <span className="bg-success" style={{ width: pct(accepted) }} />
        <span className="bg-error" style={{ width: pct(rejected) }} />
        <span className="bg-warning" style={{ width: pct(expired) }} />
        {pending > 0 && <span className="bg-transparent" style={{ width: pct(pending) }} />}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          {offered} offered
        </span>
        {legend.map(([label, n, dot]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label} <b className="text-text-primary tabular-nums">{n}</b>
          </span>
        ))}
      </div>
    </div>
  );
};

const shortDT = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

const PANEL = 'bg-surface border border-divider rounded-[28px] shadow-card';

export const PartnerDetail: React.FC = () => {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any | null>(null);
  const [settling, setSettling] = useState(false);
  const [allZones, setAllZones] = useState<{ _id: string; name: string; active: boolean }[]>([]);
  const [partnerZones, setPartnerZones] = useState<string[]>([]);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [err, setErr] = useState('');

  const loadEarnings = async () => {
    try {
      const e = await fetch(`${API_URL}/admin/delivery/partners/${userId}/earnings`, {
        headers: authHeader(),
      }).then((r) => r.json());
      if (e.success) setEarnings(e);
    } catch {
      /* keep last */
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [p, d] = await Promise.all([
          fetch(`${API_URL}/admin/delivery/partners/${userId}/performance`, {
            headers: authHeader(),
          }).then((r) => r.json()),
          fetch(`${API_URL}/admin/delivery/partners/${userId}/deliveries?limit=50`, {
            headers: authHeader(),
          }).then((r) => r.json()),
        ]);
        if (!p.success) {
          setErr(p.message || 'Failed to load partner');
          return;
        }
        setData(p);
        setDeliveries(d.success ? d.deliveries : []);
        setPartnerZones(p.partner?.zones || []);
        setMaxConcurrent(p.partner?.maxConcurrent || 1);
        loadEarnings();
        fetch(`${API_URL}/admin/delivery/zones`, { headers: authHeader() })
          .then((r) => r.json())
          .then((z) => {
            if (z.success) setAllZones(z.zones);
          })
          .catch(() => {});
      } catch {
        setErr('Network error');
      }
    })();
  }, [userId]);

  const saveZones = async () => {
    setZoneSaving(true);
    try {
      const r = await fetch(`${API_URL}/admin/delivery/partners/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ zones: partnerZones, maxConcurrent }),
      }).then((r) => r.json());
      if (!r.success) alert(r.message || 'Could not save');
    } catch {
      alert('Could not save');
    } finally {
      setZoneSaving(false);
    }
  };

  const settleAll = async () => {
    if (!window.confirm('Mark all pending earnings as settled (paid out)?')) return;
    setSettling(true);
    try {
      const r = await fetch(`${API_URL}/admin/delivery/partners/${userId}/earnings/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: '{}',
      }).then((r) => r.json());
      if (!r.success) alert(r.message || 'Settle failed');
      await loadEarnings();
    } catch {
      alert('Settle failed');
    } finally {
      setSettling(false);
    }
  };

  const BackLink = (
    <button
      onClick={() => navigate('/admin/delivery')}
      className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-xs font-bold w-fit cursor-pointer"
    >
      <ArrowLeft size={14} /> Back to partners
    </button>
  );

  if (err) {
    return (
      <div className="flex flex-col gap-6">
        {BackLink}
        <div className={`${PANEL} p-10 flex flex-col items-center text-center gap-2`}>
          <AlertTriangle size={22} className="text-error" />
          <p className="text-sm font-extrabold text-text-primary">Couldn't load this partner</p>
          <p className="text-xs text-text-secondary font-medium">{err}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        {BackLink}
        <div className={`${PANEL} p-6 flex flex-col gap-5`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-divider animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-40 rounded bg-divider animate-pulse" />
              <div className="h-3 w-56 rounded bg-divider animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-divider/60 animate-pulse" />
            ))}
          </div>
        </div>
        <div className={`${PANEL} p-6 h-40 bg-divider/20 animate-pulse`} />
      </div>
    );
  }

  const { partner, performance } = data;
  const tone = (s: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' =>
    s === 'Delivered'
      ? 'green'
      : s === 'Failed' || s === 'Cancelled'
        ? 'red'
        : s === 'Ready' || s === 'Pending'
          ? 'amber'
          : 'blue';

  const availTone =
    partner.accountStatus === 'Suspended'
      ? 'red'
      : !partner.isOnline
        ? 'neutral'
        : partner.availability === 'busy'
          ? 'amber'
          : 'green';
  const availLabel =
    partner.accountStatus === 'Suspended'
      ? 'Suspended'
      : !partner.isOnline
        ? 'Offline'
        : partner.availability === 'busy'
          ? 'On delivery'
          : 'Available';

  const pendingPayout = Number(earnings?.summary?.pendingTotal || 0);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {BackLink}

      {/* Identity + performance */}
      <div className={`${PANEL} p-5 sm:p-6 flex flex-col gap-5`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-base shrink-0 select-none">
            {initialsOf(partner.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-lg text-text-primary truncate leading-tight">
                {partner.name}
              </h2>
              {partner.isOnline && partner.accountStatus !== 'Suspended' && (
                <span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden />
              )}
              <ShelfTag tone={partner.accountStatus === 'Active' ? 'green' : 'red'}>
                {partner.accountStatus}
              </ShelfTag>
              <ShelfTag tone={availTone}>{availLabel}</ShelfTag>
            </div>
            <p className="text-xs text-text-secondary font-medium mt-1 truncate">
              {partner.email} &nbsp;·&nbsp; {partner.phone || 'no phone'} &nbsp;·&nbsp;{' '}
              <span className="capitalize">{partner.vehicleType}</span>
            </p>
          </div>
        </div>

        <MetricGrid cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <Metric
            label="Rating"
            lead
            value={
              <span className="flex items-center gap-1.5">
                <Star size={16} className="text-warning fill-warning" />
                {partner.ratingCount ? Number(partner.rating).toFixed(1) : <Blank />}
              </span>
            }
            hint={partner.ratingCount ? `${partner.ratingCount} rated` : 'no ratings yet'}
          />
          <Metric label="Lifetime delivered" lead value={performance.lifetimeCompleted} />
          <Metric
            label="Lifetime failed"
            lead
            value={
              performance.lifetimeFailed > 0 ? (
                <span className="text-error">{performance.lifetimeFailed}</span>
              ) : (
                0
              )
            }
          />
          <Metric
            label="Distance covered"
            lead
            value={partner.distanceKm == null ? <Blank /> : `${partner.distanceKm} km`}
          />
          <Metric
            label="Acceptance"
            value={
              performance.acceptanceRate == null ? <Blank /> : `${performance.acceptanceRate}%`
            }
          />
          <Metric
            label="Avg pickup"
            value={performance.avgPickupMins == null ? <Blank /> : `${performance.avgPickupMins}m`}
          />
          <Metric
            label="Avg delivery"
            value={
              performance.avgDeliveryMins == null ? <Blank /> : `${performance.avgDeliveryMins}m`
            }
          />
          <Metric
            label="Live capacity"
            value={
              <span>
                {partner.activeOrderIds?.length ?? 0}
                <span className="text-text-tertiary font-bold"> / {maxConcurrent}</span>
              </span>
            }
          />
        </MetricGrid>

        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-text-secondary">
            Offer response
          </span>
          <OfferFunnel
            offered={performance.offered}
            accepted={performance.accepted}
            rejected={performance.rejected}
            expired={performance.expired}
          />
        </div>
      </div>

      {/* Zones & capacity */}
      <div className={`${PANEL} p-5 sm:p-6 flex flex-col gap-4`}>
        <SectionHead icon={<Layers size={15} />} title="Zones & capacity" />
        <label className="flex items-center gap-2.5 text-xs text-text-secondary font-semibold">
          Max concurrent deliveries
          <input
            type="number"
            min={1}
            max={5}
            value={maxConcurrent}
            onChange={(e) =>
              setMaxConcurrent(Math.min(5, Math.max(1, Number(e.target.value) || 1)))
            }
            className="w-16 px-2.5 py-1.5 border border-divider rounded-xl text-xs bg-background focus:border-primary text-text-primary font-bold tabular-nums"
          />
        </label>
        {allZones.length === 0 ? (
          <p className="text-xs text-text-tertiary font-medium">
            No zones defined yet — add them from the Delivery Partners page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allZones.map((z) => {
              const on = partnerZones.includes(z._id);
              return (
                <button
                  key={z._id}
                  onClick={() =>
                    setPartnerZones((p) => (on ? p.filter((x) => x !== z._id) : [...p, z._id]))
                  }
                  className={`rounded-full px-3 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                    on
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'border-divider text-text-secondary hover:border-text-tertiary'
                  }`}
                >
                  {z.name}
                  {!z.active && ' (off)'}
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={saveZones}
          disabled={zoneSaving}
          className="self-start bg-primary text-white font-bold py-2 px-5 rounded-full text-[11px] hover:bg-secondary disabled:opacity-40 cursor-pointer transition-colors"
        >
          {zoneSaving ? 'Saving…' : 'Save zones & capacity'}
        </button>
      </div>

      {/* Earnings */}
      {earnings && (
        <div className={`${PANEL} p-5 sm:p-6 flex flex-col gap-4`}>
          <SectionHead icon={<Wallet size={15} />} title="Earnings">
            <button
              onClick={settleAll}
              disabled={settling || pendingPayout <= 0}
              className="bg-primary text-white font-bold py-2 px-5 rounded-full text-[11px] hover:bg-secondary disabled:opacity-40 cursor-pointer transition-colors"
            >
              {settling ? 'Settling…' : 'Settle pending'}
            </button>
          </SectionHead>

          <MetricGrid cols="grid-cols-2 sm:grid-cols-4">
            <Metric label="Lifetime earned" lead value={`₹${earnings.summary.lifetimeTotal}`} />
            <Metric
              label="Pending payout"
              lead
              value={
                pendingPayout > 0 ? (
                  <span className="text-warning">₹{earnings.summary.pendingTotal}</span>
                ) : (
                  '₹0'
                )
              }
            />
            <Metric label="Settled" lead value={`₹${earnings.summary.settledTotal}`} />
            <Metric label="Deliveries paid" lead value={earnings.summary.count} />
          </MetricGrid>

          {earnings.earnings.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-text-tertiary">
                    <th className="px-2 py-2 border-b border-divider font-bold uppercase text-[11px] tracking-wide">
                      Order
                    </th>
                    {['Base', 'Distance', 'Total'].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2 border-b border-divider font-bold uppercase text-[11px] tracking-wide text-right"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-2 py-2 border-b border-divider font-bold uppercase text-[11px] tracking-wide">
                      Status
                    </th>
                    <th className="px-2 py-2 border-b border-divider font-bold uppercase text-[11px] tracking-wide text-right">
                      Earned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.earnings.slice(0, 30).map((e: any) => (
                    <tr key={e._id} className="border-b border-divider last:border-0 hover:bg-background/60">
                      <td className="px-2 py-2 font-bold text-text-primary whitespace-nowrap">
                        {e.orderId}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-text-secondary text-right">
                        ₹{e.baseFee}
                      </td>
                      <td className="px-2 py-2 tabular-nums text-text-secondary text-right whitespace-nowrap">
                        {e.distanceKm} km · ₹{e.distanceFee}
                      </td>
                      <td className="px-2 py-2 tabular-nums font-extrabold text-text-primary text-right">
                        ₹{e.total}
                      </td>
                      <td className="px-2 py-2">
                        <ShelfTag tone={e.status === 'settled' ? 'green' : 'amber'}>
                          {e.status}
                        </ShelfTag>
                      </td>
                      <td className="px-2 py-2 text-text-secondary text-right whitespace-nowrap">
                        {e.earnedAt ? new Date(e.earnedAt).toLocaleDateString() : <Blank />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary font-medium">
              No settled or pending earnings yet.
            </p>
          )}
        </div>
      )}

      {/* Delivery history */}
      <div className={`${PANEL} overflow-hidden`}>
        <div className="px-5 sm:px-6 py-4 border-b border-divider">
          <SectionHead
            icon={<ClipboardList size={15} />}
            title={`Delivery history (${deliveries.length})`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-text-tertiary">
                <th className="px-4 sm:px-5 py-2.5 border-b border-divider font-bold uppercase text-[11px] tracking-wide">
                  Order
                </th>
                <th className="px-2 py-2.5 border-b border-divider font-bold uppercase text-[11px] tracking-wide">
                  Status
                </th>
                <th className="px-2 py-2.5 border-b border-divider font-bold uppercase text-[11px] tracking-wide text-right">
                  Amount
                </th>
                <th className="px-2 py-2.5 border-b border-divider font-bold uppercase text-[11px] tracking-wide">
                  Payment
                </th>
                <th className="px-2 py-2.5 border-b border-divider font-bold uppercase text-[11px] tracking-wide whitespace-nowrap">
                  Picked up
                </th>
                <th className="px-4 sm:px-5 py-2.5 border-b border-divider font-bold uppercase text-[11px] tracking-wide whitespace-nowrap">
                  Delivered
                </th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((o) => (
                <tr key={o.orderId} className="border-b border-divider last:border-0 hover:bg-background/60">
                  <td className="px-4 sm:px-5 py-2.5 font-bold text-text-primary whitespace-nowrap">
                    {o.orderId}
                  </td>
                  <td className="px-2 py-2.5">
                    <ShelfTag tone={tone(o.status)}>{o.status}</ShelfTag>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-text-primary text-right">
                    ₹{o.totalAmount}
                  </td>
                  <td className="px-2 py-2.5 text-text-secondary whitespace-nowrap">
                    {o.paymentMethod} · {o.paymentStatus}
                  </td>
                  <td className="px-2 py-2.5 text-text-secondary whitespace-nowrap">
                    {shortDT(o.pickedUpAt) || <Blank />}
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-text-secondary whitespace-nowrap">
                    {shortDT(o.deliveredAt) || <Blank />}
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-tertiary font-semibold">
                    No deliveries yet.
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

export default PartnerDetail;
