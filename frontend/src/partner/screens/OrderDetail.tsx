import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Camera, CheckCircle2, XCircle, PackageX,
} from 'lucide-react';
import { partnerApi } from '../partnerApi';
import { usePartner } from '../PartnerContext';
import { Btn, Card, CenterState, Pill, SectionLabel, money } from '../ui';

const NEXT: Record<string, { label: string; fn: keyof typeof partnerApi }> = {
  Assigned: { label: 'Arrived at store', fn: 'pickupArrived' },
  'Arrived At Store': { label: 'Picked up order', fn: 'pickedUp' },
  'Out For Delivery': { label: 'Reached customer', fn: 'arrived' },
  Arrived: { label: 'Complete delivery', fn: 'complete' },
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
      <div>
        <button
          onClick={() => navigate('/partner/dashboard')}
          className="inline-flex items-center gap-1.5 font-admin-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-admin-green"
        >
          <ArrowLeft size={13} /> Back to dashboard
        </button>
        <div className="mt-4">
          <CenterState kind="error">{err || 'Order not found'}</CenterState>
        </div>
      </div>
    );
  }

  const step = NEXT[order.status];
  const isTerminal = ['Delivered', 'Cancelled', 'Returned'].includes(order.status);
  const phase = STEPS.indexOf(order.status);
  const phone: string = order.customerPhone || '';
  const phoneDigits = phone.replace(/[^\d]/g, '');
  const canContact = !phone.includes('•') && phoneDigits.length >= 10;
  const isCOD = /cash|cod/i.test(order.paymentMethod || '');

  return (
    <div>
      {/* Sub-header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/partner/dashboard')}
          aria-label="Back"
          className="p-1.5 -ml-1.5 rounded-md text-admin-text-muted hover:bg-admin-surface"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-admin-mono text-[13px] font-semibold text-admin-text">
          {order.orderId}
        </span>
        <Pill
          tone={
            order.status === 'Delivered' ? 'green' : order.status === 'Failed' ? 'red' : 'neutral'
          }
          className="ml-auto"
        >
          {order.status}
        </Pill>
      </div>

      {/* Progress */}
      {phase >= 0 && (
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              title={s}
              className={`h-1 flex-1 rounded-full ${
                i <= phase ? 'bg-admin-green' : 'bg-admin-ledger-line'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Customer */}
        <Card className="p-4">
          <SectionLabel>Customer</SectionLabel>
          <p className="font-admin-display font-semibold text-[14px] text-admin-text mt-2">
            {order.customerName || 'Customer'}
          </p>
          <p className="font-admin-mono text-[12px] text-admin-text-muted">{phone || 'No number shared'}</p>
          <p className="text-[12px] text-admin-text-muted mt-2 flex items-start gap-1.5 leading-relaxed">
            <MapPin size={13} className="mt-0.5 shrink-0 text-admin-text-faint" />
            {order.deliveryAddress}
          </p>
          {canContact && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <a
                href={`tel:${phoneDigits}`}
                className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-admin-green text-white text-[12px] font-semibold"
              >
                <Phone size={13} /> Call
              </a>
              <a
                href={`https://wa.me/${phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-admin-surface border border-admin-ledger-line text-admin-text text-[12px] font-semibold"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            </div>
          )}
        </Card>

        {/* Items */}
        <Card className="p-4">
          <SectionLabel>Items ({(order.items || []).length})</SectionLabel>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {(order.items || []).map((it: any, i: number) => (
              <li key={i} className="flex justify-between text-[13px]">
                <span className="text-admin-text-muted">
                  {it.name} <span className="text-admin-text-faint">× {it.quantity}</span>
                </span>
                <span className="text-admin-text-muted tabular-nums">{money(it.price)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-admin-ledger-line mt-3 pt-3">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-admin-text">
              Total
              {isCOD && <Pill tone="amber">Collect cash</Pill>}
            </span>
            <span className="font-admin-display font-bold text-[15px] text-admin-text tabular-nums">
              {money(order.totalAmount)}
            </span>
          </div>
        </Card>

        {order.needsReturn && (
          <Card className="p-3.5 flex items-start gap-2.5">
            <PackageX size={16} className="text-admin-red shrink-0 mt-0.5" />
            <p className="text-[12px] text-admin-red font-medium leading-relaxed">
              This parcel must be returned to the store.
            </p>
          </Card>
        )}
      </div>

      {/* Action bar */}
      {!isTerminal && (
        <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 md:-mx-8 mt-4 bg-admin-surface/95 backdrop-blur-sm border-t border-admin-ledger-line px-4 sm:px-6 md:px-8 py-3">
          <div className="flex flex-col gap-2">
            {step && (
              <Btn onClick={onForward} loading={busy} className="w-full py-3 text-[13px]">
                <CheckCircle2 size={15} /> {step.label}
              </Btn>
            )}
            {order.needsReturn ? (
              <Btn
                variant="dark"
                onClick={() => runStep(() => partnerApi.markReturned(orderId))}
                loading={busy}
                className="w-full"
              >
                Mark returned to store
              </Btn>
            ) : (
              <Btn
                variant="danger"
                onClick={() => setShowFail(true)}
                disabled={busy}
                className="w-full"
              >
                <XCircle size={14} /> Can't deliver
              </Btn>
            )}
          </div>
        </div>
      )}

      {showComplete && (
        <Dialog title="Complete delivery" onClose={() => setShowComplete(false)}>
          <span className="font-admin-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
            Doorstep OTP
          </span>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="Ask the customer for the code"
            className="w-full border border-admin-ledger-line rounded-md px-3 py-2.5 mt-1.5 mb-3 text-[15px] tracking-[0.3em] font-admin-mono font-semibold text-admin-text focus:border-admin-green"
          />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-admin-ledger-line text-[12px] font-semibold text-admin-text-muted hover:text-admin-text hover:bg-admin-paper transition-colors mb-3"
          >
            <Camera size={14} /> {photo ? 'Proof photo attached' : 'Add proof photo (optional)'}
          </button>
          {photo && (
            <img src={photo} alt="Proof of delivery" className="w-full h-32 object-cover rounded-md mb-3" />
          )}
          <Btn onClick={submitComplete} loading={busy} className="w-full py-3 text-[13px]">
            Confirm delivered
          </Btn>
        </Dialog>
      )}

      {showFail && (
        <Dialog title="Can't deliver" onClose={() => setShowFail(false)}>
          <textarea
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            rows={3}
            placeholder="Reason: customer unreachable, wrong address, refused…"
            className="w-full border border-admin-ledger-line rounded-md px-3 py-2.5 text-[13px] text-admin-text focus:border-admin-green mb-3 resize-none"
          />
          <Btn
            variant="danger"
            onClick={submitFail}
            loading={busy}
            disabled={!failReason.trim()}
            className="w-full py-3 text-[13px]"
          >
            Mark failed
          </Btn>
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
  <div className="fixed inset-0 z-[1200] bg-admin-ink/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center">
    <div className="w-full max-w-[420px] bg-admin-surface rounded-t-2xl sm:rounded-2xl border border-admin-ledger-line p-5 pb-7 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-admin-display font-semibold text-[15px] text-admin-text">{title}</h3>
        <button
          onClick={onClose}
          className="font-admin-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-admin-text-muted hover:text-admin-text"
        >
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);
