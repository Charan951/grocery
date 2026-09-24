import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Navigation, Camera, X, CheckSquare, Square, Store, MapPin, Package, AlertCircle,
} from 'lucide-react';
import { partnerApi, type PartnerReturn } from '../partnerApi';
import { usePartner } from '../PartnerContext';
import { Btn, Card, CenterState, Pill, SectionLabel } from '../ui';
import { compressImage } from '../../utils/returnsApi';

const FAIL_REASONS = [
  'Customer not reachable / phone switched off',
  'Customer not available at location',
  'Wrong / incomplete address',
];
const REFUSE_REASONS = [
  'Item does not match the request',
  'Item used / not in returnable condition',
  'Customer changed their mind',
];

const mapsLink = (loc?: { lat?: number; lng?: number }, addr?: string) =>
  loc?.lat != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || '')}`;

/** Partner's pickup screen: reach customer → collect with proof → drop at store. */
export const ReturnDetail: React.FC = () => {
  const { returnId = '' } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = usePartner();
  const [rr, setRr] = useState<PartnerReturn | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'collect' | 'fail' | 'refuse' | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await partnerApi.getReturn(returnId);
      setRr(r.returnRequest);
      setErr('');
    } catch (e: any) {
      setErr(e.message || 'Could not load this pickup');
    }
  }, [returnId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r?.returnRequest) setRr(r.returnRequest);
      after?.();
      refreshMe();
    } catch (e: any) {
      alert(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (err) return <CenterState kind="error" title="Pickup unavailable">{err}</CenterState>;
  if (!rr) return <CenterState kind="loading" />;

  const isExchange = rr.type === 'exchange';
  const phoneDigits = String(rr.customerPhone || '').replace(/[^\d+]/g, '');
  const done = ['Completed', 'Rejected', 'Pickup Failed', 'Cancelled'].includes(rr.status);

  return (
    <div className="flex flex-col gap-4 sm:max-w-[640px] pb-28">
      <button onClick={() => navigate('/partner/dashboard')} className="self-start flex items-center gap-1.5 text-[12.5px] font-semibold text-admin-text-muted hover:text-admin-text cursor-pointer">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-admin-display font-extrabold text-[19px] text-admin-text">{rr.returnId}</h1>
        <Pill tone="amber">{isExchange ? 'Exchange' : 'Return'}</Pill>
        <Pill tone={rr.status === 'Completed' ? 'green' : done ? 'red' : 'neutral'}>{rr.status}</Pill>
      </div>

      {isExchange && ['Assigned', 'Arrived'].includes(rr.status) && (
        <Card className="p-4 flex items-start gap-3 bg-admin-amber-soft border-admin-amber/30">
          <Store size={18} className="text-admin-amber shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-admin-text">
            <b>Collect the replacement first</b> at {rr.store?.name || 'the store'}, then hand it over when you pick up the old item.
            {rr.store?.lat != null && (
              <a href={mapsLink(rr.store)} target="_blank" rel="noreferrer" className="block mt-1.5 text-admin-green font-semibold">Navigate to store →</a>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4 flex flex-col gap-3">
        <SectionLabel>Customer</SectionLabel>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-[14px] text-admin-text">{rr.customerName || 'Customer'}</div>
            <div className="text-[12.5px] text-admin-text-muted flex items-start gap-1.5 mt-1">
              <MapPin size={13} className="shrink-0 mt-0.5 text-admin-text-faint" />
              {rr.pickupAddress}
            </div>
          </div>
          {!done && (
            <div className="flex gap-2 shrink-0">
              {phoneDigits && (
                <a href={`tel:${phoneDigits}`} aria-label="Call customer" className="w-10 h-10 rounded-full bg-admin-green-soft text-admin-green flex items-center justify-center">
                  <Phone size={16} />
                </a>
              )}
              <a href={mapsLink(rr.pickupLocation, rr.pickupAddress)} target="_blank" rel="noreferrer" aria-label="Navigate" className="w-10 h-10 rounded-full bg-admin-ink text-white flex items-center justify-center">
                <Navigation size={16} />
              </a>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <SectionLabel>Collect these items</SectionLabel>
        <ul className="flex flex-col divide-y divide-admin-ledger-line">
          {rr.items.map((i) => (
            <li key={i.productId} className="py-2.5 flex items-center gap-3">
              {i.image ? <img src={i.image} alt="" className="w-11 h-11 rounded-md object-cover bg-admin-paper" /> : <span className="w-11 h-11 rounded-md bg-admin-paper flex items-center justify-center"><Package size={16} className="text-admin-text-faint" /></span>}
              <span className="flex-1 text-[13px] font-semibold text-admin-text">{i.name}</span>
              <span className="font-admin-mono text-[13px] font-bold text-admin-text">×{i.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="text-[12.5px] text-admin-text-muted flex items-start gap-1.5">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span><b className="text-admin-text">{rr.reasonLabel}</b>{rr.comment ? ` — “${rr.comment}”` : ''}</span>
        </div>
        {rr.photos?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {rr.photos.map((p, i) => <img key={i} src={p} alt={`Customer photo ${i + 1}`} className="w-16 h-16 rounded-md object-cover border border-admin-ledger-line" />)}
          </div>
        )}
      </Card>

      {rr.proofPhotos?.length > 0 && (
        <Card className="p-4 flex flex-col gap-2">
          <SectionLabel>Your pickup proof</SectionLabel>
          <div className="flex gap-2 flex-wrap">
            {rr.proofPhotos.map((p, i) => <img key={i} src={p} alt={`Proof ${i + 1}`} className="w-16 h-16 rounded-md object-cover border border-admin-ledger-line" />)}
          </div>
        </Card>
      )}

      {/* Sticky action bar */}
      {!done && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-admin-surface/95 backdrop-blur border-t border-admin-ledger-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-[640px] mx-auto flex flex-col gap-2">
            {rr.status === 'Assigned' && (
              <Btn className="w-full py-3.5 text-[14px] font-bold rounded-xl" loading={busy} onClick={() => run(() => partnerApi.returnArrived(rr.returnId))}>
                I've arrived at the customer
              </Btn>
            )}
            {['Assigned', 'Arrived'].includes(rr.status) && (
              <>
                {rr.status === 'Arrived' && (
                  <Btn className="w-full py-3.5 text-[14px] font-bold rounded-xl" onClick={() => setSheet('collect')}>
                    {isExchange ? 'Collect item & hand over replacement' : 'Collect item with proof'}
                  </Btn>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Btn variant="ghost" onClick={() => setSheet('refuse')}>Item doesn't match</Btn>
                  <Btn variant="danger" onClick={() => setSheet('fail')}>Can't collect</Btn>
                </div>
              </>
            )}
            {rr.status === 'Picked Up' && (
              <Btn className="w-full py-3.5 text-[14px] font-bold rounded-xl" loading={busy} onClick={() => run(() => partnerApi.completeReturn(rr.returnId))}>
                Dropped at store
              </Btn>
            )}
          </div>
        </div>
      )}

      {sheet === 'collect' && (
        <CollectSheet
          isExchange={isExchange}
          onClose={() => setSheet(null)}
          onSubmit={(body) => run(() => partnerApi.collectReturn(rr.returnId, body), () => setSheet(null))}
          busy={busy}
        />
      )}
      {(sheet === 'fail' || sheet === 'refuse') && (
        <ReasonSheet
          title={sheet === 'fail' ? "Why couldn't you collect?" : "What doesn't match?"}
          reasons={sheet === 'fail' ? FAIL_REASONS : REFUSE_REASONS}
          cta={sheet === 'fail' ? 'Mark pickup failed' : 'Refuse pickup'}
          busy={busy}
          onClose={() => setSheet(null)}
          onSubmit={(reason) => run(
            () => (sheet === 'fail' ? partnerApi.failReturn(rr.returnId, reason) : partnerApi.refuseReturn(rr.returnId, reason)),
            () => { setSheet(null); navigate('/partner/dashboard'); },
          )}
        />
      )}
    </div>
  );
};

const CollectSheet: React.FC<{
  isExchange: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: { otp: string; photos: string[]; itemsVerified: boolean; note?: string }) => void;
}> = ({ isExchange, busy, onClose, onSubmit }) => {
  const [otp, setOtp] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addPhoto = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    try {
      const d = await compressImage(f);
      setPhotos((p) => [...p, d].slice(0, 4));
    } catch { /* ignore */ }
    if (fileRef.current) fileRef.current.value = '';
  };

  const ready = otp.length === 4 && photos.length > 0 && verified;

  return (
    <Sheet title={isExchange ? 'Collect & exchange' : 'Collect return'} onClose={onClose}>
      <label className="block text-center">
        <span className="font-admin-mono text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">Customer's pickup code</span>
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          placeholder="• • • •"
          className="mt-2 w-full border-2 border-admin-ledger-line rounded-xl px-4 py-3 text-center text-[24px] tracking-[0.4em] font-admin-mono font-bold text-admin-text focus:border-admin-green focus:outline-none"
        />
      </label>

      <div>
        <span className="font-admin-mono text-[10px] font-bold uppercase tracking-[0.14em] text-admin-text-muted">Proof photos (required)</span>
        <div className="flex gap-2 flex-wrap mt-2">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img src={p} alt={`Proof ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-admin-ledger-line" />
              <button aria-label={`Remove proof ${i + 1}`} onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-admin-ink text-white flex items-center justify-center">
                <X size={11} />
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <button onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-admin-ledger-line hover:border-admin-green text-admin-text-muted flex flex-col items-center justify-center gap-0.5">
              <Camera size={18} />
              <span className="text-[9px] font-bold uppercase">Photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhoto(e.target.files)} />
        </div>
      </div>

      <button type="button" onClick={() => setVerified((v) => !v)} className="flex items-start gap-2.5 text-left text-[13px] text-admin-text" aria-pressed={verified}>
        {verified ? <CheckSquare size={18} className="text-admin-green shrink-0" /> : <Square size={18} className="text-admin-text-faint shrink-0" />}
        <span>I checked the item(s) and quantities match the request{isExchange ? ' and handed over the replacement' : ''}.</span>
      </button>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="Note for ops (optional)"
        className="w-full border border-admin-ledger-line rounded-xl p-3 text-[13px] text-admin-text focus:border-admin-green resize-none"
      />

      <Btn disabled={!ready} loading={busy} onClick={() => onSubmit({ otp, photos, itemsVerified: verified, note: note.trim() || undefined })} className="w-full py-3.5 text-[14px] font-bold rounded-xl">
        Confirm pickup
      </Btn>
    </Sheet>
  );
};

