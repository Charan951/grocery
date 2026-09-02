import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Trash2, MapPin } from 'lucide-react';

const API_URL = '/api';
const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface Zone {
  _id: string;
  name: string;
  slaMinutes: number;
  active: boolean;
  polygon: { type: 'Polygon'; coordinates: number[][][] };
}

/** Click-to-draw polygon editor over an OSM map. */
const PolygonDraw: React.FC<{ points: [number, number][]; onChange: (p: [number, number][]) => void }> = ({ points, onChange }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current).setView([12.9716, 77.5946], 11); // Bengaluru default
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      onChange([...pointsRef.current, [e.latlng.lat, e.latlng.lng]]);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep a ref so the click handler always sees the latest points
  const pointsRef = useRef<[number, number][]>(points);
  useEffect(() => { pointsRef.current = points; });

  useEffect(() => {
    const lg = layerRef.current;
    if (!lg) return;
    lg.clearLayers();
    points.forEach(([lat, lng], i) => {
      L.circleMarker([lat, lng], { radius: 5, color: '#4CAF50', fillOpacity: 1 })
        .bindTooltip(`${i + 1}`, { permanent: true, direction: 'top', className: 'zone-pt' })
        .addTo(lg);
    });
    if (points.length >= 3) {
      L.polygon(points, { color: '#4CAF50', weight: 2, fillOpacity: 0.12 }).addTo(lg);
      mapRef.current?.fitBounds(L.latLngBounds(points).pad(0.3));
    } else if (points.length >= 1) {
      L.polyline(points, { color: '#4CAF50', weight: 2, dashArray: '4 4' }).addTo(lg);
    }
  }, [points]);

  return <div ref={elRef} className="w-full h-[320px] rounded-2xl overflow-hidden border border-divider" />;
};

export const ZonesManager: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [sla, setSla] = useState(15);
  const [pts, setPts] = useState<[number, number][]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${API_URL}/admin/delivery/zones`, { headers: authHeader() }).then(r => r.json());
      if (r.success) setZones(r.zones);
    } catch { /* keep last */ }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!name.trim() || pts.length < 3) { alert('Give the zone a name and at least 3 boundary points'); return; }
    setBusy(true);
    try {
      // API expects [lng,lat] pairs
      const coordinates = pts.map(([lat, lng]) => [lng, lat]);
      const r = await fetch(`${API_URL}/admin/delivery/zones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name: name.trim(), slaMinutes: sla, coordinates }),
      }).then(r => r.json());
      if (!r.success) { alert(r.message || 'Could not create the zone'); return; }
      setName(''); setSla(15); setPts([]); setShowAdd(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (z: Zone) => {
    await fetch(`${API_URL}/admin/delivery/zones/${z._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ active: !z.active }),
    });
    load();
  };

  const remove = async (z: Zone) => {
    if (!window.confirm(`Delete zone "${z.name}"? Partners tagged to it will be untagged.`)) return;
    await fetch(`${API_URL}/admin/delivery/zones/${z._id}`, { method: 'DELETE', headers: authHeader() });
    load();
  };

  return (
    <div className="bg-surface border border-divider rounded-[28px] shadow-card p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-sm text-text-primary">Delivery zones</h3>
          <p className="text-[10px] text-text-secondary font-medium">{zones.length} zone(s) • auto-assignment prefers a zone's tagged partners, then falls back to radius</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1 bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] hover:bg-secondary cursor-pointer">
          <Plus size={12} /> Add zone
        </button>
      </div>

      {showAdd && (
        <div className="bg-background border border-divider rounded-2xl p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Zone name (e.g. Koramangala)"
              className="px-3 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
            <label className="flex items-center gap-2 text-xs text-text-secondary font-semibold">
              SLA (min)
              <input type="number" min={1} value={sla} onChange={e => setSla(Number(e.target.value) || 15)}
                className="w-20 px-2 py-1.5 border border-divider rounded-xl text-xs bg-surface focus:outline-none focus:border-primary text-text-primary" />
            </label>
            <button onClick={() => setPts([])} className="text-xs font-bold text-text-secondary border border-divider rounded-xl px-3 py-1.5 hover:bg-surface cursor-pointer">
              Clear points ({pts.length})
            </button>
          </div>
          <p className="text-[10px] text-text-secondary font-medium">Click the map to drop boundary points (min 3), in order around the area.</p>
          <PolygonDraw points={pts} onChange={setPts} />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="bg-primary text-white font-bold py-1.5 px-4 rounded-full text-[10px] disabled:opacity-40 cursor-pointer">
              {busy ? 'Saving…' : 'Save zone'}
            </button>
            <button onClick={() => { setShowAdd(false); setPts([]); }} className="bg-surface text-text-secondary border border-divider font-bold py-1.5 px-4 rounded-full text-[10px] cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {zones.length > 0 && (
        <div className="flex flex-col gap-2">
          {zones.map(z => (
            <div key={z._id} className="flex items-center justify-between border border-divider/60 rounded-xl px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={13} className={z.active ? 'text-primary' : 'text-text-tertiary'} />
                <span className="font-bold text-text-primary truncate">{z.name}</span>
                <span className="text-text-tertiary">· SLA {z.slaMinutes}m</span>
                <span className="text-text-tertiary">· {z.polygon?.coordinates?.[0]?.length ?? 0} pts</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(z)} className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${z.active ? 'bg-success/10 text-success' : 'bg-divider text-text-secondary'} cursor-pointer`}>
                  {z.active ? 'Active' : 'Off'}
                </button>
                <button onClick={() => remove(z)} className="text-error hover:opacity-70 cursor-pointer" title="Delete zone">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZonesManager;
