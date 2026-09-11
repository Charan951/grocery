import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  Star,
  PackageCheck,
  ChevronRight,
  MapPinned,
  MapPin,
  Package,
} from 'lucide-react';
import { usePartner } from '../PartnerContext';
import { usePartnerSocket } from '../usePartnerSocket';
import { useLocationHeartbeat } from '../useLocationHeartbeat';
import { OfferModal } from '../OfferModal';
import { partnerApi } from '../partnerApi';
import { Card, CenterState, Pill, Stat, money } from '../ui';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};

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
  const firstName = (partner?.name || 'Partner').split(' ')[0];

  return (
    <div>
      {/* Greeting */}
      <h1 className="font-admin-display font-extrabold text-[19px] leading-none text-admin-text truncate">
        {greeting()} {firstName}!
      </h1>
      <p className="text-[12.5px] text-admin-text-muted mt-1.5">
        Stay active, deliver more, earn more.
      </p>

      {/* Quick stats */}
      <div className="grid grid-cols-3 sm:max-w-[560px] gap-3 mt-5">
        <Stat Icon={IndianRupee} label="Earned today" value={money(partner?.todayEarnings)} tone="green" />
        <Stat Icon={PackageCheck} label="Delivered" value={partner?.completedCount ?? 0} tone="neutral" />
        <Stat
          Icon={Star}
          label="Rating"
          value={partner?.ratingCount ? Number(partner.rating).toFixed(1) : 'New'}
          tone="amber"
        />
      </div>

      {/* Active delivery */}
      <div className="flex items-center mt-6 mb-3 gap-2.5">
        <span className="w-7 h-7 rounded-full bg-admin-green text-white flex items-center justify-center shrink-0">
          <MapPinned size={15} />
        </span>
        <span className="font-admin-display font-extrabold text-[16px] text-admin-text">
          Active Delivery
        </span>
        <span className="flex-1" />
        <button
          onClick={() => navigate('/partner/orders')}
          className="flex items-center text-admin-green font-semibold text-[13px] cursor-pointer"
        >
          View all
          <ChevronRight size={16} />
        </button>
      </div>

      {loadingActive ? (
        <CenterState kind="loading" />
      ) : active.length === 0 ? (
        <div className="w-full sm:max-w-[560px] rounded-[20px] border border-admin-green/15 bg-admin-green-soft py-7 px-5 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-full bg-admin-surface text-admin-green flex items-center justify-center">
            <Package size={30} />
          </span>
          <div className="font-admin-display font-extrabold text-[15.5px] text-admin-text mt-3.5">
            {online ? 'No active delivery' : 'You are offline'}
          </div>
          <div className="text-[12.5px] text-admin-text-muted mt-1">
            {online ? 'New orders will pop up here.' : 'Go online to start receiving orders.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 sm:max-w-[720px]">
          {active.map((o) => (
            <button
              key={o.orderId}
              onClick={() => navigate(`/partner/orders/${encodeURIComponent(o.orderId)}`)}
              className="group text-left bg-admin-surface border border-admin-ledger-line rounded-2xl p-4 flex items-center gap-3 hover:border-admin-green transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-admin-display font-extrabold text-[15px] text-admin-text">
                    {o.orderId}
                  </span>
                  <Pill tone="green">{o.status}</Pill>
                </div>
                <div className="text-[12.5px] text-admin-text-muted mt-1.5 flex items-center gap-1.5 truncate">
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
