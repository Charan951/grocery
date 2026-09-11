/**
 * Centralized API & Real-time Configuration
 *
 * All frontend requests (storefront, admin ops, delivery partner web) use this
 * module instead of hardcoding '/api' or server URLs.
 *
 * Configurable via a single environment variable in `.env`:
 *   `VITE_API_URL=http://localhost:5000`
 *
 * - API endpoints automatically target `${VITE_API_URL}/api`
 * - Socket.IO automatically derives its host origin from `VITE_API_URL`
 */

function normalizeHost(url: string): string {
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (/^localhost(:\d+)?/i.test(clean) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean;
}

function resolveApiBaseUrl(): string {
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  if (!envUrl) return '/api';

  const clean = normalizeHost(envUrl);

  // Relative path (e.g. '/api' or '/backend/api')
  if (clean.startsWith('/') && !clean.startsWith('//')) {
    return clean;
  }

  // Absolute URL (e.g. 'http://localhost:5000' or 'https://api.freshcart.com')
  if (/^https?:\/\//i.test(clean)) {
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  return clean;
}

/** The centralized base URL for all REST API endpoints (e.g. http://localhost:5000/api). */
export const API_BASE_URL = resolveApiBaseUrl();

/** Alias for backwards compatibility across existing admin and partner screens. */
export const API_URL = API_BASE_URL;

function resolveSocketUrl(): string {
  // Optional explicit override (if Socket server is hosted on a different host/port)
  const envSocket = (import.meta.env.VITE_SOCKET_URL || '').trim();
  if (envSocket) return normalizeHost(envSocket);

  // Automatically derived from VITE_API_URL
  const envApi = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  if (envApi) {
    const clean = normalizeHost(envApi);
    if (/^https?:\/\//i.test(clean)) {
      try {
        return new URL(clean).origin;
      } catch (_) {}
    }
  }

  // Fallback to current browser window origin (supports local Vite dev proxy)
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** The centralized host URL for Socket.IO connections (e.g. http://localhost:5000). */
export const SOCKET_URL = resolveSocketUrl();

/**
 * Builds a full API endpoint URL from a relative path, ensuring single `/api` prefix.
 *
 * @param path - e.g. '/products', 'products', or '/api/products'
 * @returns Fully qualified endpoint URL, e.g. `${API_BASE_URL}/products`
 */
export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;

  // External URLs (e.g. Nominatim or 3rd party services) remain untouched
  if (/^https?:\/\//i.test(path)) return path;

  let clean = path.replace(/^\/+/, '');
  if (clean.startsWith('api/')) {
    clean = clean.slice(4);
  } else if (clean === 'api') {
    clean = '';
  }

  if (!clean) return API_BASE_URL;
  return `${API_BASE_URL}/${clean}`;
}

export default {
  API_BASE_URL,
  API_URL,
  SOCKET_URL,
  apiUrl,
};
