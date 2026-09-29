import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { refundAccountsApi, type RefundAccount } from '../utils/returnsApi';

type Props = {
  kind: 'bank' | 'upi';
  onSaved: (account: RefundAccount, all: RefundAccount[]) => void;
  onCancel?: () => void;
};

// Basic shape only — the server decides how strict to be (it accepts dummy
// details while bank payouts are simulated) and its message is shown on submit.
const IFSC_RE = /^[A-Z0-9]{4,11}$/;
const ACCT_RE = /^\d{4,18}$/;
const UPI_RE = /^[a-z0-9._-]{2,256}@[a-z]{2,64}$/;

const inputCls =
  'w-full border-0 border-b-2 border-divider bg-transparent px-0 pb-2 pt-1 text-[15px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-tertiary placeholder:font-medium focus:border-[#2E7D32]';
const labelCls = 'block text-xs font-bold text-text-secondary';

/** Add-bank-account / add-UPI form, shared by the Bank & UPI page and the return flow. */
export const RefundAccountForm: React.FC<Props> = ({ kind, onSaved, onCancel }) => {
  const [ifsc, setIfsc] = useState('');
  const [acct, setAcct] = useState('');
  const [confirmAcct, setConfirmAcct] = useState('');
  const [holder, setHolder] = useState('');
  const [upiId, setUpiId] = useState('');
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const upiValid = UPI_RE.test(upiId.trim().toLowerCase());

  // Why Submit is disabled — shown under the form so it never looks stuck.
  const blocker = (() => {
    if (kind === 'upi') return upiId && !upiValid ? 'Enter a UPI ID like name@okhdfcbank' : !upiId ? 'Enter your UPI ID' : '';
    if (!IFSC_RE.test(ifsc)) return 'Enter the IFSC code (e.g. HDFC0001234)';
    if (!ACCT_RE.test(acct)) return 'Enter your account number';
    if (confirmAcct !== acct) return confirmAcct ? 'Account numbers do not match' : 'Re-enter your account number to confirm';
    if (holder.trim().length < 2) return "Enter the account holder's name";
    if (!agree) return 'Accept the Privacy Policy to continue';
    return '';
  })();
  const canSubmit = !blocker && !saving;
  // Only surface mismatches as errors; the rest is a neutral hint.
  const fieldError = kind === 'bank' && confirmAcct && confirmAcct !== acct ? 'Account numbers do not match' : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const res = await refundAccountsApi.add(
        kind === 'bank'
          ? { type: 'bank', ifsc, accountNumber: acct, confirmAccountNumber: confirmAcct, holderName: holder.trim() }
          : { type: 'upi', upiId: upiId.trim().toLowerCase() },
      );
      onSaved(res.account, res.accounts);
    } catch (err: any) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col">
      <div className="space-y-6">
        {kind === 'bank' ? (
          <>
            <label className="block">
              <span className={labelCls}>IFSC Code</span>
              <input
                autoFocus
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                placeholder="e.g. HDFC0001234"
                autoComplete="off"
                className={`${inputCls} uppercase tracking-wide`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Account Number</span>
              <input
                value={acct}
                onChange={(e) => setAcct(e.target.value.replace(/\D/g, '').slice(0, 18))}
                inputMode="numeric"
                autoComplete="off"
                type="password"
                placeholder="9–18 digits"
                className={`${inputCls} tabular-nums`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Confirm Account Number</span>
              <input
                value={confirmAcct}
                onChange={(e) => setConfirmAcct(e.target.value.replace(/\D/g, '').slice(0, 18))}
                onPaste={(e) => e.preventDefault()}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Re-enter account number"
                className={`${inputCls} tabular-nums`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Account Holder's Name</span>
              <input
                value={holder}
                onChange={(e) => setHolder(e.target.value.slice(0, 80))}
                autoComplete="name"
                placeholder="As printed on your passbook"
                className={inputCls}
              />
            </label>
          </>
        ) : (
          <label className="block">
            <span className={labelCls}>UPI ID</span>
            <input
              autoFocus
              value={upiId}
              onChange={(e) => setUpiId(e.target.value.replace(/\s/g, ''))}
              autoComplete="off"
              autoCapitalize="none"
              placeholder="e.g. name@okhdfcbank"
              className={inputCls}
            />
          </label>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#2E7D32]"
          />
          <span className="text-sm font-medium text-text-primary leading-snug">
            By continuing, you agree with the handling of your data as per our{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener" className="font-bold text-[#2E7D32] hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>

        {(fieldError || error) ? (
          <p role="alert" className="text-xs font-bold text-error">{error || fieldError}</p>
        ) : blocker ? (
          <p className="text-xs font-semibold text-text-secondary">{blocker}</p>
        ) : null}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-xl bg-primary/8 px-4 py-3">
        <ShieldCheck size={26} className="shrink-0 text-[#2E7D32]" />
        <p className="text-[13px] font-medium text-text-primary leading-snug">
          Please enter the {kind === 'bank' ? 'bank details' : 'UPI ID'} carefully and don't worry, it is 100% safe!
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-divider py-3.5 text-sm font-extrabold text-text-primary transition-colors hover:bg-background cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-[2] rounded-xl bg-[#2E7D32] py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#256628] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </form>
  );
};
