import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartWishlist } from '../context/CartWishlistContext';
import { useCMS, getCategoryImage, hexToRgba, hexToTintOnWhite, hexToDarkShade } from '../context/CMSContext';
import { LocationModal } from './LocationModal';
import { CustomerAuthModal } from './CustomerAuthModal';
import { CustomerProfileDrawer } from './CustomerProfileDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, MapPin, Menu, X,
  ChevronDown, Leaf, Settings, Percent, User, Zap, LogOut, Shield, LayoutGrid
} from 'lucide-react';

interface HeaderProps {
  onWishlistOpen: () => void;
  onCartOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onWishlistOpen }) => {
  const { wishlist } = useCartWishlist();
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
  const navAccent = activeCategory ? (activeCategory.color || '#4CAF50') : '#4CAF50';
  const appBarBg = '#FFFFFF';
  const appBarBorder = '#ECECEC';

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

  // Derived Header dynamic background color based on active category
  const dynamicHeaderBg = useMemo(() => {
    if (activeCategory && activeCategory.color) {
      return hexToTintOnWhite(activeCategory.color, 0.12);
    }
    return '#ffffff';
  }, [activeCategory]);

  return (
    <>
      {/* Top Header Row + Search Bar + Category Nav: fixed to the viewport top
          (not sticky) so it is never subject to flow/stacking edge cases.
          Page content gets an explicit padding-top matching this bar's real
          height (see App.tsx), so there is never a flow-reservation guess. */}
      <div ref={appBarRef} className="fixed top-0 left-0 right-0 z-[1000] w-full shadow-xs transition-colors duration-300" style={{ backgroundColor: dynamicHeaderBg }}>
        <header
          className="flex items-center justify-between w-full px-4 md:px-8 py-2.5 border-b border-divider transition-colors duration-300 gap-3 md:gap-6"
          style={{ backgroundColor: dynamicHeaderBg }}
        >
          {/* Delivery Time & Location Selector + Logo */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link to="/" className="hidden sm:flex items-center gap-2 group shrink-0">
              <img src="/logo.png" alt="FreshCart Logo" className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105" />
              <span className="hidden xl:inline text-2xl font-extrabold tracking-tight text-primary font-display leading-none">
                FreshCart
              </span>
            </Link>

            {/* Delivery Time & Location Selector */}
            <div
              onClick={() => navigate('/account/addresses')}
              className="flex flex-col cursor-pointer select-none group sm:border-l sm:border-divider sm:pl-4 pl-0"
            >
              <div className="flex items-center gap-1 text-text-primary font-extrabold text-sm sm:text-sm tracking-tight leading-tight">
                <Zap size={15} className="text-black fill-black shrink-0" />
                <span className="text-text-primary font-black">10 minutes</span>
              </div>
              <div className="flex items-center gap-0.5 text-[13px] sm:text-xs font-bold text-text-secondary group-hover:text-primary transition-colors">
                <span className="truncate max-w-[200px] sm:max-w-[220px] lg:max-w-[280px]">
                  {(() => {
                    if (typeof userLocation === 'object' && userLocation !== null && (userLocation.houseNo || userLocation.area || userLocation.address || userLocation.fullAddress)) {
                      const parts = [];
                      if (userLocation.label) parts.push(userLocation.label);
                      if (userLocation.houseNo) parts.push(userLocation.houseNo);
                      parts.push(userLocation.area || userLocation.address || userLocation.fullAddress);
                      return parts.join(' - ');
                    }

                    if (typeof userLocation === 'string' && (userLocation as string).trim()) {
                      return userLocation;
                    }

                    return '📍 Add Address';
                  })()}
                </span>
                <ChevronDown size={14} className="text-text-secondary shrink-0" />
              </div>
            </div>
          </div>

          {/* Inline Search Bar Beside Location */}
          <div className="flex-1 max-w-xl md:max-w-2xl relative hidden sm:block" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="flex items-center w-full px-4 py-2 bg-background border border-divider rounded-full transition-all focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs">
              <Search size={17} className="text-text-tertiary mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder='Search for "chocolate box", "kurkure", "milk"...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
                className="w-full text-xs sm:text-sm font-normal bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
              />
            </form>

            {/* Real-time search results */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-divider rounded-2xl shadow-premium overflow-hidden max-h-[380px] overflow-y-auto z-[1002] flex flex-col"
                >
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 border-b border-divider cursor-pointer hover:bg-background transition-colors last:border-b-0"
                      onClick={() => handleSearchResultClick(product.id)}
                    >
                      <img src={product.imageUrl || (product.images && product.images[0]) || ''} alt={product.name} className="w-10 h-10 object-contain rounded-md border border-divider bg-white p-1" />
                      <div className="flex-1 flex flex-col">
                        <span className="text-sm font-bold text-text-primary">{product.name}</span>
                        <span className="text-xs text-text-secondary">{product.brand}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-primary">₹{product.price}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-3 sm:gap-5 font-medium text-[14px] text-text-primary shrink-0">
            {/* Profile Button */}
            <div className="relative">
              <button
                onClick={handleProfileClick}
                className="w-9 h-9 rounded-full border border-divider bg-background flex items-center justify-center text-text-primary hover:border-primary hover:text-primary transition-colors cursor-pointer shrink-0"
                title={customerUser ? `Logged in as ${customerUser.phone}` : "Customer Login"}
              >
                <User size={18} />
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
          </div>
        </header>

        {/* Mobile Search bar row (mobile screens only) */}
        <div className="sm:hidden w-full px-3 py-2 border-b border-divider relative transition-colors duration-300" style={{ backgroundColor: dynamicHeaderBg }} ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full px-3.5 py-2 bg-background border border-divider rounded-full">
            <Search size={16} className="text-text-tertiary mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search groceries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSearchResults(true)}
              className="w-full text-xs bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
            />
          </form>
        </div>

        {/* Category Nav Tabs */}
        <nav
          className="border-b border-divider px-3 md:px-8 py-2 overflow-x-auto scrollbar-none transition-colors duration-300"
          style={{ backgroundColor: activeCategory ? hexToTintOnWhite(activeCategory.color, 0.05) : '#ffffff' }}
        >
          <div className="flex items-center gap-1 md:gap-1.5 min-w-max pb-0.5">
            {/* All Link */}
            <Link
              to="/"
              style={location.pathname === '/' && !location.search.includes('category=') ? {
                backgroundColor: hexToTintOnWhite('#10B981', 0.18),
                borderColor: hexToRgba('#10B981', 0.5),
              } : undefined}
              className={`flex flex-col items-center justify-between p-1.5 md:p-2 rounded-2xl transition-all relative shrink-0 w-20 md:w-24 h-[104px] md:h-[114px] border ${
                location.pathname === '/' && !location.search.includes('category=')
                  ? 'shadow-2xs'
                  : 'bg-transparent border-transparent hover:bg-background/80'
              }`}
            >
              <div className={`w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-all ${
                location.pathname === '/' && !location.search.includes('category=')
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-background text-text-secondary border border-divider'
              }`}>
                <LayoutGrid size={22} />
              </div>
              <div className="h-[2.4em] flex items-center justify-center text-center w-full px-0.5">
                <span 
                  style={location.pathname === '/' && !location.search.includes('category=') ? { color: hexToDarkShade('#10B981', 0.4) } : undefined}
                  className={`text-[11px] md:text-xs font-bold text-center leading-tight line-clamp-2 ${
                    location.pathname === '/' && !location.search.includes('category=')
                      ? 'font-black'
                      : 'text-text-primary font-semibold'
                  }`}
                >
                  All
                </span>
              </div>
              {location.pathname === '/' && !location.search.includes('category=') ? (
                <div className="w-full h-1 bg-emerald-600 rounded-full mt-1" />
              ) : (
                <div className="w-full h-1 bg-transparent rounded-full mt-1" />
              )}
            </Link>

            {/* Categories Links */}
            {categories.map((cat) => {
              const catSlug = cat.slug || cat.id;
              const isActive = location.search.includes(`category=${catSlug}`);
              const label = cat.displayName?.trim() || cat.name;
              const catColor = cat.color || '#4CAF50';

              const activeBg = hexToTintOnWhite(catColor, 0.20);
              const activeBorder = hexToRgba(catColor, 0.5);
              const activeTextColor = hexToDarkShade(catColor, 0.4);

              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${catSlug}`}
                  style={isActive ? {
                    backgroundColor: activeBg,
                    borderColor: activeBorder,
                  } : undefined}
                  className={`flex flex-col items-center justify-between p-1.5 md:p-2 rounded-2xl transition-all relative shrink-0 w-20 md:w-24 h-[104px] md:h-[114px] border ${
                    isActive
                      ? 'shadow-2xs'
                      : 'bg-transparent border-transparent hover:bg-background/80'
                  }`}
                >
                  <div 
                    style={{
                      borderColor: isActive ? activeBorder : hexToRgba(catColor, 0.45),
                      backgroundColor: isActive ? activeBg : hexToTintOnWhite(catColor, 0.08)
                    }}
                    className="w-11 h-11 md:w-13 md:h-13 rounded-full overflow-hidden border-2 shrink-0 transition-colors shadow-2xs"
                  >
                    <img src={getCategoryImage(cat)} alt={label} className="w-full h-full object-cover" />
                  </div>
                  <div className="h-[2.4em] flex items-center justify-center text-center w-full px-0.5">
                    <span 
                      style={isActive ? { color: activeTextColor } : undefined}
                      className={`text-[11px] md:text-xs font-bold text-center leading-tight line-clamp-2 ${
                        isActive ? 'font-black' : 'text-text-primary font-semibold'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {isActive ? (
                    <div 
                      style={{ backgroundColor: catColor }} 
                      className="w-full h-1 rounded-full mt-1" 
                    />
                  ) : (
                    <div className="w-full h-1 bg-transparent rounded-full mt-1" />
                  )}
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
