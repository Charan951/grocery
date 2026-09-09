import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { partnerApi } from '../partnerApi';
import { usePartner } from '../PartnerContext';
import { CenterState, PageHead } from '../ui';

export const Notifications: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { setUnread, refreshMe } = usePartner();

  useEffect(() => {
    let done = false;
    (async () => {
      try {
        const r = await partnerApi.notifications();
        if (done) return;
        setItems(r.notifications || []);
        if (r.unread > 0) {
          await partnerApi.markNotificationsRead();
          setUnread(0);
          refreshMe();
        }
      } catch {
        /* ignore */
      } finally {
        if (!done) setLoading(false);
      }
    })();
    return () => {
      done = true;
    };
  }, [setUnread, refreshMe]);

  return (
    <div>
      <PageHead
        title="Notifications"
        meta={loading ? 'Inbox' : `${items.length} message${items.length === 1 ? '' : 's'} · marked read`}
      />

      {loading ? (
        <CenterState kind="loading" />
      ) : items.length === 0 ? (
        <CenterState kind="empty">
          <Bell size={20} className="mx-auto mb-2 text-admin-text-faint" />
          Nothing here yet.
        </CenterState>
      ) : (
        <div className="bg-admin-surface border border-admin-ledger-line rounded-lg divide-y divide-admin-ledger-line overflow-hidden">
          {items.map((n) => (
            <div key={n._id} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <span className="font-admin-display font-semibold text-[13px] text-admin-text">
                  {n.title}
                </span>
                <span className="font-admin-mono text-[9px] text-admin-text-faint uppercase tracking-[0.08em] shrink-0 mt-0.5">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[12px] text-admin-text-muted mt-1 leading-relaxed">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
