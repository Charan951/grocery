import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Phone,
  MessageCircle,
  ArrowLeft,
  MapPin,
  RefreshCw,
  Check,
  Copy,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Store,
  Clock,
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

const STEPS = ['Placed', 'Packed', 'In Progress', 'Delivered'];

const getStepIndex = (rawStatus: string): number => {
  const norm = normalizeStatus(rawStatus).toLowerCase();
  if (norm === 'delivered') return 3;
  if (['in progress', 'dispatched', 'out for delivery', 'assigned', 'arrived'].includes(norm)) {
    return 2;
  }
  if (['packed', 'processing', 'ready', 'arrived at store', 'accepted'].includes(norm)) {
    return 1;
  }
  return 0; // Placed / Pending
};

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

export function formatOrderNumber(orderId: string): string {
  const clean = orderId.replace(/^[#A-Za-z\-_]+/, '');
  return clean.length > 0 ? clean : orderId.replace('#', '');
}

export const TrackOrder: React.FC = () => {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    setLiveRider(null);
  }, [orderId]);

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
  }, []);

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

  const curStep = order ? getStepIndex(order.status) : 0;
  const existingRating = order?.deliveryRating?.stars || 0;
  const canRate = !!order && isDelivered && !!order.deliveryPartnerName;
  const shownStars = rateStars || existingRating;

  const handleCopyOrderId = () => {
    const raw = order?.orderId || orderId;
    if (!raw) return;
    const num = formatOrderNumber(raw);
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className="max-w-xl mx-auto px-4 py-4 md:py-6 flex flex-col gap-4 font-sans text-gray-900">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200/80 px-3 py-1.5 rounded-full shadow-xs transition-colors"
          >
            <ArrowLeft size={14} /> Orders
          </Link>
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                socketConnected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {socketConnected ? 'Live GPS' : 'Connecting'}
            </div>
            <button
              onClick={fetchOrder}
              aria-label="Refresh Order"
              className="p-1.5 rounded-full bg-white border border-gray-200/80 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-xs transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3">
            {err}
          </div>
        )}

        {order && (
          <>
            {/* Header with Order Number */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Track Order
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h1 className="text-base font-black text-gray-900 font-mono">
                    {formatOrderNumber(order.orderId)}
                  </h1>
                  <button
                    onClick={handleCopyOrderId}
                    className="text-gray-400 hover:text-emerald-700 p-1 rounded-md transition-colors"
                    title="Copy Order Number"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {normalizedStatus}
              </span>
            </div>

            {/* 1. Live Interactive Map Card */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200/90 shadow-sm bg-gray-100">
              <div ref={elRef} className="w-full h-[260px] sm:h-[280px]" />

              {/* Floating status pill over map */}
              <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl px-3 py-2.5 shadow-md flex items-center gap-2.5 pointer-events-auto">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    {isDelivered ? (
                      <CheckCircle2 size={16} className="text-emerald-700" />
                    ) : rider ? (
                      <Zap size={16} className="text-emerald-700" />
                    ) : (
                      <Store size={15} className="text-emerald-700" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {isDelivered
                      ? 'Order delivered safely'
                      : rider
                        ? 'Rider is on the way to your doorstep'
                        : 'Order being prepared at local dark store'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. ETA & Live Status Hero Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  {isDelivered ? (
                    <CheckCircle2 size={24} className="text-emerald-700" />
                  ) : (
                    <Zap size={24} className="text-emerald-700" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    ESTIMATED ARRIVAL
                  </div>
                  <div className="text-xl font-black text-gray-900 tabular-nums">
                    {isDelivered ? 'Delivered' : `${etaMins || 10} mins`}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {isDelivered
                      ? 'Groceries delivered with care'
                      : rider
                        ? 'Delivery partner is heading to your drop'
                        : 'Items being packed at FreshCart Dark Store'}
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shrink-0">
                10 MINS
              </div>
            </div>

            {/* 3. 4-Stage Milestone Stepper */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
                Delivery Milestones
              </h2>
              <div className="flex items-center justify-between relative px-2">
                {STEPS.map((step, idx) => {
                  const isDone = idx < curStep || isDelivered;
                  const isCurrent = idx === curStep && !isDelivered;
                  return (
                    <div
                      key={step}
                      className="flex-1 flex flex-col items-center relative text-center"
                    >
                      {/* Connector Line */}
                      {idx > 0 && (
                        <div
                          className={`absolute top-3 right-[50%] w-full h-1 -z-0 ${
                            isDone || isCurrent ? 'bg-emerald-600' : 'bg-gray-200'
                          }`}
                        />
                      )}

                      {/* Node circle */}
                      <div
                        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isCurrent
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                              : 'bg-gray-100 text-gray-400 border border-gray-300'
                        }`}
                      >
                        {isDone ? (
                          <Check size={14} strokeWidth={3} />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 bg-white rounded-full" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        )}
                      </div>

                      {/* Step Label */}
                      <span
                        className={`text-[11px] mt-1.5 font-bold truncate max-w-[70px] ${
                          isCurrent
                            ? 'text-emerald-700 font-extrabold'
                            : isDone
                              ? 'text-gray-900'
                              : 'text-gray-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

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

            {/* 5. Delivery Partner Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Zap size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-gray-900">
                      {order.delivery?.partnerName ||
                        order.deliveryPartnerName ||
                        'Delivery Partner'}
                    </span>
                    {(order.delivery?.rating || 4.9) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black">
                        ★ {order.delivery?.rating ? order.delivery.rating.toFixed(1) : '4.9'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    {order.delivery
                      ? order.delivery.canContact && order.delivery.phone
                        ? order.delivery.phone
                        : order.delivery.phoneMasked
                          ? `${order.delivery.phoneMasked} • contact opens at doorstep`
                          : 'Contact opens when out for delivery'
                      : 'Assigned to your order'}
                  </div>
                </div>
              </div>

              {order.delivery?.canContact && order.delivery.phone && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:${order.delivery.phone}`}
                    className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-xs"
                    aria-label="Call partner"
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`https://wa.me/91${order.delivery.phone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:opacity-95 transition-opacity shadow-xs"
                    aria-label="WhatsApp partner"
                  >
                    <MessageCircle size={16} />
                  </a>
                </div>
              )}
            </div>

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

            {/* 7. Order Items Breakdown */}
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

            {/* 8. Delivery Address Card */}
            {order.deliveryAddress && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Delivery Address
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
                          {new Date(t.at || t.timestamp!).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
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
          <div className="max-w-xl mx-auto flex items-center gap-3">
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