const ReasonSheet: React.FC<{
  title: string; reasons: string[]; cta: string; busy: boolean;
  onClose: () => void; onSubmit: (reason: string) => void;
}> = ({ title, reasons, cta, busy, onClose, onSubmit }) => {
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  const reason = choice === 'Other' ? other.trim() : choice;
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {[...reasons, 'Other'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setChoice(r)}
            className={`w-full text-left p-3 rounded-xl border text-[13px] font-medium ${choice === r ? 'border-rose-400 bg-rose-50 text-rose-900 font-semibold' : 'border-admin-ledger-line bg-admin-surface text-admin-text hover:bg-admin-paper'}`}
          >
            {r}
          </button>
        ))}
      </div>
      {choice === 'Other' && (
        <textarea value={other} onChange={(e) => setOther(e.target.value)} rows={2} placeholder="Describe the issue…" className="w-full border border-admin-ledger-line rounded-xl p-3 text-[13px] resize-none" />
      )}
      <button
        onClick={() => onSubmit(reason)}
        disabled={busy || !reason}
        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13.5px] disabled:opacity-40"
      >
        {cta}
      </button>
    </Sheet>
  );
};

const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-admin-surface rounded-t-2xl sm:rounded-2xl border border-admin-ledger-line p-5 pb-8 sm:pb-6 shadow-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-admin-ledger-line pb-3">
        <h3 className="font-admin-display font-bold text-[16px] text-admin-text">{title}</h3>
        <button onClick={onClose} className="font-admin-mono text-[11px] font-semibold uppercase tracking-wider text-admin-text-muted hover:text-admin-text px-2 py-1 rounded hover:bg-admin-paper">Close</button>
      </div>
      {children}
    </div>
  </div>
);
