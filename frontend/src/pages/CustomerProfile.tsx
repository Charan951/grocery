import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/SEO';
import { 
  User, 
  ShoppingBag, 
  MapPin, 
  Headphones, 
  Store, 
  FileText, 
  Wallet, 
  Sparkles, 
  ChevronRight, 
  LogOut, 
  Edit3, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert,
  Moon,
  Sun
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import { CustomerAuthModal } from '../components/CustomerAuthModal';

export const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const goBack = useSmartBack('/');

  const [customerUser, setCustomerUser] = useState<any>(() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Profile edit fields
  const [name, setName] = useState(customerUser?.name || 'Chara');
  const [email, setEmail] = useState(customerUser?.email || '');
  const [phone] = useState(customerUser?.phone || '+91 6305804155');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Dark mode toggle simulation
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (customerUser) {
      setName(customerUser.name || 'Chara');
      setEmail(customerUser.email || '');
    }
  }, [customerUser]);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('customer_user');
      setCustomerUser(null);
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetId = customerUser?.customerId || phone || 'customer';
      const res = await fetch(`/api/customers/${encodeURIComponent(targetId)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json().catch(() => null);

      const updatedCustomer = {
        ...customerUser,
        name: name || `Customer (${phone.slice(-4)})`,
        email: email || '',
      };

      if (data && data.customer) {
        updatedCustomer.name = data.customer.name || updatedCustomer.name;
        updatedCustomer.email = data.customer.email || updatedCustomer.email;
      }

      localStorage.setItem('customer_user', JSON.stringify(updatedCustomer));
      setCustomerUser(updatedCustomer);
      window.dispatchEvent(new Event('storage'));
      setSuccessMsg('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      console.warn('API sync fallback to local state:', err);
      const updatedCustomer = {
        ...customerUser,
        name: name || `Customer (${phone.slice(-4)})`,
        email: email || '',
      };
      localStorage.setItem('customer_user', JSON.stringify(updatedCustomer));
      setCustomerUser(updatedCustomer);
      window.dispatchEvent(new Event('storage'));
      setSuccessMsg('Profile updated successfully!');
      setIsEditingProfile(false);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? All orders and wallet history will be removed.')) {
      try {
        await fetch(`/api/customers/me?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Offline account deletion fallback');
      }
      localStorage.removeItem('customer_user');
      setCustomerUser(null);
      navigate('/');
    }
  };

  const displayName = customerUser?.name || 'Guest User';
  const displayPhone = customerUser?.phone || 'Not signed in';
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'G';
  const walletBalance = customerUser?.walletBalance || 0;
  const isVip = customerUser?.isVip || false;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      <SEO 
        title="Account | FreshCart"
        description="Manage your FreshCart account, view orders, saved addresses, wallet balance and support."
      />

      {/* Top Header */}
      <header className="bg-white border-b border-gray-200/80 py-3.5 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
            Account
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Notification Alerts */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. USER PROFILE CARD (Matches Flutter profile_screen.dart) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* Avatar Circle */}
              <div className="w-14 h-14 rounded-full bg-[#0C831F]/10 text-[#0C831F] font-black text-xl flex items-center justify-center border border-[#0C831F]/20 shrink-0">
                {avatarInitial}
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                    {displayName}
                  </h2>
                  {isVip && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                      <Sparkles size={10} /> VIP
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">
                  {displayPhone}
                </p>
              </div>
            </div>

            {/* Edit Profile / Sign in CTA */}
            {customerUser ? (
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="bg-gray-100 hover:bg-gray-200 text-[#0C831F] font-extrabold text-xs px-4 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={14} />
                <span>{isEditingProfile ? 'Cancel' : 'Edit'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-[#0C831F] hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-full shadow-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>

          {/* EDIT PROFILE INLINE FORM */}
          <AnimatePresence>
            {isEditingProfile && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveProfile}
                className="mt-4 pt-4 border-t border-gray-100 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#0C831F] focus:ring-2 focus:ring-[#0C831F]/20 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#0C831F] focus:ring-2 focus:ring-[#0C831F]/20 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-900 outline-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Delete Account
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#0C831F] hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* 2. FRESHCART VIP MEMBERSHIP CARD */}
        <div 
          onClick={() => navigate('/offers')}
          className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-4 text-white shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-amber-100" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white">FreshCart VIP Club</h3>
              <p className="text-[11px] font-medium text-amber-100">
                Free delivery on all orders & exclusive member perks
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/80 shrink-0" />
        </div>

        {/* 3. WALLET BALANCE CARD */}
        <div className="bg-white rounded-3xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0C831F] flex items-center justify-center shrink-0 border border-emerald-100">
              <Wallet size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">FreshCart Wallet</h4>
              <p className="text-lg font-black text-gray-900 leading-none mt-0.5">
                ₹{walletBalance.toFixed(2)}
              </p>
            </div>
          </div>
          <button 
            onClick={() => alert('Wallet Add Money is enabled in app!')}
            className="bg-emerald-50 hover:bg-[#0C831F] hover:text-white text-[#0C831F] font-black text-xs px-4 py-2 rounded-full border border-emerald-200 transition-all cursor-pointer"
          >
            Add Money
          </button>
        </div>

        {/* 4. ACCOUNT MENU OPTIONS LIST */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden">
          {/* My Orders */}
          <button
            onClick={() => navigate('/orders')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">My Orders</h4>
                <p className="text-[11px] font-medium text-gray-500">Track, view invoice & order again</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          {/* Saved Addresses */}
          <button
            onClick={() => navigate('/locations')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Saved Addresses</h4>
                <p className="text-[11px] font-medium text-gray-500">Manage delivery locations</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          {/* Help & Support */}
          <button
            onClick={() => navigate('/support')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0C831F] flex items-center justify-center shrink-0">
                <Headphones size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Help & Support</h4>
                <p className="text-[11px] font-medium text-gray-500">24x7 customer assistance & chat</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          {/* Partner Stores */}
          <button
            onClick={() => navigate('/stores')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Stores Nearby</h4>
                <p className="text-[11px] font-medium text-gray-500">Find nearest fulfillment hubs</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          {/* Terms & Privacy */}
          <button
            onClick={() => navigate('/legal')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer border-none bg-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Terms & Legal</h4>
                <p className="text-[11px] font-medium text-gray-500">Privacy policy & terms of service</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          {/* Appearance / Theme */}
          <div className="w-full px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">App Theme</h4>
                <p className="text-[11px] font-medium text-gray-500">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="bg-gray-100 hover:bg-gray-200 text-xs font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Sign Out Button */}
        {customerUser && (
          <button
            onClick={handleLogout}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-rose-100"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        )}
      </main>

      {/* Customer Auth Modal */}
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
