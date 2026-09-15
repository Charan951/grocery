import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  MapPin,
  CheckCircle2,
  XCircle,
  Undo2,
  ClipboardList,
} from 'lucide-react';
import { partnerApi } from '../partnerApi';
import { CenterState, FilterMenu, PageHead, Pill, money } from '../ui';
import { useDeliveryNumbering } from '../useDeliveryNumbering';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'returned', label: 'Returned' },
] as const;

const toneFor = (s: string): 'green' | 'red' | 'amber' | 'neutral' =>
  s === 'Delivered' ? 'green' : s === 'Failed' ? 'red' : s === 'Returned' ? 'amber' : 'neutral';

const emptyFor: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; sub: string }
> = {
  '': { icon: ClipboardList, title: 'No deliveries yet', sub: 'Completed runs will be listed here.' },
  delivered: { icon: CheckCircle2, title: 'No completed runs', sub: 'Deliveries you finish show up here.' },
  failed: { icon: XCircle, title: 'No failed runs', sub: 'Nothing has gone wrong. Keep it up.' },
  returned: { icon: Undo2, title: 'No returns', sub: 'Parcels sent back to the store appear here.' },
};

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const numberByOrderId = useDeliveryNumbering();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await partnerApi.history(filter || undefined, 100);
      setHistory(r.orders || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const Row: React.FC<{ o: any }> = ({ o }) => (
    <button
      onClick={() => navigate(`/partner/orders/${encodeURIComponent(o.orderId)}`)}
      className="group w-full text-left bg-admin-surface border border-admin-ledger-line rounded-lg p-3.5 flex items-center gap-3 hover:border-admin-green transition-colors"
    >
      <span
        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
          o.status === 'Delivered'
            ? 'bg-admin-green-soft text-admin-green'
            : o.status === 'Failed'
              ? 'bg-admin-red-soft text-admin-red'
              : 'bg-admin-amber-soft text-admin-amber'
        }`}
      >
        <MapPin size={15} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-admin-mono text-[12px] font-semibold text-admin-text truncate">
            {numberByOrderId[o.orderId] ? `Delivery #${numberByOrderId[o.orderId]}` : o.orderId}
          </span>
          <Pill tone={toneFor(o.status)}>{o.status}</Pill>
        </div>
        <div className="text-[11px] text-admin-text-muted mt-1 truncate">
          {new Date(o.deliveredAt || o.updatedAt).toLocaleString(undefined, {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      <span className="font-admin-display font-bold text-[14px] text-admin-text tabular-nums shrink-0">
        {money(o.totalAmount)}
      </span>
      <ChevronRight
        size={16}
        className="text-admin-text-faint group-hover:text-admin-green transition-colors shrink-0"
      />
    </button>
  );

  return (
    <div>
      <PageHead
        title="Orders"
        actions={
          <FilterMenu
            title="Status"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          />
        }
      />

      {loading ? (
        <CenterState kind="loading" />
      ) : history.length === 0 ? (
        <CenterState kind="empty" icon={emptyFor[filter].icon} title={emptyFor[filter].title}>
          {emptyFor[filter].sub}
        </CenterState>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((o) => (
            <Row key={o.orderId} o={o} />
          ))}
        </div>
      )}
    </div>
  );
};
