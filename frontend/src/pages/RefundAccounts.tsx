import React, { useEffect, useState } from 'react';
import { ArrowLeft, Landmark, Smartphone, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useSmartBack } from '../hooks/useSmartBack';
import { RefundAccountForm } from '../components/RefundAccountForm';
import { refundAccountsApi, type RefundAccount } from '../utils/returnsApi';

type View = 'list' | 'bank' | 'upi';

/** Account → Bank & UPI details: where return refunds can be paid instead of the wallet. */
export const RefundAccounts: React.FC = () => {
  const navigate = useNavigate();
  const goBack = useSmartBack('/account/profile');
  const [view, setView] = useState<View>('list');
  const [accounts, setAccounts] = useState<RefundAccount[] | null>(null);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const signedIn = Boolean(localStorage.getItem('customer_token'));

  useEffect(() => {
    if (!signedIn) {
      navigate('/account/profile', { replace: true });
      return;
    }
    refundAccountsApi.list().then(setAccounts).catch((e) => {
      setAccounts([]);
      setError(e.message);
    });
  }, [signedIn, navigate]);

  const title = view === 'bank' ? 'My bank details' : view === 'upi' ? 'Add UPI ID' : 'Bank & UPI details';

  const run = async (fn: () => Promise<RefundAccount[]>) => {
    setError('');
    try {
      setAccounts(await fn());
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary font-sans">
      <SEO title={`${title} | FreshCart`} description="Save a bank account or UPI ID to receive FreshCart refunds." />

      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-divider bg-surface px-4 pb-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => (view === 'list' ? goBack() : setView('list'))}
          aria-label="Go back"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-primary transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-extrabold uppercase tracking-wide">{title}</h1>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 pb-16">
        {view !== 'list' ? (
          <RefundAccountForm
            kind={view}
            onSaved={(_, all) => {
              setAccounts(all);
              setView('list');
            }}
          />
        ) : (
          <>
            <p className="text-sm font-medium text-text-secondary">
              When you return an item you can choose to get the refund in your FreshCart wallet or in one of these
              accounts.
            </p>

            {error && <p role="alert" className="mt-4 text-xs font-bold text-error">{error}</p>}

            <div className="mt-5 space-y-3">
              {accounts === null && (
                <div className="h-20 rounded-2xl bg-background animate-pulse" aria-label="Loading" />
              )}
              {accounts?.map((a) => (
                <div key={a.id} className="rounded-2xl border border-divider p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-primary/10 text-[#2E7D32] flex items-center justify-center shrink-0">
                      {a.type === 'bank' ? <Landmark size={19} /> : <Smartphone size={19} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold truncate">
                        {a.type === 'bank' ? `A/c ••••${a.accountLast4}` : a.upiId}
                      </p>
                      <p className="text-xs font-medium text-text-secondary mt-0.5 truncate">
                        {a.type === 'bank' ? `${a.holderName} · ${a.ifsc}` : 'UPI ID'}
                      </p>
                    </div>
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#2E7D32]">
                        <CheckCircle2 size={11} /> Default
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-4 border-t border-divider pt-3">
                    {!a.isDefault && (
                      <button
                        onClick={() => run(() => refundAccountsApi.setDefault(a.id))}
                        className="text-xs font-extrabold text-[#2E7D32] hover:underline cursor-pointer"
                      >
                        Make default
                      </button>
                    )}
                    <button
                      onClick={() =>
                        confirmRemove === a.id
                          ? run(() => refundAccountsApi.remove(a.id)).then(() => setConfirmRemove(null))
                          : setConfirmRemove(a.id)
                      }
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-error hover:underline cursor-pointer"
                    >
                      <Trash2 size={13} />
                      {confirmRemove === a.id ? 'Tap again to remove' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              <button
                onClick={() => setView('bank')}
                className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 px-4 py-4 text-left transition-colors hover:bg-primary/5 cursor-pointer"
              >
                <Plus size={20} className="text-[#2E7D32]" />
                <span className="text-sm font-extrabold text-[#2E7D32]">Add bank account</span>
              </button>
              <button
                onClick={() => setView('upi')}
                className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 px-4 py-4 text-left transition-colors hover:bg-primary/5 cursor-pointer"
              >
                <Plus size={20} className="text-[#2E7D32]" />
                <span className="text-sm font-extrabold text-[#2E7D32]">Add UPI ID</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
