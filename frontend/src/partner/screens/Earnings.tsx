import React, { useEffect, useState } from 'react';
import { Card, CenterState, FilterMenu, PageHead, SectionLabel, money } from '../ui';
import { partnerApi } from '../partnerApi';
import { useDeliveryNumbering } from '../useDeliveryNumbering';

const RANGES: Array<'today' | 'week' | 'month' | 'all'> = ['today', 'week', 'month', 'all'];
const RANGE_LABEL: Record<string, string> = { today: 'Today', week: 'This week', month: 'This month', all: 'All time' };

export const Earnings: React.FC = () => {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const numberByOrderId = useDeliveryNumbering();

  useEffect(() => {
    setLoading(true);
    partnerApi
      .earnings(range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  const s = data?.summary;

  return (
    <div>
      <PageHead
        title="Earnings"
        actions={
          <FilterMenu
            title="Time range"
            value={range}
            onChange={setRange}
            options={RANGES.map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
          />
        }
      />

      {loading ? (
        <CenterState kind="loading" />
      ) : !s ? (
        <CenterState kind="error">Could not load earnings.</CenterState>
      ) : (
        <>
          <Card className="p-5">
            <div className="font-admin-display font-bold text-[34px] leading-none text-admin-text tabular-nums">
              {money(s.total)}
            </div>
            <SectionLabel className="mt-2">Total earned · {RANGE_LABEL[range].toLowerCase()}</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {[
                ['Base', s.base],
                ['Distance', s.distance],
                ['Tips', s.tips],
                ['Bonus', s.bonusTotal],
                ['Pending', s.pending],
                ['Eligible', s.eligible],
                ['Settled', s.settled],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-md bg-admin-paper border border-admin-ledger-line px-3 py-2"
                >
                  <div className="font-admin-mono text-[9px] uppercase tracking-[0.12em] text-admin-text-faint">
                    {label}
                  </div>
                  <div className="font-admin-display font-bold text-[14px] text-admin-text tabular-nums mt-1">
                    {money(value as number)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <SectionLabel className="mt-7 mb-3">
            {s.count} {s.count === 1 ? 'delivery' : 'deliveries'} completed
          </SectionLabel>
          {(data.earnings || []).length === 0 ? (
            <CenterState kind="empty">No completed deliveries in this period.</CenterState>
          ) : (
            <div className="flex flex-col gap-2">
              {(data.earnings || []).map((e: any) => (
                <Card
                  key={e._id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-admin-mono text-[12px] font-semibold text-admin-text">
                      {numberByOrderId[e.orderId] ? `Delivery #${numberByOrderId[e.orderId]}` : e.orderId}
                    </div>
                    <div className="font-admin-mono text-[10px] text-admin-text-faint mt-0.5 uppercase tracking-[0.08em]">
                      {new Date(e.earnedAt).toLocaleDateString()} ·{' '}
                      <span
                        className={
                          e.status === 'settled'
                            ? 'text-admin-green'
                            : e.status === 'eligible'
                            ? 'text-admin-blue'
                            : 'text-admin-amber'
                        }
                      >
                        {e.status === 'settled' ? 'Settled' : e.status === 'eligible' ? 'Eligible' : 'Pending'}
                      </span>
                      {e.status === 'settled' && e.settledAt && (
                        <> · Settled on {new Date(e.settledAt).toLocaleDateString()}</>
                      )}
                    </div>
                    {(e.baseFee != null || e.distanceFee != null || e.tips != null) && (
                      <div className="font-admin-mono text-[9px] text-admin-text-faint mt-1">
                        Base ₹{e.baseFee || 0} · Distance ₹{e.distanceFee || 0} · Tip ₹{e.tips || 0}
                      </div>
                    )}
                  </div>
                  <div className="font-admin-display font-bold text-[15px] text-admin-text tabular-nums">
                    {money(e.total)}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
