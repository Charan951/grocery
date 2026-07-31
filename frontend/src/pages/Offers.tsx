import React, { useState } from 'react';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion } from 'framer-motion';
import { Gift, Share2, Tag, Check, Copy } from 'lucide-react';

export const Offers: React.FC = () => {
  const { coupons, seoSettings } = useCMS();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('https://freshcart.com/signup?ref=FRESH2026');
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const seo = seoSettings.offers || {
    title: 'Active Coupons & Flash Sales | FreshCart Offers',
    description: 'Get maximum savings on your monthly groceries. Save up to ₹100 using active codes, festival sales, and friend referrals.',
    keywords: 'grocery coupons, discount freshcart code, referral cashback'
  };

  return (
    <div className="page-wrapper">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] py-8 pb-16">
        {/* Title Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Super Saver Offers</h1>
          <p className="text-sm text-text-secondary">Apply active discount coupon codes at checkout to maximize your weekly grocery savings.</p>
        </section>

        {/* Coupons Grid */}
        <section className="mb-16">
          <h2 className="text-xl font-extrabold mb-6 font-display text-text-primary">Active Coupons</h2>
          {coupons.length === 0 ? (
            <div className="bg-surface p-12 rounded-2xl border border-divider text-center shadow-card">
              <p className="text-sm text-text-secondary">There are no active coupons at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map((coupon, idx) => {
                const isCopied = copiedCode === coupon.code;
                return (
                  <motion.div
                    key={coupon.code}
                    className="bg-surface border border-divider rounded-2xl p-6 flex flex-col gap-4 shadow-card relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-premium"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex justify-between items-center border-b border-divider pb-3">
                      <span className="text-xl font-extrabold text-primary">{coupon.discount}</span>
                      <span className="text-xs text-text-secondary font-semibold">Min Order: ₹{coupon.minOrder}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">{coupon.description}</h3>
                      <p className="text-xs text-text-secondary mt-1">Save instantly on organic dairy or fresh spinach bags.</p>
                    </div>

                    <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-divider mt-auto">
                      <span className="font-mono font-bold text-sm text-text-primary uppercase tracking-wider">{coupon.code}</span>
                      <button 
                        onClick={() => handleCopyCode(coupon.code)}
                        className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${isCopied ? 'text-success' : 'text-primary'}`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>COPY CODE</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Promotions (Referral & VIP) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Referral card */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Share2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Invite Friends & Get ₹100</h3>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              Share your custom referral link with friends. They get ₹100 off their first order, and you receive ₹100 cashback in your wallet after their first successful delivery!
            </p>
            
            <div className="flex items-center justify-between bg-background p-3.5 rounded-lg border border-divider mt-2">
              <span className="text-xs font-bold text-text-secondary">freshcart.com/?ref=FRESH2026</span>
              <button 
                onClick={handleCopyReferral}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                {referralCopied ? (
                  <>
                    <Check size={14} />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>COPY LINK</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Membership card */}
          <div className="bg-surface p-6 rounded-2xl border border-divider shadow-card flex flex-col gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Gift size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">FreshCart VIP Benefits</h3>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              Subscribe to VIP Membership to unlock premium shipping and extra savings across every shelf:
            </p>
            <ul className="text-xs md:text-sm text-text-secondary flex flex-col gap-1.5 list-disc pl-5">
              <li>Unlimited free deliveries on orders above ₹199</li>
              <li>Flat 10% discount on all organic-certified catalog items</li>
              <li>Exclusive early-bird 6:00 AM delivery slot booking</li>
              <li>Double loyalty points convertible to wallet cash</li>
            </ul>
            <button className="bg-primary text-white px-5 py-2.5 rounded-full font-bold text-xs md:text-sm mt-auto self-start hover:bg-secondary transition-colors">
              Start 30-Day Free Trial
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
