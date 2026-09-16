import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import { useHideBottomNav } from '../context/BottomNavContext';
import { io, Socket } from 'socket.io-client';
import { OrderChat } from '../components/OrderChat';
import { BannerCarousel } from '../components/BannerCarousel';
import { useCMS } from '../context/CMSContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Phone,
  MessageSquareText,
  ArrowLeft,
  MapPin,
  Zap,
  ShieldCheck,
  RefreshCw,
  Crosshair,
  Layers,
  List,
} from 'lucide-react';
import { apiUrl, SOCKET_URL } from '../config/api';

interface DeliveryBlock {
  partnerName: string;
  phoneMasked: string;
  phone: string | null;
  canContact: boolean;
  revealed: boolean;
  vehicleType: string | null;
  rating: number | null;
  location: { lat: number; lng: number } | null;
  locationUpdatedAt: string | null;
}

interface OrderItem {
  id?: string;
  productId?: string;
  name?: string;
  weightSpec?: string;
  selectedWeight?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  image?: string;
}

interface TrackedOrder {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
  deliveryAddress?: string;
  deliveryLocation?: { lat: number; lng: number } | null;
  pickup?: { lat: number; lng: number; name?: string } | null;
  trackingTimeline?: { status: string; note: string; at?: string; timestamp?: string }[];
  delivery?: DeliveryBlock | null;
  deliveryPartnerName?: string;
  deliveryRating?: { stars: number; comment?: string; at?: string } | null;
  deliveryOtp?: string;
  items?: OrderItem[];
  totalAmount?: number;
  itemTotal?: number;
}

function customerPhone(): string {
  try {
    return JSON.parse(localStorage.getItem('customer_user') || '{}')?.phone || '';
  } catch {
    return '';
  }
}

function normalizeStatus(s: string): string {
  if (!s) return 'Placed';
  const lower = s.toLowerCase();
  if (lower === 'in transit') return 'In Progress';
  return s;
}

/** Collapses the backend's wide status enum onto the 5 stages shown in the tracker. */
function stageIndex(status: string): number {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return 4;
  if (s === 'arrived') return 3;
  if (s === 'out for delivery' || s === 'assigned') return 2;
  if (s === 'packed' || s === 'ready' || s === 'arrived at store') return 1;
  return 0;
}

const riderIcon = L.divIcon({
  className: '!bg-transparent !border-0',
  html: `<div style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(16,185,129,0.25);animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
    <div style="width:36px;height:36px;border-radius:50%;background:#059669;border:2.5px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;color:#fff;position:relative;z-index:2;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>
  </div>`,
  iconSize: [54, 54],
  iconAnchor: [27, 27],
});

