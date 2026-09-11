import { useEffect, useState } from 'react';
import { partnerApi } from './partnerApi';

/**
 * Stable per-partner delivery numbers (#1 = their very first delivery),
 * derived once from the unfiltered lifetime history (backend returns
 * newest-first) and shared by every screen that needs a human-friendly
 * label instead of the raw DB orderId (History, Earnings).
 */
export function useDeliveryNumbering(): Record<string, number> {
  const [numberByOrderId, setNumberByOrderId] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    partnerApi
      .history(undefined, 100)
      .then((r) => {
        if (cancelled) return;
        const orders = r.orders || [];
        const total = orders.length;
        const map: Record<string, number> = {};
        orders.forEach((o: any, i: number) => {
          map[o.orderId] = total - i;
        });
        setNumberByOrderId(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return numberByOrderId;
}
