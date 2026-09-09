import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronsRight, Loader2 } from 'lucide-react';
import { usePartner } from './PartnerContext';

/**
 * Slide-to-confirm. One direction only: drag the knob left to right to GO
 * ONLINE. Shown only while offline; going offline is the header toggle. A tap
 * alone does nothing, the drag must clear ~85%.
 */
const THRESHOLD = 0.85;
const KNOB = 48;
const PAD = 4;

export const SwipeOnline: React.FC = () => {
  const { partner, setOnline } = usePartner();
  const location = useLocation();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [t, setT] = React.useState(0); // 0..1
  const [busy, setBusy] = React.useState(false);
  const [trackW, setTrackW] = React.useState(0);
  const startX = React.useRef(0);
  const online = !!partner?.isOnline;

  React.useEffect(() => {
    const measure = () => setTrackW(trackRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const travel = () => Math.max(1, trackW - KNOB - PAD * 2);

  const onDown = (e: React.PointerEvent) => {
    if (busy || !partner) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setT(Math.min(1, Math.max(0, (e.clientX - startX.current) / travel())));
  };
  const onUp = async () => {
    if (!dragging) return;
    setDragging(false);
    if (t >= THRESHOLD && !busy) {
      setT(1);
      setBusy(true);
      try {
        await setOnline(true);
      } catch (err: any) {
        alert(err.message || 'Could not go online');
      } finally {
        setBusy(false);
        setT(0);
      }
    } else {
      setT(0);
    }
  };

  // Hidden when already online, and on the order-detail screen (its own bar).
  if (online || location.pathname.startsWith('/partner/orders/')) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)]">
      <div
        ref={trackRef}
        className="relative h-14 rounded-full border border-admin-ink-line bg-admin-ink overflow-hidden select-none touch-none shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)]"
      >
        <div
          className="absolute inset-0 origin-left bg-admin-green/25"
          style={{ transform: `scaleX(${t})`, transition: dragging ? 'none' : 'transform .25s ease' }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center font-admin-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/75 pointer-events-none"
          style={{ opacity: Math.max(0, 1 - t * 2) }}
        >
          {busy ? 'Going online…' : 'Slide to go online'}
        </span>
        <button
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="Slide to go online"
          className="absolute top-1 left-1 h-12 w-12 rounded-full bg-admin-surface text-admin-ink flex items-center justify-center shadow-card cursor-grab active:cursor-grabbing"
          style={{
            transform: `translateX(${t * travel()}px)`,
            transition: dragging ? 'none' : 'transform .25s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ChevronsRight size={20} />}
        </button>
      </div>
    </div>
  );
};
