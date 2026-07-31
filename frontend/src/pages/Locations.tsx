import React, { useState } from 'react';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const Locations: React.FC = () => {
  const { seoSettings } = useCMS();

  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'fail'; message: string; city?: string } | null>(null);

  // Notify form states
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setNotified(false);

    const cleanPin = pincode.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      alert('Please enter a valid 6-digit postcode.');
      return;
    }

    setChecking(true);
    
    // Simulate API delay
    setTimeout(() => {
      setChecking(false);
      
      // Match coverage patterns
      if (cleanPin.startsWith('560')) {
        setResult({ status: 'success', city: 'Bengaluru', message: '🟢 Service is active! Your groceries will arrive in 15-30 minutes.' });
      } else if (cleanPin.startsWith('400')) {
        setResult({ status: 'success', city: 'Mumbai', message: '🟢 Service is active! Express dark stores are fully operating in your area.' });
      } else if (cleanPin.startsWith('110')) {
        setResult({ status: 'success', city: 'Delhi NCR', message: '🟢 Service is active! Peak delivery slots are currently open.' });
      } else {
        setResult({ status: 'fail', message: '🔴 Coming Soon! We do not cover this pincode yet.' });
      }
    }, 1000);
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    setNotified(true);
    setNotifyEmail('');
  };

  const activeCities = [
    { name: 'Bengaluru', active: true },
    { name: 'Mumbai', active: true },
    { name: 'Delhi NCR', active: true },
    { name: 'Hyderabad', active: true },
    { name: 'Chennai', active: true },
    { name: 'Pune', active: false }
  ];

  const seo = seoSettings.locations || {
    title: 'Delivery Locations & Areas Covered | FreshCart',
    description: 'Enter your postcode to check if our 15-minute delivery service is active in your neighborhood. Discover covered zones.',
    keywords: 'delivery coverage pincode, freshcart cities'
  };

  return (
    <div className="page-wrapper">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[800px] py-8 pb-16">
        {/* Title Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Delivery Coverage</h1>
          <p className="text-sm text-text-secondary">Check if our hyperlocal dark stores cover your pincode for express delivery slots.</p>
        </section>

        {/* Postcode checker card */}
        <section className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card flex flex-col gap-4 mb-16">
          <h3 className="text-xl font-bold text-text-primary">Enter your Pincode</h3>
          <form onSubmit={handleCheckPincode} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. 560103"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              className="flex-grow px-4 py-3 border border-divider rounded-md text-sm bg-background focus:outline-none focus:border-primary text-text-primary font-medium"
              required
            />
            <button type="submit" className="bg-primary text-white font-bold px-6 py-3 rounded-full text-xs md:text-sm hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5" disabled={checking}>
              {checking ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Check Coverage</span>
                </>
              )}
            </button>
          </form>

          {/* Results Reveal */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-xl flex flex-col gap-2 border ${
                  result.status === 'success' 
                    ? 'bg-success/10 border-success/20 text-success' 
                    : 'bg-error/10 border-error/20 text-error'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {result.status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{result.city ? `Delivery Covered in ${result.city}` : 'Pincode Not Covered'}</span>
                </div>
                <p className="text-xs md:text-sm font-medium leading-relaxed">{result.message}</p>

                {/* If fail: notify email form */}
                {result.status === 'fail' && (
                  <div className="border-t border-error/10 pt-3 mt-1.5">
                    {notified ? (
                      <span className="text-xs font-bold text-primary">✨ Registration successful! We will notify you when we expand.</span>
                    ) : (
                      <form onSubmit={handleNotifySubmit} className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Register your email"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          className="flex-1 px-3 py-2 border border-divider rounded-md text-xs bg-surface text-text-primary focus:outline-none focus:border-primary"
                          required
                        />
                        <button type="submit" className="bg-primary text-white font-bold px-4 py-2 rounded-md text-xs hover:bg-secondary transition-colors">Notify Me</button>
                      </form>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Operating Cities Grid */}
        <section>
          <h2 className="text-xl font-extrabold text-text-primary mb-6">Active Cities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {activeCities.map((city) => (
              <div key={city.name} className="bg-surface border border-divider rounded-xl p-4 flex justify-between items-center shadow-card">
                <div className="flex items-center gap-2.5">
                  <MapPin size={18} className="text-primary" />
                  <span className="text-sm font-bold text-text-primary">{city.name}</span>
                </div>
                {city.active ? (
                  <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase">ACTIVE</span>
                ) : (
                  <span className="text-[10px] text-text-tertiary font-bold uppercase">COMING SOON</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
