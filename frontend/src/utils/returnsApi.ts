// Customer-side client for returns & exchanges. Mirrors the other
// self-service order endpoints: a customer token when present, plus the
// signed-in customer's phone so the web works without one.
import { apiUrl } from '../config/api';

export type ReturnType = 'return' | 'exchange';
export type ReturnStatus =
  | 'Requested' | 'Assigned' | 'Arrived' | 'Picked Up' | 'Completed'
  | 'Rejected' | 'Pickup Failed' | 'Cancelled';

export interface ReturnReason { code: string; label: string; types: ReturnType[]; requiresComment?: boolean }
export interface ReturnConfig { enabled: boolean; windowHours: number; refundDelayHours: number; maxPhotos: number; reasons: ReturnReason[] }

export interface ReturnableItem {
  key: string; name: string; image?: string; weightSpec?: string;
  price: number; quantity: number; returnableQty: number;
}

export interface ReturnRefund {
  amount: number; method: 'wallet' | 'original';
  status: 'none' | 'scheduled' | 'processing' | 'processed' | 'failed';
  dueAt?: string; processedAt?: string;
}

export interface ReturnRequest {
  returnId: string; orderId: string; type: ReturnType; status: ReturnStatus;
  items: { productId: string; name: string; image?: string; price: number; quantity: number }[];
  reasonCode: string; reasonLabel: string; comment?: string; photos: string[];
  pickupAddress?: string; pickupOtp?: string; partnerName?: string | null;
  proofPhotos: string[]; rejectionReason?: string; failureReason?: string;
  refund?: ReturnRefund; timeline: { status: string; note?: string; at?: string }[];
  createdAt: string; pickedUpAt?: string; completedAt?: string;
}

export interface OrderReturns {
  eligible: boolean; reason: string | null; windowHours: number; windowEndsAt: string | null;
  refundDelayHours: number; refundMethods: ('wallet' | 'original')[];
  items: ReturnableItem[]; requests: ReturnRequest[];
}

const customerPhone = (): string => {
  try {
    const u = JSON.parse(localStorage.getItem('customer_user') || '{}');
    return String(u?.phone || '').replace(/\D/g, '').slice(-10);
  } catch { return ''; }
};

const headers = (): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('customer_token');
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), { ...init, headers: { ...headers(), ...(init.headers || {}) } });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.message || 'Something went wrong. Please try again.');
  return data as T;
}

const withPhone = (path: string) => `${path}${path.includes('?') ? '&' : '?'}phone=${encodeURIComponent(customerPhone())}`;

export const returnsApi = {
  config: () => call<{ config: ReturnConfig }>('/returns/config').then((d) => d.config),
  forOrder: (orderId: string) => call<OrderReturns>(withPhone(`/orders/${encodeURIComponent(orderId)}/returns`)),
  mine: () => call<{ returns: ReturnRequest[] }>(withPhone('/returns/mine')).then((d) => d.returns),
  create: (orderId: string, body: {
    type: ReturnType; items: { key: string; quantity: number }[]; reasonCode: string;
    comment?: string; photos?: string[]; refundMethod?: 'wallet' | 'original';
  }) => call<{ returnRequest: ReturnRequest }>(`/orders/${encodeURIComponent(orderId)}/returns`, {
    method: 'POST', body: JSON.stringify({ ...body, phone: customerPhone() }),
  }).then((d) => d.returnRequest),
  cancel: (returnId: string) => call<{ returnRequest: ReturnRequest }>(`/returns/${encodeURIComponent(returnId)}/cancel`, {
    method: 'POST', body: JSON.stringify({ phone: customerPhone() }),
  }).then((d) => d.returnRequest),
};

/** Shrink a camera photo to a ≤1280px JPEG data URI before upload. */
export const compressImage = (file: File, maxSide = 1280, quality = 0.72): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the photo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

/** Customer-facing wording per status — differs for return vs exchange. */
export const returnStatusCopy = (r: Pick<ReturnRequest, 'status' | 'type' | 'refund'>): { title: string; tone: 'info' | 'progress' | 'success' | 'muted' | 'danger' } => {
  const ex = r.type === 'exchange';
  switch (r.status) {
    case 'Requested': return { title: 'Finding a pickup partner', tone: 'info' };
    case 'Assigned': return { title: 'Pickup partner assigned', tone: 'progress' };
    case 'Arrived': return { title: 'Partner is at your door', tone: 'progress' };
    case 'Picked Up':
    case 'Completed':
      if (ex) return { title: 'Exchanged', tone: 'success' };
      if (r.refund?.status === 'processed') return { title: 'Refunded', tone: 'success' };
      return { title: 'Picked up · refund on the way', tone: 'progress' };
    case 'Pickup Failed': return { title: 'Pickup missed · rescheduling', tone: 'danger' };
    case 'Rejected': return { title: 'Request declined', tone: 'danger' };
    case 'Cancelled': return { title: 'Cancelled', tone: 'muted' };
    default: return { title: r.status, tone: 'info' };
  }
};
