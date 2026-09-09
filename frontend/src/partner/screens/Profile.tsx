import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Star, Bike, Phone, Mail, KeyRound, PackageCheck, XCircle,
  Wallet, Bell, ChevronRight, Pencil, Check, X, User as UserIcon,
} from 'lucide-react';
import { usePartner } from '../PartnerContext';
import { Btn, Card, PageHead, SectionLabel, Stat, Pill, Field, money } from '../ui';

const VEHICLES: Array<{ value: string; label: string }> = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'car', label: 'Car' },
  { value: 'on_foot', label: 'On foot' },
];

const vehicleLabel = (v?: string) => VEHICLES.find((x) => x.value === v)?.label || 'Not set';

export const Profile: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { partner, unreadNotifications, updateMe } = usePartner();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', vehicleType: 'bike' });

  const openEdit = () => {
    setForm({
      name: partner?.name || '',
      phone: partner?.phone || '',
      vehicleType: partner?.vehicleType || 'bike',
    });
    setErr(null);
    setSaved(false);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await updateMe({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        vehicleType: form.vehicleType,
      });
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch (e: any) {
      setErr(e?.message || 'Could not save your changes');
    } finally {
      setSaving(false);
    }
  };

  const availability = partner?.availability;
  const statusTone = availability === 'available' ? 'green' : availability === 'busy' ? 'amber' : 'neutral';
  const statusText = availability === 'available' ? 'Online' : availability === 'busy' ? 'On a delivery' : 'Offline';

  const ratingText = partner?.ratingCount
    ? `${Number(partner.rating).toFixed(1)} · ${partner.ratingCount} rating${partner.ratingCount === 1 ? '' : 's'}`
    : 'No ratings yet';

  return (
    <div>
      <PageHead
        title="Profile"
        meta="Account & session"
        actions={
          !editing && (
            <Btn variant="ghost" onClick={openEdit}>
              <Pencil size={13} /> Edit
            </Btn>
          )
        }
      />

      {saved && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-admin-green/30 bg-admin-green-soft px-3 py-2 text-[12px] font-medium text-admin-green">
          <Check size={14} /> Profile updated
        </div>
      )}

      {/* Identity */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-admin-green-soft text-admin-green flex items-center justify-center font-admin-display font-bold text-[26px] shrink-0">
            {(partner?.name || 'P').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-admin-display font-semibold text-[17px] text-admin-text truncate">
                {partner?.name || 'Partner'}
              </h2>
              <Pill tone={statusTone as any}>{statusText}</Pill>
            </div>
            <p className="text-[12px] text-admin-text-muted flex items-center gap-1 mt-1">
              <Star size={12} className="text-admin-amber" />
              {ratingText}
            </p>
            <p className="text-[11px] text-admin-text-faint mt-0.5">
              {vehicleLabel(partner?.vehicleType)}
              {partner?.lastSeenAt
                ? ` · last seen ${new Date(partner.lastSeenAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}`
                : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <Stat Icon={PackageCheck} label="Delivered" value={partner?.completedCount ?? 0} tone="green" />
        <Stat Icon={XCircle} label="Failed" value={partner?.failedCount ?? 0} tone="red" />
        <Stat Icon={Star} label="Rating" value={Number(partner?.rating ?? 5).toFixed(1)} tone="amber" />
        <Stat Icon={Wallet} label="Today" value={money(partner?.todayEarnings)} tone="neutral" />
      </div>

      {/* Details — read or edit */}
      <SectionLabel className="mt-7 mb-2">Details</SectionLabel>
      {editing ? (
        <Card className="p-4 space-y-4">
          <Field
            label="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
            maxLength={60}
          />
          <Field
            label="Phone"
            value={form.phone}
            inputMode="numeric"
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
            placeholder="10-digit mobile number"
          />
          <div>
            <span className="font-admin-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
              Vehicle
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {VEHICLES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, vehicleType: v.value }))}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
                    form.vehicleType === v.value
                      ? 'bg-admin-green text-white border-admin-green'
                      : 'bg-admin-surface text-admin-text-muted border-admin-ledger-line hover:bg-admin-paper'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-admin-text-faint">
            <Mail size={13} /> {partner?.email} · email is managed by the operations team
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-md border border-admin-red/30 bg-admin-red-soft px-3 py-2 text-[12px] font-medium text-admin-red">
              <X size={14} /> {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Btn variant="primary" onClick={save} loading={saving} className="flex-1">
              <Check size={14} /> Save changes
            </Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="flex-1">
              Cancel
            </Btn>
          </div>
        </Card>
      ) : (
        <Card className="divide-y divide-admin-ledger-line overflow-hidden">
          {([
            [UserIcon, 'Name', partner?.name || 'Not set'],
            [Phone, 'Phone', partner?.phone || 'Not set'],
            [Mail, 'Email', partner?.email || 'Not set'],
            [Bike, 'Vehicle', vehicleLabel(partner?.vehicleType)],
          ] as Array<[React.ComponentType<{ size?: number; className?: string }>, string, string]>).map(
            ([Icon, label, value]) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon size={15} className="text-admin-text-faint" />
                <span className="font-admin-mono text-[10px] uppercase tracking-[0.1em] text-admin-text-faint w-20">
                  {label}
                </span>
                <span className="text-[13px] font-medium text-admin-text flex-1 text-right truncate">
                  {value}
                </span>
              </div>
            ),
          )}
        </Card>
      )}

      {/* Shortcuts */}
      <SectionLabel className="mt-7 mb-2">Shortcuts</SectionLabel>
      <Card className="divide-y divide-admin-ledger-line overflow-hidden">
        {[
          { Icon: Wallet, label: 'Earnings', to: '/partner/earnings', badge: 0 },
          { Icon: Bell, label: 'Notifications', to: '/partner/notifications', badge: unreadNotifications },
        ].map(({ Icon, label, to, badge }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-admin-paper transition-colors"
          >
            <Icon size={15} className="text-admin-text-faint" />
            <span className="text-[13px] font-medium text-admin-text flex-1">{label}</span>
            {badge ? (
              <span className="font-admin-mono text-[9px] font-bold bg-admin-red-soft text-admin-red px-1.5 py-0.5 rounded">
                {badge > 9 ? '9+' : badge}
              </span>
            ) : null}
            <ChevronRight size={15} className="text-admin-text-faint" />
          </button>
        ))}
      </Card>

      {/* Account */}
      <SectionLabel className="mt-7 mb-2">Account</SectionLabel>
      <div className="flex flex-col sm:flex-row gap-2">
        <Btn variant="ghost" onClick={() => navigate('/partner/forgot')} className="flex-1">
          <KeyRound size={14} /> Change password
        </Btn>
        <Btn variant="danger" onClick={onLogout} className="flex-1">
          <LogOut size={14} /> Log out
        </Btn>
      </div>
    </div>
  );
};