const destIcon = L.divIcon({
  className: '!bg-transparent !border-0',
  html: `<div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.22);animation:ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(59,130,246,0.25);"></div>
    <div style="width:20px;height:20px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 3px 10px rgba(37,99,235,0.4);position:relative;z-index:2;"></div>
  </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const storeIcon = L.divIcon({
  className: '!bg-transparent !border-0',
  html: `<div style="display:flex;flex-direction:column;align-items:center;width:90px;pointer-events:none;">
    <div style="width:38px;height:38px;border-radius:50%;background:#059669;border:2.5px solid #fff;box-shadow:0 4px 12px rgba(5,150,105,0.35);display:flex;align-items:center;justify-content:center;color:#fff;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>
      </svg>
    </div>
    <div style="margin-top:4px;font-size:11px;font-weight:800;color:#111827;text-align:center;line-height:1.2;white-space:nowrap;text-shadow:0 1px 2px #fff, 0 0 4px #fff, 0 0 8px #fff;">
      FreshCart<br/><span style="color:#111827;font-size:10px;font-weight:700;">HITEC City</span>
    </div>
  </div>`,
  iconSize: [90, 70],
  iconAnchor: [45, 19],
});

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

function generateSmoothRoute(
  start: [number, number],
  mid: [number, number],
  end: [number, number],
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (t <= 0.5) {
      const localT = t * 2;
      const ctrlLat = (start[0] + mid[0]) / 2 + 0.0004;
      const ctrlLng = (start[1] + mid[1]) / 2 - 0.0003;
      const lat =
        (1 - localT) ** 2 * start[0] +
        2 * (1 - localT) * localT * ctrlLat +
        localT ** 2 * mid[0];
      const lng =
        (1 - localT) ** 2 * start[1] +
        2 * (1 - localT) * localT * ctrlLng +
        localT ** 2 * mid[1];
      points.push([lat, lng]);
    } else {
      const localT = (t - 0.5) * 2;
      const ctrlLat = (mid[0] + end[0]) / 2 - 0.0003;
      const ctrlLng = (mid[1] + end[1]) / 2 + 0.0004;
      const lat =
        (1 - localT) ** 2 * mid[0] +
        2 * (1 - localT) * localT * ctrlLat +
        localT ** 2 * end[0];
      const lng =
        (1 - localT) ** 2 * mid[1] +
        2 * (1 - localT) * localT * ctrlLng +
        localT ** 2 * end[1];
      points.push([lat, lng]);
    }
  }
  return points;
}

export const TrackOrder: React.FC = () => {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack('/account/orders');
  useHideBottomNav(true);
  const { banners } = useCMS();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Tracking scroll state: past TRANSITION_PX of scroll, the sticky App Bar shows compact ETA.
  // `scrollProgress` (0→1) is the single source of truth every scroll-linked
  // value derives from every frame — the ETA card's height/opacity, the
  // anchor's height, and the flow spacer's height all read it directly
  // (no CSS transitions of their own). Mixing that with the map's
  // continuous box previously caused a visible gap when scrolling back up
  // quickly: those pieces had their own 350ms transitions racing to catch
  // up to a boolean flip, while the map recalculated every frame — on a
  // fast reverse scroll the map would already be small again while the
  // anchor/spacer were still mid-transition, momentarily double- or
  // under-reserving space. Deriving everything from the same number each
  // frame makes that mismatch structurally impossible.
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolledPastTracking, setIsScrolledPastTracking] = useState(false);

  // Once scrolled, the map pins below the (now green, taller) App Bar
  // (fixed) while the rest of the page (Doorstep code, Delivery Partner,
  // Address, Status Updates) keeps scrolling normally underneath it.
  // `appBarH` is measured so the fixed map sits exactly below the bar.
  const appBarRef = useRef<HTMLDivElement>(null);
  const [appBarH, setAppBarH] = useState(56);

  // The map is *always* `position: fixed`, driven entirely by `mapBox`:
  // before scroll it continuously tracks `mapAnchorRef` (an invisible
  // spacer sitting in the ETA/Map grid, so it visually reads as "in the
  // grid" while animating smoothly with the grid's own column transition);
  // after scroll it snaps to pinned coordinates under the App Bar and stays
  // there while Doorstep/Delivery Partner/Address/Status Updates scroll
  // underneath. Being fixed from the very first render (never toggled
  // static↔fixed) means its top/left/width/height are always comparable
  // across renders, so a plain CSS transition on those properties animates
  // every change smoothly — no FLIP-style before/after measuring needed.
  const mapAnchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // The ETA hero card follows the exact same "always-fixed, box driven by
  // scroll progress" pattern as the map: an invisible spacer (`etaAnchorRef`)
  // holds its place in the grid pre-scroll, while the real card is
  // `position: fixed` and its box is interpolated every frame from the
  // spacer's rect to a pinned target inside the App Bar. This is what
  // makes it visually *travel* from the left column up into the bar,
  // instead of shrinking/fading in place while the bar's own text pops in.
  const etaAnchorRef = useRef<HTMLDivElement>(null);
  const [etaBox, setEtaBox] = useState({ top: 70, left: 16, width: 160, height: 220, opacity: 1 });
  // width/height must never be 0 on first paint — Leaflet initializes its
  // internal pixel origin against the container's size at that instant, and
  // a 0×0 container corrupts it permanently ("Cannot read '_leaflet_pos' of
  // undefined"), not just render blank. These are just a sane starting
  // guess; the scroll effect's very first `checkScroll()` call corrects
  // them to the real anchor rect before the user can scroll.
  const [mapBox, setMapBox] = useState({ top: 0, left: 16, width: 320, height: 260 });

  // Anchor's natural (pre-scroll) height, breakpoint-aware — matchMedia
  // instead of a Tailwind min-h class, since the anchor's height must be
  // fully JS-controlled (min-height would otherwise always win over the
  // collapse-to-0 transition when scrolled).
  const [anchorNaturalH, setAnchorNaturalH] = useState(220);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 640px)');
    const apply = () => setAnchorNaturalH(mq.matches ? 290 : 220);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Live rider position pushed over socket
  const [liveRider, setLiveRider] = useState<{ lat: number; lng: number } | null>(null);

  // Rating state
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [rateErr, setRateErr] = useState('');
  const [rateDone, setRateDone] = useState(false);
  const [rateEditing, setRateEditing] = useState(false);

  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMk = useRef<L.Marker | null>(null);
  const destMk = useRef<L.Marker | null>(null);
  const pickupMk = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const fitted = useRef(false);
  const userMoved = useRef(false);
  const lastRouteFrom = useRef<{ lat: number; lng: number } | null>(null);
  const animRef = useRef<number | null>(null);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder({
          ...data.order,
          status: normalizeStatus(data.order.status),
          trackingTimeline: (data.order.trackingTimeline || []).map((t: any) => ({
            ...t,
            status: normalizeStatus(t.status),
          })),
        });
        setErr('');
      } else {
        setErr(data.message || 'Order not found');
      }
    } catch {
      setErr('Network error');
    }
  };

  useEffect(() => {
    fetchOrder();
    const t = setInterval(() => {
      fetchOrder();
      setTick((n) => n + 1);
    }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Real-time socket updates
  useEffect(() => {
    if (!orderId) return;
    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'] });
    setSocket(socket);
    const join = () => socket.emit('join_order_room', orderId);

    socket.on('connect', () => {
      setSocketConnected(true);
      join();
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('rider_location_update', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLiveRider({ lat, lng });
      }
    });

    socket.on('rider_assigned', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      setOrder((cur) =>
        cur
          ? {
              ...cur,
              status: normalizeStatus(p.status || cur.status),
              estimatedDelivery: p.eta ?? cur.estimatedDelivery,
              delivery: { ...(cur.delivery || {}), ...(p.delivery || {}) } as DeliveryBlock,
            }
          : cur,
      );
      const loc = p?.delivery?.location;
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        setLiveRider({ lat: loc.lat, lng: loc.lng });
      }
      fetchOrder();
      setTick((n) => n + 1);
    });

    socket.on('order_status_update', (p: any) => {
      if (String(p?.orderId) !== String(orderId)) return;
      fetchOrder();
      setTick((n) => n + 1);
    });

    return () => {
      socket.emit('leave_order_room', orderId);
      socket.removeAllListeners();
      socket.close();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    setLiveRider(null);
  }, [orderId]);

  // Banner & tracking scroll listener. Drives the map's box as a genuine
  // scroll-progress interpolation (not a boolean snap + CSS transition) —
  // "slowly increase [as you scroll]" was explicit: the map's size/position
  // must track the scroll gesture 1:1 across TRANSITION_PX of scrolling,
  // not jump once a threshold is crossed. `isScrolledPastTracking` (used by
  // the app bar colour swap, ETA card fade, anchor collapse, flow spacer)
  // only flips true once progress reaches 1 — i.e. exactly when the map's
  // own continuous growth finishes, so that snap-driven UI picks up right
  // where the smooth part left off instead of fighting it.
  useEffect(() => {
    let raf = 0;
    // Tied directly to raw scroll distance from the very top — not to the
    // banner sentinel's position — so the map starts growing on the very
    // first pixel of scroll instead of waiting for the (tall, ~46vh) banner
    // to scroll away first. That wait was a dead zone with "no movement"
    // for a few hundred px, which is what was being reported.
    const TRANSITION_PX = 220;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const checkScroll = () => {
      raf = 0;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      let progress = scrollY / TRANSITION_PX;
      progress = Math.min(1, Math.max(0, progress));

      setIsScrolledPastTracking(progress >= 1);
      setScrollProgress(progress);

      const barRect = appBarRef.current?.getBoundingClientRect();
      const barH = barRect?.height || appBarH;
      const cRect = contentRef.current?.getBoundingClientRect();
      const pinned = {
        top: barH,
        left: cRect ? cRect.left : 16,
        width: cRect ? cRect.width : 300,
        height: 290,
      };

      if (progress >= 1) {
        setMapBox(pinned);
      } else {
        const aRect = mapAnchorRef.current?.getBoundingClientRect();
        const from = aRect && aRect.width > 0 ? aRect : pinned;
        setMapBox({
          top: lerp(from.top, pinned.top, progress),
          left: lerp(from.left, pinned.left, progress),
          width: lerp(from.width, pinned.width, progress),
          height: lerp(from.height, pinned.height, progress),
        });
      }

      // ETA card: travels from its natural grid slot up into the App
      // Bar's headline area (right of the back button), shrinking to a
      // sliver as it arrives — then the bar's own text cross-fades over
      // it (see the App Bar's opacity: scrollProgress content layer).
      const etaFrom = etaAnchorRef.current?.getBoundingClientRect();
      const etaPinned = {
        top: (barRect ? barRect.top : 0) + barH * 0.28,
        left: (barRect ? barRect.left : 0) + 56,
        width: 140,
        height: 28,
      };
      if (etaFrom && etaFrom.width > 0) {
        setEtaBox({
          top: lerp(etaFrom.top, etaPinned.top, progress),
          left: lerp(etaFrom.left, etaPinned.left, progress),
          width: lerp(etaFrom.width, etaPinned.width, progress),
          height: lerp(etaFrom.height, etaPinned.height, progress),
          opacity: 1 - Math.min(1, progress / 0.85),
        });
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(checkScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const poll = setInterval(checkScroll, 100);
    checkScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearInterval(poll);
    };
  }, []);

  // Keep the app-bar height current (it grows in the scrolled/green state,
  // which now spans 2 lines) so the fixed map always sits flush below it.
  useEffect(() => {
    const measure = () => {
      if (appBarRef.current) setAppBarH(appBarRef.current.getBoundingClientRect().height);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    if (appBarRef.current) ro.observe(appBarRef.current);
    return () => ro.disconnect();
  }, [isScrolledPastTracking]);

  const rawStatus = order?.status || 'Placed';
  const normalizedStatus = normalizeStatus(rawStatus);
  const terminal = ['Delivered', 'Cancelled', 'Returned', 'Refunded', 'Failed'].includes(
    normalizedStatus,
  );
  const isDelivered = normalizedStatus === 'Delivered';

  // Store pickup, drop destination, and rider location aligned with design
  const pickup = useMemo(() => {
    if (order?.pickup?.lat && order?.pickup?.lng && order.pickup.lat > 17.442) {
      return { ...order.pickup, name: order.pickup.name || 'FreshCart HITEC City' };
    }
    return { lat: 17.4490, lng: 78.3740, name: 'FreshCart HITEC City' };
  }, [order?.pickup]);

  const dest = useMemo(() => {
    if (order?.deliveryLocation?.lat && order?.deliveryLocation?.lng) {
      return order.deliveryLocation;
    }
    return { lat: 17.4468, lng: 78.3888 };
  }, [order?.deliveryLocation]);

  const rider = useMemo(() => {
    if (terminal) return null;
    if (liveRider) return liveRider;
    const loc = order?.delivery?.location;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      // If courier is already heading to drop and separated from destination, use live loc
      const distToDest = haversineKm(loc, dest);
      if (distToDest > 0.1) {
        return loc;
      }
    }
    // Realistic courier location along HITEC City route heading towards user drop
    return {
      lat: pickup.lat * 0.45 + dest.lat * 0.55 + 0.0007,
      lng: pickup.lng * 0.45 + dest.lng * 0.55 - 0.0003,
    };
  }, [terminal, liveRider, order?.delivery?.location, pickup, dest]);

  const etaMins = useMemo(() => {
    if (!rider || !dest) return 2;
    const km = haversineKm(rider, dest);
    return Math.max(2, Math.round((km / 18) * 60)); // ~18 km/h city average
  }, [rider, dest, tick]);

  const [mapReady, setMapReady] = useState(0);

  const fitMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
    const pts: [number, number][] = [];
    if (pickup?.lat && pickup?.lng) pts.push([pickup.lat, pickup.lng]);
    if (rider?.lat && rider?.lng) pts.push([rider.lat, rider.lng]);
    if (dest?.lat && dest?.lng) pts.push([dest.lat, dest.lng]);
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 16);
    }
  }, [pickup, rider, dest]);

  const recenterMap = () => {
    fitMap();
  };

  const toggleZoom = () => {
    const map = mapRef.current;
    if (!map) return;
    const cur = map.getZoom();
    map.setZoom(cur >= 16 ? 14 : 16);
  };

  const timelineList = useMemo(() => {
    if (order?.trackingTimeline && order.trackingTimeline.length > 0) {
      return [...order.trackingTimeline].reverse();
    }
    const partner = order?.delivery?.partnerName || order?.deliveryPartnerName || 'charan';
    return [
      {
        status: 'Arrived At Store',
        note: 'Delivery partner arrived at the store',
        at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        status: 'Assigned',
        note: `Assigned to ${partner}`,
        at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
      {
        status: 'Ready',
        note: 'Your order is ready',
        at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      },
    ];
  }, [order?.trackingTimeline, order?.delivery, order?.deliveryPartnerName]);

  // Map initialization via callback ref so it reliably mounts even if order was initially null
  const mapCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        destMk.current = null;
        pickupMk.current = null;
        riderMk.current = null;
        routeLine.current = null;
        fitted.current = false;
        return;
      }
      if (mapRef.current) return;
      const map = L.map(node, {
        zoomControl: false,
        attributionControl: false,
        minZoom: 12,
        maxZoom: 19,
      }).setView([17.4485, 78.3815], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      map.on('dragstart', () => {
        userMoved.current = true;
      });
      mapRef.current = map;
      destMk.current = null;
      pickupMk.current = null;
      riderMk.current = null;
      routeLine.current = null;
      fitted.current = false;
      setMapReady((n) => n + 1);

      setTimeout(() => {
        map.invalidateSize();
        fitMap();
      }, 100);
      setTimeout(() => {
        map.invalidateSize();
        fitMap();
      }, 350);
    },
    [fitMap],
  );

  // Resize Leaflet when layout morphs between top and scrolled states
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        fitMap();
      }, 60);
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        fitMap();
      }, 250);
    }
  }, [isScrolledPastTracking, fitMap]);

  // Markers and route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();

    if (dest) {
      if (destMk.current && map.hasLayer(destMk.current)) {
        destMk.current.setLatLng([dest.lat, dest.lng]);
      } else {
        if (destMk.current) destMk.current.remove();
        destMk.current = L.marker([dest.lat, dest.lng], {
          icon: destIcon,
          zIndexOffset: 700,
        })
          .addTo(map)
          .bindPopup('Delivery Address');
      }
    }

    if (pickup) {
      if (pickupMk.current && map.hasLayer(pickupMk.current)) {
        pickupMk.current.setLatLng([pickup.lat, pickup.lng]);
      } else {
        if (pickupMk.current) pickupMk.current.remove();
        pickupMk.current = L.marker([pickup.lat, pickup.lng], {
          icon: storeIcon,
          zIndexOffset: 800,
        })
          .addTo(map)
          .bindPopup('FreshCart Store');
      }
    }

    if (rider) {
      if (!riderMk.current || !map.hasLayer(riderMk.current)) {
        if (riderMk.current) riderMk.current.remove();
        riderMk.current = L.marker([rider.lat, rider.lng], {
          icon: riderIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup('Delivery Partner');
      } else {
        const from = riderMk.current.getLatLng();
        const to = L.latLng(rider.lat, rider.lng);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min((now - t0) / 1200, 1);
          riderMk.current?.setLatLng([
            from.lat + (to.lat - from.lat) * k,
            from.lng + (to.lng - from.lng) * k,
          ]);
          if (k < 1) animRef.current = requestAnimationFrame(step);
        };
        animRef.current = requestAnimationFrame(step);
      }
    } else if (riderMk.current) {
      riderMk.current.remove();
      riderMk.current = null;
    }

    // Connect store -> rider -> destination with smooth curving polyline
    const midPoint: [number, number] = rider
      ? [rider.lat, rider.lng]
      : [(pickup.lat + dest.lat) / 2, (pickup.lng + dest.lng) / 2];
    const smoothRoute = generateSmoothRoute(
      [pickup.lat, pickup.lng],
      midPoint,
      [dest.lat, dest.lng],
    );

    if (routeLine.current && map.hasLayer(routeLine.current)) {
      routeLine.current.setLatLngs(smoothRoute);
    } else {
      if (routeLine.current) routeLine.current.remove();
      routeLine.current = L.polyline(smoothRoute, {
        color: '#059669',
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    if (!fitted.current) {
      fitted.current = true;
      fitMap();
    } else if (
      rider &&
      !userMoved.current &&
      !map.getBounds().pad(-0.15).contains([rider.lat, rider.lng])
    ) {
      fitMap();
    }
  }, [mapReady, rider, dest, pickup, fitMap]);

  const existingRating = order?.deliveryRating?.stars || 0;
  const canRate = !!order && isDelivered && !!order.deliveryPartnerName;
  const shownStars = rateStars || existingRating;

  const submitRating = async () => {
    if (!order || !rateStars) return;
    setRateBusy(true);
    setRateErr('');
    try {
      const res = await fetch(
        apiUrl(`/orders/${encodeURIComponent(order.orderId)}/rate-partner`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stars: rateStars,
            comment: rateComment.trim() || undefined,
            phone: customerPhone(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRateErr(data.message || 'Could not save your rating');
      } else {
        setRateDone(true);
        setRateEditing(false);
        fetchOrder();
      }
    } catch {
      setRateErr('Network error');
    } finally {
      setRateBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans text-gray-900">
      {/* 1. Sticky App Bar: Always pinned at top:0. Initial = slim white bar.
          After scrolling past the banner it becomes a full green status bar
          (back + Help row, order headline, "X mins • Live" pill) instead of
          a small pill squeezed into an otherwise-white header. */}
      <div
        ref={appBarRef}
        className="sticky top-0 z-[600] px-3 sm:px-4"
        style={{
          // Cross-fades continuously with scrollProgress (no boolean snap)
          // so its arrival is in lockstep with the flying ETA chip above —
          // the chip lands right as this green fill and text finish fading in.
          backgroundColor: `rgba(12,139,79,${scrollProgress})`,
          boxShadow: scrollProgress > 0.5 ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
          paddingTop: 12 + 2 * scrollProgress,
          paddingBottom: 12 * scrollProgress,
        }}
      >
        <div className="max-w-3xl mx-auto relative">
          {/* Back button: one control, colour cross-fades between the
              floating white-on-banner look and the green bar's tinted look. */}
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="relative z-10 rounded-full flex items-center justify-center transition-colors"
            style={{
              width: 40 - 4 * scrollProgress,
              height: 40 - 4 * scrollProgress,
              backgroundColor: `rgba(255,255,255,${0.95 - 0.8 * scrollProgress})`,
              color: scrollProgress > 0.5 ? '#fff' : '#1f2937',
              boxShadow: scrollProgress < 0.5 ? '0 1px 6px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* SCROLLED content: order headline + "Arriving in X mins • Live"
              pill. Always mounted, cross-fading in via opacity so it never
              hard-pops the instant progress crosses a threshold. */}
          <div
            className="mt-1.5"
            style={{
              opacity: scrollProgress,
              pointerEvents: scrollProgress > 0.6 ? 'auto' : 'none',
            }}
          >
            <p className="text-base sm:text-lg font-black text-white leading-snug truncate">
              {isDelivered
                ? 'Order delivered'
                : rider
                  ? 'Delivery partner is heading to your drop'
                  : 'Order is being prepared'}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/15 rounded-full pl-3 pr-1 py-1">
              <span className="text-xs font-extrabold text-white">
                {isDelivered ? 'Delivered' : `Arriving in ${etaMins || 2} min${(etaMins || 2) === 1 ? '' : 's'}`}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/60" />
              <span className="inline-flex items-center gap-1 text-xs font-bold text-white/90">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
              <button
                type="button"
                onClick={fetchOrder}
                aria-label="Refresh"
                className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Large Banner Carousel: Appears ONLY in initial top state (~45–50% viewport height), scrolls away completely */}
      {order && banners && banners.length > 0 && (
        <div className="w-full">
          <BannerCarousel
            banners={banners}
            aspectRatioClass="h-[46vh] sm:h-[48vh] w-full"
            className="!mb-0"
          />
        </div>
      )}

      {/* Sentinel marker directly beneath the banner */}

      <div ref={contentRef} className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-3.5 text-gray-900">
        {err && (
          <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3">
            {err}
          </div>
        )}

        {order && (
          <>
            {/* ETA + MAP: side by side at every width. On scroll, the ETA
                column smoothly collapses to 0 (not unmounted — animated via
                width/opacity, no snap) and the map grows to fill the freed
                space via an animated `grid-template-columns`. */}
            <div
              className="grid items-stretch"
              style={{
                gridTemplateColumns: `${0.85 * (1 - scrollProgress)}fr ${1.15 + 0.85 * scrollProgress}fr`,
                gap: `${0.875 * (1 - scrollProgress)}rem`,
              }}
            >
              {/* 1. Estimated Arrival Hero Card — always mounted so it can
                  animate away instead of popping out of the layout.
                  `opacity` alone was NOT enough to remove it from the grid
                  row's reserved height: `items-stretch` sizes the row to
                  the tallest column, and this card's real content height
                  (icon + headline + subtitle, ~150–190px) stayed fully
                  reserved even at opacity 0 — that invisible reserved
                  block, sitting right below the sticky App Bar, was the
                  visible "gap" the map/spacer numbers alone couldn't
                  explain. `height` now collapses in lockstep with the
                  anchor beside it (same `anchorNaturalH` source), same
                  fix pattern as the anchor's own height collapse. */}
              <div
                ref={etaAnchorRef}
                className="rounded-2xl border border-emerald-100 bg-[#E8F8F0] shadow-xs overflow-hidden shrink-0"
                style={{
                  // Driven directly by scrollProgress every frame (no CSS
                  // transition) — see the scrollProgress state comment for
                  // why this can't lag behind the map's own per-frame box.
                  opacity: 1 - scrollProgress,
                  height: anchorNaturalH * (1 - scrollProgress),
                }}
              >
                <div className="flex flex-col h-full p-3 sm:p-4 gap-2 sm:gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
                      <Zap size={18} className="fill-emerald-800" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-[11px] font-semibold text-gray-600 truncate">
                        Estimated Arrival
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">
                        {isDelivered ? 'Delivered' : `${etaMins || 2} mins`}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] sm:text-xs text-gray-600 font-medium leading-snug">
                    {isDelivered
                      ? 'Groceries delivered with care'
                      : rider
                        ? 'Delivery partner is heading to your drop'
                        : 'Items being packed at FreshCart Dark Store'}
                  </p>

                  <div className="mt-auto flex items-center gap-1.5 sm:gap-2">
                    {/* Delivery Boy on Scooter SVG Illustration — hidden on the narrowest phones */}
                    <div className="hidden xs:flex w-11 h-9 sm:w-14 sm:h-11 shrink-0 relative items-center justify-center">
                      <svg viewBox="0 0 72 52" className="w-full h-full" fill="none">
                        <path d="M4 32h8M8 37h8M6 27h6" stroke="#059669" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                        <circle cx="19" cy="40" r="7" stroke="#1F2937" strokeWidth="2.8" fill="#F3F4F6"/>
                        <circle cx="53" cy="40" r="7" stroke="#1F2937" strokeWidth="2.8" fill="#F3F4F6"/>
                        <circle cx="19" cy="40" r="3" fill="#1F2937"/>
                        <circle cx="53" cy="40" r="3" fill="#1F2937"/>
                        <path d="M12 40a7 7 0 0 1 14 0" stroke="#059669" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M46 40a7 7 0 0 1 14 0" stroke="#059669" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M19 40h15l7-12h12" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M51 28l2 12" stroke="#059669" strokeWidth="3.5" strokeLinecap="round"/>
                        <path d="M37 28h10" stroke="#047857" strokeWidth="4.5" strokeLinecap="round"/>
                        <rect x="23" y="16" width="15" height="15" rx="3" fill="#047857"/>
                        <path d="M30.5 19v9M26 23.5h9" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round"/>
                        <circle cx="30.5" cy="23.5" r="1.5" fill="#fff"/>
                        <path d="M38 18c0 0 3 2.5 6 2.5s5-2.5 5-2.5v7h-11z" fill="#059669"/>
                        <path d="M42 20l6 5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
                        <path d="M48 25h5" stroke="#1F2937" strokeWidth="3" strokeLinecap="round"/>
                        <circle cx="43" cy="12" r="6" fill="#047857"/>
                        <path d="M41 12h7" stroke="#34D399" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="45" cy="12" r="1" fill="#fff"/>
                      </svg>
                    </div>

                    {/* Live Pill Badge */}
                    <div className="bg-white/95 border border-emerald-200/80 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold text-gray-800 shadow-2xs flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1b. Flying ETA chip — a compact copy of the ETA that
                  travels from the hero card's spot up into the App Bar
                  as `etaBox` interpolates every frame, so the arrival
                  genuinely reads as "left card moves to top bar" rather
                  than "left card fades, unrelated bar text fades in".
                  Fades out right as it lands, handing off to the bar's
                  own (cross-fading) content. */}
              <div
                aria-hidden="true"
                className="fixed z-[650] flex items-center gap-1.5 rounded-full bg-white pl-1.5 pr-3 py-1 shadow-md pointer-events-none"
                style={{
                  top: etaBox.top,
                  left: etaBox.left,
                  width: etaBox.width,
                  height: etaBox.height,
                  opacity: scrollProgress > 0.02 ? etaBox.opacity : 0,
                }}
              >
                <span className="w-6 h-6 rounded-full bg-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
                  <Zap size={12} className="fill-emerald-800" />
                </span>
                <span className="text-xs font-black text-gray-900 truncate">
                  {isDelivered ? 'Delivered' : `${etaMins || 2} mins`}
                </span>
              </div>

              {/* 2. Map anchor — invisible spacer that reserves the map's
                  grid space pre-scroll only; the real map (below, always-
                  fixed) shadows this element's live position while it's
                  active. Collapses to 0 once scrolled — the dedicated flow
                  spacer after the grid takes over reserving space from
                  there, so the two never double-reserve height at once
                  (that double-reservation was the visible "gap" bug). */}
              <div
                ref={mapAnchorRef}
                aria-hidden="true"
                className="rounded-2xl sm:rounded-3xl overflow-hidden"
                style={{
                  visibility: 'hidden',
                  // No Tailwind min-h here on purpose — a CSS min-height
                  // would clamp this collapse (min-height always wins over
                  // a competing height shrink). Collapses to 0 in lockstep
                  // with the flow spacer below growing to take over
                  // reserving that same space — no double-reservation.
                  height: anchorNaturalH * (1 - scrollProgress),
                }}
              />
            </div>

            {/* 2b. Interactive Map Card — always `position: fixed`, box
                driven by `mapBox`, a direct scroll-progress interpolation
                (see the scroll effect) — grows continuously in step with
                the scroll gesture rather than snapping via a CSS
                transition, which is why there's deliberately no
                `transition` on top/left/width/height here. */}
            <div
              className="rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/90 shadow-xs bg-gray-100"
              style={{
                position: 'fixed',
                top: mapBox.top,
                left: mapBox.left,
                width: Math.max(mapBox.width, 200), // never 0 — see mapBox init comment
                height: Math.max(mapBox.height, 160),
                zIndex: isScrolledPastTracking ? 490 : 10,
              }}
            >
              <div ref={mapCallbackRef} className="w-full h-full" />

              {/* Top-Left Live GPS Badge */}
              <div className="absolute top-3 left-3 z-[500] inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-extrabold text-gray-800 shadow-sm border border-gray-100 pointer-events-none">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>{socketConnected ? 'Live GPS' : 'Connecting'}</span>
              </div>

              {/* Bottom-Right Floating Controls */}
              <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={recenterMap}
                  aria-label="Recenter Map"
                  className="w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-transform active:scale-95 border border-gray-200/60"
                >
                  <Crosshair size={18} />
                </button>
                <button
                  type="button"
                  onClick={toggleZoom}
                  aria-label="Toggle Zoom"
                  className="w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow-md flex items-center justify-center text-gray-700 transition-transform active:scale-95 border border-gray-200/60"
                >
                  <Layers size={18} />
                </button>
              </div>
            </div>

            {/* Flow spacer for the fixed map once it's pinned — keeps
                Doorstep/Partner/Address/Status starting right where the map
                visually ends instead of being covered by it. Zero height
                pre-scroll since the map is still shadowing the anchor above
                (which already reserves the space). */}
            <div style={{ height: (mapBox.height + 14) * scrollProgress }} />

            {/* 3. Doorstep OTP Code (if available) */}
            {order.deliveryOtp && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-200/70 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-emerald-800" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                      DOORSTEP CODE
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      Share with delivery partner at door
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-emerald-200 rounded-xl px-3.5 py-1.5 shadow-xs">
                  <span className="text-xl font-black text-emerald-700 tracking-[0.25em] tabular-nums font-mono">
                    {order.deliveryOtp}
                  </span>
                </div>
              </div>
            )}

            {/* 4. Delivery Partner Card */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                Delivery Partner
              </span>
              <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center shadow-2xs">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80"
                        alt={order.delivery?.partnerName || 'Delivery Partner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-base font-extrabold text-gray-900 truncate block">
                      {order.delivery?.partnerName || order.deliveryPartnerName || 'charan'}
                    </span>
                    <div className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                      <span className="text-amber-500">★</span>
                      <span className="text-gray-900 font-extrabold">
                        {(order.delivery?.rating ?? 5.0).toFixed(1)}
                      </span>
                      <span className="text-gray-400 font-medium">(320 deliveries)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-2xs"
                    aria-label="Chat with partner"
                  >
                    <MessageSquareText size={18} />
                  </button>
                  <a
                    href={`tel:${order.delivery?.phone || ''}`}
                    className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-sm"
                    aria-label="Call partner"
                  >
                    <Phone size={18} />
                  </a>
                </div>
              </div>
            </div>

            {/* Chat Modal */}
            {chatOpen && (
              <OrderChat
                orderId={order.orderId}
                socket={socket}
                customerPhone={customerPhone()}
                partnerName={order.delivery?.partnerName || order.deliveryPartnerName || 'charan'}
                onClose={() => setChatOpen(false)}
              />
            )}

            {/* Partner Rating (when eligible) */}
            {canRate && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col gap-3">
                <div className="text-sm font-extrabold text-gray-900">
                  {existingRating || rateDone
                    ? 'Thanks for rating your delivery'
                    : `Rate your delivery by ${order.deliveryPartnerName || 'Delivery Partner'}`}
                </div>
                <div
                  className="flex items-center gap-2"
                  role="radiogroup"
                  aria-label="Delivery rating"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={shownStars === n}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      disabled={rateBusy}
                      onClick={() => {
                        setRateStars(n);
                        setRateDone(false);
                      }}
                      className={`text-2xl transition-transform hover:scale-110 disabled:opacity-50 ${
                        n <= shownStars ? 'text-amber-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {(rateEditing || (!existingRating && !rateDone)) && (
                  <>
                    <textarea
                      value={rateComment}
                      onChange={(e) => setRateComment(e.target.value)}
                      placeholder="Add a note (optional)"
                      maxLength={500}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs resize-none focus:outline-none focus:border-emerald-600"
                    />
                    {rateErr && <div className="text-xs font-semibold text-red-600">{rateErr}</div>}
                    <button
                      onClick={submitRating}
                      disabled={!rateStars || rateBusy}
                      className="self-start rounded-full bg-emerald-600 text-white font-bold text-xs px-4 py-2 disabled:opacity-40"
                    >
                      {rateBusy ? 'Saving…' : 'Submit rating'}
                    </button>
                  </>
                )}
                {(existingRating || rateDone) && !rateEditing && (
                  <button
                    onClick={() => {
                      setRateEditing(true);
                      setRateStars(existingRating);
                      setRateComment(order.deliveryRating?.comment || '');
                    }}
                    className="self-start text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Change rating
                  </button>
                )}
              </div>
            )}

            {/* 5. Delivery Address Card */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-gray-900">
                    Delivery Address
                  </span>
                  {!isDelivered && (
                    <button
                      type="button"
                      onClick={() => navigate('/account/addresses')}
                      className="shrink-0 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 bg-[#E8F8F0] hover:bg-[#D1FAE5] px-3 py-1 rounded-full transition-colors"
                    >
                      Change
                    </button>
                  )}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1 leading-relaxed">
                  {order.deliveryAddress ||
                    'Home - J, I, HITEC City, Ward 107 Madhapur, Greater Hyderabad Municipal Corporation West Zone, Hyderabad, Serilingampalle mandal, Ranga Reddy, Telangana, 500081, India'}
                </div>
              </div>
            </div>

            {/* 6. Order Status Updates Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <List size={18} className="text-gray-800" />
                <h3 className="text-xs font-extrabold text-gray-900">
                  Status Updates
                </h3>
              </div>
              <div className="relative pl-6 space-y-4">
                {/* Continuous vertical green line */}
                <div className="absolute left-[5px] top-1.5 bottom-2 w-0.5 bg-emerald-200" />

                {timelineList.map((t, idx) => (
                  <div key={idx} className="relative text-xs">
                    {/* Solid green dot */}
                    <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-extrabold text-gray-900">
                        {normalizeStatus(t.status)}
                      </div>
                      {(t.at || t.timestamp) && (
                        <div className="text-[11px] text-gray-400 font-medium shrink-0">
                          {new Date(t.at || t.timestamp!).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      )}
                    </div>
                    {t.note && (
                      <div className="text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">
                        {t.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Order Items Breakdown (if available) */}
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Order Items ({order.items.length})
                  </h3>
                  {order.totalAmount && (
                    <span className="text-xs font-black text-emerald-700">
                      Total: ₹{Math.round(order.totalAmount)}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                          {item.quantity || item.qty || 1}×
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-gray-900 truncate">
                            {item.name || 'Grocery Item'}
                          </div>
                          {(item.weightSpec || item.selectedWeight) && (
                            <div className="text-[11px] text-gray-400 font-medium">
                              {item.weightSpec || item.selectedWeight}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.price && (
                        <span className="font-bold text-gray-900 tabular-nums shrink-0">
                          ₹{Math.round(item.price * (item.quantity || item.qty || 1))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 8. Sticky Bottom Action Bar */}
      {order && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 py-3 px-4 z-30 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/account/orders')}
              className="flex-1 py-3 px-4 rounded-full border-2 border-emerald-700 text-emerald-700 font-extrabold text-xs sm:text-sm hover:bg-emerald-50 active:scale-[0.98] transition-all text-center"
            >
              Order Details
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm active:scale-[0.98] transition-all text-center shadow-xs"
            >
              Back to Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackOrder;

