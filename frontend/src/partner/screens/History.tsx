import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { partnerApi } from '../partnerApi';
import { CenterState, PageHead, Pill, money } from '../ui';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'returned', label: 'Returned' },
];

const toneFor = (status: string): 'green' | 'red' | 'amber' | 'neutral' =>
  status === 'Delivered' ? 'green' : status === 'Failed' ? 'red' : status === 'Returned' ? 'amber' : 'neutral';

export const History: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    partnerApi
      .history(filter || undefined, 100)
      .then((r) => setOrders(r.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <PageHead
        title="History"
        meta={loading ? 'Past deliveries' : `${orders.length} record${orders.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex gap-1 bg-admin-surface border border-admin-ledger-line rounded-md p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`font-admin-mono text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1.5 rounded transition-colors cursor-pointer ${
                  filter === f.key
                    ? 'bg-admin-ink text-white'
                    : 'text-admin-text-muted hover:text-admin-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <CenterState kind="loading" />
      ) : orders.length === 0 ? (
        <CenterState kind="empty">No past deliveries in this view.</CenterState>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <button
              key={o.orderId}
              onClick={() => navigate(`/partner/orders/${encodeURIComponent(o.orderId)}`)}
              className="group text-left bg-admin-surface border border-admin-ledger-line rounded-lg p-3.5 flex items-center gap-3 hover:border-admin-green transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-admin-mono text-[12px] font-semibold text-admin-text">
                    {o.orderId}
                  </span>
                  <Pill tone={toneFor(o.status)}>{o.status}</Pill>
                </div>
                <div className="font-admin-mono text-[10px] text-admin-text-faint mt-1 uppercase tracking-[0.08em]">
                  {new Date(o.deliveredAt || o.updatedAt).toLocaleString()}
                </div>
              </div>
              <span className="font-admin-display font-bold text-[14px] text-admin-text tabular-nums">
                {money(o.totalAmount)}
              </span>
              <ChevronRight
                size={16}
                className="text-admin-text-faint group-hover:text-admin-green transition-colors"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
