import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import {
  ArrowLeft, RotateCcw, Repeat2, UserPlus, RefreshCw, XCircle, CheckCircle2, Wallet, CreditCard,
  AlertCircle, Search, Image as ImageIcon, X,
} from 'lucide-react';
import { PageHeader } from '../../components/admin/PageHeader';
import { ShelfTag } from '../../components/admin/ShelfTag';
import { API_URL, SOCKET_URL } from '../../config/api';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

interface Refund { amount: number; method: 'wallet' | 'original'; status: string; dueAt?: string; processedAt?: string; reference?: string; failureReason?: string }
interface ReturnRow {
  returnId: string; orderId: string; type: 'return' | 'exchange'; status: string;
  customerName?: string; customerPhone?: string;
  items: { productId: string; name: string; price: number; quantity: number; image?: string }[];
  reasonLabel: string; comment?: string; photos?: string[]; proofPhotos?: string[]; proofNote?: string;
  pickupAddress?: string; partnerName?: string; partnerUserId?: string | null;
  dispatchStalled?: boolean; liveOffers?: number;
  offers?: { partnerName?: string; status: string; attempt: number; distanceMeters?: number; offeredAt?: string; source?: string }[];
  refund: Refund; rejectionReason?: string; failureReason?: string;
  timeline: { status: string; note?: string; at?: string }[];
  createdAt: string; pickedUpAt?: string; completedAt?: string;
}

const STATUS_TABS = ['All', 'Requested', 'Assigned', 'Arrived', 'Picked Up', 'Completed', 'Pickup Failed', 'Rejected', 'Cancelled'];

const statusTone = (s: string): Tone => ({
  Requested: 'blue', Assigned: 'amber', Arrived: 'amber', 'Picked Up': 'amber',
  Completed: 'green', 'Pickup Failed': 'red', Rejected: 'red', Cancelled: 'neutral',
} as Record<string, Tone>)[s] || 'neutral';

const refundTone = (s: string): Tone => (s === 'processed' ? 'green' : s === 'failed' ? 'red' : s === 'none' ? 'neutral' : 'amber');

