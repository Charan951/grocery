import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/SEO';
import {
  ShoppingBag,
  MapPin,
  Headphones,
  FileText,
  Wallet,
  ChevronRight,
  LogOut,
  Edit3,
  ArrowLeft,
  CheckCircle2,
  Leaf,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import { CustomerAuthModal } from '../components/CustomerAuthModal';
import { apiUrl } from '../config/api';

type MenuItem = {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
};

export const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const goBack = useSmartBack('/');

  const [customerUser, setCustomerUser] = useState<any>(() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [name, setName] = useState(customerUser?.name || '');
  const [email, setEmail] = useState(customerUser?.email || '');
  const [phone] = useState(customerUser?.phone || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [walletHint, setWalletHint] = useState(false);

  useEffect(() => {
    if (customerUser) {
      setName(customerUser.name || '');
      setEmail(customerUser.email || '');
    }
  }, [customerUser]);

  useEffect(() => {
    if (!confirmSignOut) return;
    const t = setTimeout(() => setConfirmSignOut(false), 3500);
    return () => clearTimeout(t);
  }, [confirmSignOut]);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3500);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const handleLogout = () => {
    localStorage.removeItem('customer_user');
    setCustomerUser(null);
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');

    const fallbackName = name || (phone ? `Customer (${phone.slice(-4)})` : 'FreshCart shopper');
    const updatedCustomer = { ...customerUser, name: fallbackName, email: email || '' };

    try {
      const targetId = customerUser?.customerId || phone || 'customer';
      const res = await fetch(apiUrl(`/customers/${encodeURIComponent(targetId)}/profile`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.customer) {
        updatedCustomer.name = data.customer.name || updatedCustomer.name;
        updatedCustomer.email = data.customer.email || updatedCustomer.email;
      }
    } catch (err) {
      console.warn('Profile API sync unavailable — saved locally:', err);
    }

    localStorage.setItem('customer_user', JSON.stringify(updatedCustomer));
    setCustomerUser(updatedCustomer);
    window.dispatchEvent(new Event('storage'));
    setSuccessMsg('Profile updated.');
    setIsEditingProfile(false);
    setIsSubmitting(false);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch(apiUrl(`/customers/me?phone=${encodeURIComponent(phone)}`), { method: 'DELETE' });
    } catch (err) {
      console.warn('Account deletion API unavailable — cleared locally');
    }
    localStorage.removeItem('customer_user');
    setCustomerUser(null);
    navigate('/');
  };

  const isSignedIn = Boolean(customerUser);
  const displayName = customerUser?.name || 'FreshCart shopper';
  const displayPhone = customerUser?.phone || '';
  const avatarInitial = (customerUser?.name || 'F').charAt(0).toUpperCase();
  const walletBalance = Number(customerUser?.walletBalance || 0);

  const menuItems: MenuItem[] = isSignedIn
    ? [
        { icon: ShoppingBag, title: 'My Orders', subtitle: 'Track, reorder & download invoices', onClick: () => navigate('/orders') },
        { icon: MapPin, title: 'Saved Addresses', subtitle: 'Manage your delivery locations', onClick: () => navigate('/locations') },
        { icon: Headphones, title: 'Help & Support', subtitle: '24×7 assistance & live chat', onClick: () => navigate('/support') },
        { icon: FileText, title: 'Terms & Legal', subtitle: 'Privacy policy & terms of service', onClick: () => navigate('/legal') },
      ]
    : [
        { icon: Headphones, title: 'Help & Support', subtitle: '24×7 assistance & live chat', onClick: () => navigate('/support') },
        { icon: FileText, title: 'Terms & Legal', subtitle: 'Privacy policy & terms of service', onClick: () => navigate('/legal') },
      ];

  const rise = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary font-sans selection:bg-primary/20 pb-28 sm:pb-16">
      <SEO
        title="Account | FreshCart"
        description="Manage your FreshCart account, orders, saved addresses, wallet balance and support."
      />

      <div className="max-w-2xl mx-auto px-4">
        {/* Auto-back to wherever the shopper came from + page heading. No app bar. */}
        <div className="pb-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button
            onClick={goBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-background border border-divider flex items-center justify-center text-text-primary transition-colors hover:bg-divider/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="mt-3 text-2xl font-extrabold font-display tracking-tight">Account</h1>
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-3 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3.5 py-2.5 text-xs font-bold text-[#0C831F]"
            >
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isSignedIn ? (
          <motion.div {...rise}>
            {/* Identity */}
            <section className="border-t border-divider py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-[#0C831F] border border-primary/20 font-extrabold text-xl flex items-center justify-center shrink-0">
                    {avatarInitial}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold font-display leading-tight tracking-tight truncate">
                      {displayName}
                    </h2>
                    {displayPhone && (
                      <p className="text-xs font-semibold text-text-secondary mt-0.5">{displayPhone}</p>
                    )}
                    {customerUser?.email && (
                      <p className="text-[11px] font-medium text-text-tertiary mt-0.5 truncate">{customerUser.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingProfile((v) => !v)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-background border border-divider px-3.5 py-2 text-xs font-bold text-text-primary transition-colors hover:border-primary/40 hover:text-[#0C831F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
                >
                  <Edit3 size={13} />
                  {isEditingProfile ? 'Close' : 'Edit'}
                </button>
              </div>

              <AnimatePresence>
                {isEditingProfile && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleSaveProfile}
                    className="mt-4 space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                        Full name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-divider bg-background px-3.5 py-2 text-sm font-semibold text-text-primary outline-none transition-all focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full rounded-xl border border-divider bg-background px-3.5 py-2 text-sm font-semibold text-text-primary outline-none transition-all focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => (confirmDelete ? handleDeleteAccount() : setConfirmDelete(true))}
                        className="text-xs font-bold text-error transition-colors hover:underline cursor-pointer"
                      >
                        {confirmDelete ? 'Tap again to delete account' : 'Delete account'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-full bg-primary px-6 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                      >
                        {isSubmitting ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </section>

            {/* Wallet */}
            <section className="border-t border-divider py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-[#0C831F] flex items-center justify-center shrink-0">
                    <Wallet size={19} />
                  </span>
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
                      FreshCart Wallet
                    </h3>
                    <p className="text-lg font-extrabold leading-none mt-1 tabular-nums">
                      ₹{walletBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWalletHint(true)}
                  className="rounded-full border border-primary/30 bg-primary/8 px-4 py-2 text-xs font-extrabold text-[#0C831F] transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
                >
                  Add money
                </button>
              </div>
              <AnimatePresence>
                {walletHint && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden pl-[3.375rem] text-[11px] font-medium text-text-secondary"
                  >
                    Adding money to your wallet is available in the FreshCart mobile app.
                  </motion.p>
                )}
              </AnimatePresence>
            </section>

            {/* Menu — plain rows, one hairline per sub-page */}
            <nav className="border-t border-divider">
              {menuItems.map((item) => (
                <MenuRow key={item.title} item={item} />
              ))}
            </nav>

            {/* Sign out */}
            <div className="border-t border-divider pt-4">
              <button
                onClick={() => (confirmSignOut ? handleLogout() : setConfirmSignOut(true))}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-error/25 py-3 text-sm font-extrabold text-error transition-colors hover:bg-error/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/25 cursor-pointer"
              >
                <LogOut size={17} />
                {confirmSignOut ? 'Tap again to sign out' : 'Sign out'}
              </button>
            </div>

            <p className="pt-4 text-center text-[11px] font-medium text-text-tertiary">FreshCart · v1.0</p>
          </motion.div>
        ) : (
          <motion.div {...rise}>
            {/* Login / sign up */}
            <section className="border-t border-divider py-6">
              <span className="inline-flex w-11 h-11 items-center justify-center rounded-full bg-primary/10 text-[#0C831F]">
                <Leaf size={22} fill="currentColor" />
              </span>
              <h2 className="mt-3 text-xl font-extrabold font-display leading-tight tracking-tight">
                Log in or sign up
              </h2>
              <p className="mt-1.5 text-sm font-medium text-text-secondary">
                Save your addresses, track every order, and check out in seconds.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="mt-4 w-full rounded-full bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
              >
                Log in or sign up
              </button>
            </section>

            <nav className="border-t border-divider">
              {menuItems.map((item) => (
                <MenuRow key={item.title} item={item} />
              ))}
            </nav>

            <p className="pt-4 text-center text-[11px] font-medium text-text-tertiary">FreshCart · v1.0</p>
          </motion.div>
        )}
      </div>

      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCustomerUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
};

const MenuRow: React.FC<{ item: MenuItem }> = ({ item }) => (
  <button
    onClick={item.onClick}
    className="group w-full flex items-center gap-3.5 py-4 text-left bg-transparent border-0 border-b border-divider last:border-b-0 transition-colors active:bg-background hover:bg-background focus-visible:outline-none focus-visible:bg-background cursor-pointer"
  >
    <span className="w-9 h-9 rounded-xl bg-primary/10 text-[#0C831F] flex items-center justify-center shrink-0">
      <item.icon size={18} strokeWidth={2.25} />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-bold text-text-primary leading-tight">{item.title}</span>
      <span className="block text-[11px] font-medium text-text-secondary mt-0.5 truncate">{item.subtitle}</span>
    </span>
    <ChevronRight size={17} className="text-text-tertiary shrink-0 transition-transform group-hover:translate-x-0.5" />
  </button>
);
