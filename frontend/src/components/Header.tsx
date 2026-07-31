import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS } from '../context/CMSContext';
import { LocationModal } from './LocationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Heart, ShoppingBag, MapPin, Menu, X, 
  ChevronDown, Leaf, Settings, Percent 
} from 'lucide-react';

interface HeaderProps {
  onWishlistOpen: () => void;
  onCartOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onWishlistOpen, onCartOpen }) => {
  const { cartCount, wishlist } = useCartWishlist();
  const { categories, products, coupons, userLocation, updateUserLocation } = useCMS();
  const navigate = useNavigate();
  const location = useLocation();

  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time search filter with debouncing
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      const timer = setTimeout(() => {
        const filtered = products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
        setSearchResults(filtered);
        setShowSearchResults(true);
      }, 150);

      return () => clearTimeout(timer);
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
    <div className="sticky top-0 z-[1000] w-full bg-surface shadow-xs border-b border-divider">
      {/* Top Announcement Bar */}
      <AnimatePresence>
        {announcementVisible && activeAnnouncement && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary-gradient text-white text-center py-2 px-4 text-xs md:text-sm font-semibold flex justify-center items-center relative z-[1001] font-display border-b border-white/10"
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

      {/* Main Zepto Style Header Bar (Fixed & Stationary) */}
      <header className="flex items-center justify-between h-20 px-4 md:px-8 gap-4 bg-surface">
        {/* Left: Brand Logo & Location */}
        <div className="flex items-center gap-6">
          <button 
            className="block lg:hidden text-text-secondary hover:text-primary transition-colors" 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          
          {/* FreshCart Brand Logo or Name (either logo image or clean name text) */}
          <Link to="/" className="flex items-center group">
            <span className="text-[40px] md:text-[44px] font-bold tracking-tight text-emerald-600 font-display leading-none group-hover:opacity-90 transition-opacity">
              FreshCart
            </span>
          </Link>

          {/* Delivery location selector: "Delivery in minutes*" (24px, 600 weight) & "Select Location" (14px, 500 weight) */}
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="hidden sm:flex flex-col text-left cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span className="font-semibold text-[24px] text-emerald-600 flex items-center gap-1.5 leading-none">
              ⚡ Delivery in 10 mins*
            </span>
            <div className="flex items-center gap-1 text-text-secondary font-medium text-[14px] hover:text-emerald-700 mt-0.5">
              <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
              <span className="max-w-[160px] truncate">{userLocation?.area || userLocation?.city || 'Select Location'}</span>
              <ChevronDown size={14} />
            </div>
          </button>
        </div>

        {/* Center: Wide Search Input (Placeholder & Input: 16px, 400 weight) */}
        <div className="flex-1 max-w-[620px] relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full px-5 py-3 bg-background border border-divider rounded-full transition-all focus-within:border-[#7000ff] focus-within:bg-surface shadow-2xs">
            <Search size={18} className="text-text-tertiary mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder='Search for "chocolate box", "kurkure", "milk"...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
              className="w-full text-[16px] font-normal bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary placeholder:text-[16px] placeholder:font-normal"
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
                      <span className="text-sm font-bold text-text-primary">{product.name}</span>
                      <span className="text-xs text-text-secondary">{product.brand}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-text-primary">₹{product.price}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions: Login / Cart (14px, 500 weight) */}
        <div className="flex items-center gap-6 font-medium text-[14px] text-text-primary">
          {/* Login Button */}
          <button 
            onClick={() => navigate('/admin')}
            className="flex flex-col items-center gap-1 hover:text-[#7000ff] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full border border-divider flex items-center justify-center bg-background">
              <span className="text-sm">👤</span>
            </div>
            <span className="font-medium text-[14px]">Login</span>
          </button>

          {/* Cart Button */}
          <button 
            onClick={onCartOpen}
            className="flex flex-col items-center gap-1 hover:text-[#7000ff] transition-colors relative cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full border border-divider flex items-center justify-center bg-background relative">
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#7000ff] text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="font-medium text-[14px]">Cart</span>
          </button>
        </div>
      </header>

      {/* Location Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectLocation={updateUserLocation}
      />

      {/* Zepto Row 2: Top Navigation Tabs Bar */}
      <nav className="border-b border-divider bg-surface px-4 md:px-8 py-3.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-8 md:gap-10 min-w-max text-[18px] md:text-[20px] font-bold text-text-secondary">
          <Link to="/" className="flex items-center gap-2 text-[#7000ff] border-b-2 border-[#7000ff] pb-1 font-extrabold">
            <span className="text-xl md:text-2xl">🛍️</span>
            <span>All</span>
          </Link>
          <Link to="/products?category=tea-coffee-health-drinks" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">☕</span>
            <span>Cafe</span>
          </Link>
          <Link to="/products?category=fruits-vegetables" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">🏠</span>
            <span>Home</span>
          </Link>
          <Link to="/products?category=chocolates-indian-sweets" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">🧸</span>
            <span>Toys</span>
          </Link>
          <Link to="/products?category=fruits-vegetables" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">🍎</span>
            <span>Fresh</span>
          </Link>
          <Link to="/products?category=breakfast-cereals-spreads-sauces" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">🎧</span>
            <span>Electronics</span>
          </Link>
          <Link to="/products?category=atta-rice-oil-dals" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">📱</span>
            <span>Mobiles</span>
          </Link>
          <Link to="/products?category=ice-creams-kulfi-frozen-desserts" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">💄</span>
            <span>Beauty</span>
          </Link>
          <Link to="/products?category=dairy-bread-eggs" className="flex items-center gap-2 hover:text-[#7000ff] transition-colors pb-1">
            <span className="text-xl md:text-2xl">👗</span>
            <span>Fashion</span>
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
