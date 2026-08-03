import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/SEO';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Headphones, 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  ChevronDown, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Send,
  Zap,
  ShieldCheck
} from 'lucide-react';

interface SupportFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqs: SupportFAQ[] = [
  {
    id: 'faq_1',
    question: 'How does 10-minute delivery work?',
    answer: 'FreshCart operates localized dark stores within 2-3 km of your location. Once your order is placed, our store pickers pack your items in under 2 minutes and hand off to a dedicated delivery rider immediately.',
    category: 'Delivery',
  },
  {
    id: 'faq_2',
    question: 'What if an item is damaged or missing from my order?',
    answer: 'If an item is missing or damaged, select the specific order above and tap "Report Issue". Our instant refund algorithm will credit the item amount back to your payment method or FreshCart Wallet within minutes.',
    category: 'Refunds',
  },
  {
    id: 'faq_3',
    question: 'How do refunds work for UPI / Card / COD payments?',
    answer: 'UPI refunds are processed instantly (0-15 minutes). Credit/Debit card refunds take 2-4 business days depending on your bank. COD refunds are instantly credited as FreshCart Wallet balance.',
    category: 'Payments',
  },
  {
    id: 'faq_4',
    question: 'Can I cancel an order after placing it?',
    answer: 'Orders can be cancelled free of charge within 2 minutes of placing the order before a delivery partner has been dispatched.',
    category: 'Orders',
  },
];

export const CustomerSupport: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<string>('PNNHJHTYP81116');
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Hello! I am FreshCart Support Assistant. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: nowTime },
    ]);
    setChatInput('');

    setTimeout(() => {
      let botResponse = "Thank you for reaching out! Our support agent is reviewing your query. Is there anything else I can assist with?";
      if (userText.toLowerCase().includes('refund')) {
        botResponse = "Refunds are processed automatically for reported damaged/missing items. Check your wallet or bank statement.";
      } else if (userText.toLowerCase().includes('late') || userText.toLowerCase().includes('delay')) {
        botResponse = "Rider is en-route! Your 10-minute delivery is priority tracked. Estimated arrival is in 4 minutes.";
      }

      setChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    }, 1000);
  };

  const handleIssueSubmit = () => {
    if (!selectedIssue) {
      alert('Please select an issue type');
      return;
    }
    setTicketSubmitted(true);
    setTimeout(() => setTicketSubmitted(false), 4000);
  };

  return (
    <div className="page-wrapper min-h-screen bg-gray-50/70 pb-16 font-sans">
      <SEO 
        title="Customer Support | FreshCart 10-Minute Help Center"
        description="24/7 Customer Support for FreshCart grocery orders, live order tracking, refunds, and instant issue resolution."
      />

      {/* Top Banner Header (Matching CustomerOrders.tsx) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-2xs">
        <div className="container mx-auto px-4 md:px-8 max-w-[1000px] py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight font-display">
                Customer Support
              </h1>
              <p className="text-xs text-gray-500 font-semibold">
                Instant help for orders, payments, refunds & account queries
              </p>
            </div>
          </div>

          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 bg-[#4CAF50] hover:bg-[#43A047] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <MessageSquare size={14} />
            <span>Live Chat</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="container mx-auto px-4 md:px-8 max-w-[1000px] py-6 flex flex-col gap-6">

        {/* Quick Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => setChatOpen(true)}
            className="bg-white border border-gray-200 hover:border-[#4CAF50] rounded-2xl p-5 shadow-2xs cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#4CAF50] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-[#4CAF50] transition-colors">
                Live Support Chat
              </h3>
              <span className="text-xs font-semibold text-gray-500 mt-0.5">
                Instant response (Avg 1 min)
              </span>
            </div>
          </div>

          <a 
            href="tel:+911800373742" 
            className="bg-white border border-gray-200 hover:border-[#4CAF50] rounded-2xl p-5 shadow-2xs cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PhoneCall size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-violet-600 transition-colors">
                Call Support
              </h3>
              <span className="text-xs font-semibold text-gray-500 mt-0.5">
                Toll-Free 1800-FRESH-CART
              </span>
            </div>
          </a>

          <a 
            href="mailto:support@freshcart.com" 
            className="bg-white border border-gray-200 hover:border-[#4CAF50] rounded-2xl p-5 shadow-2xs cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Mail size={24} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-amber-600 transition-colors">
                Email Support
              </h3>
              <span className="text-xs font-semibold text-gray-500 mt-0.5">
                support@freshcart.com
              </span>
            </div>
          </a>
        </div>

        {/* Report Order Issue Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <Package size={20} className="text-gray-700" />
            <h2 className="text-base font-extrabold text-gray-900 font-display">
              Need Help With a Specific Order?
            </h2>
          </div>

          {ticketSubmitted && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>Issue reported successfully! Ticket #TCK-{Math.floor(1000 + Math.random() * 9000)} generated. Support will resolve in 5 mins.</span>
            </div>
          )}

          {/* Select Recent Order */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
              Select Recent Order
            </label>
            <select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs md:text-sm font-bold text-gray-900 focus:outline-none focus:border-[#4CAF50]"
            >
              <option value="PNNHJHTYP81116">Order #PNNHJHTYP81116 - 19 May 2026 (₹182 - Delivered)</option>
              <option value="FC-984210">Order #FC-984210 - Today (₹349 - Arriving in 8 mins)</option>
              <option value="FC-973142">Order #FC-973142 - 31 Jul 2026 (₹685 - Delivered)</option>
            </select>
          </div>

          {/* Select Issue Type */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
              Select Issue Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                'Damaged or Quality Issue',
                'Missing Item in Order',
                'Delivery Delay / Rider Issue',
                'Payment Charged but Failed',
                'Other Order Inquiry'
              ].map((issue) => (
                <button
                  key={issue}
                  type="button"
                  onClick={() => setSelectedIssue(issue)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    selectedIssue === issue
                      ? 'border-[#4CAF50] bg-emerald-50/60 text-[#2E7D32] shadow-2xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleIssueSubmit}
              className="bg-gray-900 hover:bg-black text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Submit Ticket
            </button>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <HelpCircle size={20} className="text-gray-700" />
            <h2 className="text-base font-extrabold text-gray-900 font-display">
              Frequently Asked Questions (FAQs)
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {faqs.map((faq) => {
              const isOpen = activeFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="border border-gray-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                    className="w-full p-4 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-gray-800' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 text-xs sm:text-sm font-medium text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/50 pt-3"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Live Chat Modal Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000]"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-white text-gray-900 z-[2001] shadow-2xl flex flex-col h-full"
            >
              {/* Chat Drawer Header */}
              <div className="bg-[#4CAF50] text-white p-4 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold font-display leading-tight">FreshCart Support Chat</h3>
                    <span className="text-[11px] font-semibold opacity-90">Online 24/7 • Instant Reply</span>
                  </div>
                </div>

                <button
                  onClick={() => setChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Chat Messages View */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-2xs ${
                        msg.sender === 'user'
                          ? 'bg-[#4CAF50] text-white rounded-br-none'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium mt-1 px-1">
                      {msg.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#4CAF50]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-[#4CAF50] hover:bg-[#43A047] text-white p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
