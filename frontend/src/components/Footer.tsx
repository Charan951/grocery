import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Mail, Play, Apple } from 'lucide-react';
import { Facebook, Twitter, Instagram, Linkedin } from './BrandIcons';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Simulate subscription
    setSubmitted(true);
    setEmail('');
  };

  return (
    <footer className="w-full bg-surface text-text-primary border-t border-divider py-12 md:py-16 transition-all duration-300">
      <div className="w-full px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr_1.5fr] gap-8 mb-12">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center text-3xl font-extrabold font-display">
              <span className="text-text-primary">Fresh<span className="text-primary">Cart</span></span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed">
              A premium, Apple-inspired grocery experience delivering organic vegetables, fruits, dairy, meats, and snacks directly to your doorstep in 15-30 minutes.
            </p>
            <div className="flex gap-3">
              {[{ icon: <Facebook size={18} />, label: 'Facebook' },
                { icon: <Twitter size={18} />, label: 'Twitter' },
                { icon: <Instagram size={18} />, label: 'Instagram' },
                { icon: <Linkedin size={18} />, label: 'LinkedIn' }].map((soc, i) => (
                <motion.a 
                  key={i}
                  href="#"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-background text-text-secondary transition-all duration-200 hover:bg-primary hover:text-white hover:-translate-y-0.5"
                  aria-label={soc.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {soc.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-5 font-display">Company</h4>
            <div className="flex flex-col gap-3">
              <Link to="/about" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Our Story</Link>
              <Link to="/careers" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Careers</Link>
              <Link to="/stores" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Store Locator</Link>
              <Link to="/locations" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Delivery Locations</Link>
            </div>
          </div>

          {/* Products Column */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-5 font-display">Products</h4>
            <div className="flex flex-col gap-3">
              <Link to="/products?category=cat_organic" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Organic Items</Link>
              <Link to="/products?category=cat_veg" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Vegetables</Link>
              <Link to="/products?category=cat_fruits" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Fresh Fruits</Link>
              <Link to="/products?category=cat_dairy" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Dairy & Milk</Link>
              <Link to="/products?category=cat_bakery" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Bakery</Link>
            </div>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-5 font-display">Support</h4>
            <div className="flex flex-col gap-3">
              <Link to="/help" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Help Center</Link>
              <Link to="/help#faq" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">FAQs</Link>
              <Link to="/help#shipping" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Shipping Info</Link>
              <Link to="/help#returns" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Returns Policy</Link>
              <Link to="/help#contact" className="text-sm text-text-secondary transition-all duration-200 hover:text-primary hover:pl-0.5">Contact Us</Link>
            </div>
          </div>

          {/* Newsletter Column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-text-primary mb-5 font-display">Stay Updated</h4>
            <p className="text-sm text-text-secondary leading-normal">
              Subscribe to get exclusive discount coupon codes, recipes, and weekly fresh notifications.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2 mt-2">
              <div className="flex flex-col relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-divider rounded-md text-sm bg-background focus:border-primary focus:outline-none transition-all duration-200"
                />
                {error && <span className="text-error text-xs font-semibold mt-1">{error}</span>}
                {submitted && <span className="text-success text-xs font-semibold mt-1">✨ Successfully subscribed! Check your inbox.</span>}
              </div>
              <motion.button 
                type="submit" 
                className="bg-primary text-white py-3 rounded-md text-sm font-semibold transition-all duration-200 hover:bg-secondary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Subscribe
              </motion.button>
            </form>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 mt-4">
              <a href="#" className="flex items-center gap-3 bg-text-primary text-white px-4 py-2.5 rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 w-[170px]">
                <Apple size={20} />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] opacity-70">Download on the</span>
                  <span className="text-sm font-bold font-display">App Store</span>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 bg-text-primary text-white px-4 py-2.5 rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 w-[170px]">
                <Play size={20} fill="currentColor" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] opacity-70">GET IT ON</span>
                  <span className="text-sm font-bold font-display">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-divider pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-secondary text-center md:text-left">
          <div>
            © {new Date().getFullYear()} FreshCart Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/legal?tab=privacy" className="transition-colors duration-200 hover:text-primary">Privacy Policy</Link>
            <Link to="/legal?tab=terms" className="transition-colors duration-200 hover:text-primary">Terms of Service</Link>
            <Link to="/legal?tab=refund" className="transition-colors duration-200 hover:text-primary">Refund Policy</Link>
            <Link to="/legal?tab=cookie" className="transition-colors duration-200 hover:text-primary">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
