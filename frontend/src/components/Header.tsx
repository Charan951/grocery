import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS, getCategoryImage, hexToRgba, hexToTintOnWhite } from '../context/CMSContext';
import { LocationModal } from './LocationModal';
import { CustomerAuthModal } from './CustomerAuthModal';
import { CustomerProfileDrawer } from './CustomerProfileDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Heart, ShoppingBag, MapPin, Menu, X, 
  ChevronDown, Leaf, Settings, Percent, User, Zap, LogOut, Shield
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

  // Entire app bar (top header, search bar, category nav) tints to the active
  // category's own colour; defaults to violet when "All" / home is active.
  const activeCategory = useMemo(
    () => categories.find(cat => location.search.includes(`category=${cat.slug || cat.id}`)),
    [categories, location.search]
  );
  const isHomeActive = location.pathname === '/' && !activeCategory;
  const navAccent = activeCategory ? (activeCategory.color || '#4CAF50') : '#7000ff';
  const appBarBg = isHomeActive || !activeCategory ? '#EBE0FF' : hexToTintOnWhite(navAccent, 0.16);
  const appBarBorder = isHomeActive || !activeCategory ? 'rgba(216,194,255,0.6)' : hexToRgba(navAccent, 0.35);

  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  
  const [customerUser, setCustomerUser] = useState<any>(() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const appBarRef = useRef<HTMLDivElement>(null);

  // The top bar (logo/location + search) and the category nav are stacked
  // inside ONE sticky container (top-0) — no cross-element offset math needed,
  // so there's no timing gap on route navigation. Just measure the combined
  // height so other pages can offset their own sticky elements correctly.
  useEffect(() => {
    const el = appBarRef.current;
    if (!el) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty('--sticky-header-h', `${el.offsetHeight}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleProfileClick = () => {
    if (customerUser) {
      setIsCustomerProfileOpen(true);
    } else {
      setIsCustomerAuthOpen(true);
    }
  };

  const handleCustomerLogout = () => {
    setCustomerUser(null);
    localStorage.removeItem('customer_user');
    setIsCustomerProfileOpen(false);
    setShowProfileMenu(false);
  };

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
    <>
      {/* Top Header Row + Search Bar + Category Nav: fixed to the viewport top
          (not sticky) so it is never subject to flow/stacking edge cases.
          Page content gets an explicit padding-top matching this bar's real
          height (see App.tsx), so there is never a flow-reservation guess. */}
      <div ref={appBarRef} className="fixed top-0 left-0 right-0 z-[1000] w-full">
      <header
        style={{ backgroundColor: appBarBg, borderBottomColor: appBarBorder }}
        className="flex items-center justify-between w-full px-4 md:px-8 py-2.5 border-b transition-colors duration-300"
      >
        {/* Delivery Time & Location Selector (Zepto Style) */}
        <div className="flex items-center gap-3 md:gap-6">
          <Link to="/" className="hidden sm:flex items-center group shrink-0">
            <span className="text-[28px] sm:text-[36px] md:text-[40px] font-extrabold tracking-tight text-emerald-600 font-display leading-none group-hover:opacity-90 transition-opacity">
              FreshCart
            </span>
          </Link>

          {/* Delivery Time & Location Selector */}
          <div 
            onClick={() => navigate('/account/addresses')}
            className="flex flex-col cursor-pointer select-none group"
          >
            <div className="flex items-center gap-1 text-black font-extrabold text-xs sm:text-sm tracking-tight leading-tight">
              <Zap size={15} className="text-amber-500 fill-amber-400 shrink-0" />
              <span className="text-black font-black">10 minutes</span>
            </div>
            <div className="flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold text-slate-800 group-hover:text-black transition-colors">
              <span className="truncate max-w-[200px] sm:max-w-[340px]">
                {(() => {
                  const customerUser = (() => {
                    const cached = localStorage.getItem('customer_user');
                    return cached ? JSON.parse(cached) : null;
                  })();
                  const userPhoneKey = customerUser?.phone ? customerUser.phone.replace(/\D/g, '') : '';
                  const saved = userPhoneKey ? localStorage.getItem(`saved_addresses_${userPhoneKey}`) : null;
                  const addrs = saved ? JSON.parse(saved) : [];

                  if (!customerUser || addrs.length === 0) {
                    return '📍 Add Address';
                  }

                  if (typeof userLocation === 'object' && userLocation !== null) {
                    const parts = [];
                    if (userLocation.label) parts.push(userLocation.label);
                    if (userLocation.houseNo) parts.push(userLocation.houseNo);
                    parts.push(userLocation.area || userLocation.address || 'KPHB Colony');
                    return parts.join(' - ');
                  }

                  return 'KPHB Colony - Balaji Nagar, KPHB ...';
                })()}
              </span>
              <ChevronDown size={14} className="text-slate-800 shrink-0" />
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3 sm:gap-5 font-medium text-[14px] text-text-primary">
          {/* Circular Profile/Login Button */}
          <div className="relative">
            <button 
              onClick={handleProfileClick}
              className="w-8.5 h-8.5 rounded-full border border-black/80 flex items-center justify-center text-black hover:bg-black/10 transition-colors cursor-pointer shrink-0"
              title={customerUser ? `Logged in as ${customerUser.phone}` : "Customer Login"}
            >
              <User size={18} className="text-black" />
            </button>

            {/* Customer Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && customerUser && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-divider rounded-2xl shadow-premium p-3 z-[1002] flex flex-col gap-1 text-xs"
                >
                  <div className="px-3 py-2 border-b border-divider flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Logged In Customer</span>
                    <span className="text-xs font-extrabold text-text-primary truncate mt-0.5">{customerUser.phone}</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin');
                    }}
                    className="flex items-center gap-2 px-3 py-2 font-bold text-text-primary hover:bg-background rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Shield size={14} className="text-primary shrink-0" />
                    <span>Admin Control Console</span>
                  </button>

                  <button
                    onClick={handleCustomerLogout}
                    className="flex items-center gap-2 px-3 py-2 font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={14} className="shrink-0" />
                    <span>Log Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart Button (Desktop / Tablet only) */}
          <button 
            onClick={onCartOpen}
            className="hidden sm:flex flex-col items-center gap-1 hover:text-[#7000ff] transition-colors relative cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full border border-black/80 flex items-center justify-center bg-transparent relative">
              <ShoppingBag size={18} className="text-black" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#7000ff] text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

        {/* Search Input Bar */}
        <div style={{ backgroundColor: appBarBg, borderBottomColor: appBarBorder }} className="w-full px-4 md:px-8 py-2 sm:py-2.5 relative border-b shadow-xs transition-colors duration-300" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-[#D8C2FF] rounded-full transition-all focus-within:border-[#7000ff] focus-within:bg-white shadow-2xs">
            <Search size={18} className="text-text-tertiary mr-2.5 flex-shrink-0" />
            <input
              type="text"
              placeholder='Search for "chocolate box", "kurkure", "milk"...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
              className="w-full text-xs sm:text-[16px] font-normal bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
            />
          </form>

          {/* Real-time search results */}
          <AnimatePresence>
            {showSearchResults && searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-[#D8C2FF] rounded-xl shadow-premium overflow-hidden max-h-[380px] overflow-y-auto z-[1002] flex flex-col"
              >
                {searchResults.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center gap-3 p-3 border-b border-divider cursor-pointer hover:bg-[#EBE0FF]/50 transition-colors last:border-b-0"
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

        {/* Category Nav Tabs — driven by admin-managed categories, not hardcoded. */}
        <nav
          style={{ backgroundColor: appBarBg, borderBottomColor: appBarBorder }}
          className="border-b px-3 md:px-8 py-2.5 overflow-x-auto scrollbar-none transition-colors duration-300"
        >
          <div className="flex items-start gap-2 md:gap-3 min-w-max">
            <Link
              to="/"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
                location.pathname === '/'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white/70 text-text-secondary group-hover:bg-white group-hover:text-primary'
              }`}>
                <ShoppingBag size={22} />
              </div>
              <span className={`text-xs font-semibold transition-colors ${
                location.pathname === '/' ? 'text-primary' : 'text-text-secondary group-hover:text-primary'
              }`}>All</span>
            </Link>
            {categories.map((cat) => {
              const catSlug = cat.slug || cat.id;
              const isActive = location.search.includes(`category=${catSlug}`);
              const label = cat.displayName?.trim() || cat.name;
              const catColor = cat.color || '#4CAF50';
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${catSlug}`}
                  className="flex flex-col items-center gap-1.5 group shrink-0"
                >
                  <div
                    style={{
                      backgroundColor: isActive ? catColor : hexToRgba(catColor, 0.22),
                      boxShadow: isActive ? `0 0 0 3px ${appBarBg}, 0 0 0 5px ${catColor}` : undefined,
                    }}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden transition-all duration-200 ${
                      isActive ? '' : 'group-hover:ring-2 group-hover:ring-primary/30 group-hover:ring-offset-2'
                    }`}
                  >
                    <img src={getCategoryImage(cat)} alt={label} className="w-full h-full object-cover" />
                  </div>
                  <span
                    style={{ color: isActive ? catColor : undefined }}
                    className={`text-xs font-semibold w-16 md:w-[72px] text-center leading-tight line-clamp-2 transition-colors ${
                      isActive ? '' : 'text-text-secondary group-hover:text-primary'
                    }`}
                  >{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Location Selector Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectLocation={(loc: any) => updateUserLocation(loc)}
      />

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

      {/* Customer Auth Drawer Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCustomerUser(user);
          setIsCustomerAuthOpen(false);
          setIsCustomerProfileOpen(true);
        }}
      />

      {/* Customer Profile Drawer (Logged In View) */}
      <CustomerProfileDrawer
        isOpen={isCustomerProfileOpen}
        onClose={() => setIsCustomerProfileOpen(false)}
        customerUser={customerUser}
        onLogout={handleCustomerLogout}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
      />
    </>
  );
};
