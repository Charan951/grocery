import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  RotateCcw, Repeat2, Camera, X, Minus, Plus, ChevronRight, ChevronLeft, Wallet, CreditCard,
  Lock, CheckCircle2, Clock, AlertCircle, Truck, Loader2,
} from 'lucide-react';
import { SOCKET_URL } from '../config/api';
import {
  returnsApi, compressImage, returnStatusCopy,
  type OrderReturns as OrderReturnsData, type ReturnConfig, type ReturnRequest, type ReturnType,
} from '../utils/returnsApi';

const inr = (n: number) => `₹${Math.round(n * 100) / 100}`;
const fmt = (raw?: string | null) => raw
  ? new Date(raw).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '';

const TONE: Record<string, string> = {
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  progress: 'bg-amber-50 text-amber-800 border-amber-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  muted: 'bg-gray-100 text-gray-600 border-gray-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ACTIVE = ['Requested', 'Assigned', 'Arrived', 'Picked Up', 'Pickup Failed'];

/**
 * Return / exchange block for a delivered order: existing requests with live
 * status + pickup code, and the entry point to raise a new one. Renders
 * nothing until the order is Delivered.
 */
export const OrderReturns: React.FC<{ orderId: string; status?: string }> = ({ orderId, status }) => {
  const isDelivered = (status || '').toLowerCase() === 'delivered';
  const [data, setData] = useState<OrderReturnsData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isDelivered || !orderId) return;
    returnsApi.forOrder(orderId).then(setData).catch(() => setData(null));
  }, [orderId, isDelivered]);

  useEffect(load, [load]);

  // Live status while any request is still moving.
  const hasActive = !!data?.requests.some((r) => ACTIVE.includes(r.status) || r.refund?.status === 'scheduled');
  useEffect(() => {
    if (!hasActive) return;
    const s = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'] });
    s.on('connect', () => s.emit('join_order_room', orderId));
    s.on('return_status_update', load);
    return () => { s.emit('leave_order_room', orderId); s.disconnect(); };
  }, [hasActive, orderId, load]);

  if (!isDelivered || !data) return null;

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this request? You can raise a new one while the return window is open.')) return;
    setCancelling(id);
    try { await returnsApi.cancel(id); load(); }
    catch (e: any) { alert(e.message); }
    finally { setCancelling(null); }
  };

  return (
    <>
      {data.requests.map((r) => (
        <ReturnCard key={r.returnId} r={r} onCancel={cancel} cancelling={cancelling === r.returnId} />
      ))}

      {data.eligible ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="w-full bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 flex items-center gap-3 text-left hover:border-[#00A86B]/50 transition-colors cursor-pointer group"
        >
          <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <RotateCcw size={18} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-extrabold text-gray-900">Problem with an item? Return or exchange</span>
            <span className="block text-[11px] text-gray-500 font-medium mt-0.5">
              {data.windowEndsAt ? `Available until ${fmt(data.windowEndsAt)}` : `Within ${data.windowHours} hours of delivery`}
              {' · '}Free doorstep pickup
            </span>
          </span>
          <ChevronRight size={18} className="text-gray-400 group-hover:text-[#00A86B] shrink-0" />
        </button>
      ) : data.requests.length === 0 && data.reason ? (
        <p className="text-[11px] text-gray-400 font-medium text-center px-4">{data.reason}</p>
      ) : null}

      <AnimatePresence>
        {sheetOpen && (
          <ReturnSheet
            orderId={orderId}
            data={data}
            onClose={() => setSheetOpen(false)}
            onCreated={() => { setSheetOpen(false); load(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ---------------------------------------------------------------------------

const ReturnCard: React.FC<{ r: ReturnRequest; onCancel: (id: string) => void; cancelling: boolean }> = ({ r, onCancel, cancelling }) => {
  const [showHistory, setShowHistory] = useState(false);
  const copy = returnStatusCopy(r);
  const isExchange = r.type === 'exchange';
  const canCancel = ['Requested', 'Assigned'].includes(r.status);
  const itemCount = r.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isExchange ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
            {isExchange ? <Repeat2 size={16} /> : <RotateCcw size={16} />}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-gray-900 font-display">{isExchange ? 'Exchange' : 'Return'} · {r.returnId}</h3>
            <p className="text-[11px] text-gray-500 font-medium truncate">
              {itemCount} item{itemCount === 1 ? '' : 's'} · {r.reasonLabel}
            </p>
          </div>
        </div>
        <span className={`shrink-0 px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-wide ${TONE[copy.tone]}`}>
          {copy.title}
        </span>
      </div>

      {r.pickupOtp && (
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock size={16} className="text-[#00A86B] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-900 block">Pickup code</span>
              <span className="text-[11px] text-gray-600 font-medium">
                {r.partnerName ? `Share with ${r.partnerName} after handing over` : 'Share with the partner after handing over'}
              </span>
            </div>
          </div>
          <span className="bg-white border border-emerald-300 rounded-lg px-3 py-1 font-mono font-black text-lg text-[#00A86B] tracking-widest shrink-0">
            {r.pickupOtp.split('').join(' ')}
          </span>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {r.items.map((it) => (
          <li key={it.productId} className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-800 truncate pr-3">{it.name}</span>
            <span className="text-gray-500 font-bold shrink-0">× {it.quantity}</span>
          </li>
        ))}
      </ul>

      {!isExchange && r.refund && r.refund.amount > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex items-start gap-2.5">
          {r.refund.method === 'wallet' ? <Wallet size={15} className="text-gray-500 mt-0.5 shrink-0" /> : <CreditCard size={15} className="text-gray-500 mt-0.5 shrink-0" />}
          <div className="text-xs min-w-0">
            <p className="font-extrabold text-gray-900">
              {inr(r.refund.amount)} refund to {r.refund.method === 'wallet' ? 'FreshCart wallet' : 'original payment method'}
            </p>
            <p className="text-gray-500 font-medium mt-0.5">
              {r.refund.status === 'processed' ? `Transferred on ${fmt(r.refund.processedAt)}`
                : r.refund.status === 'scheduled' || r.refund.status === 'processing' ? `Will be transferred by ${fmt(r.refund.dueAt)}`
                : r.refund.status === 'failed' ? 'Transfer delayed — our team is on it'
                : 'Starts once the item is picked up · transferred within 24 hours'}
            </p>
          </div>
        </div>
      )}

      {(r.rejectionReason || (r.status === 'Pickup Failed' && r.failureReason)) && (
        <p className="text-[11px] text-rose-700 font-semibold flex items-start gap-1.5">
          <AlertCircle size={13} className="mt-px shrink-0" />
          {r.rejectionReason || r.failureReason}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="text-[11px] font-extrabold text-gray-500 hover:text-gray-800 cursor-pointer"
          aria-expanded={showHistory}
        >
          {showHistory ? 'Hide updates' : `View updates (${r.timeline.length})`}
        </button>
        {canCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={() => onCancel(r.returnId)}
            className="text-[11px] font-extrabold text-rose-600 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {cancelling ? 'Cancelling…' : 'Cancel request'}
          </button>
        )}
      </div>

      {showHistory && (
        <ol className="flex flex-col border-t border-gray-100 pt-3">
          {r.timeline.map((t, i, arr) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-2 h-2 rounded-full bg-[#00A86B] shrink-0 mt-1.5" />
                {i !== arr.length - 1 && <span className="w-0.5 flex-1 min-h-[18px] bg-gray-200" />}
              </div>
              <div className="pb-2.5 min-w-0">
                <p className="text-xs font-bold text-gray-900">{t.status}</p>
                {t.note && <p className="text-[11px] text-gray-500 leading-relaxed">{t.note}</p>}
                {t.at && <p className="text-[10px] text-gray-400 mt-0.5">{fmt(t.at)}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const ReturnSheet: React.FC<{
  orderId: string; data: OrderReturnsData; onClose: () => void; onCreated: () => void;
}> = ({ orderId, data, onClose, onCreated }) => {
  const [config, setConfig] = useState<ReturnConfig | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<ReturnType>('return');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [refundMethod, setRefundMethod] = useState<'wallet' | 'original'>(data.refundMethods[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { returnsApi.config().then(setConfig).catch(() => setError('Could not load return options')); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = data.items.filter((i) => i.returnableQty > 0);
  const picked = items.filter((i) => (qty[i.key] || 0) > 0);
  const refundTotal = picked.reduce((s, i) => s + i.price * (qty[i.key] || 0), 0);
  const reasons = useMemo(() => (config?.reasons || []).filter((r) => r.types.includes(type)), [config, type]);
  const reason = reasons.find((r) => r.code === reasonCode);
  const maxPhotos = config?.maxPhotos || 4;
  const commentMissing = !!reason?.requiresComment && comment.trim().length < 5;

  const setItemQty = (key: string, n: number, max: number) =>
    setQty((q) => ({ ...q, [key]: Math.max(0, Math.min(max, n)) }));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = maxPhotos - photos.length;
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      try { next.push(await compressImage(f)); } catch { /* skip unreadable */ }
    }
    setPhotos((p) => [...p, ...next].slice(0, maxPhotos));
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await returnsApi.create(orderId, {
        type,
        items: picked.map((i) => ({ key: i.key, quantity: qty[i.key] })),
        reasonCode,
        comment: comment.trim() || undefined,
        photos,
        refundMethod: type === 'return' ? refundMethod : undefined,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/45"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-sheet-title"
        className="bg-white w-full sm:max-w-[32rem] rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100">
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} aria-label="Back" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="return-sheet-title" className="text-base font-black text-gray-900 font-display">
              {step === 1 ? 'Return or exchange' : 'What went wrong?'}
            </h2>
            <p className="text-[11px] text-gray-500 font-semibold">Step {step} of 2</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-5">
          {step === 1 ? (
            <>
              <fieldset className="grid grid-cols-2 gap-2.5">
                <legend className="sr-only">Request type</legend>
                {([
                  { v: 'return', icon: RotateCcw, title: 'Return', sub: 'Get a refund' },
                  { v: 'exchange', icon: Repeat2, title: 'Exchange', sub: 'Get a replacement' },
                ] as const).map((o) => {
                  const Icon = o.icon;
                  const on = type === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() => { setType(o.v); setReasonCode(''); }}
                      className={`rounded-2xl border-2 p-3 text-left transition-colors cursor-pointer ${on ? 'border-[#00A86B] bg-emerald-50/60' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Icon size={18} className={on ? 'text-[#00A86B]' : 'text-gray-500'} />
                      <span className="block text-sm font-black text-gray-900 mt-1.5">{o.title}</span>
                      <span className="block text-[11px] text-gray-500 font-medium">{o.sub}</span>
                    </button>
                  );
                })}
              </fieldset>

              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide mb-2">Select items</h3>
                <ul className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-2xl">
                  {items.map((it) => {
                    const n = qty[it.key] || 0;
                    return (
                      <li key={it.key} className="flex items-center gap-3 p-3">
                        {it.image ? (
                          <img src={it.image} alt="" className="w-11 h-11 rounded-lg object-cover bg-gray-50 shrink-0" />
                        ) : (
                          <span className="w-11 h-11 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 line-clamp-2">{it.name}</p>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {inr(it.price)} · {it.returnableQty} eligible
                          </p>
                        </div>
                        {n === 0 ? (
                          <button
                            type="button"
                            onClick={() => setItemQty(it.key, 1, it.returnableQty)}
                            className="px-3.5 py-1.5 rounded-lg border border-[#00A86B] text-[#00A86B] text-xs font-black hover:bg-emerald-50 cursor-pointer"
                          >
                            Select
                          </button>
                        ) : (
                          <div className="flex items-center bg-[#00A86B] text-white rounded-lg">
                            <button type="button" aria-label={`Fewer ${it.name}`} onClick={() => setItemQty(it.key, n - 1, it.returnableQty)} className="w-8 h-8 flex items-center justify-center cursor-pointer">
                              <Minus size={14} />
                            </button>
                            <span className="w-5 text-center text-xs font-black" aria-live="polite">{n}</span>
                            <button type="button" aria-label={`More ${it.name}`} disabled={n >= it.returnableQty} onClick={() => setItemQty(it.key, n + 1, it.returnableQty)} className="w-8 h-8 flex items-center justify-center disabled:opacity-40 cursor-pointer">
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="text-xs font-black text-gray-900 uppercase tracking-wide mb-2">Select the issue</legend>
                <div className="flex flex-col gap-2">
                  {reasons.map((r) => (
                    <label
                      key={r.code}
                      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${reasonCode === r.code ? 'border-[#00A86B] bg-emerald-50/60' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input
                        type="radio" name="return-reason" value={r.code}
                        checked={reasonCode === r.code}
                        onChange={() => setReasonCode(r.code)}
                        className="accent-[#00A86B] w-4 h-4"
                      />
                      <span className="text-sm font-bold text-gray-800">{r.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="return-comment" className="text-xs font-black text-gray-900 uppercase tracking-wide">
                  {reason?.requiresComment ? 'Describe the issue' : 'Anything else? (optional)'}
                </label>
                <textarea
                  id="return-comment"
                  value={comment}
                  maxLength={500}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="e.g. The milk packet was leaking when it arrived"
                  className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B] resize-none"
                />
              </div>

              <div>
                <p className="text-xs font-black text-gray-900 uppercase tracking-wide">Photos <span className="text-gray-400 normal-case font-bold">(helps us approve faster)</span></p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={p} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded-xl object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove photo ${i + 1}`}
                        onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {photos.length < maxPhotos && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#00A86B] hover:text-[#00A86B] flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <Camera size={18} />
                      <span className="text-[9px] font-black uppercase">Add</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
                </div>
              </div>

              {type === 'return' && (
                <fieldset>
                  <legend className="text-xs font-black text-gray-900 uppercase tracking-wide mb-2">Refund to</legend>
                  <div className="flex flex-col gap-2">
                    {data.refundMethods.map((m) => (
                      <label key={m} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer ${refundMethod === m ? 'border-[#00A86B] bg-emerald-50/60' : 'border-gray-200'}`}>
                        <input type="radio" name="refund-method" checked={refundMethod === m} onChange={() => setRefundMethod(m)} className="accent-[#00A86B] w-4 h-4" />
                        {m === 'wallet' ? <Wallet size={16} className="text-gray-500" /> : <CreditCard size={16} className="text-gray-500" />}
                        <span className="text-sm font-bold text-gray-800">{m === 'wallet' ? 'FreshCart wallet' : 'Original payment method'}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3.5 flex flex-col gap-2 text-xs">
                <p className="flex items-center gap-2 font-bold text-gray-700"><Truck size={14} className="text-[#00A86B]" /> A partner nearby will pick up the item(s) from your door</p>
                <p className="flex items-center gap-2 font-bold text-gray-700"><Lock size={14} className="text-[#00A86B]" /> Share your pickup code only after handing over</p>
                <p className="flex items-center gap-2 font-bold text-gray-700">
                  {type === 'return'
                    ? <><Clock size={14} className="text-[#00A86B]" /> Refund of {inr(refundTotal)} within {data.refundDelayHours} hours of pickup</>
                    : <><CheckCircle2 size={14} className="text-[#00A86B]" /> The partner brings your replacement on the same visit</>}
                </p>
              </div>
            </>
          )}
          {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step === 1 ? (
            <button
              type="button"
              disabled={!picked.length}
              onClick={() => setStep(2)}
              className="w-full bg-[#00A86B] hover:bg-[#00915c] disabled:bg-gray-300 text-white py-3.5 rounded-xl font-black text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {picked.length ? `Continue with ${picked.reduce((s, i) => s + (qty[i.key] || 0), 0)} item(s)` : 'Select at least one item'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!reasonCode || commentMissing || busy}
              onClick={submit}
              className="w-full bg-[#00A86B] hover:bg-[#00915c] disabled:bg-gray-300 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy ? 'Submitting…' : `Request ${type === 'return' ? 'return' : 'exchange'} pickup`}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
