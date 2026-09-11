import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Camera, CheckCircle2, XCircle, PackageX,
  Copy, Check, Navigation, AlertTriangle, ShoppingBag, Store, Truck, Clock, Sparkles
} from 'lucide-react';
import { partnerApi } from '../partnerApi';
import { usePartner } from '../PartnerContext';
import { Btn, CenterState, money } from '../ui';

const NEXT: Record<string, { label: string; fn: keyof typeof partnerApi }> = {
  Assigned: { label: 'Arrived at Store', fn: 'pickupArrived' },
  'Arrived At Store': { label: 'Pickup Done — Start Delivery', fn: 'pickedUp' },
  'Out For Delivery': { label: 'Reached Customer Doorstep', fn: 'arrived' },
  Arrived: { label: 'Collect OTP & Complete', fn: 'complete' },
};

const STEPS = ['Assigned', 'Arrived At Store', 'Out For Delivery', 'Arrived', 'Delivered'];

export const OrderDetail: React.FC = () => {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = usePartner();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showComplete, setShowComplete] = useState(false);
  const [otp, setOtp] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showFail, setShowFail] = useState(false);
  const [failReason, setFailReason] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await partnerApi.order(orderId);
      setOrder(r.order);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || 'Could not load this order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runStep = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r?.order) setOrder(r.order);
      else await load();
      refreshMe();
    } catch (e: any) {
      alert(e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const onForward = () => {
    const step = NEXT[order?.status];
    if (!step) return;
    if (step.fn === 'complete') {
      setShowComplete(true);
      return;
    }
    runStep(() => (partnerApi[step.fn] as any)(orderId));
  };

  const submitComplete = async () => {
    setBusy(true);
    try {
      const r = await partnerApi.complete(orderId, otp.trim() || undefined, photo || undefined);
      if (r?.order) setOrder(r.order);
      setShowComplete(false);
      refreshMe();
    } catch (e: any) {
      alert(e.message || 'Could not complete delivery');
    } finally {
      setBusy(false);
    }
  };

  const submitFail = async () => {
    if (!failReason.trim()) return;
    setBusy(true);
    try {
      const r = await partnerApi.fail(orderId, failReason.trim());
      if (r?.order) setOrder(r.order);
      setShowFail(false);
      refreshMe();
    } catch (e: any) {
      alert(e.message || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(f);
  };

  if (loading) return <CenterState kind="loading" />;
  if (err || !order) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <button
          onClick={() => navigate('/partner/dashboard')}
          className="inline-flex items-center gap-1.5 font-admin-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-admin-green hover:underline"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>
        <div className="mt-6">
          <CenterState kind="error">{err || 'Order not found'}</CenterState>
        </div>
      </div>
    );
  }

  const step = NEXT[order.status];
  const isTerminal = ['Delivered', 'Cancelled', 'Returned', 'Failed'].includes(order.status);
  const phase = STEPS.indexOf(order.status);
  const phone: string = order.customerPhone || '';
  const phoneDigits = phone.replace(/[^\d]/g, '');
  const canContact = !phone.includes('•') && phoneDigits.length >= 10;
  const isCOD = /cash|cod/i.test(order.paymentMethod || '');
  const isPickupLeg = ['Assigned', 'Ready', 'Arrived At Store'].includes(order.status);

  // Status visual metadata
  const getStatusMeta = () => {
    switch (order.status) {
      case 'Delivered':
        return {
          tone: 'green',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-50 text-emerald-700',
          icon: CheckCircle2,
          title: 'Delivered Successfully',
          note: 'Order has been delivered and payment verified.',
        };
      case 'Out For Delivery':
        return {
          tone: 'green',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-50 text-emerald-700',
          icon: Truck,
          title: 'Out for Delivery',
          note: 'On the way to customer doorstep.',
        };
      case 'Arrived':
        return {
          tone: 'green',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          iconBg: 'bg-emerald-50 text-emerald-700',
          icon: MapPin,
          title: 'Arrived at Drop-off',
          note: 'At destination. Ask customer for 4-digit OTP.',
        };
      case 'Assigned':
      case 'Ready':
      case 'Arrived At Store':
        return {
          tone: 'amber',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          iconBg: 'bg-amber-50 text-amber-700',
          icon: Store,
          title: order.status === 'Arrived At Store' ? 'At Store Counter' : 'Order Ready for Pickup',
          note: 'Collect parcel from store counter and verify bag contents.',
        };
      case 'Failed':
      case 'Cancelled':
        return {
          tone: 'red',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
          iconBg: 'bg-rose-50 text-rose-700',
          icon: XCircle,
          title: 'Delivery Incomplete',
          note: order.needsReturn ? 'Please return parcel to the store.' : 'Order has been cancelled.',
        };
      default:
        return {
          tone: 'neutral',
          badgeBg: 'bg-admin-paper text-admin-text-muted border-admin-ledger-line',
          iconBg: 'bg-admin-paper text-admin-text-muted',
          icon: Clock,
          title: order.status,
          note: '',
        };
    }
  };

  const meta = getStatusMeta();
  const StatusIcon = meta.icon;

  const mapsQuery = isPickupLeg
    ? (order.pickup?.name || 'FreshCart Store')
    : order.deliveryAddress;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div className="max-w-xl mx-auto w-full pb-20">
      {/* Navigation & Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/partner/dashboard')}
            aria-label="Back"
            className="p-2 -ml-2 rounded-lg text-admin-text-muted hover:bg-admin-surface hover:text-admin-text transition-colors"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1 className="font-admin-display font-bold text-[17px] text-admin-text leading-tight">
              Order Details
            </h1>
            <button
              onClick={copyOrderId}
              className="inline-flex items-center gap-1.5 font-admin-mono text-[11px] text-admin-text-muted hover:text-admin-text"
            >
              <span>#{order.orderId}</span>
              {copied ? <Check size={12} className="text-admin-green" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Status Pill in Header */}
        <span
          className={`font-admin-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badgeBg}`}
        >
          {order.status}
        </span>
      </div>

      {/* Progress Bar for Active Orders */}
      {phase >= 0 && !isTerminal && (
        <div className="mb-4">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s}
                title={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= phase ? 'bg-admin-green' : 'bg-admin-ledger-line'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {/* 1. Status Hero Banner - Normal Card */}
        <div className="bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
              <StatusIcon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-admin-display font-extrabold text-[17px] text-admin-text tracking-tight">
                  {meta.title}
                </span>
              </div>
              <p className="text-[13px] text-admin-text-muted mt-0.5 leading-snug">
                {meta.note}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Cash on Delivery / Payment Alert Banner - Normal Card */}
        {isCOD ? (
          <div className="bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-amber-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 font-admin-mono text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
                    Collect Cash
                  </span>
                  <span className="font-admin-display font-extrabold text-[16px] text-admin-text tabular-nums">
                    {money(order.totalAmount)}
                  </span>
                </div>
                <p className="text-[12px] font-medium text-admin-text-muted mt-0.5">
                  Collect exact cash from customer before handing over the parcel.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-admin-green flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-admin-mono text-[10.5px] font-bold text-admin-green uppercase tracking-wide">
                  Prepaid Online
                </span>
                <span className="font-admin-display font-bold text-[14.5px] text-admin-text tabular-nums">
                  {money(order.totalAmount)}
                </span>
              </div>
              <p className="text-[12px] text-admin-text-muted font-medium mt-0.5">
                Payment verified. Do NOT collect cash from the customer.
              </p>
            </div>
          </div>
        )}

        {/* 3. Customer & Drop-off Destination Card */}
        <div className="bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isPickupLeg ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isPickupLeg ? <Store size={14} /> : <MapPin size={14} />}
              </div>
              <span className="font-admin-mono text-[11px] font-bold uppercase tracking-wider text-admin-text-muted">
                {isPickupLeg ? 'Store Pickup Location' : 'Customer Drop-off'}
              </span>
            </div>
            <span className="font-admin-mono text-[10px] uppercase font-bold text-admin-text-faint bg-admin-paper px-2 py-0.5 rounded border border-admin-ledger-line">
              {isPickupLeg ? 'Store' : 'Drop-off'}
            </span>
          </div>

          {/* Customer profile */}
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-admin-display font-extrabold text-[16px] flex items-center justify-center shadow-sm">
              {(order.customerName || 'C').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-admin-display font-bold text-[15px] text-admin-text truncate">
                {order.customerName || 'Customer'}
              </h3>
              <p className="font-admin-mono text-[12px] text-admin-text-muted">
                {canContact ? phone : 'Phone active when out for delivery'}
              </p>
            </div>
          </div>

          {/* Address Block */}
          <div className="bg-admin-paper border border-admin-ledger-line rounded-xl p-3 mb-3.5 flex items-start gap-2.5">
            <MapPin size={16} className="text-admin-green shrink-0 mt-0.5" />
            <p className="text-[13px] text-admin-text font-medium leading-relaxed">
              {order.deliveryAddress || 'No address specified'}
            </p>
          </div>

          {/* Integrated Navigation Button (Google Maps) */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-admin-ink text-white hover:bg-admin-ink-soft text-[13px] font-bold shadow-sm transition-colors mb-2.5"
          >
            <Navigation size={15} className="text-emerald-400" />
            <span>{isPickupLeg ? 'Navigate to Store (Google Maps)' : 'Navigate to Customer (Google Maps)'}</span>
          </a>

          {/* Call & WhatsApp Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            {canContact ? (
              <>
                <a
                  href={`tel:${phoneDigits}`}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-admin-surface border border-admin-ledger-line text-admin-text hover:bg-admin-paper text-[13px] font-bold transition-colors"
                >
                  <Phone size={15} className="text-admin-green" /> Call
                </a>
                <a
                  href={`https://wa.me/${phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366]/10 text-[#075E54] border border-[#25D366]/30 hover:bg-[#25D366]/20 text-[13px] font-bold transition-colors"
                >
                  <MessageCircle size={15} className="text-[#25D366]" /> WhatsApp
                </a>
              </>
            ) : (
              <div className="col-span-2 text-center py-2 px-3 rounded-lg bg-admin-paper border border-admin-ledger-line font-admin-mono text-[11px] text-admin-text-faint">
                Customer phone will be unlocked when Out for Delivery
              </div>
            )}
          </div>
        </div>

        {/* 4. Items in Order Card */}
        <div className="bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShoppingBag size={14} />
              </div>
              <span className="font-admin-mono text-[11px] font-bold uppercase tracking-wider text-admin-text-muted">
                Order Items ({(order.items || []).length})
              </span>
            </div>
            <span className="font-admin-mono text-[10px] text-admin-text-muted bg-admin-paper px-2 py-0.5 rounded border border-admin-ledger-line">
              {(order.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1), 0)} units
            </span>
          </div>

          <div className="divide-y divide-admin-ledger-line">
            {(order.items || []).map((it: any, i: number) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-admin-paper border border-admin-ledger-line flex items-center justify-center text-admin-green shrink-0">
                    <ShoppingBag size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-admin-text truncate">
                      {it.name}
                    </p>
                    {it.weightSpec && (
                      <p className="text-[11.5px] text-admin-text-muted">
                        {it.weightSpec}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-admin-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ×{it.quantity}
                  </span>
                  {it.price > 0 && (
                    <span className="font-admin-mono text-[13px] text-admin-text-muted tabular-nums">
                      {money(it.price * (it.quantity || 1))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-admin-ledger-line mt-3.5 pt-3.5 flex items-center justify-between">
            <span className="text-[13.5px] font-bold text-admin-text">
              Total Bill Amount
            </span>
            <span className="font-admin-display font-extrabold text-[16px] text-admin-text tabular-nums">
              {money(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* 5. Delivery Timeline */}
        {order.trackingTimeline && order.trackingTimeline.length > 0 && (
          <div className="bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Clock size={14} />
              </div>
              <span className="font-admin-mono text-[11px] font-bold uppercase tracking-wider text-admin-text-muted">
                Delivery Activity Timeline
              </span>
            </div>

            <div className="space-y-3">
              {[...order.trackingTimeline].reverse().map((ev: any, idx: number) => {
                const isLatest = idx === 0;
                return (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                          isLatest
                            ? 'bg-admin-green border-emerald-300 text-white shadow-sm'
                            : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                      {idx < order.trackingTimeline.length - 1 && (
                        <div className="w-0.5 h-6 bg-admin-ledger-line my-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className={`text-[13.5px] ${isLatest ? 'font-bold text-admin-text' : 'font-medium text-admin-text-muted'}`}>
                        {ev.status}
                      </p>
                      {ev.note && (
                        <p className="text-[12px] text-admin-text-faint mt-0.5">
                          {ev.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Return Warning if needed */}
        {order.needsReturn && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
            <PackageX size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[13.5px] text-rose-900">Return to Store Required</h4>
              <p className="text-[12px] text-rose-700 mt-1 leading-relaxed">
                This parcel could not be delivered and must be returned to the store. Please hand it over to the store executive and mark as returned.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 6. Ergonomic Sticky Mobile Action Bar */}
      {!isTerminal && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-admin-surface/95 backdrop-blur-md border-t border-admin-ledger-line py-3 px-4 shadow-xl">
          <div className="max-w-xl mx-auto flex flex-col gap-2">
            {step && (
              <button
                onClick={onForward}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-admin-green hover:bg-emerald-700 text-white font-admin-display font-extrabold text-[15px] shadow-md transition-all disabled:opacity-50"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>{step.label}</span>
                  </>
                )}
              </button>
            )}

            {order.needsReturn ? (
              <button
                onClick={() => runStep(() => partnerApi.markReturned(orderId))}
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-admin-ink text-white font-semibold text-[13px]"
              >
                Mark Returned to Store
              </button>
            ) : (
              <button
                onClick={() => setShowFail(true)}
                disabled={busy}
                className="w-full py-1 text-center font-semibold text-[12.5px] text-rose-600 hover:text-rose-700 hover:underline"
              >
                Report a problem / Can't deliver
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation & OTP Modal */}
      {showComplete && (
        <Dialog title="Confirm Handover & Delivery" onClose={() => setShowComplete(false)}>
          <div className="text-center py-2">
            <span className="font-admin-mono text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">
              Doorstep Delivery Code
            </span>
            <p className="text-[12.5px] text-admin-text-muted mt-1 mb-3">
              Ask customer for their 4-digit security code
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              className="w-full border-2 border-admin-ledger-line rounded-xl px-4 py-3 text-center text-[24px] tracking-[0.4em] font-admin-mono font-bold text-admin-text focus:border-admin-green focus:outline-none transition-colors"
            />
          </div>

          <div className="my-3">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-admin-ledger-line hover:border-admin-green text-[13px] font-semibold text-admin-text-muted hover:text-admin-text hover:bg-admin-paper transition-all"
            >
              <Camera size={16} />
              <span>{photo ? 'Proof photo attached' : 'Add Proof Photo (Optional)'}</span>
            </button>
            {photo && (
              <img src={photo} alt="Proof" className="w-full h-32 object-cover rounded-xl mt-2 border border-admin-ledger-line" />
            )}
          </div>

          <Btn onClick={submitComplete} loading={busy} className="w-full py-3.5 text-[14px] font-bold rounded-xl mt-2">
            Complete & Handover Order
          </Btn>
        </Dialog>
      )}

      {/* Failed Delivery Modal */}
      {showFail && (
        <Dialog title="Report Delivery Issue" onClose={() => setShowFail(false)}>
          <div className="py-2">
            <p className="text-[13px] text-admin-text-muted mb-3">
              Select the reason this parcel cannot be delivered:
            </p>
            <div className="space-y-2 mb-3">
              {[
                'Customer not reachable / phone switched off',
                'Wrong / incomplete address',
                'Customer refused the order',
                'Customer not available at location',
                'Damaged items / packaging issue',
                'Other reason',
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFailReason(r)}
                  className={`w-full text-left p-3 rounded-xl border text-[13px] font-medium transition-all ${
                    failReason === r
                      ? 'border-rose-400 bg-rose-50 text-rose-900 font-semibold'
                      : 'border-admin-ledger-line bg-admin-surface text-admin-text hover:bg-admin-paper'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {failReason === 'Other reason' && (
              <textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                rows={2}
                placeholder="Describe the issue..."
                className="w-full border border-admin-ledger-line rounded-xl p-3 text-[13px] text-admin-text focus:border-admin-green mb-3 resize-none"
              />
            )}

            <button
              onClick={submitFail}
              disabled={busy || !failReason.trim()}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13.5px] disabled:opacity-40 transition-colors"
            >
              Confirm Delivery Failed
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

const Dialog: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="w-full max-w-[440px] bg-admin-surface rounded-t-2xl sm:rounded-2xl border border-admin-ledger-line p-5 pb-8 sm:pb-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between mb-3 border-b border-admin-ledger-line pb-3">
        <h3 className="font-admin-display font-bold text-[16px] text-admin-text">{title}</h3>
        <button
          onClick={onClose}
          className="font-admin-mono text-[11px] font-semibold uppercase tracking-wider text-admin-text-muted hover:text-admin-text px-2 py-1 rounded hover:bg-admin-paper"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);
