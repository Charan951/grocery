import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiUrl, SOCKET_URL } from '../../config/api';

type LL = { lat: number; lng: number };

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const dot = (color: string, size = 14) =>
  L.divIcon({
    className: 'ord-rider-pin',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

/**
 * Per-order rider map for the admin order drawer. Shows the dark-store pickup,
 * the drop, and the assigned partner's live position — seeded from the fleet
 * snapshot, then updated in real time from the order's socket room
 * (`rider_location_update`, which the backend emits regardless of order status).
 */
export const OrderRiderMap: React.FC<{ orderId: string; partnerUserId?: string }> = ({
  orderId,
  partnerUserId,
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mk = useRef<{ rider?: L.Marker; pickup?: L.Marker; drop?: L.Marker }>({});
  const fitted = useRef(false);

  const [pickup, setPickup] = useState<LL | null>(null);
  const [drop, setDrop] = useState<LL | null>(null);
  const [rider, setRider] = useState<LL | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Pickup / drop (and any already-revealed rider location) from the order.
  useEffect(() => {
    let live = true;
    fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}`), { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => {
        if (!live || !d?.order) return;
        const o = d.order;
        if (o.pickup?.lat != null) setPickup({ lat: Number(o.pickup.lat), lng: Number(o.pickup.lng) });
        if (o.deliveryLocation?.lat != null)
          setDrop({ lat: Number(o.deliveryLocation.lat), lng: Number(o.deliveryLocation.lng) });
        if (o.delivery?.location?.lat != null) {
          setRider({ lat: Number(o.delivery.location.lat), lng: Number(o.delivery.location.lng) });
          setUpdatedAt(new Date());
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [orderId]);

  // Seed the rider marker from the current fleet snapshot.
  useEffect(() => {
    if (!partnerUserId) return;
    let live = true;
    fetch(apiUrl('/admin/delivery/fleet'), { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => {
        if (!live || !Array.isArray(d?.fleet)) return;
        const p = d.fleet.find((x: any) => String(x.userId) === String(partnerUserId));
        if (p?.location?.lat != null) {
          setRider({ lat: Number(p.location.lat), lng: Number(p.location.lng) });
          setUpdatedAt(p.locationUpdatedAt ? new Date(p.locationUpdatedAt) : new Date());
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [partnerUserId]);

  // Live updates for this order.
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });
    socket.on('connect', () => socket.emit('join_order_room', orderId));
    socket.on('rider_location_update', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setRider({ lat, lng });
        setUpdatedAt(new Date());
      }
    });
    return () => {
      socket.emit('leave_order_room', orderId);
      socket.removeAllListeners();
      socket.close();
    };
  }, [orderId]);

  // Map init.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView(
      [17.4474, 78.3762],
      12,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    // The drawer animates in — the container has no size on first paint.
    const fix = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(fix);
      map.remove();
      mapRef.current = null;
      mk.current = {};
      fitted.current = false;
    };
  }, []);

  // Reconcile markers + first fit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const upsert = (key: 'rider' | 'pickup' | 'drop', ll: LL | null, color: string, label: string) => {
      if (!ll) return;
      const existing = mk.current[key];
      if (existing) existing.setLatLng([ll.lat, ll.lng]);
      else
        mk.current[key] = L.marker([ll.lat, ll.lng], {
          icon: dot(color, key === 'rider' ? 18 : 14),
          zIndexOffset: key === 'rider' ? 1000 : 0,
        })
          .addTo(map)
          .bindPopup(label);
    };
    upsert('pickup', pickup, '#6B7280', 'Store');
    upsert('drop', drop, '#EF4444', 'Delivery address');
    upsert('rider', rider, '#2563EB', 'Delivery partner');

    const pts = [pickup, drop, rider].filter(Boolean) as LL[];
    if (pts.length && !fitted.current) {
      fitted.current = true;
      if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 15);
      else
        map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), {
          padding: [30, 30],
          maxZoom: 16,
        });
    }
  }, [pickup, drop, rider]);

  return (
    <div className="rounded-xl overflow-hidden border border-divider">
      <div ref={elRef} className="h-[220px] w-full bg-background" />
      <div className="px-3 py-1.5 text-[11px] font-semibold text-text-secondary bg-background border-t border-divider flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${rider ? 'bg-[#2563EB]' : 'bg-text-tertiary'}`}
        />
        {rider
          ? `Rider location • updated ${updatedAt ? updatedAt.toLocaleTimeString() : 'just now'}`
          : 'Waiting for rider location…'}
      </div>
    </div>
  );
};

export default OrderRiderMap;
