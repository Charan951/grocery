import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, MessageCircle, ArrowLeft, MapPin, RefreshCw } from 'lucide-react';

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
interface TrackedOrder {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
  deliveryAddress?: string;
  deliveryLocation?: { lat: number; lng: number } | null;
  pickup?: { lat: number; lng: number; name?: string } | null;
  trackingTimeline?: { status: string; note: string; at?: string; timestamp?: string }[];
  delivery?: DeliveryBlock | null;
}

const STEPS = ['Accepted', 'Packed', 'Ready', 'Assigned', 'Out For Delivery', 'Arrived', 'Delivered'];
const stepIndex = (s: string) => {
  if (s === 'Arrived At Store') return STEPS.indexOf('Assigned');
  const i = STEPS.indexOf(s);
  return i === -1 ? 0 : i;
};

const dot = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

/** Road-following path via OSRM's public server; straight line on failure. */
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
    /* fall through */
  }
  return [[a.lat, a.lng], [b.lat, b.lng]];
}

export const TrackOrder: React.FC = () => {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

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
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (data.success && data.order) { setOrder(data.order); setErr(''); }
      else setErr(data.message || 'Order not found');
    } catch {
      setErr('Network error');
    }
  };

  useEffect(() => {
    fetchOrder();
    const t = setInterval(() => { fetchOrder(); setTick((n) => n + 1); }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const terminal = order ? ['Delivered', 'Cancelled', 'Returned', 'Refunded', 'Failed'].includes(order.status) : false;
  const rider = order?.delivery?.location || null;
  const dest = order?.deliveryLocation || null;
  const pickup = order?.pickup || null;

  const etaMins = useMemo(() => {
    if (!rider || !dest) return null;
    const km = haversineKm(rider, dest);
    return Math.max(2, Math.round((km / 18) * 60)); // ~18 km/h city average
  }, [rider, dest, tick]);

  // map init
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView([17.4474, 78.3762], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    map.on('dragstart', () => { userMoved.current = true; });
    mapRef.current = map;
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.remove();
      mapRef.current = null;
      riderMk.current = destMk.current = pickupMk.current = null;
      routeLine.current = null;
    };
  }, []);

  // markers + route + follow
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (dest) {
      if (destMk.current) destMk.current.setLatLng([dest.lat, dest.lng]);
      else destMk.current = L.marker([dest.lat, dest.lng], { icon: dot('#EF4444') }).addTo(map).bindPopup('Delivery address');
    }
    if (pickup) {
      if (pickupMk.current) pickupMk.current.setLatLng([pickup.lat, pickup.lng]);
      else pickupMk.current = L.marker([pickup.lat, pickup.lng], { icon: dot('#6B7280') }).addTo(map).bindPopup('Store');
    }

    if (rider) {
      if (!riderMk.current) {
        riderMk.current = L.marker([rider.lat, rider.lng], { icon: dot('#2E7D32'), zIndexOffset: 1000 }).addTo(map).bindPopup('Your delivery partner');
      } else {
        // glide from the old position to the new one (~1.2s)
        const from = riderMk.current.getLatLng();
        const to = L.latLng(rider.lat, rider.lng);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min((now - t0) / 1200, 1);
          riderMk.current?.setLatLng([from.lat + (to.lat - from.lat) * k, from.lng + (to.lng - from.lng) * k]);
          if (k < 1) animRef.current = requestAnimationFrame(step);
        };
        animRef.current = requestAnimationFrame(step);
      }
    } else if (riderMk.current) {
      riderMk.current.remove();
      riderMk.current = null;
    }

    // (re)compute the road route when the rider has moved enough
    if (rider && dest) {
      const moved = !lastRouteFrom.current || haversineKm(lastRouteFrom.current, rider) * 1000 > 40;
      if (moved) {
        lastRouteFrom.current = rider;
        fetchRoute(rider, dest).then((coords) => {
          const m = mapRef.current;
          if (!m) return;
          if (routeLine.current) routeLine.current.setLatLngs(coords);
          else routeLine.current = L.polyline(coords, { color: '#2E7D32', weight: 4, opacity: 0.85 }).addTo(m);
        });
      }
    }

    // fit once, then only follow the rider if it drifts out of view
    const pts: [number, number][] = [];
    if (rider) pts.push([rider.lat, rider.lng]);
    if (dest) pts.push([dest.lat, dest.lng]);
    if (pts.length && !fitted.current) {
      fitted.current = true;
      if (pts.length === 1) map.setView(pts[0], 15);
      else map.fitBounds(L.latLngBounds(pts), { padding: [55, 55], maxZoom: 16 });
    } else if (rider && !userMoved.current && !map.getBounds().pad(-0.15).contains([rider.lat, rider.lng])) {
      if (dest) map.fitBounds(L.latLngBounds([[rider.lat, rider.lng], [dest.lat, dest.lng]]), { padding: [55, 55], maxZoom: 16 });
      else map.panTo([rider.lat, rider.lng]);
    }
  }, [rider, dest, pickup]);

  const curStep = order ? stepIndex(order.status) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <Link to="/account/orders" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm font-bold w-fit">
        <ArrowLeft size={15} /> Orders
      </Link>

      {err && <div className="rounded-xl bg-red-50 text-red-600 text-sm font-semibold px-4 py-3">{err}</div>}

      {order && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">Order {order.orderId}</h1>
              <p className="text-sm font-semibold text-gray-500">
                {terminal ? order.status
                  : order.status === 'Out For Delivery' && etaMins ? `Arriving in ~${etaMins} min`
                  : order.status === 'Arrived' ? 'Your partner has arrived'
                  : order.status}
              </p>
            </div>
            <button onClick={fetchOrder} className="flex items-center gap-1 border border-gray-200 text-gray-500 font-bold py-1.5 px-3 rounded-full text-[11px] hover:bg-gray-50">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full ${i <= curStep && !terminal || (terminal && order.status === 'Delivered') ? 'bg-[#2E7D32]' : 'bg-gray-200'}`} />
                <span className={`text-[8px] font-bold uppercase tracking-tight text-center ${i <= curStep ? 'text-gray-700' : 'text-gray-300'}`}>{s}</span>
              </div>
            ))}
          </div>

          {!terminal && (dest || rider) && (
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <div ref={elRef} className="w-full h-[300px] sm:h-[360px] bg-gray-100" />
            </div>
          )}

          {order.delivery && !terminal && (
            <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-extrabold text-gray-900 text-sm">{order.delivery.partnerName}</div>
                <div className="text-xs text-gray-500 font-semibold">
                  {order.delivery.vehicleType || 'Delivery partner'}
                  {order.delivery.rating ? ` · ★ ${order.delivery.rating.toFixed(1)}` : ''}
                  {' · '}
                  {order.delivery.revealed ? (order.delivery.phone || order.delivery.phoneMasked) : order.delivery.phoneMasked}
                </div>
                {!order.delivery.revealed && (
                  <div className="text-[11px] text-gray-400 font-medium mt-0.5">Contact opens when your order is out for delivery</div>
                )}
              </div>
              {order.delivery.canContact && order.delivery.phone && (
                <div className="flex gap-2 shrink-0">
                  <a href={`tel:${order.delivery.phone}`} className="p-2.5 rounded-full bg-[#2E7D32] text-white" aria-label="Call">
                    <Phone size={15} />
                  </a>
                  <a href={`https://wa.me/91${order.delivery.phone.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-full bg-[#25D366] text-white" aria-label="WhatsApp">
                    <MessageCircle size={15} />
                  </a>
                </div>
              )}
            </div>
          )}

          {order.deliveryAddress && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <span className="font-medium">{order.deliveryAddress}</span>
            </div>
          )}

          {/* timeline */}
          {order.trackingTimeline && order.trackingTimeline.length > 0 && (
            <div className="flex flex-col gap-3 pl-4 border-l border-gray-200">
              {[...order.trackingTimeline].reverse().map((t, i) => (
                <div key={i} className="relative text-xs">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#2E7D32] border-2 border-white" />
                  <div className="font-bold text-gray-900">{t.status}</div>
                  <div className="text-gray-500 font-medium">{t.note}</div>
                  {(t.at || t.timestamp) && (
                    <div className="text-[10px] text-gray-400 font-semibold">{new Date(t.at || t.timestamp!).toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TrackOrder;
