import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw } from 'lucide-react';

interface FleetPartner {
  userId: string;
  name: string;
  availability: 'offline' | 'available' | 'busy';
  isOnline: boolean;
  activeOrderIds: string[];
  location: { lat: number; lng: number } | null;
  locationUpdatedAt: string | null;
}

const API_URL = '/api';
const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const rel = (iso: string | null) => {
  if (!iso) return 'unknown';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const colorFor = (p: FleetPartner) =>
  p.availability === 'busy' ? '#FFB800' : p.isOnline ? '#34C759' : '#9CA3AF';

const pin = (p: FleetPartner) =>
  L.divIcon({
    className: 'fleet-pin',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${colorFor(p)};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export const DeliveryFleetMap: React.FC = () => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [fleet, setFleet] = useState<FleetPartner[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const firstFit = useRef(true);

  const fetchFleet = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/delivery/fleet`, { headers: authHeader() });
      const data = await res.json();
      if (data.success && Array.isArray(data.fleet)) {
        setFleet(data.fleet);
        setUpdatedAt(new Date());
      }
    } catch {
      /* keep last */
    }
  };

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: false }).setView([17.4474, 78.3762], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    fetchFleet();
    const t = setInterval(fetchFleet, 10000);
    return () => {
      clearInterval(t);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // reconcile markers whenever the fleet snapshot changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    const located = fleet.filter((p) => p.location);

    located.forEach((p) => {
      seen.add(p.userId);
      const pos: [number, number] = [p.location!.lat, p.location!.lng];
      const popup = `<b>${p.name}</b><br/>${p.availability}${p.activeOrderIds.length ? ` • ${p.activeOrderIds.length} active` : ''}<br/><span style="color:#666">seen ${rel(p.locationUpdatedAt)}</span>`;
      const existing = markersRef.current[p.userId];
      if (existing) {
        existing.setLatLng(pos).setIcon(pin(p)).setPopupContent(popup);
      } else {
        markersRef.current[p.userId] = L.marker(pos, { icon: pin(p) }).addTo(map).bindPopup(popup);
      }
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    if (firstFit.current && located.length) {
      firstFit.current = false;
      map.fitBounds(L.latLngBounds(located.map((p) => [p.location!.lat, p.location!.lng])), { padding: [40, 40], maxZoom: 15 });
    }
  }, [fleet]);

  const withLoc = fleet.filter((p) => p.location).length;

  return (
    <div className="bg-surface border border-divider rounded-[28px] shadow-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-divider">
        <div>
          <h3 className="font-extrabold text-sm text-text-primary">Live fleet</h3>
          <p className="text-[10px] text-text-secondary font-medium">
            {fleet.length} online • {withLoc} with a live location
            {updatedAt && ` • updated ${updatedAt.toLocaleTimeString()}`}
          </p>
        </div>
        <button onClick={fetchFleet} className="flex items-center gap-1 border border-divider text-text-secondary font-bold py-1.5 px-3 rounded-full text-[10px] hover:bg-background cursor-pointer">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
      <div ref={elRef} className="w-full h-[320px] sm:h-[420px] bg-background" />
      {fleet.length > 0 && withLoc === 0 && (
        <div className="px-4 sm:px-6 py-2 text-[10px] text-text-secondary font-semibold border-t border-divider">
          Partners are online but haven't sent a GPS heartbeat yet.
        </div>
      )}
    </div>
  );
};

export default DeliveryFleetMap;
