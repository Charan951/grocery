import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { partnerApi, type PartnerProfile } from './partnerApi';

interface PartnerCtx {
  partner: PartnerProfile | null;
  loading: boolean;
  error: string | null;
  unreadNotifications: number;
  refreshMe: () => Promise<void>;
  updateMe: (body: { name?: string; phone?: string; vehicleType?: string }) => Promise<void>;
  setOnline: (on: boolean) => Promise<void>;
  setUnread: (n: number) => void;
}

const Ctx = createContext<PartnerCtx | null>(null);

export const PartnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadNotifications, setUnread] = useState(0);
  const mounted = useRef(true);

  const refreshMe = useCallback(async () => {
    try {
      const r = await partnerApi.me();
      if (!mounted.current) return;
      setPartner(r.partner);
      setUnread(r.unreadNotifications || 0);
      setError(null);
    } catch (e: any) {
      if (!mounted.current) return;
      setError(e.message || 'Could not load your profile');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const updateMe = useCallback(
    async (body: { name?: string; phone?: string; vehicleType?: string }) => {
      const r = await partnerApi.updateMe(body);
      if (!mounted.current) return;
      setPartner((p) => (p ? { ...p, ...r.partner } : r.partner));
    },
    [],
  );

  const setOnline = useCallback(
    async (on: boolean) => {
      const r = await partnerApi.setOnline(on);
      setPartner((p) => (p ? { ...p, isOnline: r.isOnline, availability: r.availability } : p));
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    refreshMe();
    const id = window.setInterval(refreshMe, 60_000);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [refreshMe]);

  return (
    <Ctx.Provider
      value={{ partner, loading, error, unreadNotifications, refreshMe, updateMe, setOnline, setUnread }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const usePartner = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePartner must be used within <PartnerProvider>');
  return c;
};
