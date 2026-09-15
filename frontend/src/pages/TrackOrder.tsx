import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import { useHideBottomNav } from '../context/BottomNavContext';
import { io, Socket } from 'socket.io-client';
import { OrderChat } from '../components/OrderChat';
import { BannerCarousel } from '../components/BannerCarousel';
import { useCMS } from '../context/CMSContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Phone,
  MessageSquareText,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Clock,
  Bike,
} from 'lucide-react';
import { apiUrl, SOCKET_URL } from '../config/api';

interface DeliveryBlock {
  partnerName: string;
  phoneMasked: string;
  phone: string | null;
  canContact: boolean;
  revealed: boolean;
  vehicleType: string | null;
  rating: number | null;
  location: { lat: number; lng: number } | null;
  locationUpdatedAt: string | null;
}

interface OrderItem {
  id?: string;
  productId?: string;
  name?: string;
  weightSpec?: string;
  selectedWeight?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  image?: string;
}

interface TrackedOrder {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
  deliveryAddress?: string;
  deliveryLocation?: { lat: number; lng: number } | null;
  pickup?: { lat: number; lng: number; name?: string } | null;
  trackingTimeline?: { status: string; note: string; at?: string; timestamp?: string }[];
  delivery?: DeliveryBlock | null;
  deliveryPartnerName?: string;
  deliveryRating?: { stars: number; comment?: string; at?: string } | null;
  deliveryOtp?: string;
  items?: OrderItem[];
  totalAmount?: number;
  itemTotal?: number;
}

function customerPhone(): string {
  try {
    return JSON.parse(localStorage.getItem('customer_user') || '{}')?.phone || '';
  } catch {
    return '';
  }
}

export function normalizeStatus(s: string): string {
  if (!s) return 'Placed';
  const lower = s.toLowerCase();
  if (lower === 'in transit') return 'In Progress';
  return s;
}

/** Collapses the backend's wide status enum onto the 5 stages shown in the tracker. */
function stageIndex(status: string): number {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return 4;
  if (s === 'arrived') return 3;
  if (s === 'out for delivery' || s === 'assigned') return 2;
  if (s === 'packed' || s === 'ready' || s === 'arrived at store') return 1;
  return 0;
}

const riderIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px;">
    <div style="position:absolute;inset:-4px;border-radius:50%;background:rgba(46,125,50,0.25);animation:pulse 2s infinite;"></div>
    <div style="width:24px;height:24px;border-radius:50%;background:#2E7D32;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <div style="width:7px;height:7px;border-radius:50%;background:#fff;"></div>
    </div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#EF4444;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const storeIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#4B5563;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

async function fetchRoute(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const j = await r.json();
    const coords: [number, number][] = j?.routes?.[0]?.geometry?.coordinates;
    if (coords?.length >= 2) return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    /* fallback */
  }
  return [
    [a.lat, a.lng],
    [b.lat, b.lng],
  ];
}

