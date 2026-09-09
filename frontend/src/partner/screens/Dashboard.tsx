import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Star, PackageCheck, ChevronRight, RefreshCw, MapPin, Navigation } from 'lucide-react';
import { usePartner } from '../PartnerContext';
import { usePartnerSocket } from '../usePartnerSocket';
import { useLocationHeartbeat } from '../useLocationHeartbeat';
import { OfferModal } from '../OfferModal';
import { partnerApi } from '../partnerApi';
import { Card, CenterState, PageHead, Pill, SectionLabel, Stat, money } from '../ui';

export const Dashboard: React.FC = () => {
  const { partner, refreshMe } = usePartner();
  const navigate = useNavigate();
  const [active, setActive] = useState<any[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  useLocationHeartbeat(!!partner?.isOnline);

  const loadActive = useCallback(async () => {
    try {
      const r = await partnerApi.activeOrders();
      setActive(r.orders || []);
    } catch {
      /* keep last */
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const { offer, setOffer } = usePartnerSocket(() => {
    loadActive();
    refreshMe();
  });

  useEffect(() => {
    loadActive();
    partnerApi
      .pendingAssignment()
      .then((r) => {
        if (r.offer) setOffer(r.offer);
      })
      .catch(() => {});
  }, [loadActive, setOffer]);

  const online = !!partner?.isOnline;

  return (
    <div>
      <PageHead
        title={`Hello, ${(partner?.name || 'Partner').split(' ')[0]}`}
        meta={
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-admin-green' : 'bg-admin-text-faint'}`} />
            {online ? 'Online · accepting offers' : 'Offline'}
          </span>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat Icon={IndianRupee} label="Earned today" value={money(partner?.todayEarnings)} tone="green" />
        <Stat Icon={PackageCheck} label="Delivered" value={partner?.completedCount ?? 0} tone="neutral" />
        <Stat
          Icon={Star}
          label="Rating"
          value={partner?.ratingCount ? Number(partner.rating).toFixed(1) : 'New'}
          tone="amber"
        />
      </div>

      {!online && (
        <Card className="mt-4 p-4 flex items-start gap-3">
          <span className="w-8 h-8 rounded-md bg-admin-amber-soft text-admin-amber flex items-center justify-center shrink-0">
            <Navigation size={15} />
          </span>
          <p className="text-[13px] text-admin-text-muted leading-relaxed">
            You're offline. Use{' '}
            <span className="font-semibold text-admin-text">Go online</span> in the top bar to start
            receiving delivery offers near you.
          </p>
        </Card>
      )}

      <div className="flex items-center justify-between mt-7 mb-3">
        <SectionLabel>
          Active deliveries{active.length > 0 ? ` · ${active.length}` : ''}
        </SectionLabel>
        <button
          onClick={loadActive}
          className="text-admin-text-faint hover:text-admin-text transition-colors"
          aria-label="Refresh active deliveries"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {loadingActive ? (
        <CenterState kind="loading" />
      ) : active.length === 0 ? (
        <CenterState kind="empty">No active deliveries right now.</CenterState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {active.map((o) => (
            <button
              key={o.orderId}
              onClick={() => navigate(`/partner/orders/${encodeURIComponent(o.orderId)}`)}
              className="group text-left bg-admin-surface border border-admin-ledger-line rounded-lg p-4 flex items-center gap-3 hover:border-admin-green transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-admin-mono text-[12px] font-semibold text-admin-text">
                    {o.orderId}
                  </span>
                  <Pill tone="green">{o.status}</Pill>
                </div>
                <div className="text-[12px] text-admin-text-muted mt-1.5 flex items-center gap-1.5 truncate">
                  <MapPin size={12} className="shrink-0 text-admin-text-faint" />
                  {o.deliveryAddress || 'Address on next screen'}
                </div>
              </div>
              <span className="font-admin-display font-bold text-[14px] text-admin-text tabular-nums shrink-0">
                {money(o.totalAmount)}
              </span>
              <ChevronRight
                size={16}
                className="text-admin-text-faint group-hover:text-admin-green shrink-0 transition-colors"
              />
            </button>
          ))}
        </div>
      )}

      <OfferModal
        offer={offer}
        onResolved={() => setOffer(null)}
        onAccepted={(orderId) => {
          loadActive();
          refreshMe();
          navigate(`/partner/orders/${encodeURIComponent(orderId)}`);
        }}
      />
    </div>
  );
};
