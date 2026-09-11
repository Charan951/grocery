import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { partnerToken, type DeliveryOffer } from './partnerApi';
import { SOCKET_URL } from '../config/api';

// One socket connection for the whole partner app. The backend joins this
// socket to `partner:<userId>` from the JWT alone (see backend/app.js), so we
// only listen — we never emit a join.
export function usePartnerSocket(onOrderStatus?: (p: any) => void) {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const cbRef = useRef(onOrderStatus);
  cbRef.current = onOrderStatus;

  useEffect(() => {
    const token = partnerToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('delivery_offer', (payload: DeliveryOffer & { probe?: boolean }) => {
      if (payload && !payload.probe && payload.assignmentId) setOffer(payload);
    });
    socket.on('delivery_offer_revoked', (payload: { assignmentId?: string }) => {
      setOffer((cur) => (cur && payload?.assignmentId === cur.assignmentId ? null : cur));
    });
    socket.on('assignment_confirmed', () => setOffer(null));
    socket.on('order_status_update', (payload: any) => cbRef.current?.(payload));

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, []);

  return { offer, setOffer, connected };
}
