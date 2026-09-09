import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { partnerApi } from '../partnerApi';
import { Btn, Card, Field } from '../ui';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await partnerApi.forgot(email.trim());
      setStage('reset');
      setMsg(
        r.devCode
          ? `Test mode: your reset code is ${r.devCode}`
          : 'If that account exists, a reset code has been sent.',
      );
    } catch (e: any) {
      setErr(e.message || 'Could not send a code');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    setBusy(true);
    setErr(null);
    try {
      await partnerApi.reset(email.trim(), code.trim(), password);
      setMsg('Password updated. Sign in with your new password.');
      setTimeout(() => navigate('/partner/profile'), 1200);
    } catch (e: any) {
      setErr(e.message || 'Could not reset the password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-paper font-admin-body text-admin-text flex items-center justify-center p-5">
      <div className="w-full max-w-[380px]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 font-admin-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted hover:text-admin-text mb-4"
        >
          <ArrowLeft size={13} /> Back
        </button>

        <Card className="p-6">
          <h1 className="font-admin-display font-semibold text-[18px] text-admin-text">
            Reset password
          </h1>
          <p className="font-admin-mono text-[10px] uppercase tracking-[0.12em] text-admin-text-faint mt-1.5">
            {stage === 'email' ? 'Step 1 of 2 · verify email' : 'Step 2 of 2 · new password'}
          </p>

          {msg && (
            <p className="text-[12px] text-admin-green bg-admin-green-soft rounded-md px-3 py-2.5 font-medium mt-4">
              {msg}
            </p>
          )}
          {err && (
            <p className="text-[12px] text-admin-red bg-admin-red-soft rounded-md px-3 py-2.5 font-medium mt-4">
              {err}
            </p>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <Field
              label="Account email"
              type="email"
              value={email}
              disabled={stage === 'reset'}
              onChange={(e) => setEmail(e.target.value)}
            />

            {stage === 'email' ? (
              <Btn onClick={sendCode} loading={busy} disabled={!email.trim()} className="w-full py-2.5">
                Send reset code
              </Btn>
            ) : (
              <>
                <Field
                  label="Reset code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="tracking-[0.3em] font-admin-mono"
                />
                <Field
                  label="New password (min 6)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Btn
                  onClick={doReset}
                  loading={busy}
                  disabled={code.length < 4 || password.length < 6}
                  className="w-full py-2.5"
                >
                  Update password
                </Btn>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
