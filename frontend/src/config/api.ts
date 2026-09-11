/**
 * Centralized API & Real-time Configuration
 *
 * All frontend requests (storefront, admin ops, delivery partner web) use this
 * module instead of hardcoding '/api' or server URLs. Configurable via Vite
 * environment variables in `.env` (e.g. `VITE_API_URL`).
 */

function resolveApiBaseUrl(): string {
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  if (!envUrl) return '/api';

  const clean = envUrl.replace(/\/+$/, '');

  // Relative path (e.g. '/api' or '/backend/api')
  if (clean.startsWith('/') && !clean.startsWith('//')) {
    return clean;
  }

  // Absolute URL (e.g. 'http://localhost:5000' or 'https://api.freshcart.com/api')
  if (/^https?:\/\//i.test(clean)) {
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  return clean;
}

/** The centralized base URL for all REST API endpoints. */
export const API_BASE_URL = resolveApiBaseUrl();

/** Alias for backwards compatibility across existing admin and partner screens. */
export const API_URL = API_BASE_URL;

function resolveSocketUrl(): string {
  const envSocket = (import.meta.env.VITE_SOCKET_URL || '').trim();
  if (envSocket) return envSocket.replace(/\/+$/, '');

  const envApi = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  if (/^https?:\/\//i.test(envApi)) {
    try {
      return new URL(envApi).origin;
    } catch (_) {}
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** The centralized host URL for Socket.IO connections. */
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
