import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Package, IndianRupee, Navigation } from 'lucide-react';
import { partnerApi, type DeliveryOffer } from './partnerApi';
import { Btn, Pill, money } from './ui';

interface Props {
  offer: DeliveryOffer | null;
  onResolved: () => void;
  onAccepted: (orderId: string) => void;
}

export const OfferModal: React.FC<Props> = ({ offer, onResolved, onAccepted }) => {
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
      await partnerApi.acceptAssignment(offer.assignmentId);
      onAccepted(offer.orderId);
      onResolved();
    } catch (e: any) {
      alert(e.message || 'This offer is no longer available');
      onResolved();
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!offer) return;
    setBusy('reject');
    try {
      await partnerApi.rejectAssignment(offer.assignmentId, 'declined');
    } catch {
      /* offer likely already gone */
    } finally {
      setBusy(null);
      onResolved();
    }
  };

  const pct = secsLeft != null && total ? Math.max(0, Math.min(1, secsLeft / total)) : 0;

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
            className="w-full max-w-[420px] bg-admin-surface rounded-t-2xl sm:rounded-2xl border border-admin-ledger-line shadow-2xl overflow-hidden"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          >
            {/* Countdown rail */}
            {secsLeft != null && (
              <div className="h-1 bg-admin-ledger-line">
                <div
                  className={`h-full transition-[width] duration-1000 ease-linear ${
                    secsLeft <= 8 ? 'bg-admin-red' : 'bg-admin-green'
                  }`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            )}

            <div className="p-5 pb-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-admin-display font-semibold text-[16px] text-admin-text">
                  New delivery offer
                </h3>
                {secsLeft != null && (
                  <span
                    className={`font-admin-mono text-[13px] font-bold tabular-nums ${
                      secsLeft <= 8 ? 'text-admin-red' : 'text-admin-text-muted'
                    }`}
                  >
                    {secsLeft}s
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <Row Icon={IndianRupee} label="Payout">
                  <span className="font-admin-display font-bold tabular-nums">{money(offer.amount)}</span>
                  {offer.isCOD && <Pill tone="amber" className="ml-2">Collect cash</Pill>}
                </Row>
                <Row Icon={Package} label="Items">{offer.itemCount ?? 1}</Row>
                {offer.distanceMeters != null && (
                  <Row Icon={Navigation} label="Trip">
                    {(offer.distanceMeters / 1000).toFixed(1)} km
                  </Row>
                )}
                {offer.pickup?.name && <Row Icon={MapPin} label="Pickup">{offer.pickup.name}</Row>}
                {offer.deliveryAddress && (
                  <Row Icon={MapPin} label="Drop">{offer.deliveryAddress}</Row>
                )}
              </div>

              <div className="grid grid-cols-[1fr_1.4fr] gap-2.5 mt-5">
                <Btn variant="ghost" onClick={reject} loading={busy === 'reject'} disabled={!!busy}>
                  Decline
                </Btn>
                <Btn onClick={accept} loading={busy === 'accept'} disabled={!!busy} className="py-3">
                  Accept delivery
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
