import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

interface LocationPickerMapProps {
  /** Where the pin is. Changing it from outside (Locate Me / search) re-centres the map. */
  position: [number, number];
  /** GPS accuracy radius in metres; drawn as a circle when present. */
  accuracy?: number | null;
  /** The shopper moved the map; the pin now sits on these coordinates. */
  onPick: (lat: number, lng: number) => void;
  className?: string;
}

// Zoom that keeps the accuracy circle in view: street level for a precise fix.
const zoomForAccuracy = (m?: number | null) => {
  if (!m || m <= 60) return 17;
  if (m <= 250) return 16;
  if (m <= 1000) return 15;
  return 13;
};

/**
 * Real, pannable OpenStreetMap. The pin is fixed at the centre; the shopper
 * drags the map (or clicks a spot) to put their door under it.
 */
export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ position, accuracy, onPick, className }) => {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const programmatic = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView(
      position,
      zoomForAccuracy(accuracy),
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    map.on('moveend', () => {
      if (programmatic.current) {
        programmatic.current = false;
        return;
      }
      const c = map.getCenter();
      onPickRef.current(Number(c.lat.toFixed(6)), Number(c.lng.toFixed(6)));
    });
    map.on('click', (e: L.LeafletMouseEvent) => map.panTo(e.latlng));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-centre when the position is set from outside (not by panning the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const moved = Math.abs(c.lat - position[0]) > 1e-6 || Math.abs(c.lng - position[1]) > 1e-6;
    if (moved) {
      programmatic.current = true;
      map.setView(position, accuracy ? zoomForAccuracy(accuracy) : map.getZoom());
    }

    circleRef.current?.remove();
    circleRef.current = accuracy
      ? L.circle(position, {
          radius: accuracy,
          color: '#2563eb',
          weight: 1,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map)
      : null;
  }, [position, accuracy]);

  return (
    <div className={`relative ${className || ''}`}>
      <div ref={elRef} className="absolute inset-0 z-0" />
      {/* Fixed centre pin */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center z-[400]">
        <div className="w-8 h-8 rounded-full bg-error text-white flex items-center justify-center shadow-lg border-2 border-white">
          <MapPin size={20} />
        </div>
        <div className="w-3 h-1.5 bg-black/40 rounded-full blur-[1px] mt-0.5" />
      </div>
    </div>
  );
};
