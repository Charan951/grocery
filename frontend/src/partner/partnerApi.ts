// Thin fetch wrapper for the delivery-partner web app. Mirrors
// `deliveryapp/lib/core/services/api_client.dart` — every call hits
// `/api/delivery/*` with the staff bearer token written at login.

import { API_URL } from '../config/api';

const API = API_URL;

export const partnerToken = () =>
  localStorage.getItem('admin_token') || localStorage.getItem('token') || '';

async function req<T = any>(
  path: string,
  opts: { method?: string; body?: any; query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { method = 'GET', body, query } = opts;
  let url = `${API}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${partnerToken()}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || (data && data.success === false)) {
    const err: any = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data && data.code;
    err.body = data;
    throw err;
  }
  return data as T;
}

export const partnerApi = {
  // Profile / session
  me: () => req('/delivery/me'),
  updateMe: (body: { name?: string; phone?: string; vehicleType?: string }) =>
    req('/delivery/me', { method: 'PUT', body }),
  setOnline: (isOnline: boolean) => req('/delivery/status', { method: 'PUT', body: { isOnline } }),
  pushLocation: (lat: number, lng: number) =>
    req('/delivery/location', { method: 'POST', body: { lat, lng } }),

  // Auth recovery (shared staff account, delivery-only reset)
  forgot: (email: string) => req('/delivery/auth/forgot', { method: 'POST', body: { email } }),
  reset: (email: string, code: string, password: string) =>
    req('/delivery/auth/reset', { method: 'POST', body: { email, code, password } }),

  // Offers
  pendingAssignment: () => req('/delivery/assignments/pending'),
  acceptAssignment: (id: string) => req(`/delivery/assignments/${id}/accept`, { method: 'POST' }),
  rejectAssignment: (id: string, reason?: string) =>
    req(`/delivery/assignments/${id}/reject`, { method: 'POST', body: { reason } }),

  // Orders
  activeOrders: () => req('/delivery/orders/active'),
  history: (status?: string, limit = 50) =>
    req('/delivery/orders/history', { query: { status, limit } }),
  order: (orderId: string) => req(`/delivery/orders/${encodeURIComponent(orderId)}`),
  step: (orderId: string, path: string, body?: any) =>
    req(`/delivery/orders/${encodeURIComponent(orderId)}/${path}`, { method: 'POST', body: body || {} }),
  pickupArrived: (o: string) => partnerApi.step(o, 'pickup-arrived'),
  pickedUp: (o: string) => partnerApi.step(o, 'picked-up'),
  arrived: (o: string) => partnerApi.step(o, 'arrived'),
  complete: (o: string, otp?: string, podPhoto?: string) =>
    partnerApi.step(o, 'complete', { otp, podPhoto }),
  fail: (o: string, reason: string) => partnerApi.step(o, 'fail', { reason }),
  markReturned: (o: string) => partnerApi.step(o, 'returned'),

  // Earnings
  earnings: (range: 'today' | 'week' | 'month' | 'all' = 'week') =>
    req('/delivery/earnings', { query: { range } }),

  // Notifications
  notifications: (unreadOnly = false) =>
    req('/delivery/notifications', { query: { unreadOnly: unreadOnly ? '1' : undefined } }),
  markNotificationsRead: (ids?: string[]) =>
    req('/delivery/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
};

export type PartnerProfile = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  isOnline: boolean;
  availability: string;
  activeOrderIds: string[];
  maxConcurrent: number;
  rating: number;
  ratingCount: number;
  completedCount: number;
  failedCount: number;
  lastSeenAt?: string;
  todayEarnings: number;
};

export type DeliveryOffer = {
  assignmentId: string;
  orderId: string;
  attempt: number;
  expiresAt?: string;
  distanceMeters?: number;
  amount?: number;
  paymentMethod?: string;
  isCOD?: boolean;
  itemCount?: number;
  pickup?: { name?: string; lat?: number; lng?: number } | null;
  drop?: { lat?: number; lng?: number } | null;
  deliveryAddress?: string;
};