export const TrackOrder: React.FC = () => {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/account/orders');
  useHideBottomNav(true);
  const { banners } = useCMS();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Sticky ETA bar: shown once the real ETA card has scrolled past the top
  // of the viewport (not while it's still below the fold, nor before it's
  // ever been rendered).
  const [stickyEta, setStickyEta] = useState(false);
  const etaSentinelRef = useRef<HTMLDivElement>(null);

  // Live rider position pushed over socket
  const [liveRider, setLiveRider] = useState<{ lat: number; lng: number } | null>(null);

  // Rating state
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [rateErr, setRateErr] = useState('');
  const [rateDone, setRateDone] = useState(false);
  const [rateEditing, setRateEditing] = useState(false);

  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMk = useRef<L.Marker | null>(null);
  const destMk = useRef<L.Marker | null>(null);
  const pickupMk = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const fitted = useRef(false);
  const userMoved = useRef(false);
  const lastRouteFrom = useRef<{ lat: number; lng: number } | null>(null);
  const animRef = useRef<number | null>(null);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder({
          ...data.order,
          status: normalizeStatus(data.order.status),
          trackingTimeline: (data.order.trackingTimeline || []).map((t: any) => ({
            ...t,
            status: normalizeStatus(t.status),
          })),
        });
        setErr('');
      } else {
        setErr(data.message || 'Order not found');
      }
    } catch {
      setErr('Network error');
    }
  };

  useEffect(() => {
    fetchOrder();
    const t = setInterval(() => {
      fetchOrder();
      setTick((n) => n + 1);
    }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Real-time socket updates
  useEffect(() => {
    if (!orderId) return;
    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'] });
    setSocket(socket);
    const join = () => socket.emit('join_order_room', orderId);

    socket.on('connect', () => {
      setSocketConnected(true);
      join();
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('rider_location_update', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLiveRider({ lat, lng });
      }
    });

    socket.on('rider_assigned', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      setOrder((cur) =>
        cur
          ? {
              ...cur,
              status: normalizeStatus(p.status || cur.status),
              estimatedDelivery: p.eta ?? cur.estimatedDelivery,
              delivery: { ...(cur.delivery || {}), ...(p.delivery || {}) } as DeliveryBlock,
            }
          : cur,
      );
      const loc = p?.delivery?.location;
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        setLiveRider({ lat: loc.lat, lng: loc.lng });
      }
      fetchOrder();
      setTick((n) => n + 1);
    });

    socket.on('order_status_update', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      fetchOrder();
      setTick((n) => n + 1);
    });

    return () => {
      socket.emit('leave_order_room', orderId);
      socket.removeAllListeners();
      socket.close();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    setLiveRider(null);
  }, [orderId]);

  // Toggle the sticky compact ETA bar once the full-size ETA card scrolls
  // above the viewport (down-scroll past it), and hide it again once it's
  // back in view (scroll up) or before it's ever appeared below the fold.
  // Plain scroll-position check (rAF-throttled) rather than
  // IntersectionObserver — simpler to reason about and unaffected by root/
  // threshold edge cases.
  useEffect(() => {
    if (!order) {
      setStickyEta(false);
      return;
    }
    let raf = 0;
    let lastTop: number | null = null;
    const check = () => {
      raf = 0;
      const el = etaSentinelRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top !== lastTop) {
        lastTop = top;
        setStickyEta(top < 0);
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Belt-and-braces: some environments (e.g. Chrome DevTools' emulated
    // touch/mobile scrolling) don't reliably dispatch 'scroll' on window,
    // so also poll on an interval — cheap (one getBoundingClientRect call)
    // and guarantees correctness regardless of event quirks.
    const poll = setInterval(check, 150);
    // Run once immediately (and again shortly after) in case the sentinel
    // wasn't in the DOM yet on the very first paint.
    check();
    const t = setTimeout(check, 300);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(t);
      clearInterval(poll);
    };
  }, [!!order]);

  const rawStatus = order?.status || 'Placed';
  const normalizedStatus = normalizeStatus(rawStatus);
  const terminal = ['Delivered', 'Cancelled', 'Returned', 'Refunded', 'Failed'].includes(
    normalizedStatus,
  );
  const isDelivered = normalizedStatus === 'Delivered';
  const rider = (!terminal && liveRider) || order?.delivery?.location || null;
  const dest = order?.deliveryLocation || null;
  const pickup = order?.pickup || null;

  const etaMins = useMemo(() => {
    if (!rider || !dest) return null;
    const km = haversineKm(rider, dest);
    return Math.max(2, Math.round((km / 18) * 60)); // ~18 km/h city average
  }, [rider, dest, tick]);

  // Map initialization
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: false, minZoom: 14 }).setView(
      [17.4474, 78.3762],
      15,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    map.on('dragstart', () => {
      userMoved.current = true;
    });
    mapRef.current = map;
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      riderMk.current = destMk.current = pickupMk.current = null;
      routeLine.current = null;
    };
    // The map is only rendered while a partner is assigned and the order is
    // still active (before assignment / after completion it's hidden), so
    // this must re-run whenever that flips, not just once on mount.
  }, [!!order?.delivery]);

  // Markers and route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (dest) {
      if (destMk.current) destMk.current.setLatLng([dest.lat, dest.lng]);
      else
        destMk.current = L.marker([dest.lat, dest.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup('Delivery Address');
    }
    if (pickup) {
      if (pickupMk.current) pickupMk.current.setLatLng([pickup.lat, pickup.lng]);
      else
        pickupMk.current = L.marker([pickup.lat, pickup.lng], { icon: storeIcon })
          .addTo(map)
          .bindPopup('FreshCart Store');
    }

    if (rider) {
      if (!riderMk.current) {
        riderMk.current = L.marker([rider.lat, rider.lng], {
          icon: riderIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup('Delivery Partner');
      } else {
        const from = riderMk.current.getLatLng();
        const to = L.latLng(rider.lat, rider.lng);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min((now - t0) / 1200, 1);
          riderMk.current?.setLatLng([
            from.lat + (to.lat - from.lat) * k,
            from.lng + (to.lng - from.lng) * k,
          ]);
          if (k < 1) animRef.current = requestAnimationFrame(step);
        };
        animRef.current = requestAnimationFrame(step);
      }
    } else if (riderMk.current) {
      riderMk.current.remove();
      riderMk.current = null;
    }

    if (rider && dest) {
      const moved =
        !lastRouteFrom.current || haversineKm(lastRouteFrom.current, rider) * 1000 > 40;
      if (moved) {
        lastRouteFrom.current = rider;
        fetchRoute(rider, dest).then((coords) => {
          const m = mapRef.current;
          if (!m) return;
          if (routeLine.current) routeLine.current.setLatLngs(coords);
          else
            routeLine.current = L.polyline(coords, {
              color: '#2E7D32',
              weight: 4,
              opacity: 0.85,
            }).addTo(m);
        });
      }
    }

    const pts: [number, number][] = [];
    if (rider) pts.push([rider.lat, rider.lng]);
    if (dest) pts.push([dest.lat, dest.lng]);
    if (pts.length && !fitted.current) {
      fitted.current = true;
      if (pts.length === 1) map.setView(pts[0], 16);
      else map.fitBounds(L.latLngBounds(pts), { padding: [45, 45], maxZoom: 16 });
    } else if (
      rider &&
      !userMoved.current &&
      !map.getBounds().pad(-0.15).contains([rider.lat, rider.lng])
    ) {
      if (dest) {
        map.fitBounds(
          L.latLngBounds([
            [rider.lat, rider.lng],
            [dest.lat, dest.lng],
          ]),
          { padding: [45, 45], maxZoom: 17 },
        );
      } else {
        map.panTo([rider.lat, rider.lng]);
      }
    }
  }, [rider, dest, pickup]);

  const existingRating = order?.deliveryRating?.stars || 0;
  const canRate = !!order && isDelivered && !!order.deliveryPartnerName;
  const shownStars = rateStars || existingRating;

  const submitRating = async () => {
    if (!order || !rateStars) return;
    setRateBusy(true);
    setRateErr('');
    try {
      const res = await fetch(
        apiUrl(`/orders/${encodeURIComponent(order.orderId)}/rate-partner`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stars: rateStars,
            comment: rateComment.trim() || undefined,
            phone: customerPhone(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRateErr(data.message || 'Could not save your rating');
      } else {
        setRateDone(true);
        setRateEditing(false);
        fetchOrder();
      }
    } catch {
      setRateErr('Network error');
    } finally {
      setRateBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-28">
      {/* Compact sticky ETA bar — always mounted (so the slide/fade is a CSS
          transition, not a mount/unmount pop), pinned to the very top of the
          viewport once the full ETA card scrolls past. Fixed, not sticky:
          it must keep floating over Delivery Partner / Address / Status
          Updates, which a `position: sticky` element can't do once its own
          row has scrolled out of its parent. */}
      {order && (
        <div
          className="bg-white/95 backdrop-blur-md border-b border-gray-200/80"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            boxShadow: '0 4px 16px -6px rgba(0,0,0,0.12)',
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            transform: stickyEta ? 'translateY(0)' : 'translateY(-100%)',
            opacity: stickyEta ? 1 : 0,
            pointerEvents: stickyEta ? 'auto' : 'none',
          }}
        >
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <span className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              {isDelivered ? <CheckCircle2 size={16} /> : <Zap size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide shrink-0">
                  Estimated Arrival
                </span>
                <span className="text-sm font-black text-gray-900 tabular-nums shrink-0">
                  {isDelivered ? 'Delivered' : `${etaMins || 10} min${(etaMins || 10) === 1 ? '' : 's'}`}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-gray-500 font-medium truncate">
                {isDelivered
                  ? 'Groceries delivered with care'
                  : rider
                    ? 'Delivery partner is heading to your drop'
                    : 'Items being packed at FreshCart Dark Store'}
              </p>
            </div>
            <div
              className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                socketConnected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {socketConnected ? 'Live' : 'Connecting'}
            </div>
          </div>
        </div>
      )}

      {/* Floating back button — overlays the banner at the very top of the
          page; sits below the sticky ETA bar's z-index so it's naturally
          covered once that bar slides in on scroll. */}
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className="fixed top-3 left-3 z-40 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-colors"
      >
        <ArrowLeft size={16} />
      </button>

      {/* Promo Banner Carousel — flush with the very top of the page (no
          header/nav row above it, no top padding) and full-bleed width. */}
      {order && (
        <BannerCarousel
          banners={banners}
          aspectRatioClass="h-[50vh] w-full"
          className="!mb-0"
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-4 md:py-6 flex flex-col gap-4 font-sans text-gray-900">
        {err && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3">
            {err}
          </div>
        )}

        {order && (
          <>
            {/* 1 & 2. Live Map + ETA — side by side */}
            <div className="grid grid-cols-[2fr_3fr] gap-2 sm:gap-3 items-stretch">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4 flex flex-col items-center text-center gap-1">
                <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  {isDelivered ? <CheckCircle2 size={20} /> : <Zap size={20} />}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">
                  Estimated Arrival
                </span>
                <span className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums">
                  {isDelivered ? 'Delivered' : `${etaMins || 10} min${(etaMins || 10) === 1 ? '' : 's'}`}
                </span>
                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium leading-snug">
                  {isDelivered
                    ? 'Groceries delivered with care'
                    : rider
                      ? 'Delivery partner is heading to your drop'
                      : 'Items being packed at FreshCart Dark Store'}
                </span>

                {!isDelivered && (
                  <div className="w-full mt-2.5">
                    <div className="relative h-1.5 bg-emerald-200/70 rounded-full overflow-visible">
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-600 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, (stageIndex(normalizedStatus) / 4) * 100)}%` }}
                      />
                      <div
                        className="absolute -top-2 -translate-x-1/2 transition-all duration-700"
                        style={{ left: `${Math.min(100, (stageIndex(normalizedStatus) / 4) * 100)}%` }}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                          <Bike size={11} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-bold text-gray-500">
                      <span>0 min</span>
                      <span>{etaMins || 10} mins</span>
                    </div>
                  </div>
                )}
              </div>

              {order.delivery ? (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200/90 shadow-sm bg-gray-100">
                  <div ref={elRef} className="w-full h-full min-h-[190px] sm:min-h-[220px]" />
                  <div className="absolute top-2 left-2 z-[1000] inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold shadow-xs">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {socketConnected ? 'Live GPS' : 'Connecting'}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200/90 bg-gray-100 min-h-[190px] sm:min-h-[220px] flex items-center justify-center text-xs text-gray-400 font-semibold text-center px-3">
                  Map opens once a partner is assigned
                </div>
              )}
            </div>
            {/* Sentinel — a fixed 1px marker right after the Map+ETA row.
                Observed instead of the ETA card itself so the toggle isn't
                thrown off by the card's height changing (e.g. the map
                lazy-initializing after mount). */}
            <div ref={etaSentinelRef} className="h-px w-full -mt-2" aria-hidden="true" />

            {/* 4. Doorstep OTP Code */}
            {order.deliveryOtp && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-200/70 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-emerald-800" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                      DOORSTEP CODE
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      Share with delivery partner at door
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-emerald-200 rounded-xl px-3.5 py-1.5 shadow-xs">
                  <span className="text-xl font-black text-emerald-700 tracking-[0.25em] tabular-nums font-mono">
                    {order.deliveryOtp}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Delivery Partner Card — only shown once admin has actually
                assigned a partner (and the order is still active). Before
                that there's nothing real to show yet. */}
            {order.delivery && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                  Delivery Partner
                </span>
                <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <Zap size={22} />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-extrabold text-gray-900 truncate block">
                        {order.delivery.partnerName || order.deliveryPartnerName || 'Delivery Partner'}
                      </span>
                      {order.delivery.rating != null && (
                        <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                          ★ {order.delivery.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setChatOpen(true)}
                      className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors shadow-xs"
                      aria-label="Chat with partner"
                    >
                      <MessageSquareText size={16} />
                    </button>
                    <a
                      href={`tel:${order.delivery.phone || ''}`}
                      className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-xs"
                      aria-label="Call partner"
                    >
                      <Phone size={16} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {chatOpen && order.delivery && (
              <OrderChat
                orderId={order.orderId}
                socket={socket}
                customerPhone={customerPhone()}
                partnerName={order.delivery.partnerName || order.deliveryPartnerName || 'Delivery Partner'}
                onClose={() => setChatOpen(false)}
              />
            )}

            {/* 6. Partner Rating (when eligible) */}
            {canRate && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col gap-3">
                <div className="text-sm font-extrabold text-gray-900">
                  {existingRating || rateDone
                    ? 'Thanks for rating your delivery'
                    : `Rate your delivery by ${order.deliveryPartnerName}`}
                </div>
                <div
                  className="flex items-center gap-2"
                  role="radiogroup"
                  aria-label="Delivery rating"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={shownStars === n}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      disabled={rateBusy}
                      onClick={() => {
                        setRateStars(n);
                        setRateDone(false);
                      }}
                      className={`text-2xl transition-transform hover:scale-110 disabled:opacity-50 ${
                        n <= shownStars ? 'text-amber-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {(rateEditing || (!existingRating && !rateDone)) && (
                  <>
                    <textarea
                      value={rateComment}
                      onChange={(e) => setRateComment(e.target.value)}
                      placeholder="Add a note (optional)"
                      maxLength={500}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs resize-none focus:outline-none focus:border-emerald-600"
                    />
                    {rateErr && <div className="text-xs font-semibold text-red-600">{rateErr}</div>}
                    <button
                      onClick={submitRating}
                      disabled={!rateStars || rateBusy}
                      className="self-start rounded-full bg-emerald-600 text-white font-bold text-xs px-4 py-2 disabled:opacity-40"
                    >
                      {rateBusy ? 'Saving…' : 'Submit rating'}
                    </button>
                  </>
                )}
                {(existingRating || rateDone) && !rateEditing && (
                  <button
                    onClick={() => {
                      setRateEditing(true);
                      setRateStars(existingRating);
                      setRateComment(order.deliveryRating?.comment || '');
                    }}
                    className="self-start text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Change rating
                  </button>
                )}
              </div>
            )}

            {/* 7. Delivery Address Card */}
            {order.deliveryAddress && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Delivery Address
                    </span>
                    {!isDelivered && (
                      <button
                        type="button"
                        onClick={() => navigate('/account/addresses')}
                        className="shrink-0 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                      >
                        Change
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mt-0.5">
                    {order.deliveryAddress}
                  </div>
                </div>
              </div>
            )}

            {/* 9. Order Status Updates Timeline */}
            {order.trackingTimeline && order.trackingTimeline.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
                  Status Updates
                </h3>
                <div className="relative pl-5 border-l-2 border-emerald-100 space-y-4">
                  {[...order.trackingTimeline].reverse().map((t, idx) => (
                    <div key={idx} className="relative text-xs">
                      <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />
                      <div className="font-bold text-gray-900">
                        {normalizeStatus(t.status)}
                      </div>
                      {t.note && (
                        <div className="text-gray-500 font-medium mt-0.5">{t.note}</div>
                      )}
                      {(t.at || t.timestamp) && (
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {new Date(t.at || t.timestamp!).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Order Items Breakdown — kept last per request */}
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Order Items ({order.items.length})
                  </h3>
                  {order.totalAmount && (
                    <span className="text-xs font-black text-emerald-700">
                      Total: ₹{Math.round(order.totalAmount)}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                          {item.quantity || item.qty || 1}×
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-gray-900 truncate">
                            {item.name || 'Grocery Item'}
                          </div>
                          {(item.weightSpec || item.selectedWeight) && (
                            <div className="text-[11px] text-gray-400 font-medium">
                              {item.weightSpec || item.selectedWeight}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.price && (
                        <span className="font-bold text-gray-900 tabular-nums shrink-0">
                          ₹{Math.round(item.price * (item.quantity || item.qty || 1))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 10. Sticky Bottom Action Bar */}
      {order && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 py-3 px-4 z-30 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate('/account/orders')}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-[0.98] transition-all text-center"
            >
              Order Details
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 text-white font-black text-xs hover:bg-emerald-800 active:scale-[0.98] transition-all text-center shadow-xs"
            >
              Back to Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackOrder;

