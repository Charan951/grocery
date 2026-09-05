import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (customer: { phone: string; name?: string }) => void;
}

// 4 Rows of Real Product Images for Animated Moving Marquee Background (Top Half)
const row1 = [
  { id: 'r1_1', name: 'Bananas', img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&auto=format&fit=crop' },
  { id: 'r1_2', name: 'Pampers', img: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=200&auto=format&fit=crop' },
  { id: 'r1_3', name: 'Toor Dal', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop' },
  { id: 'r1_4', name: 'Red Apples', img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200&auto=format&fit=crop' },
  { id: 'r1_5', name: 'Fresh Milk', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop' },
];

const row2 = [
  { id: 'r2_1', name: 'Oats Cereal', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop' },
  { id: 'r2_2', name: 'Basmati Rice', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop' },
  { id: 'r2_3', name: 'Strawberries', img: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200&auto=format&fit=crop' },
  { id: 'r2_4', name: 'Ice Cream Tub', img: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&auto=format&fit=crop' },
  { id: 'r2_5', name: 'Yellow Butter', img: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop' },
];

const row3 = [
  { id: 'r3_1', name: 'Heinz Ketchup', img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&auto=format&fit=crop' },
  { id: 'r3_2', name: 'Fresh Broccoli', img: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&auto=format&fit=crop' },
  { id: 'r3_3', name: 'Nescafe Coffee', img: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&auto=format&fit=crop' },
  { id: 'r3_4', name: 'Wooden Utensils', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop' },
  { id: 'r3_5', name: 'Avocados', img: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop' },
];

const row4 = [
  { id: 'r4_1', name: 'Fortune Cooking Oil', img: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200&auto=format&fit=crop' },
  { id: 'r4_2', name: 'Tata Premium Tea', img: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=200&auto=format&fit=crop' },
  { id: 'r4_3', name: 'Coca Cola Can', img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&auto=format&fit=crop' },
  { id: 'r4_4', name: 'Organic Spices', img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop' },
  { id: 'r4_5', name: 'Fresh Oranges', img: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=200&auto=format&fit=crop' },
];

// 'identifier' — a single "phone or email" field, method auto-detected from
// what's typed (no manual toggle). 'password' / 'otp' branch from there.
type Step = 'identifier' | 'password' | 'register' | 'otp' | 'success';
type Detected = 'phone' | 'email' | null;

const detectMethod = (raw: string): Detected => {
  const v = raw.trim();
  if (!v) return null;
  if (/^\S+@\S+\.\S+$/.test(v)) return 'email';
  if (/^\d{10}$/.test(v.replace(/\D/g, '')) && !v.includes('@')) return 'phone';
  return null;
};

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [detected, setDetected] = useState<Detected>(null);

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const phoneDigits = identifier.replace(/\D/g, '').slice(-10);

  const finishLogin = (customerData: any) => {
    localStorage.setItem('customer_user', JSON.stringify(customerData));
    onLoginSuccess(customerData);
    setStep('success');
    setTimeout(() => {
      resetState();
      onClose();
    }, 900);
  };

  // Step 1: the single identifier field. Phone -> OTP. Email -> password.
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kind = detectMethod(identifier);
    if (!kind) {
      setError('Enter a valid 10-digit phone number or email address');
      return;
    }
    setError('');
    setDetected(kind);

    if (kind === 'email') {
      setStep('password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/customers/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Could not send the code. Please try again.');
        return;
      }
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Enter the code we sent you');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/customers/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits, code: otp }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Incorrect code. Please try again.');
        return;
      }
      localStorage.setItem('customer_token', data.token);
      finishLogin(data.customer);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (email path): password. A 404 "no account" flips straight into the
  // registration fields instead of a dead end.
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/customers/login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 404 && data?.code === 'not_found') {
        setStep('register');
        setError('');
        return;
      }
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Incorrect email or password.');
        return;
      }
      localStorage.setItem('customer_token', data.token);
      finishLogin(data.customer);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (regPhone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: identifier.trim().toLowerCase(), password, phone: regPhone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Could not create your account.');
        return;
      }
      localStorage.setItem('customer_token', data.token);
      finishLogin(data.customer);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep('identifier');
    setIdentifier('');
    setDetected(null);
    setOtp('');
    setPassword('');
    setShowPassword(false);
    setName('');
    setRegPhone('');
    setError('');
    setLoading(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const handleGuest = () => {
    // Browsing already works without an account — this just dismisses the
    // sheet so a visitor isn't blocked from continuing to shop.
    resetState();
    onClose();
  };

  // Pure GPU Hardware-Accelerated 60 FPS continuous infinite marquee row
  const renderMarqueeRow = (items: typeof row1, reverse = false) => (
    <div className="flex overflow-hidden w-full select-none">
      <div className={reverse ? "animate-marquee-right" : "animate-marquee-left"}>
        {[...items, ...items, ...items, ...items, ...items, ...items].map((item, idx) => (
          <div
            key={`${item.id}_${idx}`}
            className="w-18 h-18 sm:w-22 sm:h-22 rounded-3xl bg-[#E0F7FA]/90 overflow-hidden shadow-2xs shrink-0 mr-3"
          >
            <img
              src={item.img}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000]"
          />

          {/* Customer Auth Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] max-w-full bg-white text-gray-900 z-[2001] shadow-2xl flex flex-col h-full overflow-hidden"
          >
            {/* TOP HALF: 4-Row Moving Product Cards Marquee Background */}
            <div className="h-[46%] w-full bg-gradient-to-b from-[#E0F7FA] to-[#E0F7FA]/40 relative overflow-hidden flex flex-col justify-around py-2 shrink-0">
              {/* Floating Top Left Circular Back Button */}
              <button
                onClick={handleModalClose}
                className="absolute top-4 left-4 z-[20] w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-800 hover:bg-gray-50 cursor-pointer transition-transform hover:scale-105"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>

              {/* 4 Moving Marquee Rows (Pure GPU 60FPS Right to Left) */}
              <div className="flex flex-col gap-2 justify-around h-full py-1">
                {renderMarqueeRow(row1, false)}
                {renderMarqueeRow(row2, true)}
                {renderMarqueeRow(row3, false)}
                {renderMarqueeRow(row4, true)}
              </div>

              {/* Fade into the white sheet below so the marquee doesn't hard-cut */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white pointer-events-none" />
            </div>

            {/* BOTTOM HALF: White Section with Brand Icon Badge, Headline, Input & Continue Button */}
            <div className="h-[54%] w-full bg-white px-6 sm:px-8 py-4 flex flex-col items-center justify-center gap-4 text-center overflow-y-auto shrink-0 z-[10]">
              {step === 'success' ? (
                <div className="my-auto flex flex-col items-center justify-center text-center gap-3">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg"
                  >
                    <CheckCircle2 size={36} />
                  </motion.div>
                  <h3 className="text-2xl font-extrabold text-gray-900">Login Successful!</h3>
                  <p className="text-sm text-gray-600 font-medium">Welcome back to FreshCart</p>
                </div>
              ) : (
                <>
                  {/* Brand App Icon Badge & Headline */}
                  <div className="flex flex-col items-center text-center shrink-0 mt-1">
                    {/* Brand Green App Icon Badge */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] shadow-lg shadow-emerald-900/10 flex items-center justify-center mb-3">
                      <span className="text-sm font-black tracking-tight text-white font-display leading-none">
                        fresh<br /><span className="text-[#A5D6A7]">cart</span>
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-[25px] font-black text-gray-900 tracking-tight leading-tight">
                      India's 10 minute app
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-1">
                      Log in or Sign up
                    </p>
                  </div>

                  {/* Error / info notice */}
                  {error && (
                    <div className="w-[310px] sm:w-[350px] max-w-full bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0">
                      <ShieldAlert size={16} className="shrink-0 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Step 1: one field, method auto-detected on submit */}
                  {step === 'identifier' && (
                    <form onSubmit={handleIdentifierSubmit} className="w-[310px] sm:w-[350px] max-w-full flex flex-col gap-3 shrink-0">
                      <div className="w-full border border-gray-300 focus-within:border-[#4CAF50] focus-within:ring-2 focus-within:ring-[#4CAF50]/20 rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all bg-white shadow-2xs">
                        <input
                          type="text"
                          placeholder="Phone number or email"
                          value={identifier}
                          onChange={(e) => { setIdentifier(e.target.value); if (error) setError(''); }}
                          className="w-full min-w-0 bg-transparent border-none outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-sm tracking-wide"
                          autoFocus
                          autoComplete="username"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!detectMethod(identifier) || loading}
                        className="w-full block bg-[#9E9E9E] disabled:bg-[#9E9E9E] disabled:opacity-90 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-2xs cursor-pointer enabled:bg-[#4CAF50] enabled:hover:bg-[#43A047]"
                      >
                        {loading ? 'Sending code…' : 'Continue'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (detectMethod(identifier) === 'email') {
                            setError('');
                            setStep('register');
                          } else {
                            setError('Enter your email above, then tap Create account');
                          }
                        }}
                        className="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        New here? Create an account
                      </button>
                    </form>
                  )}

                  {/* Step 2a (phone): OTP verification */}
                  {step === 'otp' && (
                    <form onSubmit={handleOtpSubmit} className="w-[310px] sm:w-[350px] max-w-full flex flex-col gap-3 shrink-0">
                      <p className="text-xs text-gray-600 font-medium text-center">
                        Code sent to <strong className="text-gray-900">+91 {phoneDigits}</strong>
                      </p>

                      <div className="w-full border border-gray-300 focus-within:border-[#4CAF50] focus-within:ring-2 focus-within:ring-[#4CAF50]/20 rounded-xl px-4 py-3.5 flex items-center gap-3 transition-colors bg-white shadow-2xs">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter the 6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full min-w-0 bg-transparent border-none outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-center text-sm tracking-widest"
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full block bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-70 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer"
                      >
                        {loading ? 'Verifying…' : 'Verify & continue'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStep('identifier'); setOtp(''); setError(''); }}
                        className="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Use a different number or email
                      </button>
                    </form>
                  )}

                  {/* Step 2b (email): password */}
                  {step === 'password' && (
                    <form onSubmit={handlePasswordSubmit} className="w-[310px] sm:w-[350px] max-w-full flex flex-col gap-3 shrink-0">
                      <p className="text-xs text-gray-600 font-medium text-center">
                        Signing in as <strong className="text-gray-900">{identifier}</strong>
                      </p>
                      <div className="w-full border border-gray-300 focus-within:border-[#4CAF50] focus-within:ring-2 focus-within:ring-[#4CAF50]/20 rounded-xl px-4 py-3.5 flex items-center gap-2 bg-white shadow-2xs">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full min-w-0 bg-transparent border-none outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-sm"
                          autoFocus
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full block bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-70 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer"
                      >
                        {loading ? 'Signing in…' : 'Sign in'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStep('identifier'); setPassword(''); setError(''); }}
                        className="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Use a different number or email
                      </button>
                    </form>
                  )}

                  {/* Step 3 (email, no account found yet): create account */}
                  {step === 'register' && (
                    <form onSubmit={handleRegisterSubmit} className="w-[310px] sm:w-[350px] max-w-full flex flex-col gap-3 shrink-0">
                      <p className="text-xs text-gray-600 font-medium text-center">
                        No account for <strong className="text-gray-900">{identifier}</strong> yet — let's create one
                      </p>
                      <input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 focus-within:border-[#4CAF50] focus:ring-2 focus:ring-[#4CAF50]/20 rounded-xl px-4 py-3.5 bg-white shadow-2xs outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-sm"
                        autoFocus
                        autoComplete="name"
                      />
                      <div className="w-full border border-gray-300 focus-within:border-[#4CAF50] focus-within:ring-2 focus-within:ring-[#4CAF50]/20 rounded-xl px-4 py-3.5 flex items-center gap-2 bg-white shadow-2xs">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password (min 6 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full min-w-0 bg-transparent border-none outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-sm"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      <div className="w-full border border-gray-300 focus-within:border-[#4CAF50] focus-within:ring-2 focus-within:ring-[#4CAF50]/20 rounded-xl px-4 py-3.5 flex items-center gap-3 bg-white shadow-2xs">
                        <span className="text-sm font-extrabold text-gray-900 shrink-0">+91</span>
                        <div className="h-4 w-[1px] bg-gray-300 shrink-0" />
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="Mobile number"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full min-w-0 bg-transparent border-none outline-none text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal text-sm tracking-wide"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full block bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-70 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer"
                      >
                        {loading ? 'Creating account…' : 'Create account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStep('password'); setError(''); }}
                        className="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        Already have an account? Sign in
                      </button>
                    </form>
                  )}

                  {/* Guest */}
                  {step !== 'otp' && (
                    <button
                      type="button"
                      onClick={handleGuest}
                      className="text-xs font-extrabold text-gray-600 hover:text-gray-900 underline underline-offset-2 cursor-pointer shrink-0"
                    >
                      Continue as guest
                    </button>
                  )}

                  {/* Terms Footer */}
                  <div className="text-[11px] text-gray-500 font-medium text-center shrink-0">
                    By continuing, you agree to our{' '}
                    <button
                      type="button"
                      onClick={() => {
                        handleModalClose();
                        navigate('/s/terms-of-service');
                      }}
                      className="underline text-gray-700 font-semibold hover:text-[#4CAF50] cursor-pointer inline bg-transparent border-none p-0"
                    >
                      Terms of service
                    </button>{' '}
                    &{' '}
                    <button
                      type="button"
                      onClick={() => {
                        handleModalClose();
                        navigate('/s/privacy-policy');
                      }}
                      className="underline text-gray-700 font-semibold hover:text-[#4CAF50] cursor-pointer inline bg-transparent border-none p-0"
                    >
                      Privacy policy
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
