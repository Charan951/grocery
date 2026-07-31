import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';

export const Legal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'privacy';

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const tabsConfig = [
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms of Service' },
    { id: 'refund', label: 'Refund Policy' },
    { id: 'shipping', label: 'Shipping Policy' },
    { id: 'cookie', label: 'Cookie Policy' }
  ];

  return (
    <div className="page-wrapper">
      <SEO 
        title={`${tabsConfig.find(t => t.id === currentTab)?.label || 'Legal Policies'} | FreshCart`}
        description="Read FreshCart privacy guidelines, customer terms of service, shipping timelines, and refund frameworks."
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1000px] py-8 pb-16">
        
        {/* Mobile Dropdown Menu Selector */}
        <select 
          value={currentTab}
          onChange={(e) => handleTabChange(e.target.value)}
          className="block md:hidden w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface mb-6 focus:outline-none focus:border-primary text-text-primary font-medium"
        >
          {tabsConfig.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
          
          {/* Left Column: Sidebar Tab list */}
          <aside className="hidden md:flex flex-col gap-2">
            {tabsConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold bg-surface border border-divider hover:border-primary transition-all duration-200 ${
                  currentTab === tab.id ? 'bg-primary/10 border-primary text-primary' : 'text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Right Column: Content viewport */}
          <main>
            <AnimatePresence mode="wait">
              {currentTab === 'privacy' && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card"
                >
                  <h1 className="text-2xl font-extrabold text-text-primary mb-1">Privacy Policy</h1>
                  <p className="text-[10px] text-text-secondary font-medium mb-6">Last updated: July 12, 2026</p>
                  
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">1. Data Collection</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        We collect name, contact details, GPS delivery coordinates, and wallet transaction logs necessary to route riders and audit produce quality.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">2. Location Services</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        Our mobile app and store locators query background GPS coordinates to provide active local category catalogs and track dispatch timings.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">3. Security Compliance</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        All payments are managed using PCI-DSS compliant secure gateways. FreshCart does not store credit/debit card numbers in our state servers.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentTab === 'terms' && (
                <motion.div
                  key="terms"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card"
                >
                  <h1 className="text-2xl font-extrabold text-text-primary mb-1">Terms of Service</h1>
                  <p className="text-[10px] text-text-secondary font-medium mb-6">Last updated: July 12, 2026</p>
                  
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">1. Services Framework</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        FreshCart provides hyperlocal grocery delivery slots from Indiranagar, HSR, and Whitefield dark store hubs. By placing orders, you agree to dispatch timelines.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">2. Fair Usage Policy</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        We block accounts abusing coupon codes or making false return claims. Sitemaps and code details are copyrighted.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">3. Pricing & Billing</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        MRP and discounts are mapped dynamically based on farm cooperative wholesale fluctuations. Prices shown at checkouts are final.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentTab === 'refund' && (
                <motion.div
                  key="refund"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card"
                >
                  <h1 className="text-2xl font-extrabold text-text-primary mb-1">Refund & Returns Policy</h1>
                  <p className="text-[10px] text-text-secondary font-medium mb-6">Last updated: July 12, 2026</p>
                  
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">1. No-Questions return</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        We offer a 24-hour return policy for all fresh vegetables, fruits, and dairy products. If you are not satisfied with quality, hand the item back to the rider or raise a support ticket.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">2. Wallet Cashbacks</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        Approved refunds are credited to your FreshCart wallet instantly or returned to your original bank account within 3-5 working days.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentTab === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card"
                >
                  <h1 className="text-2xl font-extrabold text-text-primary mb-1">Shipping & Delivery Policy</h1>
                  <p className="text-[10px] text-text-secondary font-medium mb-6">Last updated: July 12, 2026</p>
                  
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">1. Express Timelines</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        Standard deliveries are routed under 30 minutes in active zones. High traffic or rains may extend slots up to 45 minutes, communicated via SMS logs.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">2. Free Delivery thresholds</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        Free delivery applies to all baskets above ₹199. Standard order handling charges below ₹199 is ₹29.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentTab === 'cookie' && (
                <motion.div
                  key="cookie"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card"
                >
                  <h1 className="text-2xl font-extrabold text-text-primary mb-1">Cookie Preferences</h1>
                  <p className="text-[10px] text-text-secondary font-medium mb-6">Last updated: July 12, 2026</p>
                  
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">1. Technical Cookies</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        We utilize cookies to cache your delivery postcodes, dark store sessions, and active shopping cart items in the browser.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1.5">2. Analytics Tracking</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                        Anonymized analytics cookies track sitemap clicks and page loading times to optimize our performance grids.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};
