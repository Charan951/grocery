import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ListFilter, Check } from 'lucide-react';

/**
 * Shared presentational primitives for the delivery-partner console. They pin
 * the surface to the admin design system (`--admin-*` tokens, Rubik /
 * Nunito Sans / IBM Plex Mono) so the two staff consoles read as one product.
 */

export const PageHead: React.FC<{
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, meta, actions }) => (
  <div className="flex items-end justify-between gap-4 mb-5">
    <div>
      <h1 className="font-admin-display font-semibold text-[19px] leading-none text-admin-text tracking-tight">
        {title}
      </h1>
      {meta != null && (
        <div className="font-admin-mono text-[10px] uppercase tracking-[0.12em] text-admin-text-faint mt-2">
          {meta}
        </div>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <div
    className={`bg-admin-surface border border-admin-ledger-line rounded-lg ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`font-admin-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-admin-text-faint ${className}`}
  >
    {children}
  </div>
);

type Tone = 'green' | 'amber' | 'red' | 'neutral';
const toneMap: Record<Tone, string> = {
  green: 'bg-admin-green-soft text-admin-green',
  amber: 'bg-admin-amber-soft text-admin-amber',
  red: 'bg-admin-red-soft text-admin-red',
  neutral: 'bg-admin-paper text-admin-text-muted border border-admin-ledger-line',
};

export const Pill: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 font-admin-mono text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded ${toneMap[tone]} ${className}`}
  >
    {children}
  </span>
);

export const Stat: React.FC<{
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}> = ({ Icon, label, value, tone = 'green' }) => (
  <Card className="p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
    <span
      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center shrink-0 ${
        tone === 'green'
          ? 'bg-admin-green-soft text-admin-green'
          : tone === 'amber'
          ? 'bg-admin-amber-soft text-admin-amber'
          : tone === 'red'
          ? 'bg-admin-red-soft text-admin-red'
          : 'bg-admin-paper text-admin-text-muted'
      }`}
    >
      <Icon size={16} />
    </span>
    <div className="min-w-0">
      <div className="font-admin-display font-bold text-[15px] sm:text-[17px] leading-none text-admin-text tabular-nums truncate">
        {value}
      </div>
      <div className="font-admin-mono text-[9px] uppercase tracking-[0.1em] sm:tracking-[0.12em] text-admin-text-faint mt-1.5 truncate">
        {label}
      </div>
    </div>
  </Card>
);

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'ghost' | 'danger' | 'dark';
    loading?: boolean;
  }
> = ({ variant = 'primary', loading, disabled, className = '', children, ...rest }) => {
  const v = {
    primary: 'bg-admin-green text-white hover:brightness-95',
    dark: 'bg-admin-ink text-white hover:bg-admin-ink-soft',
    ghost:
      'bg-admin-surface border border-admin-ledger-line text-admin-text-muted hover:text-admin-text hover:bg-admin-paper',
    danger: 'bg-admin-red-soft text-admin-red hover:brightness-95',
  }[variant];
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-[12px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${v} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};

export const Field: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
> = ({ label, className = '', ...rest }) => (
  <label className="block">
    <span className="font-admin-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
      {label}
    </span>
    <input
      className={`mt-1.5 w-full border border-admin-ledger-line rounded-md px-3 py-2.5 text-[13px] bg-admin-surface text-admin-text font-admin-body focus:border-admin-green transition-colors placeholder:text-admin-text-faint disabled:bg-admin-paper ${className}`}
      {...rest}
    />
  </label>
);

export const CenterState: React.FC<{
  kind?: 'loading' | 'empty' | 'error';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ kind = 'loading', icon: Icon, title, children }) => {
  if (kind === 'loading') {
    return (
      <div className="flex items-center justify-center py-16 text-admin-text-faint">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  const err = kind === 'error';
  return (
    <div className="rounded-lg border border-admin-ledger-line bg-admin-surface py-8 px-6 flex flex-col items-center text-center gap-2">
      {Icon && (
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            err ? 'bg-admin-red-soft text-admin-red' : 'bg-admin-paper text-admin-text-faint'
          }`}
        >
          <Icon size={18} />
        </span>
      )}
      {title && (
        <div
          className={`font-admin-display font-semibold text-[13px] ${
            err ? 'text-admin-red' : 'text-admin-text'
          }`}
        >
          {title}
        </div>
      )}
      {children && (
        <div className="text-[12px] text-admin-text-muted max-w-[240px] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * A single "three lines" filter action (matches the mobile app's
 * FilterAction): a compact icon button that opens a small menu to pick one
 * option, instead of a permanently-visible tab/segmented row. Used the same
 * way on every list screen (History, Earnings, ...) so filtering stays
 * consistent across the console.
 */
export const FilterMenu = <T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-md border transition-colors cursor-pointer ${
          open
            ? 'bg-admin-green-soft border-admin-green text-admin-green'
            : 'bg-admin-surface border-admin-ledger-line text-admin-text-muted hover:text-admin-text'
        }`}
      >
        <ListFilter size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-48 bg-admin-surface border border-admin-ledger-line rounded-lg shadow-lg overflow-hidden">
          <div className="font-admin-mono text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-faint px-3 pt-3 pb-1.5">
            {title}
          </div>
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left transition-colors cursor-pointer ${
                  sel ? 'font-semibold text-admin-green bg-admin-green-soft' : 'text-admin-text hover:bg-admin-paper'
                }`}
              >
                {o.label}
                {sel && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const money = (n: number | undefined | null) => `₹${Number(n || 0).toFixed(0)}`;
