import React, { useState, useMemo } from 'react';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Send, CheckCircle } from 'lucide-react';

export const HelpCenter: React.FC = () => {
  const { faqs, seoSettings } = useCMS();
  const [selectedTab, setSelectedTab] = useState('Shipping');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Unique tabs for FAQs
  const faqCategories = useMemo(() => {
    const set = new Set(faqs.map((f) => f.category));
    return Array.from(set);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((f) => f.category === selectedTab);
  }, [faqs, selectedTab]);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      alert('Please fill out all contact form fields.');
      return;
    }

    setSubmitted(true);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  const seo = seoSettings.help || {
    title: 'Help Center & Support FAQs | FreshCart',
    description: 'Have questions about returns, refunds, order tracking, or subscription billing? Read our FAQs or contact our 24/7 client support.',
    keywords: 'freshcart contact, return policy refund, track delivery status'
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
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Help & Support Center</h1>
          <p className="text-sm text-text-secondary">Find answers to shipping questions, return guidelines, or raise a support ticket directly.</p>
        </section>

        {/* FAQ Tabs */}
        <div className="flex justify-center flex-wrap gap-2.5 mb-10">
          {faqCategories.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setSelectedTab(tab);
                setExpandedFaq(null);
              }}
              className={`px-5 py-2 border border-divider rounded-full text-xs font-semibold bg-surface hover:border-primary transition-all duration-200 ${
                selectedTab === tab ? 'bg-primary/10 border-primary text-primary' : 'text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Collapsible FAQ list */}
        <section className="flex flex-col gap-4 mb-16">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <div key={faq.id} className="bg-surface border border-divider rounded-xl overflow-hidden shadow-card">
                <div className="flex justify-between items-center p-4 font-bold text-sm text-text-primary cursor-pointer select-none hover:text-primary transition-colors" onClick={() => toggleFaq(faq.id)}>
                  <span>{faq.question}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 pt-0 text-xs md:text-sm text-text-secondary leading-relaxed border-t border-divider bg-background/50"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </section>

        {/* Support Contact Form */}
        <section className="bg-surface border border-divider rounded-2xl p-6 md:p-8 shadow-card flex flex-col gap-4">
          <h3 className="text-xl font-bold text-text-primary">Submit a Support Ticket</h3>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed">Can't find what you need? Fill out this ticket and our 24/7 helpdesk will respond in under 15 minutes.</p>
          
          <AnimatePresence>
            {submitted && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-success/15 border border-success/30 text-success p-4 rounded-xl text-center font-semibold text-xs md:text-sm"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle size={18} />
                  <span>Ticket Created Successfully!</span>
                </div>
                <span className="text-[11px] font-normal block opacity-90">Check your email inbox for the tracking link. Our team is already looking into it.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-primary">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-primary">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Subject / Issue Type</label>
              <input
                type="text"
                placeholder="e.g. Refund request for damaged avocados"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Message Details</label>
              <textarea
                placeholder="Describe your issue. If relating to an order, please include the Order ID."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-md text-xs bg-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <button type="submit" className="bg-primary text-white font-bold py-3 px-6 rounded-full text-xs hover:bg-secondary transition-colors self-start">
              <span className="flex items-center gap-1.5">
                <Send size={14} />
                <span>Submit Ticket</span>
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