const fmt = (raw?: string) => raw
  ? new Date(raw).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—';

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('freshcart_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function adminCall<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export const Returns: React.FC = () => {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [refundsDue, setRefundsDue] = useState(0);
  const [tab, setTab] = useState('All');
  const [type, setType] = useState<'' | 'return' | 'exchange'>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab !== 'All') params.set('status', tab);
      if (type) params.set('type', type);
      if (q.trim()) params.set('q', q.trim());
      const data = await adminCall(`/admin/returns?${params}`);
      setRows(data.returns);
      setCounts(data.counts || {});
      setRefundsDue(data.refundsDue || 0);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, type, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Live: new requests, dispatch progress and partner steps.
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const s = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'], auth: { token } });
    s.on('return_update', load);
    s.on('return_stalled', load);
    return () => { s.disconnect(); };
  }, [load]);

  if (selectedId) {
    return <ReturnDetail returnId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const needsAction = (counts['Requested'] || 0) + (counts['Pickup Failed'] || 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Returns & Exchanges"
        description="Customer return and exchange requests on delivered orders. Pickups go out to nearby partners the same way order offers do. Refunds are sent automatically 24 hours after pickup."
        actions={
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-admin-ledger-line bg-admin-surface text-xs font-bold text-admin-text hover:bg-admin-paper cursor-pointer">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Awaiting pickup', value: needsAction, hint: 'Requested + failed pickups' },
          { label: 'In progress', value: (counts['Assigned'] || 0) + (counts['Arrived'] || 0) + (counts['Picked Up'] || 0), hint: 'With a partner' },
          { label: 'Refunds pending', value: refundsDue, hint: 'Scheduled or failed' },
          { label: 'Completed', value: counts['Completed'] || 0, hint: 'Back at store' },
        ].map((k) => (
          <div key={k.label} className="bg-admin-surface border border-admin-ledger-line rounded-lg p-4">
            <span className="admin-label block">{k.label}</span>
            <span className="block font-admin-display text-2xl font-bold text-admin-text tabular-nums mt-1">{k.value}</span>
            <span className="block text-[11px] text-admin-text-faint mt-0.5">{k.hint}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-1 bg-admin-surface p-1 rounded-md border border-admin-ledger-line max-w-fit font-admin-mono">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded text-[11px] font-semibold uppercase tracking-wide transition-all cursor-pointer ${tab === t ? 'bg-admin-ink text-white' : 'text-admin-text-muted hover:text-admin-text'}`}
            >
              {t}{t !== 'All' && counts[t] ? ` · ${counts[t]}` : ''}
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            aria-label="Type"
            className="px-3 py-2 border border-admin-ledger-line rounded-lg text-xs bg-admin-surface text-admin-text"
          >
            <option value="">All types</option>
            <option value="return">Returns</option>
            <option value="exchange">Exchanges</option>
          </select>
          <label className="relative">
            <span className="sr-only">Search</span>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Return / order ID, customer"
              className="pl-8 pr-3 py-2 border border-admin-ledger-line rounded-lg text-xs bg-admin-surface text-admin-text w-56"
            />
          </label>
        </div>
      </div>

      {error && <div className="text-xs font-semibold text-admin-red flex items-center gap-1.5"><AlertCircle size={14} /> {error}</div>}

      <div className="bg-admin-surface border border-admin-ledger-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="font-admin-mono">
                {['Return', 'Order', 'Customer', 'Items / Issue', 'Partner', 'Refund', 'Status', 'Raised'].map((h) => (
                  <th key={h} className="p-3.5 bg-admin-paper border-b border-admin-ledger-line font-semibold text-admin-text-faint uppercase text-[11px] tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.returnId}
                  onClick={() => setSelectedId(r.returnId)}
                  className="hover:bg-admin-paper/70 transition-colors border-b border-admin-ledger-line last:border-b-0 cursor-pointer"
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-2 font-admin-mono font-semibold text-admin-text whitespace-nowrap">
                      {r.type === 'exchange' ? <Repeat2 size={13} className="text-admin-text-muted" /> : <RotateCcw size={13} className="text-admin-text-muted" />}
                      {r.returnId}
                    </div>
                    <div className="text-[11px] text-admin-text-faint capitalize">{r.type}</div>
                  </td>
                  <td className="p-3.5 font-admin-mono text-admin-text-muted whitespace-nowrap">{r.orderId}</td>
                  <td className="p-3.5">
                    <div className="font-semibold text-admin-text">{r.customerName || '—'}</div>
                    <div className="font-admin-mono text-[11px] text-admin-text-faint">{r.customerPhone}</div>
                  </td>
                  <td className="p-3.5 max-w-[240px]">
                    <div className="font-medium text-admin-text truncate">{r.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</div>
                    <div className="text-[11px] text-admin-text-muted truncate">{r.reasonLabel}</div>
                  </td>
                  <td className="p-3.5 text-admin-text-muted font-medium whitespace-nowrap">
                    {r.partnerName || (r.status === 'Requested'
                      ? (r.dispatchStalled ? <ShelfTag tone="red">Needs manual</ShelfTag> : r.liveOffers ? `Offered to ${r.liveOffers}` : 'Dispatching…')
                      : '—')}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {r.type === 'return' ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-admin-mono font-semibold text-admin-text tabular-nums">₹{r.refund.amount}</span>
                        {r.refund.status !== 'none' && <ShelfTag tone={refundTone(r.refund.status)}>{r.refund.status}</ShelfTag>}
                      </div>
                    ) : <span className="text-admin-text-faint">—</span>}
                  </td>
                  <td className="p-3.5"><ShelfTag tone={statusTone(r.status)}>{r.status}</ShelfTag></td>
                  <td className="p-3.5 text-admin-text-muted whitespace-nowrap">{fmt(r.createdAt)}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-admin-text-muted">No return or exchange requests match these filters.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={8} className="p-10 text-center text-admin-text-faint">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const ReturnDetail: React.FC<{ returnId: string; onBack: () => void }> = ({ returnId, onBack }) => {
  const [rr, setRr] = useState<ReturnRow | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await adminCall(`/admin/returns/${encodeURIComponent(returnId)}`);
      setRr(d.returnRequest);
      setOrder(d.order);
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    }
  }, [returnId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    const s = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'], auth: { token } });
    s.on('return_update', (p: any) => { if (p?.returnId === returnId) load(); });
    return () => { s.disconnect(); };
  }, [returnId, load]);

  const openAssign = async () => {
    setAssignOpen(true);
    try {
      const d = await adminCall('/admin/delivery/partners');
      const rank = (p: any) => (p.accountStatus === 'Suspended' ? 3 : !p.isOnline ? 2 : p.availability === 'busy' ? 1 : 0);
      setPartners([...(d.partners || [])].sort((a, b) => rank(a) - rank(b)));
    } catch { setPartners([]); }
  };

  const act = async (key: string, path: string, body?: any, okText?: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const d = await adminCall(`/admin/returns/${encodeURIComponent(returnId)}/${path}`, {
        method: 'POST', body: body ? JSON.stringify(body) : undefined,
      });
      if (d.returnRequest) setRr(d.returnRequest);
      await load();
      setMsg({ tone: 'ok', text: okText || 'Done' });
      return true;
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
      return false;
    } finally {
      setBusy('');
    }
  };

  const offerSummary = useMemo(() => {
    const o = rr?.offers || [];
    return {
      live: o.filter((x) => x.status === 'offered').length,
      declined: o.filter((x) => x.status === 'rejected').length,
      expired: o.filter((x) => x.status === 'expired').length,
    };
  }, [rr]);

  if (!rr) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={onBack} className="self-start flex items-center gap-1.5 text-xs font-bold text-admin-text-muted hover:text-admin-text cursor-pointer"><ArrowLeft size={14} /> Back to returns</button>
        <div className="text-xs text-admin-text-faint">{msg?.text || 'Loading…'}</div>
      </div>
    );
  }

  const canAssign = ['Requested', 'Pickup Failed'].includes(rr.status);
  const canReject = ['Requested', 'Assigned', 'Arrived', 'Pickup Failed'].includes(rr.status);
  const canComplete = rr.status === 'Picked Up';
  const canRefund = rr.type === 'return' && ['scheduled', 'failed'].includes(rr.refund.status);
  const total = rr.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <button onClick={onBack} className="self-start flex items-center gap-1.5 text-xs font-bold text-admin-text-muted hover:text-admin-text cursor-pointer"><ArrowLeft size={14} /> Back to returns</button>

      <PageHeader
        eyebrow={`${rr.type === 'exchange' ? 'Exchange' : 'Return'} · Order ${rr.orderId}`}
        title={rr.returnId}
        description={`${rr.reasonLabel}${rr.comment ? ` — “${rr.comment}”` : ''}`}
        actions={<ShelfTag tone={statusTone(rr.status)}>{rr.status}</ShelfTag>}
      />

      {msg && (
        <div className={`text-xs font-semibold flex items-center gap-1.5 ${msg.tone === 'ok' ? 'text-admin-green' : 'text-admin-red'}`}>
          {msg.tone === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {msg.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canAssign && (
          <button onClick={openAssign} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-admin-ink text-white text-xs font-bold hover:opacity-90 cursor-pointer">
            <UserPlus size={13} /> Assign partner
          </button>
        )}
        {canAssign && (
          <button disabled={!!busy} onClick={() => act('requeue', 'requeue', undefined, 'Pickup offers sent to nearby partners')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-admin-ledger-line bg-admin-surface text-xs font-bold text-admin-text hover:bg-admin-paper cursor-pointer disabled:opacity-50">
            <RefreshCw size={13} /> {busy === 'requeue' ? 'Dispatching…' : 'Re-dispatch to nearby'}
          </button>
        )}
        {canComplete && (
          <button disabled={!!busy} onClick={() => act('complete', 'complete', undefined, 'Marked received at store')} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-admin-ledger-line bg-admin-surface text-xs font-bold text-admin-text hover:bg-admin-paper cursor-pointer disabled:opacity-50">
            <CheckCircle2 size={13} /> Mark received at store
          </button>
        )}
        {canRefund && (
          <button
            disabled={!!busy}
            onClick={() => window.confirm(`Transfer ₹${rr.refund.amount} now instead of waiting for the scheduled time?`) && act('refund', 'refund', undefined, 'Refund transferred')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-admin-green text-white text-xs font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            <Wallet size={13} /> {busy === 'refund' ? 'Transferring…' : rr.refund.status === 'failed' ? 'Retry refund' : 'Refund now'}
          </button>
        )}
        {canReject && (
          <button onClick={() => setRejectOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-admin-red/40 text-admin-red bg-admin-surface text-xs font-bold hover:bg-admin-red-soft cursor-pointer">
            <XCircle size={13} /> Reject request
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items + evidence */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-5">
            <h2 className="admin-label mb-3">Items</h2>
            <ul className="divide-y divide-admin-ledger-line">
              {rr.items.map((i) => (
                <li key={i.productId} className="py-2.5 flex items-center gap-3 text-xs">
                  {i.image ? <img src={i.image} alt="" className="w-10 h-10 rounded object-cover bg-admin-paper" /> : <span className="w-10 h-10 rounded bg-admin-paper" />}
                  <span className="flex-1 font-semibold text-admin-text">{i.name}</span>
                  <span className="font-admin-mono text-admin-text-muted">₹{i.price} × {i.quantity}</span>
                  <span className="font-admin-mono font-semibold text-admin-text w-16 text-right tabular-nums">₹{i.price * i.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-3 border-t border-admin-ledger-line text-xs font-semibold text-admin-text">
              <span>Item value</span><span className="font-admin-mono tabular-nums">₹{total}</span>
            </div>
          </div>

          <PhotoStrip title="Customer photos" photos={rr.photos || []} empty="No photos attached" onOpen={setLightbox} />
          <PhotoStrip
            title="Pickup proof (partner)"
            photos={rr.proofPhotos || []}
            empty={rr.pickedUpAt ? 'No proof photos' : 'Available once the partner collects the item(s)'}
            note={rr.proofNote}
            onOpen={setLightbox}
          />
        </section>

        {/* Side: dispatch, refund, order, timeline */}
        <aside className="flex flex-col gap-4">
          <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-5 text-xs flex flex-col gap-2">
            <h2 className="admin-label">Pickup</h2>
            <p className="text-admin-text font-semibold">{rr.customerName} · <span className="font-admin-mono">{rr.customerPhone}</span></p>
            <p className="text-admin-text-muted">{rr.pickupAddress}</p>
            <div className="border-t border-admin-ledger-line pt-2 mt-1">
              <p className="text-admin-text"><span className="text-admin-text-muted">Partner: </span>{rr.partnerName || 'Not assigned'}</p>
              {rr.status === 'Requested' && (
                <p className="text-admin-text-muted mt-1">
                  {rr.dispatchStalled ? <span className="text-admin-red font-semibold">No partner accepted. Assign one manually.</span>
                    : `Live offers: ${offerSummary.live} · declined ${offerSummary.declined} · expired ${offerSummary.expired}`}
                </p>
              )}
              {rr.failureReason && rr.status === 'Pickup Failed' && <p className="text-admin-red font-semibold mt-1">{rr.failureReason}</p>}
              {rr.rejectionReason && <p className="text-admin-red font-semibold mt-1">{rr.rejectionReason}</p>}
            </div>
          </div>

          {rr.type === 'return' && (
            <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-5 text-xs flex flex-col gap-2">
              <h2 className="admin-label">Refund</h2>
              <div className="flex items-center justify-between">
                <span className="font-admin-display text-xl font-bold text-admin-text tabular-nums">₹{rr.refund.amount}</span>
                <ShelfTag tone={refundTone(rr.refund.status)}>{rr.refund.status === 'none' ? 'after pickup' : rr.refund.status}</ShelfTag>
              </div>
              <p className="flex items-center gap-1.5 text-admin-text-muted">
                {rr.refund.method === 'wallet' ? <Wallet size={13} /> : <CreditCard size={13} />}
                {rr.refund.method === 'wallet' ? 'FreshCart wallet' : 'Original payment method'}
              </p>
              {rr.refund.dueAt && rr.refund.status !== 'processed' && <p className="text-admin-text-muted">Auto-transfer at {fmt(rr.refund.dueAt)}</p>}
              {rr.refund.processedAt && <p className="text-admin-text-muted">Transferred {fmt(rr.refund.processedAt)}</p>}
              {rr.refund.reference && <p className="font-admin-mono text-[11px] text-admin-text-faint break-all">{rr.refund.reference}</p>}
              {rr.refund.failureReason && <p className="text-admin-red font-semibold">{rr.refund.failureReason}</p>}
            </div>
          )}

          {order && (
            <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-5 text-xs flex flex-col gap-1.5">
              <h2 className="admin-label">Original order</h2>
              <p className="text-admin-text"><span className="text-admin-text-muted">Total: </span><span className="font-admin-mono">₹{order.totalAmount}</span></p>
              <p className="text-admin-text"><span className="text-admin-text-muted">Payment: </span>{order.paymentMethod} · {order.paymentStatus}</p>
              <p className="text-admin-text"><span className="text-admin-text-muted">Delivered: </span>{fmt(order.deliveredAt)}</p>
              <p className="text-admin-text"><span className="text-admin-text-muted">Delivered by: </span>{order.deliveryPartnerName || '—'}</p>
            </div>
          )}

          <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-5">
            <h2 className="admin-label mb-3">Timeline</h2>
            <ol className="flex flex-col">
              {rr.timeline.map((t, i, arr) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-2 h-2 rounded-full bg-admin-green shrink-0 mt-1.5" />
                    {i !== arr.length - 1 && <span className="w-px flex-1 min-h-[18px] bg-admin-ledger-line" />}
                  </div>
                  <div className="pb-3 min-w-0 text-xs">
                    <p className="font-semibold text-admin-text">{t.status}</p>
                    {t.note && <p className="text-admin-text-muted leading-relaxed">{t.note}</p>}
                    <p className="font-admin-mono text-[10px] text-admin-text-faint mt-0.5">{fmt(t.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {assignOpen && createPortal(
        <Modal onClose={() => !busy && setAssignOpen(false)} title="Assign pickup partner">
          <p className="text-xs text-admin-text-muted leading-normal">
            Assigns <b>{rr.returnId}</b> directly to this partner. It shows up in their app straight away and any live offers are withdrawn.
          </p>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            aria-label="Partner"
            className="px-3 py-2 border border-admin-ledger-line rounded-lg text-xs bg-admin-paper text-admin-text"
          >
            <option value="">-- Choose partner --</option>
            {partners.map((p) => {
              const state = p.accountStatus === 'Suspended' ? 'suspended' : !p.isOnline ? 'offline' : p.availability === 'busy' ? 'busy' : 'available';
              return (
                <option key={p.userId} value={p.userId} disabled={p.accountStatus === 'Suspended'}>
                  {p.name} — {state} • {p.activeOrderIds?.length || 0}/{p.maxConcurrent || 1} active
                </option>
              );
            })}
          </select>
          <div className="flex gap-2.5 mt-1">
            <button
              disabled={!partnerId || !!busy}
              onClick={async () => { if (await act('assign', 'assign', { partnerUserId: partnerId }, 'Partner assigned')) setAssignOpen(false); }}
              className="flex-1 bg-admin-ink text-white font-bold py-2 rounded-lg text-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {busy === 'assign' ? 'Assigning…' : 'Assign'}
            </button>
            <button onClick={() => setAssignOpen(false)} className="flex-1 bg-admin-paper text-admin-text-muted border border-admin-ledger-line font-bold py-2 rounded-lg text-xs cursor-pointer">Cancel</button>
          </div>
        </Modal>,
        document.body
      )}

      {rejectOpen && createPortal(
        <Modal onClose={() => !busy && setRejectOpen(false)} title="Reject request">
          <p className="text-xs text-admin-text-muted leading-normal">The customer sees this reason. Any assigned partner is released.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. Item is outside the return policy (opened perishable)"
            className="px-3 py-2 border border-admin-ledger-line rounded-lg text-xs bg-admin-paper text-admin-text resize-none"
          />
          <div className="flex gap-2.5 mt-1">
            <button
              disabled={!rejectReason.trim() || !!busy}
              onClick={async () => { if (await act('reject', 'reject', { reason: rejectReason.trim() }, 'Request rejected')) setRejectOpen(false); }}
              className="flex-1 bg-admin-red text-white font-bold py-2 rounded-lg text-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
            <button onClick={() => setRejectOpen(false)} className="flex-1 bg-admin-paper text-admin-text-muted border border-admin-ledger-line font-bold py-2 rounded-lg text-xs cursor-pointer">Cancel</button>
          </div>
        </Modal>,
        document.body
      )}

      {lightbox && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button aria-label="Close" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"><X size={18} /></button>
          <img src={lightbox} alt="Return photo" className="max-w-full max-h-full rounded-lg" />
        </div>,
        document.body
      )}
    </div>
  );
};

const PhotoStrip: React.FC<{ title: string; photos: string[]; empty: string; note?: string; onOpen: (src: string) => void }> = ({ title, photos, empty, note, onOpen }) => (
  <div className="bg-admin-surface border border-admin-ledger-line rounded-lg p-5">
    <h2 className="admin-label mb-3">{title}</h2>
    {photos.length ? (
      <div className="flex flex-wrap gap-2.5">
        {photos.map((p, i) => (
          <button key={i} onClick={() => onOpen(p)} className="w-24 h-24 rounded-lg overflow-hidden border border-admin-ledger-line cursor-zoom-in">
            <img src={p} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    ) : (
      <p className="text-xs text-admin-text-faint flex items-center gap-1.5"><ImageIcon size={14} /> {empty}</p>
    )}
    {note && <p className="text-xs text-admin-text-muted mt-3">Partner note: {note}</p>}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
    <div role="dialog" aria-modal="true" className="bg-admin-surface rounded-2xl border border-admin-ledger-line p-6 w-full max-w-[24rem] relative z-10 shadow-2xl flex flex-col gap-4">
      <h3 className="font-bold text-sm text-admin-text uppercase font-admin-mono">{title}</h3>
      {children}
    </div>
  </div>
);

export default Returns;
