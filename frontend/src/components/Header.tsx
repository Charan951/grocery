import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS } from '../context/CMSContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Heart, ShoppingBag, MapPin, Menu, X, 
  ChevronDown, Leaf, Sun, Moon, Settings, Percent 
} from 'lucide-react';

interface HeaderProps {
  onWishlistOpen: () => void;
  onCartOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onWishlistOpen, onCartOpen }) => {
  const { cartCount, wishlist } = useCartWishlist();
  const { categories, products, coupons } = useCMS();
  const navigate = useNavigate();
  const location = useLocation();

  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('freshcart_dark_mode') === 'true';
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  // Scroll listener for sticky collapse
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply dark mode theme
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('freshcart_dark_mode', String(darkMode));
  }, [darkMode]);

  // Search filter
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchResults(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchResultClick = (productId: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const activeAnnouncement = coupons.length > 0 ? coupons[0] : null;

  return (
    <div className="sticky top-0 z-[1000] w-full transition-all duration-300">
      {/* Announcement Bar */}
      <AnimatePresence>
        {announcementVisible && activeAnnouncement && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary-gradient text-white text-center py-2 px-4 text-sm font-medium flex justify-center items-center relative z-[1001] font-display"
          >
            <span className="flex items-center gap-2">
              <Percent size={14} />
              Use coupon <strong>{activeAnnouncement.code}</strong> for {activeAnnouncement.discount}! ({activeAnnouncement.description})
            </span>
            <button 
              className="absolute right-4 bg-none border-none text-white cursor-pointer flex items-center opacity-80 hover:opacity-100 transition-opacity duration-200" 
              onClick={() => setAnnouncementVisible(false)}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Zepto Style Header */}
      <header className={`flex items-center justify-between h-16 px-4 md:px-8 gap-4 border-b border-divider bg-surface ${scrolled ? 'shadow-card' : ''}`}>
        {/* Left: Brand Logo & Location */}
        <div className="flex items-center gap-6">
          <button 
            className="block lg:hidden text-text-secondary hover:text-primary transition-colors" 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          
          {/* FreshCart Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Leaf className="w-5 h-5 text-emerald-600 fill-emerald-500/20" />
            </div>
            <span className="text-xl font-black tracking-tight text-emerald-600 font-display">FreshCart</span>
          </Link>

          {/* Delivery location selector */}
          <div className="hidden sm:flex flex-col text-xs leading-tight cursor-pointer relative" ref={cityRef} onClick={() => setShowCityDropdown(!showCityDropdown)}>
            <span className="font-extrabold text-emerald-600 flex items-center gap-1">
              ⚡ Delivery in 10 mins*
            </span>
            <div className="flex items-center gap-0.5 text-text-secondary font-bold text-[11px] hover:text-text-primary">
              <span>{selectedCity}</span>
              <ChevronDown size={12} />
            </div>

            <AnimatePresence>
              {showCityDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[calc(100%+8px)] left-0 bg-surface border border-divider rounded-xl shadow-premium p-2 w-[200px] flex flex-col gap-1 z-[1003]"
                >
                  <div className="text-[10px] text-text-secondary px-3 py-1 font-black uppercase tracking-wider">SELECT LOCATION</div>
                  {['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai'].map((city) => (
                    <button 
                      key={city}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => {
                        setSelectedCity(city);
                        setShowCityDropdown(false);
                      }}
                    >
                      {city}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Wide Search Input */}
        <div className="flex-1 max-w-[620px] relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full px-4 py-2 bg-background border border-divider rounded-full transition-all focus-within:border-[#7000ff] focus-within:bg-surface">
            <Search size={16} className="text-text-tertiary mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder='Search for "kurkure", "sweet potato", "milk"...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
              className="w-full text-xs font-semibold bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
            />
          </form>

          {/* Real-time search results */}
          <AnimatePresence>
            {showSearchResults && searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface border border-divider rounded-xl shadow-premium overflow-hidden max-h-[380px] overflow-y-auto z-[1002] flex flex-col"
              >
                {searchResults.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center gap-3 p-3 border-b border-divider cursor-pointer hover:bg-background transition-colors last:border-b-0"
                    onClick={() => handleSearchResultClick(product.id)}
                  >
                    <img src={product.imageUrl || (product.images && product.images[0]) || ''} alt={product.name} className="w-10 h-10 object-contain rounded-md" />
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-bold text-text-primary">{product.name}</span>
                      <span className="text-[10px] text-text-secondary">{product.brand}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-text-primary">₹{product.price}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions: Login, Cart & Admin */}
        <div className="flex items-center gap-4 text-xs font-extrabold text-text-primary">
          {/* Login Button */}
          <button 
            onClick={() => navigate('/admin')}
            className="flex flex-col items-center gap-0.5 hover:text-[#7000ff] transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full border border-divider flex items-center justify-center bg-background">
              <span className="text-xs">👤</span>
            </div>
            <span className="text-[11px]">Login</span>
          </button>

          {/* Cart Button */}
          <button 
            onClick={onCartOpen}
            className="flex flex-col items-center gap-0.5 hover:text-[#7000ff] transition-colors relative cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full border border-divider flex items-center justify-center bg-background relative">
              <ShoppingBag size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#7000ff] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Cart</span>
          </button>

          {/* Dark Mode */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full border border-divider hover:bg-background transition-colors text-text-secondary"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Zepto Row 2: Top Category Tabs Bar */}
      <nav className="border-b border-divider bg-surface px-4 md:px-8 py-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-6 min-w-max text-xs font-bold text-text-secondary">
          <Link to="/" className="flex items-center gap-1 text-[#7000ff] border-b-2 border-[#7000ff] pb-1 font-extrabold">
            <span>🛍️ All</span>
          </Link>
          <Link to="/products?category=tea-coffee-health-drinks" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>☕ Cafe</span>
          </Link>
          <Link to="/products?category=fruits-vegetables" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>🏠 Home</span>
          </Link>
          <Link to="/products?category=chocolates-indian-sweets" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>🧸 Toys</span>
          </Link>
          <Link to="/products?category=fruits-vegetables" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>🍎 Fresh</span>
          </Link>
          <Link to="/products?category=breakfast-cereals-spreads-sauces" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>🎧 Electronics</span>
          </Link>
          <Link to="/products?category=atta-rice-oil-dals" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>📱 Mobiles</span>
          </Link>
          <Link to="/products?category=ice-creams-kulfi-frozen-desserts" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>💄 Beauty</span>
          </Link>
          <Link to="/products?category=dairy-bread-eggs" className="flex items-center gap-1 hover:text-[#7000ff] transition-colors pb-1">
            <span>👗 Fashion</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[1004]"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[300px] bg-surface z-[1005] shadow-premium p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-2xl font-extrabold text-primary font-display">
                  <Leaf className="text-primary" fill="currentColor" size={24} />
                  <span className="text-text-primary font-extrabold">Fresh<span className="text-primary">Cart</span></span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-text-primary">
                  <X size={24} />
                </button>
              </div>

              {/* Mobile Search input */}
              <form onSubmit={handleSearchSubmit} className="my-2 mb-5">
                <div className="flex items-center w-full px-4 py-2 bg-background border border-divider rounded-full">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm bg-transparent border-none outline-none text-text-primary"
                  />
                  <button type="submit" className="text-text-secondary">
                    <Search size={18} />
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-4 overflow-y-auto">
                <Link to="/" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link to="/products" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Browse Catalog</Link>
                <Link to="/offers" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Offers & Sales</Link>
                <Link to="/blog" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Recipes & Blog</Link>
                <Link to="/about" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>
                <Link to="/help" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Help Center</Link>
                <Link to="/locations" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Delivery Locations</Link>
                <Link to="/stores" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Store Finder</Link>
                <Link to="/careers" className="text-base font-semibold text-text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2" onClick={() => setMobileMenuOpen(false)}>Careers</Link>
                <Link to="/admin" className="text-base font-semibold text-primary hover:text-primary transition-colors duration-200 border-b border-divider py-2 font-bold" onClick={() => setMobileMenuOpen(false)}>Admin CMS Panel</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
