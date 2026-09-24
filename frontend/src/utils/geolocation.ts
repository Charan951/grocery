/**
 * Precise "Locate Me" for the storefront.
 *
 * `getCurrentPosition` with `enableHighAccuracy: false` / a `maximumAge` hands
 * back a cached, network-based fix that can be kilometres off. Instead we ask
 * for a fresh high-accuracy fix and keep listening for a few seconds, since
 * the first reading is usually the coarsest; we resolve with the best one.
 */
export interface PreciseLocation {
  lat: number;
  lng: number;
  /** Radius in metres the browser is confident about. */
  accuracy: number;
}

export class LocationError extends Error {}

export const getPreciseLocation = ({
  maxWaitMs = 12000,
  goodEnoughMeters = 50,
}: { maxWaitMs?: number; goodEnoughMeters?: number } = {}): Promise<PreciseLocation> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new LocationError('This browser does not support location. Search for your area instead.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(new LocationError('Location needs a secure (https) connection. Search for your area instead.'));
      return;
    }

    let best: PreciseLocation | null = null;
    let done = false;
    let watchId: number | null = null;

    const finish = (err?: LocationError) => {
      if (done) return;
      done = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(err || new LocationError('Could not detect your location. Search or move the map instead.'));
    };

    const timer = setTimeout(() => finish(), maxWaitMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!best || reading.accuracy < best.accuracy) best = reading;
        if (reading.accuracy <= goodEnoughMeters) finish();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          best = null;
          finish(new LocationError(
            'Location access is blocked. Click the location icon in the address bar, allow access, then try again.',
          ));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          finish(new LocationError('Your device could not find its location. Turn on Location/Wi-Fi, or search instead.'));
        }
        // TIMEOUT: keep waiting until maxWaitMs and use the best reading so far.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    );
  });

/** Human-friendly accuracy, e.g. "±30 m" or "±2.4 km". */
export const formatAccuracy = (m: number) =>
  m >= 1000 ? `±${(m / 1000).toFixed(1)} km` : `±${Math.round(m)} m`;
