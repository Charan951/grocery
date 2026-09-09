import { useEffect, useRef } from 'react';
import { partnerApi } from './partnerApi';

// While the partner is online, push the browser location to the backend on a
// throttle. `locationLimiter` on the server allows 30 hits/min, so ~25s is safe.
const MIN_INTERVAL_MS = 25_000;

export function useLocationHeartbeat(active: boolean) {
  const lastSent = useRef(0);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return;

    const send = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent.current < MIN_INTERVAL_MS) return;
      lastSent.current = now;
      partnerApi.pushLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
    };

    // One immediate fix, then follow movement.
    navigator.geolocation.getCurrentPosition(send, () => {}, { enableHighAccuracy: true, timeout: 10_000 });
    watchId.current = navigator.geolocation.watchPosition(send, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
    });

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [active]);
}
