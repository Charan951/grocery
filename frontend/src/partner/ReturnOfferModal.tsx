import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Package, Navigation, AlertCircle, Store } from 'lucide-react';
import { partnerApi, type ReturnOffer } from './partnerApi';
import { Btn, Pill } from './ui';

interface Props {
  offer: ReturnOffer | null;
  onResolved: () => void;
  onAccepted: (returnId: string) => void;
}

/** Pickup offer for a customer return / exchange — same shape as OfferModal. */
export const ReturnOfferModal: React.FC<Props> = ({ offer, onResolved, onAccepted }) => {
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!offer?.expiresAt) {
      setSecsLeft(null);
      setTotal(null);
      return;
    }
    const start = Date.now();
    const end = new Date(offer.expiresAt).getTime();
    setTotal(Math.max(1, Math.round((end - start) / 1000)));
    const tick = () => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setSecsLeft(s);
      if (s <= 0) onResolved();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [offer, onResolved]);

  const accept = async () => {
    if (!offer) return;
    setBusy('accept');
    try {
      await partnerApi.acceptReturn(offer.returnId);
      onAccepted(offer.returnId);
    } catch (e: any) {
      alert(e.message || 'This pickup is no longer available');
    } finally {
      setBusy(null);
      onResolved();
    }
  };

  const reject = async () => {
    if (!offer) return;
    setBusy('reject');
    try {
      await partnerApi.rejectReturn(offer.returnId, 'declined');
    } catch {
      /* already gone */
    } finally {
      setBusy(null);
      onResolved();
    }
  };

  const pct = secsLeft != null && total ? Math.max(0, Math.min(1, secsLeft / total)) : 0;
  const isExchange = offer?.type === 'exchange';

  return (
    <AnimatePresence>
      {offer && (
        <motion.div
          className="fixed inset-0 z-[1200] bg-admin-ink/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[420px] bg-admin-surface rounded-t-2xl sm:rounded-2xl border border-admin-ledger-line shadow-2xl overflow-hidden"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          >
            {secsLeft != null && (
              <div className="h-1 bg-admin-ledger-line">
                <div
                  className={`h-full transition-[width] duration-1000 ease-linear ${secsLeft <= 10 ? 'bg-admin-red' : 'bg-admin-amber'}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            )}

            <div className="p-5 pb-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-admin-display font-semibold text-[16px] text-admin-text">
                    {isExchange ? 'Exchange pickup' : 'Return pickup'}
                  </h3>
                  <Pill tone="amber">{offer.returnId}</Pill>
                </div>
                {secsLeft != null && (
                  <span className={`font-admin-mono text-[13px] font-bold tabular-nums ${secsLeft <= 10 ? 'text-admin-red' : 'text-admin-text-muted'}`}>
                    {secsLeft}s
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <Row Icon={Package} label="Items">
                  {offer.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                </Row>
                {offer.reason && <Row Icon={AlertCircle} label="Issue">{offer.reason}</Row>}
                {offer.distanceMeters != null && (
                  <Row Icon={Navigation} label="Away">{(offer.distanceMeters / 1000).toFixed(1)} km</Row>
                )}
                {isExchange && offer.store?.name && (
                  <Row Icon={Store} label="First">Collect replacement at {offer.store.name}</Row>
                )}
                {offer.pickupAddress && <Row Icon={MapPin} label="Pickup">{offer.pickupAddress}</Row>}
              </div>

              <div className="grid grid-cols-[1fr_1.4fr] gap-2.5 mt-5">
                <Btn variant="ghost" onClick={reject} loading={busy === 'reject'} disabled={!!busy}>
                  Decline
                </Btn>
                <Btn onClick={accept} loading={busy === 'accept'} disabled={!!busy} className="py-3">
                  Accept pickup
                </Btn>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Row: React.FC<{
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ Icon, label, children }) => (
  <div className="flex items-start gap-2.5 text-[13px]">
    <Icon size={15} className="text-admin-text-faint mt-0.5 shrink-0" />
    <span className="font-admin-mono text-[10px] uppercase tracking-[0.1em] text-admin-text-faint w-14 shrink-0 mt-0.5">
      {label}
    </span>
    <span className="font-medium text-admin-text flex-1">{children}</span>
  </div>
);
