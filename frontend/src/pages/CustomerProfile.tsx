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
  Pencil,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Landmark,
  ReceiptText,
  CalendarClock,
  Star,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import { CustomerAuthModal } from '../components/CustomerAuthModal';
import { apiUrl } from '../config/api';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.freshcart.app.freshcart';

type MenuItem = {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
  trailing?: string;
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
  const [notice, setNotice] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const handleLogout = () => {
    localStorage.removeItem('customer_user');
    localStorage.removeItem('customer_token');
    setCustomerUser(null);
    window.dispatchEvent(new Event('customer_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
    window.dispatchEvent(new Event('customer_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    setNotice('Profile updated.');
    setIsEditingProfile(false);
    setIsSubmitting(false);
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch(apiUrl(`/customers/me?phone=${encodeURIComponent(phone)}`), { method: 'DELETE' });
    } catch (err) {
      console.warn('Account deletion API unavailable — cleared locally');
    }
    localStorage.removeItem('customer_user');
    localStorage.removeItem('customer_token');
    setCustomerUser(null);
    window.dispatchEvent(new Event('customer_auth_changed'));
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const isSignedIn = Boolean(customerUser);
  const displayName = customerUser?.name || 'FreshCart shopper';
  const displayPhone = customerUser?.phone || '';
  const avatarInitial = (customerUser?.name || '').trim().charAt(0).toUpperCase();
  const walletBalance = Number(customerUser?.walletBalance || 0);

  // Signed-out shoppers get the auth modal instead of an account-only page.
  const requireAuth = (fn: () => void) => () => (isSignedIn ? fn() : setIsAuthModalOpen(true));
  const comingSoon = (feature: string) => () => setNotice(`${feature} is coming soon.`);

  const quickTiles: MenuItem[] = [
    { icon: ShoppingBag, title: 'Your orders', onClick: requireAuth(() => navigate('/orders')) },
    {
      icon: Wallet,
      title: isSignedIn ? `₹${walletBalance.toFixed(0)}` : 'Wallet',
      onClick: requireAuth(() => setNotice('Adding money to your wallet is available in the FreshCart app.')),
    },
    { icon: Headphones, title: 'Need help?', onClick: () => navigate('/support') },
  ];

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Your information',
      items: [
        { icon: MapPin, title: 'Address book', onClick: requireAuth(() => navigate('/locations')) },
        { icon: Heart, title: 'Your wishlist', onClick: () => window.dispatchEvent(new Event('open_wishlist')) },
      ],
    },
    {
      title: 'Payments and refunds',
      items: [
        {
          icon: Wallet,
          title: 'FreshCart Wallet',
          trailing: isSignedIn ? `₹${walletBalance.toFixed(2)}` : undefined,
          onClick: requireAuth(() => setNotice('Adding money to your wallet is available in the FreshCart app.')),
        },
        { icon: Landmark, title: 'Bank & UPI details', onClick: requireAuth(() => navigate('/account/profile/bank-details')) },
        { icon: ReceiptText, title: 'Payment & refunds', onClick: () => navigate('/support') },
        { icon: CalendarClock, title: 'FreshCart Pay Later', onClick: requireAuth(comingSoon('FreshCart Pay Later')) },
      ],
    },
    {
      title: 'Other information',
      items: [
        { icon: Headphones, title: 'Help & support', onClick: () => navigate('/support') },
        { icon: Star, title: 'Rate FreshCart', onClick: () => window.open(PLAY_STORE_URL, '_blank', 'noopener') },
        { icon: FileText, title: 'Terms & legal', onClick: () => navigate('/legal') },
      ],
    },
  ];

  const rise = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="relative min-h-screen bg-[#F3F6F2] text-text-primary font-sans selection:bg-primary/20 pb-44 sm:pb-16">
      <SEO
        title="Account | FreshCart"
        description="Manage your FreshCart account, orders, saved addresses, wallet balance and support."
      />

      {/* Green wash that fades into the page, Blinkit-style */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-80 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, #BFE8C3 0%, #DDF3DF 45%, #F3F6F2 100%)' }}
      />

      <div className="relative max-w-2xl mx-auto px-4">
        <div className="pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button
            onClick={goBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-text-primary transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <motion.div {...rise}>
          {/* Identity */}
          <section className="flex flex-col items-center text-center pb-5">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center text-[#2E7D32]">
              {isSignedIn && avatarInitial ? (
                <span className="text-4xl font-extrabold font-display">{avatarInitial}</span>
              ) : (
                <User size={44} strokeWidth={2.25} />
              )}
            </div>
            {isSignedIn ? (
              <>
                <h1 className="mt-3 text-2xl font-extrabold font-display tracking-tight max-w-full truncate">
                  {displayName}
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-text-secondary">
                  {[displayPhone, customerUser?.email].filter(Boolean).join(' • ')}
                </p>
                <button
                  onClick={() => setIsEditingProfile((v) => !v)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2E7D32] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded cursor-pointer"
                >
                  <Pencil size={12} />
                  {isEditingProfile ? 'Close' : 'Edit profile'}
                </button>
              </>
            ) : (
              <>
                <h1 className="mt-3 text-2xl font-extrabold font-display tracking-tight">Your account</h1>
                <p className="mt-1 text-sm font-medium text-text-secondary">
                  Log in to track orders, save addresses and check out faster.
                </p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="mt-4 rounded-full bg-primary px-8 py-3 text-sm font-extrabold text-white transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                >
                  Log in or sign up
                </button>
              </>
            )}
          </section>

          <AnimatePresence>
            {isSignedIn && isEditingProfile && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveProfile}
                className="mb-4 overflow-hidden rounded-2xl bg-white"
              >
                <div className="space-y-3 p-4">
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
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Quick tiles */}
          <div className="grid grid-cols-3 gap-3">
            {quickTiles.map((tile) => (
              <button
                key={tile.title}
                onClick={tile.onClick}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white px-2 py-4 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
              >
                <span className="w-11 h-11 rounded-full bg-primary/10 text-[#2E7D32] flex items-center justify-center">
                  <tile.icon size={22} strokeWidth={2} />
                </span>
                <span className="text-[13px] font-bold text-text-primary leading-tight truncate max-w-full tabular-nums">
                  {tile.title}
                </span>
              </button>
            ))}
          </div>

          {sections.map((section) => (
            <section key={section.title} className="mt-4 rounded-2xl bg-white overflow-hidden">
              <h2 className="px-4 pt-4 pb-2 text-base font-extrabold font-display tracking-tight">{section.title}</h2>
              {section.items.map((item) => (
                <MenuRow key={item.title} item={item} />
              ))}
            </section>
          ))}

          {isSignedIn && (
            <section className="mt-4 rounded-2xl bg-white overflow-hidden">
              <button
                onClick={() => (confirmSignOut ? handleLogout() : setConfirmSignOut(true))}
                className="w-full flex items-center gap-3.5 px-4 py-4 text-left text-sm font-bold text-error transition-colors hover:bg-error/5 focus-visible:outline-none focus-visible:bg-error/5 cursor-pointer"
              >
                <LogOut size={19} />
                {confirmSignOut ? 'Tap again to log out' : 'Log out'}
              </button>
            </section>
          )}

          <p className="pt-5 text-center text-[11px] font-medium text-text-tertiary">FreshCart · v1.0</p>
        </motion.div>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            role="status"
            className="fixed left-1/2 -translate-x-1/2 bottom-40 z-50 flex items-center gap-2 rounded-full bg-[#1C1C1E] px-4 py-2.5 text-xs font-bold text-white shadow-lg max-w-[calc(100%-2rem)]"
          >
            <CheckCircle2 size={15} className="shrink-0 text-primary" />
            <span>{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
    className="group w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-transparent border-0 border-t border-divider transition-colors hover:bg-background active:bg-background focus-visible:outline-none focus-visible:bg-background cursor-pointer"
  >
    <item.icon size={20} strokeWidth={1.9} className="text-text-primary shrink-0" />
    <span className="flex-1 min-w-0 text-[15px] font-semibold text-text-primary truncate">{item.title}</span>
    {item.trailing && <span className="text-sm font-bold text-[#2E7D32] tabular-nums">{item.trailing}</span>}
    <ChevronRight size={18} className="text-text-tertiary shrink-0 transition-transform group-hover:translate-x-0.5" />
  </button>
);
